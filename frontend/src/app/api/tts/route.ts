import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const hfKey = process.env.HF_API_KEY;
    if (!hfKey) {
      return NextResponse.json({ error: 'HF_API_KEY is not set' }, { status: 500 });
    }

    const response = await fetch(
      "https://api-inference.huggingface.co/models/espnet/kan-bayashi_ljspeech_vits",
      {
        headers: { Authorization: `Bearer ${hfKey}` },
        method: "POST",
        body: JSON.stringify({ inputs: text }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("HF API Error:", errorText);
      return NextResponse.json({ error: 'Failed to fetch TTS from Hugging Face' }, { status: response.status });
    }

    // Stream the audio blob directly back to the client
    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/flac',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error("TTS Proxy Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
