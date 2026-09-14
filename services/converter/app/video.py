"""Render a short vertical video from an article's title + scenes.

Free/local pipeline: Pillow draws the scene cards, edge-tts provides an
optional voiceover, and FFmpeg assembles the MP4. No paid provider required.
"""

import asyncio
import io
import os
import subprocess
import tempfile
import logging

from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger(__name__)

FPS = 30
FONT_DIR = "/usr/share/fonts/truetype/dejavu"
BOLD = os.path.join(FONT_DIR, "DejaVuSans-Bold.ttf")

FONTS = {
    "sans": (
        os.path.join(FONT_DIR, "DejaVuSans.ttf"),
        os.path.join(FONT_DIR, "DejaVuSans-Bold.ttf"),
    ),
    "serif": (
        os.path.join(FONT_DIR, "DejaVuSerif.ttf"),
        os.path.join(FONT_DIR, "DejaVuSerif-Bold.ttf"),
    ),
    "mono": (
        os.path.join(FONT_DIR, "DejaVuSansMono.ttf"),
        os.path.join(FONT_DIR, "DejaVuSansMono-Bold.ttf"),
    ),
}

DEFAULT_VOICE = "en-US-GuyNeural"


def _hex_to_rgb(value: str | None):
    if not value:
        return None
    cleaned = value.strip().lstrip("#")
    if len(cleaned) == 3:
        cleaned = "".join(ch * 2 for ch in cleaned)
    if len(cleaned) != 6:
        return None
    try:
        return tuple(int(cleaned[i : i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        return None

ASPECTS = {
    "9:16": (1080, 1920),
    "1:1": (1080, 1080),
    "16:9": (1920, 1080),
}

# theme -> (bg_top, bg_bottom, ink, mute, faint)
THEMES = {
    "ink": ((28, 28, 33), (2, 2, 3), (245, 245, 244), (161, 161, 170), (120, 120, 130)),
    "slate": ((30, 41, 59), (2, 6, 23), (241, 245, 249), (148, 163, 184), (100, 116, 139)),
    "noir": ((24, 24, 24), (0, 0, 0), (250, 250, 250), (163, 163, 163), (115, 115, 115)),
    "light": ((250, 250, 250), (228, 228, 231), (23, 23, 23), (82, 82, 91), (113, 113, 122)),
}


def _font(path: str, size: int):
    try:
        return ImageFont.truetype(path, size)
    except Exception:  # noqa: BLE001
        return ImageFont.load_default()


def _gradient(width, height, top, bottom) -> Image.Image:
    small = Image.new("RGB", (64, 64))
    px = small.load()
    for y in range(64):
        for x in range(64):
            t = (x + y) / 126.0
            px[x, y] = tuple(
                int(top[i] * (1 - t) + bottom[i] * t) for i in range(3)
            )
    return small.resize((width, height), Image.BICUBIC)


def _fit_cover(image: Image.Image, width: int, height: int) -> Image.Image:
    ratio = max(width / image.width, height / image.height)
    resized = image.resize(
        (int(image.width * ratio) + 1, int(image.height * ratio) + 1),
        Image.LANCZOS,
    )
    left = (resized.width - width) // 2
    top = (resized.height - height) // 2
    return resized.crop((left, top, left + width, top + height))


def _background(image_bytes, width, height, theme) -> Image.Image:
    if image_bytes:
        try:
            source = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            fitted = _fit_cover(source, width, height)
            return Image.blend(
                fitted, Image.new("RGB", (width, height), (0, 0, 0)), 0.58
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Image background failed, using gradient: %s", exc)
    return _gradient(width, height, theme[0], theme[1])


def _wrap(text, font, draw, max_width) -> list[str]:
    lines: list[str] = []
    current = ""
    for word in text.split():
        trial = f"{current} {word}".strip()
        if draw.textlength(trial, font=font) <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def _scene_image(
    background,
    kicker,
    text,
    width,
    height,
    theme,
    font_style="sans",
    text_color=None,
    position="center",
    uppercase=False,
    watermark=True,
    watermark_text=None,
):
    ink, mute, faint = theme[2], theme[3], theme[4]
    text_rgb = _hex_to_rgb(text_color) or ink
    _, bold = FONTS.get(font_style, FONTS["sans"])

    image = background.copy()
    draw = ImageDraw.Draw(image)
    margin = int(width * 0.09)
    max_width = width - margin * 2

    if kicker:
        draw.text(
            (margin, int(height * 0.2)),
            kicker.upper(),
            font=_font(bold, int(width * 0.035)),
            fill=mute,
        )

    body = text.upper() if uppercase else text
    size = int(width * 0.078) if len(body) < 110 else int(width * 0.062)
    font = _font(bold, size)
    lines = _wrap(body, font, draw, max_width)
    line_height = font.size + int(width * 0.018)
    total = len(lines) * line_height

    if position == "top":
        y = int(height * 0.26)
    elif position == "bottom":
        y = int(height * 0.82) - total
    else:
        y = height // 2 - total // 2

    for line in lines:
        draw.text((margin, y), line, font=font, fill=text_rgb)
        y += line_height

    if watermark:
        draw.text(
            (margin, height - int(height * 0.1)),
            (watermark_text or "INKFEED").upper(),
            font=_font(bold, int(width * 0.03)),
            fill=faint,
        )
    return image


async def _tts(text, voice, path, rate, pitch):
    import edge_tts

    kwargs: dict = {}
    if rate:
        kwargs["rate"] = f"{int(rate):+d}%"
    if pitch:
        kwargs["pitch"] = f"{int(pitch):+d}Hz"
    await edge_tts.Communicate(text, voice, **kwargs).save(path)


def _probe_duration(path: str) -> float:
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                path,
            ],
            capture_output=True,
            text=True,
            check=True,
        )
        return max(float(result.stdout.strip()), 1.0)
    except Exception:  # noqa: BLE001
        return 4.0


def _ffmpeg(args, cwd):
    result = subprocess.run(
        ["ffmpeg", "-y", *args], cwd=cwd, capture_output=True, text=True
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr[-800:])


def _segment_args(
    index, duration_float, has_audio, width, height, ken_burns, fade
):
    if ken_burns:
        args = ["-i", f"scene_{index}.png"]
    else:
        args = ["-loop", "1", "-i", f"scene_{index}.png"]
    if has_audio:
        args += ["-i", f"scene_{index}.mp3"]

    if ken_burns:
        frames = max(int(duration_float * FPS), 1)
        filters = [
            f"scale={int(width * 1.25)}:{int(height * 1.25)}",
            "zoompan=z='min(zoom+0.0015,1.25)'"
            f":d={frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
            f":s={width}x{height}:fps={FPS}",
        ]
    else:
        filters = [f"scale={width}:{height}"]

    if fade:
        fade_out = max(duration_float - 0.3, 0)
        filters.append("fade=t=in:st=0:d=0.3")
        filters.append(f"fade=t=out:st={fade_out:.2f}:d=0.3")

    args += [
        "-t",
        f"{duration_float:.2f}",
        "-r",
        str(FPS),
        "-pix_fmt",
        "yuv420p",
        "-vf",
        ",".join(filters),
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-map",
        "0:v:0",
    ]
    if has_audio:
        args += ["-c:a", "aac", "-b:a", "128k", "-map", "1:a:0", "-shortest"]
    args += ["-movflags", "+faststart", f"seg_{index}.mp4"]
    return args


def build_video(
    title: str,
    scenes: list[dict],
    author: str | None = None,
    subtitle: str | None = None,
    images: list[bytes] | None = None,
    voice: str | None = None,
    aspect: str = "9:16",
    theme_key: str = "ink",
    quality: str = "final",
    voice_rate: int | None = None,
    voice_pitch: int | None = None,
    ken_burns: bool = False,
    transition: str | None = None,
    music_bytes: bytes | None = None,
    music_volume: int | None = None,
    font_style: str = "sans",
    text_color: str | None = None,
    text_position: str = "center",
    uppercase: bool = False,
    watermark: bool = True,
    watermark_text: str | None = None,
) -> bytes:
    cleaned = [
        s for s in scenes if isinstance(s, dict) and (s.get("text") or "").strip()
    ]
    if not cleaned:
        cleaned = [{"text": title or "Untitled", "narration": title or "Untitled"}]
    cleaned = cleaned[:40]

    width, height = ASPECTS.get(aspect, ASPECTS["9:16"])
    if quality == "preview":
        width, height = width // 2, height // 2

    theme = THEMES.get(theme_key, THEMES["ink"])
    backgrounds = (
        [_background(b, width, height, theme) for b in images] if images else []
    )
    gradient = _gradient(width, height, theme[0], theme[1])
    voice = voice or DEFAULT_VOICE
    fade = transition == "fade"
    has_any_audio = False

    with tempfile.TemporaryDirectory() as work:
        segments: list[str] = []
        for index, scene in enumerate(cleaned):
            text = (scene.get("text") or "").strip()
            narration = (scene.get("narration") or text).strip()
            kicker = (subtitle or "Inkfeed") if index == 0 else (author or "")
            background = (
                backgrounds[index % len(backgrounds)] if backgrounds else gradient
            )
            image = _scene_image(
                background,
                kicker,
                text,
                width,
                height,
                theme,
                font_style=font_style,
                text_color=text_color,
                position=text_position,
                uppercase=uppercase,
                watermark=watermark,
                watermark_text=watermark_text,
            )
            image.save(os.path.join(work, f"scene_{index}.png"))

            mp3 = os.path.join(work, f"scene_{index}.mp3")
            has_audio = True
            try:
                asyncio.run(_tts(narration, voice, mp3, voice_rate, voice_pitch))
                if not os.path.exists(mp3) or os.path.getsize(mp3) == 0:
                    has_audio = False
            except Exception as exc:  # noqa: BLE001
                logger.warning("TTS failed for scene %s: %s", index, exc)
                has_audio = False

            if has_audio:
                has_any_audio = True

            duration_float = _probe_duration(mp3) + 0.5 if has_audio else 4.0
            _ffmpeg(
                _segment_args(
                    index,
                    duration_float,
                    has_audio,
                    width,
                    height,
                    ken_burns,
                    fade,
                ),
                work,
            )
            segments.append(f"seg_{index}.mp4")

        with open(os.path.join(work, "list.txt"), "w", encoding="utf-8") as handle:
            for name in segments:
                handle.write(f"file '{name}'\n")

        _ffmpeg(
            [
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                "list.txt",
                "-c",
                "copy",
                "-movflags",
                "+faststart",
                "out.mp4",
            ],
            work,
        )

        output = "out.mp4"
        if music_bytes:
            output = _mix_music(work, has_any_audio, music_bytes, music_volume)

        with open(os.path.join(work, output), "rb") as handle:
            return handle.read()


def _mix_music(work, has_any_audio, music_bytes, music_volume) -> str:
    with open(os.path.join(work, "music.mp3"), "wb") as handle:
        handle.write(music_bytes)

    volume = max(0, min(music_volume if music_volume is not None else 20, 100)) / 100.0
    total = _probe_duration(os.path.join(work, "out.mp4"))
    fade_out = max(total - 2.0, 0.0)

    if has_any_audio:
        filter_complex = (
            f"[1:a]volume={volume:.2f},afade=t=out:st={fade_out:.2f}:d=2[m];"
            "[0:a][m]amix=inputs=2:duration=first:dropout_transition=3[a]"
        )
        _ffmpeg(
            [
                "-i",
                "out.mp4",
                "-i",
                "music.mp3",
                "-filter_complex",
                filter_complex,
                "-map",
                "0:v",
                "-map",
                "[a]",
                "-c:v",
                "copy",
                "-c:a",
                "aac",
                "-shortest",
                "final.mp4",
            ],
            work,
        )
    else:
        _ffmpeg(
            [
                "-i",
                "out.mp4",
                "-i",
                "music.mp3",
                "-map",
                "0:v",
                "-map",
                "1:a",
                "-c:v",
                "copy",
                "-c:a",
                "aac",
                "-shortest",
                "final.mp4",
            ],
            work,
        )
    return "final.mp4"
