'use client'
import { Fragment, useEffect, useRef, useState } from 'react'
import { Lock, Microscope, Zap, ArrowRight } from 'lucide-react'

// Hero value-proposition map. The open-text signal is the richest but least-
// used HR data because analyzing it is both too expensive and too risky;
// Qualai answers both at once with speed (a 4-stage pipeline) and trust
// (anonymity + BYOK) — which reinforce each other and unlock the signal.
type VVariant = 'neutral' | 'problem' | 'solution' | 'final'

function VNode({ cx, cy, variant, title, sub }: {
  cx: number; cy: number; variant: VVariant; title: string; sub: string
}) {
  const tone = variant === 'problem' ? 'problem' : variant === 'neutral' ? 'neutral' : 'solution'
  return (
    <g>
      <rect x={cx - 124} y={cy - 30} width={248} height={60} rx={12} className={`vp-rect-${variant}`} />
      <text textAnchor="middle">
        <tspan x={cx} y={cy - 3} className={`vp-title vp-t-${tone}`}>{title}</tspan>
        <tspan x={cx} y={cy + 16} className="vp-sub">{sub}</tspan>
      </text>
    </g>
  )
}

// ASCII pipeline animation — raw messy symbols pour in at the top, flow down
// through an ASCII pipeline, and organize into a structured geometric shape.
// This is the product's core motion rendered in the "coded data" voice:
// unstructured open text becomes coded, structured signal.
// The 4-stage pipeline as a neural network: 6 layers of nodes joined by a
// sparse, weighted net. Geometry + edges + pulses are computed once,
// deterministically (seeded), so SSR and client render identically and only
// pulse transforms change on scroll.
const NN_VB_W = 720
const NN_VB_H = 300
const NN_LAYERS = [
  { label: 'OPEN TEXT', count: 3, kind: 'input' },
  { label: 'DETECTION', count: 3, kind: 'mid' },
  { label: 'CODING', count: 4, kind: 'mid' },
  { label: 'CATEGORIZE', count: 4, kind: 'mid' },
  { label: 'SYNTHESIS', count: 3, kind: 'mid' },
  { label: 'STRUCTURED', count: 3, kind: 'output' },
] as const

