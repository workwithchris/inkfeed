from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from markitdown import MarkItDown
import re
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="YouTube-to-Article Converter", version="1.0.0")

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


def extract_video_id(url: str) -> str | None:
    patterns = [
        r"(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


@app.post("/extract", response_model=ExtractResponse)
async def extract_transcript(req: ExtractRequest):
    url_str = str(req.url)
    video_id = extract_video_id(url_str)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")

    try:
        md = MarkItDown()
        result = md.convert(url_str)
        text_content = result.text_content or ""

        title_match = re.search(r"^#\s+(.+)$", text_content, re.MULTILINE)
        title = title_match.group(1) if title_match else "Untitled Video"

        transcript_start = text_content.find("Transcript:")
        transcript = (
            text_content[transcript_start:].strip()
            if transcript_start != -1
            else text_content
        )

        channel_match = re.search(r"\*\*Channel:\*\*\s*(.+)", text_content)
        channel = channel_match.group(1).strip() if channel_match else None

        duration_match = re.search(r"\*\*Duration:\*\*\s*(.+)", text_content)
        duration_str = duration_match.group(1).strip() if duration_match else None
        duration_seconds = None
        if duration_str:
            parts = duration_str.split(":")
            if len(parts) == 3:
                duration_seconds = (
                    int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
                )
            elif len(parts) == 2:
                duration_seconds = int(parts[0]) * 60 + int(parts[1])

        return ExtractResponse(
            title=title,
            transcript=transcript,
            duration_seconds=duration_seconds,
            channel=channel,
        )
    except Exception as e:
        logger.error(f"Extraction failed for {url_str}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Extraction failed: {str(e)}"
        )


@app.get("/health")
async def health():
    return {"status": "ok"}
