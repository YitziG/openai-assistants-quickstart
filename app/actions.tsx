"use server";

import { generateId } from "ai";
import { createAI, createStreamableUI, createStreamableValue } from "ai/rsc";
import { OpenAI } from "openai";
import { Message } from "./components/message"; // Update path if necessary
import {
    getSefariaCategory
} from "./services/sefaria/category";
import {
    getAllDataForIndex
} from "./services/sefaria/index";
import {
    getTopic
} from "./services/sefaria/topics";
import {
    getTopicGraph
} from "./services/sefaria/topics-graph";
import {
    getLearningSchedule
} from "./services/sefaria/calendars";
import {
    getRecommendedTopics
} from "./services/sefaria/recommendedTopics";
import {
    getLexiconEntry
} from "./services/sefaria/words/word";
import {
    getTextShape
} from "./services/sefaria/shape";
import {
    searchSefaria
} from "./services/sefaria/search";
import {
    getSefariaText,
    getRelated,
    getCommentaryText
} from "./services/sefaria/text";
import {ReactNode} from "react";

const openai = new OpenAI({
    apiKey: "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",
});

export interface ClientMessage {
    id: string;
    status: ReactNode;
    text: ReactNode;
    gui: ReactNode;
}

const ASSISTANT_ID = 'asst_iAplfT42LQ1Nbdk06g1BfEMU';
let THREAD_ID = '';
let RUN_ID = '';

export async function submitMessage(question: string): Promise<ClientMessage> {
    const status = createStreamableUI('thread.init');
    const textStream = createStreamableValue('');
    const textUIStream = createStreamableUI(
        <Message textStream={textStream.value} />,
    );
    const gui = createStreamableUI();

    const runQueue = [];

    (async () => {
        if (THREAD_ID) {
            await openai.beta.threads.messages.create(THREAD_ID, {
                role: 'user',
                content: question,
            });

            const run = await openai.beta.threads.runs.create(THREAD_ID, {
                assistant_id: ASSISTANT_ID,
                stream: true,
            });

            runQueue.push({ id: generateId(), run });
        } else {
            const run = await openai.beta.threads.createAndRun({
                assistant_id: ASSISTANT_ID,
                stream: true,
                thread: {
                    messages: [{ role: 'user', content: question }],
                },
            });

            runQueue.push({ id: generateId(), run });
        }

        while (runQueue.length > 0) {
            const latestRun = runQueue.shift();

            if (latestRun) {
                for await (const delta of latestRun.run) {
                    const { data, event } = delta;

                    status.update(event);

                    if (event === 'thread.created') {
                        THREAD_ID = data.id;
                    } else if (event === 'thread.run.created') {
                        RUN_ID = data.id;
                    } else if (event === 'thread.message.delta') {
                        data.delta.content?.map((part: any) => {
                            if (part.type === 'text') {
                                if (part.text) {
                                    textStream.append(part.text.value);
                                }
                            }
                        });
                    } else if (event === 'thread.run.requires_action') {
                        if (data.required_action) {
                            if (data.required_action.type === 'submit_tool_outputs') {
                                const { tool_calls } = data.required_action.submit_tool_outputs;
                                const tool_outputs = [];

                                for (const tool_call of tool_calls) {
                                    const { id: toolCallId, function: fn } = tool_call;
                                    const { name, arguments: args } = fn;
                                    if (name === 'getSefariaCategory') {
                                        const { categoryPath } = JSON.parse(args);

                                        gui.append(
                                            <div className="flex flex-row gap-2 items-center">
                                                <div>Getting Sefaria category: {categoryPath}</div>
                                            </div>,
                                        );

                                        await new Promise(resolve => setTimeout(resolve, 2000));

                                        const category = await getSefariaCategory(categoryPath);

                                        gui.append(
                                            <div className="flex flex-col gap-2">
                                                {category.map(item => (
                                                    <div
                                                        key={item.id}
                                                        className="p-2 bg-zinc-100 rounded-md flex flex-row gap-2 items-center justify-between"
                                                    >
                                                        <div className="flex flex-row gap-2 items-center">
                                                            <div>{item.title}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>,
                                        );

                                        tool_outputs.push({
                                            tool_call_id: toolCallId,
                                            output: JSON.stringify(category),
                                        });
                                    }
                                }

                                const nextRun: any =
                                    await openai.beta.threads.runs.submitToolOutputs(
                                        THREAD_ID,
                                        RUN_ID,
                                        {
                                            tool_outputs,
                                            stream: true,
                                        },
                                    );

                                runQueue.push({ id: generateId(), run: nextRun });
                            }
                        }
                    } else if (event === 'thread.run.failed') {
                        console.log(data);
                    }
                }
            }
        }

        status.done();
        textUIStream.done();
        gui.done();
    })();

    return {
        id: generateId(),
        status: status.value,
        text: textUIStream.value,
        gui: gui.value,
    };
}

export const AI = createAI({
    actions: { submitMessage },
});