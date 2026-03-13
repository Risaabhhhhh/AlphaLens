import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

// ── Design tokens ─────────────────────────────────────────────────────────────
const DARK = {
  bg:          "#0D0F17",
  bgDeep:      "#080A10",
  surface:     "#13151F",
  surfaceAlt:  "#191C28",
  card:        "#181B26",
  border:      "#22263A",
  borderHover: "#363B55",
  muted:       "#3D4260",
  dim:         "#6B7299",
  text:        "#B8BEDD",
  bright:      "#E8EAF6",
  // Accent
  gold:        "#D4A84B",
  goldSoft:    "#D4A84B18",
  goldBorder:  "#D4A84B40",
  // Signals
  bull:        "#34C77B",
  bullSoft:    "#34C77B14",
  bullBorder:  "#34C77B40",
  bear:        "#E85C5C",
  bearSoft:    "#E85C5C14",
  bearBorder:  "#E85C5C40",
  neut:        "#D4A84B",
  neutSoft:    "#D4A84B14",
  neutBorder:  "#D4A84B40",
  // Pin
  pin:         "#F0934A",
  pinSoft:     "#F0934A12",
  pinBorder:   "#F0934A40",
  // Shadow
  shadow:      "rgba(0,0,0,0.5)",
  shadowCard:  "rgba(0,0,0,0.3)",
};
const LIGHT = {
  bg:          "#F2F1EC",
  bgDeep:      "#E8E6DF",
  surface:     "#FFFFFF",
  surfaceAlt:  "#F8F7F2",
  card:        "#FFFFFF",
  border:      "#E0DDD4",
  borderHover: "#C8C4B8",
  muted:       "#B0AC9F",
  dim:         "#6E6A5E",
  text:        "#2A2820",
  bright:      "#111008",
  gold:        "#9A6E1C",
  goldSoft:    "#9A6E1C12",
  goldBorder:  "#9A6E1C35",
  bull:        "#167A4A",
  bullSoft:    "#167A4A0E",
  bullBorder:  "#167A4A35",
  bear:        "#B83030",
  bearSoft:    "#B830300E",
  bearBorder:  "#B8303035",
  neut:        "#9A6E1C",
  neutSoft:    "#9A6E1C0E",
  neutBorder:  "#9A6E1C35",
  pin:         "#C05A18",
  pinSoft:     "#C05A180E",
  pinBorder:   "#C05A1835",
  shadow:      "rgba(0,0,0,0.08)",
  shadowCard:  "rgba(0,0,0,0.05)",
};

// ── 100 Indian tickers ────────────────────────────────────────────────────────
const TICKERS = [
  "RELIANCE.NS","TCS.NS","HDFCBANK.NS","INFY.NS","ICICIBANK.NS",
  "HINDUNILVR.NS","ITC.NS","SBIN.NS","BHARTIARTL.NS","KOTAKBANK.NS",
  "LT.NS","AXISBANK.NS","ASIANPAINT.NS","MARUTI.NS","SUNPHARMA.NS",
  "WIPRO.NS","ULTRACEMCO.NS","BAJFINANCE.NS","NESTLEIND.NS","TITAN.NS",
  "POWERGRID.NS","NTPC.NS","ONGC.NS","HCLTECH.NS","TECHM.NS",
  "GRASIM.NS","ADANIENT.NS","ADANIPORTS.NS","COALINDIA.NS","JSWSTEEL.NS",
  "TATASTEEL.NS","TATAMOTORS.NS","BAJAJFINSV.NS","BPCL.NS","HEROMOTOCO.NS",
  "BRITANNIA.NS","CIPLA.NS","DRREDDY.NS","EICHERMOT.NS","HINDALCO.NS",
  "INDUSINDBK.NS","SBILIFE.NS","HDFCLIFE.NS","APOLLOHOSP.NS","DIVISLAB.NS",
  "ZOMATO.NS","PAYTM.NS","NYKAA.NS","DMART.NS","PIDILITIND.NS",
  "SIEMENS.NS","HAVELLS.NS","BERGEPAINT.NS","COLPAL.NS","GODREJCP.NS",
  "DABUR.NS","MARICO.NS","MUTHOOTFIN.NS","CHOLAFIN.NS","SHRIRAMFIN.NS",
  "BAJAJ-AUTO.NS","TVSMOTOR.NS","MPHASIS.NS","LTIM.NS","PERSISTENT.NS",
  "COFORGE.NS","TATACONSUM.NS","INDIGO.NS","IRCTC.NS","IRFC.NS",
  "HAL.NS","BEL.NS","BHEL.NS","ABB.NS","TORNTPHARM.NS",
  "AUROPHARMA.NS","LUPIN.NS","BIOCON.NS","ALKEM.NS","MAXHEALTH.NS",
  "FORTIS.NS","BALKRISIND.NS","TATAELXSI.NS","KPITTECH.NS","HAPPSTMNDS.NS",
  "POLICYBZR.NS","DELHIVERY.NS","EASEMYTRIP.NS","NAZARA.NS","RATEGAIN.NS",
  "LATENTVIEW.NS","TANLA.NS","ROUTE.NS","MAPMYINDIA.NS","VEDL.NS",
  "SAIL.NS","NMDC.NS","GLAND.NS","M&M.NS","BALKRISIND.NS",
];
const NAMES = {
  "RELIANCE.NS":"Reliance","TCS.NS":"TCS","HDFCBANK.NS":"HDFC Bank",
  "INFY.NS":"Infosys","ICICIBANK.NS":"ICICI Bank","HINDUNILVR.NS":"HUL",
  "ITC.NS":"ITC","SBIN.NS":"SBI","BHARTIARTL.NS":"Airtel","KOTAKBANK.NS":"Kotak",
  "LT.NS":"L&T","AXISBANK.NS":"Axis Bank","ASIANPAINT.NS":"Asian Paints",
  "MARUTI.NS":"Maruti","SUNPHARMA.NS":"Sun Pharma","WIPRO.NS":"Wipro",
  "BAJFINANCE.NS":"Bajaj Fin","NESTLEIND.NS":"Nestlé","TITAN.NS":"Titan",
  "ADANIENT.NS":"Adani Ent","TATAMOTORS.NS":"Tata Motors","TATASTEEL.NS":"Tata Steel",
  "JSWSTEEL.NS":"JSW Steel","ONGC.NS":"ONGC","NTPC.NS":"NTPC",
  "POWERGRID.NS":"Power Grid","COALINDIA.NS":"Coal India","HINDALCO.NS":"Hindalco",
  "ADANIPORTS.NS":"Adani Ports","GRASIM.NS":"Grasim","HDFCLIFE.NS":"HDFC Life",
  "SBILIFE.NS":"SBI Life","APOLLOHOSP.NS":"Apollo Hosp","DIVISLAB.NS":"Divi's Lab",
  "INDUSINDBK.NS":"IndusInd","EICHERMOT.NS":"Eicher","BRITANNIA.NS":"Britannia",
  "BAJAJFINSV.NS":"Bajaj Finserv","BPCL.NS":"BPCL","HEROMOTOCO.NS":"Hero Moto",
  "ULTRACEMCO.NS":"UltraTech","ZOMATO.NS":"Zomato","PAYTM.NS":"Paytm",
  "NYKAA.NS":"Nykaa","DMART.NS":"DMart","INDIGO.NS":"IndiGo","IRCTC.NS":"IRCTC",
  "HAL.NS":"HAL","BEL.NS":"BEL","BHEL.NS":"BHEL","CIPLA.NS":"Cipla",
  "DRREDDY.NS":"Dr Reddy","LUPIN.NS":"Lupin","BIOCON.NS":"Biocon",
  "HCLTECH.NS":"HCL Tech","TECHM.NS":"Tech M","PERSISTENT.NS":"Persistent",
  "LTIM.NS":"LTIMindtree","TATAELXSI.NS":"Tata Elxsi","NAZARA.NS":"Nazara",
  "DELHIVERY.NS":"Delhivery","POLICYBZR.NS":"PolicyBazaar","MAPMYINDIA.NS":"MapMyIndia",
  "M&M.NS":"M&M","BAJAJ-AUTO.NS":"Bajaj Auto","TVSMOTOR.NS":"TVS Motor",
  "MPHASIS.NS":"Mphasis","COFORGE.NS":"Coforge","IRFC.NS":"IRFC","ABB.NS":"ABB",
  "VEDL.NS":"Vedanta","SAIL.NS":"SAIL","NMDC.NS":"NMDC","GLAND.NS":"Gland Pharma",
  "TORNTPHARM.NS":"Torrent Ph","AUROPHARMA.NS":"Aurobindo","ALKEM.NS":"Alkem",
  "MAXHEALTH.NS":"Max Health","FORTIS.NS":"Fortis","BALKRISIND.NS":"BKT",
  "KPITTECH.NS":"KPIT Tech","HAPPSTMNDS.NS":"Happiest Minds","TATACONSUM.NS":"Tata Consumer",
  "COLPAL.NS":"Colgate","GODREJCP.NS":"Godrej CP","DABUR.NS":"Dabur",
  "MARICO.NS":"Marico","MUTHOOTFIN.NS":"Muthoot","CHOLAFIN.NS":"Chola Fin",
  "SHRIRAMFIN.NS":"Shriram Fin","PIDILITIND.NS":"Pidilite","SIEMENS.NS":"Siemens",
  "HAVELLS.NS":"Havells","BERGEPAINT.NS":"Berger","RATEGAIN.NS":"RateGain",
  "LATENTVIEW.NS":"LatentView","TANLA.NS":"Tanla","ROUTE.NS":"Route Mobile",
  "EASEMYTRIP.NS":"EaseMyTrip",
};
const sn = t => NAMES[t] || t.replace(".NS","");

