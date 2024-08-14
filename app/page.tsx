'use client';

import { useState } from 'react';
import { ClientMessage } from './actions';
import { useActions } from 'ai/rsc';

export default function Home() {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<ClientMessage[]>([]);
    const { submitMessage } = useActions();

    const handleSubmission = async () => {

        setMessages(currentMessages => [...currentMessages, {
            "role": "user",
            "text": input,
            "id": "134",
            "status": "status",
            "gui": "gui"
        }]);

        let {id, status, text, gui} = await submitMessage(input);

        setMessages(currentMessages => [...currentMessages, {
            "role": "assistant",
            "text": text,
            "id": id,
            "status": status,
            "gui": gui
        }]);


        setInput('');
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <div className="chatContainer w-full max-w-2xl flex-grow overflow-y-auto">
                <div className="messages">
                    {messages.map((message, index) => (
                        <div key={message.id} className="flex flex-col gap-1 border-b p-2">
                            {message.status && (
                                <div className="streamingStatus">
                                    {message.status}
                                </div>
                            )}
                            {message.text && (
                                <div className="streamingText">
                                    {message.text}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="inputForm w-full max-w-2xl flex justify-center items-center mt-4">
                <input
                    className="input flex-grow"
                    value={input}
                    onChange={event => setInput(event.target.value)}
                    placeholder="Ask a question"
                    onKeyDown={event => {
                        if (event.key === 'Enter') {
                            handleSubmission();
                        }
                    }}
                />
                <button
                    className="button ml-2"
                    onClick={handleSubmission}
                >
                    Send
                </button>
            </div>
        </div>
    );
}