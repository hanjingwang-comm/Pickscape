import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
const endpoint = "https://api.meshy.ai/openapi/v1/image-to-3d";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const maxImage = 12 * 1024 * 1024;
class ApiError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
async function readLimited(stream, max) {
  const parts = [];
  let size = 0;
  for await (const chunk of stream) {
    size += chunk.length;
    if (size > max) throw new ApiError("文件超过允许大小。", 413);
    parts.push(chunk);
  }
  return Buffer.concat(parts);
}
export function imagePayload(value) {
  const match =
    typeof value === "string" &&
    value.match(/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || value.length > maxImage)
    throw new ApiError("请提供有效的 PNG 或 JPG 图片。");
  const bytes = Buffer.from(match[2], "base64");
  const valid =
    match[1] === "png"
      ? bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!valid) throw new ApiError("图片内容与格式不符。");
  return {
    image_url: value,
    ai_model: "meshy-6",
    should_texture: true,
    enable_pbr: true,
    should_remesh: true,
    topology: "triangle",
    target_polycount: 30000,
    target_formats: ["glb"],
  };
}
export function trustedModelUrl(value) {
  const u = new URL(value);
  if (
    u.protocol !== "https:" ||
    u.hostname !== "assets.meshy.ai" ||
    u.port ||
    u.username ||
    u.password
  )
    throw new ApiError("模型下载地址未通过校验。", 502);
  return u.href;
}
// This adapter is intentionally local-only. No key is sent to the browser.
export function generationMiddleware({
  enabled = false,
  key,
  directory,
  request = fetch,
}) {
  const active = new Map();
  const path = (id) => join(directory, `${id}.json`);
  const read = async (id) => {
    try {
      return JSON.parse(await readFile(path(id), "utf8"));
    } catch (e) {
      if (e.code === "ENOENT") return null;
      throw e;
    }
  };
  const write = async (id, data) => {
    await mkdir(directory, { recursive: true });
    await writeFile(path(id) + ".tmp", JSON.stringify(data), { mode: 0o600 });
    await rename(path(id) + ".tmp", path(id));
  };
  const api = async (route = "", options = {}) => {
    const res = await request(endpoint + route, {
      ...options,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) {
      const errors = {
        400: "生成服务无法处理此图片，请换一张主体清晰的图片。",
        401: "Meshy 密钥无效，请检查本机配置。",
        402: "Meshy 额度不足，请在服务商账户中检查。",
        404: "生成任务已过期或不存在。",
        429: "生成服务繁忙，请稍后重试。",
      };
      throw new ApiError(
        errors[res.status] || "生成服务暂时不可用。",
        res.status,
      );
    }
    return res.json();
  };
  const create = async (id, image) => {
    const old = await read(id);
    if (old) return old; // Repeated clicks/reloads must never create another billed task.
    const payload = imagePayload(image);
    await write(id, { status: "SUBMITTING" });
    try {
      const result = await api("", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!uuid.test(result.result)) throw new Error("Invalid task ID");
      const record = { status: "PENDING", task: result.result, progress: 0 };
      await write(id, record);
      return record;
    } catch (e) {
      const definite =
        e instanceof ApiError && [400, 401, 402, 413, 429].includes(e.status);
      const record = {
        status: definite ? "FAILED" : "UNCERTAIN",
        message: definite
          ? e.message
          : "提交结果尚无法确认。请在 Meshy 后台核对任务，避免重复扣费。",
      };
      await write(id, record);
      return record;
    }
  };
  return async (req, res, next) => {
    const pathname = new URL(req.url, "http://localhost").pathname;
    if (!pathname.startsWith("/api/generation")) return next();
    const send = (status, data) => {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(data));
    };
    try {
      const host = req.headers.host || "";
      if (
        !/^(127\.0\.0\.1|localhost):\d+$/.test(host) ||
        (req.headers.origin && req.headers.origin !== `http://${host}`)
      )
        throw new ApiError("仅允许本机同源访问。", 403);
      if (pathname === "/api/generation/config" && req.method === "GET")
        return send(200, {
          enabled,
          configured: enabled && !!key,
          provider: "Meshy",
        });
      if (!enabled)
        throw new ApiError("当前版本尚未开放图片自动生成 3D。", 503);
      if (!key)
        throw new ApiError(
          "3D 生成服务未配置：请在本机 .env.local 设置 MESHY_API_KEY 并重启开发服务。",
          503,
        );
      const match = pathname.match(
        /^\/api\/generation\/([0-9a-f-]+)(\/model)?$/i,
      );
      if (!match || !uuid.test(match[1]))
        throw new ApiError("无效的生成任务。", 404);
      const id = match[1];
      if (req.method === "POST" && !match[2]) {
        if (
          req.headers["x-yidu-client"] !== "1" ||
          req.headers.origin !== `http://${host}`
        )
          throw new ApiError("请求来源无效。", 403);
        let body;
        try {
          body = JSON.parse(
            (await readLimited(req, maxImage + 1024)).toString(),
          );
        } catch (e) {
          if (e instanceof ApiError) throw e;
          throw new ApiError("请求内容无效。");
        }
        if (body.consent !== true)
          throw new ApiError("请确认将图片发送到 Meshy 生成。");
        if (!active.has(id))
          active.set(
            id,
            create(id, body.image).finally(() => active.delete(id)),
          );
        const result = await active.get(id);
        return send(200, {
          status: result.status,
          progress: result.progress,
          message: result.message,
        });
      }
      if (req.method !== "GET") throw new ApiError("不支持此操作。", 405);
      const record = await read(id);
      if (!record)
        throw new ApiError("未找到任务，请重新连接原本的本机服务。", 404);
      if (!record.task)
        return send(200, {
          status: record.status === "SUBMITTING" ? "UNCERTAIN" : record.status,
          message:
            record.message ||
            "提交可能仍在处理中；请在 Meshy 后台核对，避免重复扣费。",
        });
      const task = await api(`/${record.task}`);
      if (match[2]) {
        if (task.status !== "SUCCEEDED" || !task.model_urls?.glb)
          throw new ApiError("模型尚未生成完成。", 409);
        const model = await request(trustedModelUrl(task.model_urls.glb), {
          redirect: "error",
          signal: AbortSignal.timeout(90000),
        });
        if (!model.ok || !model.body)
          throw new ApiError("模型下载失败，可重试取回，无需重新生成。", 502);
        if (Number(model.headers.get("content-length")) > 50 * 1024 * 1024)
          throw new ApiError(
            "生成模型超过 50 MB，请从 Meshy 后台下载并优化后导入。",
            413,
          );
        const bytes = await readLimited(model.body, 50 * 1024 * 1024);
        if (bytes.subarray(0, 4).toString() !== "glTF")
          throw new ApiError("生成服务返回的模型不是有效 GLB。", 502);
        res.writeHead(200, {
          "Content-Type": "model/gltf-binary",
          "Cache-Control": "no-store",
        });
        return res.end(bytes);
      }
      const status = [
        "PENDING",
        "IN_PROGRESS",
        "SUCCEEDED",
        "FAILED",
        "CANCELED",
      ].includes(task.status)
        ? task.status
        : "IN_PROGRESS";
      return send(200, {
        status,
        progress:
          typeof task.progress === "number"
            ? Math.max(0, Math.min(100, task.progress))
            : undefined,
        message: ["FAILED", "CANCELED"].includes(status)
          ? "模型生成失败或已取消，原图已保留。可以换图，或重新生成。"
          : undefined,
      });
    } catch (e) {
      return send(e.status || 502, {
        error:
          e instanceof ApiError ? e.message : "无法连接生成服务，请稍后重试。",
      });
    }
  };
}
