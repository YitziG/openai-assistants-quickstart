"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

import styles from "./chat.module.css";
import { AssistantStream } from "openai/lib/AssistantStream";
import Markdown from "react-markdown";
import { AssistantStreamEvent } from "openai/resources/beta/assistants/assistants";
import { RequiredActionFunctionToolCall } from "openai/resources/beta/threads/runs/runs";
import { EventLog } from "@/app/components/event-log"; // Import EventLog component

type MessageProps = {
    role: "user" | "assistant" | "code";
    text: string;
    status?: string;
};

const UserMessage = ({ text }: { text: string }) => {
    return (
        <div className="flex justify-end mb-4">
            <div className="bg-primary text-primary-foreground rounded-lg py-2 px-4 max-w-[80%]">
                {text}
            </div>
        </div>
    );
};

// AssistantMessage component that handles message text and status with error handling
const AssistantMessage = ({ text, status }: { text: string; status: string }) => {
    return (
        <div className="flex mb-4">
            <div className="bg-secondary text-secondary-foreground rounded-lg py-2 px-4 max-w-[80%]">
                <div className={status === "success" ? "text-green-500" : "text-red-500"}>
                    {status}
                </div>
                <Markdown>{text}</Markdown>
            </div>
        </div>
    );
};

const CodeMessage = ({ text }: { text: string }) => {
    return (
        <div className="flex mb-4">
            <pre className="bg-muted text-muted-foreground rounded-lg py-2 px-4 max-w-[80%] overflow-x-auto">
                <code>{text}</code>
            </pre>
        </div>
    );
};

const Message = ({ role, text, status }: MessageProps) => {
    switch (role) {
        case "user":
            return <UserMessage text={text} />;
        case "assistant":
            return <AssistantMessage text={text} status={status} />;
        case "code":
            return <CodeMessage text={text} />;
        default:
            return null;
    }
};

type ChatProps = {
    functionCallHandler?: (
        toolCall: RequiredActionFunctionToolCall
    ) => Promise<string>;
};

