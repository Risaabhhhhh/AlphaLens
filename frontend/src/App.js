import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
         Cell, PieChart, Pie } from "recharts";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

// ── Tokens ────────────────────────────────────────────────────────────────────
const C = {
  bg:      "#02040A",
  surf:    "#060C18",
  panel:   "#0A1020",
  border:  "#112240",
  line:    "#1A3060",
  muted:   "#2A4A7A",
  dim:     "#5A7FAA",
  text:    "#B8D0E8",
  bright:  "#E2F0FF",
  accent:  "#00D4FF",
  gold:    "#FFB800",
  bull:    "#00E676",
  bear:    "#FF3D57",
  neut:    "#FFB800",
};

const sc   = s => s==="Bullish"?C.bull:s==="Bearish"?C.bear:C.neut;
const arr  = s => s==="Bullish"?"▲":s==="Bearish"?"▼":"◆";
const pct  = n => n!=null?`${(n*100).toFixed(1)}%`:"—";
const f3   = n => n!=null?Number(n).toFixed(3):"—";
const ago  = ts => {
  if(!ts) return "";
  const d=(Date.now()-new Date(ts*1000||ts))/1000;
  if(d<3600) return `${Math.floor(d/60)}m ago`;
  if(d<86400) return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
};

// ── Reusable UI ───────────────────────────────────────────────────────────────
const Badge = ({signal,size="sm"}) => (
  <span style={{
    display:"inline-flex",alignItems:"center",gap:4,
    padding:size==="lg"?"5px 14px":"2px 8px",
    borderRadius:3,fontSize:size==="lg"?12:10,fontWeight:700,
    fontFamily:"monospace",letterSpacing:"0.06em",
    background:`${sc(signal)}15`,border:`1px solid ${sc(signal)}50`,
    color:sc(signal),
  }}>{arr(signal)} {signal.toUpperCase()}</span>
);

const Panel = ({title,children,style={}}) => (
  <div style={{background:C.panel,border:`1px solid ${C.border}`,
    borderRadius:8,...style}}>
    {title&&<div style={{padding:"11px 18px",borderBottom:`1px solid ${C.border}`,
      fontSize:9,color:C.dim,letterSpacing:"0.18em",fontFamily:"monospace"}}>
      {title}</div>}
    <div style={{padding:"16px 18px"}}>{children}</div>
  </div>
);

const Stat = ({label,value,color,sub}) => (
  <div style={{flex:1,minWidth:110,background:C.surf,
    border:`1px solid ${C.border}`,borderRadius:6,padding:"15px 18px"}}>
    <div style={{fontSize:9,color:C.muted,letterSpacing:"0.15em",
      marginBottom:8,fontFamily:"monospace"}}>{label}</div>
    <div style={{fontSize:26,fontWeight:800,color:color||C.bright,
      fontFamily:"monospace",lineHeight:1}}>{value??0}</div>
    {sub&&<div style={{fontSize:10,color:C.dim,marginTop:5,
      fontFamily:"monospace"}}>{sub}</div>}
  </div>
);

