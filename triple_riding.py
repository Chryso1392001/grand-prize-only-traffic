# triple_riding.py
# WHAT CHANGED FROM ORIGINAL:
# 1. Added log_violation() call when triple riding detected
# 2. Added setup_db() on startup
# 3. Added snapshot saving
# 4. Added junction name to log
# 5. Model loaded inside function (not at module level) so import is safe
# WHAT TO CHANGE: set JUNCTION_NAME to match this camera's location

import cv2
from ultralytics import YOLO
import os
import time
from datetime import datetime

from dbconnection import log_violation, setup_db

# ── CONFIG ───────────────────────────────────────────────────────────────────
CONF_THRESHOLD = 0.4
IOU_THRESHOLD  = 0.3
JUNCTION_NAME  = "Nyabugogo Junction"   # ← change per camera
SNAPSHOT_DIR   = os.path.join("snapshots", "triple_riding")
os.makedirs(SNAPSHOT_DIR, exist_ok=True)

setup_db()


def compute_overlap(boxA, boxB):
    """IOU overlap — unchanged from your original."""
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])
    if xA >= xB or yA >= yB:
        return 0
    interArea = (xB - xA) * (yB - yA)
    boxBArea  = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])
    return interArea / boxBArea


def detect_triple_riding(video_path, plate="UNKNOWN"):
    """
    plate: pass plate number from ANPR if available.
    """
    model = YOLO("triple riding.pt")
    cap   = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        print("❌ Cannot open video")
        return

    prev_time     = time.time()
    logged_plates = set()

    while True:
        ret, frame = cap.read()
        if not ret:
            print("✅ End of video")
            break

        frame = cv2.resize(frame, (640, 480))
        logged_plates.clear()

        results    = model(frame, conf=CONF_THRESHOLD, verbose=False)
        detections = results[0].boxes.data.cpu().numpy()

        motorbikes = []
        people     = []

        for det in detections:
            x1, y1, x2, y2, conf, cls = det
            if conf < CONF_THRESHOLD:
                continue
            label = model.names[int(cls)]
            if "motorcycle" in label or "bike" in label:
                motorbikes.append([x1, y1, x2, y2])
            elif "person" in label:
                people.append([x1, y1, x2, y2])

        for bike in motorbikes:
            x1_b, y1_b, x2_b, y2_b = bike
            count = sum(
                1 for person in people
                if compute_overlap(bike, person) > IOU_THRESHOLD
            )

            is_violation = count >= 3
            color  = (0, 0, 255) if is_violation else (0, 255, 0)
            status = "TRIPLE RIDING" if is_violation else "OK"

            cv2.rectangle(frame,
                          (int(x1_b), int(y1_b)),
                          (int(x2_b), int(y2_b)), color, 2)
            cv2.putText(frame, f"{count} persons - {status}",
                        (int(x1_b), int(y1_b)-10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

            # ── log violation ────────────────────────────────────────────────
            if is_violation and plate not in logged_plates:
                logged_plates.add(plate)
                ts   = datetime.now().strftime("%Y%m%d_%H%M%S")
                snap = os.path.join(
                    SNAPSHOT_DIR,
                    f"{plate.replace(' ','_')}_{ts}.jpg"
                )
                cv2.imwrite(snap, frame)
                log_violation(
                    plate          = plate,
                    violation_type = "TRIPLE_RIDING",
                    junction       = JUNCTION_NAME,
                    signal_state   = "N/A",
                    confidence     = "n/a",
                    snapshot_path  = snap,
                )

        # ── FPS + HUD ────────────────────────────────────────────────────────
        curr_time = time.time()
        fps       = 1 / (curr_time - prev_time)
        prev_time = curr_time

        cv2.putText(frame, f"FPS: {int(fps)}", (500, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        cv2.putText(frame, "Triple Riding Detection",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        cv2.putText(frame, JUNCTION_NAME,
                    (10, 470), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

        cv2.imshow("Triple Riding — Grand Prize Only", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            print("⛔ Stopped by user")
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    video_path = os.path.join("sample detection videos", "triple riding.mp4")
    detect_triple_riding(video_path)
