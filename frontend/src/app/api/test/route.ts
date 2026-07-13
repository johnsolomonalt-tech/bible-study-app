import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export async function GET() {
  try {
    const hasDbUrl = !!process.env.DATABASE_URL;
    const hasGemini = !!process.env.GEMINI_API_KEY;
    
    const result = await prisma.$queryRaw`SELECT 1`;
    
    let geminiTest = "Not tested";
    try {
      const response = await model.generateContent("Say 'hello'");
      geminiTest = response.response.text();
    } catch (e: any) {
      geminiTest = "Gemini Error: " + e.message;
    }

    return NextResponse.json({ success: true, result, hasDbUrl, hasGemini, geminiTest });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