const SECTORS = {
  "Banking":    ["HDFCBANK.NS","ICICIBANK.NS","SBIN.NS","KOTAKBANK.NS","AXISBANK.NS","INDUSINDBK.NS"],
  "IT":         ["TCS.NS","INFY.NS","WIPRO.NS","HCLTECH.NS","TECHM.NS","MPHASIS.NS","LTIM.NS","PERSISTENT.NS","TATAELXSI.NS","COFORGE.NS","HAPPSTMNDS.NS","KPITTECH.NS"],
  "FMCG":       ["HINDUNILVR.NS","ITC.NS","NESTLEIND.NS","BRITANNIA.NS","DABUR.NS","MARICO.NS","GODREJCP.NS","COLPAL.NS","TATACONSUM.NS"],
  "Pharma":     ["SUNPHARMA.NS","CIPLA.NS","DRREDDY.NS","LUPIN.NS","BIOCON.NS","DIVISLAB.NS","ALKEM.NS","AUROPHARMA.NS","TORNTPHARM.NS","GLAND.NS"],
  "Auto":       ["MARUTI.NS","TATAMOTORS.NS","M&M.NS","BAJAJ-AUTO.NS","HEROMOTOCO.NS","TVSMOTOR.NS","EICHERMOT.NS","BALKRISIND.NS"],
  "Finance":    ["BAJFINANCE.NS","BAJAJFINSV.NS","MUTHOOTFIN.NS","CHOLAFIN.NS","SHRIRAMFIN.NS","IRFC.NS"],
  "Energy":     ["RELIANCE.NS","ONGC.NS","BPCL.NS","COALINDIA.NS","NTPC.NS","POWERGRID.NS"],
  "Metals":     ["TATASTEEL.NS","JSWSTEEL.NS","HINDALCO.NS","VEDL.NS","SAIL.NS","NMDC.NS"],
  "Defence":    ["HAL.NS","BEL.NS","BHEL.NS"],
  "Digital":    ["ZOMATO.NS","NYKAA.NS","IRCTC.NS","INDIGO.NS","PAYTM.NS","POLICYBZR.NS","NAZARA.NS","DELHIVERY.NS","MAPMYINDIA.NS"],
};
const SECTOR_LIST = ["All", ...Object.keys(SECTORS)];

const PINS_KEY  = "alphalens_pins_v4";
const THEME_KEY = "alphalens_theme_v2";
const loadPins  = () => { try { return JSON.parse(localStorage.getItem(PINS_KEY)||"[]"); } catch { return []; }};
const saveTheme = m  => localStorage.setItem(THEME_KEY, m);
const loadTheme = () => localStorage.getItem(THEME_KEY) || "dark";

// ── Helpers ───────────────────────────────────────────────────────────────────
const sigColor = (s, T) => s==="Bullish"?T.bull : s==="Bearish"?T.bear : T.neut;
const sigSoft  = (s, T) => s==="Bullish"?T.bullSoft : s==="Bearish"?T.bearSoft : T.neutSoft;
const sigBord  = (s, T) => s==="Bullish"?T.bullBorder : s==="Bearish"?T.bearBorder : T.neutBorder;
const sigArr   = s => s==="Bullish"?"↑" : s==="Bearish"?"↓" : "→";
const pct  = n => n!=null ? `${(n*100).toFixed(1)}%` : "—";
const f3   = n => n!=null ? Number(n).toFixed(3) : "—";
const ago  = ts => {
  if (!ts) return "";
  const s = (Date.now() - new Date(ts*1000||ts)) / 1000;
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Badge({ signal, T, large }) {
  const col  = sigColor(signal, T);
  const soft = sigSoft(signal, T);
  const bord = sigBord(signal, T);
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:5,
      padding: large ? "5px 14px" : "3px 10px",
      borderRadius: 6,
      fontSize: large ? 13 : 11,
      fontWeight: 600,
      fontFamily:"'DM Mono',monospace",
      letterSpacing:"0.03em",
      background: soft,
      border: `1px solid ${bord}`,
      color: col,
    }}>
      <span style={{fontSize: large?14:12}}>{sigArr(signal)}</span>
      {signal}
    </span>
  );
}

function StatCard({ label, value, sub, color, T, style={} }) {
  return (
    <div style={{
      flex:1, minWidth:120,
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 12,
      padding:"20px 22px",
      transition:"box-shadow 0.2s",
      ...style,
    }}>
      <div style={{fontSize:11, fontWeight:500, color:T.dim,
        letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10}}>
        {label}
      </div>
      <div style={{fontSize:30, fontWeight:700, color:color||T.bright,
        fontFamily:"'DM Mono',monospace", lineHeight:1}}>
        {value ?? 0}
      </div>
      {sub && <div style={{fontSize:12, color:T.muted, marginTop:7}}>{sub}</div>}
    </div>
  );
}

