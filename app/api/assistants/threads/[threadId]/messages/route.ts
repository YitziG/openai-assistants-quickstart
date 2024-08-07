import { assistantId } from "@/app/assistant-config";
import { openai } from "@/app/openai";
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import { getSession } from "@auth0/nextjs-auth0";
import { NextRequest, NextResponse } from "next/server";

// Define rate limiters for different user statuses
const ratelimitLoggedOut = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.tokenBucket(1, "10 s", 2), // 1 token per 10 seconds, max 2 tokens
  analytics: true,
});

const ratelimitLoggedIn = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.tokenBucket(5, "10 s", 10), // 5 tokens per 10 seconds, max 10 tokens
  analytics: true,
});

const ratelimitPaying = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.tokenBucket(10, "10 s", 20), // 10 tokens per 10 seconds, max 20 tokens
  analytics: true,
});

// Send a new message to a thread
export async function POST(
  request: NextRequest,
  { params: { threadId } }: { params: { threadId: string } }
) {
  try {
    if (!threadId) {
      return NextResponse.json(
        { message: "Missing threadId parameter" },
        { status: 400 }
      );
    }

    const session = await getSession();
    const user = session?.user;

    let rateLimit: Ratelimit;
    let success: boolean;
    let limit: number;
    let reset: number;
    let remaining: number;

    if (user) {
      switch (user.status) {
        case "paying":
          rateLimit = ratelimitPaying;
          break;
        case "logged-in":
          rateLimit = ratelimitLoggedIn;
          break;
        default:
          rateLimit = ratelimitLoggedOut;
      }
    } else {
      rateLimit = ratelimitLoggedOut;
    }

    const ip =
      request.headers.get("x-real-ip") ||
      request.headers.get("x-forwarded-for") ||
      request.ip;

    // use user's id if logged in or ip address if not
    if (user) {
      ({ success, limit, reset, remaining } = await rateLimit.limit(user.sub));
    } else {
      ({ success, limit, reset, remaining } = await rateLimit.limit(ip));
    }

    if (!success) {
      return NextResponse.json(
        {
          message: "Rate limit exceeded. Please try again later.",
          retryAfter: reset.toString(),
          remaining: remaining.toString(),
        },
        { status: 429 }
      );
    }

    const { content } = await request.json();

    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: content,
    });

    const stream = openai.beta.threads.runs.stream(threadId, {
      assistant_id: assistantId,
    });

    return new Response(stream.toReadableStream());
  } catch (error) {
    console.error("Error in POST handler:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
