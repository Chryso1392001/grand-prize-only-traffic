# atcc.py
# FIX: Added frame skip for better playback speed

import cv2
import numpy as np
from ultralytics import YOLO
import os
import time

from dbconnection import log_violation, setup_db

CONF_THRESHOLD = 0.4
JUNCTION_NAME  = "Kacyiru Junction"
FRAME_SKIP     = 2    # process every 2nd frame for speed

setup_db()


def simulate_traffic_light(frame, light_state, position):
    colors = [(0, 0, 255), (0, 255, 255), (0, 255, 0)]
    x, y   = position
    cv2.rectangle(frame, (x, y), (x+50, y+150), (40, 40, 40), -1)
    for i, color in enumerate(colors):
        active = color if i == light_state else (80, 80, 80)
        cv2.circle(frame, (x+25, y+25+i*50), 15, active, -1)


def determine_signal(total):
    if total < 10:
        return "Green",  (0, 255, 0),   2
    elif total < 20:
        return "Yellow", (0, 255, 255),  1
    else:
        return "Red",    (0, 0, 255),    0


def load_videos(video_input):
    videos = []
    if isinstance(video_input, int):
        videos.append({"path": video_input, "road_name": "Webcam"})
        return videos
    if os.path.isfile(video_input):
        videos.append({"path": video_input, "road_name": os.path.basename(video_input)})
    elif os.path.isdir(video_input):
        for f in os.listdir(video_input):
            if f.endswith(('.mp4', '.avi', '.mkv', '.mov')):
                videos.append({"path": os.path.join(video_input, f), "road_name": f})
    else:
        print("❌ Invalid video path:", video_input)
    return videos


def process_frame(frame, model, road_name):
    directions    = {"left": 0, "right": 0}
    vehicle_count = {"car": 0, "truck": 0, "motorcycle": 0, "bus": 0}

    results    = model(frame, verbose=False)
    detections = results[0].boxes.data.cpu().numpy()

    for det in detections:
        x1, y1, x2, y2, conf, cls = det
        if conf < CONF_THRESHOLD:
            continue
        label = model.names[int(cls)]
        if label in vehicle_count:
            vehicle_count[label] += 1
            if (x1 + x2) / 2 < frame.shape[1] / 2:
                directions["left"] += 1
            else:
                directions["right"] += 1
            cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
            cv2.putText(frame, f"{label} {conf:.2f}",
                        (int(x1), int(y1)-10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (300, 180), (0, 0, 0), -1)
    frame = cv2.addWeighted(overlay, 0.4, frame, 0.6, 0)

    cv2.putText(frame, f"Road: {road_name}", (10, 25),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    y = 50
    for k, v in directions.items():
        cv2.putText(frame, f"{k}: {v}", (10, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        y += 25

    total = sum(vehicle_count.values())
    cv2.putText(frame, f"Total: {total}", (10, y),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    y += 30
    signal, color, state = determine_signal(total)
    cv2.putText(frame, f"Signal: {signal}", (10, y),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
    simulate_traffic_light(frame, state, (frame.shape[1]-80, 20))

    return frame, signal, total


def run_system(video_input, model):
    videos = load_videos(video_input)
    if not videos:
        return

    caps, names = [], []
    for v in videos:
        cap = cv2.VideoCapture(v["path"])
        if not cap.isOpened():
            print("❌ Cannot open:", v["path"])
            continue
        caps.append(cap)
        names.append(v["road_name"])

    prev_time       = time.time()
    last_signal     = {}
    signal_log_cool = {}
    frame_count     = 0
    last_frames     = {}

    while True:
        frames = []
        frame_count += 1

        for i, cap in enumerate(caps):
            ret, frame = cap.read()
            if not ret:
                continue
            frame = cv2.resize(frame, (640, 480))

            if frame_count % FRAME_SKIP == 0:
                frame, signal, total = process_frame(frame, model, names[i])
                last_frames[i] = (frame.copy(), signal, total)
            elif i in last_frames:
                frame, signal, total = last_frames[i]
                frame = frame.copy()
            else:
                signal, total = "Green", 0

            # log RED signal
            now = time.time()
            key = names[i]
            if (signal == "Red"
                    and last_signal.get(key) != "Red"
                    and now - signal_log_cool.get(key, 0) > 10):
                signal_log_cool[key] = now
                log_violation(
                    plate="TRAFFIC_CONTROL", violation_type="RED_SIGNAL_TRIGGERED",
                    junction=JUNCTION_NAME, signal_state="RED",
                    confidence=f"vehicles:{total}",
                )
            last_signal[key] = signal
            frames.append(frame)

        if not frames:
            break

        curr_time = time.time()
        fps = 1 / max(curr_time - prev_time, 0.001)
        prev_time = curr_time

        for f in frames:
            cv2.putText(f, f"FPS: {int(fps)}", (500, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)

        grid = np.hstack(frames) if len(frames) > 1 else frames[0]
        cv2.imshow("Smart Traffic — Grand Prize Only", grid)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    for cap in caps:
        cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    model       = YOLO("atcc.pt")
    video_input = os.path.join("sample detection videos", "atcc sample.mp4")
    run_system(video_input, model)
