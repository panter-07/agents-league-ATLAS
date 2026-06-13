"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CATEGORY_COLORS,
  EDGES,
  GALAXY_DEFS,
  NODES,
  type KnowledgeNode,
} from "@/lib/knowledge-graph";

interface Props {
  focusId: string;
  onFocus: (id: string) => void;
}

type Level = "galaxy" | "cluster" | "term";

interface Vec { x: number; y: number }
interface NodeLayout extends Vec { id: string; label: string; r: number; color: string; kind: "galaxy" | "cluster" | "term"; meta?: string }
interface EdgeLayout { ax: number; ay: number; bx: number; by: number; color: string; dashed: boolean; opacity: number }
interface Camera { x: number; y: number; k: number }

// Deterministic hash 0..1
function h(s: string): number {
  let v = 2166136261;
  for (let i = 0; i < s.length; i++) { v ^= s.charCodeAt(i); v = Math.imul(v, 16777619); }
  return ((v >>> 0) % 100000) / 100000;
}
function jitter(seed: string, amp: number) { return (h(seed) - 0.5) * 2 * amp; }

// Scatter nodes organically — not on a circle, uses layered jitter
function scatter(items: string[], cx: number, cy: number, spread: number): Map<string, Vec> {
  const map = new Map<string, Vec>();
  items.forEach((id, i) => {
    const angle = (i / items.length) * Math.PI * 2 + jitter(`a-${id}`, 1.1);
    const r = spread * (0.45 + h(`r-${id}`) * 0.55);
    map.set(id, {
      x: cx + Math.cos(angle) * r + jitter(`jx-${id}`, spread * 0.18),
      y: cy + Math.sin(angle) * r + jitter(`jy-${id}`, spread * 0.18),
    });
  });
  return map;
}

