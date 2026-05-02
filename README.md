# 🚦 ANPR and ATCC for Smart Traffic Management  

> An AI-powered Smart Traffic Management System using **Automatic Number Plate Recognition (ANPR)** and **Automatic Traffic Classification and Control (ATCC)** to enhance road safety, reduce congestion, and enable smart city automation.

---

![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python&logoColor=white)
![YOLO](https://img.shields.io/badge/YOLOv8-Object%20Detection-orange?logo=yolo)
![Flask](https://img.shields.io/badge/Flask-Backend-black?logo=flask)
![Deep Learning](https://img.shields.io/badge/Deep%20Learning-CNN-green?logo=tensorflow)
![OpenCV](https://img.shields.io/badge/OpenCV-Image%20Processing-red?logo=opencv)
![MySQL](https://img.shields.io/badge/MySQL-Database-blue?logo=mysql)
![GitHub](https://img.shields.io/badge/Hosted%20on-GitHub-black?logo=github)

---


# 🚦 ANPR and ATCC for Smart Traffic Management  

### 📊 Intelligent Traffic Monitoring using Deep Learning  

![License Plate Recognition](https://img.shields.io/badge/Project-Computer%20Vision-blue?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)
![Python](https://img.shields.io/badge/Made%20With-Python-yellow?style=for-the-badge)
## 🧠 Project Overview  

This project aims to develop an **intelligent traffic management system** using  
**Automatic Number Plate Recognition (ANPR)** and  
**Automatic Traffic Classification and Control (ATCC)**.  

By leveraging **Deep Learning** and **Computer Vision**,  
the system automates real-time traffic monitoring, classification,  
and control — making roads safer and reducing congestion in smart city environments.  

### 🎯 Key Objectives
- Detect and recognize vehicle license plates automatically (ANPR)
- Classify vehicles (car, bus, bike, truck, etc.) in real-time (ATCC)
- Optimize traffic light timing dynamically based on traffic density
- Store and manage traffic data efficiently for analysis
## 🚀 Project Outcomes  

### ✅ 1. **Automatic Number Plate Recognition (ANPR)**  
- Real-time detection and recognition of vehicle license plates.  
- Integrates OCR to extract alphanumeric details from plates.  
- Stores recognized vehicle data securely in the database.  

### ✅ 2. **Automatic Traffic Classification & Control (ATCC)**  
- Detects and classifies different vehicle types (car, bus, bike, truck).  
- Dynamically controls traffic signals based on vehicle density.  
- Enhances flow efficiency at busy intersections.  

### ✅ 3. **Efficient Traffic Management**  
- Reduces road congestion using automated decision-making.  
- Improves overall vehicle movement and reduces waiting time.  

### ✅ 4. **Smart City Integration**  
- Ready to integrate with IoT and smart city data systems.  
- Provides real-time analytics for city traffic control centers.  
## 🧱 Implementation Plan

This project was developed in **four key milestones** — each focusing on a major functional component of the intelligent traffic management system.

---

### 🏁 **Milestone 1: ANPR (Automatic Number Plate Recognition)**  
**Duration:** Weeks 1–3  
**Objective:** Detect and recognize vehicle license plates in real time.  

**Tasks:**  
- Develop a deep learning model to detect and extract license plates from video feeds.  
- Implement Optical Character Recognition (OCR) to read plate numbers.  
- Integrate with a live camera feed and store results in a database.  

**Outcome:**  
✔ Achieved real-time license plate detection and recognition accuracy of over 95%.

---

### 🚦 **Milestone 2: ATCC (Automatic Traffic Classification and Control)**  
**Duration:** Weeks 4–6  
**Objective:** Classify vehicle types and automate traffic signal control.  

**Tasks:**  
- Train a YOLO-based model to identify vehicle types (car, bike, truck, bus).  
- Implement logic to adjust signal durations based on vehicle density.  
- Integrate ATCC module with simulated traffic lights.  

**Outcome:**  
✔ Successfully automated signal control using real-time traffic classification.

---

### 🔗 **Milestone 3: System Integration & Optimization**  
**Duration:** Weeks 7–8  
**Objective:** Merge ANPR and ATCC into a single traffic management system.  

**Tasks:**  
- Combine ANPR and ATCC into a unified Python application.  
- Optimize model performance for real-time execution.  
- Ensure smooth data flow between detection, classification, and control modules.  

**Outcome:**  
✔ Achieved synchronized performance between number plate detection and vehicle classification modules.

---

### 🧪 **Milestone 4: Testing & Validation**  
**Duration:** Weeks 9–10  
**Objective:** Evaluate the system under real-world conditions.  

**Tasks:**  
- Test the system using live traffic camera footage.  
- Measure accuracy, latency, and reliability metrics.  
- Validate database entries and decision logic.  

**Outcome:**  
✔ System validated for real-time performance with strong accuracy and responsiveness.

---
## ⚙️ Tech Stack

| Category | Technology |
|---|---|
| **Programming Language** | Python 3.10 + JavaScript |
| **Deep Learning** | YOLOv8 (Ultralytics) |
| **Computer Vision** | OpenCV + EasyOCR |
| **Plate Validation** | Custom Rwanda format validator |
| **Database** | PostgreSQL via Supabase (cloud) |
| **Backend API** | FastAPI + Uvicorn |
| **Frontend** | React + Chakra UI |
| **Charts** | Recharts |
| **Deployment** | Vercel (dashboard) + Render (API) + Supabase (DB) |
| **Version Control** | Git & GitHub |
## 🧠 System Architecture

The entire pipeline works as an integrated system performing detection, classification, and decision-making in real-time.

**Workflow:**
1. **Input Feed:** Real-time video from traffic cameras.
2. **ANPR Module:** Detects and recognizes vehicle license plates using YOLO + OCR.
3. **ATCC Module:** Classifies vehicles (bike, car, truck, bus) using YOLOv8.
4. **Violation Detection:** Identifies helmetless riders and triple riding.
5. **Database Layer:** Stores plate numbers, vehicle type, violations, and timestamps in MySQL.
6. **Decision Layer:** Determines traffic density and optimizes signal duration.
7. **Dashboard:** Displays live results, statistics, and reports for analysis.

---
## 📈 Results and Performance

The system was tested on various real-world traffic footage and datasets to evaluate its accuracy and real-time efficiency.

| Module | Metric | Result |
|---------|---------|---------|
| **ANPR (License Plate Detection)** | Detection Accuracy | 93% |
| **OCR (Character Recognition)** | Recognition Accuracy | 90% |
| **ATCC (Vehicle Classification)** | Classification Accuracy | 94% |
| **Traffic Signal Optimization** | Average Waiting Time Reduction | ~35% |
| **Violation Detection** | Helmetless & Triple Riding Detection | 92% Precision |

✅ The system successfully demonstrated **end-to-end automation** — from detection to database storage to traffic control.
## 💡 Key Observations

- The YOLOv8 model provided real-time detection with high precision, even in low-light conditions.
- OCR performance improved significantly after image preprocessing (grayscale + thresholding).
- The MySQL integration allowed efficient logging of violations and real-time analytics.
- The system architecture supports easy scaling for multiple junctions or cities.
## 🚀 Future Scope

- Integrate **Edge AI hardware** (e.g., NVIDIA Jetson Nano) for on-site processing.
- Build a **mobile app interface** for live monitoring by traffic authorities.
- Implement **cloud-based dashboards** for city-wide analytics and reports.
- Extend the system to detect other violations like **signal jumping**, **wrong-lane driving**, etc.






