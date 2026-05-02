import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  ChakraProvider,
  defaultSystem,
} from "@chakra-ui/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const API = "http://localhost:8000";

// ── Color tokens ──────────────────────────────────────────────────
const C = {
  bg:       "#080E1A",
  panel:    "#0D1A2E",
  card:     "#122438",
  border:   "#1A3050",
  blue:     "#008FFF",
  cyan:     "#00D4FF",
  amber:    "#FFB300",
  red:      "#FF2D2D",
  green:    "#00E576",
  white:    "#FFFFFF",
  offwhite: "#D8E8F5",
  gray:     "#5A7A9A",
  lgray:    "#A0BCD4",
};

// ── Kigali junctions with approximate GPS positions (for the map) ─
const JUNCTIONS = [
  { id: "KN1", name: "Kacyiru Roundabout",  x: 62, y: 28, district: "Gasabo" },
  { id: "KN2", name: "Kimironko Junction",  x: 78, y: 22, district: "Gasabo" },
  { id: "KN3", name: "Nyabugogo Terminal",  x: 35, y: 55, district: "Nyarugenge" },
  { id: "KN4", name: "Remera Junction",     x: 70, y: 42, district: "Gasabo" },
  { id: "KN5", name: "Gisozi Crossroads",   x: 50, y: 18, district: "Gasabo" },
  { id: "KN6", name: "Kicukiro Centre",     x: 55, y: 72, district: "Kicukiro" },
  { id: "KN7", name: "Gikondo Roundabout",  x: 42, y: 68, district: "Kicukiro" },
  { id: "KN8", name: "Muhima Junction",     x: 32, y: 45, district: "Nyarugenge" },
];

// ── Shared base styles ────────────────────────────────────────────
const base = {
  fontFamily: "'Courier New', Consolas, monospace",
  background: C.bg,
  color: C.offwhite,
  minHeight: "100vh",
  padding: "0",
  margin: "0",
};

// ── Tiny reusable helpers ─────────────────────────────────────────
const card = (extra = {}) => ({
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: 16,
  ...extra,
});

const badge = (color) => ({
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 700,
  color: C.white,
  background: color,
  letterSpacing: 1,
});

function violationColor(type = "") {
  const t = type.toUpperCase();
  if (t.includes("ACCIDENT"))   return C.red;
  if (t.includes("HELMET"))     return C.amber;
  if (t.includes("TRIPLE"))     return C.red;
  if (t.includes("RED_LIGHT") || t.includes("RED LIGHT")) return C.blue;
  return C.gray;
}

function signalColor(state) {
  if (!state) return C.gray;
  const s = state.toUpperCase();
  if (s === "RED")    return C.red;
  if (s === "YELLOW" || s === "AMBER") return C.amber;
  if (s === "GREEN")  return C.green;
  return C.gray;
}

// ─────────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────────

/** Pulsing dot */
function Pulse({ color, size = 10 }) {
  return (
    <span style={{ position: "relative", display: "inline-block", width: size, height: size, marginRight: 6 }}>
      <span style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: color, opacity: 0.4,
        animation: "pulse 1.5s ease-out infinite",
      }} />
      <span style={{
        position: "absolute", inset: 2, borderRadius: "50%", background: color,
      }} />
    </span>
  );
}

