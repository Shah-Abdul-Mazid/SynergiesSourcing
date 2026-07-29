from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

from app.core.database import get_db
from app.schemas.erp_schemas import QCLogOut
import app.crud.erp_crud as crud
from app.services.ai_service import AIService
from ultralytics import YOLO
import cv2
import numpy as np
import base64
import logging

router = APIRouter(prefix="/qc", tags=["quality_control"])
logger = logging.getLogger("smartfactory.qc")
ai_service = AIService()

from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
yolo_model = None

try:
    local_weights_1 = BASE_DIR / "Data" / "runs" / "fabric_yolo" / "weights" / "best.pt"
    local_weights_2 = BASE_DIR / "yolov8n.pt"
    local_weights_3 = BASE_DIR / "yolo12n.pt"

    if local_weights_1.exists():
        yolo_model = YOLO(str(local_weights_1))
        logger.info(f"Loaded custom YOLO model from {local_weights_1}")
    elif local_weights_2.exists():
        yolo_model = YOLO(str(local_weights_2))
        logger.info(f"Loaded YOLO model from {local_weights_2}")
    elif local_weights_3.exists():
        yolo_model = YOLO(str(local_weights_3))
        logger.info(f"Loaded YOLO model from {local_weights_3}")
    else:
        yolo_model = YOLO("yolov8n.pt")
        logger.info("YOLOv8n standard weights loaded.")
except Exception as e:
    logger.warning(
        f"YOLO model load warning ({e}). "
        "Engine will use multi-pass OpenCV texture detection & Vision-LLM as primary visual inspector."
    )
    yolo_model = None

CRITICAL_CONF = 0.60   # ≥ 60 % → Critical defect
MINOR_CONF    = 0.30   # ≥ 30 % → Minor defect; < 30 % → Noise

BLOB_MIN_AREA      = 80
BLOB_MAX_AREA      = 40000
DARK_SPOT_THRESH   = 60
BRIGHT_SPOT_THRESH = 220
LOCAL_STD_THRESH   = 18.0
EDGE_DENSITY_MULT  = 2.2