export function Galaxy({ focusId, onFocus }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1200, h: 800 });
  const [hover, setHover] = useState<string | null>(null);
  const [level, setLevel] = useState<Level>("galaxy");
  const [activeGalaxyId, setActiveGalaxyId] = useState<string | null>(null);
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null);
  const [cam, setCam] = useState<Camera>({ x: 0, y: 0, k: 1 });
  const dragRef = useRef<{ sx: number; sy: number; cx: number; cy: number } | null>(null);
  const animRef = useRef<number | null>(null);
  const camRef = useRef(cam);
  camRef.current = cam;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Stars
  const stars = useMemo(() =>
    Array.from({ length: 160 }, (_, i) => ({
      x: Math.abs((Math.sin(i * 12.9898) * 43758.5) % 1),
      y: Math.abs((Math.cos(i * 78.233) * 43758.5) % 1),
      r: 0.4 + Math.abs(Math.sin(i)) * 1.5,
      d: (i % 9) * 0.4,
    })), []);

  // Smooth camera
  const animateTo = useCallback((target: Camera) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const t0 = performance.now();
    const from = { ...camRef.current };
    function step(now: number) {
      const t = Math.min((now - t0) / 550, 1);
      const e = 1 - Math.pow(1 - t, 3);
      const next = {
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
        k: from.k + (target.k - from.k) * e,
      };
      setCam(next);
      camRef.current = next;
      if (t < 1) animRef.current = requestAnimationFrame(step);
    }
    animRef.current = requestAnimationFrame(step);
  }, []);

  // ── LAYOUTS ──────────────────────────────────────────────────────

  const cx = size.w / 2;
  const cy = size.h / 2;

  // Galaxy level layout
  const galaxyNodes = useMemo((): NodeLayout[] => {
    // sunflower / Fermat spiral layout for an organized yet organic distribution
    // increase base radius to make the layout more spacious
    const n = GALAXY_DEFS.length;
    const golden = Math.PI * (3 - Math.sqrt(5));
    const baseRadius = Math.min(size.w, size.h) * 0.52; // increased spacing

    const nodes = GALAXY_DEFS.map((g, i) => {
      const t = (i + 1) / n;
      const r = baseRadius * Math.sqrt(t) * (0.78 + h(`gr-${g.id}`) * 0.44);
      const angle = i * golden + jitter(`a-${g.id}`, 0.6);
      const x = Math.cos(angle) * r + jitter(`jx-${g.id}`, baseRadius * 0.05);
      const y = Math.sin(angle) * r + jitter(`jy-${g.id}`, baseRadius * 0.05);
      return {
        id: g.id,
        label: g.label,
        r: 30 + h(`gr-${g.id}`) * 10,
        color: g.color,
        kind: "galaxy",
        meta: `${g.clusters.length} clusters`,
        x, y,
      } as NodeLayout;
    });

    // clamp positions so galaxies stay within view
    const maxAllowed = Math.min(size.w, size.h) * 0.48;
    let maxDist = 0;
    for (const p of nodes) maxDist = Math.max(maxDist, Math.hypot(p.x, p.y));
    if (maxDist > maxAllowed && maxDist > 0) {
      const s = maxAllowed / maxDist;
      for (const p of nodes) { p.x *= s; p.y *= s; }
    }

    return nodes;
  }, [size]);

  // Cluster level layout (clusters for the active galaxy)
  const clusterNodes = useMemo((): NodeLayout[] => {
    if (!activeGalaxyId) return [];
    const gal = GALAXY_DEFS.find(g => g.id === activeGalaxyId);
    if (!gal) return [];
    const spread = Math.min(size.w, size.h) * 0.28;
    const pos = scatter(gal.clusters.map(c => c.id), 0, 0, spread);
    return gal.clusters.map(c => ({
      id: c.id,
      label: c.label,
      r: 22 + h(`cr-${c.id}`) * 8,
      color: gal.color,
      kind: "cluster",
      meta: `${c.terms.length} terms`,
      ...pos.get(c.id)!,
    }));
  }, [activeGalaxyId, size]);

  // Term level layout (terms within selected cluster + ghost cross-cluster nodes)
  const { termNodes, ghostNodes } = useMemo(() => {
    if (!activeGalaxyId || !activeClusterId) return { termNodes: [], ghostNodes: [] };
    const gal = GALAXY_DEFS.find(g => g.id === activeGalaxyId);
    if (!gal) return { termNodes: [], ghostNodes: [] };
    const cluster = gal.clusters.find(c => c.id === activeClusterId);
    if (!cluster) return { termNodes: [], ghostNodes: [] };

    const slug = (s: string) => s.toLowerCase().replace(/\+/g, "p").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const termIds = cluster.terms.map(t => slug(t));
    const spread = Math.min(size.w, size.h) * 0.28;
    const pos = scatter(termIds, 0, 0, spread);

    // build mutable term nodes then run a light repulsion pass to avoid overlaps
    const terms: NodeLayout[] = cluster.terms.map((t, i) => {
      const id = termIds[i];
      const p = pos.get(id)!;
      return {
        id,
        label: t,
        r: 10 + h(`tr-${id}`) * 5,
        color: gal.color,
        kind: "term",
        x: p.x,
        y: p.y,
      } as NodeLayout;
    });

    // simple local repulsion among term nodes
    const nodesMutable = terms.map(n => ({ ...n }));
    const repIters = 22;
    for (let it = 0; it < repIters; it++) {
      for (let i = 0; i < nodesMutable.length; i++) {
        for (let j = i + 1; j < nodesMutable.length; j++) {
          const a = nodesMutable[i];
          const b = nodesMutable[j];
          const dx = b.x - a.x; const dy = b.y - a.y;
          let d = Math.hypot(dx, dy) || 0.0001;
          const minDist = (a.r + b.r) * 1.12;
          if (d < minDist) {
            const push = (minDist - d) * 0.18;
            const nx = (dx / d) * push; const ny = (dy / d) * push;
            a.x -= nx; a.y -= ny; b.x += nx; b.y += ny;
          }
        }
      }
    }

    // use adjusted positions
    const adjustedTerms: NodeLayout[] = nodesMutable.map(n => ({ ...n } as NodeLayout));

    const ghostMap = new Map<string, NodeLayout>();
    termIds.forEach(tid => {
      EDGES.forEach(e => {
        const otherId = e.source === tid ? e.target : e.target === tid ? e.source : null;
        if (!otherId || termIds.includes(otherId)) return;
        const otherNode = NODES.find(n => n.id === otherId);
        if (!otherNode || otherNode.kind !== "term") return;
        if (ghostMap.has(otherId)) return;
        const otherGal = GALAXY_DEFS.find(g => g.id === otherNode.category);
        const otherCluster = otherGal?.clusters.find(c => c.id === otherNode.cluster);
        const anchorTerm = pos.get(tid)!;
        const angle = Math.atan2(anchorTerm.y, anchorTerm.x);
        const ghostR = spread * 1.05 + h(`ghost-${otherId}`) * spread * 0.25;
        ghostMap.set(otherId, {
          id: otherId,
          label: otherNode.label,
          r: 8,
          color: otherGal?.color ?? "#888",
          kind: "term",
          meta: `→ ${otherCluster?.label ?? otherGal?.label ?? ""}`,
          x: Math.cos(angle + jitter(`ga-${otherId}`, 0.5)) * ghostR,
          y: Math.sin(angle + jitter(`gb-${otherId}`, 0.5)) * ghostR,
        });
      });
    });

    return { termNodes: adjustedTerms, ghostNodes: [...ghostMap.values()] };
  }, [activeGalaxyId, activeClusterId, size]);

  // ── INTERACTIONS ──────────────────────────────────────────────────

  function handleNodeClick(node: NodeLayout) {
    if (node.kind === "galaxy") {
      setActiveGalaxyId(node.id);
      setLevel("cluster");
      animateTo({ x: 0, y: 0, k: 1 });
      onFocus(node.id);
    } else if (node.kind === "cluster") {
      setActiveClusterId(node.id);
      setLevel("term");
      animateTo({ x: 0, y: 0, k: 1 });
      onFocus(node.id);
    } else {
      // term click
      onFocus(node.id);
      // toggle selection for highlighting connected nodes
      setSelectedId(s => (s === node.id ? null : node.id));
    }
  }

  function handleGhostClick(ghost: NodeLayout) {
    // Find which galaxy+cluster this ghost belongs to
    const node = NODES.find(n => n.id === ghost.id);
    if (!node) return;
    setActiveGalaxyId(node.category);
    setActiveClusterId(node.cluster ?? null);
    setLevel("term");
    animateTo({ x: 0, y: 0, k: 1 });
    onFocus(ghost.id);
    // also select the ghost node to show connections
    setSelectedId(ghost.id);
  }

  function goBack() {
    if (level === "term") {
      setLevel("cluster");
      setActiveClusterId(null);
      animateTo({ x: 0, y: 0, k: 1 });
    } else if (level === "cluster") {
      setLevel("galaxy");
      setActiveGalaxyId(null);
      animateTo({ x: 0, y: 0, k: 1 });
    }
  }

  // drag + zoom
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setCam(c => ({ ...c, k: Math.min(4, Math.max(0.3, c.k * (e.deltaY < 0 ? 1.1 : 0.91))) }));
  }
  function onDown(e: React.PointerEvent) {
    dragRef.current = { sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y };
    (e.target as Element).setPointerCapture(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const d = dragRef.current;
    setCam(c => ({ ...c, x: d.cx + (e.clientX - d.sx) / c.k, y: d.cy + (e.clientY - d.sy) / c.k }));
  }
  function onUp() { dragRef.current = null; }

  // World → screen
  function ws(x: number, y: number): Vec {
    return { x: cx + (x + cam.x) * cam.k, y: cy + (y + cam.y) * cam.k };
  }

  // ── RENDER ────────────────────────────────────────────────────────

  const activeGalDef = GALAXY_DEFS.find(g => g.id === activeGalaxyId);

  // respond to external focus changes (navigate to cluster/term when a term is focused)
  useEffect(() => {
    if (!focusId) return;
    // if focusId matches a galaxy id
    const gal = GALAXY_DEFS.find(g => g.id === focusId);
    if (gal) {
      setActiveGalaxyId(gal.id);
      setLevel("cluster");
      animateTo({ x: 0, y: 0, k: 1 });
      return;
    }
    // if focusId matches a cluster id
    const galForCluster = GALAXY_DEFS.find(g => g.clusters.some(c => c.id === focusId));
    if (galForCluster) {
      setActiveGalaxyId(galForCluster.id);
      setActiveClusterId(focusId);
      setLevel("term");
      animateTo({ x: 0, y: 0, k: 1 });
      return;
    }
    // if focusId matches a term id in NODES
    const node = NODES.find(n => n.id === focusId);
    if (node) {
      setActiveGalaxyId(node.category);
      setActiveClusterId(node.cluster ?? null);
      setLevel(node.kind === "term" ? "term" : node.kind === "cluster" ? "cluster" : "galaxy");
      animateTo({ x: 0, y: 0, k: 1 });
    }
  }, [focusId]);

  function isConnectedToSelected(nodeId: string) {
    if (!selectedId) return false;
    if (selectedId === nodeId) return true;
    return EDGES.some(e => (e.source === selectedId && e.target === nodeId) || (e.target === selectedId && e.source === nodeId));
  }

  function renderNode(node: NodeLayout, ghost = false, onClick?: () => void) {
    const isFocus = focusId === node.id;
    const isHov = hover === node.id;
    const connected = isConnectedToSelected(node.id);
    const p = ws(node.x, node.y);
    const base = ghost ? node.r * 0.75 : isFocus ? node.r * 1.3 : isHov ? node.r * 1.15 : node.r;
    const r = (connected ? base * 1.28 : base) * cam.k;
    const op = ghost ? 0.38 : selectedId ? (connected ? 1 : 0.18) : 1;

    return (
      <g key={node.id} style={{ cursor: "pointer", opacity: op }}
        onPointerEnter={() => setHover(node.id)}
        onPointerLeave={() => setHover(null)}
        onClick={onClick ?? (() => handleNodeClick(node))}>
        {/* outer glow */}
        <circle cx={p.x} cy={p.y} r={r * 2.2} fill={node.color} opacity={connected || isHov || isFocus ? 0.22 : 0.07} />
        {/* orbit ring for galaxy nodes */}
        {node.kind === "galaxy" && (
          <circle cx={p.x} cy={p.y} r={r * 1.6} fill="none" stroke={node.color}
            strokeWidth={0.7} strokeDasharray="2 5" opacity={0.35} />
        )}
        {/* core */}
        <circle cx={p.x} cy={p.y} r={r}
          fill={ghost ? "oklch(0.15 0.02 255)" : "oklch(0.19 0.03 255)"}
          stroke={node.color} strokeWidth={connected ? (isFocus ? 2.8 : 2.2) : (ghost ? 1 : 1.5)}
          strokeDasharray={ghost ? "3 3" : undefined}
          style={{ filter: `drop-shadow(0 0 ${connected ? 26 : isFocus ? 22 : isHov ? 14 : 8}px ${node.color})`, transition: 'r 180ms ease, stroke-width 160ms ease, filter 180ms ease' }} />
        {/* label */}
        <text x={p.x} y={p.y + r + 15 * cam.k} textAnchor="middle"
          fill={ghost ? "oklch(0.6 0.04 240)" : isFocus ? "oklch(0.97 0.04 220)" : "oklch(0.88 0.04 225)"}
          fontSize={Math.max(9, (node.kind === "galaxy" ? 13 : node.kind === "cluster" ? 11 : 9.5) * cam.k)}
          fontFamily="Space Grotesk, sans-serif" fontWeight={isFocus ? 700 : 500}
          style={{ paintOrder: "stroke", stroke: "oklch(0.1 0.02 255)", strokeWidth: 3, strokeLinejoin: "round" }}>
          {node.label}
        </text>
        {/* meta (cluster count / term count / cross-cluster label) */}
        {node.meta && (
          <text x={p.x} y={p.y + r + (node.kind === "term" ? 26 : 27) * cam.k} textAnchor="middle"
            fill={node.color} fontSize={Math.max(7, 8.5 * cam.k)}
            fontFamily="JetBrains Mono, monospace" opacity={ghost ? 0.7 : 0.75}>
            {node.meta}
          </text>
        )}
      </g>
    );
  }

  function renderEdges(nodes: NodeLayout[], toCenter: boolean, ghosts?: NodeLayout[]) {
    const termIds = new Set(nodes.map(n => n.id));
    return (
      <>
        {nodes.map(n => {
          const p = ws(n.x, n.y);
          const c = toCenter ? ws(0, 0) : null;
          if (!c) return null;
          const connected = selectedId ? isConnectedToSelected(n.id) || selectedId === n.id : false;
          return (
            <line key={`e-center-${n.id}`}
              x1={c.x} y1={c.y} x2={p.x} y2={p.y}
              stroke={n.color} strokeWidth={connected ? 1.4 : 0.7} opacity={selectedId ? (connected ? 0.9 : 0.08) : 0.22} />
          );
        })}
        {/* cross-term edges */}
        {nodes.map((a, i) => nodes.slice(i + 1).map(b => {
          const connected = EDGES.some(e =>
            (e.source === a.id && e.target === b.id) ||
            (e.source === b.id && e.target === a.id));
          if (!connected) return null;
          const pa = ws(a.x, a.y); const pb = ws(b.x, b.y);
          const edgeHighlighted = selectedId ? (isConnectedToSelected(a.id) || isConnectedToSelected(b.id) || selectedId === a.id || selectedId === b.id) : false;
          return (
            <line key={`e-${a.id}-${b.id}`}
              x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
              stroke={a.color} strokeWidth={edgeHighlighted ? 1.6 : 0.9} opacity={selectedId ? (edgeHighlighted ? 0.9 : 0.06) : 0.35} strokeDasharray="4 4" />
          );
        }))}
        {/* ghost edges */}
        {ghosts?.map(g => {
          const anchor = nodes.find(n =>
            EDGES.some(e => (e.source === n.id && e.target === g.id) || (e.source === g.id && e.target === n.id)));
          if (!anchor) return null;
          const pa = ws(anchor.x, anchor.y); const pg = ws(g.x, g.y);
          const ghConnected = selectedId ? (isConnectedToSelected(g.id) || isConnectedToSelected(anchor.id) || selectedId === g.id || selectedId === anchor.id) : false;
          return (
            <line key={`ge-${g.id}`}
              x1={pa.x} y1={pa.y} x2={pg.x} y2={pg.y}
              stroke={g.color} strokeWidth={ghConnected ? 1.2 : 0.7} opacity={selectedId ? (ghConnected ? 0.8 : 0.06) : 0.28} strokeDasharray="3 5" />
          );
        })}
      </>
    );
  }

  const centerP = ws(0, 0);

  return (
    <div ref={ref}
      className="relative h-full w-full overflow-hidden select-none"
      style={{ background: "var(--grad-galaxy)", cursor: dragRef.current ? "grabbing" : "grab" }}
      onWheel={onWheel} onPointerDown={onDown} onPointerMove={onMove}
      onPointerUp={onUp} onPointerLeave={onUp}>

      {/* Stars */}
      <svg className="absolute inset-0 h-full w-full pointer-events-none" aria-hidden>
        {stars.map((s, i) => (
          <circle key={i} cx={s.x * size.w} cy={s.y * size.h} r={s.r}
            fill="oklch(0.92 0.04 220)" className="animate-twinkle"
            style={{ animationDelay: `${s.d}s`, opacity: 0.45 }} />
        ))}
      </svg>

      <svg className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={activeGalDef?.color ?? "oklch(0.78 0.16 230)"} stopOpacity="0.5" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Galaxy level */}
        {level === "galaxy" && (
          <>
            {/* faint web between galaxies */}
            {galaxyNodes.map((a, i) => galaxyNodes.slice(i + 1).map(b => {
              const pa = ws(a.x, a.y); const pb = ws(b.x, b.y);
              return (
                <line key={`gw-${a.id}-${b.id}`}
                  x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                  stroke="oklch(0.7 0.08 240)" strokeWidth={0.5} opacity={0.1} />
              );
            }))}
            {galaxyNodes.map(n => renderNode(n))}
          </>
        )}

        {/* Cluster level */}
        {level === "cluster" && activeGalDef && (
          <>
            {/* center hub */}
            <circle cx={centerP.x} cy={centerP.y} r={30 * cam.k} fill="url(#hubGlow)" opacity={0.5} />
            <circle cx={centerP.x} cy={centerP.y} r={10 * cam.k}
              fill="oklch(0.18 0.03 255)" stroke={activeGalDef.color} strokeWidth={1.5}
              style={{ filter: `drop-shadow(0 0 12px ${activeGalDef.color})` }} />
            <text x={centerP.x} y={centerP.y + 4 * cam.k} textAnchor="middle"
              fill={activeGalDef.color} fontSize={7 * cam.k} fontFamily="JetBrains Mono, monospace">
              {activeGalDef.label.toUpperCase()}
            </text>
            {renderEdges(clusterNodes, true)}
            {clusterNodes.map(n => renderNode(n))}
          </>
        )}

        {/* Term level */}
        {level === "term" && activeGalDef && (
          <>
            <circle cx={centerP.x} cy={centerP.y} r={25 * cam.k} fill="url(#hubGlow)" opacity={0.4} />
            <circle cx={centerP.x} cy={centerP.y} r={8 * cam.k}
              fill="oklch(0.18 0.03 255)" stroke={activeGalDef.color} strokeWidth={1.5}
              style={{ filter: `drop-shadow(0 0 10px ${activeGalDef.color})` }} />
            {renderEdges(termNodes, true, ghostNodes)}
            {ghostNodes.map(g => renderNode(g, true, () => handleGhostClick(g)))}
            {termNodes.map(n => renderNode(n))}
          </>
        )}
      </svg>

      {/* Back button */}
      {level !== "galaxy" && (
          <button onClick={goBack}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full border border-white/10 bg-background/60 px-5 py-2 font-mono text-xs tracking-widest text-muted-foreground backdrop-blur transition hover:text-foreground hover:border-white/25">
            ← BACK
          </button>
      )}

      {/* Breadcrumb hint */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none font-mono text-[10px] tracking-[0.25em] text-muted-foreground opacity-50">
        {level === "galaxy" && "CLICK A GALAXY TO EXPLORE"}
        {level === "cluster" && `${activeGalDef?.label.toUpperCase()} · CLICK A CLUSTER TO DIVE IN`}
        {level === "term" && `${activeGalDef?.label.toUpperCase()} · SCROLL & DRAG · CLICK A TERM`}
      </div>
    </div>
  );
}
