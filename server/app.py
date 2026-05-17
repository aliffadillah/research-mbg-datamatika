import os
import io
import time
import base64
import logging
from pathlib import Path
from datetime import datetime

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from PIL import Image, ImageDraw, ImageFont
import requests as http_requests

# ── Load .env dari root project ───────────────────────────────────
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

API_MENU      = os.getenv("API_MENU", "").rstrip("/") + "/predict"
API_OMPRENGAN = os.getenv("API_OMPRENGAN", "").rstrip("/") + "/predict"
API_KEY       = os.getenv("API_KEY_ULTRALYTICS")
API_KEY_OMPRENGAN = os.getenv("API_KEY_OMPRENGAN") or API_KEY

if not API_MENU or not API_KEY:
    raise RuntimeError("Missing API_MENU or API_KEY_ULTRALYTICS in .env")
if not API_OMPRENGAN:
    raise RuntimeError("Missing API_OMPRENGAN in .env")

# ── Flask app ─────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, origins=[
    "http://localhost:5173", "http://127.0.0.1:5173",
    "http://localhost:5174", "http://127.0.0.1:5174",
])

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("nutrivision-model")

# ── Box color palette ─────────────────────────────────────────────
BOX_COLORS = [
    (22, 163, 74),   # green
    (8, 145, 178),   # cyan
    (101, 163, 13),  # lime
    (217, 119, 6),   # amber
    (124, 58, 237),  # violet
    (219, 39, 119),  # pink
    (79, 70, 229),   # indigo
    (239, 68, 68),   # red
]

# ── Padding yang diberikan di sekeliling crop tray (persen) ───────
TRAY_CROP_PADDING_PCT = 0.08   


# ════════════════════════════════════════════════════════════════
#  HELPERS
# ════════════════════════════════════════════════════════════════

def apply_exif_orientation(img: Image.Image) -> Image.Image:
    """
    Terapkan rotasi EXIF ke piksel gambar dan hapus metadata EXIF-nya.
    Memastikan gambar yang disimpan sudah dalam orientasi yang benar,
    tanpa tag EXIF yang bisa membuat browser memutar ulang.
    """
    try:
        exif = img._getexif()  # type: ignore[attr-defined]
    except Exception:
        exif = None

    if not exif:
        return img

    orientation = exif.get(274)  # tag 274 = Orientation
    TRANSPOSE_MAP = {
        2: Image.FLIP_LEFT_RIGHT,
        3: Image.ROTATE_180,
        4: Image.FLIP_TOP_BOTTOM,
        5: Image.Transpose.TRANSPOSE,
        6: Image.ROTATE_270,
        7: Image.Transpose.TRANSVERSE,
        8: Image.ROTATE_90,
    }
    op = TRANSPOSE_MAP.get(orientation)
    if op is not None:
        img = img.transpose(op)
    return img


def call_ultralytics(api_url: str, img_bytes: bytes, filename: str,
                     conf: float = 0.25, imgsz: int = 640,
                     api_key: str | None = None) -> dict:
    """
    Kirim gambar ke endpoint Ultralytics.
    Auth: Authorization: Bearer {api_key}  (sesuai Ultralytics Deployment docs)
    """
    key = api_key or API_KEY
    response = http_requests.post(
        api_url,
        headers={"Authorization": f"Bearer {key}"},
        files={"file": (filename, img_bytes, "image/jpeg")},
        data={"conf": conf, "iou": 0.7, "imgsz": imgsz},
        timeout=90,
    )
    if response.status_code == 401:
        raise RuntimeError(f"Unauthorized ({api_url[:45]}...) — periksa API key di .env")
    if response.status_code == 429:
        raise RuntimeError("Rate limited. Coba lagi nanti.")
    if response.status_code != 200:
        raise RuntimeError(f"API error {response.status_code}: {response.text[:300]}")
    return response.json()


def parse_detections_from_response(api_result: dict) -> list:
    """Extract list of raw detection dicts dari berbagai format respons Ultralytics."""
    raw = []
    if isinstance(api_result, dict):
        if "images" in api_result:
            for img_res in api_result["images"]:
                raw.extend(img_res.get("results", []))
        elif "results" in api_result:
            raw = api_result["results"]
        elif "data" in api_result:
            raw = api_result["data"]
        else:
            raw = [api_result]
    elif isinstance(api_result, list):
        raw = api_result
    return raw


