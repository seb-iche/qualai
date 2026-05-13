'use client'

import { useState } from 'react'

export default function SettingsPage() {
  const [mode, setMode] = useState<'byok' | 'demo' | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const handleBYOK = async () => {
    if (!apiKey.startsWith('sk-ant-')) {
      setStatus('Invalid API key — Anthropic keys start with sk-ant-')
      return
    }
    setLoading(true)
    const sessionId = localStorage.getItem('qualai_session') || crypto.randomUUID()
    localStorage.setItem('qualai_session', sessionId)
    localStorage.setItem('qualai_api_key', apiKey)
    setStatus('Your API key has been saved. You can now run analyses using your own key.')
    setLoading(false)
  }

  const handleDemo = async () => {
    setLoading(true)
    const res = await fetch('/api/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })
    const data = await res.json()
    if (data.valid) {
      localStorage.setItem('qualai_demo_access', 'true')
      setStatus('Demo access granted. You can now run analyses using the Qualai demo key.')
    } else {
      setStatus('Incorrect password. Please check with the person who shared this with you.')
    }
    setLoading(false)
  }

  const handleClear = () => {
    localStorage.removeItem('qualai_api_key')
    localStorage.removeItem('qualai_demo_access')
    localStorage.removeItem('qualai_session')
    setStatus('Access cleared. Add a new key or password to continue.')
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0e0f0d; --surface: #161710; --green: #7db87a; --green-dim: #4a7a47;
          --text: #e8e6df; --muted: #7a7870; --border: rgba(125,184,122,0.15); --red: #e07070;
        }
        html, body { background: var(--bg); color: var(--text); }
        .page { min-height: 100vh; font-family: 'DM Mono', monospace; padding: 48px 24px; max-width: 600px; margin: 0 auto; }
        .topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 48px; }
        .logo { display: flex; align-items: center; gap: 8px; font-family: 'DM Serif Display', serif; font-size: 20px; color: var(--text); text-decoration: none; }
        .nav-links { display: flex; gap: 24px; }
        .nav-link { font-size: 12px; color: var(--muted); text-decoration: none; letter-spacing: 0.04em; transition: color 0.15s; }
        .nav-link:hover { color: var(--text); }
        .nav-link.active { color: var(--green); }
        h1 { font-family: 'DM Serif Display', serif; font-size: 32px; color: var(--text); margin-bottom: 8px; }
        .subtitle { font-size: 13px; color: var(--muted); margin-bottom: 40px; line-height: 1.6; font-weight: 300; }
        .mode-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 32px; }
        .mode-card { border: 1px solid var(--border); border-radius: 8px; padding: 20px; cursor: pointer; transition: all 0.15s; background: var(--surface); }
        .mode-card:hover { border-color: var(--green-dim); }
        .mode-card.active { border-color: var(--green); background: rgba(125,184,122,0.05); }
        .mode-title { font-size: 13px; font-weight: 500; color: var(--text); margin-bottom: 4px; }
        .mode-desc { font-size: 11px; color: var(--muted); line-height: 1.6; font-weight: 300; }
        .field { margin-bottom: 20px; }
        label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--green); margin-bottom: 8px; }
        input { width: 100%; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; font-family: 'DM Mono', monospace; font-size: 13px; color: var(--text); outline: none; transition: border-color 0.2s; font-weight: 300; }
        input:focus { border-color: var(--green-dim); }
        .btn { width: 100%; background: var(--green); color: #0e0f0d; border: none; padding: 14px; font-family: 'DM Mono', monospace; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; border-radius: 8px; cursor: pointer; transition: background 0.2s; margin-bottom: 12px; }
        .btn:hover { background: #8ec98b; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-outline { width: 100%; background: transparent; color: var(--muted); border: 1px solid var(--border); padding: 12px; font-family: 'DM Mono', monospace; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
        .btn-outline:hover { border-color: var(--red); color: var(--red); }
        .status { font-size: 12px; line-height: 1.6; padding: 12px 16px; border-radius: 8px; margin-top: 16px; background: rgba(125,184,122,0.08); border: 1px solid rgba(125,184,122,0.2); color: var(--text); font-weight: 300; }
        .status.error { background: rgba(224,112,112,0.08); border-color: rgba(224,112,112,0.2); color: var(--red); }
        .divider { border: none; border-top: 1px solid var(--border); margin: 32px 0; }
      `}</style>

      <div className="page">
        <div className="topbar">
          <a href="/" className="logo">
            <img src="/koala-logo.svg" alt="Qualai" width={36} height={36} style={{display:'block', marginTop:'4px'}} />
            Qualai
          </a>
          <div className="nav-links">
            <a href="/analyze" className="nav-link">New analysis</a>
            <a href="/dashboard" className="nav-link">Dashboard</a>
            <a href="/settings" className="nav-link active">Settings</a>
          </div>
        </div>

        <h1>Access settings</h1>
        <p className="subtitle">
          Choose how you want to run analyses. You can use your own Anthropic API key or enter a demo password if someone shared one with you.
        </p>

        <div className="mode-cards">
          <div className={`mode-card ${mode === 'byok' ? 'active' : ''}`} onClick={() => setMode('byok')}>
            <div className="mode-title">Use my own key</div>
            <div className="mode-desc">Connect your Anthropic API key. You control your usage and costs directly.</div>
          </div>
          <div className={`mode-card ${mode === 'demo' ? 'active' : ''}`} onClick={() => setMode('demo')}>
            <div className="mode-title">Demo access</div>
            <div className="mode-desc">Enter a password shared with you to run analyses using the Qualai demo key.</div>
          </div>
        </div>

        {mode === 'byok' && (
          <>
            <div className="field">
              <label>Anthropic API key</label>
              <input
                type="password"
                placeholder="sk-ant-..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
              />
            </div>
            <button className="btn" onClick={handleBYOK} disabled={loading}>
              {loading ? 'Saving...' : 'Save API key'}
            </button>
          </>
        )}

        {mode === 'demo' && (
          <>
            <div className="field">
              <label>Demo password</label>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button className="btn" onClick={handleDemo} disabled={loading}>
              {loading ? 'Verifying...' : 'Unlock demo access'}
            </button>
          </>
        )}

        {status && (
          <div className={`status ${status.includes('Incorrect') || status.includes('Invalid') ? 'error' : ''}`}>
            {status}
          </div>
        )}

        <hr className="divider" />
        <button className="btn-outline" onClick={handleClear}>Clear saved access</button>
      </div>
    </>
  )
}