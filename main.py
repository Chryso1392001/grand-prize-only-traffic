from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import psycopg2.extras
from dbconnection import setup_db, get_connection_dict

app = FastAPI(title="Grand Prize Only — Traffic API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    setup_db()

# ── GET /violations ───────────────────────────────────────────────
@app.get("/violations")
def get_violations(limit: int = 200):
    conn = get_connection_dict()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT plate, violation_type, junction,
                       signal_state, confidence, snapshot_path, timestamp
                FROM violations
                ORDER BY id DESC
                LIMIT %s
            """, (limit,))
            rows = cur.fetchall()
        return [
            {
                "plate":          r["plate"],
                "violation_type": r["violation_type"],
                "junction":       r["junction"] or "—",
                "signal_state":   r["signal_state"] or "—",
                "confidence":     r["confidence"] or "—",
                "snapshot_path":  r["snapshot_path"] or "",
                "timestamp":      str(r["timestamp"]) if r["timestamp"] else "",
            }
            for r in rows
        ]
    finally:
        conn.close()

# ── GET /repeat-offenders ─────────────────────────────────────────
@app.get("/repeat-offenders")
def get_repeat_offenders(threshold: int = 3):
    conn = get_connection_dict()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT plate, total, last_seen
                FROM offender_counts
                WHERE total >= %s
                ORDER BY total DESC
            """, (threshold,))
            rows = cur.fetchall()
        return [
            {
                "plate":     r["plate"],
                "count":     r["total"],
                "total":     r["total"],
                "last_seen": str(r["last_seen"]) if r["last_seen"] else "",
            }
            for r in rows
        ]
    finally:
        conn.close()

# ── GET /stats ────────────────────────────────────────────────────
@app.get("/stats")
def get_stats():
    conn = get_connection_dict()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS total FROM violations")
            total = cur.fetchone()["total"]

            cur.execute("SELECT COUNT(*) AS critical FROM offender_counts WHERE total >= 3")
            critical = cur.fetchone()["critical"]

            cur.execute("""
                SELECT violation_type, COUNT(*) AS cnt
                FROM violations
                GROUP BY violation_type ORDER BY cnt DESC
            """)
            by_type = {r["violation_type"]: r["cnt"] for r in cur.fetchall()}

            cur.execute("""
                SELECT junction, COUNT(*) AS cnt
                FROM violations
                GROUP BY junction ORDER BY cnt DESC LIMIT 8
            """)
            by_junction = {r["junction"]: r["cnt"] for r in cur.fetchall()}

        return {
            "total":       total,
            "critical":    critical,
            "by_type":     by_type,
            "by_junction": by_junction,
        }
    finally:
        conn.close()

# ── GET /analytics ────────────────────────────────────────────────
@app.get("/analytics")
def get_analytics():
    conn = get_connection_dict()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS total FROM violations")
            total = cur.fetchone()["total"]

            cur.execute("""
                SELECT violation_type, COUNT(*) AS count
                FROM violations
                GROUP BY violation_type ORDER BY count DESC
            """)
            by_type = [{"violation_type": r["violation_type"], "count": r["count"]} for r in cur.fetchall()]

            cur.execute("""
                SELECT junction, COUNT(*) AS count
                FROM violations
                GROUP BY junction ORDER BY count DESC LIMIT 8
            """)
            by_junction = [{"junction": r["junction"], "count": r["count"]} for r in cur.fetchall()]

            cur.execute("""
                SELECT EXTRACT(HOUR FROM timestamp) AS hour, COUNT(*) AS count
                FROM violations
                GROUP BY EXTRACT(HOUR FROM timestamp)
                ORDER BY hour
            """)
            by_hour = [{"hour": int(r["hour"]), "count": r["count"]} for r in cur.fetchall()]

        return {
            "total":       total,
            "by_type":     by_type,
            "by_junction": by_junction,
            "by_hour":     by_hour,
        }
    finally:
        conn.close()

# ── GET /search ───────────────────────────────────────────────────
@app.get("/search")
def search_plate(plate: str = ""):
    conn = get_connection_dict()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT plate, violation_type, junction,
                       signal_state, timestamp
                FROM violations
                WHERE plate ILIKE %s
                ORDER BY timestamp DESC LIMIT 50
            """, (f"%{plate.upper()}%",))
            rows = cur.fetchall()
        return [
            {
                "plate":          r["plate"],
                "violation_type": r["violation_type"],
                "junction":       r["junction"] or "—",
                "signal_state":   r["signal_state"] or "—",
                "timestamp":      str(r["timestamp"]) if r["timestamp"] else "",
            }
            for r in rows
        ]
    finally:
        conn.close()

# ── DELETE /clear ─────────────────────────────────────────────────
@app.delete("/clear")
def clear_db():
    conn = get_connection_dict()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM violations")
            cur.execute("DELETE FROM offender_counts")
            conn.commit()
        return {"status": "cleared"}
    finally:
        conn.close()

# ── GET /health ───────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "Grand Prize Only Traffic API"}
