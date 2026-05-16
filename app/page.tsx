'use client'
import { useEffect, useState } from 'react'

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
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      :root {
        --bg: #0e0f0d;
        --surface: #161710;
        --green: #7db87a;
        --green-dim: #4a7a47;
        --text: #e8e6df;
        --muted: #7a7870;
        --border: rgba(125, 184, 122, 0.15);
      }

      :root.light {
        --bg: #f5f4f0;
        --surface: #ffffff;
        --green: #2E7D32;
        --green-dim: #4a7a47;
        --text: #1a1a1a;
        --muted: #666666;
        --border: rgba(46, 125, 50, 0.15);
      }

        html, body { height: 100%; background: var(--bg); color: var(--text); }

        .page {
          min-height: 100vh;
          font-family: 'DM Mono', monospace;
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
          font-family: 'DM Serif Display', serif;
          font-size: 35px;
          color: var(--text);
          letter-spacing: -0.02em;
        }

        .koala-mark {
          width: 32px;
          height: 32px;
          position: relative;
        }

        .nav-tag {
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
          font-family: 'DM Serif Display', serif;
          font-size: clamp(48px, 8vw, 88px);
          line-height: 1.0;
          letter-spacing: -0.03em;
          color: var(--text);
          margin-bottom: 8px;
          animation: fadeUp 0.8s ease both;
        }

        h1 em {
          font-style: italic;
          color: var(--green);
        }

        .tagline {
          font-size: clamp(13px, 2vw, 16px);
          color: var(--muted);
          max-width: 480px;
          line-height: 1.7;
          margin: 24px auto 48px;
          font-weight: 300;
          animation: fadeUp 0.8s 0.15s ease both;
        }

        .waitlist {
          display: flex;
          gap: 0;
          max-width: 400px;
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
          background: var(--surface);
          animation: fadeUp 0.8s 0.3s ease both;
          transition: border-color 0.2s;
        }

        .waitlist:focus-within {
          border-color: var(--green-dim);
        }

        .waitlist input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          padding: 14px 18px;
          font-family: 'DM Mono', monospace;
          font-size: 13px;
          color: var(--text);
          font-weight: 300;
        }

        .waitlist input::placeholder { color: var(--muted); }

        .waitlist button {
          background: var(--green);
          border: none;
          padding: 14px 20px;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          font-weight: 400;
          color: #0e0f0d;
          cursor: pointer;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          transition: background 0.2s;
          white-space: nowrap;
        }

        .waitlist button:hover { background: #8ec98b; }

        .waitlist-btn {
        display: inline-block;
        background: var(--green);
        color: #0e0f0d;
        font-family: 'DM Mono', monospace;
        font-size: 13px;
        font-weight: 400;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        padding: 14px 32px;
        border-radius: 8px;
        text-decoration: none;
        transition: background 0.2s;
        animation: fadeUp 0.8s 0.3s ease both;
        }

      .waitlist-btn:hover { background: #8ec98b; }

        .features {
          display: flex;
          gap: 32px;
          margin-top: 80px;
          flex-wrap: wrap;
          justify-content: center;
          animation: fadeUp 0.8s 0.45s ease both;
        }

        .feature {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          max-width: 200px;
          text-align: left;
        }

        .feature-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--green);
          margin-top: 6px;
          flex-shrink: 0;
        }

        .feature-text {
          font-size: 12px;
          color: var(--muted);
          line-height: 1.6;
          font-weight: 300;
        }

        .feature-text strong {
          display: block;
          color: var(--text);
          font-weight: 400;
          margin-bottom: 2px;
        }

        footer {
          position: relative;
          z-index: 10;
          padding: 24px 48px;
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          color: var(--muted);
          letter-spacing: 0.04em;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
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
          .features { flex-direction: column; gap: 16px; }
          .feature { max-width: 100%; }
          .waitlist-btn { width: 100%; text-align: center; padding: 14px 20px; }
          footer { padding: 16px 20px; font-size: 10px; }
          .how-it-works-grid { grid-template-columns: repeat(2, 1fr) !important; }
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
          <a href="/analyze" className="nav-try" style={{fontSize:'12px', color:'var(--green)', textDecoration:'none', letterSpacing:'0.04em'}}>Try it free</a>
          <a href="/dashboard" style={{fontSize:'12px', color:'var(--muted)', textDecoration:'none', letterSpacing:'0.04em'}}>Dashboard</a>
          <a href="/settings" style={{fontSize:'12px', color:'var(--muted)', textDecoration:'none', letterSpacing:'0.04em'}}>Settings</a>
          
          <button onClick={toggleTheme} style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--muted)',
            padding: '4px 12px',
            borderRadius: '99px',
            fontSize: '11px',
            fontFamily: 'DM Mono, monospace',
            cursor: 'pointer',
            letterSpacing: '0.04em'
          }}>
            {light ? '☀️ Light' : '🌙 Dark'}
          </button>

          <span className="nav-tag">Beta</span>
          </div>
        </nav>

        <main>
          <div className="eyebrow">Qualitative AI for HR</div>

          <h1>Understand what<br />your team <em>really</em> feels</h1>

          <p className="tagline">
            Qualitative responses take significant time and expertise to analyze. Most surveys aren't truly anonymous — so employees hold back. And the tools that exist are built for enterprises, not small teams. Qualai changes that.
          </p>

          <a
          href="https://tally.so/r/0Qo910"
          target="_blank"
          rel="noopener noreferrer"
          className="waitlist-btn"
          >
            Join the waitlist
          </a>

          <div className="features">
            <div className="feature">
              <div className="feature-dot" />
              <div className="feature-text">
                <strong>Architectural anonymity</strong>
                The pipeline dissolves individual voices into collective patterns at every stage — not by policy, but by methodology.
              </div>
            </div>
            <div className="feature">
              <div className="feature-dot" />
              <div className="feature-text">
                <strong>Research-grade methodology</strong>
                A 3-stage coding pipeline modeled on academic HR/OB research standards. Every insight traces back to an original comment.
              </div>
            </div>
            <div className="feature">
              <div className="feature-dot" />
              <div className="feature-text">
                <strong>Qualitative analysis on the fly</strong>
                Paste responses, click analyze. Get a structured report with themes, sentiment, and executive recommendations in seconds.
              </div>
            </div>
          </div>

          <div style={{
            marginTop: '80px',
            width: '100%',
            maxWidth: '900px',
          }}>
            <div className="eyebrow" style={{justifyContent:'flex-start', marginBottom:'20px'}}>How it works</div>
            
            <div className="how-it-works-grid" style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'8px'}}>
              {[
                { num: '00', title: 'Question type detection', desc: 'Qualai reads your question and determines what kind of analysis is needed — sentiment, strategic, process, or exploratory.' },
                { num: '01', title: 'Qualitative coding', desc: 'Every response is coded into 3-5 keywords using only words from the original comment. No invented language, ever.' },
                { num: '02', title: 'Thematic categorization', desc: 'Codes are grouped into themes and classified by polarity. Every insight traces back to an original comment.' },
                { num: '03', title: 'Executive synthesis', desc: 'A leadership-ready summary built only from what the data produced. No hallucination. Exportable as PDF.' },
              ].map((step, i) => (
                <div key={i} style={{
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '16px',
                  background: 'var(--surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{fontSize:'11px', fontWeight:500, color:'var(--green)', fontFamily:'DM Mono, monospace'}}>{step.num}</div>
                  <div style={{fontSize:'12px', color:'var(--text)', fontWeight:400, lineHeight:'1.4'}}>{step.title}</div>
                  <div style={{fontSize:'11px', color:'var(--muted)', lineHeight:'1.6', fontWeight:300}}>{step.desc}</div>
                </div>
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
            <p style={{fontSize:'13px', color:'var(--muted)', lineHeight:'1.8', fontFamily:'DM Mono, monospace', fontWeight:300, marginBottom:'16px'}}>
              Most HR tools claim anonymity through a privacy policy. Qualai builds it into the methodology — by the time insights reach leadership, individual voices have been dissolved into collective patterns across three analysis stages.
            </p>
            <p style={{fontSize:'13px', color:'var(--muted)', lineHeight:'1.8', fontFamily:'DM Mono, monospace', fontWeight:300, marginBottom:'16px'}}>
              A single AI prompt can summarize feedback. But it can't guarantee repeatability, auditability, or protection against hallucination. Qualai's structured pipeline enforces the same rigorous process on every analysis — so results are comparable across time and defensible in a leadership meeting.
            </p>
            <p style={{fontSize:'13px', color:'var(--muted)', lineHeight:'1.8', fontFamily:'DM Mono, monospace', fontWeight:300}}>
              Built for teams of 5–50 who can't afford enterprise HR software but deserve enterprise-grade insight.
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
          
          <h2 style={{fontFamily:'DM Serif Display, serif', fontSize:'28px', color:'var(--text)', marginBottom:'16px', lineHeight:'1.3'}}>
            Interested in bringing this kind of thinking to your organization?
          </h2>
          
          <p style={{fontSize:'13px', color:'var(--muted)', lineHeight:'1.8', fontFamily:'DM Mono, monospace', fontWeight:300, marginBottom:'32px'}}>
            I'm a recent Employment Relations graduate from Queen's University actively looking for opportunities in HR analytics, people ops, and organizational development. I also take on consulting projects — if your HR team or consulting firm needs a custom qualitative analysis tool, a people analytics solution, or just someone who thinks deeply about the intersection of HR and AI, let's talk.
          </p>

          <div style={{display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap'}}>
            <a href="https://linkedin.com/in/sebasroavi" target="_blank" rel="noopener noreferrer" style={{
              display:'inline-flex', alignItems:'center', gap:'6px',
              background:'var(--green)', color:'#0e0f0d',
              padding:'12px 24px', borderRadius:'8px',
              fontSize:'12px', fontFamily:'DM Mono, monospace',
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
              fontSize:'12px', fontFamily:'DM Mono, monospace',
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