def normalize_box(r: dict, fallback_w: float, fallback_h: float) -> dict:
    """Normalisasi berbagai format bounding box ke {x1, y1, x2, y2}."""
    box = r.get("box") or r.get("bbox") or {}
    if isinstance(box, list) and len(box) == 4:
        box = {"x1": box[0], "y1": box[1], "x2": box[2], "y2": box[3]}
    elif isinstance(box, dict) and "w" in box:
        cx, cy, bw, bh = box.get("x", 0), box.get("y", 0), box["w"], box["h"]
        box = {"x1": cx - bw/2, "y1": cy - bh/2, "x2": cx + bw/2, "y2": cy + bh/2}
    return {
        "x1": float(box.get("x1", 0)),
        "y1": float(box.get("y1", 0)),
        "x2": float(box.get("x2", fallback_w)),
        "y2": float(box.get("y2", fallback_h)),
    }


class TrayNotDetectedError(Exception):
    """Dilempar saat API_OMPRENGAN tidak menemukan food tray di gambar."""
    pass


def detect_and_crop_tray(oriented_img: Image.Image, filename: str,
                          conf: float) -> tuple[Image.Image, dict]:
    """
    Stage 1: Deteksi food tray menggunakan API_OMPRENGAN.
    Return: (cropped_img, tray_info)
    Raise: TrayNotDetectedError jika tidak ada tray terdeteksi.
    """
    w, h = oriented_img.size

    buf = io.BytesIO()
    oriented_img.save(buf, format="JPEG", quality=92)
    img_bytes = buf.getvalue()

    log.info("Stage 1: Detecting food tray via API_OMPRENGAN...")
    t0 = time.time()
    api_result = call_ultralytics(API_OMPRENGAN, img_bytes, filename,
                                  conf=conf, imgsz=640, api_key=API_KEY_OMPRENGAN)
    stage1_ms  = round((time.time() - t0) * 1000)
    log.info(f"Stage 1 done in {stage1_ms} ms")

    raw = parse_detections_from_response(api_result)
    if not raw:
        log.info("Stage 1: No tray detected in image")
        raise TrayNotDetectedError("Food tray tidak terdeteksi. Pastikan foto menampilkan nampan MBG dengan jelas.")

    # Ambil deteksi tray dengan confidence tertinggi
    best = max(raw, key=lambda r: float(r.get("confidence") or r.get("conf") or r.get("score") or 0))
    tray_conf = float(best.get("confidence") or best.get("conf") or best.get("score") or 0)

    # Tolak jika confidence sangat rendah (< 0.30)
    if tray_conf < 0.30:
        log.info(f"Stage 1: Tray confidence too low ({tray_conf:.2f}) — rejected")
        raise TrayNotDetectedError(
            f"Tray terdeteksi tapi kurang jelas (confidence {tray_conf:.0%}). "
            "Coba ambil foto lebih dekat dan pastikan nampan terlihat penuh."
        )

    box = normalize_box(best, w, h)
    x1, y1, x2, y2 = box["x1"], box["y1"], box["x2"], box["y2"]
    tray_name = (best.get("name") or best.get("class") or best.get("label") or "tray").strip()

    log.info(f"Stage 1: Tray '{tray_name}' conf={tray_conf:.2f} box=({x1:.0f},{y1:.0f},{x2:.0f},{y2:.0f})")

    # Tambahkan padding
    pad_x = (x2 - x1) * TRAY_CROP_PADDING_PCT
    pad_y = (y2 - y1) * TRAY_CROP_PADDING_PCT
    cx1 = max(0, int(x1 - pad_x))
    cy1 = max(0, int(y1 - pad_y))
    cx2 = min(w, int(x2 + pad_x))
    cy2 = min(h, int(y2 + pad_y))

    cropped = oriented_img.crop((cx1, cy1, cx2, cy2))
    log.info(f"Stage 1: Cropped to ({cx1},{cy1},{cx2},{cy2}) → {cropped.size[0]}x{cropped.size[1]}")

    tray_info = {
        "detected":      True,
        "class_name":    tray_name,
        "confidence":    round(tray_conf, 4),
        "stage1_ms":     stage1_ms,
        "crop_box":      {"x1": cx1, "y1": cy1, "x2": cx2, "y2": cy2},
        "original_size": {"width": w, "height": h},
    }
    return cropped, tray_info


