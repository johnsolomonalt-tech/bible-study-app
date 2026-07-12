import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const hasDbUrl = !!process.env.DATABASE_URL;
    const dbUrlPrefix = process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 15) : null;
    
    // Don't even try to query if it's missing to avoid Prisma crash
    if (!hasDbUrl) {
       return NextResponse.json({ success: false, error: "Node.js process.env.DATABASE_URL is undefined!" });
    }

    const result = await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ success: true, result, hasDbUrl, dbUrlPrefix });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, hasDbUrl: !!process.env.DATABASE_URL });
  }
}
