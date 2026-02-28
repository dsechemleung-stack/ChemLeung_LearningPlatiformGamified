import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
// HOTSPOTS — coordinates are % of ChemistreeIcon_square.png
// ─────────────────────────────────────────────────────────────────────────────
const HOTSPOTS = [
  {
    id: 1771666541657,
    label: 'Bridging Theory and Practice',
    subtitle: 'Roots intertwining Book and Lab Sink',
    info: 'Both of the ideas in your head and the experiments in your hands are crucial. They grow together, like roots wrapped around a book and a lab sink. That is how real chemistry happens.',
    polygon: [[28.33,63.16],[26.53,64.91],[31.54,66.14],[38.56,65.08],[37.76,62.81],[42.77,63.16],[58.62,61.93],[68.25,64.21],[72.26,64.38],[70.25,62.28],[72.46,61.06],[74.67,61.76],[74.87,56.33],[69.45,55.98],[72.46,52.82],[75.87,53.7],[77.27,58.25],[76.87,62.63],[78.08,63.33],[78.48,61.41],[81.49,61.93],[83.09,71.39],[79.68,74.19],[64.44,75.59],[75.67,78.22],[81.69,84],[79.28,84.88],[73.86,80.67],[68.05,78.92],[70.25,82.43],[73.86,84.18],[65.04,81.73],[63.23,78.75],[60.63,77.52],[62.03,82.43],[58.42,78.4],[52.8,76.47],[55.01,80.32],[53.61,85.4],[51.8,79.8],[45.78,83.83],[43.58,87.51],[43.98,82.25],[48.79,79.45],[48.59,77],[45.78,75.42],[40.57,78.92],[36.36,85.58],[33.75,85.75],[37.76,80.15],[31.74,81.9],[26.13,86.45],[27.73,79.97],[34.75,77.17],[30.54,76.3],[25.12,77.7],[30.74,74.54],[37.36,76.3],[40.57,74.37],[28.13,73.84],[25.32,74.02],[25.32,76.82],[23.32,75.24],[20.91,77.17],[21.31,73.32],[18.9,74.37],[18.5,72.97],[12.49,72.97],[14.09,68.41],[18.5,62.81]],
  },
  {
    id: 1771666803783,
    label: 'Continuous Growth and Resilience',
    subtitle: 'Intertwining Branches, Green and Wilted Leaves',
    info: 'Look at the branches of chemistry: organic, physical, analytical... They all connect. Now look at the leaves. Green ones are your good days, when things click. Yellow ones are the rough days, when you fail. Both are part of learning. The hard days do not last, but growth does.',
    polygon: [[21.31,31.63],[14.49,30.75],[7.47,32.5],[13.29,37.06],[23.92,33.38],[27.33,34.43],[20.51,40.39],[22.52,48.27],[27.33,42.84],[27.13,36.53],[34.55,39.86],[30.94,41.44],[28.93,44.94],[30.94,51.25],[33.75,43.89],[33.75,41.96],[37.96,41.96],[46.99,45.64],[55.81,46.87],[69.65,39.16],[72.06,44.06],[81.09,46.34],[78.08,40.74],[84.5,38.46],[86.3,33.2],[75.07,36.18],[77.48,26.72],[76.87,25.15],[70.45,31.28],[71.46,36.36],[53.81,43.01],[54.81,21.29],[62.83,20.42],[66.04,23.05],[73.86,21.99],[66.84,18.67],[69.05,17.09],[54.81,19.02],[53.61,0.45],[46.38,0.62],[46.38,19.02],[30.74,18.49],[33.55,20.24],[28.33,25.15],[35.55,23.75],[35.55,28.48],[42.17,24.1],[41.77,21.29],[46.79,23.57],[47.19,42.49],[34.95,37.58],[34.35,31.28],[26.53,28.12],[28.73,33.56]],
  },
  {
    id: 1771666828766,
    label: 'Continuous Growth and Resilience',
    subtitle: 'Wilted Leaves',
    info: 'Wilted leaves can mean a failed quiz, a confusion, or a loss. But remember, no one is perfect. Just keep going.',
    polygon: [[29.2,34.65],[24.32,38.98],[25.59,47.84],[30.29,42.24],[29.02,37.72],[29.38,34.47],[29.38,34.47]],
  },
  {
    id: 1771666828766,
    label: 'Continuous Growth and Resilience',
    subtitle: 'Wilted Leaves',
    info: 'Wilted leaves can mean a failed quiz, a confusion, or a loss. But remember, no one is perfect. Just keep going.',
    polygon: [[34.8,41.15],[31.55,43.14],[31.01,46.75],[33.18,49.46],[33.18,51.27],[36.07,44.04],[34.98,40.61],[34.98,40.61]],
  },
  {
    id: 1771666857730,
    label: 'Essential Skills and Awareness',
    subtitle: "The 'C' Hook",
    info: '"C" for Chemistry. It is everywhere. In the food you eat, the air you breathe, the choices you make. That\'s why Chemistry is often referred to the "Central Science".',
    polygon: [[61.63,18.67],[57.42,16.91],[56.01,20.77],[58.42,24.27],[63.23,22.87]],
  },
  {
    id: 1771666929462,
    label: 'Essential Skills and Awareness',
    subtitle: 'Volumetric Flask',
    info: 'This flask is about getting it right. Precision. Care. Good technique. You build these skills one lab at a time.',
    polygon: [[60.63,21.64],[60.43,26.02],[57.42,27.42],[57.22,31.63],[61.63,33.56],[66.04,32.33],[67.25,27.95],[63.23,25.85]],
  },
  {
    id: 1772181565920,
    label: 'Essential Skills and Awareness',
    subtitle: 'The Mole',
    info: 'Stoichiometry and calculation. They\'re not everyone\'s favorite. But once you master it, you realize it\'s just pattern recognition with a dash of unit conversion.',
    polygon: [[35.17,58],[39.73,59.51],[38.02,62.17],[39.35,65.02],[33.09,66.35],[29.29,65.21],[31.95,61.6],[31.95,58.76],[35.17,57.81],[35.17,57.81]],
  },
  {
    id: 1771666983927,
    label: 'Continuous Growth and Resilience',
    subtitle: 'The Measuring Cylinder Trunk',
    info: 'The trunk is your learning journey. Drop by drop, day by day. Some days you barely notice the water rise, but it does. Keep showing up. It adds up.',
    polygon: [[46.59,0.27],[45.58,64.03],[57.42,63.16],[54.21,0.45]],
  },
  {
    id: 1771667067985,
    label: 'Transdisciplinary Impact',
    subtitle: 'The Benzene Hexagon',
    info: 'In benzene (not病先), electrons are delocalized, making the molecule stable [out-syl info. :)]. Your knowledge should do the same. Connect chemistry to other discplines and the community. And the green background? It tells you to do something good to our planet. We learn chemistry to help, not to harm.',
    polygon: [[50,1.15],[1.45,24.62],[1.05,74.54],[49.39,99.77],[98.94,74.19],[98.94,24.8]],
  },
];

