import { Controller, Get, Param, Res, NotFoundException } from "@nestjs/common";
import { createReadStream, existsSync } from "fs";
import { join } from "path";
import type { Response } from "express";

function uploadRoot(): string {
  return process.env.UPLOAD_DIR || join(process.cwd(), "uploads");
}

// Public, unauthenticated media (rendered videos) so articles can embed them.
@Controller("api/media")
export class MediaController {
  @Get("videos/:file")
  video(@Param("file") file: string, @Res() res: Response) {
    // Guard against path traversal: only allow a bare filename.
    const safe = file.replace(/[^a-zA-Z0-9._-]/g, "");
    const full = join(uploadRoot(), "videos", safe);
    if (!safe || !existsSync(full)) {
      throw new NotFoundException("Video not found");
    }

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    createReadStream(full).pipe(res);
  }
}
