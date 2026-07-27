from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

import torch
from app.core.database import get_db
from app.schemas.erp_schemas import QCLogOut
import app.crud.erp_crud as crud
from ultralytics import YOLO
import cv2
import numpy as np
import base64
import logging

router = APIRouter(prefix="/qc", tags=["quality_control"])
logger = logging.getLogger("smartfactory.qc")

best_model = r"C:\Users\LENOVO\Desktop\SynergiesSourcing\backend\Data\runs\fabric_yolo\weights\best.pt"

try:
    yolo_model = YOLO(best_model)
    logger.info("YOLO12 best model weights loaded successfully.")
except Exception as e:
    logger.warning(f"YOLO12 model load failed ({e}), trying yolov12n.pt fallback.")
    try:
        yolo_model = YOLO("yolov12n.pt")
        logger.info("YOLOv12n fallback weights loaded.")
    except Exception as e2:
        logger.error(f"All YOLO model loads failed: {e2}", exc_info=True)
        yolo_model = None

CRITICAL_CONF = 0.60   # ≥ 60 % → Critical defect
MINOR_CONF    = 0.30   # ≥ 30 % → Minor defect; < 30 % → Noise

# ── Fabric defect CV thresholds ────────────────────────────────────────────────
BLOB_MIN_AREA      = 80    # px²  — ignore microscopic dust
BLOB_MAX_AREA      = 40000 # px²  — ignore full-image aberrations
DARK_SPOT_THRESH   = 60    # pixel intensity (0-255) below which we call it a dark anomaly
BRIGHT_SPOT_THRESH = 220   # pixel intensity above which we call it a bright anomaly
LOCAL_STD_THRESH   = 18.0  # local texture standard-deviation difference — flags rough patches
EDGE_DENSITY_MULT  = 2.2   # edge density must be this many × median to be a weave anomaly


