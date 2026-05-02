# helmet_detection.py
# FIX 1: Cooldown — logs same plate max once every 5 seconds (stops spam)
# FIX 2: Frame skip — processes every 3rd frame for better speed

import os
import cv2
from ultralytics import YOLO
import time
from datetime import datetime

from dbconnection import log_violation, setup_db

CONF_THRESHOLD = 0.5
JUNCTION_NAME  = "Kimironko Junction"
SNAPSHOT_DIR   = os.path.join("snapshots", "helmet")
COOLDOWN_SECS  = 5    # log same plate max once every 5 seconds
FRAME_SKIP     = 3    # only run YOLO on every 3rd frame

os.makedirs(SNAPSHOT_DIR, exist_ok=True)
setup_db()


def main_fun(video_path, plate="UNKNOWN"):
    model_path = "helmet.pt"
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"❌ Model not found: {model_path}")

    model = YOLO(model_path)

    if isinstance(video_path, int):
        print("📷 Using webcam...")
    elif not os.path.exists(video_path):
        raise FileNotFoundError(f"❌ Video not found: {video_path}")

    print(f"🚀 Processing: {video_path}")
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise IOError(f"❌ Cannot open: {video_path}")

    prev_time   = time.time()
    last_logged = {}   # plate -> last log timestamp
    frame_count = 0
    last_frame  = None

    while True:
        ret, frame = cap.read()
        if not ret:
            print("✅ End of video.")
            break

        frame_count += 1
        frame = cv2.resize(frame, (640, 480))

        # Only run inference on every Nth frame
        if frame_count % FRAME_SKIP == 0:
            results = model(frame, conf=CONF_THRESHOLD, verbose=False)
            for r in results:
                for box in r.boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    conf  = float(box.conf[0])
                    cls   = int(box.cls[0])
                    label = model.names.get(cls, str(cls))
                    color = (0, 255, 0)

                    if "without helmet" in label.lower():
                        color = (0, 0, 255)
                        now  = time.time()
                        last = last_logged.get(plate, 0)
                        if now - last >= COOLDOWN_SECS:
                            last_logged[plate] = now
                            ts   = datetime.now().strftime("%Y%m%d_%H%M%S")
                            snap = os.path.join(SNAPSHOT_DIR,
                                                f"{plate.replace(' ','_')}_{ts}.jpg")
                            cv2.imwrite(snap, frame)
                            log_violation(
                                plate="UNKNOWN", violation_type="NO_HELMET",
                                junction=JUNCTION_NAME, signal_state="N/A",
                                confidence=f"{conf:.2f}", snapshot_path=snap,
                            )

                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                    cv2.putText(frame, f"{label} {conf:.2f}",
                                (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
            last_frame = frame.copy()
        elif last_frame is not None:
            # reuse last annotated frame for skipped frames
            frame = last_frame.copy()

        curr_time = time.time()
        fps = 1 / max(curr_time - prev_time, 0.001)
        prev_time = curr_time

        cv2.putText(frame, f"FPS: {int(fps)}", (500, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        cv2.putText(frame, "Helmet Detection System",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        cv2.putText(frame, JUNCTION_NAME,
                    (10, 470), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

        cv2.imshow("Helmet Detection — Grand Prize Only", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    video_path = os.path.join("sample detection videos", "helmet detection.mp4")
    main_fun(video_path)
