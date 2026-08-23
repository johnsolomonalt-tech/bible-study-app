const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: 'frontend/.env.local' });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

async function run() {
  try {
    const result = await model.generateContent("Hello");
    console.log(result.response.text());
  } catch (e) {
    console.error("ERROR:", e.message);
  }
}
run();
