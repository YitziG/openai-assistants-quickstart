import dotenv from 'dotenv';
dotenv.config();

export const config = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
    OPENAI_ASSISTANT_ID: process.env.OPENAI_ASSISTANT_ID || "",
};