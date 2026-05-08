'use client'

import { useState } from 'react'

export default function AnalyzePage() {
  const [question, setQuestion] = useState('')
  const [responses, setResponses] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAnalyze = async () => {
    setLoading(true)
    setError('')
    setResult(null)

    const responseList = responses
      .split('\n')
      .map(r => r.trim())
      .filter(r => r.length > 0)

    if (!question || responseList.length === 0) {
      setError('Please enter a question and at least one response.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, responses: responseList })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
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
        html, body { background: var(--bg); color: var(--text); }
        .page {
          min-height: 100vh;
          font-family: 'DM Mono', monospace;
          padding: 48px 24px;
          max-width: 800px;
          margin: 0 auto;
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'DM Serif Display', serif;
          font-size: 20px;
          color: var(--text);
          margin-bottom: 48px;
          text-decoration: none;
        }
        h1 {
          font-family: 'DM Serif Display', serif;
          font-size: 32px;
          color: var(--text);
          margin-bottom: 8px;
        }
        .subtitle {
          font-size: 13px;
          color: var(--muted);
          margin-bottom: 40px;
          line-height: 1.6;
        }
        .field { margin-bottom: 24px; }
        label {
          display: block;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--green);
          margin-bottom: 8px;
        }
        input, textarea {
          width: 100%;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 14px 16px;
          font-family: 'DM Mono', monospace;
          font-size: 13px;
          color: var(--text);
          outline: none;
          transition: border-color 0.2s;
          font-weight: 300;
        }
        input:focus, textarea:focus { border-color: var(--green-dim); }
        textarea { resize: vertical; min-height: 200px; line-height: 1.6; }
        .hint {
          font-size: 11px;
          color: var(--muted);
          margin-top: 6px;
        }
        .analyze-btn {
          background: var(--green);
          color: #0e0f0d;
          border: none;
          padding: 14px 32px;
          font-family: 'DM Mono', monospace;
          font-size: 13px;
          font-weight: 400;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
          width: 100%;
        }
        .analyze-btn:hover { background: #8ec98b; }
        .analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .error {
          color: #e07070;
          font-size: 13px;
          margin-top: 16px;
        }
        .results { margin-top: 48px; }
        .result-section {
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 24px;
          margin-bottom: 24px;
          background: var(--surface);
        }
        .result-title {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--green);
          margin-bottom: 16px;
        }
        .result-content {
          font-size: 13px;
          color: var(--text);
          line-height: 1.8;
          white-space: pre-wrap;
          font-weight: 300;
        }
        .loading {
          text-align: center;
          padding: 48px;
          color: var(--muted);
          font-size: 13px;
        }
        .loading-dot {
          display: inline-block;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      <div className="page">
        <a href="/" className="logo">
            <img src="/koala-logo.svg" alt="Qualai" width={60} height={60} style={{display:'block', marginTop:'8px'}} />
          Qualai
        </a>

        <h1>Analyze responses</h1>
        <p className="subtitle">
          Paste your survey question and employee responses below.<br />
          Qualai will code, categorize, and synthesize the data using a research-grade qualitative methodology.
        </p>

        <div className="field">
          <label>Survey question</label>
          <input
            type="text"
            placeholder="e.g. What would make the biggest difference to your experience at work?"
            value={question}
            onChange={e => setQuestion(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Employee responses</label>
          <textarea
            placeholder={"Paste one response per line:\n\nI feel like my work isn't recognized by management.\nThe team culture is great but workload is unsustainable.\nMore clarity on career growth would help a lot."}
            value={responses}
            onChange={e => setResponses(e.target.value)}
          />
          <p className="hint">One response per line. Minimum 3 responses recommended.</p>
        </div>

        <button
          className="analyze-btn"
          onClick={handleAnalyze}
          disabled={loading}
        >
          {loading ? 'Analyzing...' : 'Run analysis'}
        </button>

        {error && <p className="error">{error}</p>}

        {loading && (
          <div className="loading">
            <span className="loading-dot">Running your 3-stage qualitative analysis pipeline...</span>
          </div>
        )}

        {result && (
          <div className="results">
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'rgba(125, 184, 122, 0.08)',
                border: '1px solid rgba(125, 184, 122, 0.2)',
                borderRadius: '8px',
                marginBottom: '24px',
                fontSize: '12px',
                color: 'var(--muted)'
                }}>
                <span>Responses analyzed: <strong style={{color: 'var(--text)'}}>{result.responseCount}</strong></span>
                <span>Est. API cost: <strong style={{color: 'var(--green)'}}>${result.costEstimate}</strong> <span style={{opacity: 0.6}}>(approx.)</span></span>
                </div>
            <div className="result-section">
              <div className="result-title">Stage 1 — Qualitative codes</div>
              <div className="result-content">{result.codes}</div>
            </div>
            <div className="result-section">
              <div className="result-title">Stage 2 — Themes & sentiment</div>
              <div className="result-content">{result.categories}</div>
            </div>
            <div className="result-section">
              <div className="result-title">Stage 3 — Executive summary</div>
              <div className="result-content">{result.executiveSummary}</div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}