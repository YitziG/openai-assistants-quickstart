'use client';

import { useState } from 'react';
import { ClientMessage, submitMessage } from './actions';
import { useActions } from 'ai/rsc';

export default function Home() {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<ClientMessage[]>([]);
    const { submitMessage } = useActions();

    const handleSubmission = async () => {
        const message = await submitMessage(input);

        setMessages(currentMessages => [...currentMessages, message]);
        setInput('');
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <div className="inputForm">
                <input
                    className="input"
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
                    className="button"
                    onClick={handleSubmission}
                >
                    Send
                </button>
            </div>

            <div className="messages">
                {messages.map(message => (
                    <div key={message.id} className="flex flex-col gap-1">
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
    );
}