// Text image — whole hover triggers BOTH simultaneously
const TEXT_HOTSPOTS = [
  {
    id: 'text-science',
    label: 'What Chemistree Means',
    subtitle: 'Chemist-ree: Science for Everyone',
    info: 'You don\'t need a white coat to be a chemist. You just need curiosity and creativity. Chemistree helps you use science in real life. To understand what you read, to question what you hear.',
  },
  {
    id: 'text-community',
    label: 'What Chemistree Means',
    subtitle: 'Chem-is-tree: Growing Together',
    info: 'A tree is never alone. It is part of a forest. Same for chemistry. You are part of something bigger. We learn together, struggle together, win together. Your growth helps us all grow.',
  },
];

const CATEGORIES = [
  { id: 'theory',           label: 'Bridging Theory & Practice',     icon: '⚗',  color: '#76A8A5', hotspotIds: [1771666541657] },
  { id: 'skills',           label: 'Essential Skills & Awareness',   icon: '🔬', color: '#C5D7B5', hotspotIds: [1771666857730, 1771666929462, 1772181565920] },
  { id: 'growth',           label: 'Continuous Growth & Resilience', icon: '🌿', color: '#a8d4a0', hotspotIds: [1771666803783, 1771666828766, 1771666983927] },
  { id: 'transdisciplinary',label: 'Transdisciplinary Impact',       icon: '⬡',  color: '#B69A84', hotspotIds: [1771667067985] },
  { id: 'meaning',          label: 'What Chemistree Means',          icon: '✦',  color: '#d4c5a5', hotspotIds: ['text-science','text-community'] },
];

function getCategoryForHotspot(hId) {
  return CATEGORIES.find(c => c.hotspotIds.includes(hId)) || null;
}

