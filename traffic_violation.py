# traffic_violation.py — Grand Prize Only

import cv2
import os
import easyocr
from datetime import datetime

from dbconnection import log_violation, setup_db
from utils.plate_validator import validate_rwanda_plate

# ── CONFIG ────────────────────────────────────────────────────────
JUNCTION_NAME = "Kacyiru Junction"
SNAPSHOT_DIR  = os.path.join("snapshots", "anpr")
os.makedirs(SNAPSHOT_DIR, exist_ok=True)

# ── INIT ──────────────────────────────────────────────────────────
setup_db()
reader = easyocr.Reader(['en'], gpu=False)

cascade_path = os.path.join("models", "YOLO", "haarcascade_russian_plate_number.xml")
if not os.path.exists(cascade_path):
    raise FileNotFoundError("❌ Haarcascade not found at: " + cascade_path)
plate_cascade = cv2.CascadeClassifier(cascade_path)


# ── HELPERS ───────────────────────────────────────────────────────
def detect_traffic_color(frame, rect):
    x, y, w, h = rect
    roi = frame[y:y+h, x:x+w]
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    red    = cv2.inRange(hsv, (0, 120, 70),   (10, 255, 255))
    yellow = cv2.inRange(hsv, (20, 100, 100),  (30, 255, 255))
    if cv2.countNonZero(red) > 0:
        return "RED",    (0, 0, 255)
    elif cv2.countNonZero(yellow) > 0:
        return "YELLOW", (0, 255, 255)
    return "GREEN", (0, 255, 0)


def extract_plate_text(plate_img):
    results = reader.readtext(plate_img)
    if results:
        return results[0][-2]
    return ""


def save_snapshot(frame, plate_text):
    ts   = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe = plate_text.replace(" ", "_")
    path = os.path.join(SNAPSHOT_DIR, f"{safe}_{ts}.jpg")
    cv2.imwrite(path, frame)
    return path


def draw_repeat_banner(frame, plate):
    h, w = frame.shape[:2]
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, 50), (0, 0, 180), -1)
    cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)
    cv2.putText(frame, f"REPEAT OFFENDER: {plate}",
                (10, 33), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)
    return frame


# ── MAIN ──────────────────────────────────────────────────────────
def process_video(video_path):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("❌ Cannot open video:", video_path)
        return

    print(f"✅ Video opened: {video_path}")
    print(f"   FPS: {cap.get(cv2.CAP_PROP_FPS):.1f}")
    print(f"   Frames: {int(cap.get(cv2.CAP_PROP_FRAME_COUNT))}")

    logged_this_frame = set()
    plate_cooldown    = {}
    frame_count       = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            print("✅ End of video.")
            break

        frame_count += 1

        # Skip first 50 frames (intro/title screen)
        if frame_count < 150:
            continue

        # Bigger frame = more pixels on plates
        frame = cv2.resize(frame, (1280, 720))
        gray  = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Aggressive plate detection
        plates = plate_cascade.detectMultiScale(
            gray,
            scaleFactor=1.05,
            minNeighbors=2,
            minSize=(40, 15)
        )

        signal_status = "UNKNOWN"
        signal_color  = (200, 200, 200)
        logged_this_frame.clear()

        for (x, y, w, h) in plates:
            plate_img = frame[y:y+h, x:x+w]
            raw_text  = extract_plate_text(plate_img)

            # Validate Rwanda plate — skip invalid silently
            v = validate_rwanda_plate(raw_text)
            if not v["valid"]:
                continue

            plate_text = v["plate"]
            confidence = v["confidence"]

            # Traffic light detection
            signal_status, signal_color = detect_traffic_color(
                frame, (0, 0, 100, 100)
            )

            # Green box around valid plate only
            cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
            cv2.putText(frame, plate_text, (x, y - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

            # Log with 60-frame cooldown per plate
            last_logged = plate_cooldown.get(plate_text, -999)
            if plate_text not in logged_this_frame and (frame_count - last_logged) > 60:
                logged_this_frame.add(plate_text)
                plate_cooldown[plate_text] = frame_count

                snap   = save_snapshot(frame, plate_text)
                result = log_violation(
                    plate          = plate_text,
                    violation_type = "RED_LIGHT",
                    junction       = JUNCTION_NAME,
                    signal_state   = signal_status,
                    confidence     = confidence,
                    snapshot_path  = snap,
                )
                print(f"✅ Logged: {plate_text} | {signal_status} | {JUNCTION_NAME}")
                if result and result.get("repeat_offender"):
                    frame = draw_repeat_banner(frame, plate_text)
                    print(f"🚨 REPEAT OFFENDER: {plate_text}")

        # HUD — black background for readability
        cv2.rectangle(frame, (0, 0), (320, 45), (0, 0, 0), -1)
        cv2.putText(frame, f"Signal: {signal_status}",
                    (10, 35), cv2.FONT_HERSHEY_SIMPLEX, 1, signal_color, 2)
        cv2.putText(frame, JUNCTION_NAME,
                    (10, 710), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)

        cv2.imshow("ANPR — Grand Prize Only", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    video_path = os.path.join("sample detection videos", "12.mp4")
    process_video(video_path)
