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
const FIELD_CYCLE = 66
const MESSY = ['@', '#', '%', '&', '?', '*', '/', '\\', '~', '+', '=', '<', '>', '§', '¤', ';', ':', '^', '$']

function ahash(a: number, b: number, c: number) {
  const x = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453
  return x - Math.floor(x)
}
function mchar(a: number, b: number, c: number) {
  return MESSY[Math.floor(ahash(a, b, c) * MESSY.length)]
}

interface Field { noise: string; struct: string }

// Builds two overlaid text layers for the frame: `noise` (messy raw symbols)
// and `struct` (pipelines + the organized lattice they feed). Rendering two
// single text nodes keeps a large animated field cheap.
function buildField(f: number, cols: number, rows: number): Field {
  const noise: string[] = new Array(rows)
  const struct: string[] = new Array(rows)
  const churn = Math.floor(f / 2)
  const prog = (f % FIELD_CYCLE) / FIELD_CYCLE

  // Pipeline geometry, biased to the right (the open side, away from the copy).
  const pipeCols = [0.55, 0.66, 0.77, 0.88]
    .map(fr => Math.round(fr * cols))
    .filter(c => c > 1 && c < cols - 1)
  const pipeTop = Math.max(2, Math.round(rows * 0.16))
  const merge = Math.round(rows * 0.56)
  const collector = merge + 1
  const latTop = merge + 3
  const latBot = rows - 2
  const latL = pipeCols.length ? pipeCols[0] : Math.round(cols * 0.55)
  const latR = pipeCols.length ? pipeCols[pipeCols.length - 1] : cols - 2
  const revealRows = Math.floor(prog * (latBot - latTop + 2))

  for (let r = 0; r < rows; r++) {
    const nrow: string[] = new Array(cols)
    const srow: string[] = new Array(cols)
    for (let c = 0; c < cols; c++) {
      let s = ' '

      // funnel lips feeding each pipe
      if (r === pipeTop - 1) {
        for (const pc of pipeCols) {
          if (c === pc - 1) s = '\\'
          else if (c === pc + 1) s = '/'
        }
      }
      // vertical pipes carrying descending packets
      if (r >= pipeTop && r <= merge && pipeCols.indexOf(c) >= 0) {
        s = '║'
        const k = pipeCols.indexOf(c)
        const dropSpan = merge - pipeTop + 1
        const packet = pipeTop + ((f + k * 4) % dropSpan)
        if (r === packet) {
          const depth = (r - pipeTop) / dropSpan
          s = depth < 0.45 ? mchar(r, c, f) : depth < 0.75 ? '▒' : '▓'
        }
      }
      // collector rail into the lattice
      if (r === collector && c >= latL && c <= latR) {
        s = pipeCols.indexOf(c) >= 0 ? '╤' : '═'
      }
      // organized lattice — builds top→bottom over the cycle, then loops
      if (r >= latTop && r <= latBot && c >= latL && c <= latR) {
        const rowIdx = r - latTop
        if (rowIdx < revealRows && (r + c) % 2 === 0) s = '◆'
      }

      srow[c] = s

      // messy noise wherever structure isn't — denser left, thinning right
      let n = ' '
      if (s === ' ') {
        const thr = 0.64 + (c / cols) * 0.2
        if (ahash(r, c, churn) > thr) n = mchar(c * 3, r * 5, churn)
      }
      nrow[c] = n
    }
    noise[r] = nrow.join('')
    struct[r] = srow.join('')
  }
  return { noise: noise.join('\n'), struct: struct.join('\n') }
}

