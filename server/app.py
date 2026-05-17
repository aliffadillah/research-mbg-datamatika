"""
NutriVision MBG — Python Inference Server
==========================================
Tanggung jawab: HANYA inference model RT-DETR via Ultralytics API.

Endpoints:
  POST /api/detect   → upload image → kirim ke Ultralytics → return raw detections
  GET  /api/health   → health check

Data gizi dan penyimpanan history TIDAK di sini.
→ Itu tanggung jawab Node.js backend (port 3001) dengan Prisma + Supabase.

Environment (dari ../.env):
  API_MENU              → URL endpoint model Ultralytics (Cloud Run)
  API_KEY_ULTRALYTICS   → API key untuk header x-api-key
"""

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

API_MENU = os.getenv("API_MENU")
API_KEY  = os.getenv("API_KEY_ULTRALYTICS")

if not API_MENU or not API_KEY:
    raise RuntimeError("Missing API_MENU or API_KEY_ULTRALYTICS in .env")

# ── Flask app ─────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, origins=[
    "http://localhost:5173", "http://127.0.0.1:5173",
    "http://localhost:5174", "http://127.0.0.1:5174",
])

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("nutrivision-model")

# ── Box color palette (untuk overlay) ────────────────────────────
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


def draw_overlay(image_bytes: bytes, detections: list) -> str:
    """Gambar bounding box di atas gambar, return base64 JPEG."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    draw = ImageDraw.Draw(img)
    w, h = img.size

    try:
        font = ImageFont.truetype("arial.ttf", max(14, int(h * 0.018)))
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
        "model_endpoint": API_MENU[:50] + "...",
        "note": "DB operations handled by Node.js backend on :3001",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    })


@app.route("/api/detect", methods=["POST"])
def detect():
    """
    Terima gambar, kirim ke Ultralytics, return hasil deteksi mentah.

    Form fields:
      file   : image file (required)
      conf   : confidence threshold (default 0.25)
      imgsz  : inference image size (default 640)

    Returns JSON:
    {
      "detections": [
        {
          "class_name": "Nasi Putih",
          "class_id": 0,
          "confidence": 0.98,
          "box": {"x1": .., "y1": .., "x2": .., "y2": ..}
        },
        ...
      ],
      "overlay_image": "<base64 JPEG>",
      "inference_ms": 142,
      "image_meta": { "filename", "width", "height", "size_bytes" },
      "model": "RT-DETR v2.1",
      "timestamp": "..."
    }

    Catatan: nutrition data dan MBG compliance dihitung di Node.js backend
    menggunakan data dari Supabase (tabel nutritions).
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
    img = Image.open(io.BytesIO(image_bytes))
    img_w, img_h = img.size
    img_area = img_w * img_h or 1

    log.info(f"Received: {file.filename} ({img_w}x{img_h}, {len(image_bytes)/1024:.0f} KB)")

    # ── Warmup ping dulu (Cloud Run cold-start bisa butuh 10-20s) ──
    try:
        warmup = http_requests.get(API_MENU, headers={"x-api-key": API_KEY}, timeout=20)
        log.info(f"Warmup ping: {warmup.status_code}")
    except Exception:
        pass  # Abaikan error warmup, lanjutkan ke inference

    # ── Panggil Ultralytics API ───────────────────────────────────
    t_start = time.time()
    try:
        response = http_requests.post(
            API_MENU,
            headers={"x-api-key": API_KEY},
            files={"file": (file.filename, image_bytes, file.content_type or "image/jpeg")},
            data={"conf": conf, "iou": 0.7, "imgsz": imgsz},
            timeout=90,   # 90s untuk handle Cloud Run cold-start
        )
        inference_ms = round((time.time() - t_start) * 1000)
        log.info(f"Ultralytics: {response.status_code} in {inference_ms} ms")

        if response.status_code == 401:
            return jsonify({"error": "Unauthorized — periksa API_KEY_ULTRALYTICS di .env"}), 401
        if response.status_code == 429:
            return jsonify({"error": "Rate limited. Coba lagi nanti."}), 429
        if response.status_code != 200:
            return jsonify({"error": f"Ultralytics error {response.status_code}", "detail": response.text[:300]}), 502

        api_result = response.json()

    except http_requests.exceptions.Timeout:
        return jsonify({"error": "Timeout koneksi ke model (>90s). Model endpoint mungkin sedang cold-start, coba ulangi dalam 30 detik."}), 504
    except http_requests.exceptions.ConnectionError:
        return jsonify({"error": "Tidak bisa menghubungi model endpoint"}), 503
    except Exception as e:
        log.error(f"Inference error: {e}")
        return jsonify({"error": str(e)}), 500

    # ── Parse respons Ultralytics ─────────────────────────────────
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

    # ── Bangun daftar deteksi ─────────────────────────────────────
    detections = []
    for i, r in enumerate(raw):
        name = (r.get("name") or r.get("class") or r.get("label")
                or r.get("class_name") or f"item_{i}").strip().title()
        conf_val = float(r.get("confidence") or r.get("conf") or r.get("score") or 0)

        box = r.get("box") or r.get("bbox") or {}
        if isinstance(box, list) and len(box) == 4:
            box = {"x1": box[0], "y1": box[1], "x2": box[2], "y2": box[3]}
        elif isinstance(box, dict) and "w" in box:
            cx, cy, bw, bh = box.get("x", 0), box.get("y", 0), box["w"], box["h"]
            box = {"x1": cx - bw/2, "y1": cy - bh/2, "x2": cx + bw/2, "y2": cy + bh/2}

        x1, y1 = float(box.get("x1", 0)), float(box.get("y1", 0))
        x2, y2 = float(box.get("x2", img_w)), float(box.get("y2", img_h))
        bbox_area_pct = round(abs(x2 - x1) * abs(y2 - y1) / img_area * 100, 2)

        color_rgb = BOX_COLORS[i % len(BOX_COLORS)]
        detections.append({
            "class_name":    name,
            "class_id":      r.get("class_id", r.get("class_idx", i)),
            "confidence":    round(conf_val, 4),
            "box":           {"x1": round(x1, 1), "y1": round(y1, 1), "x2": round(x2, 1), "y2": round(y2, 1)},
            "bbox_area_pct": bbox_area_pct,
            "color":         f"rgb({color_rgb[0]},{color_rgb[1]},{color_rgb[2]})",
        })

    # ── Buat overlay ──────────────────────────────────────────────
    overlay_b64 = ""
    try:
        overlay_b64 = draw_overlay(image_bytes, detections)
    except Exception as e:
        log.warning(f"Overlay error: {e}")

    log.info(f"Done: {len(detections)} detections in {inference_ms} ms")

    return jsonify({
        "detections":   detections,
        "item_count":   len(detections),
        "avg_confidence": round(
            sum(d["confidence"] for d in detections) / len(detections), 4
        ) if detections else 0,
        "overlay_image": overlay_b64,
        "inference_ms":  inference_ms,
        "image_meta": {
            "filename":   file.filename,
            "width":      img_w,
            "height":     img_h,
            "size_bytes": len(image_bytes),
        },
        "model":     "RT-DETR v2.1",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    })


# ════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    log.info("=" * 58)
    log.info(" NutriVision MBG — Python Inference Server")
    log.info(f"   Model : {API_MENU}")
    log.info(f"   Key   : {API_KEY[:12]}...{API_KEY[-4:]}")
    log.info("   DB    : Node.js backend :3001 (Prisma + Supabase)")
    log.info("=" * 58)
    app.run(host="0.0.0.0", port=5000, debug=True)
