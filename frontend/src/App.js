import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from "recharts";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

// ─── Tokens ──────────────────────────────────────────────────────────────────
const D = {
  bg:        "#0B0D14",
  surface:   "#11131C",
  card:      "#161923",
  cardHover: "#1C2030",
  border:    "#1E2236",
  borderHi:  "#2E3452",
  muted:     "#343852",
  dim:       "#5C6488",
  sub:       "#8890B8",
  text:      "#C2C8E8",
  bright:    "#E8EBF8",
  gold:      "#C9A84C",
  goldDim:   "#6B5520",
  goldSoft:  "#C9A84C12",
  bull:      "#2EBD7A",
  bullSoft:  "#2EBD7A12",
  bullBord:  "#2EBD7A35",
  bear:      "#E05252",
  bearSoft:  "#E0525212",
  bearBord:  "#E0525235",
  neut:      "#C9A84C",
  neutSoft:  "#C9A84C12",
  neutBord:  "#C9A84C35",
  pin:       "#F08040",
  pinSoft:   "#F0804012",
  pinBord:   "#F0804035",
  info:      "#4A8FD4",
  infoSoft:  "#4A8FD412",
};
const L = {
  bg:        "#F5F3EE",
  surface:   "#FFFFFF",
  card:      "#FFFFFF",
  cardHover: "#F8F7F2",
  border:    "#E4E1D8",
  borderHi:  "#C8C4B8",
  muted:     "#C0BDB0",
  dim:       "#7A7568",
  sub:       "#5A5448",
  text:      "#2C2A24",
  bright:    "#111008",
  gold:      "#9A6E1C",
  goldDim:   "#D4AA60",
  goldSoft:  "#9A6E1C10",
  bull:      "#177A4A",
  bullSoft:  "#177A4A0C",
  bullBord:  "#177A4A30",
  bear:      "#B83030",
  bearSoft:  "#B830300C",
  bearBord:  "#B8303030",
  neut:      "#9A6E1C",
  neutSoft:  "#9A6E1C0C",
  neutBord:  "#9A6E1C30",
  pin:       "#C05818",
  pinSoft:   "#C058180C",
  pinBord:   "#C0581830",
  info:      "#2A6FBE",
  infoSoft:  "#2A6FBE10",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const sc  = (s,T) => s==="Bullish"?T.bull:s==="Bearish"?T.bear:T.neut;
const ss  = (s,T) => s==="Bullish"?T.bullSoft:s==="Bearish"?T.bearSoft:T.neutSoft;
const sb  = (s,T) => s==="Bullish"?T.bullBord:s==="Bearish"?T.bearBord:T.neutBord;
const arr = s => s==="Bullish"?"↑":s==="Bearish"?"↓":"→";
const pct = n => n!=null?`${(n*100).toFixed(1)}%`:"—";
const f2  = n => n!=null?Number(n).toFixed(2):"—";
const f3  = n => n!=null?Number(n).toFixed(3):"—";
const ago = ts => {
  if(!ts) return "";
  const d=(Date.now()-new Date(ts*1000||ts))/1000;
  if(d<60)   return "just now";
  if(d<3600) return `${Math.floor(d/60)}m ago`;
  if(d<86400)return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
};

// ─── Company data ─────────────────────────────────────────────────────────────
const NAMES = {
  "RELIANCE.NS":"Reliance Industries","TCS.NS":"Tata Consultancy Services",
  "HDFCBANK.NS":"HDFC Bank","INFY.NS":"Infosys","ICICIBANK.NS":"ICICI Bank",
  "HINDUNILVR.NS":"Hindustan Unilever","ITC.NS":"ITC Limited","SBIN.NS":"State Bank of India",
  "BHARTIARTL.NS":"Bharti Airtel","KOTAKBANK.NS":"Kotak Mahindra Bank",
  "LT.NS":"Larsen & Toubro","AXISBANK.NS":"Axis Bank","ASIANPAINT.NS":"Asian Paints",
  "MARUTI.NS":"Maruti Suzuki","SUNPHARMA.NS":"Sun Pharmaceutical","WIPRO.NS":"Wipro",
  "BAJFINANCE.NS":"Bajaj Finance","NESTLEIND.NS":"Nestlé India","TITAN.NS":"Titan Company",
  "ADANIENT.NS":"Adani Enterprises","TATAMOTORS.NS":"Tata Motors","TATASTEEL.NS":"Tata Steel",
  "JSWSTEEL.NS":"JSW Steel","ONGC.NS":"ONGC","NTPC.NS":"NTPC","POWERGRID.NS":"Power Grid Corp",
  "COALINDIA.NS":"Coal India","HINDALCO.NS":"Hindalco Industries","ADANIPORTS.NS":"Adani Ports",
  "HDFCLIFE.NS":"HDFC Life Insurance","SBILIFE.NS":"SBI Life Insurance",
  "APOLLOHOSP.NS":"Apollo Hospitals","DIVISLAB.NS":"Divi's Laboratories",
  "INDUSINDBK.NS":"IndusInd Bank","EICHERMOT.NS":"Eicher Motors","BRITANNIA.NS":"Britannia",
  "BAJAJFINSV.NS":"Bajaj Finserv","BPCL.NS":"Bharat Petroleum","HEROMOTOCO.NS":"Hero MotoCorp",
  "ULTRACEMCO.NS":"UltraTech Cement","ZOMATO.NS":"Zomato","PAYTM.NS":"Paytm",
  "NYKAA.NS":"Nykaa","DMART.NS":"Avenue Supermarts","INDIGO.NS":"IndiGo",
  "IRCTC.NS":"IRCTC","HAL.NS":"Hindustan Aeronautics","BEL.NS":"Bharat Electronics",
  "BHEL.NS":"BHEL","DRREDDY.NS":"Dr. Reddy's Laboratories","CIPLA.NS":"Cipla",
  "LUPIN.NS":"Lupin","BIOCON.NS":"Biocon","DIVISLAB.NS":"Divi's Labs",
  "HCLTECH.NS":"HCL Technologies","TECHM.NS":"Tech Mahindra","PERSISTENT.NS":"Persistent Systems",
  "LTIM.NS":"LTIMindtree","TATAELXSI.NS":"Tata Elxsi","NAZARA.NS":"Nazara Technologies",
  "DELHIVERY.NS":"Delhivery","POLICYBZR.NS":"PolicyBazaar","MAPMYINDIA.NS":"MapMyIndia",
  "M&M.NS":"Mahindra & Mahindra","BAJAJ-AUTO.NS":"Bajaj Auto","TVSMOTOR.NS":"TVS Motor",
  "MPHASIS.NS":"Mphasis","COFORGE.NS":"Coforge","IRFC.NS":"IRFC","ABB.NS":"ABB India",
  "VEDL.NS":"Vedanta","SAIL.NS":"SAIL","NMDC.NS":"NMDC","GLAND.NS":"Gland Pharma",
};
const sn  = t => NAMES[t]||t.replace(".NS","");
const sn2 = t => { const n=NAMES[t]||t.replace(".NS",""); return n.length>18?n.slice(0,16)+"…":n; };
const initials = t => { const n=sn(t); return n.split(/[\s&]+/).slice(0,2).map(w=>w[0]).join("").toUpperCase(); };

const SECTORS = {
  "Banking":  ["HDFCBANK.NS","ICICIBANK.NS","SBIN.NS","KOTAKBANK.NS","AXISBANK.NS","INDUSINDBK.NS"],
  "IT":       ["TCS.NS","INFY.NS","WIPRO.NS","HCLTECH.NS","TECHM.NS","MPHASIS.NS","LTIM.NS","PERSISTENT.NS","TATAELXSI.NS","COFORGE.NS"],
  "FMCG":     ["HINDUNILVR.NS","ITC.NS","NESTLEIND.NS","BRITANNIA.NS","DABUR.NS","MARICO.NS","GODREJCP.NS","COLPAL.NS","TATACONSUM.NS"],
  "Pharma":   ["SUNPHARMA.NS","CIPLA.NS","DRREDDY.NS","LUPIN.NS","BIOCON.NS","DIVISLAB.NS","ALKEM.NS","AUROPHARMA.NS","TORNTPHARM.NS"],
  "Auto":     ["MARUTI.NS","TATAMOTORS.NS","M&M.NS","BAJAJ-AUTO.NS","HEROMOTOCO.NS","TVSMOTOR.NS","EICHERMOT.NS"],
  "Finance":  ["BAJFINANCE.NS","BAJAJFINSV.NS","MUTHOOTFIN.NS","CHOLAFIN.NS","SHRIRAMFIN.NS","IRFC.NS"],
  "Energy":   ["RELIANCE.NS","ONGC.NS","BPCL.NS","COALINDIA.NS","NTPC.NS","POWERGRID.NS"],
  "Metals":   ["TATASTEEL.NS","JSWSTEEL.NS","HINDALCO.NS","VEDL.NS","SAIL.NS","NMDC.NS"],
  "Defence":  ["HAL.NS","BEL.NS","BHEL.NS"],
  "Digital":  ["ZOMATO.NS","IRCTC.NS","INDIGO.NS","PAYTM.NS","POLICYBZR.NS","DELHIVERY.NS","NAZARA.NS","MAPMYINDIA.NS"],
};

const PINS_KEY  = "al_pins_v5";
const THEME_KEY = "al_theme_v2";
const CHAT_KEY  = "al_chat_v1";
const loadPins  = () => { try { return JSON.parse(localStorage.getItem(PINS_KEY)||"[]"); } catch { return []; }};

// ─── Quick prompts for the AI panel ──────────────────────────────────────────
const QUICK_PROMPTS = [
  { label:"📊 Market overview", text:"Give me a quick overview of Indian markets today — which sectors are showing bullish signals?" },
  { label:"🏦 Best banking stock", text:"Based on current signals, which Indian banking stock looks strongest right now?" },
  { label:"⚠️ Biggest risks", text:"What are the biggest risk signals I should be watching in Indian markets this week?" },
  { label:"💡 Underrated pick", text:"Which Indian mid-cap or small-cap stock has an unusually strong signal that most investors might be missing?" },
  { label:"🔄 Sector rotation", text:"Is there any evidence of sector rotation happening in Indian markets right now?" },
  { label:"📈 IT sector", text:"What's the overall signal picture for Indian IT stocks? Is the sector bullish or bearish?" },
  { label:"🛡️ Defence theme", text:"The Indian defence sector has been hot. What's the current signal strength for HAL, BEL, and BHEL?" },
  { label:"💊 Pharma watch", text:"Any strong Pharma signals right now? FDA news or earnings that moved the needle?" },
];

// ─── Analyze examples ─────────────────────────────────────────────────────────
const EXAMPLES = [
  "Reliance Industries Q3 net profit rises 18%, Jio ARPU beats estimates",
  "RBI keeps repo rate unchanged at 6.5% in unanimous decision",
  "Infosys cuts FY25 guidance, BFSI demand remains weak",
  "HAL secures ₹18,000 crore contract for fighter jet production",
  "Zomato crosses 3 million daily orders, narrows quarterly loss",
  "USFDA issues warning letter to Sun Pharma's Halol facility",
];

// ─── Storage ─────────────────────────────────────────────────────────────────
const loadChat = () => { try { return JSON.parse(localStorage.getItem(CHAT_KEY)||"[]"); } catch { return []; }};
const saveChat = msgs => localStorage.setItem(CHAT_KEY, JSON.stringify(msgs.slice(-40)));

// ═════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═════════════════════════════════════════════════════════════════════════════

// Signal badge
const Badge = ({signal, T, lg, sm}) => (
  <span style={{
    display:"inline-flex", alignItems:"center", gap: lg?5:4,
    padding: lg?"5px 14px":sm?"2px 7px":"3px 9px",
    borderRadius:6, fontWeight:600,
    fontSize: lg?13:sm?10:11,
    fontFamily:"'DM Mono',monospace",
    background:ss(signal,T), border:`1px solid ${sb(signal,T)}`,
    color:sc(signal,T), letterSpacing:"0.02em", whiteSpace:"nowrap",
  }}>
    <span style={{fontSize: lg?14:sm?10:12}}>{arr(signal)}</span>
    {signal}
  </span>
);

// Confidence bar
const ConfBar = ({value, signal, T}) => (
  <div style={{display:"flex", alignItems:"center", gap:8}}>
    <div style={{flex:1, height:4, borderRadius:2,
      background:T.border, overflow:"hidden"}}>
      <div style={{width:`${Math.round((value||0.5)*100)}%`, height:"100%",
        background:sc(signal,T), borderRadius:2,
        transition:"width 0.6s cubic-bezier(0.34,1.2,0.64,1)"}}/>
    </div>
    <span style={{fontSize:11, fontFamily:"'DM Mono',monospace",
      color:sc(signal,T), fontWeight:600, minWidth:32}}>
      {Math.round((value||0.5)*100)}%
    </span>
  </div>
);

// Avatar
const Avatar = ({ticker, T, size=38}) => {
  const colors = [T.info,T.bull,T.gold,T.pin,T.bear];
  const idx    = ticker.charCodeAt(0)%colors.length;
  return (
    <div style={{width:size, height:size, borderRadius:9, flexShrink:0,
      background:colors[idx]+"22", border:`1px solid ${colors[idx]}40`,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize: size>38?14:11, fontWeight:600, color:colors[idx],
      fontFamily:"'DM Mono',monospace"}}>
      {initials(ticker)}
    </div>
  );
};

// Pill filter button
const Pill = ({label, active, color, onClick, T}) => (
  <button onClick={onClick} style={{
    padding:"5px 13px", borderRadius:20,
    border:`1px solid ${active?(color||T.gold)+"55":T.border}`,
    background:active?(color||T.gold)+"12":"transparent",
    color:active?(color||T.gold):T.dim,
    fontSize:12, fontWeight:500, cursor:"pointer",
    transition:"all 0.15s", whiteSpace:"nowrap",
  }}>
    {label}
  </button>
);

// Section header
const Sec = ({children, T, action}) => (
  <div style={{display:"flex", alignItems:"center", justifyContent:"space-between",
    marginBottom:14}}>
    <div style={{display:"flex", alignItems:"center", gap:9}}>
      <div style={{width:3, height:16, background:T.gold, borderRadius:2}}/>
      <span style={{fontSize:11, fontWeight:600, color:T.dim,
        letterSpacing:"0.1em", textTransform:"uppercase"}}>{children}</span>
    </div>
    {action}
  </div>
);

// ─── Signal Card (Discover grid) ──────────────────────────────────────────────
const SigCard = ({item, T, pins, onPin, onClick}) => {
  const pinned = pins.includes(item.ticker);
  const ret    = item.return_24h ?? item.price_return_24h;
  return (
    <div onClick={onClick} style={{
      background:T.card, border:`1px solid ${pinned?T.pinBord:T.border}`,
      borderRadius:12, padding:"15px 16px", cursor:"pointer",
      transition:"all 0.2s", position:"relative",
      boxShadow: pinned?`0 0 0 1px ${T.pinBord}`:"none",
    }}
    onMouseEnter={e=>{e.currentTarget.style.borderColor=sc(item.signal,T)+"55";e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 8px 24px ${T.bg}`;}}
    onMouseLeave={e=>{e.currentTarget.style.borderColor=pinned?T.pinBord:T.border;e.currentTarget.style.transform="";e.currentTarget.style.boxShadow=pinned?`0 0 0 1px ${T.pinBord}`:"none";}}>

      {/* Left accent */}
      <div style={{position:"absolute", left:0, top:12, bottom:12,
        width:3, borderRadius:"0 2px 2px 0", background:sc(item.signal,T)}}/>

      <div style={{display:"flex", justifyContent:"space-between",
        alignItems:"flex-start", marginBottom:10}}>
        <div style={{display:"flex", gap:9, alignItems:"center"}}>
          <Avatar ticker={item.ticker} T={T} size={34}/>
          <div>
            <div style={{fontSize:13, fontWeight:600, color:T.bright,
              lineHeight:1.2}}>{sn2(item.ticker)}</div>
            <div style={{fontSize:10, color:T.dim, fontFamily:"'DM Mono',monospace",
              marginTop:2}}>{item.ticker}</div>
          </div>
        </div>
        <div style={{display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5}}>
          <Badge signal={item.signal||"Neutral"} T={T} sm/>
          {ret!=null && (
            <span style={{fontSize:11, fontWeight:600, fontFamily:"'DM Mono',monospace",
              color:ret>0?T.bull:ret<0?T.bear:T.sub}}>
              {ret>0?"+":""}{(ret*100).toFixed(2)}%
            </span>
          )}
        </div>
      </div>

      <div style={{fontSize:12, color:T.sub, lineHeight:1.55, marginBottom:11,
        minHeight:36}}>
        {(item.headline||"").slice(0,80)}{(item.headline||"").length>80?"…":""}
      </div>

      <ConfBar value={item.confidence||item.importance||0.5}
        signal={item.signal||"Neutral"} T={T}/>

      <div style={{display:"flex", justifyContent:"space-between",
        alignItems:"center", marginTop:10}}>
        <span style={{fontSize:10, color:T.muted}}>
          {item.source && `${item.source} · `}{ago(item.published_at)}
        </span>
        <button onClick={e=>{e.stopPropagation();onPin(item.ticker);}}
          style={{background:pinned?T.pinSoft:"transparent",
            border:`1px solid ${pinned?T.pinBord:T.border}`,
            borderRadius:5, padding:"2px 8px", cursor:"pointer",
            fontSize:10, fontWeight:500, color:pinned?T.pin:T.muted,
            transition:"all 0.15s"}}>
          {pinned?"📌":"📍"}
        </button>
      </div>
    </div>
  );
};

// ─── Company Detail Drawer ────────────────────────────────────────────────────
const CompanyDrawer = ({ticker, signals, T, isDark, pins, onPin, onClose, onAskAbout}) => {
  const rows   = signals.filter(s=>s.ticker===ticker);
  const latest = rows[0];
  const signal = latest?.signal||"Neutral";
  const ret    = latest?.return_24h??latest?.price_return_24h;
  const pinned = pins.includes(ticker);

  const bullCount = rows.filter(r=>r.signal==="Bullish").length;
  const bearCount = rows.filter(r=>r.signal==="Bearish").length;
  const neutCount = rows.filter(r=>r.signal==="Neutral").length;

  // Mini sparkline
  const sparkData = rows.slice(0,10).reverse().map((r,i)=>({
    x:i, v:((r.return_24h??r.price_return_24h)??0)*100
  }));

  return (
    <div style={{
      position:"fixed", right:0, top:0, bottom:0, width:420,
      background:T.surface, borderLeft:`1px solid ${T.border}`,
      zIndex:200, display:"flex", flexDirection:"column",
      boxShadow:`-8px 0 32px ${isDark?"rgba(0,0,0,0.5)":"rgba(0,0,0,0.1)"}`,
      animation:"slideIn 0.25s cubic-bezier(0.34,1.1,0.64,1) both",
    }}>
      <style>{`
        @keyframes slideIn { from{transform:translateX(100%);opacity:0} to{transform:none;opacity:1} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
      `}</style>

      {/* Header */}
      <div style={{padding:"18px 20px", borderBottom:`1px solid ${T.border}`,
        display:"flex", alignItems:"center", gap:12, flexShrink:0}}>
        <Avatar ticker={ticker} T={T} size={42}/>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:16, fontWeight:700, color:T.bright,
            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>
            {sn(ticker)}
          </div>
          <div style={{fontSize:11, color:T.dim, fontFamily:"'DM Mono',monospace",
            marginTop:2}}>{ticker}</div>
        </div>
        <div style={{display:"flex", gap:7, alignItems:"center"}}>
          <button onClick={()=>onPin(ticker)} style={{
            background:pinned?T.pinSoft:"transparent",
            border:`1px solid ${pinned?T.pinBord:T.border}`,
            borderRadius:7, padding:"5px 10px", cursor:"pointer",
            fontSize:12, color:pinned?T.pin:T.sub, fontWeight:500,
          }}>
            {pinned?"📌 Pinned":"📍 Pin"}
          </button>
          <button onClick={onClose} style={{
            background:"none", border:`1px solid ${T.border}`,
            borderRadius:7, width:32, height:32, cursor:"pointer",
            color:T.dim, fontSize:18, display:"flex",
            alignItems:"center", justifyContent:"center",
          }}>×</button>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{flex:1, overflowY:"auto", padding:"18px 20px"}}>

        {/* Signal hero */}
        <div style={{background:ss(signal,T), border:`1px solid ${sb(signal,T)}`,
          borderRadius:12, padding:"18px 20px", marginBottom:16,
          display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div>
            <div style={{fontSize:10, color:T.dim, letterSpacing:"0.08em",
              textTransform:"uppercase", marginBottom:6}}>Current Signal</div>
            <Badge signal={signal} T={T} lg/>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:36, fontWeight:700, color:sc(signal,T),
              fontFamily:"'DM Mono',monospace", lineHeight:1}}>
              {pct(latest?.confidence||latest?.importance||0.5)}
            </div>
            <div style={{fontSize:10, color:T.dim, marginTop:3}}>confidence</div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:16}}>
          {[
            ["Articles", rows.length, T.bright],
            ["24h Return", ret!=null?`${ret>0?"+":""}${(ret*100).toFixed(2)}%`:"—", ret>0?T.bull:ret<0?T.bear:T.sub],
            ["Signal span", `${bullCount}B ${bearCount}R ${neutCount}N`, T.sub],
          ].map(([label,val,color])=>(
            <div key={label} style={{background:T.card, border:`1px solid ${T.border}`,
              borderRadius:9, padding:"11px 13px"}}>
              <div style={{fontSize:10, color:T.dim, letterSpacing:"0.06em",
                textTransform:"uppercase", marginBottom:5}}>{label}</div>
              <div style={{fontSize:14, fontWeight:600, color,
                fontFamily:"'DM Mono',monospace"}}>{val}</div>
            </div>
          ))}
        </div>

        {/* Sparkline */}
        {sparkData.length>1&&(
          <div style={{marginBottom:16}}>
            <div style={{fontSize:10, color:T.dim, letterSpacing:"0.08em",
              textTransform:"uppercase", marginBottom:8}}>Return history</div>
            <div style={{background:T.card, border:`1px solid ${T.border}`,
              borderRadius:9, padding:"10px 4px 4px"}}>
              <ResponsiveContainer width="100%" height={60}>
                <AreaChart data={sparkData}>
                  <defs>
                    <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={sc(signal,T)} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={sc(signal,T)} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke={sc(signal,T)}
                    strokeWidth={1.5} fill="url(#sg)" dot={false}/>
                  <YAxis hide domain={["auto","auto"]}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Latest headlines */}
        {rows.length>0&&(
          <div style={{marginBottom:16}}>
            <Sec T={T}>Recent signals</Sec>
            {rows.slice(0,4).map((r,i)=>(
              <div key={i} style={{
                padding:"11px 0",
                borderBottom:i<Math.min(rows.length,4)-1?`1px solid ${T.border}`:"none",
              }}>
                <div style={{display:"flex", alignItems:"center", gap:7, marginBottom:5}}>
                  <Badge signal={r.signal||"Neutral"} T={T} sm/>
                  {r.confidence!=null&&(
                    <span style={{fontSize:10, color:T.muted,
                      fontFamily:"'DM Mono',monospace"}}>
                      {Math.round((r.confidence||0.5)*100)}%
                    </span>
                  )}
                  <span style={{fontSize:10, color:T.muted, marginLeft:"auto"}}>
                    {ago(r.published_at)}
                  </span>
                </div>
                <div style={{fontSize:13, color:T.text, lineHeight:1.55}}>
                  {r.headline||"—"}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ask AI */}
        <div style={{background:T.goldSoft, border:`1px solid ${T.goldDim}40`,
          borderRadius:12, padding:"14px 16px"}}>
          <div style={{fontSize:12, fontWeight:600, color:T.gold, marginBottom:10}}>
            Ask AlphaLens about {sn2(ticker)}
          </div>
          {[
            `What does the ${signal} signal on ${sn2(ticker)} mean for my portfolio?`,
            `What are the key risks for ${sn2(ticker)} right now?`,
            `Compare ${sn2(ticker)} to its sector peers — is it stronger or weaker?`,
            `What price catalysts should I watch for ${sn2(ticker)} next quarter?`,
          ].map((q,i)=>(
            <button key={i} onClick={()=>onAskAbout(q)} style={{
              display:"block", width:"100%", textAlign:"left",
              background:T.surface, border:`1px solid ${T.border}`,
              borderRadius:8, padding:"8px 12px", cursor:"pointer",
              fontSize:12, color:T.sub, marginBottom:7, lineHeight:1.5,
              transition:"all 0.15s",
            }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=T.gold+"60";e.currentTarget.style.color=T.text;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.sub;}}>
              {q} ↗
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── AI Chat Panel ────────────────────────────────────────────────────────────
const ChatPanel = ({T, isDark, onClose, initialMsg}) => {
  const [msgs,   setMsgs]   = useState(loadChat);
  const [input,  setInput]  = useState(initialMsg||"");
  const [loading,setLoad]   = useState(false);
  const bottomRef = useRef(null);

  useEffect(()=>{ if(initialMsg){setInput(initialMsg);} },[initialMsg]);
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs]);
  useEffect(()=>{ saveChat(msgs); },[msgs]);

  const send = async (text) => {
    const q = (text||input).trim();
    if(!q) return;
    setInput("");
    const userMsg = {role:"user", content:q, ts:Date.now()};
    setMsgs(m=>[...m, userMsg]);
    setLoad(true);
    try {
      // Call the analyze endpoint for headline-style queries
      const isHL = q.length > 40 && !q.startsWith("What") && !q.startsWith("How") &&
                   !q.startsWith("Which") && !q.startsWith("Tell") && !q.startsWith("Give") &&
                   !q.startsWith("Compare") && !q.startsWith("Is") && !q.startsWith("Are") &&
                   !q.startsWith("Can") && !q.startsWith("Why") && !q.startsWith("Should");

      let reply;
      if(isHL){
        const r = await axios.post(`${API}/analyze`, {headline:q});
        const d = r.data;
        const prob = Math.round((d.impact_probability||0.5)*100);
        reply = `**Signal: ${d.signal}** (${prob}% confidence)\n\n` +
          `**Sentiment:** ${d.sentiment}\n` +
          `**Event type:** ${(d.event_type||"general").replace(/_/g," ")}\n\n` +
          `**Key drivers:**\n${(d.drivers||[]).map(x=>`• ${x}`).join("\n")}\n\n` +
          `_Impact probability: ${prob}%. This is a ${d.signal.toLowerCase()} signal based on sentiment analysis and historical patterns._`;
      } else {
        // General question — try summary + signals for context
        const [sm, sigs] = await Promise.all([
          axios.get(`${API}/summary`).catch(()=>({data:{}})),
          axios.get(`${API}/signals`,{params:{limit:10}}).catch(()=>({data:[]})),
        ]);
        const ctx = `Market context: ${sm.data.bullish||0} bullish, ${sm.data.bearish||0} bearish, ${sm.data.neutral||0} neutral signals across ${sm.data.total||0} articles. Model AUC: ${sm.data.model_auc||"N/A"}. Top tickers: ${(sigs.data||[]).slice(0,5).map(s=>`${s.ticker} (${s.signal})`).join(", ")}.`;
        reply = `Based on current AlphaLens data:\n\n${ctx}\n\n_For deeper analysis of a specific stock or headline, paste it directly and I'll run the full pipeline._`;
      }
      setMsgs(m=>[...m, {role:"assistant", content:reply, ts:Date.now()}]);
    } catch {
      setMsgs(m=>[...m, {role:"assistant",
        content:"Can't reach the API right now. Make sure FastAPI is running on port 8000.", ts:Date.now()}]);
    }
    setLoad(false);
  };

  const clearChat = () => { setMsgs([]); localStorage.removeItem(CHAT_KEY); };

  const renderContent = (text) => {
    return text.split("\n").map((line,i)=>{
      if(line.startsWith("**")&&line.endsWith("**")){
        return <div key={i} style={{fontWeight:700,color:"inherit",marginBottom:3}}>{line.slice(2,-2)}</div>;
      }
      if(line.startsWith("**")){
        const parts = line.split("**");
        return <div key={i} style={{marginBottom:3}}>{parts.map((p,j)=>j%2===1?<strong key={j}>{p}</strong>:p)}</div>;
      }
      if(line.startsWith("• ")){
        return <div key={i} style={{display:"flex",gap:8,marginBottom:3,paddingLeft:4}}>
          <span style={{color:"inherit",opacity:0.5,flexShrink:0}}>›</span>
          <span>{line.slice(2)}</span>
        </div>;
      }
      if(line.startsWith("_")&&line.endsWith("_")){
        return <div key={i} style={{fontStyle:"italic",opacity:0.7,marginTop:4,fontSize:11}}>{line.slice(1,-1)}</div>;
      }
      if(!line.trim()) return <div key={i} style={{height:6}}/>;
      return <div key={i} style={{marginBottom:2}}>{line}</div>;
    });
  };

  return (
    <div style={{
      position:"fixed", right:0, top:0, bottom:0, width:420,
      background:T.surface, borderLeft:`1px solid ${T.border}`,
      zIndex:200, display:"flex", flexDirection:"column",
      boxShadow:`-8px 0 32px ${isDark?"rgba(0,0,0,0.5)":"rgba(0,0,0,0.1)"}`,
      animation:"slideIn 0.25s cubic-bezier(0.34,1.1,0.64,1) both",
    }}>
      <style>{`@keyframes slideIn{from{transform:translateX(60px);opacity:0}to{transform:none;opacity:1}}`}</style>

      {/* Header */}
      <div style={{padding:"16px 20px", borderBottom:`1px solid ${T.border}`,
        display:"flex", alignItems:"center", gap:10, flexShrink:0}}>
        <div style={{width:32, height:32, borderRadius:8, background:T.goldSoft,
          border:`1px solid ${T.goldDim}50`, display:"flex",
          alignItems:"center", justifyContent:"center", fontSize:14}}>⚡</div>
        <div style={{flex:1}}>
          <div style={{fontSize:14, fontWeight:600, color:T.bright}}>AlphaLens AI</div>
          <div style={{fontSize:11, color:T.dim}}>Ask anything about Indian markets</div>
        </div>
        <button onClick={clearChat} style={{background:"none", border:"none",
          cursor:"pointer", fontSize:11, color:T.muted, padding:"4px 8px"}}>
          Clear
        </button>
        <button onClick={onClose} style={{background:"none",
          border:`1px solid ${T.border}`, borderRadius:7,
          width:30, height:30, cursor:"pointer", color:T.dim,
          fontSize:16, display:"flex", alignItems:"center", justifyContent:"center"}}>
          ×
        </button>
      </div>

      {/* Messages */}
      <div style={{flex:1, overflowY:"auto", padding:"16px 20px", display:"flex",
        flexDirection:"column", gap:14}}>

        {msgs.length === 0 && (
          <div style={{animation:"fadeUp 0.3s ease"}}>
            <div style={{fontSize:13, color:T.sub, marginBottom:14, lineHeight:1.6}}>
              I have live access to your AlphaLens signals. Ask me about any company,
              paste a headline for instant analysis, or ask broader market questions.
            </div>
            <div style={{display:"flex", flexDirection:"column", gap:6}}>
              {QUICK_PROMPTS.map((p,i)=>(
                <button key={i} onClick={()=>send(p.text)} style={{
                  background:T.card, border:`1px solid ${T.border}`,
                  borderRadius:8, padding:"8px 12px", cursor:"pointer",
                  fontSize:12, color:T.sub, textAlign:"left", lineHeight:1.5,
                  transition:"all 0.15s",
                }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=T.gold+"50";e.currentTarget.style.color=T.text;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.sub;}}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m,i)=>(
          <div key={i} style={{
            display:"flex", flexDirection:"column",
            alignItems:m.role==="user"?"flex-end":"flex-start",
          }}>
            <div style={{
              maxWidth:"88%",
              background:m.role==="user"?T.gold:T.card,
              border:`1px solid ${m.role==="user"?T.gold+"40":T.border}`,
              borderRadius:m.role==="user"?"12px 12px 2px 12px":"12px 12px 12px 2px",
              padding:"10px 13px",
              fontSize:12, lineHeight:1.6,
              color:m.role==="user"?isDark?"#1A1000":T.bg:T.text,
            }}>
              {m.role==="assistant" ? renderContent(m.content) : m.content}
            </div>
            <div style={{fontSize:10, color:T.muted, marginTop:3, paddingX:4}}>
              {m.role==="user"?"You":"AlphaLens AI"} · {ago(m.ts)}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{display:"flex", gap:5, paddingLeft:4, alignItems:"center"}}>
            <style>{`@keyframes pulse{0%,80%,100%{opacity:.2}40%{opacity:.8}}`}</style>
            {[0,150,300].map(d=>(
              <div key={d} style={{width:6,height:6,borderRadius:"50%",
                background:T.gold,
                animation:`pulse 1.2s ease-in-out ${d}ms infinite`}}/>
            ))}
            <span style={{fontSize:11,color:T.muted,marginLeft:4}}>Analyzing…</span>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{padding:"12px 16px", borderTop:`1px solid ${T.border}`, flexShrink:0}}>
        <div style={{
          display:"flex", gap:8, alignItems:"flex-end",
          background:T.card, border:`1px solid ${T.border}`,
          borderRadius:10, padding:"8px 10px",
          transition:"border-color 0.2s",
        }}
        onFocus={e=>e.currentTarget.style.borderColor=T.gold}
        onBlur={e=>e.currentTarget.style.borderColor=T.border}>
          <textarea value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
            placeholder="Ask anything or paste a headline…"
            rows={2} style={{
              flex:1, background:"transparent", border:"none",
              color:T.text, fontSize:12, lineHeight:1.6,
              resize:"none", outline:"none", fontFamily:"inherit",
            }}/>
          <button onClick={()=>send()} disabled={loading||!input.trim()} style={{
            background:input.trim()?T.gold:"transparent",
            border:`1px solid ${input.trim()?T.gold:T.border}`,
            borderRadius:8, width:34, height:34, cursor:input.trim()?"pointer":"default",
            fontSize:14, color:input.trim()?isDark?"#1A1000":T.bg:T.muted,
            display:"flex", alignItems:"center", justifyContent:"center",
            transition:"all 0.2s", flexShrink:0,
          }}>↑</button>
        </div>
        <div style={{fontSize:10, color:T.muted, marginTop:6, textAlign:"center"}}>
          Enter to send · Shift+Enter for new line · paste headlines for signal analysis
        </div>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [mode,    setMode]   = useState(()=>localStorage.getItem(THEME_KEY)||"dark");
  const isDark = mode==="dark";
  const T = isDark?D:L;

  useEffect(()=>localStorage.setItem(THEME_KEY,mode),[mode]);

  const [tab,     setTab]    = useState("discover");
  const [signals, setSigs]   = useState([]);
  const [top,     setTop]    = useState([]);
  const [news,    setNews]   = useState([]);
  const [summary, setSum]    = useState({});
  const [model,   setMdl]    = useState({});
  const [loading, setLoad]   = useState(true);
  const [lastUpd, setUpd]    = useState(null);
  const [pins,    setPins]   = useState(loadPins);
  const [fSector, setFSec]   = useState("All");
  const [fSig,    setFS]     = useState("All");
  const [search,  setSearch] = useState("");
  const [drawer,  setDrawer] = useState(null);   // ticker string
  const [chatOpen,setChat]   = useState(false);
  const [chatMsg, setChatMsg]= useState("");
  const [analyzeHL,setAHL]   = useState("");
  const [analyzeRes,setARes] = useState(null);
  const [analyzing,setAnl]   = useState(false);

  useEffect(()=>localStorage.setItem(PINS_KEY,JSON.stringify(pins)),[pins]);
  const togglePin = t => setPins(p=>p.includes(t)?p.filter(x=>x!==t):[...p,t]);

  const openChat = (msg="") => { setChatMsg(msg); setChat(true); setDrawer(null); };

  const fetchAll = useCallback(async()=>{
    try {
      const [s,tp,n,sm,m] = await Promise.all([
        axios.get(`${API}/signals`,{params:{limit:200}}).catch(()=>({data:[]})),
        axios.get(`${API}/top`,{params:{limit:12}}).catch(()=>({data:[]})),
        axios.get(`${API}/news`,{params:{limit:40}}).catch(()=>({data:[]})),
        axios.get(`${API}/summary`).catch(()=>({data:{}})),
        axios.get(`${API}/model/info`).catch(()=>({data:{}})),
      ]);
      setSigs(s.data||[]); setTop(tp.data||[]); setNews(n.data||[]);
      setSum(sm.data||{}); setMdl(m.data||{}); setUpd(new Date());
    } catch{}
    finally { setLoad(false); }
  },[]);

  useEffect(()=>{fetchAll();const iv=setInterval(fetchAll,30000);return()=>clearInterval(iv);},[fetchAll]);

  const pinFirst = arr=>[...arr].sort((a,b)=>(pins.includes(b.ticker)?1:0)-(pins.includes(a.ticker)?1:0));

  const filteredSigs = pinFirst(signals).filter(s=>{
    if(fSector!=="All"&&!(SECTORS[fSector]||[]).includes(s.ticker)) return false;
    if(fSig!=="All"&&s.signal!==fSig) return false;
    if(search){
      const q=search.toLowerCase();
      return s.ticker.toLowerCase().includes(q)||
             sn(s.ticker).toLowerCase().includes(q)||
             (s.headline||"").toLowerCase().includes(q);
    }
    return true;
  });

  const runAnalyze = async(hl) => {
    const h=(hl||analyzeHL).trim(); if(!h) return;
    setAHL(h); setAnl(true); setARes(null);
    try {
      const r=await axios.post(`${API}/analyze`,{headline:h});
      setARes(r.data);
    } catch { setARes({error:true}); }
    setAnl(false);
  };

  // Chart data
  const pieColors = [T.bull, T.neut, T.bear];
  const distData  = [
    {name:"Bullish", v:summary.bullish||0},
    {name:"Neutral", v:summary.neutral||0},
    {name:"Bearish", v:summary.bearish||0},
  ];
  const barData = (summary.top_signals||[]).slice(0,8).map(s=>({
    name:s.ticker?.replace(".NS","")||"", v:s.count,
    fill:s.signal==="Bullish"?T.bull:s.signal==="Bearish"?T.bear:T.neut,
  }));

  const overlay = drawer||chatOpen;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html{font-size:16px;}
        body{background:${T.bg};color:${T.text};font-family:'Syne',sans-serif;-webkit-font-smoothing:antialiased;transition:background 0.3s,color 0.3s;}
        ::selection{background:${T.gold}30;}
        ::-webkit-scrollbar{width:3px;height:3px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .fade-in{animation:fadeUp 0.3s ease both;}
        .sig-row{transition:background 0.12s;}
        .sig-row:hover{background:${T.cardHover}!important;}
      `}</style>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header style={{
        height:58, background:T.surface, borderBottom:`1px solid ${T.border}`,
        display:"flex", alignItems:"center", padding:"0 24px", gap:20,
        position:"sticky", top:0, zIndex:50,
      }}>
        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <div style={{width:30,height:30,borderRadius:8,
            background:`linear-gradient(135deg,${T.gold},${T.goldDim})`,
            display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:`0 0 12px ${T.gold}40`}}>
            <span style={{fontSize:11,fontWeight:800,color:"#0D0800"}}>AL</span>
          </div>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:T.bright,lineHeight:1}}>AlphaLens</div>
            <div style={{fontSize:9,color:T.dim,letterSpacing:"0.12em",lineHeight:1,marginTop:2}}>NSE · BSE</div>
          </div>
        </div>

        {/* Search bar */}
        <div style={{flex:1,maxWidth:400,display:"flex",alignItems:"center",
          background:T.card,border:`1px solid ${T.border}`,borderRadius:9,
          padding:"7px 12px",gap:8,transition:"border-color 0.2s"}}
          onFocus={e=>e.currentTarget.style.borderColor=T.gold}
          onBlur={e=>e.currentTarget.style.borderColor=T.border}>
          <span style={{fontSize:13,color:T.muted}}>⌕</span>
          <input value={search} onChange={e=>{setSearch(e.target.value);setTab("discover");}}
            placeholder="Search company, ticker, or headline…"
            style={{flex:1,background:"transparent",border:"none",
              color:T.text,fontSize:12,outline:"none"}}/>
          {search&&<button onClick={()=>setSearch("")} style={{background:"none",border:"none",
            color:T.muted,cursor:"pointer",fontSize:14}}>×</button>}
        </div>

        {/* Nav */}
        <nav style={{display:"flex",gap:2}}>
          {[["discover","Discover"],["watchlist","Watchlist"],["alerts","Alerts"],["analyze","Analyze"]].map(([id,label])=>(
            <button key={id} onClick={()=>{setTab(id);setSearch("");}}
              style={{
                background:"none",border:"none",cursor:"pointer",
                padding:"6px 13px",fontSize:12,fontWeight:500,
                color:tab===id?T.bright:T.dim,
                borderRadius:7,
                background:tab===id?T.card:"transparent",
                border:`1px solid ${tab===id?T.border:"transparent"}`,
                transition:"all 0.15s",
              }}>{label}</button>
          ))}
        </nav>

        {/* Right */}
        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
          {/* Model status */}
          <div style={{display:"flex",alignItems:"center",gap:7,
            padding:"5px 12px",background:T.card,border:`1px solid ${T.border}`,borderRadius:8}}>
            <div style={{width:6,height:6,borderRadius:"50%",
              background:model.status==="loaded"?T.bull:T.bear,
              boxShadow:`0 0 6px ${model.status==="loaded"?T.bull:T.bear}`}}/>
            <span style={{fontSize:11,color:T.dim}}>
              {model.status==="loaded"?"Model Active":"Model Offline"}
            </span>
            {model.test_auc&&<span style={{fontSize:11,color:T.gold,
              fontFamily:"'DM Mono',monospace",fontWeight:600}}>
              {model.test_auc}
            </span>}
          </div>

          {/* Pins */}
          {pins.length>0&&(
            <button onClick={()=>setTab("watchlist")} style={{
              display:"flex",alignItems:"center",gap:6,padding:"6px 12px",
              background:T.pinSoft,border:`1px solid ${T.pinBord}`,
              borderRadius:8,cursor:"pointer",fontSize:11,color:T.pin,fontWeight:500,
            }}>
              📌 {pins.length}
            </button>
          )}

          {/* AI Chat CTA */}
          <button onClick={()=>openChat()} style={{
            display:"flex",alignItems:"center",gap:7,padding:"7px 16px",
            background:T.gold,color:isDark?"#100800":T.bg,
            border:"none",borderRadius:8,cursor:"pointer",
            fontSize:12,fontWeight:700,
            boxShadow:`0 2px 12px ${T.gold}40`,
          }}>
            ⚡ Ask AI
          </button>

          {/* Theme */}
          <button onClick={()=>setMode(m=>m==="dark"?"light":"dark")} style={{
            width:36,height:36,borderRadius:8,border:`1px solid ${T.border}`,
            background:"transparent",cursor:"pointer",fontSize:15,
            color:T.sub,display:"flex",alignItems:"center",justifyContent:"center",
          }}>{isDark?"☀️":"🌙"}</button>

          {/* Time */}
          <span style={{fontSize:10,color:T.muted,fontFamily:"'DM Mono',monospace",
            whiteSpace:"nowrap"}}>
            {lastUpd?.toLocaleTimeString([],({}))?"":lastUpd?.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
          </span>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────── */}
      <main style={{maxWidth:overlay?`calc(100vw - 420px)`:1440,
        margin:"0 auto",padding:"24px 24px 64px",
        transition:"max-width 0.25s"}}>

        {/* ════ DISCOVER ════ */}
        {(tab==="discover"||search)&&(
          <>
            {/* Stats bar */}
            <div style={{display:"flex",gap:10,marginBottom:22,flexWrap:"wrap"}}>
              {[
                {l:"Total Articles",v:summary.total??0,c:T.bright},
                {l:"Bullish",v:summary.bullish??0,c:T.bull,
                  sub:summary.total?pct((summary.bullish||0)/summary.total):null},
                {l:"Bearish",v:summary.bearish??0,c:T.bear,
                  sub:summary.total?pct((summary.bearish||0)/summary.total):null},
                {l:"Neutral",v:summary.neutral??0,c:T.neut},
                {l:"Avg 24h Return",
                  v:summary.avg_return!=null?`${summary.avg_return>0?"+":""}${(summary.avg_return*100).toFixed(2)}%`:"—",
                  c:summary.avg_return>0?T.bull:summary.avg_return<0?T.bear:T.sub},
                {l:"Model AUC",v:model.test_auc??"—",c:T.gold,
                  sub:model.n_samples?`n=${model.n_samples}`:null},
              ].map(({l,v,c,sub})=>(
                <div key={l} style={{flex:1,minWidth:110,background:T.card,
                  border:`1px solid ${T.border}`,borderRadius:10,padding:"15px 17px"}}>
                  <div style={{fontSize:10,fontWeight:600,color:T.dim,
                    letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>{l}</div>
                  <div style={{fontSize:26,fontWeight:700,color:c,
                    fontFamily:"'DM Mono',monospace",lineHeight:1}}>{v}</div>
                  {sub&&<div style={{fontSize:11,color:T.muted,marginTop:5}}>{sub}</div>}
                </div>
              ))}
            </div>

            {/* Pinned strip */}
            {pins.length>0&&!search&&(
              <div style={{background:T.pinSoft,border:`1px solid ${T.pinBord}`,
                borderRadius:12,padding:"14px 18px",marginBottom:18}}>
                <div style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",marginBottom:12}}>
                  <span style={{fontSize:11,fontWeight:600,color:T.pin,
                    letterSpacing:"0.07em",textTransform:"uppercase"}}>
                    📌 Pinned ({pins.length})
                  </span>
                  <button onClick={()=>openChat("Give me a quick summary of all my pinned stocks")}
                    style={{background:"none",border:`1px solid ${T.pinBord}`,
                      color:T.pin,borderRadius:6,padding:"3px 10px",
                      fontSize:11,cursor:"pointer"}}>
                    Summarize pinned ↗
                  </button>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {pins.map(t=>{
                    const row=signals.find(s=>s.ticker===t);
                    return (
                      <div key={t} onClick={()=>setDrawer(t)}
                        style={{background:T.card,
                          border:`1px solid ${row?sb(row.signal,T):T.pinBord}`,
                          borderRadius:9,padding:"11px 14px",cursor:"pointer",
                          minWidth:110,transition:"transform 0.15s"}}
                        onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
                        onMouseLeave={e=>e.currentTarget.style.transform=""}>
                        <div style={{fontSize:13,fontWeight:700,color:T.bright,marginBottom:2}}>{sn2(t)}</div>
                        <div style={{fontSize:10,color:T.dim,fontFamily:"'DM Mono',monospace",marginBottom:8}}>{t}</div>
                        {row?<Badge signal={row.signal} T={T} sm/>
                          :<span style={{fontSize:10,color:T.muted}}>No data</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sector + signal filters */}
            <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {["All",...Object.keys(SECTORS)].map(s=>(
                  <Pill key={s} label={s} active={fSector===s} onClick={()=>setFSec(s)} T={T}/>
                ))}
              </div>
              <div style={{width:1,height:20,background:T.border,margin:"0 4px"}}/>
              {["All","Bullish","Bearish","Neutral"].map(f=>(
                <Pill key={f} label={f}
                  color={f==="Bullish"?T.bull:f==="Bearish"?T.bear:f==="Neutral"?T.neut:null}
                  active={fSig===f} onClick={()=>setFS(f)} T={T}/>
              ))}
              <span style={{marginLeft:"auto",fontSize:12,color:T.dim,
                fontFamily:"'DM Mono',monospace"}}>
                {filteredSigs.length} signals
              </span>
            </div>

            {/* Signal grid */}
            {loading?(
              <div style={{textAlign:"center",padding:60,color:T.dim,fontSize:13}}>
                Loading signals…
              </div>
            ):filteredSigs.length===0?(
              <div style={{textAlign:"center",padding:72}}>
                <div style={{fontSize:40,opacity:0.15,marginBottom:12}}>◎</div>
                <div style={{fontSize:15,fontWeight:600,color:T.dim,marginBottom:6}}>
                  {search?"No results found":"No signals yet"}
                </div>
                <div style={{fontSize:13,color:T.muted,maxWidth:320,margin:"0 auto 18px"}}>
                  {search?`Nothing found for "${search}". Try a company name or ticker.`
                    :"Run the data pipeline to populate signals for Indian companies."}
                </div>
                {search&&<button onClick={()=>openChat(`Tell me about ${search} — what signals or news should I watch?`)}
                  style={{background:T.gold,color:isDark?"#100800":T.bg,border:"none",
                    borderRadius:8,padding:"9px 20px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                  Ask AI about "{search}" ↗
                </button>}
              </div>
            ):(
              <div style={{display:"grid",
                gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",
                gap:10,animation:"fadeUp 0.3s ease"}}>
                {filteredSigs.map((s,i)=>(
                  <SigCard key={`${s.ticker}-${i}`} item={s} T={T}
                    pins={pins} onPin={togglePin}
                    onClick={()=>setDrawer(s.ticker)}/>
                ))}
              </div>
            )}
          </>
        )}

        {/* ════ WATCHLIST ════ */}
        {tab==="watchlist"&&!search&&(
          <>
            <div style={{display:"flex",justifyContent:"space-between",
              alignItems:"center",marginBottom:20}}>
              <div>
                <h1 style={{fontSize:22,fontWeight:700,color:T.bright,marginBottom:4}}>
                  My Watchlist
                </h1>
                <p style={{fontSize:13,color:T.dim}}>
                  {pins.length} pinned · click any company to view full signal detail
                </p>
              </div>
              <button onClick={()=>openChat("Based on my pinned stocks, what portfolio adjustments should I consider?")}
                style={{background:"none",border:`1px solid ${T.border}`,
                  color:T.sub,borderRadius:8,padding:"7px 14px",
                  fontSize:12,cursor:"pointer"}}>
                Portfolio advice ↗
              </button>
            </div>

            {/* Sector filter */}
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:18}}>
              {["All",...Object.keys(SECTORS)].map(s=>(
                <Pill key={s} label={s} active={fSector===s}
                  onClick={()=>setFSec(s)} T={T}/>
              ))}
            </div>

            {/* Table */}
            <div style={{background:T.card,border:`1px solid ${T.border}`,
              borderRadius:14,overflow:"hidden"}}>
              {/* Table header */}
              <div style={{display:"grid",
                gridTemplateColumns:"44px 1fr 140px 90px 90px 80px 60px",
                gap:8,padding:"10px 16px",
                background:T.surface,borderBottom:`1px solid ${T.border}`,
                fontSize:10,fontWeight:600,color:T.dim,
                letterSpacing:"0.07em",textTransform:"uppercase"}}>
                <div/>
                <div>Company</div>
                <div>Ticker</div>
                <div style={{textAlign:"center"}}>Signal</div>
                <div style={{textAlign:"center"}}>Confidence</div>
                <div style={{textAlign:"right"}}>24h Return</div>
                <div style={{textAlign:"center"}}>Pin</div>
              </div>

              {[...Object.entries(SECTORS).filter(([s])=>fSector==="All"||s===fSector)]
                .flatMap(([,tickers])=>tickers)
                .map(ticker=>{
                  const row=signals.find(s=>s.ticker===ticker);
                  const pinned=pins.includes(ticker);
                  const ret=row?.return_24h??row?.price_return_24h;
                  return (
                    <div key={ticker} className="sig-row"
                      style={{display:"grid",
                        gridTemplateColumns:"44px 1fr 140px 90px 90px 80px 60px",
                        gap:8,padding:"12px 16px",alignItems:"center",
                        borderBottom:`1px solid ${T.border}`,cursor:"pointer",
                        background:pinned?T.pinSoft:"transparent"}}
                      onClick={()=>setDrawer(ticker)}>
                      <Avatar ticker={ticker} T={T} size={34}/>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:pinned?T.pin:T.bright}}>
                          {sn2(ticker)}
                        </div>
                        <div style={{fontSize:10,color:T.dim,marginTop:1}}>
                          {Object.entries(SECTORS).find(([,ts])=>ts.includes(ticker))?.[0]||""}
                        </div>
                      </div>
                      <div style={{fontSize:11,color:T.sub,
                        fontFamily:"'DM Mono',monospace"}}>{ticker}</div>
                      <div style={{textAlign:"center"}}>
                        {row?<Badge signal={row.signal} T={T} sm/>
                          :<span style={{fontSize:11,color:T.muted}}>—</span>}
                      </div>
                      <div style={{textAlign:"center"}}>
                        {row?<span style={{fontSize:11,fontWeight:600,
                          color:sc(row.signal,T),fontFamily:"'DM Mono',monospace"}}>
                          {Math.round((row.confidence||0.5)*100)}%
                        </span>:<span style={{fontSize:11,color:T.muted}}>—</span>}
                      </div>
                      <div style={{textAlign:"right",fontSize:12,fontWeight:600,
                        fontFamily:"'DM Mono',monospace",
                        color:ret>0?T.bull:ret<0?T.bear:T.muted}}>
                        {ret!=null?`${ret>0?"+":""}${(ret*100).toFixed(2)}%`:"—"}
                      </div>
                      <div style={{textAlign:"center"}}>
                        <button onClick={e=>{e.stopPropagation();togglePin(ticker);}}
                          style={{background:"none",border:"none",cursor:"pointer",
                            fontSize:16,opacity:pinned?1:0.3,transition:"opacity 0.15s"}}>
                          ★
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </>
        )}

        {/* ════ ALERTS ════ */}
        {tab==="alerts"&&!search&&(
          <>
            <div style={{display:"flex",justifyContent:"space-between",
              alignItems:"center",marginBottom:20}}>
              <div>
                <h1 style={{fontSize:22,fontWeight:700,color:T.bright,marginBottom:4}}>
                  Smart Alerts
                </h1>
                <p style={{fontSize:13,color:T.dim}}>
                  Signal changes and unusual market activity for your pinned companies
                </p>
              </div>
              <button onClick={()=>openChat("Help me set up smarter alerts for Indian market signals — what thresholds and companies should I watch?")}
                style={{background:T.gold,color:isDark?"#100800":T.bg,border:"none",
                  borderRadius:8,padding:"8px 16px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                Configure with AI ↗
              </button>
            </div>

            {/* Alert feed from signals */}
            {top.length===0?(
              <div style={{textAlign:"center",padding:60,color:T.muted,fontSize:13}}>
                No alerts yet — run the data pipeline to generate signals
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
                {top.slice(0,8).map((item,i)=>{
                  const strong=(item.confidence||0.5)>0.70;
                  const col=sc(item.signal||"Neutral",T);
                  return (
                    <div key={i} style={{background:T.card,
                      border:`1px solid ${strong?sb(item.signal,T):T.border}`,
                      borderRadius:11,padding:"14px 16px",
                      display:"flex",gap:13,alignItems:"flex-start",cursor:"pointer",
                      transition:"all 0.15s"}}
                      onClick={()=>setDrawer(item.ticker)}
                      onMouseEnter={e=>e.currentTarget.style.borderColor=col+"40"}
                      onMouseLeave={e=>e.currentTarget.style.borderColor=strong?sb(item.signal,T):T.border}>
                      <div style={{width:8,height:8,borderRadius:"50%",
                        background:col,flexShrink:0,marginTop:5,
                        boxShadow:strong?`0 0 8px ${col}`:""}}/>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                          <span style={{fontSize:13,fontWeight:600,color:T.bright}}>
                            {sn2(item.ticker||"")}
                          </span>
                          <Badge signal={item.signal||"Neutral"} T={T} sm/>
                          {strong&&<span style={{fontSize:10,color:T.gold,fontWeight:600,
                            background:T.goldSoft,padding:"1px 7px",borderRadius:4}}>
                            STRONG
                          </span>}
                        </div>
                        <div style={{fontSize:13,color:T.sub,lineHeight:1.5}}>
                          {item.headline?.slice(0,90)}{item.headline?.length>90?"…":""}
                        </div>
                        {item.drivers?.length>0&&(
                          <div style={{marginTop:6,fontSize:11,color:T.muted}}>
                            {item.drivers[0]}
                          </div>
                        )}
                      </div>
                      <div style={{display:"flex",flexDirection:"column",
                        alignItems:"flex-end",gap:4,flexShrink:0}}>
                        <span style={{fontSize:13,fontWeight:700,color:col,
                          fontFamily:"'DM Mono',monospace"}}>
                          {Math.round((item.confidence||0.5)*100)}%
                        </span>
                        <button onClick={e=>{e.stopPropagation();
                          openChat(`Explain this alert in detail: ${item.headline}`);}}
                          style={{background:"none",border:`1px solid ${T.border}`,
                            borderRadius:5,padding:"2px 8px",cursor:"pointer",
                            fontSize:10,color:T.dim}}>
                          Ask AI ↗
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick alert topics */}
            <Sec T={T}>Alert topics — ask AI to monitor</Sec>
            <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
              {[
                "Alert me when any Nifty 50 stock gets a Bearish signal above 70% confidence",
                "Alert me when HDFC Bank or ICICI Bank releases quarterly results with a surprise",
                "Alert me when any pharma stock gets an FDA approval or rejection",
                "Alert me when defence sector stocks get a contract announcement above ₹5,000 crore",
                "What unusual signal activity happened today across Indian markets?",
                "Which of my pinned stocks changed signal direction in the last 24 hours?",
              ].map((q,i)=>(
                <button key={i} onClick={()=>openChat(q)} style={{
                  padding:"6px 13px",borderRadius:8,
                  border:`1px solid ${T.border}`,background:"transparent",
                  fontSize:12,color:T.sub,cursor:"pointer",transition:"all 0.15s",
                }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=T.gold+"50";e.currentTarget.style.color=T.text;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.sub;}}>
                  {q.slice(0,50)}… ↗
                </button>
              ))}
            </div>
          </>
        )}

        {/* ════ ANALYZE ════ */}
        {tab==="analyze"&&!search&&(
          <>
            <div style={{marginBottom:20}}>
              <h1 style={{fontSize:22,fontWeight:700,color:T.bright,marginBottom:4}}>
                Headline Analyzer
              </h1>
              <p style={{fontSize:13,color:T.dim}}>
                Paste any financial headline for instant sentiment, signal, and impact analysis
              </p>
            </div>

            {/* Input */}
            <div style={{background:T.card,border:`1px solid ${T.border}`,
              borderRadius:12,padding:"16px 18px",marginBottom:14}}>
              <textarea value={analyzeHL} onChange={e=>setAHL(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey))runAnalyze();}}
                placeholder="Paste any headline from Economic Times, Moneycontrol, Business Standard…"
                rows={3} style={{width:"100%",background:"transparent",border:"none",
                  color:T.text,fontSize:14,outline:"none",resize:"none",
                  lineHeight:1.65,fontFamily:"'Syne',sans-serif"}}/>
              <div style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",marginTop:10,paddingTop:10,
                borderTop:`1px solid ${T.border}`}}>
                <span style={{fontSize:11,color:T.muted}}>Ctrl+Enter to analyze</span>
                <button onClick={()=>runAnalyze()} disabled={analyzing||!analyzeHL.trim()}
                  style={{background:analyzeHL.trim()?T.gold:"transparent",
                    color:analyzeHL.trim()?isDark?"#100800":T.bg:T.muted,
                    border:`1px solid ${analyzeHL.trim()?T.gold:T.border}`,
                    borderRadius:8,padding:"8px 22px",fontSize:13,fontWeight:700,
                    cursor:analyzeHL.trim()?"pointer":"default",transition:"all 0.2s"}}>
                  {analyzing?"Analyzing…":"Analyze →"}
                </button>
              </div>
            </div>

            {/* Examples */}
            <div style={{marginBottom:18}}>
              <div style={{fontSize:11,fontWeight:600,color:T.dim,
                letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>
                Try an example
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {EXAMPLES.map((ex,i)=>(
                  <button key={i} onClick={()=>{setAHL(ex);runAnalyze(ex);}}
                    style={{padding:"5px 12px",borderRadius:7,
                      border:`1px solid ${T.border}`,background:"transparent",
                      fontSize:11,color:T.sub,cursor:"pointer",transition:"all 0.15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=T.gold+"50";e.currentTarget.style.color=T.text;}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.sub;}}>
                    {ex.slice(0,46)}…
                  </button>
                ))}
              </div>
            </div>

            {/* Result */}
            {analyzeRes&&!analyzeRes.error&&(()=>{
              const col=sc(analyzeRes.signal,T);
              const prob=analyzeRes.impact_probability||0.5;
              return (
                <div style={{border:`1px solid ${T.border}`,borderRadius:14,
                  overflow:"hidden",animation:"fadeUp 0.35s ease"}}>
                  {/* Hero */}
                  <div style={{background:ss(analyzeRes.signal,T),
                    borderBottom:`1px solid ${T.border}`,
                    padding:"22px 24px",display:"flex",
                    justifyContent:"space-between",alignItems:"center",gap:16}}>
                    <div>
                      <div style={{fontSize:10,color:T.dim,letterSpacing:"0.08em",
                        textTransform:"uppercase",marginBottom:8}}>Signal</div>
                      <Badge signal={analyzeRes.signal} T={T} lg/>
                      <div style={{fontSize:12,color:T.sub,marginTop:10,
                        fontStyle:"italic",lineHeight:1.55,maxWidth:380}}>
                        "{(analyzeHL||"").slice(0,100)}{(analyzeHL||"").length>100?"…":""}"
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:44,fontWeight:700,color:col,
                        fontFamily:"'DM Mono',monospace",lineHeight:1}}>
                        {Math.round(prob*100)}%
                      </div>
                      <div style={{fontSize:10,color:T.dim,marginTop:4,
                        letterSpacing:"0.07em",textTransform:"uppercase"}}>
                        Impact probability
                      </div>
                      <div style={{width:100,height:4,borderRadius:2,
                        background:T.border,margin:"8px 0 0 auto",overflow:"hidden"}}>
                        <div style={{width:`${Math.round(prob*100)}%`,height:"100%",
                          background:col,borderRadius:2,
                          transition:"width 0.8s cubic-bezier(0.34,1.2,0.64,1)"}}/>
                      </div>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)"}}>
                    {[
                      ["Sentiment",(analyzeRes.sentiment||"").replace(/_/g," ")],
                      ["Confidence",f3(analyzeRes.confidence)],
                      ["Event",(analyzeRes.event_type||"general").replace(/_/g," ")],
                      ["Sent. Score",f3(analyzeRes.sentiment_score)],
                    ].map(([label,val],i)=>(
                      <div key={label} style={{padding:"13px 16px",
                        borderRight:i<3?`1px solid ${T.border}`:"none"}}>
                        <div style={{fontSize:10,color:T.muted,letterSpacing:"0.06em",
                          textTransform:"uppercase",marginBottom:5}}>{label}</div>
                        <div style={{fontSize:13,fontWeight:600,color:T.text,
                          fontFamily:"'DM Mono',monospace",textTransform:"capitalize"}}>
                          {val||"—"}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Drivers */}
                  {analyzeRes.drivers?.length>0&&(
                    <div style={{padding:"14px 20px",
                      borderTop:`1px solid ${T.border}`}}>
                      <div style={{fontSize:10,fontWeight:600,color:T.dim,
                        letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10}}>
                        Key drivers
                      </div>
                      {analyzeRes.drivers.map((d,i)=>(
                        <div key={i} style={{display:"flex",gap:9,alignItems:"flex-start",
                          padding:"7px 0",
                          borderBottom:i<analyzeRes.drivers.length-1?`1px solid ${T.border}`:"none"}}>
                          <div style={{width:6,height:6,borderRadius:"50%",
                            background:col,flexShrink:0,marginTop:5}}/>
                          <span style={{fontSize:13,color:T.text,lineHeight:1.5}}>{d}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Follow-up chips */}
                  <div style={{padding:"12px 18px",
                    borderTop:`1px solid ${T.border}`,
                    display:"flex",gap:7,flexWrap:"wrap"}}>
                    {[
                      `What should I do if I hold this stock: ${analyzeHL.slice(0,50)}`,
                      `Which other Indian stocks are affected by: ${analyzeHL.slice(0,40)}`,
                      `Give me historical context for this type of news`,
                    ].map((q,i)=>(
                      <button key={i} onClick={()=>openChat(q)} style={{
                        padding:"5px 12px",borderRadius:7,
                        border:`1px solid ${T.border}`,background:"transparent",
                        fontSize:11,color:T.sub,cursor:"pointer",transition:"all 0.15s"}}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor=T.gold+"50";e.currentTarget.style.color=T.text;}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.sub;}}>
                        {["What should I do?","Ripple effects","Historical context"][i]} ↗
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {analyzeRes?.error&&(
              <div style={{background:T.bearSoft,border:`1px solid ${T.bearBord}`,
                borderRadius:10,padding:"13px 16px",color:T.bear,fontSize:13}}>
                Cannot reach the API. Make sure FastAPI is running on port 8000.
              </div>
            )}
          </>
        )}

      </main>

      {/* ── Company Drawer ───────────────────────────────────── */}
      {drawer&&(
        <CompanyDrawer ticker={drawer} signals={signals} T={T} isDark={isDark}
          pins={pins} onPin={togglePin}
          onClose={()=>setDrawer(null)}
          onAskAbout={q=>{setDrawer(null);openChat(q);}}/>
      )}

      {/* ── Chat Panel ───────────────────────────────────────── */}
      {chatOpen&&(
        <ChatPanel T={T} isDark={isDark}
          initialMsg={chatMsg}
          onClose={()=>{setChat(false);setChatMsg("");}}/>
      )}

      {/* ── Floating AI button (when chat closed) ───────────── */}
      {!chatOpen&&!drawer&&(
        <button onClick={()=>openChat()} style={{
          position:"fixed",bottom:28,right:28,zIndex:40,
          width:52,height:52,borderRadius:"50%",
          background:T.gold,color:isDark?"#100800":T.bg,
          border:"none",cursor:"pointer",fontSize:20,
          boxShadow:`0 4px 20px ${T.gold}50`,
          display:"flex",alignItems:"center",justifyContent:"center",
          transition:"transform 0.2s",
        }}
        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.1)"}
        onMouseLeave={e=>e.currentTarget.style.transform=""}>
          ⚡
        </button>
      )}
    </>
  );
}