def draw_overlay(img: Image.Image, detections: list) -> str:
    """
    Gambar bounding box di atas PIL Image (sudah di-orient & di-crop).
    Return: base64-encoded JPEG string.
    """
    img = img.convert("RGB")
    draw = ImageDraw.Draw(img)
    w, h = img.size

    try:
        font = ImageFont.truetype("arial.ttf", max(14, int(h * 0.020)))
    except (OSError, IOError):
        font = ImageFont.load_default()

    for i, det in enumerate(detections):
        box   = det.get("box", {})
        color = BOX_COLORS[i % len(BOX_COLORS)]
        conf  = det.get("confidence", 0)
        name  = det.get("class_name", f"item_{i}")
        label = f"{name}  {conf:.0%}"

        x1, y1 = float(box.get("x1", 0)), float(box.get("y1", 0))
        x2, y2 = float(box.get("x2", w)), float(box.get("y2", h))

        for offset in range(3):
            draw.rectangle([x1 - offset, y1 - offset, x2 + offset, y2 + offset], outline=color)

        bbox = draw.textbbox((0, 0), label, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        lx, ly = x1, max(0, y1 - th - 8)
        draw.rectangle([lx, ly, lx + tw + 10, ly + th + 6], fill=color)
        draw.text((lx + 5, ly + 3), label, fill=(255, 255, 255), font=font)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=92)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


# ════════════════════════════════════════════════════════════════
#  ROUTES
# ════════════════════════════════════════════════════════════════

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "NutriVision MBG — Python Inference Server",
        "pipeline": "2-stage (Omprengan tray crop → Menu detection)",
        "model_menu":      API_MENU[:60] + "...",
        "model_omprengan": API_OMPRENGAN[:60] + "...",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    })