/** Top navbar */
function Navbar({ apiOk, onClear, clearing }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      background: C.panel, borderBottom: `1px solid ${C.border}`,
      padding: "0 24px", height: 56,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      position: "sticky", top: 0, zIndex: 100,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 22 }}>🚦</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.white, letterSpacing: 2 }}>
          GRAND PRIZE ONLY
        </span>
        <span style={{
          fontSize: 10, color: C.gray, letterSpacing: 1,
          borderLeft: `1px solid ${C.border}`, paddingLeft: 12,
        }}>
          ANPR + ATCC · KIGALI TRAFFIC ENFORCEMENT
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 12, color: C.lgray }}>
          {now.toLocaleTimeString("en-RW", { hour12: false })}
        </span>

        {/* API status */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: apiOk ? "#00E57620" : "#FF2D2D20",
          border: `1px solid ${apiOk ? C.green : C.red}`,
          borderRadius: 20, padding: "4px 12px", fontSize: 11,
        }}>
          <Pulse color={apiOk ? C.green : C.red} />
          <span style={{ color: apiOk ? C.green : C.red, fontWeight: 700 }}>
            {apiOk ? "API CONNECTED" : "API OFFLINE"}
          </span>
        </div>

        {/* Clear DB button */}
        <button
          onClick={onClear}
          disabled={clearing}
          style={{
            background: clearing ? C.gray : "#FF2D2D20",
            border: `1px solid ${C.red}`,
            borderRadius: 6, padding: "5px 14px",
            color: clearing ? C.lgray : C.red,
            fontSize: 11, fontWeight: 700, cursor: clearing ? "not-allowed" : "pointer",
            letterSpacing: 1, transition: "all 0.2s",
          }}
          onMouseOver={e => { if (!clearing) e.target.style.background = "#FF2D2D40"; }}
          onMouseOut={e => { if (!clearing) e.target.style.background = "#FF2D2D20"; }}
        >
          {clearing ? "CLEARING…" : "🗑 CLEAR DB"}
        </button>
      </div>
    </div>
  );
}

/** Stat card */
function StatCard({ icon, label, value, color, sub }) {
  return (
    <div style={{ ...card(), display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 11, color: C.gray, letterSpacing: 1 }}>{icon} {label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: color || C.white }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.lgray }}>{sub}</div>}
    </div>
  );
}

