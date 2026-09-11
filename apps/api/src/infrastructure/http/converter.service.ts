import { Injectable, Logger } from "@nestjs/common";
import type {
  ConverterService,
  ExtractedContent,
  FeedListing,
} from "../../domain/index.js";

interface RawExtract {
  title: string;
  transcript: string;
  duration_seconds: number | null;
  channel: string | null;
}

@Injectable()
export class HttpConverterService implements ConverterService {
  private readonly logger = new Logger(HttpConverterService.name);
  private readonly baseUrl =
    process.env.CONVERTER_URL || "http://localhost:8000";

  private toExtracted(data: RawExtract): ExtractedContent {
    return {
      title: data.title,
      text: data.transcript,
      durationSeconds: data.duration_seconds,
      channel: data.channel,
    };
  }

  async extractUrl(url: string): Promise<ExtractedContent> {
    this.logger.log(`Calling converter for ${url}`);

    const response = await fetch(`${this.baseUrl}/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    return this.parse(response);
  }

  async extractFile(input: {
    filename: string;
    data: Buffer;
  }): Promise<ExtractedContent> {
    this.logger.log(`Uploading ${input.filename} to converter`);

    const form = new FormData();
    form.append("file", new Blob([input.data]), input.filename);

    const response = await fetch(`${this.baseUrl}/extract-file`, {
      method: "POST",
      body: form,
    });

    return this.parse(response);
  }

  async extractFeedItem(input: {
    feedUrl: string;
    itemUrl: string;
  }): Promise<ExtractedContent> {
    const response = await fetch(`${this.baseUrl}/extract-feed-item`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedUrl: input.feedUrl, itemUrl: input.itemUrl }),
    });

    return this.parse(response);
  }

  async listFeedItems(url: string): Promise<FeedListing> {
    const response = await fetch(`${this.baseUrl}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Converter service error ${response.status}: ${err}`);
    }

    return (await response.json()) as FeedListing;
  }

  private async parse(response: Response): Promise<ExtractedContent> {
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Converter service error ${response.status}: ${err}`);
    }
    return this.toExtracted((await response.json()) as RawExtract);
  }
}
