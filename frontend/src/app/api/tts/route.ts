import { NextResponse } from 'next/server';
import https from 'https';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text) return NextResponse.json({ error: 'Text required' }, { status: 400 });

    const hfKey = process.env.NEXT_PUBLIC_HF_API_KEY?.trim();
    if (!hfKey) return NextResponse.json({ error: 'VERCEL_ENV_MISSING' }, { status: 500 });

    const postData = JSON.stringify({ inputs: text });

    const audioBuffer: Buffer = await new Promise((resolve, reject) => {
      const request = https.request('https://api-inference.huggingface.co/models/facebook/mms-tts-eng', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hfKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res) => {
        if (res.statusCode !== 200) {
          let errData = '';
          res.on('data', chunk => errData += chunk);
          res.on('end', () => reject(new Error(`HF Error ${res.statusCode}: ${errData}`)));
          return;
        }

        const chunks: Buffer[] = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      });

      request.on('error', reject);
      request.write(postData);
      request.end();
    });

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/flac',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error("TTS Proxy Error:", error);
    return NextResponse.json({ error: `SERVER_CRASH: ${error.message}` }, { status: 500 });
  }
}
