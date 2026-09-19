import { describe, it, expect } from "vitest";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  generationMiddleware,
  imagePayload,
  trustedModelUrl,
} from "./generation.mjs";
const image = "data:image/png;base64,iVBORw0KGgo=";
const id = "0e8d69eb-c189-493b-a240-7689337f3091";
const task = "e9025db4-7c4d-4e57-94d3-211bd97c68f0";
async function setup(key: string, request: typeof fetch, enabled = true) {
  const directory = await mkdtemp(join(tmpdir(), "yidu-generation-"));
  const handler = generationMiddleware({ enabled, key, directory, request });
  const server = createServer(
    (req, res) =>
      void handler(req, res, () => {
        res.statusCode = 404;
        res.end();
      }),
  );
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(server.address() as any).port}`;
  const call = (path = id, post = false, origin = url) =>
    fetch(
      `${url}/api/generation/${path}`,
      post
        ? {
            method: "POST",
            headers: {
              Origin: origin,
              "X-Yidu-Client": "1",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ image, consent: true }),
          }
        : undefined,
    );
  const close = async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  };
  return { call, close };
}
describe("local image-to-3D adapter", () => {
  it("requires configuration and rejects malformed images and untrusted model hosts", async () => {
    expect(() => imagePayload("data:image/png;base64,ZmFrZQ==")).toThrow();
    expect(() => trustedModelUrl("http://127.0.0.1/private")).toThrow();
    expect(() =>
      trustedModelUrl("https://assets.meshy.ai.evil.example/a.glb"),
    ).toThrow();
    expect(imagePayload(image).target_formats).toEqual(["glb"]);
    const app = await setup("", async () => {
      throw new Error("must not call provider");
    });
    try {
      expect(await (await app.call("config")).json()).toEqual({
        enabled: true,
        configured: false,
        provider: "Meshy",
      });
      expect((await app.call(id, true)).status).toBe(503);
    } finally {
      await app.close();
    }
  });
  it("deduplicates repeated submissions, reports actual progress, and returns binary models", async () => {
    let creates = 0;
    let done = false;
    const app = await setup("test-secret", async (url, options) => {
      if (options?.method === "POST") {
        creates++;
        return Response.json({ result: task });
      }
      if (String(url).startsWith("https://assets.meshy.ai/"))
        return new Response(new TextEncoder().encode("glTFtest-model"));
      return Response.json({
        status: done ? "SUCCEEDED" : "IN_PROGRESS",
        progress: done ? 100 : 37,
        model_urls: { glb: "https://assets.meshy.ai/test.glb" },
      });
    });
    try {
      expect((await app.call(id, true, "https://other.example")).status).toBe(
        403,
      );
      await Promise.all([app.call(id, true), app.call(id, true)]);
      await app.call(id, true);
      expect(creates).toBe(1);
      expect(await (await app.call()).json()).toMatchObject({
        status: "IN_PROGRESS",
        progress: 37,
      });
      done = true;
      expect(await (await app.call(id + "/model")).text()).toBe(
        "glTFtest-model",
      );
    } finally {
      await app.close();
    }
  });
  it("keeps uncertain submissions instead of repeating paid requests", async () => {
    let calls = 0;
    const app = await setup("test-secret", async () => {
      calls++;
      throw new Error("timeout");
    });
    try {
      expect(await (await app.call(id, true)).json()).toMatchObject({
        status: "UNCERTAIN",
      });
      await app.call(id, true);
      expect(calls).toBe(1);
      expect(await (await app.call()).json()).toMatchObject({
        status: "UNCERTAIN",
      });
    } finally {
      await app.close();
    }
  });
  it("explains insufficient credits and preserves a failed task without resubmitting", async () => {
    let calls = 0;
    const app = await setup("test-secret", async () => {
      calls++;
      return new Response("", { status: 402 });
    });
    try {
      expect(await (await app.call(id, true)).json()).toMatchObject({
        status: "FAILED",
        message: expect.stringContaining("额度不足"),
      });
      await app.call(id, true);
      expect(calls).toBe(1);
    } finally {
      await app.close();
    }
  });
});

it("keeps the reserved integration off even when a key is present", async () => {
  const app = await setup(
    "test-key",
    async () => {
      throw new Error("must not submit");
    },
    false,
  );
  try {
    expect(await (await app.call("config")).json()).toMatchObject({
      enabled: false,
      configured: false,
    });
    const result = await app.call(id, true);
    expect(result.status).toBe(503);
    expect(await result.json()).toMatchObject({
      error: expect.stringContaining("尚未开放"),
    });
  } finally {
    await app.close();
  }
});
