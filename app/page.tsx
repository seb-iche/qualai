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
// Hero engine diagram — open-text input enters a "black box" that opens to
// reveal a pipeline routing in different directions (like real pipes) and
// exits as one structured output.
const ENG_PATHS = [
  'M110,140 L205,140 L205,72 L515,72 L515,140 L610,140',   // routes up and over
  'M110,140 L610,140',                                       // straight through
  'M110,140 L205,140 L205,208 L515,208 L515,140 L610,140',  // routes down and under
]

function EngineDiagram() {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const dots = Array.from(svg.querySelectorAll<SVGCircleElement>('.eng-flow'))

    // Open the box when the diagram scrolls into view.
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) svg.classList.add('open') }),
      { threshold: 0.35 }
    )
    io.observe(svg)

    const setDot = (d: SVGCircleElement, dist: number) =>
      d.style.setProperty('offset-distance', `${(dist * 100).toFixed(2)}%`)

    // Reduced motion: place packets statically, don't tie them to scroll.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      dots.forEach(d => setDot(d, parseFloat(d.dataset.phase || '0')))
      return () => io.disconnect()
    }

    // Otherwise the packets advance along the pipes as the page is scrolled —
    // forward on scroll down, backward on scroll up.
    const SPEED = 2.4
    let raf = 0
    const update = () => {
      raf = 0
      const rect = svg.getBoundingClientRect()
      const vh = window.innerHeight || 1
      const p = Math.max(0, Math.min(1, (vh - rect.top) / (vh + rect.height)))
      for (const d of dots) {
        const phase = parseFloat(d.dataset.phase || '0')
        setDot(d, (((p * SPEED + phase) % 1) + 1) % 1)
      }
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <svg ref={svgRef} className="engine" viewBox="0 0 720 280" role="img"
      aria-label="Open-text responses enter the Qualai pipeline, route through its stages, and exit as one structured insight.">
      {/* the black box */}
      <rect className="eng-box" x="175" y="48" width="370" height="184" rx="14" />

      {/* pipes routing through the box, in different directions */}
      {ENG_PATHS.map((d, i) => (
        <g key={i}>
          <path className="eng-pipe" d={d} />
          <path className="eng-pipe-hi" d={d} />
        </g>
      ))}

      {/* data packets — position driven by scroll (see effect above) */}
      {ENG_PATHS.map((d, pi) =>
        [0, 1, 2].map(k => (
          <circle key={`${pi}-${k}`} className="eng-dot eng-flow" r="3.2"
            data-phase={(k / 3 + pi * 0.11).toFixed(3)}
            style={{ offsetPath: `path('${d}')` }} />
        ))
      )}

      {/* interior label — revealed once the box opens */}
      <text className="eng-label eng-label-g" x="360" y="70" textAnchor="middle">PIPELINE</text>

      {/* input: scattered open text */}
      <circle className="eng-in" cx="58" cy="126" r="2.2" />
      <circle className="eng-in" cx="46" cy="140" r="2.2" />
      <circle className="eng-in" cx="58" cy="154" r="2.2" />
      <text className="eng-label" x="98" y="116" textAnchor="end">OPEN TEXT</text>

      {/* output: one structured signal */}
      <g>
        <circle className="eng-out" cx="655" cy="124" r="3" />
        <circle className="eng-out" cx="641" cy="140" r="3" />
        <circle className="eng-out" cx="669" cy="140" r="3" />
        <circle className="eng-out" cx="655" cy="156" r="3" />
      </g>
      <text className="eng-label eng-label-g" x="655" y="182" textAnchor="middle">STRUCTURED</text>

      {/* box doors — slide apart on load to reveal the pipeline */}
      <rect className="eng-door eng-door-l" x="175" y="48" width="190" height="184" rx="14" />
      <rect className="eng-door eng-door-r" x="355" y="48" width="190" height="184" rx="14" />
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

        /* Input → black box → output engine diagram */
        .engine {
          width: 100%;
          max-width: 860px;
          height: auto;
          display: block;
          margin: 72px auto 0;
          animation: fadeUp 0.8s 0.2s ease both;
        }
        .eng-box { fill: rgba(8,12,9,0.9); stroke: var(--green-dim); stroke-width: 1.2; }
        .eng-pipe { fill: none; stroke: var(--green-dim); stroke-width: 7; stroke-linecap: round; stroke-linejoin: round; }
        .eng-pipe-hi { fill: none; stroke: var(--green); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; opacity: 0.4; }
        .eng-dot { fill: #e4ffdb; filter: drop-shadow(0 0 4px var(--green)); }
        .eng-out { fill: var(--green); filter: drop-shadow(0 0 5px var(--green)); }
        .eng-in { fill: var(--muted); }
        .eng-label { font-family: var(--font-mono), monospace; font-size: 11px; letter-spacing: 0.12em; fill: var(--muted); }
        .eng-label-g { fill: var(--green); }
        .eng-door { fill: rgba(10,14,10,0.98); stroke: var(--green-dim); stroke-width: 1; }
        .eng-flow { offset-rotate: 0deg; }
        .engine.open .eng-door-l { animation: engDoorL 0.9s ease both; }
        .engine.open .eng-door-r { animation: engDoorR 0.9s ease both; }
        @keyframes engDoorL { to { transform: translateX(-26px); opacity: 0; } }
        @keyframes engDoorR { to { transform: translateX(26px); opacity: 0; } }

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
          .engine.open .eng-door-l, .engine.open .eng-door-r { animation: none; opacity: 0; }
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
