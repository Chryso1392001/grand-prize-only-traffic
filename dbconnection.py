# dbconnection.py
# WHAT CHANGED: complete rewrite
# - keeps pymysql (same as your original)
# - adds setup_db() to create tables automatically
# - adds log_violation() used by ALL scripts
# - adds helper functions for the FastAPI backend
# WHAT TO CHANGE: update password and database name below to match yours

import pymysql
from datetime import datetime
from typing import Optional

# ── CHANGE THESE TO MATCH YOUR MYSQL SETUP ──────────────────────────────────
DB_CONFIG = {
    "host": "localhost",
    "user": "traffic_user",
    "password": "StrongPass123!",
    "database": "traffic_db",   # ✅ REQUIRED
    "cursorclass": pymysql.cursors.DictCursor,
}

REPEAT_OFFENDER_THRESHOLD = 3  # flag plate after this many violations


def get_connection():
    return pymysql.connect(**DB_CONFIG)


def setup_db():
    """
    Run once on startup.
    Creates the database and both tables if they don't exist.
    """
    cfg = {**DB_CONFIG}
    db_name = cfg.pop("database")
    cfg.pop("cursorclass", None)

    conn = pymysql.connect(**cfg)
    cur  = conn.cursor()
    cur.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
    cur.execute(f"USE {db_name}")

    # Main violations table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS violations (
            id             INT AUTO_INCREMENT PRIMARY KEY,
            plate          VARCHAR(20)  NOT NULL,
            violation_type VARCHAR(50)  NOT NULL,
            junction       VARCHAR(100) DEFAULT 'Unknown',
            signal_state   VARCHAR(10)  DEFAULT 'UNKNOWN',
            confidence     VARCHAR(10)  DEFAULT 'n/a',
            snapshot_path  VARCHAR(255) DEFAULT NULL,
            timestamp      DATETIME     NOT NULL
        )
    """)

    # Offender count table — updated on every insert
    cur.execute("""
        CREATE TABLE IF NOT EXISTS offender_counts (
            plate      VARCHAR(20) PRIMARY KEY,
            total      INT         NOT NULL DEFAULT 0,
            last_seen  DATETIME    NOT NULL
        )
    """)

    conn.commit()
    cur.close()
    conn.close()
    print("✅ Database ready")


def log_violation(
    plate:          str,
    violation_type: str,
    junction:       str = "Unknown",
    signal_state:   str = "UNKNOWN",
    confidence:     str = "n/a",
    snapshot_path:  Optional[str] = None,
) -> dict:
    """
    Insert one violation record and update the offender count.
    Returns a dict with logged=True/False and repeat_offender flag.
    Called by: traffic_violation.py, helmet_detection.py,
               triple_riding.py, accident.py, atcc.py
    """
    now = datetime.now()
    try:
        conn = get_connection()
        cur  = conn.cursor()

        # Insert violation
        cur.execute(
            """
            INSERT INTO violations
                (plate, violation_type, junction, signal_state,
                 confidence, snapshot_path, timestamp)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (plate, violation_type, junction,
             signal_state, confidence, snapshot_path, now),
        )

        # Upsert offender count
        cur.execute(
            """
            INSERT INTO offender_counts (plate, total, last_seen)
            VALUES (%s, 1, %s)
            ON DUPLICATE KEY UPDATE
                total     = total + 1,
                last_seen = %s
            """,
            (plate, now, now),
        )

        conn.commit()

        # Read back the count
        cur.execute(
            "SELECT total FROM offender_counts WHERE plate = %s", (plate,)
        )
        row   = cur.fetchone()
        total = row["total"] if row else 1

        cur.close()
        conn.close()

        is_repeat = total >= REPEAT_OFFENDER_THRESHOLD
        flag = "🚨 REPEAT OFFENDER" if is_repeat else ""
        print(f"✅ Logged: {plate} | {violation_type} | {junction} {flag}")

        return {
            "logged":           True,
            "plate":            plate,
            "violation_type":   violation_type,
            "junction":         junction,
            "signal_state":     signal_state,
            "timestamp":        now.isoformat(),
            "total_violations": total,
            "repeat_offender":  is_repeat,
        }

    except Exception as e:
        print("DB Error:", e)
        return {"logged": False, "error": str(e)}


# ── helpers used by FastAPI backend ─────────────────────────────────────────

def get_recent_violations(limit: int = 50) -> list:
    try:
        conn = get_connection()
        cur  = conn.cursor()
        cur.execute(
            """
            SELECT v.*, o.total AS total_violations
            FROM   violations v
            LEFT JOIN offender_counts o ON v.plate = o.plate
            ORDER BY v.timestamp DESC
            LIMIT %s
            """,
            (limit,),
        )
        rows = cur.fetchall()
        cur.close(); conn.close()
        for r in rows:
            if isinstance(r.get("timestamp"), datetime):
                r["timestamp"] = r["timestamp"].isoformat()
        return rows
    except Exception as e:
        print("DB Error:", e); return []


def get_repeat_offenders() -> list:
    try:
        conn = get_connection()
        cur  = conn.cursor()
        cur.execute(
            """
            SELECT plate, total, last_seen
            FROM   offender_counts
            WHERE  total >= %s
            ORDER BY total DESC
            """,
            (REPEAT_OFFENDER_THRESHOLD,),
        )
        rows = cur.fetchall()
        cur.close(); conn.close()
        for r in rows:
            if isinstance(r.get("last_seen"), datetime):
                r["last_seen"] = r["last_seen"].isoformat()
        return rows
    except Exception as e:
        print("DB Error:", e); return []


def get_analytics() -> dict:
    try:
        conn = get_connection()
        cur  = conn.cursor()

        cur.execute("SELECT COUNT(*) AS total FROM violations")
        total = cur.fetchone()["total"]

        cur.execute(
            "SELECT violation_type, COUNT(*) AS count FROM violations GROUP BY violation_type"
        )
        by_type = cur.fetchall()

        cur.execute(
            """
            SELECT junction, COUNT(*) AS count
            FROM   violations
            GROUP BY junction
            ORDER BY count DESC
            LIMIT 10
            """
        )
        by_junction = cur.fetchall()

        cur.execute(
            """
            SELECT HOUR(timestamp) AS hour, COUNT(*) AS count
            FROM   violations
            WHERE  timestamp >= NOW() - INTERVAL 24 HOUR
            GROUP BY HOUR(timestamp)
            ORDER BY hour
            """
        )
        by_hour = cur.fetchall()

        cur.close(); conn.close()
        return {
            "total":       total,
            "by_type":     by_type,
            "by_junction": by_junction,
            "by_hour":     by_hour,
        }
    except Exception as e:
        print("DB Error:", e); return {}


def search_plate(plate: str) -> list:
    try:
        conn = get_connection()
        cur  = conn.cursor()
        cur.execute(
            "SELECT * FROM violations WHERE plate = %s ORDER BY timestamp DESC",
            (plate.upper(),),
        )
        rows = cur.fetchall()
        cur.close(); conn.close()
        for r in rows:
            if isinstance(r.get("timestamp"), datetime):
                r["timestamp"] = r["timestamp"].isoformat()
        return rows
    except Exception as e:
        print("DB Error:", e); return []


if __name__ == "__main__":
    setup_db()