@app.route("/api/detect", methods=["POST"])
def detect():
    """
    Pipeline 2 tahap:
      1. Deteksi food tray via API_OMPRENGAN → crop + padding
      2. Deteksi menu makanan via API_MENU pada crop
    Return JSON:
    {
      "detections": [...],
      "overlay_image": "<base64 JPEG dari crop>",
      "inference_ms": <total ms>,
      "tray_detection": { detected, class_name, confidence, crop_box, original_size },
      "image_meta": { filename, width, height, size_bytes },
      ...
    }
    """
    if "file" not in request.files:
        return jsonify({"error": "Field 'file' wajib ada (multipart/form-data)"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "Filename kosong"}), 400

    allowed = {".jpg", ".jpeg", ".png", ".webp", ".heic"}
    if Path(file.filename).suffix.lower() not in allowed:
        return jsonify({"error": f"Format tidak didukung. Gunakan: {allowed}"}), 400

    conf   = float(request.form.get("conf",  "0.25"))
    imgsz  = int(request.form.get("imgsz", "640"))

    image_bytes = file.read()
    orig_size_bytes = len(image_bytes)

    # ── Orientasi EXIF diterapkan ke piksel sebelum apapun ────────
    raw_pil    = Image.open(io.BytesIO(image_bytes))
    oriented   = apply_exif_orientation(raw_pil)
    orig_w, orig_h = oriented.size
    log.info(f"Received: {file.filename} ({orig_w}x{orig_h}, {orig_size_bytes/1024:.0f} KB)")

    t_total = time.time()

    # ────────────────────────────────────────────────────────────
    #  STAGE 1 — Deteksi & crop food tray
    # ────────────────────────────────────────────────────────────
    try:
        cropped_img, tray_info = detect_and_crop_tray(oriented, file.filename, conf)
    except TrayNotDetectedError as e:
        log.warning(f"Stage 1: Tray not detected — stopping pipeline. Reason: {e}")
        return jsonify({
            "error":      str(e),
            "error_code": "TRAY_NOT_FOUND",
            "stage":      1,
        }), 422
    except RuntimeError as e:
        err = str(e)
        log.error(f"Stage 1 API error: {err}")
        if "Unauthorized" in err:
            return jsonify({"error": err, "error_code": "UNAUTHORIZED", "stage": 1}), 401
        if "Rate limited" in err:
            return jsonify({"error": err, "error_code": "RATE_LIMITED", "stage": 1}), 429
        return jsonify({"error": err, "error_code": "STAGE1_ERROR", "stage": 1}), 502
    except http_requests.exceptions.Timeout:
        return jsonify({"error": "Timeout saat deteksi tray (>90s). Coba ulangi.", "error_code": "STAGE1_TIMEOUT", "stage": 1}), 504
    except Exception as e:
        log.error(f"Stage 1 unexpected error: {e}")
        return jsonify({"error": str(e), "error_code": "STAGE1_ERROR", "stage": 1}), 500

    crop_w, crop_h = cropped_img.size
    crop_area = crop_w * crop_h or 1

    # Convert crop ke JPEG bytes untuk Stage 2
    crop_buf = io.BytesIO()
    cropped_img.save(crop_buf, format="JPEG", quality=92)
    crop_bytes = crop_buf.getvalue()

    # ────────────────────────────────────────────────────────────
    #  STAGE 2 — Deteksi menu di dalam crop
    # ────────────────────────────────────────────────────────────
    log.info("Stage 2: Detecting food items via API_MENU...")
    t2 = time.time()
    try:
        menu_result = call_ultralytics(API_MENU, crop_bytes, file.filename, conf=conf, imgsz=imgsz)
        inference_ms = round((time.time() - t2) * 1000)
        log.info(f"Stage 2 done in {inference_ms} ms")
    except RuntimeError as e:
        err = str(e)
        if "Unauthorized" in err:
            return jsonify({"error": err}), 401
        if "Rate limited" in err:
            return jsonify({"error": err}), 429
        return jsonify({"error": err}), 502
    except http_requests.exceptions.Timeout:
        return jsonify({"error": "Timeout ke model menu (>90s). Coba ulangi."}), 504
    except http_requests.exceptions.ConnectionError:
        return jsonify({"error": "Tidak bisa menghubungi model endpoint"}), 503
    except Exception as e:
        log.error(f"Stage 2 error: {e}")
        return jsonify({"error": str(e)}), 500

    total_ms = round((time.time() - t_total) * 1000)

    # ── Parse hasil Stage 2 ───────────────────────────────────────
    raw2 = parse_detections_from_response(menu_result)

    detections = []
    for i, r in enumerate(raw2):
        name = (r.get("name") or r.get("class") or r.get("label")
                or r.get("class_name") or f"item_{i}").strip().title()
        conf_val = float(r.get("confidence") or r.get("conf") or r.get("score") or 0)

        box = normalize_box(r, crop_w, crop_h)
        x1, y1, x2, y2 = box["x1"], box["y1"], box["x2"], box["y2"]
        bbox_area_pct = round(abs(x2 - x1) * abs(y2 - y1) / crop_area * 100, 2)

        color_rgb = BOX_COLORS[i % len(BOX_COLORS)]
        detections.append({
            "class_name":    name,
            "class_id":      r.get("class_id", r.get("class_idx", i)),
            "confidence":    round(conf_val, 4),
            "box":           {"x1": round(x1, 1), "y1": round(y1, 1), "x2": round(x2, 1), "y2": round(y2, 1)},
            "bbox_area_pct": bbox_area_pct,
            "color":         f"rgb({color_rgb[0]},{color_rgb[1]},{color_rgb[2]})",
        })

    # ── Overlay digambar di atas crop (bukan gambar asli) ─────────
    overlay_b64 = ""
    try:
        overlay_b64 = draw_overlay(cropped_img.copy(), detections)
    except Exception as e:
        log.warning(f"Overlay error: {e}")

    log.info(f"Pipeline complete: {len(detections)} items detected, total {total_ms} ms")

    return jsonify({
        "detections":     detections,
        "item_count":     len(detections),
        "avg_confidence": round(
            sum(d["confidence"] for d in detections) / len(detections), 4
        ) if detections else 0,
        "overlay_image":  overlay_b64,
        "inference_ms":   total_ms,
        "tray_detection": tray_info or {"detected": False},
        "image_meta": {
            "filename":       file.filename,
            "width":          crop_w,
            "height":         crop_h,
            "original_width": orig_w,
            "original_height": orig_h,
            "size_bytes":     orig_size_bytes,
        },
        "model":     "RT-DETR v2.1 (2-stage)",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    })


# ════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    log.info("=" * 66)
    log.info(" NutriVision MBG — Python Inference Server (2-stage)")
    log.info(f"   Stage 1 (Tray) : {API_OMPRENGAN[:55]}...")
    log.info(f"   Stage 2 (Menu) : {API_MENU[:55]}...")
    log.info(f"   Key (Menu)     : {API_KEY[:12]}...{API_KEY[-4:]}")
    same_key = API_KEY_OMPRENGAN == API_KEY
    log.info(f"   Key (Omprengan): {'[same as Menu]' if same_key else API_KEY_OMPRENGAN[:12]+'...'+API_KEY_OMPRENGAN[-4:]}")
    log.info(f"   Tray padding   : {TRAY_CROP_PADDING_PCT*100:.0f}%")
    log.info("=" * 66)
    app.run(host="0.0.0.0", port=5000, debug=True)