function AsciiField() {
  const ref = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ cols: 96, rows: 34 })
  // Initial (SSR) frame shows the built lattice — deterministic, so hydration
  // matches; the client then restarts from 0 and animates the build-up.
  const [frame, setFrame] = useState(FIELD_CYCLE - 1)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const CHAR_W = 9.2
    const LINE_H = 15
    const measure = () => {
      setDims({
        cols: Math.max(40, Math.floor(el.clientWidth / CHAR_W) + 2),
        rows: Math.max(18, Math.floor(el.clientHeight / LINE_H) + 1),
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    let id: ReturnType<typeof setInterval> | undefined
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setFrame(0)
      id = setInterval(() => setFrame(f => f + 1), 110)
    }
    return () => { ro.disconnect(); if (id) clearInterval(id) }
  }, [])

  const { noise, struct } = buildField(frame, dims.cols, dims.rows)
  return (
    <div className="hero-ascii" ref={ref} aria-hidden="true">
      <pre className="af af-noise">{noise}</pre>
      <pre className="af af-struct">{struct}</pre>
    </div>
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

        /* Hero with a full-bleed animated ASCII pipeline field */
        .hero {
          position: relative;
          width: 100%;
          max-width: 1240px;
          min-height: 62vh;
          display: flex;
          align-items: center;
        }
        .hero-main {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          text-align: left;
          max-width: 720px;
          padding: 40px 0;
        }
        .hero-main .eyebrow { justify-content: flex-start; margin-bottom: 24px; }
        .hero-main h1 { font-size: clamp(40px, 5.6vw, 70px); text-align: left; }
        .hero-main .subhead { margin: 20px 0 0; text-align: left; max-width: 520px; }
        .hero-main .cta-btn { margin-top: 36px; }

        /* Full-bleed ASCII field: two overlaid text layers behind the copy */
        .hero-ascii {
          position: absolute;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
          -webkit-mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.12) 34%, #000 62%, #000 100%);
          mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.12) 34%, #000 62%, #000 100%);
        }
        .af {
          position: absolute;
          inset: 0;
          margin: 0;
          font-family: var(--font-mono), monospace;
          font-size: 12px;
          line-height: 15px;
          letter-spacing: 2px;
          white-space: pre;
          overflow: hidden;
          user-select: none;
        }
        .af-noise { color: var(--muted); opacity: 0.4; }
        .af-struct { color: var(--green); opacity: 0.92; text-shadow: 0 0 6px color-mix(in srgb, var(--green) 45%, transparent); }

        /* Value-proposition map (own section below the hero) */
        .valueprop-wrap { width: 100%; display: flex; justify-content: center; margin-top: 72px; }
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
          .hero { min-height: auto; justify-content: center; }
          .hero-main { align-items: center; text-align: center; max-width: 100%; padding: 0; }
          .hero-main .eyebrow { justify-content: center; }
          .hero-main h1, .hero-main .subhead { text-align: center; }
          .hero-main .subhead { margin-left: auto; margin-right: auto; }
          .hero-main .cta-btn { align-self: stretch; }
          .hero-ascii { display: none; }
          .valueprop-wrap { margin-top: 48px; }
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
            <AsciiField />
            <div className="hero-main">
              <div className="eyebrow">Qualitative AI for HR</div>

              <h1>Understand what<br />your team <em>really</em> feels</h1>

              <p className="subhead">
                Scattered open-text responses become one structured, stakeholder-ready signal.
              </p>

              <a href="/analyze" className="cta-btn">
                Try it free
              </a>
            </div>
          </div>

          <div className="valueprop-wrap">
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

          <div style={{
            marginTop: '48px',
            padding: '48px',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            maxWidth: '700px',
            width: '100%',
            textAlign: 'left'
          }}>

            <div className="eyebrow" style={{justifyContent:'flex-start', marginBottom:'20px'}}>Why Qualai</div>
            <p className="why-text">
              Most HR tools promise anonymity in a privacy policy; Qualai builds it into the methodology, dissolving individual voices into collective patterns before insights reach leadership. The same structured pipeline runs on every analysis, so results stay comparable over time and defensible in a leadership meeting — built for teams of 5–50 who can't afford enterprise HR software but deserve enterprise-grade insight.
            </p>
          </div>

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
            <a href="mailto:sroaviertel@gmail.com,sebasroavi@gmail.com" style={{
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
