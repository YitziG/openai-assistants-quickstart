'use client';

import React, { useEffect, useRef, useState } from 'react';
import { submitMessage } from './actions';
import { generateId } from 'ai';

const StatusIndicator = ({ status }) => {
    const getStatusColor = () => {
        switch (status) {
            case 'in_progress':
                return '#4CAF50';
            case 'completed':
                return '#2196F3';
            case 'failed':
                return '#F44336';
            default:
                return '#9E9E9E';
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', marginRight: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="7" fill="none" stroke={getStatusColor()} strokeWidth="2">
                    {status === 'in_progress' && (
                        <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from="0 8 8"
                            to="360 8 8"
                            dur="1s"
                            repeatCount="indefinite"
                        />
                    )}
                </circle>
            </svg>
            <span style={{ marginLeft: '4px', fontSize: '12px', color: getStatusColor() }}>
        {status}
      </span>
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
        // const assistantMessageId = userMessageId + 1;
        const userMessageId = generateId();

        setMessages(prev => [
            ...prev,
            { role: 'user', text: input, id: userMessageId }
            // { role: 'assistant', status: 'in_progress', id: assistantMessageId }
        ]);
        setInput('');

        try {
            const {id, status, text, gui} = await submitMessage(input);
            setMessages(prev => [
                ...prev,
                { role: 'assistant', text, id, status, gui }
                // { role: 'assistant', status: 'in_progress', id: assistantMessageId }
            ]);

            

        } catch (error) {
            console.error('Error submitting message:', error);
            setMessages(currentMessages =>
                currentMessages.map(msg =>
                    msg.id === generateId()
                        ? { ...msg, status: 'failed', text: "An error occurred. Please try again." }
                        : msg
                )
            );
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            backgroundColor: '#1a1a1a',
            color: 'white'
        }}>
            <h1 style={{padding: '1rem', backgroundColor: '#2a2a2a', margin: 0, textAlign: 'center'}}>AI Assistant</h1>
            <div style={{flexGrow: 1, overflowY: 'auto', padding: '1rem'}}>
                {messages.map((message) => (
                    <div key={message.id}
                         style={{
                             marginBottom: '1rem',
                             display: 'flex',
                             justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
                         }}>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '0.5rem 1rem',
                            borderRadius: '1rem',
                            backgroundColor: message.role === 'user' ? '#0066cc' : '#2a2a2a',
                            maxWidth: '70%'
                        }}>
                            {message.role === 'assistant' && <StatusIndicator status={message.status} />}
                            <span>
                {message.text || (message.status === 'in_progress' ? 'Processing your request...' : '')}
              </span>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef}/>
            </div>
            <form onSubmit={handleSubmit} style={{display: 'flex', padding: '1rem', backgroundColor: '#2a2a2a'}}>
                <input
                    style={{
                        flexGrow: 1,
                        padding: '0.5rem',
                        borderRadius: '0.5rem 0 0 0.5rem',
                        border: 'none',
                        backgroundColor: '#3a3a3a',
                        color: 'white'
                    }}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                />
                <button type="submit" style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0 0.5rem 0.5rem 0',
                    border: 'none',
                    backgroundColor: '#0066cc',
                    color: 'white'
                }}>Send
                </button>
            </form>
        </div>
    );
}