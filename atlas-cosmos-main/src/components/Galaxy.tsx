import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORY_COLORS, EDGES, NODES, GALAXY_DEFS } from "@/lib/knowledge-graph";

interface Props {
	focusId: string;
	onFocus: (id: string) => void;
}

type Level = "galaxy" | "cluster" | "term";

interface Camera { x: number; y: number; k: number }

// Deterministic hash for stable random positions
function hash(s: string): number {
	let h = 0;
	for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
	return (h >>> 0) / 0xffffffff;
}

function nodePos(id: string, i: number, total: number, cx: number, cy: number, radius: number) {
	const angle = (i / total) * Math.PI * 2 - Math.PI / 2 + hash(id) * 0.4;
	const r = radius * (0.7 + hash(id + "r") * 0.3);
	return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
}

export function Galaxy({ focusId, onFocus }: Props) {
	const ref = useRef<HTMLDivElement>(null);
	const [size, setSize] = useState({ w: 1200, h: 800 });
	const [hover, setHover] = useState<string | null>(null);
	const [level, setLevel] = useState<Level>("galaxy");
	const [activeGalaxy, setActiveGalaxy] = useState<string | null>(null);
	const [activeCluster, setActiveCluster] = useState<string | null>(null);
	const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, k: 1 });
	const dragRef = useRef<{ sx: number; sy: number; cx: number; cy: number } | null>(null);
	const animRef = useRef<number | null>(null);

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

	// Stars backdrop
	const stars = useMemo(() =>
		Array.from({ length: 160 }, (_, i) => ({
			x: Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1),
			y: Math.abs((Math.cos(i * 78.233) * 43758.5453) % 1),
			r: 0.4 + Math.abs(Math.sin(i)) * 1.4,
			d: (i % 9) * 0.4,
		})), []);

	// Smooth camera animation
	function animateTo(target: Camera) {
		if (animRef.current) cancelAnimationFrame(animRef.current);
		const start = { ...camera };
		const startTime = performance.now();
		const duration = 600;
		function step(now: number) {
			const t = Math.min((now - startTime) / duration, 1);
			const ease = 1 - Math.pow(1 - t, 3);
			setCamera({
				x: start.x + (target.x - start.x) * ease,
				y: start.y + (target.y - start.y) * ease,
				k: start.k + (target.k - start.k) * ease,
			});
			if (t < 1) animRef.current = requestAnimationFrame(step);
		}
		animRef.current = requestAnimationFrame(step);
	}

	// ── LAYOUT: Galaxy level ──────────────────────────────────────────
	const galaxyLayout = useMemo(() => {
		const cx = 0; const cy = 0;
		const radius = Math.min(size.w, size.h) * 0.32;
		return GALAXY_DEFS.map((g, i) => ({
			...g,
			...nodePos(g.id, i, GALAXY_DEFS.length, cx, cy, radius),
		}));
	}, [size]);

	// ── LAYOUT: Cluster level ─────────────────────────────────────────
	const clusterLayout = useMemo(() => {
		if (!activeGalaxy) return [];
		const gal = GALAXY_DEFS.find(g => g.id === activeGalaxy);
		if (!gal) return [];
		const cx = 0; const cy = 0;
		const radius = Math.min(size.w, size.h) * 0.28;
		return gal.clusters.map((c, i) => ({
			...c,
			galaxyId: gal.id,
			color: gal.color,
			...nodePos(c.id, i, gal.clusters.length, cx, cy, radius),
		}));
	}, [activeGalaxy, size]);

	// ── LAYOUT: Term level ────────────────────────────────────────────
	const termLayout = useMemo(() => {
		if (!activeGalaxy || !activeCluster) return [];
		const gal = GALAXY_DEFS.find(g => g.id === activeGalaxy);
		if (!gal) return [];
		const cluster = gal.clusters.find(c => c.id === activeCluster);
		if (!cluster) return [];
		const cx = 0; const cy = 0;
		const radius = Math.min(size.w, size.h) * 0.26;
		return cluster.terms.map((t, i) => {
			const id = t.toLowerCase().replace(/\+/g, "p").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
			return {
				id,
				label: t,
				color: gal.color,
				...nodePos(id, i, cluster.terms.length, cx, cy, radius),
			};
		});
	}, [activeGalaxy, activeCluster, size]);

	// ── INTERACTIONS ──────────────────────────────────────────────────
	function handleGalaxyClick(gId: string, pos: { x: number; y: number }) {
		// center camera on clicked galaxy and zoom slightly into cluster view
		setActiveGalaxy(gId);
		setLevel("cluster");
		animateTo({ x: -pos.x, y: -pos.y, k: 1.15 });
	}

	function handleClusterClick(cId: string) {
		// center camera on clicked cluster and zoom further into term view
		const c = clusterLayout.find(x => x.id === cId);
		setActiveCluster(cId);
		setLevel("term");
		if (c) animateTo({ x: -c.x, y: -c.y, k: 1.4 });
		else animateTo({ x: 0, y: 0, k: 1.2 });
	}

	function handleTermClick(tId: string) {
		// focus term and zoom in a bit
		const t = termLayout.find(x => x.id === tId);
		onFocus(tId);
		setHover(tId);
		if (t) animateTo({ x: -t.x, y: -t.y, k: 1.8 });
	}

	function goBack() {
		if (level === "term") {
			setLevel("cluster");
			setActiveCluster(null);
			animateTo({ x: 0, y: 0, k: 1 });
		} else if (level === "cluster") {
			setLevel("galaxy");
			setActiveGalaxy(null);
			animateTo({ x: 0, y: 0, k: 1 });
		}
	}

	// ── DRAG & ZOOM ───────────────────────────────────────────────────
	function onWheel(e: React.WheelEvent) {
		// only prevent default when possible (avoid passive listener errors)
		if ((e.nativeEvent as any).cancelable) e.preventDefault();
		const next = Math.min(3.5, Math.max(0.4, camera.k * (e.deltaY < 0 ? 1.1 : 0.9)));
		setCamera(c => ({ ...c, k: next }));
	}
	function onDown(e: React.PointerEvent) {
		dragRef.current = { sx: e.clientX, sy: e.clientY, cx: camera.x, cy: camera.y };
		(e.target as Element).setPointerCapture(e.pointerId);
	}
	function onMove(e: React.PointerEvent) {
		if (!dragRef.current) return;
		const d = dragRef.current;
		setCamera(c => ({ ...c, x: d.cx + (e.clientX - d.sx) / c.k, y: d.cy + (e.clientY - d.sy) / c.k }));
	}
	function onUp() { dragRef.current = null; }

	const scx = size.w / 2 + camera.x * camera.k;
	const scy = size.h / 2 + camera.y * camera.k;

	// ── RENDER HELPERS ────────────────────────────────────────────────
	function GalaxyNode({ g }: { g: typeof galaxyLayout[0] }) {
		const isHov = hover === g.id;
		const sx = scx + g.x * camera.k;
		const sy = scy + g.y * camera.k;
		const r = (isHov ? 38 : 32) * camera.k;
		return (
			<g
				key={g.id}
				style={{ cursor: "pointer" }}
				onPointerEnter={() => setHover(g.id)}
				onPointerLeave={() => setHover(null)}
				onClick={() => handleGalaxyClick(g.id, { x: g.x, y: g.y })}
			>
				{/* glow */}
				<circle cx={sx} cy={sy} r={r * 2.2} fill={g.color} opacity={isHov ? 0.18 : 0.1} />
				{/* orbit ring */}
				<circle cx={sx} cy={sy} r={r * 1.5} fill="none" stroke={g.color} strokeWidth={0.8} strokeDasharray="3 5" opacity={0.4} />
				{/* core */}
				<circle cx={sx} cy={sy} r={r} fill="oklch(0.18 0.03 255)" stroke={g.color} strokeWidth={2}
					style={{ filter: `drop-shadow(0 0 ${isHov ? 24 : 14}px ${g.color})` }} />
				{/* label */}
				<text x={sx} y={sy + r + 18 * camera.k} textAnchor="middle"
					fill="oklch(0.92 0.04 220)" fontSize={13 * camera.k} fontFamily="Space Grotesk, sans-serif"
					fontWeight={600} letterSpacing={1}>
					{g.label}
				</text>
				{/* cluster count badge */}
				<text x={sx} y={sy + 5 * camera.k} textAnchor="middle"
					fill={g.color} fontSize={11 * camera.k} fontFamily="JetBrains Mono, monospace">
					{g.clusters.length} clusters
				</text>
			</g>
		);
	}

	function ClusterNode({ c }: { c: typeof clusterLayout[0] }) {
		const isHov = hover === c.id;
		const sx = scx + c.x * camera.k;
		const sy = scy + c.y * camera.k;
		const r = (isHov ? 28 : 23) * camera.k;
		return (
			<g
				key={c.id}
				style={{ cursor: "pointer" }}
				onPointerEnter={() => setHover(c.id)}
				onPointerLeave={() => setHover(null)}
				onClick={() => handleClusterClick(c.id)}
			>
				<circle cx={sx} cy={sy} r={r * 2} fill={c.color} opacity={isHov ? 0.2 : 0.08} />
				<circle cx={sx} cy={sy} r={r} fill="oklch(0.2 0.03 255)" stroke={c.color} strokeWidth={1.5}
					style={{ filter: `drop-shadow(0 0 ${isHov ? 18 : 10}px ${c.color})` }} />
				<text x={sx} y={sy + 4 * camera.k} textAnchor="middle"
					fill="oklch(0.93 0.03 220)" fontSize={11 * camera.k} fontFamily="Space Grotesk, sans-serif" fontWeight={600}>
					{c.label}
				</text>
				<text x={sx} y={sy + r + 16 * camera.k} textAnchor="middle"
					fill="oklch(0.65 0.05 240)" fontSize={9.5 * camera.k} fontFamily="JetBrains Mono, monospace">
					{c.terms.length} terms
				</text>
			</g>
		);
	}

	function TermNode({ t }: { t: typeof termLayout[0] }) {
		const isHov = hover === t.id;
		const isFocus = focusId === t.id;
		const sx = scx + t.x * camera.k;
		const sy = scy + t.y * camera.k;
		const r = (isFocus ? 18 : isHov ? 15 : 12) * camera.k;
		return (
			<g
				key={t.id}
				style={{ cursor: "pointer" }}
				onPointerEnter={() => setHover(t.id)}
				onPointerLeave={() => setHover(null)}
				onClick={() => handleTermClick(t.id)}
			>
				{isFocus && <circle cx={sx} cy={sy} r={r * 2.5} fill={t.color} opacity={0.15} />}
				<circle cx={sx} cy={sy} r={r} fill="oklch(0.22 0.03 255)" stroke={t.color}
					strokeWidth={isFocus ? 2 : 1.2}
					style={{ filter: `drop-shadow(0 0 ${isFocus ? 20 : isHov ? 12 : 6}px ${t.color})` }} />
				<text x={sx} y={sy + r + 14 * camera.k} textAnchor="middle"
					fill={isFocus ? "oklch(0.96 0.04 220)" : "oklch(0.78 0.04 230)"}
					fontSize={10 * camera.k} fontFamily="Space Grotesk, sans-serif" fontWeight={isFocus ? 600 : 400}>
					{t.label}
				</text>
			</g>
		);
	}

	// Connection lines between nodes
	function GalaxyEdges() {
		return (
			<>
				{galaxyLayout.map((a, i) =>
					galaxyLayout.slice(i + 1).map(b => {
						const ax = scx + a.x * camera.k;
						const ay = scy + a.y * camera.k;
						const bx = scx + b.x * camera.k;
						const by = scy + b.y * camera.k;
						return (
							<line key={`${a.id}-${b.id}`} x1={ax} y1={ay} x2={bx} y2={by}
								stroke="oklch(0.7 0.1 240)" strokeWidth={0.5} opacity={0.12} />
						);
					})
				)}
			</>
		);
	}

	function ClusterEdges() {
		return (
			<>
				{clusterLayout.map(c => {
					const ax = scx + c.x * camera.k;
					const ay = scy + c.y * camera.k;
					// connect to center
					return (
						<line key={c.id} x1={scx} y1={scy} x2={ax} y2={ay}
							stroke={c.color} strokeWidth={0.8} opacity={0.25} />
					);
				})}
			</>
		);
	}

	function TermEdges() {
		return (
			<>
				{termLayout.map(t => {
					const ax = scx + t.x * camera.k;
					const ay = scy + t.y * camera.k;
					const isFocused = focusId === t.id || hover === t.id;
					return (
						<line key={t.id} x1={scx} y1={scy} x2={ax} y2={ay}
							stroke={t.color}
							strokeWidth={isFocused ? 1.2 : 0.6}
							opacity={isFocused ? 0.55 : 0.18} />
					);
				})}
				{/* cross-connections between terms using EDGES data */}
				{termLayout.map((a, i) =>
					termLayout.slice(i + 1).map(b => {
						const connected = EDGES.some(e =>
							(e.source === a.id && e.target === b.id) ||
							(e.source === b.id && e.target === a.id)
						);
						if (!connected) return null;
						const ax = scx + a.x * camera.k;
						const ay = scy + a.y * camera.k;
						const bx = scx + b.x * camera.k;
						const by = scy + b.y * camera.k;
						return (
							<line key={`${a.id}-${b.id}`} x1={ax} y1={ay} x2={bx} y2={by}
								stroke={a.color} strokeWidth={0.7} opacity={0.3} strokeDasharray="3 4" />
						);
					})
				)}
			</>
		);
	}

	// Center hub dot
	function CenterHub({ color }: { color: string }) {
		return (
			<>
				<circle cx={scx} cy={scy} r={8 * camera.k} fill="oklch(0.18 0.03 255)" stroke={color} strokeWidth={1.5}
					style={{ filter: `drop-shadow(0 0 12px ${color})` }} />
				<circle cx={scx} cy={scy} r={3 * camera.k} fill={color} opacity={0.8} />
			</>
		);
	}

	const activeDef = GALAXY_DEFS.find(g => g.id === activeGalaxy);

	return (
		<div
			ref={ref}
			className="relative h-full w-full overflow-hidden select-none"
			style={{ background: "var(--grad-galaxy)", cursor: dragRef.current ? "grabbing" : "grab" }}
			onWheel={onWheel}
			onPointerDown={onDown}
			onPointerMove={onMove}
			onPointerUp={onUp}
			onPointerLeave={onUp}
		>
			{/* Stars */}
			<svg className="absolute inset-0 h-full w-full pointer-events-none" aria-hidden>
				{stars.map((s, i) => (
					<circle key={i} cx={s.x * size.w} cy={s.y * size.h} r={s.r}
						fill="oklch(0.92 0.04 220)" className="animate-twinkle"
						style={{ animationDelay: `${s.d}s`, opacity: 0.5 }} />
				))}
			</svg>

			{/* Main canvas */}
			<svg className="absolute inset-0 h-full w-full">
				<defs>
					<radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
						<stop offset="0%" stopColor="oklch(0.78 0.16 230)" stopOpacity="0.6" />
						<stop offset="100%" stopColor="transparent" stopOpacity="0" />
					</radialGradient>
				</defs>

				{level === "galaxy" && (
					<>
						<GalaxyEdges />
						{galaxyLayout.map(g => <GalaxyNode key={g.id} g={g} />)}
					</>
				)}

				{level === "cluster" && activeDef && (
					<>
						<CenterHub color={activeDef.color} />
						<ClusterEdges />
						{clusterLayout.map(c => <ClusterNode key={c.id} c={c} />)}
					</>
				)}

				{level === "term" && activeDef && (
					<>
						<CenterHub color={activeDef.color} />
						<TermEdges />
						{termLayout.map(t => <TermNode key={t.id} t={t} />)}
					</>
				)}
			</svg>

			{/* Back button */}
			{level !== "galaxy" && (
				<button
					onClick={goBack}
					className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full border border-white/10 bg-background/60 px-4 py-2 font-mono text-xs tracking-widest text-muted-foreground backdrop-blur transition hover:text-foreground hover:border-white/20"
				>
					← BACK
				</button>
			)}

			{/* Level breadcrumb */}
			<div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 font-mono text-[10px] tracking-[0.25em] text-muted-foreground opacity-60 pointer-events-none">
				{level === "galaxy" && "CLICK A GALAXY TO EXPLORE"}
				{level === "cluster" && `${activeDef?.label.toUpperCase()} · CLICK A CLUSTER`}
				{level === "term" && `${activeDef?.label.toUpperCase()} · ${activeCluster?.toUpperCase()} · CLICK A TERM`}
			</div>
		</div>
	);
}

