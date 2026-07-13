const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
async function run() {
  const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
  for (const m of models) {
    try {
      const model = genAI.getGenerativeModel({ model: m });
      await model.generateContent("hello");
      console.log(m, "WORKS");
    } catch(e) {
      console.log(m, "FAILS", e.message);
    }
  }
}
run();
