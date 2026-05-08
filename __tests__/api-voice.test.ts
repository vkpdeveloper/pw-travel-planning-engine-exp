import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type AnyCallbacks = {
  onopen?: () => void;
  onmessage?: (msg: unknown) => void;
  onerror?: (e: { message: string }) => void;
  onclose?: () => void;
};

const { connectMock } = vi.hoisted(() => ({ connectMock: vi.fn() }));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    live = { connect: connectMock };
  },
  Modality: { AUDIO: "AUDIO" },
  MediaResolution: { MEDIA_RESOLUTION_MEDIUM: "MEDIUM" },
}));

const makeReq = (body: unknown) =>
  new Request("http://test/api/voice", {
    method: "POST",
    body: JSON.stringify(body),
  });

const audioB64 = Buffer.from(new Uint8Array([1, 2, 3, 4])).toString("base64");

describe("POST /api/voice", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    connectMock.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 when text is missing/blank", async () => {
    const { POST } = await import("@/app/api/voice/route");
    const res = await POST(makeReq({ text: "  " }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: "No text provided" });
  });

  it("streams audio parts and returns wav-encoded base64 + transcript", async () => {
    const session = { sendClientContent: vi.fn(), close: vi.fn() };
    connectMock.mockImplementation(async ({ callbacks }: { callbacks: AnyCallbacks }) => {
      // Fire messages asynchronously after the handler starts draining.
      setTimeout(() => {
        callbacks.onopen?.();
        callbacks.onmessage?.({
          serverContent: {
            modelTurn: {
              parts: [
                { inlineData: { data: audioB64, mimeType: "audio/L16;rate=16000" } },
                { text: "hello " },
              ],
            },
          },
        });
        callbacks.onmessage?.({
          serverContent: {
            modelTurn: { parts: [{ text: "world" }] },
            turnComplete: true,
          },
        });
        callbacks.onclose?.();
      }, 0);
      return session;
    });

    const { POST } = await import("@/app/api/voice/route");
    const res = await POST(makeReq({ text: "hi" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.mimeType).toBe("audio/wav");
    expect(typeof data.audio).toBe("string");
    expect(data.audio.length).toBeGreaterThan(0);
    expect(data.transcript).toBe("hello world");
    expect(session.sendClientContent).toHaveBeenCalledWith({ turns: ["hi"] });
    expect(session.close).toHaveBeenCalled();
  });

  it("returns 500 when no audio is returned", async () => {
    const session = { sendClientContent: vi.fn(), close: vi.fn() };
    connectMock.mockImplementation(async ({ callbacks }: { callbacks: AnyCallbacks }) => {
      setTimeout(() => {
        callbacks.onmessage?.({ serverContent: { turnComplete: true } });
      }, 0);
      return session;
    });

    const { POST } = await import("@/app/api/voice/route");
    const res = await POST(makeReq({ text: "hi" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/No audio/);
  });

  it("returns 500 when the live connection errors", async () => {
    connectMock.mockImplementation(async ({ callbacks }: { callbacks: AnyCallbacks }) => {
      setTimeout(() => callbacks.onerror?.({ message: "boom" }), 0);
      return { sendClientContent: vi.fn(), close: vi.fn() };
    });

    const { POST } = await import("@/app/api/voice/route");
    const res = await POST(makeReq({ text: "hi" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("boom");
  });

  it("returns 500 when connect itself rejects (non-Error)", async () => {
    connectMock.mockRejectedValue("string-fail");
    const { POST } = await import("@/app/api/voice/route");
    const res = await POST(makeReq({ text: "hi" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Internal server error");
  });
});