// ── Analyzer Modal ────────────────────────────────────────────────────────────
function AnalyzerModal({onClose}) {
  const [headline, setHeadline] = useState("");
  const [ticker,   setTicker]   = useState("");
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const examples = [
    "Nvidia reports record revenue, beats estimates by 20%",
    "Fed raises interest rates by 25 basis points",
    "Apple faces antitrust lawsuit over App Store practices",
    "Tesla launches new Model Y with extended battery range",
  ];

  const run = async () => {
    if(!headline.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await axios.post(`${API}/analyze`,
        {headline, ticker:ticker||null});
      setResult(res.data);
    } catch(e) {
      setError(e.response?.data?.detail||"API error — is FastAPI running?");
    } finally { setLoading(false); }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(2,4,10,0.92)",
      display:"flex",alignItems:"center",justifyContent:"center",
      zIndex:100,backdropFilter:"blur(6px)"}}>
      <div style={{background:C.panel,border:`1px solid ${C.border}`,
        borderRadius:12,padding:32,width:580,maxWidth:"95vw",
        boxShadow:`0 0 60px ${C.accent}10`}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:22}}>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:C.bright,
              fontFamily:"monospace",letterSpacing:"0.05em"}}>
              ⚡ HEADLINE ANALYZER
            </div>
            <div style={{fontSize:10,color:C.dim,marginTop:3}}>
              Paste any financial headline for instant analysis
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",
            color:C.muted,cursor:"pointer",fontSize:20,lineHeight:1}}>×</button>
        </div>

        {/* Input */}
        <textarea
          value={headline}
          onChange={e=>setHeadline(e.target.value)}
          placeholder="e.g. Nvidia announces record quarterly earnings..."
          rows={3}
          style={{width:"100%",background:C.surf,border:`1px solid ${C.line}`,
            borderRadius:6,padding:"10px 14px",color:C.text,fontSize:13,
            fontFamily:"monospace",outline:"none",resize:"none",
            lineHeight:1.5,marginBottom:10}}
        />

        {/* Examples */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:9,color:C.muted,marginBottom:6,
            fontFamily:"monospace",letterSpacing:"0.1em"}}>EXAMPLES</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {examples.map((ex,i) => (
              <button key={i} onClick={()=>setHeadline(ex)} style={{
                background:"transparent",border:`1px solid ${C.line}`,
                color:C.dim,borderRadius:3,padding:"3px 8px",
                fontSize:10,cursor:"pointer",fontFamily:"monospace"}}>
                {ex.slice(0,35)}...
              </button>
            ))}
          </div>
        </div>

        <div style={{display:"flex",gap:8,marginBottom:16}}>
          <input value={ticker} onChange={e=>setTicker(e.target.value.toUpperCase())}
            placeholder="TICKER (optional)"
            style={{width:130,background:C.surf,border:`1px solid ${C.line}`,
              borderRadius:5,padding:"9px 12px",color:C.accent,
              fontSize:12,fontFamily:"monospace",outline:"none"}}
          />
          <button onClick={run} disabled={loading||!headline.trim()} style={{
            flex:1,background:loading?C.muted:C.accent,color:C.bg,
            border:"none",borderRadius:5,padding:"9px 16px",
            fontSize:12,fontFamily:"monospace",cursor:"pointer",
            fontWeight:800,letterSpacing:"0.06em",
            transition:"background 0.2s",
          }}>{loading?"ANALYZING...":"RUN ANALYSIS →"}</button>
        </div>

        {error && <div style={{color:C.bear,fontSize:12,
          marginBottom:12,fontFamily:"monospace"}}>⚠ {error}</div>}

        {/* Results */}
        {result && (
          <div style={{background:C.surf,border:`1px solid ${C.line}`,
            borderRadius:8,padding:20,animation:"fadeIn 0.3s ease"}}>

            <div style={{fontSize:11,color:C.dim,fontFamily:"monospace",
              marginBottom:16,lineHeight:1.5,
              borderBottom:`1px solid ${C.border}`,paddingBottom:12}}>
              "{result.headline}"
            </div>

            {/* Metrics grid */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",
              gap:12,marginBottom:16}}>
              {[
                ["SENTIMENT",    result.sentiment?.toUpperCase(),
                 result.sentiment?.toLowerCase().includes("bull")||result.sentiment==="positive"
                   ? C.bull : result.sentiment?.toLowerCase().includes("bear")||result.sentiment==="negative"
                   ? C.bear : C.dim],
                ["CONF SCORE",   f3(result.confidence), C.text],
                ["EVENT TYPE",   result.event_type?.replace(/_/g," ").toUpperCase(), C.dim],
                ["IMPACT PROB",  pct(result.impact_probability), C.accent],
                ["IMPORTANCE",   pct(result.importance), C.text],
                ["TICKER",       result.ticker||"—", C.accent],
              ].map(([label,val,color])=>(
                <div key={label}>
                  <div style={{fontSize:8,color:C.muted,letterSpacing:"0.12em",
                    marginBottom:4,fontFamily:"monospace"}}>{label}</div>
                  <div style={{fontSize:12,color,fontFamily:"monospace",
                    fontWeight:700,textTransform:"uppercase"}}>{val}</div>
                </div>
              ))}
            </div>

            {/* Signal bar */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <Badge signal={result.signal} size="lg"/>
              <div style={{flex:1,height:6,borderRadius:3,
                background:C.bg,overflow:"hidden"}}>
                <div style={{width:pct(result.impact_probability),height:"100%",
                  background:sc(result.signal),
                  transition:"width 0.6s cubic-bezier(0.34,1.56,0.64,1)"}}/>
              </div>
              <span style={{fontSize:12,color:sc(result.signal),
                fontFamily:"monospace",fontWeight:700}}>
                {pct(result.impact_probability)}
              </span>
            </div>

            {/* Drivers */}
            {result.drivers?.length>0 && (
              <div>
                <div style={{fontSize:9,color:C.muted,letterSpacing:"0.12em",
                  marginBottom:8,fontFamily:"monospace"}}>PREDICTION DRIVERS</div>
                {result.drivers.map((d,i)=>(
                  <div key={i} style={{fontSize:11,color:C.text,
                    padding:"4px 0",fontFamily:"monospace",
                    borderBottom:i<result.drivers.length-1?`1px solid ${C.border}`:"none"}}>
                    {d}
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

// ── Top Signals Panel ─────────────────────────────────────────────────────────
function TopSignals({data}) {
  return (
    <Panel title="TOP SIGNALS TODAY" style={{height:"100%"}}>
      {data.length===0
        ? <div style={{color:C.muted,fontSize:12,textAlign:"center",
            padding:"20px 0"}}>No data yet</div>
        : data.map((item,i)=>(
          <div key={i} style={{
            display:"flex",alignItems:"center",gap:12,
            padding:"10px 0",
            borderBottom:i<data.length-1?`1px solid ${C.border}`:"none",
          }}>
            <div style={{fontSize:14,color:C.muted,fontFamily:"monospace",
              minWidth:20}}>{i+1}</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <span style={{fontSize:13,fontWeight:700,color:C.accent,
                  fontFamily:"monospace"}}>{item.ticker}</span>
                <Badge signal={item.signal}/>
              </div>
              <div style={{fontSize:11,color:C.dim,lineHeight:1.4,
                fontFamily:"monospace"}}>
                {item.headline?.slice(0,60)}
                {item.headline?.length>60?"...":""}
              </div>
            </div>
            <div style={{textAlign:"right",minWidth:50}}>
              <div style={{fontSize:12,color:sc(item.signal),
                fontFamily:"monospace",fontWeight:700}}>
                {pct(item.confidence||item.importance||0.5)}
              </div>
              <div style={{fontSize:9,color:C.muted,fontFamily:"monospace"}}>
                CONF
              </div>
            </div>
          </div>
        ))
      }
    </Panel>
  );
}

// ── Signal Feed Row ───────────────────────────────────────────────────────────
function SignalRow({item}) {
  const sentiment = item._sentiment || item.sentiment || item.av_sentiment || "neutral";
  const ret = item.return_24h ?? item.price_return_24h;

  return (
    <div style={{display:"flex",gap:14,padding:"13px 18px",
      borderBottom:`1px solid ${C.border}`,alignItems:"flex-start"}}>
      <div style={{minWidth:54,fontSize:11,fontWeight:700,color:C.accent,
        fontFamily:"monospace",paddingTop:2}}>
        {item.ticker||"—"}
      </div>
      <div style={{flex:1}}>
        <div style={{fontSize:13,color:C.text,lineHeight:1.45,marginBottom:6}}>
          {item.headline||(item.summary||"").slice(0,100)||"—"}
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:7,alignItems:"center"}}>
          <Badge signal={item.signal||"Neutral"}/>
          {item.event_type&&(
            <span style={{fontSize:9,color:C.dim,background:C.surf,
              border:`1px solid ${C.line}`,borderRadius:3,
              padding:"2px 7px",fontFamily:"monospace",letterSpacing:"0.08em"}}>
              {item.event_type.replace(/_/g," ").toUpperCase()}
            </span>
          )}
          {item.confidence!=null&&(
            <span style={{fontSize:10,color:C.muted,fontFamily:"monospace"}}>
              CONF {f3(item.confidence)}
            </span>
          )}
          {ret!=null&&(
            <span style={{fontSize:10,fontFamily:"monospace",
              color:ret>0?C.bull:ret<0?C.bear:C.muted}}>
              RET {(ret*100).toFixed(2)}%
            </span>
          )}
          <span style={{marginLeft:"auto",fontSize:10,color:C.muted,
            fontFamily:"monospace"}}>
            {item.source&&`${item.source} · `}
            {ago(item.published_at||item.datetime)}
          </span>
        </div>
      </div>
      {/* Confidence bar */}
      <div style={{minWidth:60,paddingTop:3}}>
        <div style={{fontSize:8,color:C.muted,fontFamily:"monospace",
          marginBottom:4,textAlign:"right"}}>CONF</div>
        <div style={{height:3,background:C.bg,borderRadius:2,overflow:"hidden"}}>
          <div style={{width:pct(item.confidence||0.5),height:"100%",
            background:sc(item.signal||"Neutral"),borderRadius:2}}/>
        </div>
        <div style={{fontSize:10,color:sc(item.signal||"Neutral"),
          fontFamily:"monospace",textAlign:"right",marginTop:3}}>
          {pct(item.confidence||0.5)}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab,       setTab]     = useState("dashboard");
  const [signals,   setSigs]    = useState([]);
  const [top,       setTop]     = useState([]);
  const [news,      setNews]    = useState([]);
  const [summary,   setSum]     = useState({});
  const [modelInfo, setModel]   = useState({});
  const [fSig,      setFS]      = useState("All");
  const [fTick,     setFT]      = useState("");
  const [loading,   setLoad]    = useState(true);
  const [showAnal,  setAnal]    = useState(false);
  const [lastUpd,   setUpd]     = useState(null);

  const WATCHLIST = ["AAPL","NVDA","MSFT","GOOGL","META","TSLA","AMZN","JPM","AMD","NFLX"];

  const fetchAll = useCallback(async () => {
    try {
      const params = {};
      if(fSig!=="All") params.signal = fSig;
      if(fTick)        params.ticker = fTick;

      const [s,t,n,sm,m] = await Promise.all([
        axios.get(`${API}/signals`, {params:{...params,limit:80}}),
        axios.get(`${API}/top`,     {params:{limit:8}}),
        axios.get(`${API}/news`,    {params:{limit:25}}),
        axios.get(`${API}/summary`),
        axios.get(`${API}/model/info`),
      ]);
      setSigs(s.data||[]);
      setTop(t.data||[]);
      setNews(n.data||[]);
      setSum(sm.data||{});
      setModel(m.data||{});
      setUpd(new Date());
    } catch(e) {
      console.error("Fetch error:", e.message);
    } finally { setLoad(false); }
  }, [fSig, fTick]);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 30000);
    return () => clearInterval(t);
  }, [fetchAll]);

  // Chart data
  const pieData = [
    {name:"Bullish", value:summary.bullish||0, color:C.bull},
    {name:"Neutral", value:summary.neutral||0, color:C.neut},
    {name:"Bearish", value:summary.bearish||0, color:C.bear},
  ].filter(d=>d.value>0);

  const tickerBar = (summary.top_signals||[]).map(t=>({
    ticker:t.ticker, count:t.count,
    fill: t.signal==="Bullish"?C.bull:t.signal==="Bearish"?C.bear:C.neut,
  }));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne+Mono&family=DM+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${C.bg};color:${C.text};font-family:'DM Sans',sans-serif}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:${C.surf}}
        ::-webkit-scrollbar-thumb{background:${C.line};border-radius:2px}
        @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
        @keyframes glow{0%,100%{box-shadow:0 0 8px ${C.accent}30}50%{box-shadow:0 0 20px ${C.accent}60}}
      `}</style>

      {showAnal && <AnalyzerModal onClose={()=>setAnal(false)}/>}

      {/* ── Header ── */}
      <div style={{height:54,background:C.surf,borderBottom:`1px solid ${C.border}`,
        display:"flex",alignItems:"center",padding:"0 28px",gap:16,
        position:"sticky",top:0,zIndex:50}}>

        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:C.accent,
            animation:"glow 2s ease-in-out infinite"}}/>
          <span style={{fontSize:15,fontWeight:700,color:C.bright,
            fontFamily:"Syne Mono,monospace",letterSpacing:"0.1em"}}>
            ALPHALENS
          </span>
        </div>

        <div style={{width:1,height:22,background:C.border}}/>
        <span style={{fontSize:10,color:C.muted,fontFamily:"monospace",
          letterSpacing:"0.1em"}}>FINANCIAL NEWS INTELLIGENCE</span>

        {/* Nav */}
        <div style={{display:"flex",gap:2,marginLeft:24}}>
          {[
            ["dashboard","DASHBOARD"],
            ["signals","SIGNALS"],
            ["news","NEWS FEED"],
          ].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{
              background:tab===id?`${C.accent}15`:"transparent",
              color:tab===id?C.accent:C.muted,
              border:`1px solid ${tab===id?C.accent+"40":"transparent"}`,
              borderRadius:4,padding:"5px 14px",
              fontSize:10,fontFamily:"monospace",cursor:"pointer",
              letterSpacing:"0.08em",transition:"all 0.15s",
            }}>{label}</button>
          ))}
        </div>

        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,background:C.panel,
            border:`1px solid ${C.border}`,borderRadius:4,padding:"4px 10px"}}>
            <span style={{width:6,height:6,borderRadius:"50%",display:"inline-block",
              background:modelInfo.status==="loaded"?C.bull:C.bear}}/>
            <span style={{fontSize:9,color:C.dim,fontFamily:"monospace",
              letterSpacing:"0.1em"}}>
              MODEL {modelInfo.status==="loaded"?"ACTIVE":"OFFLINE"}
            </span>
            {modelInfo.test_auc&&(
              <span style={{fontSize:9,color:C.accent,fontFamily:"monospace",
                marginLeft:4}}>AUC {modelInfo.test_auc}</span>
            )}
          </div>

          <button onClick={()=>setAnal(true)} style={{
            background:C.accent,color:C.bg,border:"none",borderRadius:5,
            padding:"7px 16px",fontSize:11,fontFamily:"Syne Mono,monospace",
            cursor:"pointer",fontWeight:700,letterSpacing:"0.06em",
          }}>⚡ ANALYZE HEADLINE</button>

          <span style={{fontSize:9,color:C.muted,fontFamily:"monospace"}}>
            {lastUpd?lastUpd.toLocaleTimeString():"—"}
          </span>
        </div>
      </div>

      <div style={{maxWidth:1500,margin:"0 auto",padding:"22px 28px"}}>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* DASHBOARD TAB                                                     */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab==="dashboard" && (
          <>
            {/* Stats */}
            <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
              <Stat label="TOTAL ARTICLES" value={summary.total??0} color={C.accent}/>
              <Stat label="BULLISH" value={summary.bullish??0} color={C.bull}
                sub={summary.total?`${pct((summary.bullish||0)/summary.total)} of total`:null}/>
              <Stat label="BEARISH" value={summary.bearish??0} color={C.bear}
                sub={summary.total?`${pct((summary.bearish||0)/summary.total)} of total`:null}/>
              <Stat label="NEUTRAL" value={summary.neutral??0} color={C.neut}/>
              <Stat label="AVG 24H RETURN"
                value={summary.avg_return!=null?`${(summary.avg_return*100).toFixed(2)}%`:"—"}
                color={summary.avg_return>0?C.bull:summary.avg_return<0?C.bear:C.text}/>
              <Stat label="MODEL AUC"
                value={modelInfo.test_auc??"—"} color={C.accent}
                sub={modelInfo.n_samples?`${modelInfo.n_samples} samples`:null}/>
            </div>

            {/* Charts + Top signals */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1.4fr",
              gap:14,marginBottom:20}}>
              {/* Pie */}
              <Panel title="SIGNAL DISTRIBUTION">
                {pieData.length===0
                  ? <div style={{height:150,display:"flex",alignItems:"center",
                      justifyContent:"center",color:C.muted,fontSize:12}}>No data</div>
                  : <div style={{display:"flex",alignItems:"center",gap:16}}>
                      <ResponsiveContainer width={130} height={130}>
                        <PieChart>
                          <Pie data={pieData} innerRadius={36} outerRadius={55}
                            dataKey="value" strokeWidth={0}>
                            {pieData.map((d,i)=><Cell key={i} fill={d.color}/>)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{flex:1}}>
                        {pieData.map(d=>(
                          <div key={d.name} style={{display:"flex",
                            justifyContent:"space-between",marginBottom:10}}>
                            <span style={{display:"flex",alignItems:"center",
                              gap:6,fontSize:11,color:C.dim}}>
                              <span style={{width:8,height:8,borderRadius:"50%",
                                background:d.color,display:"inline-block"}}/>
                              {d.name}
                            </span>
                            <span style={{fontSize:13,color:d.color,
                              fontFamily:"monospace",fontWeight:700}}>
                              {d.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                }
              </Panel>

              {/* Bar */}
              <Panel title="ACTIVE TICKERS">
                {tickerBar.length===0
                  ? <div style={{height:150,display:"flex",alignItems:"center",
                      justifyContent:"center",color:C.muted,fontSize:12}}>No data</div>
                  : <ResponsiveContainer width="100%" height={150}>
                      <BarChart data={tickerBar} layout="vertical" barSize={10}>
                        <XAxis type="number" hide/>
                        <YAxis type="category" dataKey="ticker" width={44}
                          tick={{fill:C.accent,fontSize:11,fontFamily:"monospace"}}
                          axisLine={false} tickLine={false}/>
                        <Tooltip contentStyle={{background:C.panel,
                          border:`1px solid ${C.border}`,fontSize:11}}/>
                        <Bar dataKey="count" radius={[0,3,3,0]}>
                          {tickerBar.map((d,i)=>(
                            <Cell key={i} fill={d.fill} opacity={0.8}/>
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                }
              </Panel>

              {/* Top signals */}
              <TopSignals data={top}/>
            </div>

            {/* Watchlist quick view */}
            <Panel title="WATCHLIST">
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {WATCHLIST.map(t=>{
                  const rows = signals.filter(s=>s.ticker===t);
                  const latest = rows[0];
                  return (
                    <div key={t} onClick={()=>{setFT(t);setTab("signals");}}
                      style={{
                        background:C.surf,border:`1px solid ${
                          latest?sc(latest.signal)+"40":C.border}`,
                        borderRadius:6,padding:"10px 14px",
                        cursor:"pointer",minWidth:90,
                        transition:"all 0.15s",
                      }}>
                      <div style={{fontSize:13,fontWeight:700,color:C.accent,
                        fontFamily:"monospace",marginBottom:5}}>{t}</div>
                      {latest
                        ? <Badge signal={latest.signal}/>
                        : <span style={{fontSize:10,color:C.muted}}>no data</span>
                      }
                    </div>
                  );
                })}
              </div>
            </Panel>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* SIGNALS TAB                                                       */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab==="signals" && (
          <>
            {/* Filter bar */}
            <div style={{background:C.panel,border:`1px solid ${C.border}`,
              borderRadius:"6px 6px 0 0",
              borderBottom:"none",borderTop:`2px solid ${C.accent}`,
              padding:"11px 16px",display:"flex",gap:8,
              alignItems:"center",flexWrap:"wrap",marginBottom:0}}>

              <span style={{fontSize:9,color:C.muted,fontFamily:"monospace",
                marginRight:4,letterSpacing:"0.12em"}}>SIGNAL</span>
              {["All","Bullish","Bearish","Neutral"].map(f=>(
                <button key={f} onClick={()=>setFS(f)} style={{
                  background:fSig===f?`${sc(f==="All"?C.neut:f)}15`:"transparent",
                  color:fSig===f?C.bright:C.muted,
                  border:`1px solid ${fSig===f?C.line:"transparent"}`,
                  borderRadius:3,padding:"3px 11px",fontSize:10,
                  fontFamily:"monospace",cursor:"pointer",letterSpacing:"0.06em",
                }}>{f.toUpperCase()}</button>
              ))}

              <div style={{width:1,height:18,background:C.line,margin:"0 4px"}}/>

              <span style={{fontSize:9,color:C.muted,fontFamily:"monospace",
                letterSpacing:"0.12em"}}>TICKER</span>
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {WATCHLIST.map(t=>(
                  <button key={t} onClick={()=>setFT(fTick===t?"":t)} style={{
                    background:fTick===t?`${C.accent}20`:"transparent",
                    color:fTick===t?C.accent:C.muted,
                    border:`1px solid ${fTick===t?C.accent:C.line}`,
                    borderRadius:3,padding:"3px 9px",fontSize:11,
                    fontFamily:"monospace",cursor:"pointer",
                  }}>{t}</button>
                ))}
              </div>
              {fTick&&<button onClick={()=>setFT("")} style={{
                background:"none",color:C.muted,border:"none",
                cursor:"pointer",fontSize:16}}>×</button>}
              <span style={{marginLeft:"auto",fontSize:10,color:C.muted,
                fontFamily:"monospace"}}>{signals.length} results</span>
            </div>

            <div style={{background:C.panel,border:`1px solid ${C.border}`,
              borderTop:"none",borderRadius:"0 0 8px 8px"}}>
              {loading
                ? <div style={{padding:40,textAlign:"center",color:C.muted,
                    fontFamily:"monospace",fontSize:12}}>LOADING...</div>
                : signals.length===0
                ? <div style={{padding:40,textAlign:"center",color:C.muted}}>
                    <div style={{fontSize:28,marginBottom:12,color:C.line}}>⊘</div>
                    No signals. Run the pipeline first.
                  </div>
                : signals.map((s,i)=><SignalRow key={i} item={s}/>)
              }
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* NEWS TAB                                                          */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab==="news" && (
          <Panel title={`RAW NEWS FEED — ${news.length} ARTICLES`}>
            {news.length===0
              ? <div style={{padding:30,textAlign:"center",color:C.muted}}>
                  No raw news files in data/raw/
                </div>
              : news.map((n,i)=>(
                <div key={i} style={{padding:"13px 0",
                  borderBottom:i<news.length-1?`1px solid ${C.border}`:"none"}}>
                  <a href={n.url} target="_blank" rel="noreferrer"
                    style={{fontSize:13,color:C.text,textDecoration:"none",
                      lineHeight:1.45,display:"block",marginBottom:5,
                      transition:"color 0.15s"}}
                    onMouseEnter={e=>e.target.style.color=C.accent}
                    onMouseLeave={e=>e.target.style.color=C.text}>
                    {n.headline||(n.summary||"").slice(0,100)||"(no headline)"}
                  </a>
                  <div style={{display:"flex",gap:12,fontSize:10,
                    color:C.muted,fontFamily:"monospace"}}>
                    {n.ticker&&<span style={{color:C.accent}}>{n.ticker}</span>}
                    {n.source&&<span>{n.source}</span>}
                    <span>{ago(n.published_at)}</span>
                  </div>
                </div>
              ))
            }
          </Panel>
        )}

      </div>
    </>
  );
}