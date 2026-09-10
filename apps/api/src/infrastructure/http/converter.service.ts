import { Injectable, Logger } from "@nestjs/common";
import type { ConverterService } from "../../domain/index";

@Injectable()
export class HttpConverterService implements ConverterService {
  private readonly logger = new Logger(HttpConverterService.name);
  private readonly baseUrl =
    process.env.CONVERTER_URL || "http://localhost:8000";

  async extractTranscript(url: string): Promise<{
    title: string;
    transcript: string;
    durationSeconds: number | null;
    channel: string | null;
  }> {
    this.logger.log(`Calling converter for ${url}`);

    const response = await fetch(`${this.baseUrl}/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Converter service error ${response.status}: ${err}`);
    }

    const data = (await response.json()) as {
      title: string;
      transcript: string;
      duration_seconds: number | null;
      channel: string | null;
    };

    return {
      title: data.title,
      transcript: data.transcript,
      durationSeconds: data.duration_seconds,
      channel: data.channel,
    };
  }
}
