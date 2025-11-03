// app/api/tts/route.ts
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Cache: stores synthesized audio bytes for repeated text
const ttsCache = new Map<string, Uint8Array>();

// Lazy singleton client
let client: TextToSpeechClient | null = null;

async function getTTSClient(): Promise<TextToSpeechClient> {
  if (client) return client;

  const credsRaw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!credsRaw) throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS_JSON env");

  const creds = JSON.parse(credsRaw);
  client = new TextToSpeechClient({
    projectId: creds.project_id,
    credentials: {
      client_email: creds.client_email,
      private_key: creds.private_key,
    },
  });

  return client;
}

// Unified request builder
function buildTTSRequest(text: string) {
  return {
    input: { text },
    voice: {
      languageCode: "en-US",
      name: "en-US-Chirp3-HD-Sulafat",
    },
    audioConfig: {
      audioEncoding: "MP3",
    },
  } as const;
}

// Chunk splitter (500 chars)
function splitIntoChunks(input: string, maxLen = 500): string[] {
  const sentences = input.replace(/\s+/g, " ").match(/[^.!?]+[.!?]*/g) || [input];
  const chunks: string[] = [];
  let current = "";

  for (const s of sentences) {
    if ((current + s).trim().length > maxLen) {
      if (current) chunks.push(current.trim());
      current = s.trim();
    } else {
      current += " " + s.trim();
    }
  }

  if (current) chunks.push(current.trim());
  return chunks;
}

// ============================================================
// === POST: Single synthesis (one full response) ============
// ============================================================

//use this to get entire audio when in pre loading stage for interview
export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ message: "Missing or invalid text" }, { status: 400 });
    }

    // ✅ Check cache
    if (ttsCache.has(text)) {
      const cached = ttsCache.get(text)!;
      return new NextResponse(cached as any, {
        status: 200,
        headers: { "Content-Type": "audio/mpeg" },
      });
    }

    const tts = buildTTSRequest(text);
    const [resp] = await (await getTTSClient()).synthesizeSpeech(tts);

    if (!resp.audioContent) throw new Error("No audio content returned");
    const body: Uint8Array =
      typeof resp.audioContent === "string"
        ? new Uint8Array(Buffer.from(resp.audioContent, "base64"))
        : new Uint8Array(resp.audioContent as Uint8Array);

    // ✅ Store in cache
    ttsCache.set(text, body);

    return new NextResponse(body as any, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": 'attachment; filename="speech.mp3"',
      },
    });
  } catch (err: any) {
    console.error("TTS POST Error:", err);
    return NextResponse.json({ message: err?.message ?? "Synthesis failed" }, { status: 500 });
  }
}

// ============================================================
// === GET: Progressive streaming synthesis ===================
// ============================================================
export async function GET(req: Request) {
  try {
    const text = new URL(req.url).searchParams.get("text") ?? "";
    if (!text.trim()) {
      return NextResponse.json({ message: "Missing text query" }, { status: 400 });
    }

    // Cache hit: send instantly
    if (ttsCache.has(text)) {
      const cached = ttsCache.get(text)!;
      return new NextResponse(cached as any, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Disposition": 'inline; filename="speech.mp3"',
        },
      });
    }

    const client = await getTTSClient();
    const chunks = splitIntoChunks(text, 500);

    const stream = new ReadableStream<Uint8Array>({
      start: async (controller) => {
        try {
          for (const chunk of chunks) {
            const [resp] = await client.synthesizeSpeech(buildTTSRequest(chunk));
            if (!resp.audioContent) continue;
            const data =
              typeof resp.audioContent === "string"
                ? Buffer.from(resp.audioContent, "base64")
                : Buffer.from(resp.audioContent as Uint8Array);
            controller.enqueue(data);
          }
          controller.close();
        } catch (err) {
          console.error("Streaming error:", err);
          controller.error(err);
        }
      },
    });

    return new NextResponse(stream as any, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "Content-Disposition": 'inline; filename="speech.mp3"',
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    console.error("TTS GET Error:", err);
    return NextResponse.json({ message: err?.message ?? "Streaming failed" }, { status: 500 });
  }
}