function nnRand(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface NNEdge { x1: number; y1: number; x2: number; y2: number; layer: number; opacity: number; width: number }
interface NNPulse { x1: number; y1: number; x2: number; y2: number; phase: number }

const NN_GEO = (() => {
  const rnd = nnRand(11)
  const cols = NN_LAYERS.length
  const padX = 64
  const cy = 130
  const vGap = 44
  const colX = (i: number) => padX + (i * (NN_VB_W - 2 * padX)) / (cols - 1)
  const nodeY = (count: number, j: number) => cy + (j - (count - 1) / 2) * vGap
  const nodes = NN_LAYERS.map((L, li) =>
    Array.from({ length: L.count }, (_, j) => ({ x: colX(li), y: nodeY(L.count, j) }))
  )

  const edges: NNEdge[] = []
  for (let li = 0; li < cols - 1; li++) {
    const src = nodes[li]
    const dst = nodes[li + 1]
    const incoming = new Array(dst.length).fill(0)
    src.forEach(s => {
      // connect to the 2–3 vertically nearest targets (+ jitter) — sparse net
      const order = dst
        .map((d, di) => ({ di, dist: Math.abs(d.y - s.y) + rnd() * 34 }))
        .sort((a, b) => a.dist - b.dist)
      const k = rnd() > 0.5 ? 3 : 2
      order.slice(0, Math.min(k, dst.length)).forEach(({ di }) => {
        incoming[di]++
        edges.push({
          x1: s.x, y1: s.y, x2: dst[di].x, y2: dst[di].y, layer: li,
          opacity: 0.13 + rnd() * 0.27, width: 0.8 + rnd() * 1.1,
        })
      })
    })
    // guarantee every destination has at least one incoming edge
    incoming.forEach((n, di) => {
      if (n > 0) return
      const s = src.reduce((best, cur) =>
        Math.abs(cur.y - dst[di].y) < Math.abs(best.y - dst[di].y) ? cur : best, src[0])
      edges.push({ x1: s.x, y1: s.y, x2: dst[di].x, y2: dst[di].y, layer: li, opacity: 0.22, width: 1 })
    })
  }

  // Two staggered pulses per edge; a per-layer offset makes the flow read as a
  // left→right wave rather than every edge pulsing in lockstep.
  const PER_EDGE = 2
  const pulses: NNPulse[] = edges.flatMap((e, ei) =>
    Array.from({ length: PER_EDGE }, (_, k) => ({
      x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2,
      phase: k / PER_EDGE + e.layer * 0.16 + (ei % 3) * 0.05,
    }))
  )

  return { nodes, edges, pulses }
})()

function EngineDiagram() {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    // Reduced motion: leave a clean static net, no pulses (CSS hides them).
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const els = Array.from(svg.querySelectorAll<SVGCircleElement>('.nn-pulse'))
    const P = NN_GEO.pulses
    const SPEED = 1.3
    let raf = 0
    const update = () => {
      raf = 0
      const rect = svg.getBoundingClientRect()
      const vh = window.innerHeight || 1
      // 0 as the section enters the viewport, 1 as it leaves — scrubbable, and
      // reverses when scrolling back up.
      const p = Math.max(0, Math.min(1, (vh - rect.top) / (vh + rect.height)))
      for (let i = 0; i < els.length; i++) {
        const pu = P[i]
        const t = (((p * SPEED + pu.phase) % 1) + 1) % 1
        const dx = (pu.x2 - pu.x1) * t
        const dy = (pu.y2 - pu.y1) * t
        els[i].style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`
        els[i].style.opacity = (Math.sin(t * Math.PI) * 0.95).toFixed(2)
      }
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const labelY = 262
  return (
    <svg ref={svgRef} className="engine" viewBox={`0 0 ${NN_VB_W} ${NN_VB_H}`} role="img"
      aria-label="The four-stage pipeline as a neural network: open text passes through type detection, qualitative coding, thematic categorization, and executive synthesis to become structured signal.">
      {NN_GEO.edges.map((e, i) => (
        <line key={i} className="nn-edge" x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
          strokeOpacity={e.opacity} strokeWidth={e.width} />
      ))}

      {/* pulses start at their edge's source node and move via transform only */}
      {NN_GEO.pulses.map((pu, i) => (
        <circle key={i} className="nn-pulse" cx={pu.x1} cy={pu.y1} r={2.6} />
      ))}

      {NN_GEO.nodes.map((col, li) =>
        col.map((n, j) => (
          <circle key={`${li}-${j}`} className={`nn-node nn-node-${NN_LAYERS[li].kind}`} cx={n.x} cy={n.y} r={7} />
        ))
      )}

      {NN_LAYERS.map((L, li) => (
        <text
          key={li}
          className={`nn-label nn-label-${L.kind}`}
          x={NN_GEO.nodes[li][0].x}
          y={labelY}
          textAnchor="middle"
        >
          {L.label}
        </text>
      ))}
    </svg>
  )
}

const FEATURES = [
  { Icon: Lock, label: 'Architectural anonymity', caption: 'Privacy by methodology, not policy.' },
  { Icon: Microscope, label: 'Research-grade methodology', caption: 'Every insight traces to a comment.' },
  { Icon: Zap, label: 'Analysis on the fly', caption: 'Paste responses, click analyze.' },
]

const PIPELINE = [
  { num: '00', name: 'Question type detection', caption: 'Routes the analysis' },
  { num: '01', name: 'Qualitative coding', caption: 'Keywords from original text' },
  { num: '02', name: 'Thematic categorization', caption: 'Grouped, traced to source' },
  { num: '03', name: 'Executive synthesis', caption: 'Leadership-ready, no hallucination' },
]

export default function Home() {
  const [light, setLight] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('qualai_theme')
    if (saved === 'light') {
      setLight(true)
      document.documentElement.classList.add('light')
    }
  }, [])

  const toggleTheme = () => {
    const next = !light
    setLight(next)
    if (next) {
      document.documentElement.classList.add('light')
      localStorage.setItem('qualai_theme', 'light')
    } else {
      document.documentElement.classList.remove('light')
      localStorage.setItem('qualai_theme', 'dark')
    }
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      :root {
        --bg: #0e0f0d;
        --surface: #161710;
        --green: #7db87a;
        --green-dim: #4a7a47;
        --text: #e8e6df;
        --muted: #7a7870;
        --border: rgba(125, 184, 122, 0.15);
        --red: #d98b6a;
      }

      :root.light {
        --bg: #f5f4f0;
        --surface: #ffffff;
        --green: #2E7D32;
        --green-dim: #4a7a47;
        --text: #1a1a1a;
        --muted: #666666;
        --border: rgba(46, 125, 50, 0.15);
        --red: #b5533f;
      }

        html, body { height: 100%; background: var(--bg); color: var(--text); }

        .page {
          min-height: 100vh;
          font-family: var(--font-sans), sans-serif;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow-x: hidden;
        }

        .grain {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          opacity: 0.035;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-size: 128px;
        }

        .grid-lines {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-image:
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 100%);
        }

        .glow {
          position: fixed;
          top: -20%;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(125,184,122,0.07) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        nav {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 28px 48px;
          border-bottom: 1px solid var(--border);
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 2px;
          font-family: var(--font-wordmark), serif;
          font-size: 35px;
          color: var(--text);
          letter-spacing: -0.02em;
        }

        .koala-mark {
          width: 32px;
          height: 32px;
          position: relative;
        }

        .nav-link {
          font-family: var(--font-sans), sans-serif;
          font-weight: 500;
          font-size: 12px;
          text-decoration: none;
          letter-spacing: 0.04em;
        }

        .nav-tag {
          font-family: var(--font-sans), sans-serif;
          font-weight: 500;
          font-size: 11px;
          color: var(--green);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          border: 1px solid var(--green-dim);
          padding: 4px 12px;
          border-radius: 99px;
        }

        main {
          position: relative;
          z-index: 10;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 24px;
          text-align: center;
        }

        .eyebrow {
          font-family: var(--font-sans), sans-serif;
          font-weight: 600;
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--green);
          margin-bottom: 28px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .eyebrow::before,
        .eyebrow::after {
          content: '';
          display: block;
          width: 32px;
          height: 1px;
          background: var(--green-dim);
        }

        h1 {
          font-family: var(--font-sans), sans-serif;
          font-weight: 700;
          font-size: clamp(48px, 8vw, 88px);
          line-height: 1.02;
          letter-spacing: -0.03em;
          color: var(--text);
          margin-bottom: 8px;
          animation: fadeUp 0.8s ease both;
        }

        h1 em {
          font-family: var(--font-accent), serif;
          font-style: italic;
          font-weight: 400;
          color: var(--green);
        }

        .subhead {
          font-family: var(--font-mono), monospace;
          font-size: clamp(13px, 2vw, 15px);
          color: var(--muted);
          max-width: 460px;
          line-height: 1.6;
          margin: 20px auto 0;
          font-weight: 400;
          animation: fadeUp 0.8s 0.15s ease both;
        }

        /* Hero: centered copy + engine diagram */
        .hero {
          width: 100%;
          max-width: 900px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .hero .cta-btn { margin-top: 32px; }

        /* Neural-network pipeline diagram */
        .engine {
          width: 100%;
          max-width: 900px;
          height: auto;
          display: block;
          margin: 72px auto 0;
          animation: fadeUp 0.8s 0.2s ease both;
        }
        .nn-edge { stroke: var(--green); fill: none; stroke-linecap: round; }
        .nn-node { stroke-width: 1.5; }
        .nn-node-input { fill: transparent; stroke: var(--muted); opacity: 0.45; }
        .nn-node-mid { fill: color-mix(in srgb, var(--green) 8%, transparent); stroke: var(--green); opacity: 0.9; }
        .nn-node-output { fill: var(--green); stroke: var(--green); filter: drop-shadow(0 0 5px color-mix(in srgb, var(--green) 60%, transparent)); }
        .nn-pulse { fill: #eafff0; opacity: 0; filter: drop-shadow(0 0 3px var(--green)); will-change: transform, opacity; }
        .nn-label { font-family: var(--font-mono), monospace; font-size: 11px; letter-spacing: 0.14em; }
        .nn-label-input { fill: var(--muted); opacity: 0.7; }
        .nn-label-mid { fill: var(--muted); }
        .nn-label-output { fill: var(--green); }
        @media (prefers-reduced-motion: reduce) { .nn-pulse { display: none; } }

        /* Value-proposition map (own section below the hero) */
        /* Why Qualai — value-prop diagram annotated with the argument */
        .why-vp { width: 100%; max-width: 1120px; margin: 72px auto 0; display: flex; flex-direction: column; align-items: center; }
        .why-intro { font-family: var(--font-mono), monospace; font-size: 14px; color: var(--text); max-width: 640px; text-align: center; line-height: 1.7; margin-bottom: 32px; }
        .why-grid { display: grid; grid-template-columns: 1fr minmax(0, 480px) 1fr; gap: 32px; align-items: center; width: 100%; }
        .why-grid .valueprop { max-width: 480px; margin: 0; }
        .why-note { max-width: 300px; }
        .why-note-left { justify-self: end; text-align: right; }
        .why-note-right { justify-self: start; text-align: left; }
        .why-note-label { font-family: var(--font-sans), sans-serif; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--green); margin-bottom: 10px; }
        .why-note p { font-family: var(--font-mono), monospace; font-size: 12.5px; color: var(--muted); line-height: 1.75; }
        .why-payoff { font-family: var(--font-mono), monospace; font-size: 13.5px; color: var(--text); text-align: center; max-width: 660px; line-height: 1.7; margin-top: 28px; padding-top: 28px; border-top: 1px solid var(--border); }

        .valueprop {
          width: 100%;
          max-width: 600px;
          height: auto;
          display: block;
          animation: fadeUp 0.8s 0.2s ease both;
        }
        .valueprop .vp-line { fill: none; stroke: var(--muted); stroke-width: 1.4; opacity: 0.5; }
        .valueprop .vp-arrowhead { fill: var(--muted); opacity: 0.6; }
        .vp-rect-neutral { fill: var(--surface); stroke: var(--border); stroke-width: 1; }
        .vp-rect-problem { fill: color-mix(in srgb, var(--red) 12%, transparent); stroke: color-mix(in srgb, var(--red) 48%, transparent); stroke-width: 1; }
        .vp-rect-solution { fill: color-mix(in srgb, var(--green) 12%, transparent); stroke: color-mix(in srgb, var(--green) 45%, transparent); stroke-width: 1; }
        .vp-rect-final { fill: color-mix(in srgb, var(--green) 22%, transparent); stroke: var(--green); stroke-width: 1.4; animation: vpPulse 3.4s ease-in-out infinite; }
        .vp-title { font-family: var(--font-sans), sans-serif; font-weight: 600; font-size: 15px; }
        .vp-sub { font-family: var(--font-sans), sans-serif; font-weight: 400; font-size: 11px; fill: var(--muted); }
        .vp-t-neutral { fill: var(--text); }
        .vp-t-problem { fill: var(--red); }
        .vp-t-solution { fill: var(--green); }

        @keyframes vpPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.78; } }

        .cta-btn {
        display: inline-block;
        background: var(--green);
        color: #0e0f0d;
        font-family: var(--font-sans), sans-serif;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        padding: 14px 32px;
        border-radius: 8px;
        text-decoration: none;
        transition: background 0.2s;
        animation: fadeUp 0.8s 0.3s ease both;
        }

      .cta-btn:hover { background: #8ec98b; }

        .features {
          display: flex;
          gap: 40px;
          margin-top: 80px;
          flex-wrap: wrap;
          justify-content: center;
          animation: fadeUp 0.8s 0.45s ease both;
        }

        .feature {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          max-width: 200px;
          text-align: center;
        }

        .feature-icon {
          color: var(--green);
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--surface);
        }

        .feature-label {
          font-family: var(--font-sans), sans-serif;
          font-weight: 600;
          font-size: 14px;
          color: var(--text);
        }

        .feature-cap {
          font-family: var(--font-sans), sans-serif;
          font-size: 12px;
          color: var(--muted);
          line-height: 1.5;
        }

        /* How it works — visual pipeline */
        .pipeline-flow {
          display: flex;
          align-items: stretch;
          justify-content: center;
          gap: 0;
          width: 100%;
        }

        .pipe-node {
          flex: 1;
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 18px 16px;
          background: var(--surface);
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-align: left;
        }

        .pipe-num {
          font-family: var(--font-mono), monospace;
          font-weight: 500;
          font-size: 12px;
          letter-spacing: 0.1em;
          color: var(--green);
        }

        .pipe-name {
          font-family: var(--font-sans), sans-serif;
          font-weight: 600;
          font-size: 13px;
          color: var(--text);
          line-height: 1.3;
        }

        .pipe-cap {
          font-family: var(--font-sans), sans-serif;
          font-size: 11px;
          color: var(--muted);
          line-height: 1.4;
        }

        .pipe-arrow {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--green-dim);
          padding: 0 6px;
          flex-shrink: 0;
        }

        .why-text {
          font-family: var(--font-mono), monospace;
          font-size: 13px;
          color: var(--muted);
          line-height: 1.8;
          font-weight: 400;
        }

        footer {
          position: relative;
          z-index: 10;
          padding: 24px 48px;
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-family: var(--font-sans), sans-serif;
          font-size: 11px;
          color: var(--muted);
          letter-spacing: 0.04em;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .vp-rect-final { animation: none; }
        }

        @media (max-width: 600px) {
          nav { padding: 20px 24px; }
          footer { flex-direction: column; gap: 8px; text-align: center; }
          .features { gap: 20px; }
        }

        @media (max-width: 768px) {
          nav { padding: 16px 20px; flex-wrap: nowrap; }
          .logo { font-size: 16px; }
          .logo img { width: 36px !important; height: 36px !important; margin-top: 4px !important; }
          nav div { gap: 8px; }
          nav a { font-size: 10px; }
          .nav-try { display: none; }
          .nav-tag { display: none; }
          h1 { font-size: clamp(36px, 10vw, 88px); }
          main { padding: 40px 20px; }
          .hero .cta-btn { align-self: stretch; }
          .engine { margin-top: 36px; }
          .why-vp { margin-top: 48px; }
          .why-grid { grid-template-columns: 1fr; gap: 20px; justify-items: center; }
          .why-note { max-width: 460px; text-align: center; }
          .why-note-left, .why-note-right { justify-self: center; text-align: center; }
          .features { flex-direction: column; gap: 24px; }
          .feature { max-width: 100%; }
          .cta-btn { width: 100%; text-align: center; padding: 14px 20px; }
          footer { padding: 16px 20px; font-size: 10px; }
          .pipeline-flow { flex-direction: column; }
          .pipe-arrow { transform: rotate(90deg); padding: 8px 0; }
        }

      `}</style>

      <div className="page">
        <div className="grain" />
        <div className="grid-lines" />
        <div className="glow" />

        <nav>
          <div className="logo">
            <img src="/koala-logo.svg" alt="Qualai" width={60} height={60} style={{display:'block', marginTop:'8px'}} />            Qualai
          </div>
          <div style={{display:'flex', alignItems:'center', gap:'24px'}}>
          <a href="/analyze" className="nav-link nav-try" style={{color:'var(--green)'}}>Try it free</a>
          <a href="/dashboard" className="nav-link" style={{color:'var(--muted)'}}>Dashboard</a>
          <a href="/settings" className="nav-link" style={{color:'var(--muted)'}}>Settings</a>

          <button onClick={toggleTheme} style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--muted)',
            padding: '4px 12px',
            borderRadius: '99px',
            fontSize: '11px',
            fontFamily: 'var(--font-sans), sans-serif',
            cursor: 'pointer',
            letterSpacing: '0.04em'
          }}>
            {light ? '☀️ Light' : '🌙 Dark'}
          </button>

          <span className="nav-tag">Beta</span>
          </div>
        </nav>

        <main>
          <div className="hero">
            <div className="eyebrow">Qualitative AI for HR</div>

            <h1>Understand what<br />your team <em>really</em> feels</h1>

            <p className="subhead">
              Scattered open-text responses become one structured, stakeholder-ready signal.
            </p>

            <a href="/analyze" className="cta-btn">
              Try it free
            </a>
          </div>

          <div className="features">
            {FEATURES.map(({ Icon, label, caption }) => (
              <div className="feature" key={label}>
                <div className="feature-icon">
                  <Icon size={20} strokeWidth={1.5} />
                </div>
                <div className="feature-label">{label}</div>
                <div className="feature-cap">{caption}</div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: '80px',
            width: '100%',
            maxWidth: '980px',
          }}>
            <div className="eyebrow" style={{justifyContent:'flex-start', marginBottom:'20px'}}>How it works</div>

            <div className="pipeline-flow">
              {PIPELINE.map((step, i) => (
                <Fragment key={step.num}>
                  <div className="pipe-node">
                    <div className="pipe-num">{step.num}</div>
                    <div className="pipe-name">{step.name}</div>
                    <div className="pipe-cap">{step.caption}</div>
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <div className="pipe-arrow">
                      <ArrowRight size={18} strokeWidth={1.5} />
                    </div>
                  )}
                </Fragment>
              ))}
            </div>
          </div>

          <EngineDiagram />

          <section className="why-vp">
            <div className="eyebrow" style={{justifyContent:'center', marginBottom:'20px'}}>Why Qualai</div>

            <p className="why-intro">
              Open-text responses are the richest HR signal and the least used — analyzing them has been too expensive and too risky. Qualai answers both at once.
            </p>

            <div className="why-grid">
              <div className="why-note why-note-left">
                <div className="why-note-label">Speed</div>
                <p>Manual qualitative coding takes days. The same 4-stage pipeline runs on every analysis, so results stay fast, comparable over time, and defensible in a leadership meeting.</p>
              </div>

              <svg className="valueprop" viewBox="0 0 640 464" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Open-text survey data is the richest but least-used signal because analysis is too expensive and too risky; Qualai answers both with speed and trust to unlock leadership-ready insight.">
                <defs>
                  <marker id="vp-arrow" markerWidth="9" markerHeight="9" refX="6.5" refY="4.5" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
                    <path className="vp-arrowhead" d="M2,2 L7,4.5 L2,7 Z" />
                  </marker>
                </defs>

                {/* connectors (drawn first so node cards sit on top) */}
                <path className="vp-line" d="M292 76 L178 140" markerEnd="url(#vp-arrow)" />
                <path className="vp-line" d="M348 76 L462 140" markerEnd="url(#vp-arrow)" />
                <path className="vp-line" d="M168 200 L168 262" markerEnd="url(#vp-arrow)" />
                <path className="vp-line" d="M472 200 L472 262" markerEnd="url(#vp-arrow)" />
                <path className="vp-line" d="M196 324 L300 386" markerEnd="url(#vp-arrow)" />
                <path className="vp-line" d="M444 324 L340 386" markerEnd="url(#vp-arrow)" />
                {/* speed & trust reinforce each other */}
                <path className="vp-line" d="M296 294 L344 294" markerStart="url(#vp-arrow)" markerEnd="url(#vp-arrow)" />

                <VNode cx={320} cy={46} variant="neutral" title="Open-text survey data" sub="Richest signal, least used" />
                <VNode cx={168} cy={170} variant="problem" title="Too expensive" sub="Days of manual coding" />
                <VNode cx={472} cy={170} variant="problem" title="Too risky" sub="No trust guarantees" />
                <VNode cx={168} cy={294} variant="solution" title="Speed" sub="4-stage AI pipeline" />
                <VNode cx={472} cy={294} variant="solution" title="Trust" sub="Anonymity + BYOK" />
                <VNode cx={320} cy={418} variant="final" title="Unlocked signal" sub="Leadership-ready insight" />
              </svg>

              <div className="why-note why-note-right">
                <div className="why-note-label">Trust</div>
                <p>Most HR tools promise anonymity in a privacy policy. Qualai builds it into the methodology — individual voices dissolve into collective patterns before insights reach leadership, and BYOK keeps analysis on your own key.</p>
              </div>
            </div>

            <p className="why-payoff">
              Built for teams of 5–50 who can't afford enterprise HR software but deserve enterprise-grade insight.
            </p>
          </section>

        <div style={{
          marginTop: '48px',
          padding: '48px',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          maxWidth: '700px',
          width: '100%',
          textAlign: 'center',
          background: 'var(--surface)'
        }}>
          <div className="eyebrow" style={{justifyContent:'center', marginBottom:'20px'}}>Work with me</div>

          <h2 style={{fontFamily:'var(--font-wordmark), serif', fontSize:'28px', color:'var(--text)', marginBottom:'16px', lineHeight:'1.3'}}>
            Interested in bringing this kind of thinking to your organization?
          </h2>

          <p style={{fontSize:'13px', color:'var(--muted)', lineHeight:'1.8', fontFamily:'var(--font-mono), monospace', fontWeight:400, marginBottom:'32px'}}>
            I'm a recent Employment Relations graduate from Queen's University actively looking for opportunities in HR analytics, people ops, and organizational development. I also take on consulting projects — if your HR team or consulting firm needs a custom qualitative analysis tool, a people analytics solution, or just someone who thinks deeply about the intersection of HR and AI, let's talk.
          </p>

          <div style={{display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap'}}>
            <a href="https://linkedin.com/in/sebasroavi" target="_blank" rel="noopener noreferrer" style={{
              display:'inline-flex', alignItems:'center', gap:'6px',
              background:'var(--green)', color:'#0e0f0d',
              padding:'12px 24px', borderRadius:'8px',
              fontSize:'12px', fontFamily:'var(--font-mono), monospace',
              letterSpacing:'0.06em', textTransform:'uppercase',
              textDecoration:'none', transition:'background 0.2s'
            }}>
              Connect on LinkedIn
            </a>
            <a href="mailto:sebasroavi@gmail.com" style={{
              display:'inline-flex', alignItems:'center', gap:'6px',
              background:'transparent', color:'var(--text)',
              border:'1px solid var(--border)',
              padding:'12px 24px', borderRadius:'8px',
              fontSize:'12px', fontFamily:'var(--font-mono), monospace',
              letterSpacing:'0.06em', textTransform:'uppercase',
              textDecoration:'none', transition:'all 0.2s'
            }}>
              Send me an email
            </a>
          </div>
        </div>

        </main>

        <footer>
        <span>© 2026 Qualai — Sebastian Roa Viertel</span>
        <a href="https://linkedin.com/in/sebasroavi" target="_blank" rel="noopener noreferrer" style={{color:'var(--muted)', textDecoration:'none', fontSize:'11px'}}>LinkedIn @sebasroavi</a>
        </footer>
      </div>
    </>
  );
}
