import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { streamTextMock, googleFactoryMock } = vi.hoisted(() => ({
  streamTextMock: vi.fn(),
  googleFactoryMock: vi.fn(),
}));

vi.mock("ai", () => ({
  streamText: streamTextMock,
  tool: (def: unknown) => def,
  stepCountIs: (n: number) => n,
  convertToModelMessages: async (m: unknown) => m,
}));

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: () => {
    const fn = (model: string) => ({ model });
    return Object.assign(fn, googleFactoryMock);
  },
}));

const makeReq = (body: unknown) =>
  new Request("http://test/api/travel", {
    method: "POST",
    body: JSON.stringify(body),
  });

describe("POST /api/travel", () => {
  beforeEach(() => {
    streamTextMock.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("invokes streamText and returns the streamed UI message response", async () => {
    const fakeResponse = new Response("ok");
    const toUIMessageStreamResponse = vi.fn().mockReturnValue(fakeResponse);
    streamTextMock.mockReturnValue({ toUIMessageStreamResponse });

    const { POST } = await import("@/app/api/travel/route");
    const messages = [{ role: "user", content: "plan a trip" }];
    const userProfile = { name: "Alex", location: { displayName: "NYC", lat: 40.7, lng: -74 } };

    const res = await POST(makeReq({ messages, userProfile }));

    expect(res).toBe(fakeResponse);
    expect(streamTextMock).toHaveBeenCalledTimes(1);
    const arg = streamTextMock.mock.calls[0][0];
    expect(arg.messages).toEqual(messages);
    expect(arg.system).toContain("Alex");
    expect(arg.system).toContain("NYC");
    expect(arg.tools).toMatchObject({
      askFollowUpQuestions: expect.any(Object),
      calculateRoute: expect.any(Object),
      searchFlights: expect.any(Object),
      findPlaces: expect.any(Object),
      optimizeItinerary: expect.any(Object),
      aerialView: expect.any(Object),
    });
  });

  it("works without a userProfile", async () => {
    const toUIMessageStreamResponse = vi.fn().mockReturnValue(new Response("ok"));
    streamTextMock.mockReturnValue({ toUIMessageStreamResponse });

    const { POST } = await import("@/app/api/travel/route");
    await POST(makeReq({ messages: [] }));

    const arg = streamTextMock.mock.calls[0][0];
    expect(arg.system).not.toContain("User Profile");
  });
});
