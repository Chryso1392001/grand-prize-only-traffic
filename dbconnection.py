# dbconnection.py — Grand Prize Only
# Connected to Supabase PostgreSQL via Session Pooler (IPv4 compatible)

import psycopg2
import psycopg2.extras
from datetime import datetime
from typing import Optional

# ── SUPABASE SESSION POOLER ───────────────────────────────────────
DB_CONFIG = {
    "host":     "aws-0-eu-west-1.pooler.supabase.com",
    "port":     5432,
    "database": "postgres",
    "user":     "postgres.nawbyozgrmncfznlcefj",
    "password": "Ndchryso@13935",
}

REPEAT_OFFENDER_THRESHOLD = 3


def get_connection():
    return psycopg2.connect(**DB_CONFIG)


def get_connection_dict():
    return psycopg2.connect(
        **DB_CONFIG,
        cursor_factory=psycopg2.extras.RealDictCursor
    )


def setup_db():
    conn = get_connection()
    cur  = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS violations (
            id             SERIAL PRIMARY KEY,
            plate          VARCHAR(20)  NOT NULL,
            violation_type VARCHAR(50)  NOT NULL,
            junction       VARCHAR(100) DEFAULT 'Unknown',
            signal_state   VARCHAR(10)  DEFAULT 'UNKNOWN',
            confidence     VARCHAR(10)  DEFAULT 'n/a',
            snapshot_path  VARCHAR(255) DEFAULT NULL,
            timestamp      TIMESTAMP    NOT NULL
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS offender_counts (
            plate      VARCHAR(20) PRIMARY KEY,
            total      INT         NOT NULL DEFAULT 0,
            last_seen  TIMESTAMP   NOT NULL
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
    now = datetime.now()
    try:
        conn = get_connection()
        cur  = conn.cursor()

        cur.execute("""
            INSERT INTO violations
                (plate, violation_type, junction, signal_state,
                 confidence, snapshot_path, timestamp)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (plate, violation_type, junction,
              signal_state, confidence, snapshot_path, now))

        cur.execute("""
            INSERT INTO offender_counts (plate, total, last_seen)
            VALUES (%s, 1, %s)
            ON CONFLICT (plate) DO UPDATE
                SET total     = offender_counts.total + 1,
                    last_seen = %s
        """, (plate, now, now))

        conn.commit()

        cur.execute(
            "SELECT total FROM offender_counts WHERE plate = %s", (plate,)
        )
        row   = cur.fetchone()
        total = row[0] if row else 1

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
