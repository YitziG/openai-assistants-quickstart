'use client';

import styles from './page.module.css'

import {useEffect, useRef, useState} from 'react';
import {ClientMessage, submitMessage} from './actions';
import {useActions} from 'ai/rsc';

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

        // Add user message
        setMessages(prev => [...prev, { role: 'user', text: input }]);
        setInput('');

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
        <div className={styles.container}>
            <h1 className={styles.title}>Chat Assistant</h1>
            <div className={styles.chatContainer}>
                <div className={styles.messages}>
                    {messages.map((message, index) => (
                        <div key={index}
                             className={`${styles.message} ${message.role === 'user' ? styles.userMessage : styles.assistantMessage}`}>
                            <div className={styles.messageHeader}>
                                {message.role === 'user' ? 'You' : 'Assistant'}
                            </div>
                            <div className={styles.messageText}>
                                {message.text}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef}/>
                </div>
            </div>
            <form onSubmit={handleSubmit} className={styles.inputForm}>
                <input
                    className={styles.input}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                />
                <button type="submit" className={styles.button}>Send</button>
            </form>
        </div>
    );
}