// src/App.jsx  —  Chakra UI v3 compatible
// WHAT CHANGED: Chakra UI v3 removed AlertIcon, extendTheme, keyframes imports
// and changed how theming works. This version uses only v3-safe components.

import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  ChakraProvider, Box, Flex, Text, Badge, Table,
  Input, Button, Spinner, defaultSystem,
} from "@chakra-ui/react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const API = "http://localhost:8000";

const PIE_COLORS = ["#FC4F4F", "#F6AD55", "#F6E05E", "#68D391", "#63B3ED", "#B794F4"];

const V_COLOR = {
  RED_LIGHT:            "#FC4F4F",
  NO_HELMET:            "#F6AD55",
  TRIPLE_RIDING:        "#F6E05E",
  ACCIDENT:             "#B794F4",
  RED_SIGNAL_TRIGGERED: "#63B3ED",
};

function fmt(ts)     { return ts ? new Date(ts).toLocaleTimeString() : "—"; }
function fmtFull(ts) { return ts ? new Date(ts).toLocaleString()     : "—"; }

// ── NAV TABS ─────────────────────────────────────────────────────────────
function NavTabs({ active, setActive, violations, offenders }) {
  const tabs = [
    { id: "live",      label: "Live feed",        count: violations.length },
    { id: "offenders", label: "Repeat offenders", count: offenders.length },
    { id: "search",    label: "Plate search",     count: null },
    { id: "analytics", label: "Analytics",        count: null },
  ];
  return (
    <Flex gap="8px" mb="24px" flexWrap="wrap">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => setActive(t.id)}
          style={{
            padding: "8px 16px",
            borderRadius: "20px",
            border: "none",
            cursor: "pointer",
            fontFamily: "Inter, sans-serif",
            fontSize: "14px",
            fontWeight: 500,
            background: active === t.id ? "#3182CE" : "#2D3748",
            color: active === t.id ? "white" : "#A0AEC0",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.15s",
          }}
        >
          {t.label}
          {t.count > 0 && (
            <span style={{
              background: "#FC4F4F", color: "white",
              borderRadius: "10px", padding: "1px 7px",
              fontSize: "11px", fontWeight: 700,
            }}>{t.count}</span>
          )}
        </button>
      ))}
    </Flex>
  );
}

