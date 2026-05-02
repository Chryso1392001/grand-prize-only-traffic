# accident.py — Grand Prize Only

import cv2
import time
import numpy as np
from pathlib import Path
from datetime import datetime
from ultralytics import YOLO
import os

from dbconnection import log_violation, setup_db

JUNCTION_NAME  = "Kigali Highway"
COOLDOWN_SECS  = 30   # ← FIXED: was 5s, now 30s — max 2 per minute
FRAME_SKIP     = 3

MODEL_OPTIONS = ["accident_best.pt", "accident.pt", "atcc.pt"]

setup_db()


def find_model():
    for m in MODEL_OPTIONS:
        if os.path.exists(m):
            print(f"✅ Using model: {m}")
            return m
    return None


class AccidentDetection:
    def __init__(self, model_path, conf_threshold=0.5):  # ← FIXED: raised from 0.4 to 0.5
        self.conf_threshold  = conf_threshold
        self.output_dir      = Path("accident_detections")
        self.output_dir.mkdir(exist_ok=True)
        self.last_logged     = {}
        self.model = YOLO(model_path)
        print("✅ Accident model loaded")

    def process_video_with_gui(self, video_paths):
        caps = []
        for path in video_paths:
            if not os.path.exists(path):
                print(f"⚠️  Video not found, skipping: {path}")
                continue
            cap = cv2.VideoCapture(path)
            if cap.isOpened():
                caps.append(cap)
            else:
                print(f"❌ Cannot open: {path}")

        if not caps:
            print("❌ No valid video streams for accident detection")
            return

        target_size = (640, 480)
        prev_time   = time.time()
        frame_count = 0

        while True:
            frames = []
            for cap in caps:
                ret, frame = cap.read()
                if not ret:
                    continue

                frame_count += 1
                frame = cv2.resize(frame, target_size)

                if frame_count % FRAME_SKIP == 0:
                    results = self.model(frame, conf=self.conf_threshold, verbose=False)
                    for box in results[0].boxes:
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        conf = float(box.conf[0])
                        if conf < self.conf_threshold:
                            continue

                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                        cv2.putText(frame, f"Accident {conf:.2f}",
                                    (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX,
                                    0.6, (0, 0, 255), 2)

                        now  = time.time()
                        last = self.last_logged.get("accident", 0)
                        if now - last >= COOLDOWN_SECS:
                            self.last_logged["accident"] = now
                            ts       = datetime.now().strftime("%Y%m%d_%H%M%S")
                            path_out = self.output_dir / f"accident_{ts}.jpg"
                            cv2.imwrite(str(path_out), frame)
                            print(f"📸 Accident detected: {path_out}")
                            log_violation(
                                plate          = "ACCIDENT-DET",
                                violation_type = "ACCIDENT",
                                junction       = JUNCTION_NAME,
                                signal_state   = "N/A",
                                confidence     = f"{conf:.2f}",
                                snapshot_path  = str(path_out),
                            )

                cv2.putText(frame, JUNCTION_NAME, (10, 470),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
                frames.append(frame)

            if not frames:
                break

            curr_time = time.time()
            fps = 1 / max(curr_time - prev_time, 0.001)
            prev_time = curr_time

            for f in frames:
                cv2.putText(f, f"FPS: {int(fps)}", (500, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)

            rows    = [frames[i:i+2] for i in range(0, len(frames), 2)]
            stacked = [np.hstack(r) if len(r) > 1 else r[0] for r in rows]
            grid    = np.vstack(stacked) if len(stacked) > 1 else stacked[0]

            cv2.imshow("Accident Detection — Grand Prize Only", grid)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

        for cap in caps:
            cap.release()
        cv2.destroyAllWindows()

    @staticmethod
    def detect_accident(video_paths):
        model_path = find_model()
        if not model_path:
            print("❌ No accident model found. Checked:", MODEL_OPTIONS)
            return
        try:
            detector = AccidentDetection(model_path, 0.5)
            detector.process_video_with_gui(video_paths)
        except Exception as e:
            print(f"❌ Accident detection error: {str(e)}")


if __name__ == "__main__":
    video_paths = [
        os.path.join("sample detection videos", "accident.mp4"),
    ]
    AccidentDetection.detect_accident(video_paths)