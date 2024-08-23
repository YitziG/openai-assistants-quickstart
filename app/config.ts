import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const config = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_ASSISTANT_ID: process.env.OPENAI_ASSISTANT_ID,
  };

  console.log("Config loaded:", config);

  console.log("Assistant ID from process.env: ", process.env.OPENAI_ASSISTANT_ID)
  
  if (!config.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY is not set in the environment variables.');
  }
  
  if (!config.OPENAI_ASSISTANT_ID) {
    console.warn('OPENAI_ASSISTANT_ID is not set in the environment variables.');
  }
  
  export default config;