function Pill({ label, active, color, onClick, T }) {
  return (
    <button onClick={onClick} style={{
      padding:"5px 13px",
      borderRadius:7,
      fontSize:12,
      fontWeight:500,
      border:`1px solid ${active ? (color||T.gold)+"60" : T.border}`,
      background: active ? (color||T.gold)+"14" : "transparent",
      color: active ? (color||T.gold) : T.dim,
      cursor:"pointer",
      transition:"all 0.15s",
      whiteSpace:"nowrap",
    }}>
      {label}
    </button>
  );
}

function SectionLabel({ children, T }) {
  return (
    <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:16}}>
      <div style={{width:3, height:16, background:T.gold, borderRadius:2, flexShrink:0}}/>
      <span style={{fontSize:11, fontWeight:600, color:T.dim,
        letterSpacing:"0.1em", textTransform:"uppercase"}}>
        {children}
      </span>
    </div>
  );
}

// ── Analyze Modal ─────────────────────────────────────────────────────────────
function AnalyzeModal({ onClose, T, isDark }) {
  const [hl,  setHL]  = useState("");
  const [tk,  setTK]  = useState("");
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const EXAMPLES = [
    "Reliance Industries reports record quarterly profit of ₹18,500 crore",
    "RBI raises repo rate by 25 basis points amid persistent inflation",
    "Zomato beats estimates — daily orders cross 3.2 million mark",
    "TCS announces ₹17,000 crore buyback at ₹4,150 per share",
    "Adani Group prepays ₹15,000 crore of pledged shares ahead of schedule",
  ];

  const run = async () => {
    if (!hl.trim()) return;
    setLoading(true); setError(null); setRes(null);
    try {
      const r = await axios.post(`${API}/analyze`, { headline: hl, ticker: tk||null });
      setRes(r.data);
    } catch {
      setError("Cannot reach API — is FastAPI running on port 8000?");
    } finally { setLoading(false); }
  };

  const resColor = res ? sigColor(res.signal, T) : T.gold;

  return (
    <div onClick={onClose} style={{
      position:"fixed", inset:0, zIndex:300,
      background: isDark ? "rgba(8,9,14,0.85)" : "rgba(180,178,170,0.75)",
      display:"flex", alignItems:"center", justifyContent:"center",
      backdropFilter:"blur(10px)",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width:620, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto",
        background: T.surface,
        border:`1px solid ${T.border}`,
        borderRadius:20,
        boxShadow:`0 32px 80px ${T.shadow}`,
        padding:"32px 36px",
        animation:"slideUp 0.3s cubic-bezier(0.34,1.2,0.64,1) both",
      }}>
        <div style={{display:"flex", justifyContent:"space-between",
          alignItems:"flex-start", marginBottom:26}}>
          <div>
            <h2 style={{fontSize:22, fontWeight:700, color:T.bright, marginBottom:4}}>
              Headline Analyzer
            </h2>
            <p style={{fontSize:13, color:T.dim}}>
              Paste any financial headline for instant sentiment &amp; impact prediction
            </p>
          </div>
          <button onClick={onClose} style={{
            background:"none", border:`1px solid ${T.border}`,
            borderRadius:8, width:32, height:32, cursor:"pointer",
            color:T.muted, fontSize:18, display:"flex",
            alignItems:"center", justifyContent:"center",
          }}>×</button>
        </div>

        <textarea value={hl} onChange={e=>setHL(e.target.value)}
          rows={3} placeholder="e.g. Infosys raises FY25 revenue guidance to 4–7%…"
          style={{
            width:"100%", background:T.bgDeep,
            border:`1.5px solid ${T.border}`,
            borderRadius:10, padding:"13px 16px",
            color:T.text, fontSize:14,
            outline:"none", resize:"none", lineHeight:1.6, marginBottom:14,
            transition:"border-color 0.2s",
          }}
          onFocus={e => e.target.style.borderColor = T.gold}
          onBlur={e  => e.target.style.borderColor = T.border}
        />

        <div style={{marginBottom:18}}>
          <p style={{fontSize:11, fontWeight:600, color:T.muted, letterSpacing:"0.08em",
            textTransform:"uppercase", marginBottom:9}}>
            Quick Examples
          </p>
          <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
            {EXAMPLES.map((ex,i) => (
              <button key={i} onClick={() => setHL(ex)} style={{
                padding:"5px 11px", borderRadius:6, fontSize:11, fontWeight:400,
                border:`1px solid ${T.border}`, background:"transparent",
                color:T.dim, cursor:"pointer", transition:"all 0.15s",
              }}
              onMouseEnter={e => { e.target.style.borderColor=T.borderHover; e.target.style.color=T.text; }}
              onMouseLeave={e => { e.target.style.borderColor=T.border; e.target.style.color=T.dim; }}>
                {ex.slice(0,42)}…
              </button>
            ))}
          </div>
        </div>

        <div style={{display:"flex", gap:10, marginBottom:16}}>
          <input value={tk} onChange={e=>setTK(e.target.value.toUpperCase())}
            placeholder="Ticker (optional, e.g. RELIANCE.NS)"
            style={{
              flex:1, background:T.bgDeep, border:`1.5px solid ${T.border}`,
              borderRadius:10, padding:"11px 14px", color:T.gold,
              fontSize:13, outline:"none", transition:"border-color 0.2s",
            }}
            onFocus={e => e.target.style.borderColor = T.gold}
            onBlur={e  => e.target.style.borderColor = T.border}
          />
          <button onClick={run} disabled={loading||!hl.trim()} style={{
            background: T.gold, color:"#100800", border:"none",
            borderRadius:10, padding:"11px 28px", fontSize:13,
            fontWeight:700, cursor: hl.trim()?"pointer":"not-allowed",
            opacity: hl.trim()?1:0.5,
            boxShadow:`0 4px 16px ${T.gold}35`,
            transition:"all 0.2s",
          }}>
            {loading ? "Analyzing…" : "Analyze →"}
          </button>
        </div>

        {error && (
          <div style={{background:T.bearSoft, border:`1px solid ${T.bearBorder}`,
            borderRadius:9, padding:"11px 14px", color:T.bear,
            fontSize:13, marginBottom:14}}>
            {error}
          </div>
        )}

        {res && (
          <div style={{border:`1px solid ${T.border}`, borderRadius:14,
            overflow:"hidden", animation:"fadeIn 0.3s ease both"}}>
            {/* Hero */}
            <div style={{
              background:`linear-gradient(135deg, ${resColor}10, ${resColor}03)`,
              borderBottom:`1px solid ${T.border}`,
              padding:"22px 24px",
              display:"flex", alignItems:"center",
              justifyContent:"space-between", gap:16,
            }}>
              <div>
                <Badge signal={res.signal} T={T} large/>
                <p style={{fontSize:13, color:T.dim, marginTop:10,
                  fontStyle:"italic", lineHeight:1.55, maxWidth:340}}>
                  "{(res.headline||"").slice(0,100)}{res.headline?.length>100?"…":""}"
                </p>
              </div>
              <div style={{textAlign:"right", flexShrink:0}}>
                <div style={{fontSize:42, fontWeight:700, color:resColor,
                  fontFamily:"'DM Mono',monospace", lineHeight:1}}>
                  {pct(res.impact_probability)}
                </div>
                <div style={{fontSize:10, color:T.dim, marginTop:4,
                  letterSpacing:"0.08em", textTransform:"uppercase"}}>
                  Impact Probability
                </div>
              </div>
            </div>

            {/* Metrics grid */}
            <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)"}}>
              {[
                ["Sentiment", (res.sentiment||"").replace(/_/g," ")],
                ["Confidence", f3(res.confidence)],
                ["Event",      (res.event_type||"").replace(/_/g," ")],
                ["Importance", pct(res.importance)],
                ["Ticker",     res.ticker||"—"],
                ["Sent. Score",f3(res.sentiment_score)],
              ].map(([label,val],i) => (
                <div key={label} style={{
                  padding:"14px 18px",
                  borderRight: i%3<2 ? `1px solid ${T.border}` : "none",
                  borderBottom: i<3  ? `1px solid ${T.border}` : "none",
                }}>
                  <div style={{fontSize:10, fontWeight:500, color:T.muted,
                    letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:5}}>
                    {label}
                  </div>
                  <div style={{fontSize:14, fontWeight:600, color:T.text,
                    fontFamily:"'DM Mono',monospace", textTransform:"capitalize"}}>
                    {val||"—"}
                  </div>
                </div>
              ))}
            </div>

            {/* Drivers */}
            {res.drivers?.length > 0 && (
              <div style={{padding:"16px 22px"}}>
                <p style={{fontSize:11, fontWeight:600, color:T.muted,
                  letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:12}}>
                  Key Drivers
                </p>
                {res.drivers.map((d,i) => (
                  <div key={i} style={{display:"flex", alignItems:"flex-start",
                    gap:10, padding:"7px 0",
                    borderBottom:i<res.drivers.length-1?`1px solid ${T.border}`:"none"}}>
                    <div style={{width:6, height:6, borderRadius:"50%",
                      background:T.gold, flexShrink:0, marginTop:6}}/>
                    <span style={{fontSize:13, color:T.text, lineHeight:1.5}}>{d}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Pin Manager Modal ─────────────────────────────────────────────────────────
function PinModal({ pins, onToggle, signals, onClose, T, isDark }) {
  const [q, setQ] = useState("");
  const filtered  = TICKERS.filter(t =>
    !q || sn(t).toLowerCase().includes(q.toLowerCase()) ||
    t.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div onClick={onClose} style={{
      position:"fixed", inset:0, zIndex:300,
      background: isDark ? "rgba(8,9,14,0.85)" : "rgba(180,178,170,0.75)",
      display:"flex", alignItems:"center", justifyContent:"center",
      backdropFilter:"blur(10px)",
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:660, maxWidth:"95vw", maxHeight:"88vh",
        background:T.surface,
        border:`1px solid ${T.border}`,
        borderRadius:20,
        boxShadow:`0 32px 80px ${T.shadow}`,
        display:"flex", flexDirection:"column",
        animation:"slideUp 0.3s cubic-bezier(0.34,1.2,0.64,1) both",
        padding:"28px 28px 0",
      }}>
        {/* Header */}
        <div style={{display:"flex", justifyContent:"space-between",
          alignItems:"flex-start", marginBottom:20}}>
          <div>
            <h2 style={{fontSize:20, fontWeight:700, color:T.bright, marginBottom:4}}>
              Pin Manager
            </h2>
            <p style={{fontSize:13, color:T.dim}}>
              {pins.length} pinned · pinned companies appear first everywhere
            </p>
          </div>
          <button onClick={onClose} style={{background:"none",
            border:`1px solid ${T.border}`, borderRadius:8, width:32, height:32,
            cursor:"pointer", color:T.muted, fontSize:18, display:"flex",
            alignItems:"center", justifyContent:"center"}}>×</button>
        </div>

        {/* Search */}
        <input value={q} onChange={e=>setQ(e.target.value)}
          placeholder="Search company name or ticker…"
          style={{background:T.bgDeep, border:`1.5px solid ${T.border}`,
            borderRadius:10, padding:"10px 14px", color:T.text,
            fontSize:13, outline:"none", marginBottom:16,
            transition:"border-color 0.2s"}}
          onFocus={e=>e.target.style.borderColor=T.gold}
          onBlur={e=>e.target.style.borderColor=T.border}
        />

        {/* Active pins */}
        {pins.length > 0 && (
          <div style={{marginBottom:16}}>
            <p style={{fontSize:11, fontWeight:600, color:T.pin,
              letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10}}>
              Pinned ({pins.length})
            </p>
            <div style={{display:"flex", flexWrap:"wrap", gap:7}}>
              {pins.map(t => (
                <div key={t} style={{
                  display:"flex", alignItems:"center", gap:8,
                  background:T.pinSoft, border:`1px solid ${T.pinBorder}`,
                  borderRadius:8, padding:"6px 12px",
                }}>
                  <span style={{fontSize:13, fontWeight:600, color:T.pin}}>{sn(t)}</span>
                  <span style={{fontSize:10, color:T.muted, fontFamily:"'DM Mono',monospace"}}>{t}</span>
                  <button onClick={()=>onToggle(t)} style={{
                    background:"none", border:"none", color:T.bear,
                    cursor:"pointer", fontSize:16, lineHeight:1, padding:0}}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grid — scrollable */}
        <p style={{fontSize:11, fontWeight:500, color:T.muted, textTransform:"uppercase",
          letterSpacing:"0.08em", marginBottom:10}}>
          {filtered.length} companies · tap to pin / unpin
        </p>
        <div style={{
          overflowY:"auto", flex:1,
          display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(142px,1fr))",
          gap:7, alignContent:"flex-start", paddingBottom:24,
        }}>
          {filtered.map(t => {
            const pinned = pins.includes(t);
            const row    = signals.find(s=>s.ticker===t);
            return (
              <button key={t} onClick={()=>onToggle(t)} style={{
                background: pinned ? T.pinSoft : T.bgDeep,
                border:`1px solid ${pinned ? T.pinBorder : T.border}`,
                borderRadius:10, padding:"11px 13px", cursor:"pointer",
                textAlign:"left", transition:"all 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = pinned?T.pin:T.borderHover}
              onMouseLeave={e => e.currentTarget.style.borderColor = pinned?T.pinBorder:T.border}
              >
                <div style={{fontSize:13, fontWeight:600,
                  color:pinned?T.pin:T.text, marginBottom:2}}>
                  {pinned?"📌 ":""}{sn(t)}
                </div>
                <div style={{fontSize:10, color:T.muted,
                  fontFamily:"'DM Mono',monospace", marginBottom: row?7:0}}>
                  {t}
                </div>
                {row && <Badge signal={row.signal} T={T}/>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [mode,    setMode]   = useState(loadTheme);
  const isDark = mode === "dark";
  const T = isDark ? DARK : LIGHT;

  const toggleMode = () => setMode(m => {
    const next = m==="dark"?"light":"dark";
    saveTheme(next); return next;
  });

  const [tab,     setTab]    = useState("dashboard");
  const [signals, setSigs]   = useState([]);
  const [top,     setTop]    = useState([]);
  const [news,    setNews]   = useState([]);
  const [summary, setSum]    = useState({});
  const [model,   setModel]  = useState({});
  const [fSig,    setFS]     = useState("All");
  const [fSector, setFSec]   = useState("All");
  const [loading, setLoad]   = useState(true);
  const [showAnal,setAnal]   = useState(false);
  const [showPins,setPinMgr] = useState(false);
  const [lastUpd, setUpd]    = useState(null);
  const [pins,    setPins]   = useState(loadPins);

  useEffect(() => localStorage.setItem(PINS_KEY, JSON.stringify(pins)), [pins]);
  const togglePin = t => setPins(p => p.includes(t) ? p.filter(x=>x!==t) : [...p, t]);

  const fetchAll = useCallback(async () => {
    try {
      const params = {};
      if (fSig !== "All") params.signal = fSig;
      const [s, tp, n, sm, m] = await Promise.all([
        axios.get(`${API}/signals`, { params:{...params, limit:150} }),
        axios.get(`${API}/top`,     { params:{ limit:10 } }),
        axios.get(`${API}/news`,    { params:{ limit:30 } }),
        axios.get(`${API}/summary`),
        axios.get(`${API}/model/info`),
      ]);
      setSigs(s.data||[]); setTop(tp.data||[]); setNews(n.data||[]);
      setSum(sm.data||{}); setModel(m.data||{}); setUpd(new Date());
    } catch {}
    finally { setLoad(false); }
  }, [fSig]);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 30000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  // Sort with pins first
  const withPinsFirst = arr => [...arr].sort(
    (a,b) => (pins.includes(b.ticker)?1:0) - (pins.includes(a.ticker)?1:0)
  );

  // Signal sector filter — works for both Indian .NS and US tickers in CSV
  const filteredSigs = withPinsFirst(signals).filter(s => {
    if (fSector === "All")    return true;
    if (fSector === "Pinned") return pins.includes(s.ticker);
    return (SECTORS[fSector]||[]).includes(s.ticker);
  });

  // Chart data
  const pieData = [
    { name:"Bullish", value:summary.bullish||0, color:T.bull },
    { name:"Neutral", value:summary.neutral||0, color:T.neut },
    { name:"Bearish", value:summary.bearish||0, color:T.bear },
  ].filter(d => d.value > 0);

  const barData = (summary.top_signals||[]).slice(0,7).map(s => ({
    name:  sn(s.ticker||""),
    value: s.count,
    fill:  s.signal==="Bullish"?T.bull : s.signal==="Bearish"?T.bear : T.neut,
  }));

  const modelActive = model.status === "loaded";

  return (
    <>
      {/* Global styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html { font-size:16px; }
        body {
          background:${T.bg}; color:${T.text};
          font-family:'Outfit',sans-serif;
          -webkit-font-smoothing:antialiased;
          transition:background 0.35s ease, color 0.35s ease;
        }
        ::selection { background:${T.gold}30; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:${T.border}; border-radius:4px; }
        ::-webkit-scrollbar-thumb:hover { background:${T.borderHover}; }
        @keyframes slideUp {
          from { opacity:0; transform:translateY(16px) scale(0.98); }
          to   { opacity:1; transform:translateY(0)    scale(1);    }
        }
        @keyframes fadeIn {
          from { opacity:0; }
          to   { opacity:1; }
        }
        @keyframes pulseDot {
          0%,100% { opacity:1; }
          50%      { opacity:0.4; }
        }
        .row-hover { transition: background 0.15s; }
        .row-hover:hover { background: ${T.surfaceAlt} !important; }
        .card-lift { transition: transform 0.2s, box-shadow 0.2s; }
        .card-lift:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px ${T.shadowCard};
        }
        .tab-item {
          position:relative;
          background:none; border:none; cursor:pointer;
          padding:0 16px; height:100%;
          font-family:'Outfit',sans-serif;
          font-size:13px; font-weight:500;
          transition:color 0.2s;
        }
        .tab-item::after {
          content:''; position:absolute;
          bottom:0; left:16px; right:16px; height:2px;
          background:${T.gold}; border-radius:2px 2px 0 0;
          transform:scaleX(0); transition:transform 0.2s;
        }
        .tab-item.active { color:${T.bright} !important; }
        .tab-item.active::after { transform:scaleX(1); }
        .toggle-track {
          position:relative; width:48px; height:26px;
          border-radius:13px; border:none; cursor:pointer;
          transition:background 0.3s;
          background:${isDark ? T.gold : T.border};
        }
        .toggle-track::after {
          content:''; position:absolute;
          top:3px; left:${isDark?"23px":"3px"};
          width:20px; height:20px; border-radius:50%;
          background:${isDark?"#1A1000":"#fff"};
          transition:left 0.3s cubic-bezier(0.34,1.4,0.64,1);
          box-shadow:0 1px 4px rgba(0,0,0,0.25);
        }
        .watch-card {
          background:${T.card};
          border:1px solid ${T.border};
          border-radius:12px; padding:14px;
          cursor:pointer; transition:all 0.2s;
        }
        .watch-card:hover {
          border-color:${T.borderHover};
          transform:translateY(-2px);
          box-shadow:0 6px 20px ${T.shadowCard};
        }
        .watch-card.pinned {
          border-color:${T.pinBorder};
          background:${T.pinSoft};
        }
        .pin-btn {
          font-size:12px; font-weight:500;
          padding:4px 11px; border-radius:6px; cursor:pointer;
          font-family:'Outfit',sans-serif;
          transition:all 0.15s;
          border:1px solid ${T.border};
          background:transparent; color:${T.dim};
        }
        .pin-btn:hover { border-color:${T.borderHover}; color:${T.text}; }
        .pin-btn.active {
          border-color:${T.pinBorder};
          background:${T.pinSoft};
          color:${T.pin};
        }
      `}</style>

      {showAnal && <AnalyzeModal onClose={()=>setAnal(false)} T={T} isDark={isDark}/>}
      {showPins && <PinModal pins={pins} onToggle={togglePin} signals={signals}
        onClose={()=>setPinMgr(false)} T={T} isDark={isDark}/>}

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header style={{
        height:60, background:T.surface,
        borderBottom:`1px solid ${T.border}`,
        display:"flex", alignItems:"center", padding:"0 28px", gap:24,
        position:"sticky", top:0, zIndex:100,
        boxShadow:`0 1px 0 ${T.border}`,
        transition:"background 0.35s",
      }}>
        {/* Wordmark */}
        <div style={{display:"flex", alignItems:"center", gap:11, flexShrink:0}}>
          <div style={{
            width:32, height:32, borderRadius:9,
            background:`linear-gradient(145deg, ${T.gold}, ${isDark?"#8A5E10":"#C49030"})`,
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:`0 4px 12px ${T.gold}40`,
          }}>
            <span style={{fontSize:13, fontWeight:800,
              color:"#0D0800", letterSpacing:"-0.02em"}}>AL</span>
          </div>
          <div>
            <div style={{fontSize:16, fontWeight:700, color:T.bright,
              letterSpacing:"-0.01em", lineHeight:1.1}}>AlphaLens</div>
            <div style={{fontSize:9, color:T.muted, letterSpacing:"0.12em",
              lineHeight:1, marginTop:1}}>NSE · BSE</div>
          </div>
        </div>

        <div style={{width:1, height:30, background:T.border}}/>

        {/* Nav tabs */}
        <nav style={{display:"flex", height:60, gap:0}}>
          {[["dashboard","Overview"],["signals","Signals"],
            ["watchlist","Watchlist"],["news","News Feed"]].map(([id,label]) => (
            <button key={id} onClick={()=>setTab(id)}
              className={`tab-item${tab===id?" active":""}`}
              style={{color: tab===id ? T.bright : T.dim}}>
              {label}
            </button>
          ))}
        </nav>

        {/* Right side */}
        <div style={{marginLeft:"auto", display:"flex", gap:10, alignItems:"center"}}>
          {/* Model status */}
          <div style={{
            display:"flex", alignItems:"center", gap:8,
            padding:"6px 14px",
            background:T.bgDeep,
            border:`1px solid ${T.border}`,
            borderRadius:9, fontSize:12, color:T.dim, fontWeight:500,
          }}>
            <div style={{
              width:7, height:7, borderRadius:"50%",
              background: modelActive ? T.bull : T.bear,
              boxShadow: modelActive ? `0 0 7px ${T.bull}` : `0 0 7px ${T.bear}`,
              animation: modelActive ? "pulseDot 2s ease-in-out infinite" : "none",
            }}/>
            <span>Model {modelActive?"Active":"Offline"}</span>
            {model.test_auc && (
              <span style={{color:T.gold, fontFamily:"'DM Mono',monospace",
                fontWeight:600, marginLeft:2}}>AUC {model.test_auc}</span>
            )}
          </div>

          {/* Pins trigger */}
          <button onClick={()=>setPinMgr(true)} style={{
            display:"flex", alignItems:"center", gap:7, padding:"7px 14px",
            background: pins.length>0 ? T.pinSoft : "transparent",
            border:`1px solid ${pins.length>0 ? T.pinBorder : T.border}`,
            borderRadius:9, cursor:"pointer", fontSize:12, fontWeight:500,
            color: pins.length>0 ? T.pin : T.dim,
            transition:"all 0.2s",
          }}>
            <span>📌</span>
            <span>{pins.length>0 ? `${pins.length} Pinned` : "Pin"}</span>
          </button>

          {/* Analyze CTA */}
          <button onClick={()=>setAnal(true)} style={{
            display:"flex", alignItems:"center", gap:8, padding:"8px 20px",
            background:T.gold, color:"#100800", border:"none", borderRadius:9,
            cursor:"pointer", fontSize:13, fontWeight:700,
            boxShadow:`0 4px 14px ${T.gold}40`,
            transition:"all 0.2s",
          }}>
            <span>⚡</span> Analyze
          </button>

          {/* Theme toggle */}
          <button className="toggle-track" onClick={toggleMode}
            title={isDark?"Switch to Light":"Switch to Dark"}/>

          {/* Clock */}
          <span style={{fontSize:11, color:T.muted,
            fontFamily:"'DM Mono',monospace", whiteSpace:"nowrap"}}>
            {lastUpd ? lastUpd.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : "—"}
          </span>
        </div>
      </header>

      {/* ── MAIN ───────────────────────────────────────────────────────────── */}
      <main style={{maxWidth:1400, margin:"0 auto", padding:"28px 28px 64px",
        animation:"fadeIn 0.3s ease"}}>

        {/* ══════════════════ DASHBOARD ══════════════════ */}
        {tab === "dashboard" && (<>

          {/* Pinned strip */}
          {pins.length > 0 && (
            <div style={{
              background:T.pinSoft, border:`1px solid ${T.pinBorder}`,
              borderRadius:14, padding:"18px 22px", marginBottom:24,
              animation:"slideUp 0.3s ease",
            }}>
              <div style={{display:"flex", justifyContent:"space-between",
                alignItems:"center", marginBottom:14}}>
                <span style={{fontSize:12, fontWeight:600, color:T.pin,
                  letterSpacing:"0.07em", textTransform:"uppercase"}}>
                  📌 Pinned Positions ({pins.length})
                </span>
                <button onClick={()=>setPinMgr(true)} style={{
                  background:"none", border:`1px solid ${T.pinBorder}`,
                  color:T.pin, borderRadius:7, padding:"3px 11px",
                  fontSize:11, fontWeight:500, cursor:"pointer"}}>
                  Manage
                </button>
              </div>
              <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
                {pins.map(t => {
                  const row = signals.find(s=>s.ticker===t);
                  return (
                    <div key={t} className="card-lift"
                      onClick={()=>{setTab("signals");}}
                      style={{
                        background:T.card, cursor:"pointer",
                        border:`1px solid ${row ? sigBord(row.signal,T) : T.pinBorder}`,
                        borderRadius:11, padding:"13px 16px", minWidth:120,
                        boxShadow: row ? `0 2px 12px ${sigColor(row.signal,T)}14` : "none",
                      }}>
                      <div style={{fontSize:14, fontWeight:700,
                        color:T.bright, marginBottom:2}}>{sn(t)}</div>
                      <div style={{fontSize:10, color:T.muted,
                        fontFamily:"'DM Mono',monospace", marginBottom:9}}>{t}</div>
                      {row ? <Badge signal={row.signal} T={T}/> :
                        <span style={{fontSize:11,color:T.muted}}>No data yet</span>}
                      <button onClick={e=>{e.stopPropagation();togglePin(t);}}
                        style={{marginTop:9,background:"none",
                          border:`1px solid ${T.pinBorder}`, color:T.pin,
                          borderRadius:6, padding:"3px 9px", fontSize:11,
                          cursor:"pointer", display:"block", fontFamily:"'Outfit',sans-serif"}}>
                        Unpin
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stat row */}
          <div style={{display:"flex", gap:12, marginBottom:24, flexWrap:"wrap"}}>
            <StatCard label="Total Articles" value={summary.total??0} color={T.bright} T={T}/>
            <StatCard label="Bullish"  value={summary.bullish??0} color={T.bull} T={T}
              sub={summary.total ? pct((summary.bullish||0)/summary.total)+" of total" : null}/>
            <StatCard label="Bearish"  value={summary.bearish??0} color={T.bear} T={T}
              sub={summary.total ? pct((summary.bearish||0)/summary.total)+" of total" : null}/>
            <StatCard label="Neutral"  value={summary.neutral??0} color={T.neut} T={T}/>
            <StatCard label="Avg 24h Return"
              value={summary.avg_return != null
                ? `${summary.avg_return>0?"+":""}${(summary.avg_return*100).toFixed(2)}%` : "—"}
              color={summary.avg_return>0?T.bull:summary.avg_return<0?T.bear:T.text} T={T}/>
            <StatCard label="Model AUC" value={model.test_auc??"—"} color={T.gold} T={T}
              sub={model.n_samples ? `n = ${model.n_samples}` : null}/>
          </div>

          {/* Charts + top signals */}
          <div style={{display:"grid",
            gridTemplateColumns:"220px 1fr 340px", gap:16, marginBottom:24}}>

            {/* Pie */}
            <div style={{background:T.card, border:`1px solid ${T.border}`,
              borderRadius:14, padding:"20px 22px"}}>
              <SectionLabel T={T}>Distribution</SectionLabel>
              {pieData.length === 0
                ? <div style={{height:120, display:"flex", alignItems:"center",
                    justifyContent:"center", color:T.muted, fontSize:13}}>No data</div>
                : <>
                  <ResponsiveContainer width="100%" height={110}>
                    <PieChart>
                      <Pie data={pieData} innerRadius={30} outerRadius={46}
                        dataKey="value" strokeWidth={0} paddingAngle={3}>
                        {pieData.map((d,i) => <Cell key={i} fill={d.color} opacity={0.85}/>)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{display:"flex", flexDirection:"column", gap:9, marginTop:10}}>
                    {pieData.map(d => (
                      <div key={d.name} style={{display:"flex",
                        justifyContent:"space-between", alignItems:"center"}}>
                        <span style={{display:"flex", alignItems:"center",
                          gap:7, fontSize:12, color:T.dim}}>
                          <span style={{width:8, height:8, borderRadius:3,
                            background:d.color, display:"inline-block"}}/>
                          {d.name}
                        </span>
                        <span style={{fontSize:13, fontWeight:700, color:d.color,
                          fontFamily:"'DM Mono',monospace"}}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>}
            </div>

            {/* Bar */}
            <div style={{background:T.card, border:`1px solid ${T.border}`,
              borderRadius:14, padding:"20px 22px"}}>
              <SectionLabel T={T}>Most Active Tickers</SectionLabel>
              {barData.length === 0
                ? <div style={{height:150, display:"flex", alignItems:"center",
                    justifyContent:"center", color:T.muted, fontSize:13}}>
                    No data yet — run the pipeline
                  </div>
                : <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={barData} layout="vertical" barSize={11}
                    margin={{left:0, right:24, top:0, bottom:0}}>
                    <XAxis type="number" hide/>
                    <YAxis type="category" dataKey="name" width={84}
                      tick={{fill:T.dim, fontSize:11, fontFamily:"'DM Mono',monospace"}}
                      axisLine={false} tickLine={false}/>
                    <Tooltip
                      contentStyle={{background:T.surface,
                        border:`1px solid ${T.border}`, borderRadius:9,
                        fontSize:12, color:T.text, boxShadow:`0 4px 16px ${T.shadow}`}}
                      cursor={{fill:T.bgDeep}}/>
                    <Bar dataKey="value" radius={[0,5,5,0]}>
                      {barData.map((d,i) => <Cell key={i} fill={d.fill} opacity={0.85}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>}
            </div>

            {/* Top signals list */}
            <div style={{background:T.card, border:`1px solid ${T.border}`,
              borderRadius:14, padding:"20px 22px"}}>
              <SectionLabel T={T}>Top Signals</SectionLabel>
              {withPinsFirst(top).length === 0
                ? <div style={{color:T.muted, fontSize:13, paddingTop:8}}>
                    No signals yet
                  </div>
                : withPinsFirst(top).map((item,i) => (
                  <div key={i} style={{
                    display:"flex", alignItems:"flex-start", gap:10,
                    padding:"10px 0",
                    borderBottom: i<top.length-1 ? `1px solid ${T.border}` : "none",
                  }}>
                    <span style={{fontSize:11, fontWeight:600, color:T.muted,
                      fontFamily:"'DM Mono',monospace", minWidth:20, paddingTop:2}}>
                      {String(i+1).padStart(2,"0")}
                    </span>
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{display:"flex", alignItems:"center",
                        gap:7, marginBottom:4}}>
                        <span style={{fontSize:13, fontWeight:700,
                          color:pins.includes(item.ticker)?T.pin:T.bright,
                          whiteSpace:"nowrap"}}>
                          {sn(item.ticker||"")}
                        </span>
                        {pins.includes(item.ticker) &&
                          <span style={{fontSize:10}}>📌</span>}
                        <Badge signal={item.signal||"Neutral"} T={T}/>
                      </div>
                      <div style={{fontSize:11, color:T.dim,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                        {(item.headline||"").slice(0,46)}
                        {(item.headline||"").length>46?"…":""}
                      </div>
                    </div>
                    <div style={{display:"flex", flexDirection:"column",
                      gap:5, alignItems:"flex-end", flexShrink:0}}>
                      <span style={{fontSize:12, fontWeight:700,
                        color:sigColor(item.signal||"Neutral",T),
                        fontFamily:"'DM Mono',monospace"}}>
                        {pct(item.confidence||item.importance||0.5)}
                      </span>
                      <button
                        className={`pin-btn${pins.includes(item.ticker)?" active":""}`}
                        onClick={()=>togglePin(item.ticker)}>
                        {pins.includes(item.ticker)?"Unpin":"Pin"}
                      </button>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </>)}

        {/* ══════════════════ SIGNALS ══════════════════ */}
        {tab === "signals" && (<>
          {/* Filter bar */}
          <div style={{
            background:T.card, border:`1px solid ${T.border}`,
            borderRadius:12, padding:"14px 18px",
            marginBottom:16, display:"flex",
            gap:8, alignItems:"center", flexWrap:"wrap",
          }}>
            <span style={{fontSize:11, fontWeight:600, color:T.dim,
              textTransform:"uppercase", letterSpacing:"0.07em",
              marginRight:2, flexShrink:0}}>
              Signal
            </span>
            {["All","Bullish","Bearish","Neutral"].map(f => (
              <Pill key={f} label={f}
                color={f==="Bullish"?T.bull:f==="Bearish"?T.bear:f==="Neutral"?T.neut:null}
                active={fSig===f} onClick={()=>setFS(f)} T={T}/>
            ))}

            <div style={{width:1, height:22, background:T.border, margin:"0 4px"}}/>

            <span style={{fontSize:11, fontWeight:600, color:T.dim,
              textTransform:"uppercase", letterSpacing:"0.07em",
              marginRight:2, flexShrink:0}}>
              Sector
            </span>
            <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
              {SECTOR_LIST.map(s => (
                <Pill key={s} label={s} active={fSector===s} onClick={()=>setFSec(s)} T={T}/>
              ))}
              {pins.length > 0 && (
                <Pill label="📌 Pinned" active={fSector==="Pinned"}
                  color={T.pin} onClick={()=>setFSec("Pinned")} T={T}/>
              )}
            </div>

            <span style={{marginLeft:"auto", fontSize:12, fontWeight:500,
              color:T.dim, fontFamily:"'DM Mono',monospace", flexShrink:0}}>
              {filteredSigs.length} results
            </span>
          </div>

          {/* List */}
          <div style={{background:T.card, border:`1px solid ${T.border}`,
            borderRadius:14, overflow:"hidden"}}>
            {loading ? (
              <div style={{padding:56, textAlign:"center", color:T.dim, fontSize:14}}>
                Loading signals…
              </div>
            ) : filteredSigs.length === 0 ? (
              <div style={{padding:72, textAlign:"center"}}>
                <div style={{fontSize:44, marginBottom:12, opacity:0.2, lineHeight:1}}>◎</div>
                <div style={{fontSize:16, fontWeight:600, color:T.dim, marginBottom:6}}>
                  No signals for this filter
                </div>
                <div style={{fontSize:13, color:T.muted, maxWidth:360, margin:"0 auto 20px"}}>
                  {fSector !== "All"
                    ? "This sector filters Indian NSE tickers. Your current CSV may have US tickers — select All to see all signals."
                    : "No data yet. Run bulk_collect_v3.py to collect and label articles."}
                </div>
                {fSector !== "All" && (
                  <button onClick={()=>setFSec("All")} style={{
                    background:T.gold, color:"#100800", border:"none",
                    borderRadius:9, padding:"9px 22px", fontSize:13,
                    fontWeight:600, cursor:"pointer"}}>
                    Show All Signals →
                  </button>
                )}
              </div>
            ) : filteredSigs.map((s, i, arr) => {
              const ret    = s.return_24h ?? s.price_return_24h;
              const pinned = pins.includes(s.ticker);
              return (
                <div key={i} className="row-hover"
                  style={{
                    display:"flex", gap:18, padding:"15px 22px",
                    borderBottom: i<arr.length-1 ? `1px solid ${T.border}` : "none",
                    background: pinned ? T.pinSoft : "transparent",
                    alignItems:"flex-start",
                  }}>
                  {/* Left: ticker */}
                  <div style={{width:88, flexShrink:0}}>
                    <div style={{fontSize:13, fontWeight:700,
                      color:pinned?T.pin:T.bright, marginBottom:2}}>
                      {sn(s.ticker||"—")}
                    </div>
                    <div style={{fontSize:10, color:T.muted,
                      fontFamily:"'DM Mono',monospace"}}>{s.ticker}</div>
                  </div>

                  {/* Center: headline + meta */}
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:14, color:T.text, lineHeight:1.55,
                      marginBottom:9, fontWeight:400}}>
                      {s.headline || (s.summary||"").slice(0,120) || "—"}
                    </div>
                    <div style={{display:"flex", flexWrap:"wrap",
                      gap:8, alignItems:"center"}}>
                      <Badge signal={s.signal||"Neutral"} T={T}/>
                      {s.event_type && (
                        <span style={{fontSize:11, color:T.dim,
                          background:T.bgDeep, border:`1px solid ${T.border}`,
                          borderRadius:6, padding:"2px 9px", fontWeight:500}}>
                          {s.event_type.replace(/_/g," ")}
                        </span>
                      )}
                      {s.confidence != null && (
                        <span style={{fontSize:11, color:T.muted,
                          fontFamily:"'DM Mono',monospace"}}>
                          conf {f3(s.confidence)}
                        </span>
                      )}
                      {ret != null && (
                        <span style={{fontSize:12, fontWeight:700,
                          fontFamily:"'DM Mono',monospace",
                          color:ret>0?T.bull:ret<0?T.bear:T.muted}}>
                          {ret>0?"+":""}{(ret*100).toFixed(2)}%
                        </span>
                      )}
                      <span style={{marginLeft:"auto", fontSize:11, color:T.muted}}>
                        {s.source && `${s.source} · `}{ago(s.published_at)}
                      </span>
                    </div>
                  </div>

                  {/* Right: pin */}
                  <button
                    className={`pin-btn${pinned?" active":""}`}
                    onClick={()=>togglePin(s.ticker)}
                    style={{flexShrink:0, marginTop:3}}>
                    {pinned ? "📌 Pinned" : "📍 Pin"}
                  </button>
                </div>
              );
            })}
          </div>
        </>)}

        {/* ══════════════════ WATCHLIST ══════════════════ */}
        {tab === "watchlist" && (<>
          <div style={{display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:22}}>
            <div>
              <h1 style={{fontSize:24, fontWeight:700, color:T.bright,
                letterSpacing:"-0.01em", marginBottom:5}}>
                NSE · BSE Watchlist
              </h1>
              <p style={{fontSize:13, color:T.muted}}>
                {TICKERS.length} companies across Nifty 50, Next 50 &amp; emerging — click to filter signals
              </p>
            </div>
            <button onClick={()=>setPinMgr(true)} style={{
              display:"flex", alignItems:"center", gap:8, padding:"9px 18px",
              background:T.pinSoft, border:`1px solid ${T.pinBorder}`,
              borderRadius:10, cursor:"pointer", fontSize:13, fontWeight:500, color:T.pin,
            }}>
              📌 Manage Pins ({pins.length})
            </button>
          </div>

          {/* Sector pills */}
          <div style={{display:"flex", gap:7, flexWrap:"wrap", marginBottom:22}}>
            {SECTOR_LIST.map(s => (
              <Pill key={s} label={s} active={fSector===s} onClick={()=>setFSec(s)} T={T}/>
            ))}
          </div>

          {/* Company grid */}
          <div style={{display:"grid",
            gridTemplateColumns:"repeat(auto-fill,minmax(145px,1fr))", gap:10}}>
            {[...pins, ...TICKERS.filter(t=>!pins.includes(t))]
              .filter(t => fSector==="All" || (SECTORS[fSector]||[]).includes(t))
              .map(t => {
                const row    = signals.find(s=>s.ticker===t);
                const pinned = pins.includes(t);
                return (
                  <div key={t}
                    className={`watch-card${pinned?" pinned":""}`}
                    onClick={()=>{setTab("signals");}}>
                    <div style={{fontSize:13, fontWeight:700,
                      color:pinned?T.pin:T.bright, marginBottom:2}}>{sn(t)}</div>
                    <div style={{fontSize:10, color:T.muted,
                      fontFamily:"'DM Mono',monospace", marginBottom:9}}>{t}</div>
                    {row
                      ? <Badge signal={row.signal} T={T}/>
                      : <span style={{fontSize:11,color:T.muted}}>No data</span>}
                    <button
                      className={`pin-btn${pinned?" active":""}`}
                      onClick={e=>{e.stopPropagation();togglePin(t);}}
                      style={{marginTop:10, width:"100%", textAlign:"center"}}>
                      {pinned ? "📌 Unpin" : "📍 Pin"}
                    </button>
                  </div>
                );
              })}
          </div>
        </>)}

        {/* ══════════════════ NEWS ══════════════════ */}
        {tab === "news" && (<>
          <div style={{marginBottom:22}}>
            <h1 style={{fontSize:24, fontWeight:700, color:T.bright,
              letterSpacing:"-0.01em", marginBottom:5}}>News Feed</h1>
            <p style={{fontSize:13, color:T.muted}}>
              {news.length} articles · sourced from Finnhub &amp; Alpha Vantage
            </p>
          </div>
          <div style={{background:T.card, border:`1px solid ${T.border}`,
            borderRadius:14, overflow:"hidden"}}>
            {news.length === 0 ? (
              <div style={{padding:72, textAlign:"center"}}>
                <div style={{fontSize:44, marginBottom:12, opacity:0.2}}>📰</div>
                <div style={{fontSize:16, fontWeight:600, color:T.dim, marginBottom:6}}>
                  No news articles
                </div>
                <div style={{fontSize:13, color:T.muted}}>
                  Run bulk_collect_v3.py to gather news
                </div>
              </div>
            ) : news.map((n,i) => (
              <a key={i} href={n.url} target="_blank" rel="noreferrer"
                className="row-hover"
                style={{display:"block", textDecoration:"none",
                  padding:"16px 22px",
                  borderBottom:i<news.length-1?`1px solid ${T.border}`:"none"}}>
                <div style={{display:"flex", gap:14, alignItems:"flex-start"}}>
                  <span style={{fontSize:11, fontWeight:600, color:T.muted,
                    fontFamily:"'DM Mono',monospace", minWidth:26,
                    paddingTop:2, flexShrink:0}}>
                    {String(i+1).padStart(2,"0")}
                  </span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14, color:T.text, lineHeight:1.55,
                      marginBottom:8, fontWeight:400}}>
                      {n.headline || "(no headline)"}
                    </div>
                    <div style={{display:"flex", gap:12, fontSize:11,
                      color:T.muted, alignItems:"center"}}>
                      {n.ticker && (
                        <span style={{color:T.gold, fontWeight:600,
                          fontFamily:"'DM Mono',monospace"}}>{n.ticker}</span>
                      )}
                      {n.source && <span style={{fontWeight:500}}>{n.source}</span>}
                      <span>{ago(n.published_at)}</span>
                    </div>
                  </div>
                  <span style={{fontSize:11, color:T.muted, flexShrink:0, paddingTop:2}}>
                    ↗
                  </span>
                </div>
              </a>
            ))}
          </div>
        </>)}

      </main>
    </>
  );
}