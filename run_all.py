# run_all.py
# FIX: Uses multiprocessing instead of threading
# Each module gets its own CPU process — no more lag
# Threading was sharing 1 CPU. Now each module uses its own core.

import multiprocessing
import os

VIDEOS = {
    "anpr":     os.path.join("sample detection videos", "12.mp4"),
    "helmet":   os.path.join("sample detection videos", "helmet detection.mp4"),
    "triple":   os.path.join("sample detection videos", "triple riding.mp4"),
    "accident": [os.path.join("sample detection videos", "accident.mp4")],
    "atcc":     os.path.join("sample detection videos", "atcc sample.mp4"),
}


def run_anpr(_):
    from traffic_violation import process_video
    process_video(VIDEOS["anpr"])

def run_helmet(_):
    from helmet_detection import main_fun
    main_fun(VIDEOS["helmet"])

def run_triple(_):
    from triple_riding import detect_triple_riding
    detect_triple_riding(VIDEOS["triple"])

def run_accident(_):
    from accident import AccidentDetection
    AccidentDetection.detect_accident(VIDEOS["accident"])

def run_atcc(_):
    from ultralytics import YOLO
    from atcc import run_system
    model = YOLO("atcc.pt")
    run_system(VIDEOS["atcc"], model)


if __name__ == "__main__":
    multiprocessing.freeze_support()

    print("=" * 52)
    print("   Grand Prize Only — Traffic System Starting")
    print("=" * 52)

    print("\n📁 Video check:")
    for name, path in VIDEOS.items():
        paths = [path] if isinstance(path, str) else path
        for p in paths:
            print(f"  {'✅' if os.path.exists(p) else '❌ NOT FOUND'}  {p}")

    print(f"\n🖥️  CPU cores: {multiprocessing.cpu_count()}")
    print("🚀 Launching each module as a separate process...\n")

    targets = [
        ("ANPR",     run_anpr),
        ("Helmet",   run_helmet),
        ("Triple",   run_triple),
        ("Accident", run_accident),
        ("ATCC",     run_atcc),
    ]

    processes = []
    for name, target in targets:
        p = multiprocessing.Process(target=target, args=(None,), name=name, daemon=True)
        p.start()
        processes.append(p)
        print(f"✅ Started: {name}  (PID {p.pid})")

    print("\n🟢 All modules running. Press CTRL+C to stop.\n")

    try:
        for p in processes:
            p.join()
    except KeyboardInterrupt:
        print("\n⛔ Stopping all...")
        for p in processes:
            p.terminate()
        print("✅ Done.")
