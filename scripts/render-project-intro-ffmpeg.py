from __future__ import annotations

import json
import math
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / "video" / "project-intro"
ASSETS = PROJECT / "05_assets"
AUDIO = PROJECT / "06_audio"
EXPORT = PROJECT / "09_export"
FRAMES = PROJECT / "08_hyperframes" / "ffmpeg-frames"
WIDTH, HEIGHT = 3840, 2160


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        Path(r"C:\Windows\Fonts\msjhbd.ttc") if bold else Path(r"C:\Windows\Fonts\msjh.ttc"),
        Path(r"C:\Windows\Fonts\arialbd.ttf") if bold else Path(r"C:\Windows\Fonts\arial.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default(size=size)


FONT_KICKER = font(44, True)
FONT_TITLE = font(116, True)
FONT_BODY = font(50)
FONT_CAPTION = font(58, True)
FONT_SMALL = font(34)


def wrap(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for char in text:
        trial = current + char
        if draw.textlength(trial, font=face) <= max_width or not current:
            current = trial
        else:
            lines.append(current)
            current = char
    if current:
        lines.append(current)
    return lines


def rounded(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], radius: int, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def gradient_background() -> Image.Image:
    img = Image.new("RGB", (WIDTH, HEIGHT), "#050816")
    px = img.load()
    for y in range(HEIGHT):
        for x in range(WIDTH):
            nx = x / WIDTH
            ny = y / HEIGHT
            glow1 = max(0, 1 - math.hypot(nx - 0.18, ny - 0.18) * 2.5)
            glow2 = max(0, 1 - math.hypot(nx - 0.83, ny - 0.12) * 3.0)
            r = int(7 + 24 * ny + 10 * glow2)
            g = int(14 + 18 * nx + 48 * glow1 + 18 * glow2)
            b = int(31 + 32 * (1 - ny) + 70 * glow1)
            px[x, y] = (min(r, 255), min(g, 255), min(b, 255))
    return img.filter(ImageFilter.GaussianBlur(0.6))


def draw_device(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, subtitle: str, image: Image.Image | None = None):
    rounded(draw, (x, y, x + w, y + h), 54, "#0d1629", "#40516f", 3)
    rounded(draw, (x + 44, y + 44, x + w - 44, y + h - 44), 34, "#101c33", "#26476a", 3)
    if image:
        crop = image.copy()
        crop.thumbnail((w - 140, h - 130))
        img_x = x + w - crop.width - 86
        img_y = y + h - crop.height - 48
        draw.rounded_rectangle((img_x - 8, img_y - 8, img_x + crop.width + 8, img_y + crop.height + 8), radius=34, fill="#18243d")
        canvas.paste(crop, (img_x, img_y))
        caption_box = (x + 88, y + h - 230, x + 700, y + h - 95)
    else:
        caption_box = (x + 92, y + h - 230, x + w - 92, y + h - 95)
    rounded(draw, caption_box, 24, (0, 0, 0), None)
    lines = wrap(draw, subtitle, FONT_SMALL, caption_box[2] - caption_box[0] - 60)[:2]
    ty = caption_box[1] + 34
    for line in lines:
        draw.text(((caption_box[0] + caption_box[2]) / 2, ty), line, font=FONT_SMALL, fill="white", anchor="ma", stroke_width=2, stroke_fill="black")
        ty += 48


def draw_architecture(draw: ImageDraw.ImageDraw, x: int, y: int, w: int):
    labels = ["Browser\nEditor", "Node\nServer", "Workspace", "FFmpeg\nRender", "QA\nExport"]
    gap = 28
    node_w = (w - gap * 4) // 5
    for i, label in enumerate(labels):
        nx = x + i * (node_w + gap)
        rounded(draw, (nx, y, nx + node_w, y + 180), 32, "#111c32", "#64d8ff", 3)
        for j, line in enumerate(label.split("\n")):
            draw.text((nx + node_w / 2, y + 68 + j * 48), line, font=FONT_SMALL, fill="#edf6ff", anchor="mm")
        if i < len(labels) - 1:
            draw.line((nx + node_w + 6, y + 90, nx + node_w + gap - 8, y + 90), fill="#64d8ff", width=8)


def draw_scene(scene: dict, output: Path):
    global canvas
    canvas = gradient_background()
    draw = ImageDraw.Draw(canvas, "RGBA")
    draw.text((240, 150), f"SCENE {scene['id']} · {scene['title']}", font=FONT_KICKER, fill="#64d8ff")
    title = "AI 字幕品質工廠" if scene["id"] == "01" else scene["title"]
    y = 250
    for line in wrap(draw, title, FONT_TITLE, 1650)[:2]:
        draw.text((240, y), line, font=FONT_TITLE, fill="#f3fbff")
        y += 134
    y += 30
    for line in wrap(draw, scene["text"], FONT_BODY, 1780)[:5]:
        draw.text((240, y), line, font=FONT_BODY, fill="#c9d7ea")
        y += 76

    rounded(draw, (225, 1560, 1825, 1705), 70, "#111c32", "#314862", 2)
    draw.ellipse((270, 1605, 330, 1665), fill="#64d8ff")
    draw.rounded_rectangle((360, 1630, 1740, 1644), radius=8, fill="#64d8ff")
    draw.rounded_rectangle((360, 1630, 980, 1644), radius=8, fill="#9df27d")

    panel = (2050, 300, 3600, 1450)
    rounded(draw, panel, 54, "#111c32", "#40516f", 3)
    lecturer = None
    if scene["id"] == "01":
        ref = ASSETS / "lecturer-pixar-avatar.png"
        if not ref.exists():
            ref = ASSETS / "lecturer-reference.jpg"
        if ref.exists():
            lecturer = Image.open(ref).convert("RGB")
    if scene["id"] == "05":
        draw_architecture(draw, 2140, 760, 1360)
    elif scene["id"] == "08":
        draw_architecture(draw, 2140, 760, 1360)
        draw.text((2820, 610), "Workflow Animation", font=FONT_SMALL, fill="#9df27d", anchor="mm")
    else:
        draw_device(draw, 2140, 480, 1360, 760, scene["subtitle"], lecturer)

    caption = scene["subtitle"]
    cap_box = (420, 1848, 3420, 2032)
    rounded(draw, cap_box, 32, (0, 0, 0, 110), None)
    cap_lines = wrap(draw, caption, FONT_CAPTION, cap_box[2] - cap_box[0] - 120)[:2]
    cy = cap_box[1] + 56
    for line in cap_lines:
        draw.text(((cap_box[0] + cap_box[2]) / 2, cy), line, font=FONT_CAPTION, fill="white", anchor="ma", stroke_width=4, stroke_fill="black")
        cy += 74
    draw.text((3740, 120), "Subtitle Review Loop", font=FONT_SMALL, fill=(238, 246, 255, 150), anchor="ra")
    canvas.save(output, "PNG")


def main():
    EXPORT.mkdir(parents=True, exist_ok=True)
    FRAMES.mkdir(parents=True, exist_ok=True)
    segments = json.loads((AUDIO / "narration-segments.json").read_text(encoding="utf-8"))
    for scene in segments:
        draw_scene(scene, FRAMES / f"scene-{scene['id']}.png")

    concat = FRAMES / "slides.ffconcat"
    lines = ["ffconcat version 1.0"]
    for scene in segments:
        frame = (FRAMES / f"scene-{scene['id']}.png").resolve().as_posix()
        lines.append(f"file '{frame}'")
        lines.append(f"duration {scene['duration']}")
    last_frame = FRAMES / f"scene-{segments[-1]['id']}.png"
    lines.append(f"file '{last_frame.resolve().as_posix()}'")
    concat.write_text("\n".join(lines), encoding="utf-8")

    output = EXPORT / "project-intro-4k60-h265.mp4"
    cmd = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0", "-i", str(concat),
        "-i", str(AUDIO / "narration.wav"),
        "-i", str(AUDIO / "bgm.wav"),
        "-filter_complex", "[1:a][2:a]amix=inputs=2:duration=first:weights=1 0.18,alimiter=limit=0.92[a]",
        "-map", "0:v", "-map", "[a]",
        "-shortest",
        "-vf", "fps=60,format=yuv420p10le",
        "-c:v", "libx265", "-preset", "fast", "-crf", "24", "-tag:v", "hvc1",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        str(output),
    ]
    subprocess.run(cmd, check=True)
    print(output)


if __name__ == "__main__":
    main()
