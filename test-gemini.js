import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import 'dotenv/config';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

async function main() {
  try {
    const { text } = await generateText({
      model: google('gemini-1.5-flash'),
      prompt: 'Hello',
    });
    console.log('gemini-1.5-flash success:', text);
  } catch (e) {
    console.error('gemini-1.5-flash error:', e.message);
  }
}
main();
