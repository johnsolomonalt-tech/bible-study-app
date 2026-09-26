import { NextResponse } from 'next/server';
import { DEV_COOKIE_NAME } from '@/lib/devAuth';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Developer session locked' });
  response.cookies.set({
    name: DEV_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