function pointInPolygon(px, py, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function toElemPercent(e, el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const px = ((e.clientX - r.left) / r.width) * 100;
  const py = ((e.clientY - r.top) / r.height) * 100;
  if (px < 0 || px > 100 || py < 0 || py > 100) return null;
  return [px, py];
}

function pctToCanvas(px, py, imgEl, canvasEl) {
  const ir = imgEl.getBoundingClientRect();
  const cr = canvasEl.getBoundingClientRect();
  return [(ir.left - cr.left) + (px / 100) * ir.width, (ir.top - cr.top) + (py / 100) * ir.height];
}

const ZONE_COLORS = ['#76A8A5','#C5D7B5','#B69A84','#a8c5a5','#d4b896','#7fb3b0','#e8c99e'];

export default function VisionPage() {
  const navigate  = useNavigate();
  const stageRef  = useRef(null);
  const canvasRef = useRef(null);
  const iconRef   = useRef(null);
  const textRef   = useRef(null);
  const backdropTapRef = useRef({ down: false, x: 0, y: 0 });

  // Mobile panel toggle state
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [compactPopupOpen, setCompactPopupOpen] = useState(false);
  const [popupItems, setPopupItems] = useState([]);
  const [isCompactHeight, setIsCompactHeight] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight <= 620;
  });
  const [isMobileWidth, setIsMobileWidth] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  const popupMode = isMobileWidth || isCompactHeight;

  // Active triggers — array of hotspot objects (multi-trigger)
  const [activeItems, setActiveItems]   = useState([]);
  const [activeCategories, setActiveCats] = useState([]);
  const [cursorPos, setCursorPos]       = useState({ x: 0, y: 0 });

  // Dev
  const [devMode, setDevMode]           = useState(false);
  const [devZones, setDevZones]         = useState([]);
  const [drawing, setDrawing]           = useState(false);
  const [currentPts, setCurrentPts]     = useState([]);
  const [pendingZone, setPendingZone]   = useState(null);
  const [labelInput, setLabelInput]     = useState('');
  const [infoInput, setInfoInput]       = useState('');
  const [hoverPt, setHoverPt]           = useState(null);
  const [exportText, setExportText]     = useState('');

  const handleBack = () => window.history.length > 1 ? navigate(-1) : navigate('/', { replace: true });

  // ── Canvas redraw ─────────────────────────────────────────────────────────
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current, icon = iconRef.current;
    if (!canvas || !icon) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const toC = (px, py) => pctToCanvas(px, py, icon, canvas);
    devZones.forEach((zone, idx) => {
      const color = ZONE_COLORS[idx % ZONE_COLORS.length];
      const pts = zone.polygon; if (pts.length < 2) return;
      ctx.beginPath(); ctx.moveTo(...toC(...pts[0]));
      pts.slice(1).forEach(p => ctx.lineTo(...toC(...p)));
      ctx.closePath(); ctx.fillStyle = color+'28'; ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([]); ctx.stroke();
      const cx = pts.reduce((s,p)=>s+p[0],0)/pts.length, cy = pts.reduce((s,p)=>s+p[1],0)/pts.length;
      const [lx,ly] = toC(cx,cy);
      ctx.font = 'bold 12px Quicksand,sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(zone.label, lx, ly);
    });
    if (drawing && currentPts.length > 0) {
      ctx.beginPath(); ctx.moveTo(...toC(...currentPts[0]));
      currentPts.slice(1).forEach(p => ctx.lineTo(...toC(...p)));
      if (hoverPt) ctx.lineTo(...toC(...hoverPt));
      ctx.strokeStyle = '#76A8A5'; ctx.lineWidth = 2; ctx.setLineDash([6,3]); ctx.stroke();
      currentPts.forEach((p,i) => { const [vx,vy] = toC(...p); ctx.beginPath(); ctx.arc(vx,vy,i===0?7:4,0,Math.PI*2); ctx.fillStyle = i===0?'#C5D7B5':'#76A8A5'; ctx.fill(); });
    }
  }, [devZones, drawing, currentPts, hoverPt]);

  useEffect(() => { redrawCanvas(); }, [redrawCanvas]);
  useEffect(() => {
    const resize = () => { const c=canvasRef.current,s=stageRef.current; if(!c||!s)return; c.width=s.offsetWidth; c.height=s.offsetHeight; redrawCanvas(); };
    resize(); window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize);
  }, [redrawCanvas]);

  // ── Shared hit-test — works for mouse and touch ──────────────────────────
  const runHitTest = useCallback((clientX, clientY) => {
    const sr = stageRef.current?.getBoundingClientRect();
    if (!sr) return [];
    setCursorPos({ x: clientX - sr.left, y: clientY - sr.top });

    const hits = [];
    const fakeE = { clientX, clientY };

    // Text image — whole area triggers BOTH simultaneously
    const textPct = toElemPercent(fakeE, textRef.current);
    if (textPct) hits.push(...TEXT_HOTSPOTS);

    // Icon zones — ALL matching polygons
    const iconPct = toElemPercent(fakeE, iconRef.current);
    if (iconPct) HOTSPOTS.forEach(h => { if (pointInPolygon(...iconPct, h.polygon)) hits.push(h); });

    if (hits.length > 0) {
      const seen = new Set();
      const unique = hits.filter(h => { if (seen.has(h.id)) return false; seen.add(h.id); return true; });
      setActiveItems(unique);
      setActiveCats([...new Set(unique.map(h => getCategoryForHotspot(h.id)?.id).filter(Boolean))]);
      return unique;
    } else {
      setActiveItems([]); setActiveCats([]);
      return [];
    }
  }, [isCompactHeight, isMobileWidth]);

  useEffect(() => {
    const onResize = () => {
      setIsCompactHeight(window.innerHeight <= 620);
      setIsMobileWidth(window.innerWidth < 768);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!popupMode) {
      setCompactPopupOpen(false);
      setPopupItems([]);
    }
  }, [popupMode]);

  // ── Mouse move ────────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e) => {
    if (devMode) {
      const sr = stageRef.current?.getBoundingClientRect();
      if (sr) setCursorPos({ x: e.clientX - sr.left, y: e.clientY - sr.top });
      if (drawing) { const pct = toElemPercent(e, iconRef.current); if (pct) setHoverPt(pct); }
      return;
    }
    if (popupMode) return;
    runHitTest(e.clientX, e.clientY);
  }, [devMode, drawing, runHitTest, popupMode]);

  // ── Touch / click (mobile) ────────────────────────────────────────────────
  const handleTouchEnd = useCallback((e) => {
    if (devMode) return;
    const t = e.changedTouches?.[0];
    if (!t) return;
    const unique = runHitTest(t.clientX, t.clientY);
    if (unique.length > 0) {
      if (popupMode) {
        setPopupItems(unique);
        setCompactPopupOpen(true);
        setMobilePanelOpen(false);
      } else {
        setMobilePanelOpen(true);
        setCompactPopupOpen(false);
      }
    } else {
      setCompactPopupOpen(false);
      setPopupItems([]);
      setMobilePanelOpen(false);
    }
  }, [devMode, runHitTest, popupMode]);

  const handleStageClick = useCallback((e) => {
    if (devMode) { handleDevClick(e); return; }
    // On desktop click, just run hit-test; on mobile this fires after touchend
    const unique = runHitTest(e.clientX, e.clientY);

    if (unique.length > 0) {
      if (popupMode) {
        setPopupItems(unique);
        setCompactPopupOpen(true);
        setMobilePanelOpen(false);
      } else {
        setPopupItems([]);
        setMobilePanelOpen(true);
        setCompactPopupOpen(false);
      }
    } else {
      setCompactPopupOpen(false);
      setPopupItems([]);
      setMobilePanelOpen(false);
    }
  }, [devMode, runHitTest, popupMode]);

  // Dev handlers
  const handleDevClick = (e) => {
    if (!devMode) return;
    const pct = toElemPercent(e, iconRef.current); if (!pct) return;
    const [px,py] = pct;
    if (drawing && currentPts.length >= 3) {
      const [fx,fy] = currentPts[0];
      if (Math.hypot(px-fx,py-fy)<3) { setPendingZone({polygon:currentPts}); setCurrentPts([]); setDrawing(false); return; }
    }
    if (!drawing) setDrawing(true);
    setCurrentPts(prev=>[...prev,[px,py]]);
  };
  const handleDevDblClick = () => {
    if (!devMode||!drawing||currentPts.length<3) return;
    setPendingZone({polygon:currentPts}); setCurrentPts([]); setDrawing(false);
  };
  const confirmZone = () => {
    if (!labelInput.trim()||!pendingZone) return;
    setDevZones(prev=>[...prev,{id:Date.now(),label:labelInput.trim(),info:infoInput.trim(),polygon:pendingZone.polygon}]);
    setPendingZone(null); setLabelInput(''); setInfoInput('');
  };
  const exportZones = () => setExportText(JSON.stringify(
    devZones.map(z=>({id:z.id,label:z.label,info:z.info,polygon:z.polygon.map(p=>[+p[0].toFixed(2),+p[1].toFixed(2)])})),null,2
  ));

  const hasActive = activeItems.length > 0;
  const firstCatId = activeCategories[0];
  const firstCat = CATEGORIES.find(c=>c.id===firstCatId);

  // ── Info panel fixed position: right side, vertically centred ────────────
  // We render info boxes in a fixed column on the right of the stage.
  // The column starts at roughly 60% of stage width, top-aligned at centre.
  const INFO_COL_LEFT_PCT = 0.62; // 62% from left of stage
  const INFO_W = 320;

  return (
    <div className="relative h-screen w-full overflow-hidden flex flex-col md:flex-row" style={{ fontFamily:"'Quicksand',sans-serif", background:'#0a1a18' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700;800&family=Share+Tech+Mono&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#76A8A5;border-radius:3px}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes catPulse{0%,100%{background:rgba(118,168,165,0.06)}50%{background:rgba(118,168,165,0.2)}}
        @keyframes scanline{0%{top:-100%}100%{top:200%}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.35}}
        @keyframes ripple{0%{r:4;opacity:0.9}100%{r:18;opacity:0}}
        .cat-item{ padding:14px 16px; border-radius:11px; cursor:default; transition:all 0.25s ease; border:1px solid transparent; position:relative; overflow:hidden; margin-bottom:7px; }
        .cat-item.active{ border-color:rgba(118,168,165,0.38); animation:catPulse 1.6s ease infinite; }
        .cat-dot{ width:10px;height:10px;border-radius:50%;flex-shrink:0;transition:all 0.25s; }
        .cat-item.active .cat-dot{ box-shadow:0 0 0 4px rgba(118,168,165,0.25), 0 0 14px currentColor; transform:scale(1.4); }
        .dev-btn{padding:8px 14px;border-radius:8px;font-family:'Quicksand',sans-serif;font-weight:700;font-size:14px;cursor:pointer;transition:all .15s;border:none}
        .dev-input{background:rgba(255,255,255,.06);border:1.5px solid rgba(118,168,165,.3);border-radius:8px;color:#fff;font-family:'Quicksand',sans-serif;font-weight:600;font-size:14px;padding:9px 13px;outline:none;width:100%;transition:border-color .15s}
        .dev-input:focus{border-color:#76A8A5} .dev-input::placeholder{color:rgba(255,255,255,.28)}
        .mono{ font-family:'Share Tech Mono', monospace; }
        .info-box{ animation: fadeIn 0.2s ease; }
        
        /* Mobile panel animation */
        .mobile-panel {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 50;
          transform: translateY(100%);
          transition: transform 0.3s ease;
          max-height: 62vh;
        }
        .mobile-panel.open {
          transform: translateY(0);
        }

        @media (max-height: 620px) {
          .mobile-panel { max-height: 54vh; }
        }
        @media (max-height: 460px) {
          .mobile-panel { max-height: 48vh; }
        }

        .compact-modal {
          position: fixed;
          inset: 0;
          z-index: 90;
          background: rgba(0,0,0,0.72);
          backdrop-filter: blur(10px);
        }
        .compact-modal-card {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%,-50%);
          width: min(92vw, 520px);
          max-height: min(86vh, 620px);
          border-radius: 18px;
          border: 1px solid rgba(118,168,165,0.22);
          background: rgba(4,14,12,0.97);
          box-shadow: 0 26px 90px rgba(0,0,0,0.75);
          overflow: hidden;
        }

        @media (max-width: 767px) {
          .vision-icon { left: 50% !important; top: 38% !important; height: auto !important; width: min(86vw, 440px) !important; max-width: 86vw !important; opacity: 0.92 !important; }
          .vision-text { left: 50% !important; top: 83% !important; width: min(320px, 78vw) !important; opacity: 0.9 !important; }
        }
      `}</style>

      {/* ════ DESKTOP LEFT PANEL / MOBILE BOTTOM SHEET ═══════════════════════════════════════════════════ */}
      {/* Desktop: Left sidebar */}
        <div className="hidden md:flex flex-col z-20 flex-shrink-0" style={{ width:devMode?282:262, minWidth:devMode?282:262, transition:'width .3s', background:'rgba(4,12,11,0.97)', backdropFilter:'blur(20px)', borderRight:'1px solid rgba(118,168,165,0.13)' }}>

        {/* Header */}
        <div style={{ padding:'22px 20px 16px', borderBottom:'1px solid rgba(118,168,165,0.1)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:6 }}>
            <div style={{ width:7,height:7,borderRadius:'50%',background:'#76A8A5',boxShadow:'0 0 9px #76A8A5',animation: popupMode ? 'none' : 'blink 2s infinite' }}/>
            <span className="mono" style={{ color:'rgba(118,168,165,0.7)',fontSize:11,letterSpacing:'.18em',textTransform:'uppercase' }}>
              {devMode ? 'ZONE MAPPER' : 'EVIDENCE BOARD'}
            </span>
          </div>
          {!devMode && <p style={{ color:'rgba(255,255,255,0.3)',fontSize:13,fontWeight:600,lineHeight:1.55 }}>Hover or tap the symbol to investigate each clue.</p>}
        </div>

        {/* Category list */}
        {!devMode && (
          <div className="flex-1 overflow-y-auto" style={{ padding:'16px 14px' }}>
            {CATEGORIES.map((cat, idx) => {
              const isActive = activeCategories.includes(cat.id);
              return (
                <div key={cat.id} className={`cat-item${isActive ? ' active' : ''}`}
                  style={{ background: isActive ? 'rgba(118,168,165,0.07)' : 'transparent' }}>
                  {isActive && <div style={{ position:'absolute',left:0,top:'-100%',right:0,height:'40%',background:'linear-gradient(transparent,rgba(118,168,165,0.07),transparent)',animation:'scanline 2s linear infinite',pointerEvents:'none' }}/>}
                  <div style={{ display:'flex', alignItems:'flex-start', gap:11, position:'relative' }}>
                    <div className="cat-dot" style={{ background:cat.color, color:cat.color, marginTop:5 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <span style={{ fontSize:15, color: isActive ? cat.color : 'rgba(255,255,255,0.6)', fontWeight: isActive ? 800 : 600, transition:'all 0.2s', lineHeight:1.35, display:'block' }}>
                        {cat.label}
                      </span>
                      {isActive && (
                        <div style={{ marginTop:7, animation:'fadeIn .2s ease' }}>
                          {activeItems.filter(h => getCategoryForHotspot(h.id)?.id === cat.id).map(h => (
                            <div key={h.id} className="mono" style={{ fontSize:11,color:'rgba(118,168,165,0.6)',letterSpacing:'.08em',textTransform:'uppercase',marginTop:3 }}>
                              › {h.subtitle}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="mono" style={{ fontSize:11,color:'rgba(255,255,255,0.18)',fontWeight:600,flexShrink:0,marginTop:2 }}>
                      {String(idx+1).padStart(2,'0')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Dev zone list */}
        {devMode && (
          <div style={{ display:'flex',flexDirection:'column',flex:1,overflow:'hidden' }}>
            <div style={{ padding:'10px 14px',flex:1,overflowY:'auto' }}>
              {devZones.length===0 && <p style={{ color:'rgba(255,255,255,.18)',fontSize:13,fontWeight:600,textAlign:'center',marginTop:28 }}>No zones yet.</p>}
              {devZones.map((zone,idx)=>(
                <div key={zone.id} style={{ background:'rgba(255,255,255,.04)',border:`1px solid ${ZONE_COLORS[idx%ZONE_COLORS.length]}30`,borderRadius:9,padding:'9px 11px',marginBottom:8,display:'flex',alignItems:'flex-start',gap:9 }}>
                  <div style={{ width:9,height:9,borderRadius:2,background:ZONE_COLORS[idx%ZONE_COLORS.length],flexShrink:0,marginTop:5 }}/>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ color:'#fff',fontWeight:700,fontSize:13 }}>{zone.label}</div>
                    <div style={{ color:'rgba(255,255,255,.35)',fontSize:11,fontWeight:500,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{zone.info||'—'}</div>
                    <div style={{ color:'rgba(118,168,165,.45)',fontSize:11,fontWeight:600,marginTop:2 }}>{zone.polygon.length} pts</div>
                  </div>
                  <button onClick={()=>setDevZones(p=>p.filter(z=>z.id!==zone.id))} style={{ background:'rgba(220,80,80,.1)',border:'1px solid rgba(220,80,80,.2)',borderRadius:5,color:'#f87171',fontSize:12,fontWeight:700,padding:'2px 7px',cursor:'pointer',flexShrink:0 }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ padding:'10px 14px 16px',borderTop:'1px solid rgba(118,168,165,.1)' }}>
              <div style={{ display:'flex',gap:8,marginBottom:exportText?9:0 }}>
                <button className="dev-btn" onClick={exportZones} style={{ background:'rgba(118,168,165,.18)',color:'#C5D7B5',flex:1 }}>Export JSON</button>
                {exportText&&<button className="dev-btn" onClick={()=>navigator.clipboard.writeText(exportText)} style={{ background:'rgba(197,215,181,.12)',color:'#C5D7B5' }}>Copy</button>}
              </div>
              {exportText&&<textarea readOnly value={exportText} style={{ background:'rgba(0,0,0,.45)',border:'1px solid rgba(118,168,165,.18)',borderRadius:7,color:'#76A8A5',fontSize:11,fontFamily:'monospace',padding:8,width:'100%',height:110,resize:'none',outline:'none',lineHeight:1.5 }}/>}
            </div>
          </div>
        )}

        {/* Status footer */}
        {!devMode && (
          <div style={{ padding:'14px 20px',borderTop:'1px solid rgba(118,168,165,0.08)' }}>
            <div style={{ display:'flex',alignItems:'center',gap:9 }}>
              <div style={{ width:7,height:7,borderRadius:'50%',background:hasActive?firstCat?.color||'#76A8A5':'rgba(255,255,255,0.18)',transition:'all .3s',boxShadow:hasActive?`0 0 9px ${firstCat?.color||'#76A8A5'}`:'none' }}/>
              <span className="mono" style={{ fontSize:12,color:hasActive?'rgba(255,255,255,0.65)':'rgba(255,255,255,0.2)',letterSpacing:'.07em',transition:'all .3s' }}>
                {hasActive ? `${activeItems.length} CLUE${activeItems.length>1?'S':''} ACTIVE` : 'NO ACTIVE CLUE'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Mobile: Bottom Sheet Panel */}
      <div
        className={`md:hidden mobile-panel ${mobilePanelOpen ? 'open' : ''}`}
        style={{
          display: 'none',
          background:'rgba(4,12,11,0.98)',
          backdropFilter:'blur(20px)',
          borderTop:'1px solid rgba(118,168,165,0.13)',
          borderRadius:'20px 20px 0 0',
        }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2" onClick={() => setMobilePanelOpen(!mobilePanelOpen)}>
          <div style={{ width:40, height:5, background:'rgba(118,168,165,0.3)', borderRadius:3 }} />
        </div>
        
        {/* Header */}
        <div style={{ padding:'10px 16px 12px', borderBottom:'1px solid rgba(118,168,165,0.1)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <div style={{ width:7,height:7,borderRadius:'50%',background:'#76A8A5',boxShadow:'0 0 9px #76A8A5',animation:'blink 2s infinite' }}/>
            <span className="mono" style={{ color:'rgba(118,168,165,0.7)',fontSize:11,letterSpacing:'.18em',textTransform:'uppercase' }}>
              {devMode ? 'ZONE MAPPER' : 'EVIDENCE BOARD'}
            </span>
          </div>
          {!devMode && <p className="mt-2" style={{ color:'rgba(255,255,255,0.3)',fontSize:13,fontWeight:600 }}>Tap the symbol to investigate clues.</p>}
        </div>

        {/* Category list - Mobile */}
        {!devMode && (
          <div className="overflow-y-auto" style={{ padding:'12px 16px', maxHeight:'calc(62vh - 108px)' }}>
            {hasActive && (
              <div style={{ marginBottom: 10 }}>
                {activeItems.map((item) => {
                  const cat = getCategoryForHotspot(item.id);
                  return (
                    <div key={item.id} className="info-box" style={{ marginBottom: 10, pointerEvents: 'auto' }}>
                      <div style={{ height:3, background:`linear-gradient(90deg,${cat?.color||'#76A8A5'},transparent)`, borderRadius:'2px 2px 0 0' }} />
                      <div style={{
                        background: 'rgba(4,14,12,0.97)',
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${cat?.color||'#76A8A5'}30`,
                        borderTop: 'none',
                        borderRadius: '0 0 14px 14px',
                        padding: '14px 16px',
                        boxShadow: `0 10px 40px rgba(0,0,0,.55), 0 0 0 1px rgba(118,168,165,0.06)`,
                      }}>
                        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
                          <div style={{ width:8,height:8,borderRadius:'50%',background:cat?.color||'#76A8A5',boxShadow:`0 0 7px ${cat?.color||'#76A8A5'}`,flexShrink:0 }} />
                          <span className="mono" style={{ fontSize:10,color:cat?.color||'#76A8A5',letterSpacing:'.14em',textTransform:'uppercase' }}>
                            {item.label}
                          </span>
                        </div>
                        <div style={{ color:'rgba(210,235,210,0.97)',fontWeight:800,fontSize:15,lineHeight:1.35,marginBottom:8 }}>
                          {item.subtitle}
                        </div>
                        <div style={{ height:1,background:'rgba(118,168,165,0.14)',marginBottom:8 }} />
                        <p style={{ color:'rgba(255,255,255,0.78)',fontSize:13,fontWeight:500,lineHeight:1.75,whiteSpace:'pre-line' }}>
                          {item.info}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {CATEGORIES.map((cat, idx) => {
              const isActive = activeCategories.includes(cat.id);
              return (
                <div key={cat.id} className={`cat-item${isActive ? ' active' : ''}`}
                  style={{ background: isActive ? 'rgba(118,168,165,0.07)' : 'transparent', padding:'12px 14px' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:11, position:'relative' }}>
                    <div className="cat-dot" style={{ background:cat.color, color:cat.color, marginTop:3 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <span style={{ fontSize:14, color: isActive ? cat.color : 'rgba(255,255,255,0.6)', fontWeight: isActive ? 800 : 600 }}>
                        {cat.label}
                      </span>
                      {isActive && activeItems.filter(h => getCategoryForHotspot(h.id)?.id === cat.id).length > 0 && (
                        <div className="mono mt-1" style={{ fontSize:10,color:'rgba(118,168,165,0.6)',letterSpacing:'.08em',textTransform:'uppercase' }}>
                          {activeItems.filter(h => getCategoryForHotspot(h.id)?.id === cat.id).length} active
                        </div>
                      )}
                    </div>
                    <span className="mono" style={{ fontSize:10,color:'rgba(255,255,255,0.18)',fontWeight:600 }}>
                      {String(idx+1).padStart(2,'0')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Status footer */}
        {!devMode && (
          <div style={{ padding:'12px 16px',borderTop:'1px solid rgba(118,168,165,0.08)' }}>
            <div style={{ display:'flex',alignItems:'center',gap:9 }}>
              <div style={{ width:7,height:7,borderRadius:'50%',background:hasActive?firstCat?.color||'#76A8A5':'rgba(255,255,255,0.18)',transition:'all .3s',boxShadow:hasActive?`0 0 9px ${firstCat?.color||'#76A8A5'}`:'none' }}/>
              <span className="mono" style={{ fontSize:11,color:hasActive?'rgba(255,255,255,0.65)':'rgba(255,255,255,0.2)',letterSpacing:'.07em' }}>
                {hasActive ? `${activeItems.length} CLUE${activeItems.length>1?'S':''} ACTIVE` : 'NO ACTIVE CLUE'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Compact-height popup mode (mobile + short screens) */}
      {!devMode && popupMode && compactPopupOpen && popupItems.length > 0 && (
        <div
          className="compact-modal"
          onPointerDown={(e) => {
            if (e.target !== e.currentTarget) return;
            backdropTapRef.current = { down: true, x: e.clientX, y: e.clientY };
          }}
          onPointerUp={(e) => {
            if (e.target !== e.currentTarget) return;
            const st = backdropTapRef.current;
            backdropTapRef.current = { down: false, x: 0, y: 0 };
            if (!st.down) return;
            const dx = Math.abs(e.clientX - st.x);
            const dy = Math.abs(e.clientY - st.y);
            if (dx <= 8 && dy <= 8) {
              setCompactPopupOpen(false);
              setPopupItems([]);
            }
          }}
          onPointerCancel={() => {
            backdropTapRef.current = { down: false, x: 0, y: 0 };
          }}
        >
          <div className="compact-modal-card" onPointerDown={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 14px',
              borderBottom: '1px solid rgba(118,168,165,0.12)',
              background: 'rgba(4,12,11,0.92)',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, minWidth: 0 }}>
                <div style={{ width:8,height:8,borderRadius:'50%',background:firstCat?.color||'#76A8A5',boxShadow:`0 0 10px ${firstCat?.color||'#76A8A5'}` }} />
                <div className="mono" style={{ fontSize:11, letterSpacing:'.18em', textTransform:'uppercase', color:'rgba(118,168,165,0.7)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  Evidence
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCompactPopupOpen(false);
                  setPopupItems([]);
                }}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.8)',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
                aria-label="Close"
                title="Close"
              >
                ×
              </button>
            </div>

            <div style={{ padding: '12px 14px', overflowY: 'auto', maxHeight: 'calc(min(86vh, 620px) - 56px)', WebkitOverflowScrolling: 'touch' }}>
              {popupItems.map((item) => {
                const cat = getCategoryForHotspot(item.id);
                return (
                  <div key={item.id} className="info-box" style={{ marginBottom: 12 }}>
                    <div style={{ height:3, background:`linear-gradient(90deg,${cat?.color||'#76A8A5'},transparent)`, borderRadius:'2px 2px 0 0' }} />
                    <div style={{
                      background: 'rgba(4,14,12,0.97)',
                      backdropFilter: 'blur(20px)',
                      border: `1px solid ${cat?.color||'#76A8A5'}30`,
                      borderTop: 'none',
                      borderRadius: '0 0 14px 14px',
                      padding: '14px 16px',
                      boxShadow: `0 10px 40px rgba(0,0,0,.55), 0 0 0 1px rgba(118,168,165,0.06)`,
                    }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
                        <div style={{ width:8,height:8,borderRadius:'50%',background:cat?.color||'#76A8A5',boxShadow:`0 0 7px ${cat?.color||'#76A8A5'}`,flexShrink:0 }} />
                        <span className="mono" style={{ fontSize:10,color:cat?.color||'#76A8A5',letterSpacing:'.14em',textTransform:'uppercase' }}>
                          {item.label}
                        </span>
                      </div>
                      <div style={{ color:'rgba(210,235,210,0.97)',fontWeight:800,fontSize:15,lineHeight:1.35,marginBottom:8 }}>
                        {item.subtitle}
                      </div>
                      <div style={{ height:1,background:'rgba(118,168,165,0.14)',marginBottom:8 }} />
                      <p style={{ color:'rgba(255,255,255,0.78)',fontSize:13,fontWeight:500,lineHeight:1.75,whiteSpace:'pre-line' }}>
                        {item.info}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ════ MAIN STAGE ═══════════════════════════════════════════════════ */}
      <div ref={stageRef} style={{ flex:1,position:'relative',overflow:'hidden',touchAction:'none' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          if (devMode) return;
          if (compactPopupOpen) return;
          setActiveItems([]);
          setActiveCats([]);
        }}
        onClick={handleStageClick}
        onDoubleClick={devMode?handleDevDblClick:undefined}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background */}
        <div style={{ position:'absolute',inset:0,background:'linear-gradient(160deg,#1c3a35 0%,#102820 55%,#0a1a18 100%)' }}/>
        <div style={{ position:'absolute',inset:0,pointerEvents:'none',background:'radial-gradient(ellipse 45% 55% at 35% 45%,rgba(118,168,165,0.08) 0%,transparent 70%)' }}/>
        {/* Dot grid */}
        <div style={{ position:'absolute',inset:0,pointerEvents:'none',backgroundImage:'radial-gradient(rgba(118,168,165,0.055) 1px,transparent 1px)',backgroundSize:'32px 32px' }}/>

        {/* ── ICON — shifted left: centred at ~37% of stage ── */}
        <img ref={iconRef} src="/ChemistreeIcon_square.png" alt="Chemistree" draggable="false"
          className="vision-icon"
          style={{
            position:'absolute', left:'37%', top:'43%',
            transform:'translate(-50%,-50%)',
            height:'min(570px,64vh)',
            width:'min(570px,64vh)',
            maxWidth:'55vw',
            objectFit:'contain',
            opacity:0.8,
            filter:'drop-shadow(0 14px 50px rgba(118,168,165,.22))',
            pointerEvents:'none', userSelect:'none', display:'block',
          }}
        />

        {/* ── TEXT — shifted left: centred at ~37% of stage ── */}
        <img ref={textRef} src="/ChemistreeText.png" alt="Chemistree" draggable="false"
          className="vision-text"
          style={{
            position:'absolute', left:'37%', top:'83%',
            transform:'translate(-50%,-50%)',
            width:'min(460px,48vw)', height:'auto',
            opacity:.9,
            filter:'drop-shadow(0 6px 26px rgba(118,168,165,.2))',
            pointerEvents:'none', userSelect:'none',
          }}
        />

        {/* ── SVG: arrows from cursor → centre of each info box ── */}
        {!devMode && hasActive && stageRef.current && (
          <div className="hidden md:block">
            <svg style={{ position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:28,overflow:'visible' }}>
              <defs>
                <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                  <polygon points="0 0,8 4,0 8" fill="rgba(118,168,165,0.65)"/>
                </marker>
              </defs>
              <circle cx={cursorPos.x} cy={cursorPos.y} r="4" fill={firstCat?.color||'#76A8A5'} opacity="0.85">
                <animate attributeName="r" values="4;14;4" dur="1.6s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.85;0;0.85" dur="1.6s" repeatCount="indefinite"/>
              </circle>
              <circle cx={cursorPos.x} cy={cursorPos.y} r="3" fill="white" opacity="0.9"/>
              {activeItems.map((item, i) => {
                const sw = stageRef.current.offsetWidth;
                const sh = stageRef.current.offsetHeight;
                const colX = sw * INFO_COL_LEFT_PCT;
                const slotH = sh / activeItems.length;
                const targetY = slotH * i + slotH / 2;
                const cat = getCategoryForHotspot(item.id);
                return (
                  <line key={item.id}
                    x1={cursorPos.x} y1={cursorPos.y}
                    x2={colX + 10} y2={targetY}
                    stroke={cat?.color||'rgba(118,168,165,0.5)'}
                    strokeWidth="1.5" strokeDasharray="6,4" opacity="0.55"
                    markerEnd="url(#arr)"
                  />
                );
              })}
            </svg>
          </div>
        )}

        {/* ── INFO BOXES — flex column, truly centred vertically in stage ── */}
        {!devMode && hasActive && stageRef.current && (
          <div className="hidden md:flex" style={{
            position: 'absolute',
            left: `calc(${INFO_COL_LEFT_PCT * 100}% + 14px)`,
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 30,
            pointerEvents: 'none',
            flexDirection: 'column',
            gap: 12,
            maxHeight: 'calc(100vh - 40px)',
            overflowY: 'auto',
          }}>
            {activeItems.map((item) => {
              const cat = getCategoryForHotspot(item.id);
              return (
                <div key={item.id} className="info-box">
                  <div style={{ height:3, background:`linear-gradient(90deg,${cat?.color||'#76A8A5'},transparent)`, borderRadius:'2px 2px 0 0' }}/>
                  <div style={{
                    background: 'rgba(4,14,12,0.97)',
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${cat?.color||'#76A8A5'}30`,
                    borderTop: 'none',
                    borderRadius: '0 0 14px 14px',
                    padding: '15px 18px',
                    boxShadow: `0 10px 40px rgba(0,0,0,.6), 0 0 0 1px rgba(118,168,165,0.06)`,
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
                      <div style={{ width:8,height:8,borderRadius:'50%',background:cat?.color||'#76A8A5',boxShadow:`0 0 7px ${cat?.color||'#76A8A5'}`,flexShrink:0 }}/>
                      <span className="mono" style={{ fontSize:10,color:cat?.color||'#76A8A5',letterSpacing:'.14em',textTransform:'uppercase' }}>
                        {item.label}
                      </span>
                    </div>
                    <div style={{ color:'rgba(210,235,210,0.97)',fontWeight:800,fontSize:15,lineHeight:1.35,marginBottom:9 }}>
                      {item.subtitle}
                    </div>
                    <div style={{ height:1,background:'rgba(118,168,165,0.14)',marginBottom:9 }}/>
                    <p style={{ color:'rgba(255,255,255,0.74)',fontSize:13,fontWeight:500,lineHeight:1.75,whiteSpace:'pre-line' }}>
                      {item.info}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Dev canvas */}
        {devMode && <canvas ref={canvasRef} style={{ position:'absolute',inset:0,zIndex:10,cursor:drawing?'crosshair':'cell',width:'100%',height:'100%' }}/>}

        {/* Back */}
        <button type="button" onClick={handleBack}
          style={{ position:'absolute',top:22,left:22,zIndex:35,padding:'9px 20px',borderRadius:11,fontWeight:700,fontSize:14,background:'rgba(255,255,255,.06)',color:'rgba(255,255,255,.75)',border:'1px solid rgba(255,255,255,.1)',cursor:'pointer',transition:'all .15s',fontFamily:"'Quicksand',sans-serif" }}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(118,168,165,.18)'}
          onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.06)'}
        >← Back</button>

        {/* Dev toggle */}
        {false && (
          <button type="button"
            onClick={()=>{ setDevMode(d=>!d); setDrawing(false); setCurrentPts([]); setPendingZone(null); setHoverPt(null); setActiveItems([]); setActiveCats([]); }}
            style={{ position:'absolute',top:22,right:22,zIndex:35,padding:'9px 18px',borderRadius:11,fontWeight:700,fontSize:12,background:devMode?'rgba(182,154,132,.25)':'rgba(255,255,255,.05)',color:devMode?'#B69A84':'rgba(255,255,255,.35)',border:`1.5px solid ${devMode?'rgba(182,154,132,.38)':'rgba(255,255,255,.08)'}`,cursor:'pointer',transition:'all .15s',fontFamily:"'Quicksand',sans-serif",letterSpacing:'.08em',textTransform:'uppercase' }}
          >{devMode?'⬡ Dev On':'⬡ Dev'}</button>
        )}

        {/* Dev hint */}
        {devMode && (
          <div style={{ position:'absolute',bottom:22,left:'50%',transform:'translateX(-50%)',background:'rgba(4,12,11,.88)',border:'1px solid rgba(118,168,165,.2)',borderRadius:9,padding:'7px 18px',color:drawing?'#76A8A5':'rgba(118,168,165,.45)',fontWeight:700,fontSize:13,zIndex:25,pointerEvents:'none',whiteSpace:'nowrap',fontFamily:"'Quicksand',sans-serif" }}>
            {drawing?`${currentPts.length} pts — click first dot or double-click to close`:'Click inside icon to draw a zone polygon'}
          </div>
        )}
      </div>

      {/* ════ ZONE MODAL ════ */}
      {pendingZone && (
        <div style={{ position:'fixed',inset:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.72)',backdropFilter:'blur(8px)' }}>
          <div style={{ background:'#0c1e1c',border:'1px solid rgba(118,168,165,.24)',borderRadius:18,padding:30,width:380,boxShadow:'0 24px 80px rgba(0,0,0,.7)' }}>
            <div style={{ color:'#C5D7B5',fontWeight:800,fontSize:18,marginBottom:7 }}>Label this zone</div>
            <p style={{ color:'rgba(255,255,255,.3)',fontSize:13,fontWeight:600,marginBottom:22 }}>{pendingZone.polygon.length} vertices · image-relative %</p>
            <div style={{ marginBottom:15 }}>
              <div style={{ color:'rgba(197,215,181,.8)',fontSize:13,fontWeight:700,marginBottom:7 }}>Label *</div>
              <input className="dev-input" placeholder="e.g. Tree, Leaf, Flask..." value={labelInput} onChange={e=>setLabelInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&confirmZone()} autoFocus/>
            </div>
            <div style={{ marginBottom:24 }}>
              <div style={{ color:'rgba(197,215,181,.8)',fontSize:13,fontWeight:700,marginBottom:7 }}>Description</div>
              <textarea className="dev-input" placeholder="What is this component?" value={infoInput} onChange={e=>setInfoInput(e.target.value)} style={{ resize:'vertical',minHeight:72 }}/>
            </div>
            <div style={{ display:'flex',gap:11 }}>
              <button className="dev-btn" onClick={confirmZone} disabled={!labelInput.trim()} style={{ flex:1,background:labelInput.trim()?'linear-gradient(135deg,#76A8A5,#5d9190)':'rgba(255,255,255,.07)',color:'#fff',opacity:labelInput.trim()?1:.4,fontSize:15 }}>Save Zone</button>
              <button className="dev-btn" onClick={()=>{setPendingZone(null);setLabelInput('');setInfoInput('');}} style={{ background:'rgba(220,80,80,.12)',color:'#f87171',border:'1px solid rgba(220,80,80,.2)',fontSize:15 }}>Discard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}