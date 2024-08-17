"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

import styles from "./chat.module.css";
import { AssistantStream } from "openai/lib/AssistantStream";
import Markdown from "react-markdown";
import { RequiredActionFunctionToolCall } from "openai/resources/beta/threads/runs/runs";
import { EventLog } from "@/app/components/event-log"; // Import EventLog component
import { cva } from "class-variance-authority";
import { User, Robot, DotsThree, CheckCircle, Brain, Keyboard } from "@phosphor-icons/react";




import { CircleIcon, Loader2 } from "lucide-react";
import {AssistantStreamEvent} from "openai/resources/beta";

type MessageProps = {
    role: "user" | "assistant" | "code";
    text: string;
};

const UserMessage = ({ text }: { text: string }) => {
    return (
        <div className="flex justify-end mb-4 items-start">
            <div className="bg-primary text-primary-foreground rounded-lg py-2 px-4 max-w-[80%] mr-2">
                {text}
            </div>
            <User size={24} weight="fill" className="text-primary mt-1" />
        </div>
    );
};

const borderStyles = cva(
    "transition-colors duration-300 border-2",
    {
      variants: {
        state: {
          ready: "border-green-500",
          thinking: "border-yellow-500",
          creating_text: "border-blue-500",
          updating_text: "border-blue-300",
          processing_image: "border-purple-500",
          executing_code: "border-orange-500",
          queued: "border-gray-500",
        },
      },
      defaultVariants: {
        state: "ready",
      },
    }
  );

  type AssistantState = "received" | "read" | "thinking" | "typing";


  const AssistantMessage = ({ text, isTyping, state }: { text: string; isTyping: boolean; state: AssistantState }) => {
    return (
        <div className="flex mb-4 items-start">
            <Robot size={24} weight="fill" className="text-secondary mr-2 mt-1" />
            <div className="bg-secondary text-secondary-foreground rounded-lg py-2 px-4 max-w-[80%]">
                <Markdown>{text}</Markdown>
                {/* {isTyping && <TypingIndicator state={state} />} */}
            </div>
        </div>
    );
};

const TypingIndicator = ({ state }: { state: AssistantState }) => {
    const getStateIcon = () => {
        switch (state) {
            case "received":
                return <CheckCircle className="mr-2 h-4 w-4" />;
            case "read":
                return <CheckCircle className="mr-2 h-4 w-4 text-blue-500" />;
            case "thinking":
                return <Brain className="mr-2 h-4 w-4 animate-pulse" />;
            case "typing":
                return <Keyboard className="mr-2 h-4 w-4 animate-bounce" />;
            default:
                return null;
        }
    };

    const getStateText = () => {
        switch (state) {
            case "received":
                return "Received";
            case "read":
                return "Read";
            case "thinking":
                return "Thinking...";
            case "typing":
                return "Typing...";
            default:
                return "";
        }
    };

    return (
        <div className="flex items-center mt-2 text-sm text-muted-foreground">
            {getStateIcon()}
            <span className="ml-1 capitalize">{getStateText()}</span>
            {state === "typing" && <DotsThree size={24} weight="bold" className="animate-bounce" />}
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

const Message = ({ role, text }: MessageProps) => {
    switch (role) {
        case "user":
            return <UserMessage text={text} />;
        case "assistant":
            return <AssistantMessage text={text} isTyping={false} state="received" />;
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
    const [conversationState, setConversationState] = useState("ready");
    const [isAssistantTyping, setIsAssistantTyping] = useState(false);
    const [userInput, setUserInput] = useState("");
    const [messages, setMessages] = useState<Array<{ role: string; text: string; state?: AssistantState }>>([]);
    const [inputDisabled, setInputDisabled] = useState(false);
    const [threadId, setThreadId] = useState("");
    const [logs, setLogs] = useState([]); // State for event logs
    const [threadReady, setThreadReady] = useState(false);
    const [assistantState, setAssistantState] = useState<AssistantState>("received");

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null); // Add this line

    // Scroll to the bottom of the chat automatically
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom();
        }
    }, [messages]);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

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
                setThreadReady(true);
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
            // appendMessage("assistant", "Error: Unable to send message", "");
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
        stream.on("textCreated", () => {
            setAssistantState("typing");
            setIsAssistantTyping(true);
            appendMessage("assistant", "", "typing");
        });
        stream.on("textDelta", (delta) => {
            setIsAssistantTyping(true);
            handleTextDelta(delta);
        });
        stream.on("imageFileDone", (image) => {
            setConversationState("processing_image");
            handleImageFileDone(image);
        });
        stream.on("toolCallCreated", (toolCall) => {
            setConversationState("executing_code");
            toolCallCreated(toolCall);
        });
        stream.on("toolCallDelta", (delta, snapshot) => {
            setConversationState("executing_code");
            toolCallDelta(delta, snapshot);
        });
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
                    setIsAssistantTyping(false);
                    handleRunCompleted();
                    break;
                case "thread.run.in_progress":
                    setAssistantState("thinking");
                    break;
                case "thread.run.queued":
                    setAssistantState("received");
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
        setIsAssistantTyping(false);
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

    const appendToLastMessage = (text, state: AssistantState | null = null) => {
        setMessages((prevMessages) => {
            const lastMessage = prevMessages[prevMessages.length - 1];
            const updatedLastMessage = {
                ...lastMessage,
                text: lastMessage.text + text,
                state: state || lastMessage.state,
            };
            return [...prevMessages.slice(0, -1), updatedLastMessage];
        });
    };


    const appendMessage = (role, text, state: AssistantState = "received") => {
        setMessages((prevMessages) => [...prevMessages, { role, text, state }]);
    };

    const mapAssistantStateToBorderState = (state: AssistantState): "thinking" | "ready" | "creating_text" | "updating_text" | "processing_image" | "executing_code" | "queued" => {
        switch (state) {
          case "received":
          case "read":
            return "ready";
          case "thinking":
            return "thinking";
          case "typing":
            return "creating_text";
          default:
            return "ready";
        }
      };

    return (
        <Card className={`w-full h-[70vh] flex flex-col  ${borderStyles({ state: mapAssistantStateToBorderState(assistantState) })}`}>
            <CardHeader className="py-3">
                {/* <div className="flex items-center">
                    <CircleIcon 
                        className={`h-4 w-4 mr-2 ${threadReady ? 'text-green-500' : 'text-red-500'}`} 
                        fill={threadReady ? 'currentColor' : 'none'} 
                    />
                </div> */}
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden">
                <ScrollArea className="h-full pr-4">
                {messages.map((msg, index) => (
                        msg.role === "assistant" ? (
                            <AssistantMessage
                                key={index}
                                text={msg.text}
                                isTyping={isAssistantTyping && index === messages.length - 1}
                                state={msg.state || "received"}
                            />
                        ) : (
                            <Message
                                key={index}
                                role={msg.role as "user" | "assistant" | "code"}
                                text={msg.text}
                            />
                        )
                    ))}
                    <div ref={messagesEndRef} />
                </ScrollArea>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 py-6">
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
                        ref={inputRef}
                    />
                    <Button type="submit" disabled={inputDisabled}>
                        Send
                    </Button>
                </form>
                {/* <Collapsible className="w-full">
                    <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full">
                            Event Log
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                        <EventLog logs={logs} />
                    </CollapsibleContent>
                </Collapsible> */}
            </CardFooter>
        </Card>
    );
};

export default Chat;