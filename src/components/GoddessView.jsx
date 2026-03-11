
import { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import Fuse from "fuse.js";
import { EVENTS_FLAT, LAYERS, EPOCHS } from "../data/index.js";

const CosmicView = lazy(() => import("./CosmicView.jsx"));

// ═══════════════════════════════════════════════════════════════════════════════
// THEME — Gaia earth tones, dark & light
// ═══════════════════════════════════════════════════════════════════════════════
const THEMES = {
  dark: {
    bg: "#0d0c0a",
    bgAlt: "#161410",
    surface: "rgba(22,20,16,0.97)",
    surfaceHover: "rgba(30,28,22,0.97)",
    headerBg: "linear-gradient(180deg, rgba(13,12,10,0.98) 0%, rgba(22,20,16,0.90) 100%)",
    cardBg: "linear-gradient(135deg, rgba(22,18,12,0.98) 0%, rgba(30,24,16,0.98) 100%)",
    text: "#e8e0d4",
    textMuted: "rgba(210,200,180,0.55)",
    textDim: "rgba(180,170,150,0.30)",
    border: "rgba(180,160,120,0.12)",
    borderHover: "rgba(180,160,120,0.30)",
    rulerText: "rgba(200,190,170,0.45)",
    nowColor: "#8aaa6a",
    scrollThumb: "rgba(160,140,100,0.25)",
    starBg1: "#0e0d08",
    starBg2: "#0a0908",
    starBg3: "#0d0c0a",
    nebula1: "rgba(120,90,50,0.05)",
    nebula2: "rgba(60,90,80,0.04)",
    fadeEdge: "rgba(13,12,10,0.9)",
    modalOverlay: "rgba(10,9,7,0.88)",
  },
  light: {
    bg: "#f5f0e8",
    bgAlt: "#ede7db",
    surface: "rgba(245,240,232,0.97)",
    surfaceHover: "rgba(235,228,216,0.97)",
    headerBg: "linear-gradient(180deg, rgba(245,240,232,0.98) 0%, rgba(235,228,216,0.92) 100%)",
    cardBg: "linear-gradient(135deg, rgba(255,250,242,0.98) 0%, rgba(245,238,226,0.98) 100%)",
    text: "#2a2418",
    textMuted: "rgba(60,52,38,0.55)",
    textDim: "rgba(80,70,50,0.30)",
    border: "rgba(80,70,50,0.15)",
    borderHover: "rgba(80,70,50,0.35)",
    rulerText: "rgba(80,70,50,0.50)",
    nowColor: "#5a7a3a",
    scrollThumb: "rgba(100,90,60,0.25)",
    starBg1: "#ede7db",
    starBg2: "#e8e0d0",
    starBg3: "#f5f0e8",
    nebula1: "rgba(160,120,60,0.06)",
    nebula2: "rgba(80,120,100,0.05)",
    fadeEdge: "rgba(245,240,232,0.9)",
    modalOverlay: "rgba(245,240,232,0.88)",
  },
};

// Earth-tone layer palette — muted, warm, natural
const LAYER_COLORS = {
  dark: {
    herstory:   { color:"#c9977a", accent:"#9a6248" },
    indigenous: { color:"#c4a85a", accent:"#8a7530" },
    cosmos:     { color:"#9a90b8", accent:"#6a5a8a" },
    earth:      { color:"#7aaa7e", accent:"#4a7a4e" },
    life:       { color:"#6a9a7a", accent:"#3a7a5a" },
    society:    { color:"#c4aa6a", accent:"#8a7a3a" },
    conflict:   { color:"#b87a6a", accent:"#8a4a3a" },
    science:    { color:"#6a8ab0", accent:"#3a5a7a" },
    culture:    { color:"#b88a9a", accent:"#7a4a5a" },
    philosophy: { color:"#9a8aaa", accent:"#6a5a7a" },
  },
  light: {
    herstory:   { color:"#8a5238", accent:"#6a3a28" },
    indigenous: { color:"#7a6520", accent:"#5a4810" },
    cosmos:     { color:"#5a4a7a", accent:"#3a2a5a" },
    earth:      { color:"#3a6a3e", accent:"#2a4a2e" },
    life:       { color:"#2a6a4a", accent:"#1a4a3a" },
    society:    { color:"#7a6a2a", accent:"#5a4a1a" },
    conflict:   { color:"#7a3a2a", accent:"#5a2a1a" },
    science:    { color:"#2a4a6a", accent:"#1a3a5a" },
    culture:    { color:"#6a3a4a", accent:"#4a2a3a" },
    philosophy: { color:"#5a4a6a", accent:"#3a2a4a" },
  },
};

const ThemeContext = createContext("dark");

function useTheme() {
  const mode = useContext(ThemeContext);
  return { mode, t: THEMES[mode], lc: LAYER_COLORS[mode] };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA — imported from src/data/index.js
// EPOCHS, LAYERS imported at top; EVENTS below
// ═══════════════════════════════════════════════════════════════════════════════

const EVENTS = EVENTS_FLAT;

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════
function formatYear(y) {
  const a = Math.abs(y);
  const suffix = y < 0 ? " BCE" : y > 0 ? " CE" : "";
  if (a >= 1e9)  return `${(a/1e9).toFixed(1)}B${suffix}`;
  if (a >= 1e6)  return `${(a/1e6).toFixed(1)}M${suffix}`;
  if (a >= 1e5)  return `${(a/1e3).toFixed(0)}K${suffix}`;
  if (a >= 1000) return `${(a/1000).toFixed(1)}K${suffix}`;
  return `${a}${suffix}`;
}

function getRulerTicks(start, end) {
  const range = end - start;
  let step;
  if (range > 5e9) step = 1e9; else if (range > 1e9) step = 5e8;
  else if (range > 1e8) step = 2e7; else if (range > 1e7) step = 5e6;
  else if (range > 1e6) step = 1e6; else if (range > 1e5) step = 2e4;
  else if (range > 1e4) step = 2000; else if (range > 2000) step = 500;
  else if (range > 500) step = 100; else if (range > 100) step = 25;
  else if (range > 20) step = 5; else step = 1;
  const ticks = [];
  for (let t = Math.ceil(start / step) * step; t <= end; t += step) ticks.push(t);
  return ticks;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STARFIELD — theme-aware
// ═══════════════════════════════════════════════════════════════════════════════
function Starfield({ panOffset, theme }) {
  const ref = useRef(null);
  const starsRef = useRef(null);
  const t = THEMES[theme];

  useEffect(() => {
    const c = ref.current;
    const ctx = c.getContext("2d");
    if (!starsRef.current) {
      starsRef.current = Array.from({ length: 300 }, () => ({
        x: Math.random(), y: Math.random(),
        r: Math.random() * 1.4 + 0.3,
        o: Math.random() * (theme === "dark" ? 0.7 : 0.25) + 0.1,
        speed: Math.random() * 0.003 + 0.0005,
        phase: Math.random() * Math.PI * 2,
        depth: Math.random() * 0.8 + 0.2,
      }));
    }
    const stars = starsRef.current;
    let raf, time = 0;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);

    const draw = () => {
      time += 0.006;
      ctx.clearRect(0, 0, c.width, c.height);
      const bg = ctx.createRadialGradient(c.width*0.35, c.height*0.4, 0, c.width*0.5, c.height*0.5, c.width*0.8);
      bg.addColorStop(0, t.starBg1); bg.addColorStop(0.5, t.starBg2); bg.addColorStop(1, t.starBg3);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height);
      // Nebula
      const n1 = ctx.createRadialGradient(c.width*0.15, c.height*0.35, 0, c.width*0.15, c.height*0.35, c.width*0.3);
      n1.addColorStop(0, t.nebula1); n1.addColorStop(1, "transparent");
      ctx.fillStyle = n1; ctx.fillRect(0, 0, c.width, c.height);
      const n2 = ctx.createRadialGradient(c.width*0.8, c.height*0.6, 0, c.width*0.8, c.height*0.6, c.width*0.25);
      n2.addColorStop(0, t.nebula2); n2.addColorStop(1, "transparent");
      ctx.fillStyle = n2; ctx.fillRect(0, 0, c.width, c.height);
      // Stars with parallax
      const px = (panOffset || 0) * 0.00003;
      const dotColor = theme === "dark" ? "255,255,255" : "60,50,30";
      stars.forEach(s => {
        const alpha = s.o * (0.5 + 0.5 * Math.sin(time * s.speed * 100 + s.phase));
        const sx = ((s.x + px * s.depth) % 1 + 1) % 1;
        ctx.beginPath();
        ctx.arc(sx * c.width, s.y * c.height, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${dotColor},${alpha})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [panOffset, theme, t]);

  return <canvas ref={ref} style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARTICLES
// ═══════════════════════════════════════════════════════════════════════════════
function ParticleCanvas({ events, yearToPct, layerColors, containerRect }) {
  const ref = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    const c = ref.current;
    if (!c || !containerRect) return;
    const ctx = c.getContext("2d");
    c.width = containerRect.width;
    c.height = containerRect.height;

    events.forEach(ev => {
      const pct = yearToPct(ev.year);
      if (pct < 0 || pct > 1) return;
      const lc = layerColors[ev.layer];
      if (!lc || particlesRef.current.length > 250) return;
      for (let i = 0; i < 1 + Math.floor(Math.random()); i++) {
        particlesRef.current.push({
          x: pct * c.width + (Math.random() - 0.5) * 10,
          y: Math.random() * c.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -(Math.random() * 0.4 + 0.15),
          life: 1, decay: 0.002 + Math.random() * 0.003,
          r: Math.random() * 2 + 0.5,
          color: lc.color,
        });
      }
    });
    if (particlesRef.current.length > 250) particlesRef.current = particlesRef.current.slice(-250);

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx; p.y += p.vy; p.life -= p.decay;
        if (p.life <= 0) return false;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(p.life * 35).toString(16).padStart(2, "0");
        ctx.fill();
        return true;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [events, yearToPct, layerColors, containerRect]);

  return <canvas ref={ref} style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:5, opacity:0.5 }} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTION LINES
// ═══════════════════════════════════════════════════════════════════════════════
function ConnectionLines({ hoveredEvent, visibleEvents, yearToPct, activeLayerIds, layerColors, containerRect }) {
  const ref = useRef(null);

  useEffect(() => {
    const c = ref.current;
    if (!c || !containerRect) return;
    const ctx = c.getContext("2d");
    c.width = containerRect.width; c.height = containerRect.height;
    ctx.clearRect(0, 0, c.width, c.height);
    if (!hoveredEvent) return;

    const srcPct = yearToPct(hoveredEvent.year);
    const srcTags = new Set(hoveredEvent.tags);
    const srcLc = layerColors[hoveredEvent.layer];

    visibleEvents.forEach(ev => {
      if (ev.id === hoveredEvent.id) return;
      const shared = ev.tags.filter(t => srcTags.has(t));
      if (shared.length === 0) return;
      const pct = yearToPct(ev.year);
      if (pct < 0 || pct > 1) return;
      const srcIdx = activeLayerIds.indexOf(hoveredEvent.layer);
      const tgtIdx = activeLayerIds.indexOf(ev.layer);
      if (srcIdx < 0 || tgtIdx < 0) return;
      const laneH = containerRect.height / activeLayerIds.length;
      const srcY = (srcIdx + 0.5) * laneH;
      const tgtY = (tgtIdx + 0.5) * laneH;
      const alpha = Math.min(shared.length * 0.15, 0.4);
      ctx.beginPath();
      ctx.moveTo(srcPct * c.width, srcY);
      ctx.quadraticCurveTo((srcPct * c.width + pct * c.width) / 2, Math.min(srcY, tgtY) - 25, pct * c.width, tgtY);
      ctx.strokeStyle = (srcLc?.color || "#9a8a7a") + Math.floor(alpha * 255).toString(16).padStart(2, "0");
      ctx.lineWidth = shared.length * 0.5 + 0.5;
      ctx.stroke();
    });
  }, [hoveredEvent, visibleEvents, yearToPct, activeLayerIds, layerColors, containerRect]);

  return <canvas ref={ref} style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:4 }} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT NODE
// ═══════════════════════════════════════════════════════════════════════════════
function EventNode({ ev, xPct, onClick, selected, onHover, breathPhase, isMobile }) {
  const { t, lc } = useTheme();
  const [hovered, setHovered] = useState(false);
  const nodeRef = useRef(null);
  const [cardPos, setCardPos] = useState(null);
  const layerColor = lc[ev.layer] || { color:"#9a8a7a", accent:"#6a5a4a" };
  const size = isMobile ? 8 + ev.imp * 3 : 10 + ev.imp * 4;
  const breathScale = 1 + Math.sin(breathPhase + ev.id * 1.7) * 0.06;

  // Calculate card position in viewport coords when hovered (desktop only)
  useEffect(() => {
    if (isMobile || !hovered || !nodeRef.current) { setCardPos(null); return; }
    const rect = nodeRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const CARD_W = 300, CARD_H = 200;
    const showBelow = rect.top < CARD_H + 10;
    let left = cx - CARD_W / 2;
    left = Math.max(8, Math.min(window.innerWidth - CARD_W - 8, left));
    const top = showBelow ? rect.bottom + 12 : rect.top - CARD_H - 12;
    setCardPos({ left, top, showBelow });
  }, [hovered, isMobile]);

  return (
    <div
      ref={nodeRef}
      onMouseEnter={() => { if (!isMobile) { setHovered(true); onHover(ev); } }}
      onMouseLeave={() => { if (!isMobile) { setHovered(false); onHover(null); } }}
      onClick={(e) => { e.stopPropagation(); onClick(ev); }}
      style={{
        position:"absolute", left:`${xPct * 100}%`, top:"50%",
        transform:"translate(-50%, -50%)", zIndex: hovered ? 100 : 10,
        cursor:"pointer", padding: isMobile ? 14 : 10,
      }}
    >
      <div style={{
        position:"absolute", left:"50%", top:"50%",
        width: size * 2.8, height: size * 2.8,
        transform: `translate(-50%, -50%) scale(${breathScale})`,
        borderRadius:"50%",
        background: `radial-gradient(circle, ${layerColor.accent}${hovered ? "55" : "25"} 0%, transparent 70%)`,
        transition: "all 0.3s",
      }} />
      <div style={{
        width: size, height: size, borderRadius:"50%",
        background: hovered || selected
          ? `radial-gradient(circle at 30% 30%, ${t.text}, ${layerColor.color})`
          : `radial-gradient(circle at 30% 30%, ${layerColor.color}, ${layerColor.accent})`,
        boxShadow: `0 0 ${size}px ${layerColor.color}55, 0 0 ${size*2}px ${layerColor.accent}22`,
        border: `1.5px solid ${layerColor.color}88`,
        transition: "all 0.2s",
        transform: `scale(${hovered ? 1.5 : breathScale})`,
        position:"relative", zIndex:2,
      }} />
      {/* Hover card rendered via portal so it escapes all overflow/z-index contexts */}
      {hovered && cardPos && !isMobile && createPortal(
        <div style={{
          position:"fixed",
          left: cardPos.left,
          top: cardPos.top,
          width: 300,
          background: t.cardBg,
          border: `1px solid ${layerColor.accent}55`,
          borderTop: cardPos.showBelow ? "none" : `3px solid ${layerColor.accent}`,
          borderBottom: cardPos.showBelow ? `3px solid ${layerColor.accent}` : "none",
          borderRadius: 12, overflow:"hidden",
          pointerEvents:"none", animation:"fadeIn 0.12s ease-out",
          boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 0 30px ${layerColor.accent}15`,
          backdropFilter:"blur(12px)", zIndex:9999,
        }}>
          {ev.wikidata?.image && (
            <div style={{ width:"100%", height:100, overflow:"hidden" }}>
              <img src={ev.wikidata.image} alt="" style={{ width:"100%", height:100, objectFit:"cover", display:"block" }} onError={e => { e.target.parentElement.style.display = "none"; }} />
            </div>
          )}
          <div style={{ padding:"14px 18px 16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <span style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:11, fontWeight:600, color: layerColor.color, letterSpacing:2 }}>
                {formatYear(ev.year)}
              </span>
              {ev.confidence && CONFIDENCE_BADGE[ev.confidence] && (
                <span style={{
                  fontFamily:"'Share Tech Mono', monospace", fontSize:9, fontWeight:600,
                  color: CONFIDENCE_BADGE[ev.confidence].color,
                  background:`${CONFIDENCE_BADGE[ev.confidence].color}18`,
                  padding:"2px 6px", borderRadius:3, letterSpacing:1,
                }}>{CONFIDENCE_BADGE[ev.confidence].label}</span>
              )}
            </div>
            <div style={{ fontFamily:"'Cinzel', serif", fontSize:16, fontWeight:700, color: t.text, marginBottom:8, lineHeight:1.4 }}>
              {ev.title}
            </div>
            <div style={{ fontFamily:"'Lora', serif", fontSize:13, color: t.textMuted, lineHeight:1.7, marginBottom:10 }}>
              {ev.desc.length > 140 ? ev.desc.slice(0, 140) + "..." : ev.desc}
            </div>
            <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
              {ev.tags.slice(0,4).map(tag => (
                <span key={tag} style={{
                  fontFamily:"'Share Tech Mono', monospace", fontSize:10, fontWeight:600,
                  color: layerColor.accent, background:`${layerColor.accent}15`,
                  border:`1px solid ${layerColor.accent}30`, padding:"2px 8px", borderRadius:4, letterSpacing:1,
                }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function formatPreciseDate(ev) {
  const a = Math.abs(ev.year);
  const suffix = ev.year < 0 ? " BCE" : ev.year > 0 ? " CE" : "";
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  if (ev.day && ev.month) return `${months[ev.month - 1]} ${ev.day}, ${a}${suffix}`;
  if (ev.month) return `${months[ev.month - 1]} ${a}${suffix}`;
  return formatYear(ev.year);
}

const CONFIDENCE_BADGE = {
  established: { label:"Established", color:"#6a9a5a" },
  debated:     { label:"Debated",     color:"#c4aa4a" },
  legendary:   { label:"Legendary",   color:"#9a7aba" },
  approximate: { label:"Approximate", color:"#8a8a8a" },
};

const SOURCE_ICONS = {
  wikipedia: "W", wikidata: "WD", academic: "A", primary: "P",
  museum: "M", news: "N", book: "B",
};

function EventModal({ ev, onClose, allEvents, onNavigate }) {
  const { t, lc } = useTheme();
  const layerColor = lc[ev.layer] || { color:"#9a8a7a", accent:"#6a5a4a" };
  const layerLabel = LAYERS.find(l => l.id === ev.layer)?.label || "";
  const badge = CONFIDENCE_BADGE[ev.confidence] || null;

  // Resolve related events
  const relatedEvents = useMemo(() => {
    if (!ev.related || !allEvents) return [];
    return ev.related.map(rid => allEvents.find(e => e._richId === rid)).filter(Boolean);
  }, [ev, allEvents]);

  // Sorted event list for arrow navigation
  const sortedEvents = useMemo(() => allEvents ? [...allEvents].sort((a, b) => a.year - b.year) : [], [allEvents]);
  const currentIdx = sortedEvents.findIndex(e => e.id === ev.id);

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && currentIdx > 0) onNavigate(sortedEvents[currentIdx - 1]);
      if (e.key === "ArrowRight" && currentIdx < sortedEvents.length - 1) onNavigate(sortedEvents[currentIdx + 1]);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, currentIdx, sortedEvents, onNavigate]);

  return (
    <div onClick={onClose} style={{
      position:"fixed", inset:0, zIndex:1000,
      background: t.modalOverlay, backdropFilter:"blur(8px)",
      display:"flex", alignItems:"center", justifyContent:"center",
      animation:"fadeIn 0.2s ease-out",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width:660, maxWidth:"96vw", maxHeight:"92vh", overflowY:"auto",
        background: t.cardBg,
        border:`1px solid ${layerColor.accent}44`, borderTop:`3px solid ${layerColor.accent}`,
        borderRadius: window.innerWidth < 768 ? 10 : 16,
        padding: window.innerWidth < 768 ? "24px 18px" : "40px 44px",
        boxShadow:`0 40px 120px rgba(0,0,0,0.5), 0 0 60px ${layerColor.accent}10`,
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28, flexWrap:"wrap", gap:8 }}>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <span style={{
              fontFamily:"'Share Tech Mono', monospace", fontSize:13, fontWeight:700, color: layerColor.color,
              background:`${layerColor.accent}15`, border:`1px solid ${layerColor.accent}33`,
              padding:"6px 16px", borderRadius:6, letterSpacing:2, textTransform:"uppercase",
            }}>{layerLabel}</span>
            {badge && <span style={{
              fontFamily:"'Share Tech Mono', monospace", fontSize:11, fontWeight:600, color: badge.color,
              background:`${badge.color}18`, border:`1px solid ${badge.color}33`,
              padding:"4px 10px", borderRadius:4, letterSpacing:1,
            }}>{badge.label}</span>}
          </div>
          <span style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:14, fontWeight:600, color: t.textMuted, letterSpacing:1 }}>
            {formatPreciseDate(ev)}
            {ev.precision && <span style={{ fontSize:11, opacity:0.6, marginLeft:6 }}>({ev.precision})</span>}
          </span>
        </div>
        <h2 style={{ fontFamily:"'Cinzel', serif", fontSize: window.innerWidth < 768 ? 22 : 30, fontWeight:900, color: t.text, marginBottom: window.innerWidth < 768 ? 14 : 20, lineHeight:1.3 }}>
          {ev.title}
        </h2>
        <div style={{ height:2, background:`linear-gradient(90deg, ${layerColor.accent}55, transparent)`, marginBottom:24, borderRadius:1 }} />
        {ev.wikidata?.image && (
          <div style={{ marginBottom:20, borderRadius:10, overflow:"hidden", border:`1px solid ${t.border}`, maxHeight:260 }}>
            <img src={ev.wikidata.image} alt={ev.title}
              style={{ width:"100%", height:260, objectFit:"cover", display:"block" }}
              onError={e => { e.target.style.display = "none"; }}
            />
          </div>
        )}
        {ev.wikidata?.wdDescription && (
          <div style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:12, color: t.textMuted, marginBottom:14, fontStyle:"italic" }}>
            {ev.wikidata.wdDescription}
          </div>
        )}
        <p style={{ fontFamily:"'Lora', serif", fontSize:17, color: t.text, lineHeight:2, marginBottom:16, opacity:0.85 }}>
          {ev.body || ev.desc}
        </p>
        {/* Sources */}
        {ev.sources && ev.sources.length > 0 && (
          <div style={{ marginBottom:28 }}>
            <div style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:12, fontWeight:700, color: t.textMuted, letterSpacing:2, marginBottom:10, textTransform:"uppercase" }}>
              Sources
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {ev.sources.map((src, i) => (
                <a key={i} href={src.url} target="_blank" rel="noopener noreferrer"
                  style={{
                    fontFamily:"'Share Tech Mono', monospace", fontSize:13, color: layerColor.color,
                    textDecoration:"none", display:"flex", alignItems:"center", gap:8,
                    padding:"6px 10px", borderRadius:6, transition:"background 0.15s",
                    background:"transparent",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = `${layerColor.accent}12`}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{
                    fontSize:10, fontWeight:700, color: t.textMuted, background: `${t.border}`,
                    padding:"2px 6px", borderRadius:3, minWidth:22, textAlign:"center",
                  }}>{SOURCE_ICONS[src.type] || "?"}</span>
                  <span>{src.label}</span>
                  <span style={{ fontSize:11, opacity:0.4, marginLeft:"auto" }}>&#8599;</span>
                </a>
              ))}
            </div>
          </div>
        )}
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:28 }}>
          {ev.tags.map(tag => (
            <span key={tag} style={{
              fontFamily:"'Share Tech Mono', monospace", fontSize:12, fontWeight:600, color: layerColor.accent,
              background:`${layerColor.accent}12`, border:`1px solid ${layerColor.accent}28`,
              padding:"5px 14px", borderRadius:6, letterSpacing:1.5,
            }}># {tag}</span>
          ))}
        </div>
        {/* Related Events */}
        {relatedEvents.length > 0 && (
          <div style={{ marginBottom:28 }}>
            <div style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:12, fontWeight:700, color: t.textMuted, letterSpacing:2, marginBottom:10, textTransform:"uppercase" }}>
              Related Events
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {relatedEvents.map(rel => {
                const relLc = lc[rel.layer] || { color:"#9a8a7a", accent:"#6a5a4a" };
                return (
                  <button key={rel.id} onClick={() => onNavigate(rel)}
                    style={{
                      fontFamily:"'Lora', serif", fontSize:14, color: t.text, textAlign:"left",
                      background:"transparent", border:`1px solid ${t.border}`,
                      padding:"10px 14px", borderRadius:8, cursor:"pointer",
                      display:"flex", alignItems:"center", gap:10, transition:"all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${relLc.accent}12`; e.currentTarget.style.borderColor = relLc.accent + "44"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = t.border; }}
                  >
                    <span style={{
                      width:8, height:8, borderRadius:"50%", flexShrink:0,
                      background: relLc.color,
                    }} />
                    <span style={{ flex:1 }}>{rel.title}</span>
                    <span style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:11, color: t.textMuted, flexShrink:0 }}>
                      {formatYear(rel.year)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {/* Navigation */}
        <div style={{ display:"flex", gap:10, alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", gap:8 }}>
            {currentIdx > 0 && (
              <button onClick={() => onNavigate(sortedEvents[currentIdx - 1])} style={{
                fontFamily:"'Share Tech Mono', monospace", fontSize:12, fontWeight:600, letterSpacing:1,
                color: t.textMuted, background:"transparent",
                border:`1px solid ${t.border}`, padding:"8px 16px",
                borderRadius:6, cursor:"pointer", transition:"all 0.2s",
              }}
                onMouseEnter={e => { e.target.style.color = t.text; e.target.style.borderColor = t.borderHover; }}
                onMouseLeave={e => { e.target.style.color = t.textMuted; e.target.style.borderColor = t.border; }}
              >PREV</button>
            )}
            {currentIdx < sortedEvents.length - 1 && (
              <button onClick={() => onNavigate(sortedEvents[currentIdx + 1])} style={{
                fontFamily:"'Share Tech Mono', monospace", fontSize:12, fontWeight:600, letterSpacing:1,
                color: t.textMuted, background:"transparent",
                border:`1px solid ${t.border}`, padding:"8px 16px",
                borderRadius:6, cursor:"pointer", transition:"all 0.2s",
              }}
                onMouseEnter={e => { e.target.style.color = t.text; e.target.style.borderColor = t.borderHover; }}
                onMouseLeave={e => { e.target.style.color = t.textMuted; e.target.style.borderColor = t.border; }}
              >NEXT</button>
            )}
          </div>
          <button onClick={onClose} style={{
            fontFamily:"'Share Tech Mono', monospace", fontSize:13, fontWeight:700, letterSpacing:2,
            color: t.textMuted, background:"transparent",
            border:`1.5px solid ${t.border}`, padding:"10px 24px",
            borderRadius:6, cursor:"pointer", transition:"all 0.2s",
          }}
            onMouseEnter={e => { e.target.style.color = t.text; e.target.style.borderColor = t.borderHover; }}
            onMouseLeave={e => { e.target.style.color = t.textMuted; e.target.style.borderColor = t.border; }}
          >
            ESC
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════
// Mobile detection hook
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

export default function GoddessView() {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
    return "dark";
  });
  const t = THEMES[theme];
  const lc = LAYER_COLORS[theme];
  const isMobile = useIsMobile();

  const [viewStart, setViewStart] = useState(-5_000);
  const [viewEnd, setViewEnd] = useState(2026);
  const [activeLayers, setActiveLayers] = useState(new Set(LAYERS.map(l => l.id)));
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 768);
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [breathPhase, setBreathPhase] = useState(0);
  const [containerRect, setContainerRect] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [cosmicMode, setCosmicMode] = useState(false);
  const [cosmicEvent, setCosmicEvent] = useState(null);
  const searchInputRef = useRef(null);

  // Fuse.js search index
  const fuse = useMemo(() => new Fuse(EVENTS, {
    keys: [
      { name: "title", weight: 0.4 },
      { name: "desc", weight: 0.25 },
      { name: "tags", weight: 0.2 },
      { name: "body", weight: 0.15 },
    ],
    threshold: 0.35,
    includeScore: true,
  }), []);

  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    return fuse.search(searchQuery).slice(0, 8);
  }, [searchQuery, fuse]);

  // Keyboard shortcut: / to open search, Escape to close
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "/" && !searchOpen && !selectedEvent) {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [searchOpen, selectedEvent]);

  const dragRef = useRef({ startX:0, startViewStart:0, startViewEnd:0 });
  const timelineRef = useRef(null);
  const lanesRef = useRef(null);
  const animRef = useRef(null);
  const velocityRef = useRef(0);
  const edgeDriftRef = useRef(0);
  const mouseXRef = useRef(0.5);
  const lastDragXRef = useRef(0);
  const lastDragTimeRef = useRef(0);
  const viewRef = useRef({ start: viewStart, end: viewEnd });
  viewRef.current = { start: viewStart, end: viewEnd };

  // Track whether user has manually toggled theme
  const userToggledTheme = useRef(false);

  // Listen for system theme changes (only if user hasn't manually toggled)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = (e) => { if (!userToggledTheme.current) setTheme(e.matches ? "light" : "dark"); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const el = lanesRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const r = entries[0]?.contentRect;
      if (r) setContainerRect({ width: r.width, height: r.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Breathing
  useEffect(() => {
    let raf;
    const tick = () => { setBreathPhase(performance.now() * 0.002); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Edge drift + inertia
  useEffect(() => {
    let raf;
    const EDGE = 0.12, MAX = 0.015;
    const tick = () => {
      const v = viewRef.current, range = v.end - v.start;
      if (!isDragging && !isAutoPlaying) {
        const mx = mouseXRef.current;
        let drift = 0;
        if (mx < EDGE) drift = -MAX * Math.pow(1 - mx / EDGE, 2);
        else if (mx > 1 - EDGE) drift = MAX * Math.pow((mx - (1 - EDGE)) / EDGE, 2);
        edgeDriftRef.current = drift;
        if (Math.abs(drift) > 0.0001) {
          const s = drift * range;
          setViewStart(vs => vs + s); setViewEnd(ve => ve + s);
        }
      }
      if (!isDragging && Math.abs(velocityRef.current) > 0.0001) {
        const s = velocityRef.current * range;
        setViewStart(vs => vs + s); setViewEnd(ve => ve + s);
        velocityRef.current *= 0.95;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isDragging, isAutoPlaying]);

  // Auto-tour
  useEffect(() => {
    if (!isAutoPlaying) return;
    const eps = Object.values(EPOCHS);
    let idx = 0;
    const fly = () => {
      if (idx >= eps.length) { setIsAutoPlaying(false); return; }
      animateTo(eps[idx].start, eps[idx].end, 2500);
      idx++;
      return setTimeout(fly, 3000);
    };
    const timer = fly();
    return () => clearTimeout(timer);
  }, [isAutoPlaying]);

  const animateTo = useCallback((ts, te, dur = 700) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    velocityRef.current = 0;
    const fs = viewRef.current.start, fe = viewRef.current.end, st = performance.now();
    const anim = (now) => {
      const p = Math.min((now - st) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      setViewStart(fs + (ts - fs) * e); setViewEnd(fe + (te - fe) * e);
      if (p < 1) animRef.current = requestAnimationFrame(anim);
    };
    animRef.current = requestAnimationFrame(anim);
  }, []);

  const handleSearchSelect = useCallback((ev) => {
    setSelectedEvent(ev);
    setSearchOpen(false);
    setSearchQuery("");
    const range = viewRef.current.end - viewRef.current.start;
    const padding = Math.max(range * 0.1, 50);
    animateTo(ev.year - padding, ev.year + padding);
  }, [animateTo]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (animRef.current) cancelAnimationFrame(animRef.current);
    velocityRef.current = 0;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width;
    const v = viewRef.current, range = v.end - v.start, my = v.start + mx * range;
    const zf = e.deltaY > 0 ? 1.12 : 1 / 1.12;
    const nr = Math.max(10, Math.min(15e9, range * zf));
    setViewStart(my - mx * nr); setViewEnd(my + (1 - mx) * nr);
  }, []);

  const handleMouseMoveGlobal = useCallback((e) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (rect) mouseXRef.current = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    if (animRef.current) cancelAnimationFrame(animRef.current);
    velocityRef.current = 0;
    dragRef.current = { startX: e.clientX, startViewStart: viewRef.current.start, startViewEnd: viewRef.current.end };
    lastDragXRef.current = e.clientX; lastDragTimeRef.current = performance.now();
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = e.clientX - dragRef.current.startX;
    const range = dragRef.current.startViewEnd - dragRef.current.startViewStart;
    const shift = -(dx / rect.width) * range;
    setViewStart(dragRef.current.startViewStart + shift); setViewEnd(dragRef.current.startViewEnd + shift);
    const now = performance.now(), dt = now - lastDragTimeRef.current;
    if (dt > 0) velocityRef.current = -((e.clientX - lastDragXRef.current) / rect.width) * 0.5;
    lastDragXRef.current = e.clientX; lastDragTimeRef.current = now;
  }, [isDragging]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [handleMouseMove, handleMouseUp]);

  // Touch
  const touchRef = useRef({ startX:0, startViewStart:0, startViewEnd:0, lastDist:0 });
  const handleTouchStart = useCallback((e) => {
    if (animRef.current) cancelAnimationFrame(animRef.current); velocityRef.current = 0;
    if (e.touches.length === 1) touchRef.current = { startX: e.touches[0].clientX, startViewStart: viewRef.current.start, startViewEnd: viewRef.current.end, lastDist: 0 };
    else if (e.touches.length === 2) touchRef.current.lastDist = Math.abs(e.touches[0].clientX - e.touches[1].clientX);
  }, []);
  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - touchRef.current.startX;
      const range = touchRef.current.startViewEnd - touchRef.current.startViewStart;
      setViewStart(touchRef.current.startViewStart - (dx/rect.width)*range);
      setViewEnd(touchRef.current.startViewEnd - (dx/rect.width)*range);
    } else if (e.touches.length === 2) {
      const dist = Math.abs(e.touches[0].clientX - e.touches[1].clientX);
      if (touchRef.current.lastDist > 0) {
        const sc = touchRef.current.lastDist / dist, v = viewRef.current;
        const range = v.end - v.start;
        // Zoom toward the midpoint between the two fingers, not the view center
        const midClientX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midFrac = Math.max(0, Math.min(1, (midClientX - rect.left) / rect.width));
        const anchor = v.start + midFrac * range;
        const nr = Math.max(10, Math.min(15e9, range * sc));
        setViewStart(anchor - midFrac * nr); setViewEnd(anchor + (1 - midFrac) * nr);
      }
      touchRef.current.lastDist = dist;
    }
  }, []);

  const handleEpochChange = useCallback((key) => { const ep = EPOCHS[key]; animateTo(ep.start, ep.end); }, [animateTo]);
  const toggleLayer = useCallback((id) => { setActiveLayers(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }, []);

  // Derived
  const range = viewEnd - viewStart;
  const yearToPct = useCallback((y) => (y - viewStart) / range, [viewStart, range]);
  const nowPct = yearToPct(2026);

  const currentEpochKey = useMemo(() => {
    let best = "HISTORICAL", bd = Infinity;
    for (const [k, ep] of Object.entries(EPOCHS)) {
      const d = Math.abs(viewStart - ep.start) + Math.abs(viewEnd - ep.end);
      if (d < bd) { bd = d; best = k; }
    }
    return best;
  }, [viewStart, viewEnd]);

  const epochColorKey = EPOCHS[currentEpochKey].colorKey;
  const epochColor = lc[epochColorKey]?.color || "#9a8a7a";

  const visibleEvents = useMemo(() =>
    EVENTS.filter(e => activeLayers.has(e.layer) && e.year >= viewStart && e.year <= viewEnd),
    [viewStart, viewEnd, activeLayers]);

  const activeLayersList = useMemo(() => LAYERS.filter(l => activeLayers.has(l.id)), [activeLayers]);
  const activeLayerIds = useMemo(() => activeLayersList.map(l => l.id), [activeLayersList]);

  const eventsByLayer = useMemo(() => {
    const m = {}; LAYERS.forEach(l => { m[l.id] = []; });
    visibleEvents.forEach(ev => { if (m[ev.layer]) m[ev.layer].push(ev); });
    return m;
  }, [visibleEvents]);

  const rulerTicks = useMemo(() => getRulerTicks(viewStart, viewEnd), [viewStart, viewEnd]);

  const zoomLabel = range > 1e9 ? "COSMIC" : range > 1e6 ? "GEOLOGICAL" : range > 1e4 ? "DEEP TIME"
    : range > 1000 ? "HISTORICAL" : range > 100 ? "CENTURY" : range > 20 ? "GENERATION" : "DECADE";

  const globalCSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;900&family=Share+Tech+Mono&family=Lora:ital,wght@0,400;0,500;1,400&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden;background:${t.bg}}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:${theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.03)"}}
::-webkit-scrollbar-thumb{background:${t.scrollThumb};border-radius:2px}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideInRight{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:translateX(0)}}
.epoch-scroll::-webkit-scrollbar{display:none}
`;

  if (cosmicMode) {
    return (
      <ThemeContext.Provider value={theme}>
        <div style={{ width:"100vw", height:"100vh", overflow:"hidden" }}>
          <Suspense fallback={
            <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", background: t.bg }}>
              <div style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:14, color: t.textMuted, letterSpacing:3 }}>LOADING COSMIC VIEW...</div>
            </div>
          }>
            <CosmicView theme={theme} onBack={() => setCosmicMode(false)} onSelectEvent={setCosmicEvent} />
          </Suspense>
        </div>
        {cosmicEvent && (
          <EventModal
            ev={cosmicEvent}
            onClose={() => setCosmicEvent(null)}
            allEvents={EVENTS}
            onNavigate={setCosmicEvent}
          />
        )}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={theme}>
    <div style={{ width:"100vw", height:"100vh", overflow:"hidden", display:"flex", flexDirection:"column", position:"relative", color: t.text }}>
      <style>{globalCSS}</style>
      <Starfield panOffset={viewStart} theme={theme} />

      {/* ── HEADER ── */}
      <div style={{
        position:"relative", zIndex:50, flexShrink:0,
        padding: isMobile ? "10px 12px 8px" : "16px 28px 14px",
        background: t.headerBg,
        borderBottom:`1px solid ${t.border}`,
        backdropFilter:"blur(20px)",
        display:"flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center", gap: isMobile ? 8 : 20,
      }}>
        {/* Top row: logo + controls */}
        <div style={{ display:"flex", alignItems:"center", gap: isMobile ? 10 : 20 }}>
          <div style={{ flexShrink:0 }}>
            <div style={{ fontFamily:"'Cinzel', serif", fontSize: isMobile ? 16 : 22, fontWeight:900, color: t.text, letterSpacing: isMobile ? 3 : 5, lineHeight:1.1 }}>
              SIMURGH
            </div>
            {!isMobile && <div style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:11, fontWeight:600, color: t.textMuted, letterSpacing:3, marginTop:3 }}>
              HERSTORY OF TIME
            </div>}
          </div>

          {!isMobile && <div style={{ width:1, height:36, background: t.border, flexShrink:0 }} />}

          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap: isMobile ? 8 : 14, flexShrink:0 }}>
            <button onClick={() => { setSearchOpen(p => !p); if (!searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50); }} style={{
              fontFamily:"'Share Tech Mono', monospace", fontSize:11, fontWeight:700, letterSpacing:1.5,
              padding: isMobile ? "6px 10px" : "7px 14px", borderRadius:5, cursor:"pointer",
              border: searchOpen ? `1.5px solid ${epochColor}` : `1px solid ${t.border}`,
              background: searchOpen ? `${epochColor}18` : "transparent",
              color: searchOpen ? epochColor : t.textMuted,
              transition:"all 0.3s",
            }}>
              &#x2315;
            </button>
            <button onClick={() => setIsAutoPlaying(p => !p)} style={{
              fontFamily:"'Share Tech Mono', monospace", fontSize:11, fontWeight:700, letterSpacing:1.5,
              padding: isMobile ? "6px 10px" : "7px 16px", borderRadius:5, cursor:"pointer",
              border: isAutoPlaying ? `1.5px solid ${t.nowColor}` : `1px solid ${t.border}`,
              background: isAutoPlaying ? `${t.nowColor}18` : "transparent",
              color: isAutoPlaying ? t.nowColor : t.textMuted,
              transition:"all 0.3s",
            }}>
              {isAutoPlaying ? "■" : "▶"}
            </button>

            <button onClick={() => { userToggledTheme.current = true; setTheme(p => p === "dark" ? "light" : "dark"); }} style={{
              fontFamily:"'Share Tech Mono', monospace", fontSize:11, fontWeight:700,
              padding: isMobile ? "6px 10px" : "7px 14px", borderRadius:5, cursor:"pointer",
              border:`1px solid ${t.border}`, background:"transparent", color: t.textMuted,
              transition:"all 0.3s", letterSpacing:1,
            }}>
              {theme === "dark" ? "☀" : "☾"}
            </button>

            <button onClick={() => setCosmicMode(true)} style={{
              fontFamily:"'Share Tech Mono', monospace", fontSize:11, fontWeight:700,
              padding: isMobile ? "6px 10px" : "7px 14px", borderRadius:5, cursor:"pointer",
              border:`1px solid ${t.border}`, background:"transparent", color: t.textMuted,
              transition:"all 0.3s", letterSpacing:1,
            }}>
              ◈
            </button>

            {!isMobile && <div style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:11, fontWeight:600, color: t.textMuted, letterSpacing:1.5, textAlign:"right" }}>
              <div><span style={{ color: epochColor, fontWeight:700 }}>{visibleEvents.length}</span> EVENTS</div>
              <div style={{ opacity:0.6, fontSize:10 }}>{zoomLabel}</div>
            </div>}
            <button onClick={() => setSidebarOpen(p => !p)} style={{
              fontFamily:"'Share Tech Mono', monospace", fontSize:11, fontWeight:700, letterSpacing:1.5,
              padding: isMobile ? "6px 10px" : "7px 14px", background:"transparent",
              border:`1px solid ${t.border}`, color: t.textMuted,
              borderRadius:5, cursor:"pointer",
            }}>
              {sidebarOpen ? "◁" : "▷"}
            </button>
          </div>
        </div>

        {/* Search bar */}
        {searchOpen && (
          <div style={{ position:"relative", zIndex:200 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search events, people, ideas..."
                style={{
                  flex:1, fontFamily:"'Lora', serif", fontSize: isMobile ? 14 : 15,
                  padding: isMobile ? "8px 12px" : "10px 16px", borderRadius:8,
                  background: t.surface, color: t.text,
                  border:`1px solid ${epochColor}44`, outline:"none",
                  caretColor: epochColor,
                }}
                onKeyDown={e => {
                  if (e.key === "Enter" && searchResults.length > 0) handleSearchSelect(searchResults[0].item);
                  if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); }
                }}
                autoFocus
              />
              <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }} style={{
                fontFamily:"'Share Tech Mono', monospace", fontSize:11, fontWeight:700,
                padding:"8px 12px", borderRadius:6, cursor:"pointer",
                border:`1px solid ${t.border}`, background:"transparent", color: t.textMuted,
              }}>ESC</button>
            </div>
            {searchResults.length > 0 && (
              <div style={{
                position:"absolute", top:"100%", left:0, right:0, marginTop:4,
                background: t.cardBg, border:`1px solid ${t.border}`,
                borderRadius:10, overflow:"hidden", backdropFilter:"blur(12px)",
                boxShadow:"0 12px 40px rgba(0,0,0,0.3)", maxHeight:360, overflowY:"auto",
              }}>
                {searchResults.map(({ item, score }) => {
                  const lCol = lc[item.layer] || { color:"#9a8a7a", accent:"#6a5a4a" };
                  return (
                    <button key={item.id} onClick={() => handleSearchSelect(item)} style={{
                      display:"flex", alignItems:"center", gap:10, width:"100%", textAlign:"left",
                      padding: isMobile ? "10px 12px" : "12px 16px", cursor:"pointer",
                      background:"transparent", border:"none", borderBottom:`1px solid ${t.border}`,
                      transition:"background 0.15s",
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = `${lCol.accent}12`}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <span style={{ width:8, height:8, borderRadius:"50%", flexShrink:0, background: lCol.color }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:"'Cinzel', serif", fontSize:14, fontWeight:700, color: t.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {item.title}
                        </div>
                        <div style={{ fontFamily:"'Lora', serif", fontSize:12, color: t.textMuted, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {item.desc}
                        </div>
                      </div>
                      <span style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:11, color: lCol.color, flexShrink:0 }}>
                        {formatYear(item.year)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Epoch buttons — horizontal scroll on mobile */}
        <div className="epoch-scroll" style={{
          display:"flex", gap:5,
          overflowX: isMobile ? "auto" : "visible", flexWrap: isMobile ? "nowrap" : "wrap",
          WebkitOverflowScrolling:"touch", scrollbarWidth:"none", msOverflowStyle:"none",
          paddingBottom: isMobile ? 2 : 0,
        }}>
          {Object.entries(EPOCHS).map(([key, ep]) => {
            const active = currentEpochKey === key;
            const ec = lc[ep.colorKey]?.color || "#9a8a7a";
            return (
              <button key={key} onClick={() => handleEpochChange(key)} style={{
                fontFamily:"'Share Tech Mono', monospace", fontSize: isMobile ? 10 : 11, fontWeight:700, letterSpacing:1.5,
                padding: isMobile ? "5px 10px" : "7px 14px", borderRadius:5, cursor:"pointer",
                border: active ? `1.5px solid ${ec}` : `1px solid ${t.border}`,
                background: active ? `${ec}18` : "transparent",
                color: active ? ec : t.textMuted,
                transition:"all 0.3s", flexShrink:0, whiteSpace:"nowrap",
              }}
                onMouseEnter={e => { if (!active) { e.target.style.borderColor = `${ec}66`; e.target.style.color = ec; }}}
                onMouseLeave={e => { if (!active) { e.target.style.borderColor = t.border; e.target.style.color = t.textMuted; }}}
              >
                {ep.label}
                {!isMobile && <span style={{ display:"block", fontSize:9, fontWeight:600, opacity:0.5, marginTop:2 }}>{ep.sub}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ display:"flex", flex:1, overflow:"hidden", position:"relative", zIndex:10 }}>

        {sidebarOpen && (
          <>
            {/* Mobile overlay backdrop */}
            {isMobile && <div onClick={() => setSidebarOpen(false)} style={{
              position:"absolute", inset:0, zIndex:90, background:"rgba(0,0,0,0.5)",
            }} />}
            <div style={{
              width: isMobile ? 200 : 210, flexShrink:0, display:"flex", flexDirection:"column",
              background: t.surface, borderRight:`1px solid ${t.border}`,
              overflowY:"auto", backdropFilter:"blur(10px)",
              animation:"slideInRight 0.2s ease-out",
              ...(isMobile ? { position:"absolute", left:0, top:0, bottom:0, zIndex:100 } : {}),
            }}>
              <div style={{ padding: isMobile ? "14px 12px 8px" : "18px 16px 12px", fontFamily:"'Share Tech Mono', monospace", fontSize:10, fontWeight:700, color: t.textDim, letterSpacing:3 }}>
                DIMENSIONS
              </div>
              {LAYERS.map((layer) => {
                const lCol = lc[layer.id] || { color:"#9a8a7a", accent:"#6a5a4a" };
                return (
                  <button key={layer.id} onClick={() => toggleLayer(layer.id)} style={{
                    display:"flex", alignItems:"center", gap: isMobile ? 8 : 12, padding: isMobile ? "9px 12px" : "11px 16px",
                    background: activeLayers.has(layer.id) ? `${lCol.accent}0c` : "transparent",
                    border:"none", borderLeft: `3px solid ${activeLayers.has(layer.id) ? lCol.accent : "transparent"}`,
                    cursor:"pointer", textAlign:"left", transition:"all 0.2s",
                  }}>
                    <div style={{
                      width:11, height:11, borderRadius:"50%",
                      background: activeLayers.has(layer.id) ? lCol.color : t.textDim,
                      boxShadow: activeLayers.has(layer.id) ? `0 0 8px ${lCol.accent}66` : "none",
                      flexShrink:0, transition:"all 0.2s",
                    }} />
                    <span style={{
                      fontFamily:"'Share Tech Mono', monospace", fontSize: isMobile ? 10 : 11, fontWeight:700, letterSpacing:1.2,
                      color: activeLayers.has(layer.id) ? lCol.color : t.textDim,
                      transition:"all 0.2s",
                    }}>{layer.label}</span>
                  </button>
                );
              })}
              {!isMobile && <div style={{ padding:"20px 16px 16px", marginTop:"auto", borderTop:`1px solid ${t.border}` }}>
                <div style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:11, fontWeight:600, color: t.textDim, lineHeight:2.4, letterSpacing:0.5 }}>
                  SCROLL → ZOOM<br/>DRAG → PAN<br/>EDGE → DRIFT<br/>HOVER → LINKS<br/>▶ TOUR → FLY
                </div>
              </div>}
            </div>
          </>
        )}

        {/* TIMELINE */}
        <div
          ref={timelineRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMoveGlobal}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          style={{
            flex:1, overflow:"hidden", display:"flex", flexDirection:"column",
            cursor: isDragging ? "grabbing" : "grab",
            userSelect:"none", WebkitUserSelect:"none", position:"relative",
            touchAction:"none",
          }}
        >
          {/* RULER */}
          <div style={{
            position:"relative", height: isMobile ? 40 : 56, flexShrink:0,
            background: theme === "dark"
              ? "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(13,12,10,0.3) 100%)"
              : "linear-gradient(180deg, rgba(245,240,232,0.8) 0%, rgba(235,228,216,0.4) 100%)",
            borderBottom:`1px solid ${t.border}`, overflow:"hidden",
          }}>
            {rulerTicks.map((year, i) => {
              const pct = yearToPct(year);
              if (pct < -0.05 || pct > 1.05) return null;
              return (
                <div key={i} style={{
                  position:"absolute", left:`${pct*100}%`, top:0, height:"100%",
                  display:"flex", flexDirection:"column", alignItems:"center",
                }}>
                  <div style={{ width:1, height: year === 0 ? 32 : 20, background: year === 0 ? `${epochColor}55` : t.textDim, marginTop:"auto" }} />
                  <span style={{
                    fontFamily:"'Share Tech Mono', monospace", fontSize: isMobile ? 9 : 12, fontWeight:700, letterSpacing:0.5,
                    color: year === 0 ? epochColor : t.rulerText,
                    whiteSpace:"nowrap", transform:"translateX(-50%)", marginBottom: isMobile ? 3 : 6,
                  }}>{formatYear(year)}</span>
                </div>
              );
            })}
            <div style={{ position:"absolute", top:6, right:14, fontFamily:"'Share Tech Mono', monospace", fontSize:11, fontWeight:600, color: t.textDim, letterSpacing:1 }}>
              {formatYear(viewStart)} → {formatYear(viewEnd)}
            </div>
          </div>

          {/* LANES */}
          <div ref={lanesRef} style={{ flex:1, display:"flex", flexDirection:"column", position:"relative", overflow:"hidden" }}>
            <ParticleCanvas events={visibleEvents} yearToPct={yearToPct} layerColors={lc} containerRect={containerRect} />
            <ConnectionLines hoveredEvent={hoveredEvent} visibleEvents={visibleEvents} yearToPct={yearToPct} activeLayerIds={activeLayerIds} layerColors={lc} containerRect={containerRect} />

            {nowPct >= -0.01 && nowPct <= 1.01 && (
              <div style={{
                position:"absolute", left:`${nowPct*100}%`, top:0, bottom:0, width:2,
                background:`linear-gradient(180deg, transparent 0%, ${t.nowColor}33 10%, ${t.nowColor}66 50%, ${t.nowColor}33 90%, transparent 100%)`,
                pointerEvents:"none", zIndex:50,
              }}>
                <div style={{
                  position:"absolute", top:6, left:-18,
                  fontFamily:"'Share Tech Mono', monospace", fontSize:11, fontWeight:700, color: t.nowColor,
                  letterSpacing:1.5, background: theme === "dark" ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.8)",
                  border:`1px solid ${t.nowColor}44`, padding:"4px 10px", borderRadius:4, whiteSpace:"nowrap",
                }}>NOW</div>
              </div>
            )}

            <div style={{ position:"absolute", left:0, top:0, bottom:0, width:60, background:`linear-gradient(90deg, ${t.fadeEdge}, transparent)`, pointerEvents:"none", zIndex:30 }} />
            <div style={{ position:"absolute", right:0, top:0, bottom:0, width:60, background:`linear-gradient(90deg, transparent, ${t.fadeEdge})`, pointerEvents:"none", zIndex:30 }} />

            <div style={{ flex:1, overflowY:"auto", overflowX:"hidden" }}>
              {activeLayersList.map(layer => {
                const events = eventsByLayer[layer.id] || [];
                const lCol = lc[layer.id] || { color:"#9a8a7a", accent:"#6a5a4a" };
                return (
                  <div key={layer.id} style={{
                    position:"relative", height: isMobile ? 56 : 82, flexShrink:0,
                    borderBottom:`1px solid ${t.border}`,
                    background:`linear-gradient(90deg, ${lCol.accent}06 0%, transparent 5%, transparent 95%, ${lCol.accent}06 100%)`,
                  }}>
                    <div style={{
                      position:"absolute", top:"50%", left:0, right:0, height:1,
                      background:`linear-gradient(90deg, transparent 0%, ${lCol.accent}18 10%, ${lCol.accent}10 90%, transparent 100%)`,
                      transform:"translateY(-50%)", pointerEvents:"none",
                    }} />
                    <div style={{
                      position:"absolute", left: isMobile ? 6 : 14, top:"50%", transform:"translateY(-50%)",
                      display:"flex", alignItems:"center", gap: isMobile ? 4 : 8, zIndex:20, pointerEvents:"none",
                      background:`linear-gradient(90deg, ${t.fadeEdge} 0%, ${t.fadeEdge.replace("0.9","0.3")} 80%, transparent 100%)`,
                      paddingRight: isMobile ? 12 : 28, paddingTop:2, paddingBottom:2,
                    }}>
                      <div style={{ width: isMobile ? 5 : 7, height: isMobile ? 5 : 7, borderRadius:"50%", background: lCol.color, boxShadow:`0 0 6px ${lCol.accent}55`, flexShrink:0 }} />
                      <span style={{ fontFamily:"'Share Tech Mono', monospace", fontSize: isMobile ? 8 : 11, fontWeight:700, letterSpacing: isMobile ? 0.5 : 1.5, color: lCol.color, opacity:0.65, whiteSpace:"nowrap" }}>{isMobile ? layer.label.split(" ")[0] : layer.label}</span>
                    </div>
                    {events.map(ev => {
                      const pct = yearToPct(ev.year);
                      if (pct < -0.05 || pct > 1.05) return null;
                      return <EventNode key={ev.id} ev={ev} xPct={pct} onClick={setSelectedEvent} selected={selectedEvent?.id === ev.id} onHover={setHoveredEvent} breathPhase={breathPhase} isMobile={isMobile} />;
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* STATUS BAR */}
      <div style={{
        position:"relative", zIndex:50, flexShrink:0, height: isMobile ? 28 : 34,
        display:"flex", alignItems:"center", padding: isMobile ? "0 10px" : "0 24px", gap: isMobile ? 12 : 28,
        background: t.surface, borderTop:`1px solid ${t.border}`,
      }}>
        {(isMobile ? [
          ["EVENTS", `${visibleEvents.length}`],
          ["ZOOM", zoomLabel],
        ] : [
          ["ZOOM", zoomLabel],
          ["RANGE", `${formatYear(viewStart)} → ${formatYear(viewEnd)}`],
          ["EVENTS", `${visibleEvents.length} / ${EVENTS.length}`],
          ["LAYERS", `${activeLayers.size} / ${LAYERS.length}`],
        ]).map(([k, v]) => (
          <span key={k} style={{ fontFamily:"'Share Tech Mono', monospace", fontSize: isMobile ? 10 : 11, fontWeight:600, letterSpacing:1, color: t.textDim }}>
            <span style={{ color: epochColor, marginRight:6, fontWeight:700 }}>{k}</span>{v}
          </span>
        ))}
        {!isMobile && <span style={{ marginLeft:"auto", fontFamily:"'Share Tech Mono', monospace", fontSize:10, fontWeight:600, color: t.textDim, letterSpacing:1.5 }}>
          Simurgh's View — Because human HERstory deserves to be seen whole.
        </span>}
        {isMobile && <span style={{ marginLeft:"auto", fontFamily:"'Share Tech Mono', monospace", fontSize:9, fontWeight:600, color: t.textDim, letterSpacing:1 }}>
          {formatYear(viewStart)} → {formatYear(viewEnd)}
        </span>}
      </div>

      {selectedEvent && <EventModal ev={selectedEvent} onClose={() => setSelectedEvent(null)} allEvents={EVENTS} onNavigate={setSelectedEvent} />}
    </div>
    </ThemeContext.Provider>
  );
}