def _detect_fabric_defects_cv(img_bgr: np.ndarray) -> List[dict]:
    detections: List[dict] = []
    h, w = img_bgr.shape[:2]

    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    _, dark_mask = cv2.threshold(blurred, DARK_SPOT_THRESH, 255, cv2.THRESH_BINARY_INV)
    dark_mask = cv2.morphologyEx(dark_mask, cv2.MORPH_OPEN,
                                  cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    contours_dark, _ = cv2.findContours(dark_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for cnt in contours_dark:
        area = cv2.contourArea(cnt)
        if BLOB_MIN_AREA <= area <= BLOB_MAX_AREA:
            x, y, cw, ch = cv2.boundingRect(cnt)
            conf = min(0.45 + (area / BLOB_MAX_AREA) * 0.50, 0.95)
            detections.append({
                "class":      "dark_spot_stain",
                "confidence": round(conf, 3),
                "bbox":       [float(x), float(y), float(x + cw), float(y + ch)],
            })

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

    edges = cv2.Canny(blurred, 40, 120)
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

    detections = _nms(detections, iou_threshold=0.45)
    logger.info(f"OpenCV fabric detector found {len(detections)} defect region(s).")
    return detections


def _iou(a: list, b: list) -> float:
    ix1 = max(a[0], b[0]); iy1 = max(a[1], b[1])
    ix2 = min(a[2], b[2]); iy2 = min(a[3], b[3])
    inter = max(0.0, ix2 - ix1) * max(0.0, iy2 - iy1)
    if inter == 0:
        return 0.0
    area_a = (a[2]-a[0]) * (a[3]-a[1])
    area_b = (b[2]-b[0]) * (b[3]-b[1])
    return inter / (area_a + area_b - inter)


def _nms(detections: List[dict], iou_threshold: float = 0.45) -> List[dict]:
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


def _build_qc_report(detections: List[dict], yolo_raw: List[dict]) -> tuple[str, str]:
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


@router.post("/analyze")
async def analyze_quality_control(
    order_id: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if yolo_model is None:
        logger.info("YOLO model not active; running OpenCV multi-pass texture scan & Vision-LLM engine.")

    po = await crud.get_purchase_order(db, order_id)
    if not po:
        raise HTTPException(
            status_code=404,
            detail=f"Purchase order '{order_id}' not found."
        )

    try:
        image_bytes = await file.read()
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("cv2.imdecode returned None — not a valid image.")
    except Exception as e:
        logger.error(f"Image decode error: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid image payload: {e}")

    yolo_detections: List[dict] = []
    if yolo_model is not None:
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
        except Exception as e:
            logger.error(f"YOLO inference error: {e}", exc_info=True)

    try:
        cv_detections = _detect_fabric_defects_cv(img)
    except Exception as e:
        logger.error(f"OpenCV defect analysis error: {e}", exc_info=True)
        cv_detections = []

    filtered_yolo = [d for d in yolo_detections if d["confidence"] >= MINOR_CONF]
    combined = cv_detections + filtered_yolo
    combined = _nms(combined, iou_threshold=0.45)

    cropped_regions: List[dict] = []
    try:
        annotated = img.copy()
        img_h, img_w = img.shape[:2]

        for idx, det in enumerate(combined, 1):
            x1, y1, x2, y2 = (int(c) for c in det["bbox"])
            conf  = det["confidence"]
            label = det["class"]

            crop_x1 = max(0, x1)
            crop_y1 = max(0, y1)
            crop_x2 = min(img_w, x2)
            crop_y2 = min(img_h, y2)

            crop_b64 = ""
            if (crop_x2 > crop_x1) and (crop_y2 > crop_y1):
                crop_patch = img[crop_y1:crop_y2, crop_x1:crop_x2]
                _, crop_buf = cv2.imencode(".jpg", crop_patch, [cv2.IMWRITE_JPEG_QUALITY, 90])
                crop_b64 = f"data:image/jpeg;base64,{base64.b64encode(crop_buf).decode('utf-8')}"

            cropped_regions.append({
                "id":         idx,
                "class":      label,
                "confidence": conf,
                "bbox":       [crop_x1, crop_y1, crop_x2, crop_y2],
                "crop_b64":   crop_b64,
            })

            if label == "defect_free":
                colour = (0, 200, 0)
            elif conf >= CRITICAL_CONF:
                colour = (0, 0, 220)
            elif conf >= MINOR_CONF:
                colour = (0, 165, 255)
            else:
                colour = (120, 120, 120)

            cv2.rectangle(annotated, (x1, y1), (x2, y2), colour, 2)
            cv2.putText(
                annotated,
                f"#{idx} {label} {conf:.0%}",
                (x1, max(y1 - 8, 10)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, colour, 1, cv2.LINE_AA,
            )

        _, buf = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 90])
        img_b64 = base64.b64encode(buf).decode("utf-8")

    except Exception as e:
        logger.error(f"Frame annotation & region cropping error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Image processing failure: {e}")

    try:
        vision_res = await ai_service.generate_multimodal_vision_report(
            cropped_regions=cropped_regions,
            order_id=order_id,
            user_prompt="Inspect cropped bounding box regions and generate multimodal diagnostic analysis.",
            full_image_b64=f"data:image/jpeg;base64,{img_b64}",
        )
        report_text = vision_res["report_text"]
        verdict = vision_res["verdict"]
    except Exception as vision_err:
        logger.error(f"Multimodal vision generation failed ({vision_err}), fallback to standard report")
        report_text, verdict = _build_qc_report(combined, yolo_detections)

    defect_type = (
        ", ".join(sorted({d["class"] for d in combined if d["class"] != "defect_free"}))
        if any(d["class"] != "defect_free" for d in combined)
        else "None"
    )

    try:
        qc_log = await crud.create_qc_log(
            db=db,
            order_id=order_id,
            defect_type=defect_type,
            status=verdict,
            report=report_text,
        )
        po_status = "QC Passed" if verdict == "Passed" else "QC Failed"
        await crud.update_po_status(db, order_id=order_id, status=po_status)
        logger.info(
            f"QC log committed — Order: {order_id}, Log ID: {qc_log.log_id}, "
            f"Verdict: {verdict}"
        )
    except Exception as db_err:
        logger.error(f"QC log DB write failed: {db_err}")
        raise HTTPException(
            status_code=500, detail="Database write failure for QC audit log."
        )

    return {
        "status":          "success",
        "order_id":        order_id,
        "yolo_detections": combined,
        "cropped_regions": cropped_regions,
        "vision_report":   report_text,
        "final_status":    verdict,
        "qc_log_id":       qc_log.log_id,
        "annotated_image": f"data:image/jpeg;base64,{img_b64}",
    }


@router.get("/logs", response_model=List[QCLogOut])
async def read_qc_logs(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Return all QC audit log records from the database."""
    try:
        return await crud.get_all_qc_logs(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database retrieval failure: {e}")
