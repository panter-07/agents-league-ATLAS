import { useMemo, useState } from "react";
import { Galaxy } from "./Galaxy";
import { NODES, EDGES, CATEGORY_COLORS } from "@/lib/knowledge-graph";

const QUICK = ["react", "oauth", "kubernetes", "rag", "graphql", "llm", "postgresql"];

export function AtlasShell() {
  const [focus, setFocus] = useState<string>("oauth");
  const [query, setQuery] = useState("");

  const focusNode = NODES.find(n => n.id === focus)!;

  const related = useMemo(() => {
    const map = new Map<string, number>();
    EDGES.forEach(e => {
      if (e.source === focus) map.set(e.target, e.weight);
      else if (e.target === focus) map.set(e.source, e.weight);
    });
    return [...map.entries()]
      .map(([id, w]) => ({ node: NODES.find(n => n.id === id)!, w }))
      .sort((a, b) => b.w - a.w)
      .slice(0, 6);
  }, [focus]);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return NODES.filter(n => n.label.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q)).slice(0, 6);
  }, [query]);

  const suggestions = useMemo(() => {
    const hints = [
      `How does ${focusNode.label} relate to ${related[0]?.node.label ?? "the rest of the system"}?`,
      `Trace a request through ${focusNode.label}`,
      `What breaks if I remove ${focusNode.label}?`,
      `Show me a production-grade ${focusNode.label} architecture`,
    ];
    return hints;
  }, [focusNode, related]);

  return (
    <div className="relative h-screen w-screen overflow-hidden text-foreground">
      {/* ambient backdrop wash */}
      <div className="pointer-events-none absolute inset-0 -z-10" style={{ background: "var(--grad-galaxy)" }} />

      {/* TOP BAR */}
      <header className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-6 py-4">
        <div className="glass-strong flex items-center gap-3 rounded-full px-4 py-2">
          <div className="relative h-7 w-7">
            <div className="absolute inset-0 rounded-full" style={{ background: "var(--grad-glow)", filter: "blur(8px)", opacity: 0.8 }} />
            <svg viewBox="0 0 24 24" className="relative h-7 w-7">
              <circle cx="12" cy="12" r="3" fill="oklch(0.95 0.08 220)" />
              <circle cx="12" cy="12" r="7" fill="none" stroke="oklch(0.78 0.16 230)" strokeWidth="1" />
              <circle cx="12" cy="12" r="10.5" fill="none" stroke="oklch(0.7 0.18 290)" strokeWidth="0.8" strokeDasharray="2 3" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="font-display text-sm font-semibold tracking-[0.18em]">ATLAS</div>
            <div className="font-mono text-[10px] text-muted-foreground">knowledge.galaxy/v0.4</div>
          </div>
        </div>

        <div className="glass relative flex w-[480px] max-w-[40vw] items-center gap-3 rounded-full px-4 py-2.5">
          <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search the galaxy — concepts, protocols, systems…"
            className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="font-mono text-[10px] text-muted-foreground">⌘K</kbd>
          {filtered.length > 0 && (
            <div className="glass-strong absolute left-0 right-0 top-full mt-2 rounded-2xl p-2 animate-fade-in">
              {filtered.map(n => (
                <button
                  key={n.id}
                  onClick={() => { setFocus(n.id); setQuery(""); }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-white/5"
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS[n.category], boxShadow: `0 0 8px ${CATEGORY_COLORS[n.category]}` }} />
                  <span className="font-medium">{n.label}</span>
                  <span className="ml-auto truncate text-xs text-muted-foreground">{n.summary}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button className="glass rounded-full px-4 py-2 font-mono text-[11px] tracking-widest text-muted-foreground transition hover:text-foreground">EXPLORE</button>
          <button className="rounded-full px-4 py-2 font-mono text-[11px] tracking-widest text-primary-foreground" style={{ background: "var(--grad-glow)", boxShadow: "var(--glow-cyan)" }}>
            ENTER ORBIT
          </button>
        </div>
      </header>

      {/* GALAXY CANVAS (full screen) */}
      <div className="absolute inset-0">
        <Galaxy focusId={focus} onFocus={setFocus} />
      </div>

      {/* LEFT — TRAJECTORY / LEGEND */}
      <aside className="absolute bottom-6 left-6 top-24 z-20 hidden w-[280px] flex-col gap-4 lg:flex">
        <div className="glass animate-fade-in rounded-2xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground">// TRAJECTORY</span>
            <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full" style={{ background: "var(--cyan)", color: "var(--cyan)" }} />
          </div>
          <h2 className="text-gradient text-2xl font-semibold leading-tight">{focusNode.label}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{focusNode.summary}</p>

          <div className="mt-5 space-y-2">
            <div className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">CONSTELLATION</div>
            {related.map(({ node, w }) => (
              <button
                key={node.id}
                onClick={() => setFocus(node.id)}
                className="group flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/5"
              >
                <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS[node.category], boxShadow: `0 0 6px ${CATEGORY_COLORS[node.category]}` }} />
                <span className="text-sm">{node.label}</span>
                <div className="ml-auto h-[2px] w-16 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full" style={{ width: `${w * 100}%`, background: "var(--grad-glow)" }} />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="mb-2 font-mono text-[10px] tracking-[0.25em] text-muted-foreground">// QUICK JUMP</div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK.map(id => {
              const n = NODES.find(x => x.id === id)!;
              const active = id === focus;
              return (
                <button
                  key={id}
                  onClick={() => setFocus(id)}
                  className="rounded-full border px-3 py-1 text-xs transition"
                  style={{
                    borderColor: active ? CATEGORY_COLORS[n.category] : "oklch(1 0 0 / 0.08)",
                    color: active ? "oklch(0.98 0 0)" : "oklch(0.75 0.02 240)",
                    boxShadow: active ? `0 0 14px ${CATEGORY_COLORS[n.category]}` : undefined,
                    background: active ? "oklch(1 0 0 / 0.04)" : "transparent",
                  }}
                >
                  {n.label}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* RIGHT — AI COPILOT (embedded, ambient) */}
      <aside className="absolute bottom-6 right-6 top-24 z-20 hidden w-[340px] flex-col gap-4 lg:flex">
        <div className="glass-strong relative flex-1 overflow-hidden rounded-2xl p-5">
          {/* ambient gradient ring */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-50" style={{ background: "radial-gradient(circle, oklch(0.7 0.18 290 / 0.5), transparent 70%)", filter: "blur(20px)" }} />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full opacity-50" style={{ background: "radial-gradient(circle, oklch(0.78 0.16 230 / 0.5), transparent 70%)", filter: "blur(20px)" }} />

          <div className="relative flex items-center gap-2">
            <div className="relative h-6 w-6">
              <div className="absolute inset-0 animate-pulse-glow rounded-full" style={{ background: "var(--grad-glow)", color: "oklch(0.78 0.16 230)" }} />
              <div className="absolute inset-1 rounded-full bg-background/70 backdrop-blur" />
            </div>
            <div>
              <div className="text-sm font-semibold">Atlas Copilot</div>
              <div className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">CONTEXT · {focusNode.label.toUpperCase()}</div>
            </div>
          </div>

          <div className="relative mt-5 space-y-3">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm leading-relaxed">
              <span className="font-mono text-[10px] tracking-widest text-cyan" style={{ color: "var(--cyan)" }}>// INSIGHT</span>
              <p className="mt-1.5">
                You're orbiting <span className="font-semibold" style={{ color: "var(--cyan)" }}>{focusNode.label}</span>.
                The strongest gravitational pull is from{" "}
                <span className="font-semibold" style={{ color: "var(--violet)" }}>{related[0]?.node.label ?? "—"}</span>.
                Want me to trace how a single request flows through both?
              </p>
            </div>

            <div className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">SUGGESTED PATHS</div>
            <div className="space-y-1.5">
              {suggestions.map((s, i) => (
                <button key={i} className="group flex w-full items-start gap-2 rounded-lg border border-transparent px-3 py-2 text-left text-sm transition hover:border-white/10 hover:bg-white/5">
                  <span className="mt-0.5 text-xs" style={{ color: "var(--cyan)" }}>↗</span>
                  <span className="leading-snug">{s}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative mt-5 flex items-center gap-2 rounded-full border border-white/10 bg-background/40 px-3 py-2">
            <span className="font-mono text-xs" style={{ color: "var(--cyan)" }}>›</span>
            <input
              placeholder={`Ask anything about ${focusNode.label}…`}
              className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
            />
            <button className="rounded-full px-3 py-1 text-[10px] font-medium tracking-widest" style={{ background: "var(--grad-glow)", color: "oklch(0.15 0.02 255)" }}>SEND</button>
          </div>
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground">// ARCHITECTURE FLOW</span>
            <span className="font-mono text-[10px] text-muted-foreground">live</span>
          </div>
          <FlowMini focusLabel={focusNode.label} />
        </div>
      </aside>

      {/* BOTTOM STATUS */}
      <footer className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2">
        <div className="glass flex items-center gap-4 rounded-full px-4 py-2 font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 animate-pulse-glow rounded-full" style={{ background: "var(--teal)", color: "var(--teal)" }} /> GRAPH SYNCED</span>
          <span className="opacity-30">·</span>
          <span>{NODES.length} NODES</span>
          <span className="opacity-30">·</span>
          <span>{EDGES.length} PATHWAYS</span>
          <span className="opacity-30">·</span>
          <span>SCROLL · DRAG · CLICK</span>
        </div>
      </footer>
    </div>
  );
}

function FlowMini({ focusLabel }: { focusLabel: string }) {
  const steps = ["Client", focusLabel, "Auth Server", "Resource API"];
  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="relative h-6 w-6 shrink-0">
            <div className="absolute inset-0 rounded-md border" style={{ borderColor: i === 1 ? "var(--cyan)" : "oklch(1 0 0 / 0.15)", boxShadow: i === 1 ? "var(--glow-cyan)" : undefined }} />
            <div className="absolute inset-1 rounded-sm" style={{ background: i === 1 ? "var(--grad-glow)" : "oklch(1 0 0 / 0.05)" }} />
          </div>
          <div className="text-sm">{s}</div>
          {i < steps.length - 1 && <span className="ml-auto font-mono text-xs text-muted-foreground">→</span>}
        </div>
      ))}
    </div>
  );
}