// ── STAT CARDS ────────────────────────────────────────────────────────────
function StatCards({ violations, offenders }) {
  const types     = [...new Set(violations.map(v => v.violation_type))];
  const junctions = [...new Set(violations.map(v => v.junction))];
  const stats = [
    { label: "Total violations",  value: violations.length, color: "#FC4F4F" },
    { label: "Repeat offenders",  value: offenders.length,  color: "#F6AD55" },
    { label: "Violation types",   value: types.length,      color: "#F6E05E" },
    { label: "Junctions active",  value: junctions.length,  color: "#63B3ED" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
      {stats.map(s => (
        <div key={s.label} style={{
          background: "#2D3748", borderRadius: "12px",
          padding: "16px", borderLeft: `3px solid ${s.color}`,
        }}>
          <div style={{ fontSize: "12px", color: "#A0AEC0", marginBottom: "4px" }}>{s.label}</div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: s.color }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── VIOLATION BADGE ───────────────────────────────────────────────────────
function VBadge({ type }) {
  const color = V_COLOR[type] || "#A0AEC0";
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}55`,
      borderRadius: "6px", padding: "2px 8px", fontSize: "11px", fontWeight: 600,
      whiteSpace: "nowrap",
    }}>
      {(type || "").replace(/_/g, " ")}
    </span>
  );
}

// ── SIGNAL BADGE ──────────────────────────────────────────────────────────
function SBadge({ state }) {
  const s = (state || "").toUpperCase();
  const color = s === "RED" ? "#FC4F4F" : s === "GREEN" ? "#68D391" : s === "YELLOW" ? "#F6E05E" : "#A0AEC0";
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}55`,
      borderRadius: "4px", padding: "1px 6px", fontSize: "11px",
    }}>{s || "N/A"}</span>
  );
}

// ── LIVE FEED ─────────────────────────────────────────────────────────────
function LiveFeed({ violations, loading, offenders }) {
  const offenderPlates = new Set(offenders.map(o => o.plate));
  return (
    <div>
      <StatCards violations={violations} offenders={offenders} />

      {/* Repeat offender alerts */}
      {offenders.map(o => (
        <div key={o.plate} style={{
          background: "#FC4F4F22", border: "1px solid #FC4F4F88",
          borderRadius: "12px", padding: "12px 16px",
          marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px",
        }}>
          <span style={{ fontSize: "20px" }}>🚨</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "16px", color: "#FC8080" }}>
              {o.plate}
            </span>
            <span style={{ color: "#A0AEC0", fontSize: "13px", marginLeft: "12px" }}>
              {o.total} violations · last seen {fmtFull(o.last_seen)}
            </span>
          </div>
          <span style={{
            background: "#FC4F4F", color: "white", borderRadius: "20px",
            padding: "4px 12px", fontWeight: 700, fontSize: "13px",
          }}>REPEAT OFFENDER</span>
        </div>
      ))}

      {/* Table */}
      <div style={{
        background: "#2D3748", borderRadius: "12px",
        border: "1px solid #4A5568", overflow: "hidden",
      }}>
        <div style={{
          padding: "12px 20px", borderBottom: "1px solid #4A5568",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontWeight: 600, fontSize: "14px" }}>Live violation feed</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {loading && <Spinner size="xs" />}
            <span style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: "#68D391", display: "inline-block",
            }} />
            <span style={{ fontSize: "12px", color: "#A0AEC0" }}>Auto-refresh 3s</span>
          </div>
        </div>
        <div style={{ overflowX: "auto", maxHeight: "460px", overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#2D3748", position: "sticky", top: 0 }}>
                {["Plate", "Violation", "Junction", "Signal", "Count", "Time"].map(h => (
                  <th key={h} style={{
                    padding: "10px 16px", textAlign: "left",
                    color: "#718096", fontSize: "11px", fontWeight: 600,
                    borderBottom: "1px solid #4A5568", whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {violations.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#718096" }}>
                  No violations yet — run python run_all.py
                </td></tr>
              ) : violations.map((r, i) => (
                <tr key={r.id || i} style={{
                  background: offenderPlates.has(r.plate) ? "rgba(252,79,79,0.07)" : "transparent",
                  borderBottom: "1px solid #4A5568",
                  transition: "background 0.1s",
                }}>
                  <td style={{ padding: "10px 16px", fontFamily: "monospace", fontWeight: 700, color: "#E2E8F0" }}>
                    {r.plate}
                  </td>
                  <td style={{ padding: "10px 16px" }}><VBadge type={r.violation_type} /></td>
                  <td style={{ padding: "10px 16px", color: "#CBD5E0", fontSize: "12px" }}>{r.junction}</td>
                  <td style={{ padding: "10px 16px" }}><SBadge state={r.signal_state} /></td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{
                      background: (r.total_violations || 1) >= 3 ? "#FC4F4F" : "#4A5568",
                      color: "white", borderRadius: "12px", padding: "2px 8px",
                      fontSize: "11px", fontWeight: 700,
                    }}>
                      {r.total_violations || 1}{(r.total_violations || 1) >= 3 ? " 🚨" : ""}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px", color: "#718096", fontSize: "12px" }}>{fmt(r.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── PLATE SEARCH ──────────────────────────────────────────────────────────
function PlateSearch() {
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading,  setLoading]  = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/search?plate=${query.trim().toUpperCase()}`);
      setResults(data);
      setSearched(true);
    } catch {}
    setLoading(false);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", maxWidth: "480px" }}>
        <input
          placeholder="Enter plate e.g. RAB 123A"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search()}
          style={{
            flex: 1, padding: "10px 14px", background: "#2D3748",
            border: "1px solid #4A5568", borderRadius: "8px",
            color: "white", fontFamily: "monospace", fontSize: "14px",
            outline: "none",
          }}
        />
        <button onClick={search} disabled={loading} style={{
          padding: "10px 20px", background: "#3182CE", color: "white",
          border: "none", borderRadius: "8px", cursor: "pointer",
          fontWeight: 600, fontSize: "14px",
        }}>
          {loading ? "..." : "Search"}
        </button>
      </div>

      {searched && results.length === 0 && (
        <div style={{
          background: "#2D3748", borderRadius: "12px", padding: "16px 20px",
          color: "#A0AEC0", border: "1px solid #4A5568",
        }}>
          No violations found for <span style={{ fontFamily: "monospace", color: "white" }}>{query.toUpperCase()}</span>
        </div>
      )}

      {results.length > 0 && (
        <div style={{ background: "#2D3748", borderRadius: "12px", border: "1px solid #4A5568", overflow: "hidden" }}>
          <div style={{
            padding: "12px 20px", borderBottom: "1px solid #4A5568",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "18px" }}>{query.toUpperCase()}</span>
            <span style={{
              background: "#FC4F4F", color: "white", borderRadius: "12px",
              padding: "3px 12px", fontSize: "13px", fontWeight: 700,
            }}>{results.length} violations</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#1A202C" }}>
                {["Violation", "Junction", "Signal", "Time"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#718096", fontSize: "11px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #4A5568" }}>
                  <td style={{ padding: "10px 16px" }}><VBadge type={r.violation_type} /></td>
                  <td style={{ padding: "10px 16px", color: "#CBD5E0", fontSize: "12px" }}>{r.junction}</td>
                  <td style={{ padding: "10px 16px" }}><SBadge state={r.signal_state} /></td>
                  <td style={{ padding: "10px 16px", color: "#718096", fontSize: "12px" }}>{fmtFull(r.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── ANALYTICS ─────────────────────────────────────────────────────────────
function Analytics() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = () =>
      axios.get(`${API}/analytics`)
        .then(({ data }) => { setData(data); setLoading(false); })
        .catch(() => setLoading(false));
    fetch();
    const id = setInterval(fetch, 10000);
    return () => clearInterval(id);
  }, []);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
      <Spinner size="xl" />
    </div>
  );
  if (!data) return <div style={{ color: "#A0AEC0" }}>Could not load analytics.</div>;

  const hourData = Array.from({ length: 24 }, (_, h) => ({
    hour:  `${String(h).padStart(2, "0")}h`,
    count: data.by_hour?.find(x => x.hour === h)?.count || 0,
  }));

  const cardStyle = { background: "#2D3748", borderRadius: "12px", padding: "20px", marginBottom: "16px" };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "Total violations",  value: data.total,               color: "#FC4F4F" },
          { label: "Violation types",   value: data.by_type?.length,     color: "#F6AD55" },
          { label: "Junctions tracked", value: data.by_junction?.length, color: "#63B3ED" },
        ].map(s => (
          <div key={s.label} style={{ background: "#2D3748", borderRadius: "12px", padding: "16px", borderLeft: `3px solid ${s.color}` }}>
            <div style={{ fontSize: "12px", color: "#A0AEC0", marginBottom: "4px" }}>{s.label}</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: s.color }}>{s.value ?? 0}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div style={cardStyle}>
          <div style={{ fontWeight: 600, marginBottom: "16px", fontSize: "13px", color: "#E2E8F0" }}>Violations by type</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.by_type || []} dataKey="count" nameKey="violation_type"
                   cx="50%" cy="50%" outerRadius={80}
                   label={({ violation_type, percent }) =>
                     `${(violation_type||"").replace(/_/g," ")} ${(percent*100).toFixed(0)}%`}
                   labelLine={false}>
                {(data.by_type || []).map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#1A202C", border: "none", borderRadius: "8px", color: "white" }}
                       formatter={(v, n) => [v, (n||"").replace(/_/g," ")]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={cardStyle}>
          <div style={{ fontWeight: 600, marginBottom: "16px", fontSize: "13px", color: "#E2E8F0" }}>Hotspot junctions</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.by_junction || []} layout="vertical" margin={{ left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
              <XAxis type="number" tick={{ fill: "#718096", fontSize: 11 }} />
              <YAxis type="category" dataKey="junction" width={160} tick={{ fill: "#CBD5E0", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#1A202C", border: "none", borderRadius: "8px" }} />
              <Bar dataKey="count" fill="#4299E1" radius={3} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
          <div style={{ fontWeight: 600, marginBottom: "16px", fontSize: "13px", color: "#E2E8F0" }}>Violations by hour (last 24h)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
              <XAxis dataKey="hour" tick={{ fill: "#718096", fontSize: 10 }} />
              <YAxis tick={{ fill: "#718096", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#1A202C", border: "none", borderRadius: "8px" }} />
              <Bar dataKey="count" fill="#FC4F4F" radius={3} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,        setTab]        = useState("live");
  const [violations, setViolations] = useState([]);
  const [offenders,  setOffenders]  = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [apiOk,      setApiOk]      = useState(true);
  const prevCount = useRef(0);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, oRes] = await Promise.all([
        axios.get(`${API}/violations?limit=100`),
        axios.get(`${API}/repeat-offenders`),
      ]);
      setViolations(vRes.data);
      setOffenders(oRes.data);
      setApiOk(true);
      if (vRes.data.length > prevCount.current && prevCount.current > 0) {
        document.title = "🚨 New violation!";
        setTimeout(() => { document.title = "Grand Prize Only"; }, 3000);
      }
      prevCount.current = vRes.data.length;
    } catch {
      setApiOk(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 3000);
    return () => clearInterval(id);
  }, [fetchAll]);

  return (
    <ChakraProvider value={defaultSystem}>
      <div style={{
        minHeight: "100vh", background: "#1A202C",
        color: "white", fontFamily: "Inter, sans-serif",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 32px", background: "#2D3748",
          borderBottom: "1px solid #4A5568",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "20px", fontWeight: 700 }}>Grand Prize Only</span>
              <span style={{
                background: "#3182CE22", color: "#63B3ED",
                border: "1px solid #3182CE55", borderRadius: "6px",
                padding: "2px 8px", fontSize: "11px", fontWeight: 600,
              }}>ANPR + ATCC</span>
            </div>
            <div style={{ fontSize: "12px", color: "#718096", marginTop: "2px" }}>
              Smart Traffic Enforcement · Kigali, Rwanda
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: apiOk ? "#68D391" : "#FC4F4F",
              display: "inline-block",
            }} />
            <span style={{ fontSize: "12px", color: apiOk ? "#68D391" : "#FC4F4F" }}>
              {apiOk ? "API connected" : "API offline — start uvicorn"}
            </span>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "24px 32px" }}>
          <NavTabs active={tab} setActive={setTab} violations={violations} offenders={offenders} />

          {tab === "live" && (
            <LiveFeed violations={violations} loading={loading} offenders={offenders} />
          )}
          {tab === "offenders" && (
            <div>
              {offenders.length === 0 ? (
                <div style={{
                  background: "#2D3748", borderRadius: "12px", padding: "20px",
                  color: "#68D391", border: "1px solid #68D39144",
                }}>
                  ✅ No repeat offenders detected
                </div>
              ) : offenders.map(o => (
                <div key={o.plate} style={{
                  background: "#FC4F4F11", border: "1px solid #FC4F4F66",
                  borderRadius: "12px", padding: "16px 20px", marginBottom: "12px",
                  display: "flex", alignItems: "center", gap: "12px",
                }}>
                  <span style={{ fontSize: "24px" }}>🚨</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "20px", color: "#FC8080" }}>
                      {o.plate}
                    </div>
                    <div style={{ color: "#A0AEC0", fontSize: "13px", marginTop: "4px" }}>
                      {o.total} violations recorded · Last seen {fmtFull(o.last_seen)}
                    </div>
                  </div>
                  <span style={{
                    background: "#FC4F4F", color: "white", borderRadius: "20px",
                    padding: "6px 16px", fontWeight: 700, fontSize: "16px",
                  }}>{o.total}x</span>
                </div>
              ))}
            </div>
          )}
          {tab === "search"    && <PlateSearch />}
          {tab === "analytics" && <Analytics />}
        </div>
      </div>
    </ChakraProvider>
  );
}