def _detect_fabric_defects_cv(img_bgr: np.ndarray) -> List[dict]:
    """
    Multi-pass OpenCV fabric defect detector.

    Passes:
      1. Dark-blob analysis  — spots, stains, holes (dark regions)
      2. Bright-blob analysis — shine, fabric separation, bright stains
      3. Edge-density mapping — snag / weave disruption / torn threads
      4. Local texture variance — rough patches vs. uniform background

    Returns a list of defect dicts identical in shape to YOLO detections:
      {"class": str, "confidence": float, "bbox": [x1,y1,x2,y2]}
    """
    detections: List[dict] = []
    h, w = img_bgr.shape[:2]

    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    # Slight blur to reduce sensor noise without smearing defect edges
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # ── Pass 1 : Dark blobs (stains, holes, insect marks) ──────────────────
    _, dark_mask = cv2.threshold(blurred, DARK_SPOT_THRESH, 255, cv2.THRESH_BINARY_INV)
    dark_mask = cv2.morphologyEx(dark_mask, cv2.MORPH_OPEN,
                                  cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    contours_dark, _ = cv2.findContours(dark_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for cnt in contours_dark:
        area = cv2.contourArea(cnt)
        if BLOB_MIN_AREA <= area <= BLOB_MAX_AREA:
            x, y, cw, ch = cv2.boundingRect(cnt)
            # Relative area as a proxy confidence (larger = more confident)
            conf = min(0.45 + (area / BLOB_MAX_AREA) * 0.50, 0.95)
            detections.append({
                "class":      "dark_spot_stain",
                "confidence": round(conf, 3),
                "bbox":       [float(x), float(y), float(x + cw), float(y + ch)],
            })

    # ── Pass 2 : Bright blobs (fabric tears, over-tension, chemical spots) ─
    _, bright_mask = cv2.threshold(blurred, BRIGHT_SPOT_THRESH, 255, cv2.THRESH_BINARY)
    bright_mask = cv2.morphologyEx(bright_mask, cv2.MORPH_OPEN,
                                    cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    contours_bright, _ = cv2.findContours(bright_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for cnt in contours_bright:
        area = cv2.contourArea(cnt)
        if BLOB_MIN_AREA <= area <= BLOB_MAX_AREA:
            x, y, cw, ch = cv2.boundingRect(cnt)
            conf = min(0.40 + (area / BLOB_MAX_AREA) * 0.45, 0.90)
            detections.append({
                "class":      "bright_spot_tear",
                "confidence": round(conf, 3),
                "bbox":       [float(x), float(y), float(x + cw), float(y + ch)],
            })

    # ── Pass 3 : Edge-density anomaly (snags, thread pulls, weave breaks) ──
    edges = cv2.Canny(blurred, 40, 120)
    # Divide image into 8×8 tiles and measure edge density per tile
    tile_h, tile_w = max(h // 8, 1), max(w // 8, 1)
    densities = []
    for r in range(8):
        for c in range(8):
            tile = edges[r*tile_h:(r+1)*tile_h, c*tile_w:(c+1)*tile_w]
            densities.append(float(tile.mean()))

    median_density = float(np.median(densities))
    if median_density > 0:
        for idx, density in enumerate(densities):
            if density > median_density * EDGE_DENSITY_MULT:
                r, c = divmod(idx, 8)
                x1, y1 = c * tile_w, r * tile_h
                x2, y2 = min(x1 + tile_w, w), min(y1 + tile_h, h)
                conf = min(0.35 + (density / (median_density * EDGE_DENSITY_MULT)) * 0.40, 0.88)
                detections.append({
                    "class":      "weave_anomaly_snag",
                    "confidence": round(conf, 3),
                    "bbox":       [float(x1), float(y1), float(x2), float(y2)],
                })

    # ── Pass 4 : Local texture variance (rough/pilling/raised fibre patches) ─
    # Use a sliding window std-dev map — large local variance signals surface irregularity
    kernel_size = max(w // 12, 16)
    if kernel_size % 2 == 0:
        kernel_size += 1
    gray_f = gray.astype(np.float32)
    local_mean = cv2.blur(gray_f, (kernel_size, kernel_size))
    local_sq   = cv2.blur(gray_f ** 2, (kernel_size, kernel_size))
    local_std  = np.sqrt(np.maximum(local_sq - local_mean ** 2, 0))
    global_std = float(local_std.mean())
    variance_mask = (local_std > (global_std + LOCAL_STD_THRESH)).astype(np.uint8) * 255
    variance_mask = cv2.morphologyEx(variance_mask, cv2.MORPH_OPEN,
                                      cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    contours_var, _ = cv2.findContours(variance_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for cnt in contours_var:
        area = cv2.contourArea(cnt)
        if BLOB_MIN_AREA * 2 <= area <= BLOB_MAX_AREA:
            x, y, cw, ch = cv2.boundingRect(cnt)
            conf = min(0.38 + (area / BLOB_MAX_AREA) * 0.42, 0.85)
            detections.append({
                "class":      "texture_irregularity",
                "confidence": round(conf, 3),
                "bbox":       [float(x), float(y), float(x + cw), float(y + ch)],
            })

    # ── Deduplicate overlapping boxes (simple IoU-based NMS) ──────────────
    detections = _nms(detections, iou_threshold=0.45)

    logger.info(f"OpenCV fabric detector found {len(detections)} defect region(s).")
    return detections


def _iou(a: list, b: list) -> float:
    """Intersection-over-Union for two [x1,y1,x2,y2] boxes."""
    ix1 = max(a[0], b[0]); iy1 = max(a[1], b[1])
    ix2 = min(a[2], b[2]); iy2 = min(a[3], b[3])
    inter = max(0.0, ix2 - ix1) * max(0.0, iy2 - iy1)
    if inter == 0:
        return 0.0
    area_a = (a[2]-a[0]) * (a[3]-a[1])
    area_b = (b[2]-b[0]) * (b[3]-b[1])
    return inter / (area_a + area_b - inter)


def _nms(detections: List[dict], iou_threshold: float = 0.45) -> List[dict]:
    """Greedy NMS — keeps highest-confidence box when two overlap strongly."""
    if not detections:
        return detections
    detections = sorted(detections, key=lambda d: d["confidence"], reverse=True)
    kept = []
    suppressed = set()
    for i, d in enumerate(detections):
        if i in suppressed:
            continue
        kept.append(d)
        for j, other in enumerate(detections[i+1:], start=i+1):
            if j not in suppressed and _iou(d["bbox"], other["bbox"]) > iou_threshold:
                suppressed.add(j)
    return kept


# ─────────────────────────────────────────────────────────────────────────────
#  Compliance Report Builder
# ─────────────────────────────────────────────────────────────────────────────

def _build_qc_report(detections: List[dict], yolo_raw: List[dict]) -> tuple[str, str]:
    """
    YOLO12 + OpenCV compliance engine.
    Returns (report_text, verdict).
    """
    actual_defects = [d for d in detections if d["class"] != "defect_free"]

    if not actual_defects:
        has_defect_free = any(d["class"] == "defect_free" for d in detections)
        summary_text = (
            "   ✓ Fabric verified as DEFECT FREE by YOLO12.\n"
            if has_defect_free else
            "   No defect-class objects detected above the noise threshold.\n"
        )
        report = (
            "═══════════════════════════════════════════════\n"
            " YOLO12 FABRIC QC COMPLIANCE REPORT\n"
            "═══════════════════════════════════════════════\n\n"
            "1. SCAN SUMMARY\n"
            "   YOLO12 neural network + OpenCV texture analysis processed the uploaded frame.\n"
            f"{summary_text}\n"
            "2. SEVERITY CLASSIFICATION\n"
            "   ✓ Acceptable — zero anomalies detected.\n\n"
            "3. CORRECTIVE ACTION\n"
            "   No corrective action required. Frame approved for production.\n\n"
            "VERDICT: Passed"
        )
        return report, "Passed"

    critical = [d for d in actual_defects if d["confidence"] >= CRITICAL_CONF]
    minor    = [d for d in actual_defects if MINOR_CONF <= d["confidence"] < CRITICAL_CONF]
    noise    = [d for d in actual_defects if d["confidence"] < MINOR_CONF]

    if critical:
        severity = "CRITICAL"
        verdict  = "Failed"
        action   = (
            "   ► Reject fabric roll immediately — exceeds AQL tolerance.\n"
            "   ► Quarantine batch and notify sourcing team.\n"
            "   ► Raise NCR (Non-Conformance Report) against supplier.\n"
            "   ► Adjust cutter patterns to exclude defect coordinates."
        )
    elif minor:
        severity = "MINOR"
        verdict  = "Failed"
        action   = (
            "   ► Flag affected sections for secondary manual inspection.\n"
            "   ► Adjust cutter layout to avoid defect bounding zones.\n"
            "   ► Document in QC ledger and notify line supervisor."
        )
    else:
        severity = "ACCEPTABLE (low-confidence signals only)"
        verdict  = "Passed"
        action   = "   ► No action required. Proceed to cutting phase."

    det_lines = "\n".join(
        f"   [{i+1}] Class: '{d['class']}' | Conf: {d['confidence']:.1%} | "
        f"BBox: [{', '.join(str(round(c)) for c in d['bbox'])}]"
        for i, d in enumerate(actual_defects)
    )

    yolo_note = (
        f"   YOLO12 generic detections: {len(yolo_raw)}\n"
        f"   CV fabric-specific defects: {len(actual_defects)}\n"
    ) if yolo_raw else (
        f"   CV fabric-specific defects: {len(actual_defects)}\n"
    )

    report = (
        "═══════════════════════════════════════════════\n"
        " YOLO12 FABRIC QC COMPLIANCE REPORT\n"
        "═══════════════════════════════════════════════\n\n"
        "1. DETECTION SUMMARY\n"
        f"{det_lines}\n\n"
        f"{yolo_note}"
        f"   Critical (≥{CRITICAL_CONF:.0%})  : {len(critical)}\n"
        f"   Minor   ({MINOR_CONF:.0%}–{CRITICAL_CONF:.0%}): {len(minor)}\n"
        f"   Noise   (<{MINOR_CONF:.0%})   : {len(noise)}\n\n"
        "2. SEVERITY CLASSIFICATION\n"
        f"   {severity}\n\n"
        "3. CORRECTIVE ACTION RECOMMENDATIONS\n"
        f"{action}\n\n"
        f"VERDICT: {verdict}"
    )
    return report, verdict


# ─────────────────────────────────────────────────────────────────────────────
#  POST /qc/analyze
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/analyze")
async def analyze_quality_control(
    order_id: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Module 3: Quality Control — YOLO12 + OpenCV Fabric Defect Detection.

    Pipeline:
      1. Decode uploaded fabric frame.
      2. Run YOLO12 nano inference for generic object detection.
      3. Run OpenCV multi-pass fabric texture analysis (dark/bright blobs,
         edge-density tiles, local variance patches).
      4. Merge, NMS-deduplicate, and classify all detections.
      5. Draw bounding boxes via OpenCV.
      6. Build compliance report from combined telemetry.
      7. Commit QCLog to database; update PO status.
    """
    if yolo_model is None:
        raise HTTPException(status_code=500, detail="YOLO model not loaded.")

    # ── 1. Verify PO exists ───────────────────────────────────────────────────
    po = await crud.get_purchase_order(db, order_id)
    if not po:
        raise HTTPException(
            status_code=404,
            detail=f"Purchase order '{order_id}' not found."
        )

    # ── 2. Decode image ───────────────────────────────────────────────────────
    try:
        image_bytes = await file.read()
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("cv2.imdecode returned None — not a valid image.")
    except Exception as e:
        logger.error(f"Image decode error: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid image payload: {e}")

    # ── 3. YOLO12 inference (general objects — supplementary) ─────────────────
    yolo_detections: List[dict] = []
    try:
        results = yolo_model(img, verbose=False, conf=0.20)
        result  = results[0]
        for box in result.boxes:
            cls_id = int(box.cls[0].item())
            label  = result.names[cls_id]
            conf   = float(box.conf[0].item())
            coords = box.xyxy[0].tolist()
            yolo_detections.append({
                "class":      label,
                "confidence": conf,
                "bbox":       [round(c, 2) for c in coords],
            })
        logger.info(
            f"YOLO12 scan: {len(yolo_detections)} generic object(s) on frame for order {order_id}"
        )
    except Exception as e:
        logger.error(f"YOLO12 inference error: {e}", exc_info=True)
        # Non-fatal — CV engine will still run below

    # ── 4. OpenCV fabric texture analysis (primary defect detector) ───────────
    try:
        cv_detections = _detect_fabric_defects_cv(img)
    except Exception as e:
        logger.error(f"OpenCV defect analysis error: {e}", exc_info=True)
        cv_detections = []

    # ── 5. Merge detections: CV results are the authoritative fabric signal ────
    # YOLO generic detections are included only if confidence ≥ MINOR_CONF
    filtered_yolo = [d for d in yolo_detections if d["confidence"] >= MINOR_CONF]
    combined = cv_detections + filtered_yolo
    combined = _nms(combined, iou_threshold=0.45)

    logger.info(
        f"Combined defect scan — CV: {len(cv_detections)}, "
        f"YOLO filtered: {len(filtered_yolo)}, "
        f"After NMS: {len(combined)}"
    )

    # ── 6. Annotate frame ─────────────────────────────────────────────────────
    try:
        annotated = img.copy()
        for det in combined:
            x1, y1, x2, y2 = (int(c) for c in det["bbox"])
            conf  = det["confidence"]
            label = det["class"]

            if label == "defect_free":
                colour = (0, 200, 0)       # Green → Defect Free
            elif conf >= CRITICAL_CONF:
                colour = (0, 0, 220)       # Red   → Critical
            elif conf >= MINOR_CONF:
                colour = (0, 165, 255)     # Amber → Minor
            else:
                colour = (120, 120, 120)   # Grey  → Noise

            cv2.rectangle(annotated, (x1, y1), (x2, y2), colour, 2)
            cv2.putText(
                annotated,
                f"{label} {conf:.0%}",
                (x1, max(y1 - 8, 10)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, colour, 1, cv2.LINE_AA,
            )

        _, buf = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 90])
        img_b64 = base64.b64encode(buf).decode("utf-8")

    except Exception as e:
        logger.error(f"Frame annotation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Image annotation failure: {e}")

    # ── 7. Build compliance report ────────────────────────────────────────────
    report_text, verdict = _build_qc_report(combined, yolo_detections)
    defect_type = (
        ", ".join(sorted({d["class"] for d in combined if d["class"] != "defect_free"}))
        if any(d["class"] != "defect_free" for d in combined)
        else "None"
    )

    # ── 8. Commit QCLog + update PO status ───────────────────────────────────
    try:
        qc_log = await crud.create_qc_log(
            db=db,
            order_id=order_id,
            defect_type=defect_type,
            status=verdict,
            report=report_text,
        )
        po.status = "QC Passed" if verdict == "Passed" else "QC Failed"
        await db.commit()
        await db.refresh(qc_log)
        logger.info(
            f"QC log committed — Order: {order_id}, Log ID: {qc_log.log_id}, "
            f"Verdict: {verdict}"
        )
    except Exception as db_err:
        await db.rollback()
        logger.error(f"QC log DB write failed: {db_err}")
        raise HTTPException(
            status_code=500, detail="Database write failure for QC audit log."
        )

    return {
        "status":          "success",
        "order_id":        order_id,
        "yolo_detections": combined,
        "vision_report":   report_text,
        "final_status":    verdict,
        "qc_log_id":       qc_log.log_id,
        "annotated_image": f"data:image/jpeg;base64,{img_b64}",
    }


# ─────────────────────────────────────────────────────────────────────────────
#  GET /qc/logs
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/logs", response_model=List[QCLogOut])
async def read_qc_logs(db: AsyncSession = Depends(get_db)):
    """Return all QC audit log records from the database."""
    try:
        return await crud.get_all_qc_logs(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database retrieval failure: {e}")