/** Live signal state panel */
function SignalPanel({ violations }) {
  // Derive per-junction signal state from most recent ATCC signal data
  // We simulate signal state from recent violations timing
  const junctionData = {};
  JUNCTIONS.forEach(j => {
    // find violations at this junction
    const jv = violations.filter(v =>
      v.junction && v.junction.toLowerCase().includes(j.name.toLowerCase().split(" ")[0].toLowerCase())
    );
    const count = jv.length;
    // simulate signal state: lots of violations → RED, few → GREEN
    let signal = "GREEN";
    if (count > 10) signal = "RED";
    else if (count > 4) signal = "YELLOW";

    junctionData[j.id] = { signal, count, lastSeen: jv[0]?.timestamp || null };
  });

  return (
    <div style={{ ...card(), height: "100%" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.cyan, letterSpacing: 2, marginBottom: 12 }}>
        🚦 LIVE SIGNAL STATES
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {JUNCTIONS.map(j => {
          const data = junctionData[j.id] || { signal: "GREEN", count: 0 };
          const sc = signalColor(data.signal);
          return (
            <div key={j.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: C.panel, borderRadius: 6, padding: "8px 12px",
              borderLeft: `3px solid ${sc}`,
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.white }}>{j.name}</div>
                <div style={{ fontSize: 10, color: C.gray }}>{j.district}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 10, color: C.lgray }}>{data.count} violations</span>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: sc + "30", border: `2px solid ${sc}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Pulse color={sc} size={8} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: sc, letterSpacing: 1 }}>
                  {data.signal}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Kigali junction map */
function KigaliMap({ violations }) {
  const [hovered, setHovered] = useState(null);

  // Count violations per junction
  const countByJunction = {};
  JUNCTIONS.forEach(j => {
    countByJunction[j.id] = violations.filter(v =>
      v.junction && v.junction.toLowerCase().includes(j.name.toLowerCase().split(" ")[0].toLowerCase())
    ).length;
  });

  const maxCount = Math.max(...Object.values(countByJunction), 1);

  return (
    <div style={{ ...card(), position: "relative" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.cyan, letterSpacing: 2, marginBottom: 12 }}>
        🗺 KIGALI JUNCTION ACTIVITY MAP
      </div>

      {/* Map canvas */}
      <div style={{
        position: "relative", background: "#0A1520",
        borderRadius: 8, border: `1px solid ${C.border}`,
        height: 280, overflow: "hidden",
      }}>
        {/* Grid lines */}
        {[20, 40, 60, 80].map(p => (
          <div key={p} style={{
            position: "absolute", left: `${p}%`, top: 0, bottom: 0,
            borderLeft: `1px solid ${C.border}30`, pointerEvents: "none",
          }} />
        ))}
        {[25, 50, 75].map(p => (
          <div key={p} style={{
            position: "absolute", top: `${p}%`, left: 0, right: 0,
            borderTop: `1px solid ${C.border}30`, pointerEvents: "none",
          }} />
        ))}

        {/* Road lines (decorative) */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.15 }}>
          <line x1="35%" y1="0" x2="70%" y2="100%" stroke={C.blue} strokeWidth="1" strokeDasharray="4 4" />
          <line x1="0" y1="55%" x2="100%" y2="42%" stroke={C.cyan} strokeWidth="1" strokeDasharray="4 4" />
          <line x1="50%" y1="0" x2="55%" y2="100%" stroke={C.blue} strokeWidth="1" strokeDasharray="4 4" />
          <line x1="0" y1="25%" x2="100%" y2="30%" stroke={C.cyan} strokeWidth="1" strokeDasharray="4 4" />
        </svg>

        {/* "KIGALI" label */}
        <span style={{
          position: "absolute", bottom: 8, right: 12,
          fontSize: 10, color: C.border, letterSpacing: 3, fontWeight: 700,
        }}>KIGALI, RWANDA</span>

        {/* Junction nodes */}
        {JUNCTIONS.map(j => {
          const count = countByJunction[j.id] || 0;
          const intensity = count / maxCount;
          const nodeColor = count === 0 ? C.green : count < 5 ? C.amber : C.red;
          const size = 10 + intensity * 14;
          const isHov = hovered === j.id;

          return (
            <div
              key={j.id}
              onMouseEnter={() => setHovered(j.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                position: "absolute",
                left: `${j.x}%`,
                top: `${j.y}%`,
                transform: "translate(-50%, -50%)",
                cursor: "pointer",
                zIndex: isHov ? 10 : 1,
              }}
            >
              {/* Pulse ring */}
              <div style={{
                position: "absolute",
                width: size + 8, height: size + 8,
                borderRadius: "50%",
                background: nodeColor + "30",
                top: -(size + 8) / 2 + size / 2,
                left: -(size + 8) / 2 + size / 2,
                animation: count > 0 ? "pulse 2s ease-out infinite" : "none",
              }} />
              {/* Node circle */}
              <div style={{
                width: size, height: size, borderRadius: "50%",
                background: nodeColor,
                border: `2px solid ${isHov ? C.white : nodeColor}`,
                boxShadow: `0 0 ${isHov ? 16 : 6}px ${nodeColor}`,
                transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {count > 0 && (
                  <span style={{ fontSize: 8, fontWeight: 700, color: C.white }}>{count}</span>
                )}
              </div>

              {/* Tooltip */}
              {isHov && (
                <div style={{
                  position: "absolute", bottom: size + 8, left: "50%",
                  transform: "translateX(-50%)",
                  background: C.card, border: `1px solid ${nodeColor}`,
                  borderRadius: 6, padding: "6px 10px",
                  fontSize: 11, whiteSpace: "nowrap", zIndex: 20,
                  boxShadow: `0 4px 16px ${nodeColor}40`,
                }}>
                  <div style={{ fontWeight: 700, color: C.white }}>{j.name}</div>
                  <div style={{ color: C.lgray }}>{j.district} · {count} violations</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 10, justifyContent: "center" }}>
        {[["No violations", C.green], ["1–4 violations", C.amber], ["5+ violations", C.red]].map(([label, color]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: C.lgray }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Repeat offender banner */
function RepeatOffenderBanner({ offenders }) {
  if (!offenders || offenders.length === 0) return null;
  return (
    <div style={{
      background: "#FF2D2D15",
      border: `1px solid ${C.red}`,
      borderRadius: 8,
      padding: "12px 18px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      animation: "alertPulse 2s ease-in-out infinite",
    }}>
      <Pulse color={C.red} size={12} />
      <span style={{ fontWeight: 700, color: C.red, fontSize: 12, letterSpacing: 1 }}>
        ⚠ REPEAT OFFENDERS DETECTED:
      </span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {offenders.slice(0, 5).map((o, i) => (
          <span key={i} style={{
            ...badge(C.red),
            animation: "alertPulse 1.5s ease-in-out infinite",
          }}>
            {o.plate || o} — {o.count || "3"}+ violations
          </span>
        ))}
      </div>
    </div>
  );
}

/** Violation table */
function ViolationTable({ violations }) {
  return (
    <div style={{ ...card(), overflowX: "auto" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.cyan, letterSpacing: 2, marginBottom: 12 }}>
        📋 LIVE VIOLATION FEED
        <span style={{ marginLeft: 10, fontSize: 10, color: C.gray, fontWeight: 400 }}>
          auto-refresh 3s
        </span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            {["#", "PLATE", "TYPE", "JUNCTION", "SIGNAL", "TIME"].map(h => (
              <th key={h} style={{
                textAlign: "left", padding: "6px 10px",
                color: C.gray, fontSize: 10, letterSpacing: 1,
                borderBottom: `1px solid ${C.border}`,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {violations.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: 24, textAlign: "center", color: C.gray }}>
                No violations logged yet. Run python run_all.py to start detection.
              </td>
            </tr>
          ) : violations.slice(0, 60).map((v, i) => {
            const col = violationColor(v.violation_type);
            return (
              <tr key={i} style={{
                borderBottom: `1px solid ${C.border}20`,
                background: i % 2 === 0 ? "transparent" : C.panel + "50",
              }}>
                <td style={{ padding: "6px 10px", color: C.gray }}>{violations.length - i}</td>
                <td style={{ padding: "6px 10px", fontWeight: 700, color: C.white }}>
                  {v.plate || "—"}
                </td>
                <td style={{ padding: "6px 10px" }}>
                  <span style={badge(col)}>{v.violation_type || "UNKNOWN"}</span>
                </td>
                <td style={{ padding: "6px 10px", color: C.lgray }}>{v.junction || "—"}</td>
                <td style={{ padding: "6px 10px" }}>
                  <span style={{ color: signalColor(v.signal_state), fontWeight: 700, fontSize: 11 }}>
                    {v.signal_state || "—"}
                  </span>
                </td>
                <td style={{ padding: "6px 10px", color: C.gray, fontSize: 11 }}>
                  {v.timestamp ? new Date(v.timestamp).toLocaleTimeString("en-RW") : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Plate search */
function PlateSearch({ violations }) {
  const [query, setQuery] = useState("");
  const results = query.trim().length > 1
    ? violations.filter(v => (v.plate || "").toUpperCase().includes(query.toUpperCase()))
    : [];

  return (
    <div style={card()}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.cyan, letterSpacing: 2, marginBottom: 12 }}>
        🔍 PLATE SEARCH
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Type plate number… e.g. RAB 123A"
          style={{
            flex: 1, background: C.panel, border: `1px solid ${C.border}`,
            borderRadius: 6, padding: "8px 12px", color: C.white,
            fontFamily: "inherit", fontSize: 13,
            outline: "none",
          }}
          onFocus={e => e.target.style.borderColor = C.blue}
          onBlur={e => e.target.style.borderColor = C.border}
        />
        {query && (
          <button onClick={() => setQuery("")} style={{
            background: C.panel, border: `1px solid ${C.border}`,
            borderRadius: 6, padding: "8px 12px", color: C.gray,
            cursor: "pointer", fontFamily: "inherit",
          }}>✕</button>
        )}
      </div>
      {query.trim().length > 1 && (
        results.length === 0
          ? <div style={{ color: C.gray, fontSize: 12, padding: 8 }}>No violations found for "{query}"</div>
          : <div style={{ fontSize: 12, color: C.lgray, marginBottom: 6 }}>
              {results.length} result{results.length !== 1 ? "s" : ""} for <strong style={{ color: C.white }}>"{query}"</strong>
            </div>
      )}
      {results.slice(0, 8).map((v, i) => (
        <div key={i} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "6px 10px", background: C.panel, borderRadius: 6,
          marginBottom: 4, borderLeft: `3px solid ${violationColor(v.violation_type)}`,
        }}>
          <div>
            <span style={{ fontWeight: 700, color: C.white, marginRight: 10 }}>{v.plate}</span>
            <span style={badge(violationColor(v.violation_type))}>{v.violation_type}</span>
          </div>
          <div style={{ fontSize: 10, color: C.gray }}>
            {v.junction} · {v.timestamp ? new Date(v.timestamp).toLocaleTimeString("en-RW") : ""}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Analytics charts */
function Analytics({ violations }) {
  // By type
  const typeMap = {};
  violations.forEach(v => {
    const t = v.violation_type || "UNKNOWN";
    typeMap[t] = (typeMap[t] || 0) + 1;
  });
  const typeData = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

  // By hour
  const hourMap = {};
  violations.forEach(v => {
    if (v.timestamp) {
      const h = new Date(v.timestamp).getHours();
      hourMap[h] = (hourMap[h] || 0) + 1;
    }
  });
  const hourData = Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, "0")}:00`,
    count: hourMap[h] || 0,
  }));

  // By junction
  const jctMap = {};
  violations.forEach(v => {
    const j = v.junction || "Unknown";
    jctMap[j] = (jctMap[j] || 0) + 1;
  });
  const jctData = Object.entries(jctMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name: name.split(" ")[0], value }));

  const PIE_COLORS = [C.red, C.amber, C.blue, C.cyan, C.green, C.gray];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {/* Violations by type - pie */}
      <div style={card()}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.cyan, letterSpacing: 2, marginBottom: 12 }}>
          VIOLATIONS BY TYPE
        </div>
        {typeData.length === 0
          ? <div style={{ color: C.gray, fontSize: 12, padding: 16, textAlign: "center" }}>No data yet</div>
          : <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65}>
                  {typeData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.white, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10, color: C.lgray }} />
              </PieChart>
            </ResponsiveContainer>
        }
      </div>

      {/* By junction */}
      <div style={card()}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.cyan, letterSpacing: 2, marginBottom: 12 }}>
          VIOLATIONS BY JUNCTION
        </div>
        {jctData.length === 0
          ? <div style={{ color: C.gray, fontSize: 12, padding: 16, textAlign: "center" }}>No data yet</div>
          : <ResponsiveContainer width="100%" height={180}>
              <BarChart data={jctData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: C.lgray, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: C.lgray, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.white, fontSize: 11 }} />
                <Bar dataKey="value" fill={C.blue} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
        }
      </div>

      {/* By hour */}
      <div style={{ ...card(), gridColumn: "1 / -1" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.cyan, letterSpacing: 2, marginBottom: 12 }}>
          VIOLATIONS BY HOUR OF DAY
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={hourData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="hour" tick={{ fill: C.gray, fontSize: 9 }} axisLine={false} tickLine={false}
              interval={3} />
            <YAxis tick={{ fill: C.lgray, fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.white, fontSize: 11 }} />
            <Bar dataKey="count" fill={C.cyan} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────
function Dashboard() {
  const [violations, setViolations]   = useState([]);
  const [offenders,  setOffenders]    = useState([]);
  const [stats,      setStats]        = useState({});
  const [apiOk,      setApiOk]        = useState(false);
  const [clearing,   setClearing]     = useState(false);
  const [tab,        setTab]          = useState("live"); // live | map | analytics | search

  const fetchData = useCallback(async () => {
    try {
      const [vRes, oRes, sRes] = await Promise.all([
        axios.get(`${API}/violations`),
        axios.get(`${API}/repeat-offenders`),
        axios.get(`${API}/stats`),
      ]);
      setViolations(vRes.data || []);
      setOffenders(oRes.data || []);
      setStats(sRes.data || {});
      setApiOk(true);
    } catch {
      setApiOk(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 3000);
    return () => clearInterval(t);
  }, [fetchData]);

  const handleClear = async () => {
    if (!window.confirm("Clear ALL violations from the database? This cannot be undone.")) return;
    setClearing(true);
    try {
      await axios.delete(`${API}/clear`);
      await fetchData();
    } catch {
      alert("Failed to clear DB — check if API is running.");
    }
    setClearing(false);
  };

  const total     = stats.total     || violations.length;
  const critical  = stats.critical  || offenders.length;
  const helmets   = violations.filter(v => (v.violation_type || "").toUpperCase().includes("HELMET")).length;
  const accidents = violations.filter(v => (v.violation_type || "").toUpperCase().includes("ACCIDENT")).length;

  const tabs = [
    { id: "live",      label: "📋 Live Feed" },
    { id: "map",       label: "🗺 Junction Map" },
    { id: "analytics", label: "📊 Analytics" },
    { id: "search",    label: "🔍 Plate Search" },
  ];

  return (
    <div style={base}>
      <style>{`
        @keyframes pulse {
          0%   { transform: scale(1); opacity: 0.6; }
          70%  { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes alertPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.7; }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #080E1A; }
        ::-webkit-scrollbar-thumb { background: #1A3050; border-radius: 3px; }
      `}</style>

      <Navbar apiOk={apiOk} onClear={handleClear} clearing={clearing} />

      <div style={{ padding: "20px 24px", maxWidth: 1400, margin: "0 auto" }}>

        {/* Repeat offender banner */}
        {offenders.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <RepeatOffenderBanner offenders={offenders} />
          </div>
        )}

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          <StatCard icon="📋" label="TOTAL VIOLATIONS"  value={total}    color={C.white}  sub="all modules" />
          <StatCard icon="🔴" label="REPEAT OFFENDERS"  value={critical} color={C.red}    sub={`flagged plates`} />
          <StatCard icon="⛑" label="HELMET VIOLATIONS" value={helmets}  color={C.amber}  sub="no helmet detected" />
          <StatCard icon="💥" label="ACCIDENTS"         value={accidents} color={C.blue}  sub="collision events" />
        </div>

        {/* Tab bar */}
        <div style={{
          display: "flex", gap: 4, marginBottom: 16,
          background: C.panel, borderRadius: 8, padding: 4,
          border: `1px solid ${C.border}`, width: "fit-content",
        }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "6px 16px", borderRadius: 6, border: "none",
                background: tab === t.id ? C.blue : "transparent",
                color: tab === t.id ? C.white : C.lgray,
                fontSize: 12, fontWeight: tab === t.id ? 700 : 400,
                cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.5,
                transition: "all 0.15s",
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "live" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
            <ViolationTable violations={violations} />
            <SignalPanel violations={violations} />
          </div>
        )}

        {tab === "map" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
            <KigaliMap violations={violations} />
            <SignalPanel violations={violations} />
          </div>
        )}

        {tab === "analytics" && <Analytics violations={violations} />}
        {tab === "search" && <PlateSearch violations={violations} />}

        {/* Footer */}
        <div style={{
          marginTop: 24, paddingTop: 16, borderTop: `1px solid ${C.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 10, color: C.gray,
        }}>
          <span>GRAND PRIZE ONLY · ANPR + ATCC Smart Traffic Management · Kigali, Rwanda · 2026</span>
          <span>AI Solutions for Everyday Life · Hackathon May 2, 2026</span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ChakraProvider value={defaultSystem}>
      <Dashboard />
    </ChakraProvider>
  );
}