const Chat = ({
    functionCallHandler = () => Promise.resolve(""),
}: ChatProps) => {
    const [userInput, setUserInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [inputDisabled, setInputDisabled] = useState(false);
    const [threadId, setThreadId] = useState("");
    const [logs, setLogs] = useState([]); // State for event logs

    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    // Scroll to the bottom of the chat automatically
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Create a new thread when the component mounts
    useEffect(() => {
        const createThread = async () => {
            try {
                const res = await fetch(`/api/assistants/threads`, {
                    method: "POST",
                });
                if (!res.ok) throw new Error("Failed to create thread");
                const data = await res.json();
                setThreadId(data.threadId);
            } catch (error) {
                console.error("Error creating thread:", error);
            }
        };
        createThread();
    }, []);

    // Send a message to the assistant
    const sendMessage = async (text) => {
        try {
            const response = await fetch(
                `/api/assistants/threads/${threadId}/messages`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        content: text,
                    }),
                }
            );
            if (!response.ok) throw new Error("Failed to send message");
            const stream = AssistantStream.fromReadableStream(response.body);
            handleReadableStream(stream);
        } catch (error) {
            console.error("Failed to send message:", error);
            // Re-enable input field on failure
            setInputDisabled(false);
            // Optionally, show an error message in the chat
            appendMessage("assistant", "Error: Unable to send message", "error");
        }
    };

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!userInput.trim()) return;
        sendMessage(userInput);
        setMessages((prevMessages) => [
            ...prevMessages,
            { role: "user", text: userInput },
        ]);
        setUserInput("");
        setInputDisabled(true);
        scrollToBottom();
    };

    const submitActionResult = async (runId, toolCallOutputs) => {
        const response = await fetch(
            `/api/assistants/threads/${threadId}/actions`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    runId: runId,
                    toolCallOutputs: toolCallOutputs,
                }),
            }
        );
        const stream = AssistantStream.fromReadableStream(response.body);
        handleReadableStream(stream);
    };

    const handleRequiresAction = async (
        event: AssistantStreamEvent.ThreadRunRequiresAction
    ) => {
        const runId = event.data.id;
        const toolCalls = event.data.required_action.submit_tool_outputs.tool_calls;
        // loop over tool calls and call function handler
        const toolCallOutputs = await Promise.all(
            toolCalls.map(async (toolCall) => {
                const result = await functionCallHandler(toolCall);
                return { output: result, tool_call_id: toolCall.id };
            })
        );
        setInputDisabled(true);
        submitActionResult(runId, toolCallOutputs);
    };

    // Handle stream events
    const handleReadableStream = (stream: AssistantStream) => {
        stream.on("textCreated", handleTextCreated);
        stream.on("textDelta", handleTextDelta);
        stream.on("imageFileDone", handleImageFileDone);
        stream.on("toolCallCreated", toolCallCreated);
        stream.on("toolCallDelta", toolCallDelta);
        stream.on("event", (event) => {
            console.log("Received event:", event);
            setLogs((prevLogs) => [
                ...prevLogs.slice(-99), // Keep only the last 100 log entries
                { event: event.event, data: event.data },
            ]);
            switch (event.event) {
                case "thread.run.requires_action":
                    handleRequiresAction(event);
                    break;
                case "thread.run.completed":
                    appendToLastMessage("", "success");
                    handleRunCompleted();
                    break;
                case "thread.run.in_progress":
                    appendToLastMessage("", "In Progress");
                    break;
                case "thread.run.queued":
                    appendToLastMessage("", "Queued");
                    break;
                default:
                    console.log("Unhandled event:", event);
                    break;
            }
        });
    };

    // Ensure that all crucial methods are retained and improved where needed
    // Additional improvements or refinements can be suggested here

    // Re-enable input form after run completion
    const handleRunCompleted = () => {
        setInputDisabled(false);
    };

    // Append an empty assistant message when text creation begins
    const handleTextCreated = () => {
        appendMessage("assistant", "");
    };

    // Append text delta to the last message
    const handleTextDelta = (delta) => {
        if (delta.value != null) {
            appendToLastMessage(delta.value);
        }
        if (delta.annotations != null) {
            annotateLastMessage(delta.annotations);
        }
    };

    // Annotate the last message with specific annotations (e.g., file paths)
    const annotateLastMessage = (annotations) => {
        setMessages((prevMessages) => {
            const lastMessage = prevMessages[prevMessages.length - 1];
            const updatedLastMessage = {
                ...lastMessage,
            };
            annotations.forEach((annotation) => {
                if (annotation.type === 'file_path') {
                    updatedLastMessage.text = updatedLastMessage.text.replaceAll(
                        annotation.text,
                        `/api/files/${annotation.file_path.file_id}`
                    );
                }
            });
            return [...prevMessages.slice(0, -1), updatedLastMessage];
        });
    };

    // Append image file to the last message
    const handleImageFileDone = (image) => {
        appendToLastMessage(`\n![${image.file_id}](/api/files/${image.file_id})\n`);
    };

    // Append a new code message when a code tool call is created
    const toolCallCreated = (toolCall) => {
        if (toolCall.type != "code_interpreter") return;
        appendMessage("code", "");
    };

    // Append code delta to the last code message
    const toolCallDelta = (delta, snapshot) => {
        if (delta.type != "code_interpreter") return;
        if (!delta.code_interpreter.input) return;
        appendToLastMessage(delta.code_interpreter.input);
    };

    const appendToLastMessage = (text, status = null) => {
        setMessages((prevMessages) => {
            const lastMessage = prevMessages[prevMessages.length - 1];
            const updatedLastMessage = {
                ...lastMessage,
                text: lastMessage.text + text,
            };
            if (status !== null) {
                updatedLastMessage.status = status;
            }
            return [...prevMessages.slice(0, -1), updatedLastMessage];
        });
    };

    const appendMessage = (role, text, status = "") => {
        setMessages((prevMessages) => [...prevMessages, { role, text, status }]);
    };

    return (
        <Card className="w-full">

            <CardHeader>
                <CardTitle>Chat with Yafutzu</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[60vh] pr-4">
                    {messages.map((msg, index) => (
                        <Message
                            key={index}
                            role={msg.role}
                            text={msg.text}
                            status={msg.status}
                        />
                    ))}
                    <div ref={messagesEndRef} />
                </ScrollArea>
            </CardContent>

            <CardFooter>
            <form
                onSubmit={handleSubmit}
                className="flex w-full space-x-2"
            >
                <Input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1"
                />
                <Button type="submit" disabled={inputDisabled}>
                    Send
                </Button>
            </form>
            </CardFooter>
            <div className="mt-4">
                <EventLog logs={logs} />
            </div>
        </Card>
    );
};

export default Chat;