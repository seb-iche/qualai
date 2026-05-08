export default function Home() {
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
          <a href="/analyze" style={{fontSize:'12px', color:'var(--green)', textDecoration:'none', letterSpacing:'0.04em'}}>Try it free</a>
          <a href="/dashboard" style={{fontSize:'12px', color:'var(--muted)', textDecoration:'none', letterSpacing:'0.04em'}}>Dashboard</a>
          <span className="nav-tag">Beta</span>
          </div>
        </nav>

        <main>
          <div className="eyebrow">Qualitative AI for HR</div>

          <h1>Understand what your<br />team <em>really</em> feels</h1>

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
                <strong>Truly anonymous</strong>
                No logins, no tracking. Responses are never linked to identities.
              </div>
            </div>
            <div className="feature">
              <div className="feature-dot" />
              <div className="feature-text">
                <strong>Research-grade analysis</strong>
                3-stage qualitative coding pipeline built on academic HR standards.
              </div>
            </div>
            <div className="feature">
              <div className="feature-dot" />
              <div className="feature-text">
                <strong>Action-first insights</strong>
                Not just dashboards — specific recommendations your team can act on.
              </div>
            </div>
          </div>
        </main>

        <footer>
          <span>© 2025 Qualai</span>
          <span>Built for teams of 5–50</span>
        </footer>
      </div>
    </>
  );
}
