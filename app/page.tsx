"use client";

import { Dialog, DialogTrigger, DialogContent } from '@radix-ui/react-dialog';
import { ChatCircleDots } from 'phosphor-react';
import { useState, useRef, useEffect } from 'react';
import { submitMessage } from './actions';

const StatusIndicator = ({ status }) => {
    const getStatusColor = () => {
        switch (status) {
            case 'in_progress':
                return 'text-yellow-500';
            case 'completed':
                return 'text-green-500';
            case 'failed':
                return 'text-red-500';
            default:
                return 'text-gray-400';
        }
    };

    return (
        <div className={`flex items-center mr-2 ${getStatusColor()}`}>
            <ChatCircleDots size={20} weight="fill" />
            <span className="ml-2 text-sm">{status}</span>
        </div>
    );
};

export default function Home() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        const userMessageId = Date.now(); // Replacing generateId temporarily

        setMessages(prev => [
            ...prev,
            { role: 'user', text: input, id: userMessageId }
        ]);
        setInput('');

        try {
            const { id, status, text } = await submitMessage(input); // Assuming submitMessage is defined elsewhere
            setMessages(prev => [
                ...prev,
                { role: 'assistant', text, id, status }
            ]);
        } catch (error) {
            console.error('Error submitting message:', error);
            setMessages(currentMessages =>
                currentMessages.map(msg =>
                    msg.id === userMessageId
                        ? { ...msg, status: 'failed', text: "An error occurred. Please try again." }
                        : msg
                )
            );
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white">
            <h1 className="p-4 bg-gray-800 text-center text-xl">AI Assistant</h1>
            <div className="flex-grow overflow-y-auto p-4">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex mb-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`flex flex-col p-4 rounded-lg max-w-md ${
                                message.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'
                            }`}
                        >
                            {message.role === 'assistant' && <StatusIndicator status={message.status} />}
                            <span>{message.text || (message.status === 'in_progress' ? 'Processing your request...' : '')}</span>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="flex p-4 bg-gray-800">
                <input
                    className="flex-grow mr-2 bg-gray-700 text-white rounded-md p-2"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                />
                <button
                    className="bg-blue-600 text-white rounded-md px-4"
                    type="submit"
                >
                    Send
                </button>
            </form>
        </div>
    );
}