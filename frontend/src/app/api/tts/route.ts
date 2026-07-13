import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  let step = "req.json()";
  try {
    const { text } = await req.json();
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    step = "checking env";
    const hfKey = process.env.HF_API_KEY;
    if (!hfKey) {
      return NextResponse.json({ error: 'VERCEL_ENV_MISSING' }, { status: 500 });
    }

    step = "fetching from HF";
    const response = await fetch(
      "https://api-inference.huggingface.co/models/espnet/kan-bayashi_ljspeech_vits",
      {
        headers: { Authorization: `Bearer ${hfKey}` },
        method: "POST",
        body: JSON.stringify({ inputs: text }),
      }
    );

    step = "checking response ok";
    if (!response.ok) {
      const errorText = await response.text();
      console.error("HF API Error:", errorText);
      return NextResponse.json({ error: `HF_API_ERROR: ${errorText}` }, { status: response.status });
    }

    step = "reading arrayBuffer";
    const audioBuffer = await response.arrayBuffer();
    
    step = "returning response";
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/flac',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error(`TTS Proxy Error at ${step}:`, error);
    return NextResponse.json({ error: `SERVER_CRASH at ${step}: ${error.message} - ${error.stack}` }, { status: 500 });
  }
}
