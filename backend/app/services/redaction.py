"""
Applies user-approved boxes to a screenshot: redact (hide sensitive
content) or annotate (highlight + caption something worth calling out).

Detection (finding what *might* need redacting) lives in
app.services.ai_layer.analyze_screenshot -- this module only handles the
second step: applying the boxes the user actually approved/drew.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ANNOTATE_COLOR = (255, 149, 0)  # amber -- reads as "highlight", not "hidden"


def apply_redactions(
    image_path: str, boxes: list[dict], output_path: str, mode: str = "blackbox"
) -> None:
    """Apply user-approved boxes to an image.

    mode:
      "blackbox" (fully opaque, safest -- default)
      "blur"     (heavier Gaussian blur, keeps some visual context)
      "annotate" (does not hide anything -- draws a highlight outline and,
                  if the box has a label, a caption above it)
    """
    image = Image.open(image_path).convert("RGB")
    draw = ImageDraw.Draw(image) if mode == "annotate" else None
    font = ImageFont.load_default() if mode == "annotate" else None

    for box in boxes:
        left, top = int(box["left"]), int(box["top"])
        right, bottom = left + int(box["width"]), top + int(box["height"])
        region = (left, top, right, bottom)

        if mode == "blur":
            crop = image.crop(region).filter(ImageFilter.GaussianBlur(radius=12))
            image.paste(crop, region)
        elif mode == "annotate":
            draw.rectangle(region, outline=ANNOTATE_COLOR, width=3)
            label = (box.get("label") or "").strip()
            if label:
                text_pos = (left, max(top - 20, 0))
                text_box = draw.textbbox(text_pos, label, font=font)
                padded = (text_box[0] - 2, text_box[1] - 1, text_box[2] + 2, text_box[3] + 1)
                draw.rectangle(padded, fill=ANNOTATE_COLOR)
                draw.text(text_pos, label, fill=(0, 0, 0), font=font)
        else:
            black = Image.new("RGB", (right - left, bottom - top), (0, 0, 0))
            image.paste(black, region)

    image.save(output_path)
