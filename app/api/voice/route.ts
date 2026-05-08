import { GoogleGenAI, Modality, MediaResolution } from "@google/genai";
import { env } from "@/lib/env";

// WAV header utilities
function parseMimeType(mimeType: string) {
  const [fileType, ...params] = mimeType.split(";").map((s) => s.trim());
  const [, format] = fileType.split("/");
  const options: { numChannels: number; sampleRate: number; bitsPerSample: number } = {
    numChannels: 1,
    bitsPerSample: 16,
    sampleRate: 24000,
  };
  if (format && format.startsWith("L")) {
    const bits = parseInt(format.slice(1), 10);
    if (!isNaN(bits)) options.bitsPerSample = bits;
  }
  for (const param of params) {
    const [key, value] = param.split("=").map((s) => s.trim());
    if (key === "rate") options.sampleRate = parseInt(value, 10);
  }
  return options;
}

function createWavHeader(
  dataLength: number,
  opts: { numChannels: number; sampleRate: number; bitsPerSample: number }
) {
  const { numChannels, sampleRate, bitsPerSample } = opts;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const buf = Buffer.alloc(44);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataLength, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataLength, 40);
  return buf;
}

function buildWav(audioParts: string[], mimeType: string): Buffer {
  const opts = parseMimeType(mimeType);
  const rawBuffers = audioParts.map((d) => Buffer.from(d, "base64"));
  const rawData = Buffer.concat(rawBuffers as unknown as Uint8Array[]);
  const header = createWavHeader(rawData.length, opts);
  return Buffer.concat([header, rawData] as unknown as Uint8Array[]);
}

export async function POST(request: Request) {
  try {
    const { text } = (await request.json()) as { text: string };
    if (!text?.trim()) {
      return Response.json({ error: "No text provided" }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: env.GOOGLE_GENERATIVE_API_KEY });

    const audioParts: string[] = [];
    let audioMimeType = "audio/pcm;rate=24000";
    let transcriptText = "";

    await new Promise<void>((resolve, reject) => {
      const responseQueue: import("@google/genai").LiveServerMessage[] = [];
      let sessionRef: import("@google/genai").Session | undefined;

      async function drainQueue() {
        while (true) {
          const msg = responseQueue.shift();
          if (!msg) {
            await new Promise((r) => setTimeout(r, 50));
            continue;
          }

          if (msg.serverContent?.modelTurn?.parts) {
            for (const part of msg.serverContent.modelTurn.parts) {
              if (part.inlineData?.data) {
                audioParts.push(part.inlineData.data);
                if (part.inlineData.mimeType) {
                  audioMimeType = part.inlineData.mimeType;
                }
              }
              if (part.text) {
                transcriptText += part.text;
              }
            }
          }

          if (msg.serverContent?.turnComplete) {
            break;
          }
        }
      }

      ai.live
        .connect({
          model: "models/gemini-3.1-flash-live-preview",
          callbacks: {
            onopen() {
              // Connected
            },
            onmessage(msg) {
              responseQueue.push(msg);
            },
            onerror(e: ErrorEvent) {
              reject(new Error(e.message));
            },
            onclose() {
              // Closed
            },
          },
          config: {
            responseModalities: [Modality.AUDIO],
            mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: "Zephyr" },
              },
            },
            contextWindowCompression: {
              triggerTokens: "104857",
              slidingWindow: { targetTokens: "52428" },
            },
          },
        })
        .then((session) => {
          sessionRef = session;
          session.sendClientContent({ turns: [text] });
          return drainQueue();
        })
        .then(() => {
          sessionRef?.close();
          resolve();
        })
        .catch((err) => {
          sessionRef?.close();
          reject(err);
        });
    });

    if (audioParts.length === 0) {
      return Response.json(
        { error: "No audio returned from model" },
        { status: 500 }
      );
    }

    const wavBuffer = buildWav(audioParts, audioMimeType);
    const base64Wav = wavBuffer.toString("base64");

    return Response.json({
      audio: base64Wav,
      mimeType: "audio/wav",
      transcript: transcriptText,
    });
  } catch (err) {
    console.error("[voice route]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
