from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from markitdown import MarkItDown
import feedparser
import io
import html
import re
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Inkfeed Converter", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST"],
    allow_headers=["*"],
)


class ExtractRequest(BaseModel):
    url: HttpUrl


class ExtractResponse(BaseModel):
    title: str
    transcript: str
    duration_seconds: int | None = None
    channel: str | None = None


class FeedItem(BaseModel):
    title: str
    link: str | None = None
    audioUrl: str | None = None
    publishedAt: str | None = None
    summary: str | None = None


class FeedResponse(BaseModel):
    title: str
    items: list[FeedItem]


class FeedItemRequest(BaseModel):
    feedUrl: HttpUrl
    itemUrl: str


def extract_video_id(url: str) -> str | None:
    patterns = [
        r"(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def first_title(text: str, fallback: str = "Untitled") -> str:
    heading = re.search(r"^#\s+(.+)$", text, re.MULTILINE)
    if heading:
        return heading.group(1).strip()
    for line in text.splitlines():
        cleaned = line.strip().lstrip("#").strip()
        if cleaned:
            return cleaned[:200]
    return fallback


def html_to_markdown(raw_html: str) -> str:
    try:
        md = MarkItDown()
        stream = io.BytesIO(raw_html.encode("utf-8"))
        return md.convert_stream(stream, file_extension=".html").text_content or ""
    except Exception as exc:  # noqa: BLE001
        logger.warning("HTML->markdown failed, falling back to text: %s", exc)
        return html.unescape(re.sub(r"<[^>]+>", " ", raw_html))


def parse_duration(value: str | None) -> int | None:
    """Parse an ISO-8601 duration (PT4M13S) or a clock duration (4:13 / 1:04:13)."""
    if not value:
        return None
    value = value.strip()
    iso = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", value)
    if iso:
        hours, minutes, seconds = (int(part or 0) for part in iso.groups())
        return hours * 3600 + minutes * 60 + seconds
    parts = value.split(":")
    if 1 < len(parts) <= 3 and all(part.isdigit() for part in parts):
        total = 0
        for part in parts:
            total = total * 60 + int(part)
        return total
    return None


def extract_youtube(url_str: str) -> ExtractResponse:
    video_id = extract_video_id(url_str)
    # MarkItDown only routes canonical watch URLs to its YouTube converter.
    if video_id:
        url_str = f"https://www.youtube.com/watch?v={video_id}"

    md = MarkItDown()
    result = md.convert(url_str)
    text_content = result.text_content or ""

    # MarkItDown sets a structured title; fall back to the first heading.
    title = (getattr(result, "title", None) or "").strip()
    if not title or title.lower() == "youtube":
        heading = re.search(r"^##\s+(.+)$", text_content, re.MULTILINE)
        title = (
            heading.group(1).strip()
            if heading
            else first_title(text_content, "Untitled Video")
        )

    # Transcript is everything after the "### Transcript" heading.
    transcript = text_content.strip()
    transcript_match = re.search(
        r"^#{2,3}\s*Transcript\s*$", text_content, re.MULTILINE
    )
    if transcript_match:
        transcript = text_content[transcript_match.end():].strip()

    channel_match = re.search(r"\*\*Channel:\*\*\s*(.+)", text_content)
    channel = channel_match.group(1).strip() if channel_match else None

    duration_match = re.search(
        r"\*\*(?:Runtime|Duration):\*\*\s*([^\s]+)", text_content
    )
    duration_seconds = parse_duration(duration_match.group(1) if duration_match else None)

    return ExtractResponse(
        title=title,
        transcript=transcript,
        duration_seconds=duration_seconds,
        channel=channel,
    )


@app.post("/extract", response_model=ExtractResponse)
async def extract(req: ExtractRequest):
    url_str = str(req.url)
    try:
        if extract_video_id(url_str):
            return extract_youtube(url_str)

        # Generic web page: convert readable content to markdown.
        md = MarkItDown()
        result = md.convert(url_str)
        text_content = (result.text_content or "").strip()
        if not text_content:
            raise HTTPException(status_code=422, detail="No readable content found")
        return ExtractResponse(
            title=first_title(text_content, "Untitled"),
            transcript=text_content,
            duration_seconds=None,
            channel=None,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Extraction failed for {url_str}: {e}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


@app.post("/extract-file", response_model=ExtractResponse)
async def extract_file(file: UploadFile = File(...)):
    filename = file.filename or "upload"
    extension = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else None
    try:
        data = await file.read()
        md = MarkItDown()
        result = md.convert_stream(io.BytesIO(data), file_extension=extension)
        text_content = (result.text_content or "").strip()
        if not text_content:
            raise HTTPException(status_code=422, detail="No content extracted from file")
        return ExtractResponse(
            title=first_title(text_content, filename),
            transcript=text_content,
            duration_seconds=None,
            channel=None,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File extraction failed for {filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


@app.post("/feed", response_model=FeedResponse)
async def feed(req: ExtractRequest):
    url_str = str(req.url)
    try:
        parsed = feedparser.parse(url_str)
        if parsed.bozo and not parsed.entries:
            raise HTTPException(status_code=422, detail="Could not parse feed")

        items: list[FeedItem] = []
        for entry in parsed.entries[:50]:
            audio_url = None
            for enclosure in entry.get("enclosures", []) or []:
                href = enclosure.get("href")
                if href:
                    audio_url = href
                    break
            for link in entry.get("links", []) or []:
                if link.get("rel") == "enclosure" and link.get("href"):
                    audio_url = link.get("href")
                    break
            items.append(
                FeedItem(
                    title=entry.get("title", "Untitled"),
                    link=entry.get("link"),
                    audioUrl=audio_url,
                    publishedAt=entry.get("published"),
                    summary=entry.get("summary"),
                )
            )

        title = parsed.feed.get("title", "Feed") if parsed.feed else "Feed"
        return FeedResponse(title=title, items=items)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Feed parsing failed for {url_str}: {e}")
        raise HTTPException(status_code=500, detail=f"Feed parsing failed: {str(e)}")


@app.post("/extract-feed-item", response_model=ExtractResponse)
async def extract_feed_item(req: FeedItemRequest):
    feed_url = str(req.feedUrl)
    try:
        parsed = feedparser.parse(feed_url)
        if parsed.bozo and not parsed.entries:
            raise HTTPException(status_code=422, detail="Could not parse feed")

        target = req.itemUrl.strip()
        entry = next(
            (
                e
                for e in parsed.entries
                if e.get("link") == target or e.get("id") == target
            ),
            None,
        )
        if entry is None:
            raise HTTPException(status_code=404, detail="Episode not found in feed")

        # Prefer full content, then summary.
        raw = ""
        content = entry.get("content")
        if content and content[0].get("value"):
            raw = content[0]["value"]
        elif entry.get("summary"):
            raw = entry["summary"]

        text = html_to_markdown(raw).strip() if raw else ""
        if not text and entry.get("link"):
            # Fall back to the episode page.
            return await extract(ExtractRequest(url=entry["link"]))

        channel = parsed.feed.get("title") if parsed.feed else None
        return ExtractResponse(
            title=entry.get("title", "Untitled"),
            transcript=text or (entry.get("title") or "Untitled"),
            duration_seconds=None,
            channel=channel,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Feed item extraction failed for {feed_url}: {e}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


@app.get("/health")
async def health():
    return {"status": "ok"}
