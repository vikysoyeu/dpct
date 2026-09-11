import { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { randomUUID } from "crypto";
import { mkdir } from "fs/promises";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import path from "path";

const uploadRoot = path.resolve(process.cwd(), "uploads");
const locationUploadDir = path.join(uploadRoot, "locations");

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extensionFromMime(mimeType: string) {
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/gif") return ".gif";
  return "";
}

export default async function uploadRoutes(fastify: FastifyInstance) {
  await mkdir(locationUploadDir, { recursive: true });

  await fastify.register(multipart, {
    limits: {
      fileSize: 8 * 1024 * 1024,
      files: 1,
    },
  });

  await fastify.register(fastifyStatic, {
    root: uploadRoot,
    prefix: "/uploads/",
    decorateReply: false,
  });

  fastify.post("/upload", async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ message: "Vui lòng chọn một file ảnh." });
    }

    if (!allowedMimeTypes.has(file.mimetype)) {
      await file.file.resume();
      return reply.status(400).send({ message: "Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF." });
    }

    const safeBaseName = path
      .basename(file.filename, path.extname(file.filename))
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "location";
    const filename = `${Date.now()}-${randomUUID()}-${safeBaseName}${extensionFromMime(file.mimetype)}`;
    const targetPath = path.join(locationUploadDir, filename);

    await pipeline(file.file, createWriteStream(targetPath));

    const url = `/uploads/locations/${filename}`;
    return reply.status(201).send({
      data: {
        url,
        filename,
        mimetype: file.mimetype,
        uploadDir: locationUploadDir,
        storage: "local",
      },
    });
  });
}
