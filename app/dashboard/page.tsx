'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { parseThemes, getSentimentCounts, isFlaggedTheme, parseSynthesis } from '@/lib/themes'
import type { Theme, Synthesis } from '@/lib/themes'

interface Analysis {
  id: string
  question: string
  response_count: number
  codes: string
  executive_summary: string
  categories: string
  cost_estimate: string
  question_type: string
  created_at: string
}

const GREEN = '#7db87a'
const RED = '#e07070'
const AMBER = '#e0b870'
const MUTED = '#7a7870'

// Segmented positive / negative / neutral mini-bar. Single component reused by
// the Theme Map and every category card so the split always reads the same way.
function SentimentBar({ positive, negative, neutral, showText = false }: {
  positive: number; negative: number; neutral: number; showText?: boolean
}) {
  const total = positive + negative + neutral
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0)
  return (
    <div>
      <div className="sbar">
        {positive > 0 && <div style={{ width: `${pct(positive)}%`, background: GREEN }} title={`${positive} positive`} />}
        {negative > 0 && <div style={{ width: `${pct(negative)}%`, background: RED }} title={`${negative} negative`} />}
        {neutral > 0 && <div style={{ width: `${pct(neutral)}%`, background: AMBER }} title={`${neutral} neutral`} />}
      </div>
      {showText && (
        <div className="sbar-legend">
          {positive > 0 && <span style={{ color: GREEN }}>{positive} positive</span>}
          {negative > 0 && <span style={{ color: RED }}>{negative} negative</span>}
          {neutral > 0 && <span style={{ color: AMBER }}>{neutral} neutral</span>}
        </div>
      )}
    </div>
  )
}

// Designed executive report — Critical Findings first, then Top Priorities,
// then per-category cards (reusing SentimentBar), then a collapsed evidence
// appendix that quotes the real original comments.
function ReportView({ synthesis, categoriesRaw, codesRaw }: {
  synthesis: Synthesis; categoriesRaw: string; codesRaw: string
}) {
  return (
    <>
      <div className="report-section report-critical">
        <div className="result-title">Critical findings</div>
        <h3 className="report-headline">{synthesis.criticalFindings.headline}</h3>
        {synthesis.criticalFindings.summary && (
          <p className="report-body">{synthesis.criticalFindings.summary}</p>
        )}
      </div>

      {synthesis.topPriorities.length > 0 && (
        <div className="report-section">
          <div className="result-title">Top priorities</div>
          <div className="priority-list">
            {synthesis.topPriorities.map((p, i) => (
              <div key={i} className="priority-item">
                <span className={`urgency-dot urgency-${p.urgency}`} />
                <div className="priority-text">
                  <div className="priority-main">{p.priority}</div>
                  {p.relatedCategory && <div className="priority-cat">{p.relatedCategory}</div>}
                </div>
                <span className={`urgency-badge urgency-${p.urgency}`}>{p.urgency}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {synthesis.categories.length > 0 && (
        <>
          <div className="result-title" style={{ margin: '4px 0 4px' }}>Category breakdown</div>
          {synthesis.categories.map((c, i) => (
            <div key={i} className="report-section category-card">
              <div className="category-name">{c.name}</div>
              <SentimentBar positive={c.sentiment.positive} negative={c.sentiment.negative} neutral={c.sentiment.neutral} showText />
              {c.narrative && <p className="report-body" style={{ marginTop: '12px' }}>{c.narrative}</p>}
              {c.strategicPriority && (
                <div className="priority-callout">
                  <div className="priority-callout-label">Strategic priority</div>
                  <div className="priority-callout-text">{c.strategicPriority}</div>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      <details className="evidence-appendix">
        <summary className="evidence-summary">Themes &amp; sentiment — evidence appendix</summary>
        <div className="evidence-body">
          {synthesis.categories.map((c, i) => (
            c.evidence.length > 0 ? (
              <div key={i} className="evidence-group">
                <div className="evidence-cat">{c.name}</div>
                {c.evidence.map((e, j) => (
                  <blockquote key={j} className="evidence-quote">
                    <span className="evidence-text">“{e.originalComment}”</span>
                    {e.tag && <span className="evidence-tag">{e.tag}</span>}
                  </blockquote>
                ))}
              </div>
            ) : null
          ))}
          <div className="evidence-group">
            <div className="evidence-cat">Full categorization</div>
            <div className="result-content">{categoriesRaw}</div>
          </div>
          <div className="evidence-group">
            <div className="evidence-cat">Qualitative codes</div>
            <div className="result-content">{codesRaw}</div>
          </div>
        </div>
      </details>
    </>
  )
}

export default function DashboardPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [selected, setSelected] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalyses = async () => {
      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data) setAnalyses(data)
      setLoading(false)
    }
    fetchAnalyses()
  }, [])

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  const exportPDF = async (analysis: Analysis) => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()

    const green = [125, 184, 122] as [number, number, number]
    const dark = [26, 26, 26] as [number, number, number]
    const muted = [120, 120, 112] as [number, number, number]
    const red = [200, 80, 80] as [number, number, number]
    const amber = [180, 140, 60] as [number, number, number]
    const BOTTOM = 278

    let y = 20

    // Wrapped, page-breaking text run.
    const run = (
      text: string,
      opts: { size?: number; style?: 'normal' | 'bold' | 'italic'; color?: [number, number, number]; indent?: number; gap?: number; width?: number } = {}
    ) => {
      if (!text) return
      const { size = 10, style = 'normal', color = dark, indent = 20, gap = 5.5, width = 170 } = opts
      doc.setFontSize(size)
      doc.setFont('helvetica', style)
      doc.setTextColor(...color)
      const lines = doc.splitTextToSize(text, width) as string[]
      lines.forEach(line => {
        if (y > BOTTOM) { doc.addPage(); y = 20 }
        doc.text(line, indent, y)
        y += gap
      })
    }
    const heading = (text: string) => {
      y += 6
      if (y > BOTTOM - 8) { doc.addPage(); y = 20 }
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...green)
      doc.text(text, 20, y)
      y += 7
    }
    const divider = () => { doc.setDrawColor(...green); doc.setLineWidth(0.3); doc.line(20, y, 190, y); y += 8 }

    // Header
    doc.setFontSize(22); doc.setTextColor(...green); doc.setFont('helvetica', 'bold')
    doc.text('QUALAI', 20, y); y += 8
    run('Qualitative Analysis Report', { color: muted })
    run(formatDate(analysis.created_at), { color: muted })
    y += 2; divider()

    // Question + stats
    heading('Survey Question')
    run(analysis.question, { size: 11 })
    y += 2
    const { pos, neg, neu } = getSentimentCounts(analysis.categories, analysis.question_type)
    const total = pos + neg + neu
    const ratio = total > 0 ? Math.round((pos / total) * 100) : 0
    run(`Responses analyzed: ${analysis.response_count}`, { color: muted })
    run(`Positive: ${pos}   |   Negative: ${neg}   |   Neutral: ${neu}   |   Positive ratio: ${ratio}%`, { color: muted })
    y += 2; divider()

    const synthesis = parseSynthesis(analysis.executive_summary)

    if (synthesis) {
      // Critical Findings — FIRST, so leadership gets the conclusion up top.
      heading('Critical Findings')
      run(synthesis.criticalFindings.headline, { size: 12, style: 'bold' })
      y += 1
      run(synthesis.criticalFindings.summary)

      if (synthesis.topPriorities.length > 0) {
        heading('Top Priorities')
        synthesis.topPriorities.forEach((p, i) => {
          const uColor = p.urgency === 'high' ? red : p.urgency === 'medium' ? amber : green
          run(`${i + 1}. [${p.urgency.toUpperCase()}] ${p.priority}`, { style: 'bold', color: uColor })
          if (p.relatedCategory) run(`Related theme: ${p.relatedCategory}`, { size: 9, color: muted, indent: 26 })
          y += 1
        })
      }

      heading('Category Breakdown')
      synthesis.categories.forEach(c => {
        const s = c.sentiment
        run(c.name, { size: 11, style: 'bold' })
        run(`${s.positive} positive  |  ${s.negative} negative  |  ${s.neutral} neutral`, { size: 9, color: muted })
        if (c.narrative) run(c.narrative)
        if (c.strategicPriority) run(`Strategic priority: ${c.strategicPriority}`, { style: 'italic', color: green })
        y += 3
      })

      // Evidence appendix — real original comments, so every insight is traceable.
      heading('Evidence & Sourcing')
      synthesis.categories.forEach(c => {
        if (!c.evidence.length) return
        run(c.name, { size: 10, style: 'bold' })
        c.evidence.forEach(e => {
          run(`"${e.originalComment}"${e.tag ? '  — ' + e.tag : ''}`, { size: 9, style: 'italic', color: muted, indent: 24, width: 166 })
        })
        y += 2
      })
    } else {
      // Legacy analyses stored markdown — strip syntax and render as before.
      const cleanText = (text: string) => text
        .replace(/#{1,3}\s/g, '').replace(/\*\*/g, '').replace(/\*/g, '')
        .replace(/→/g, '->').replace(/---/g, '').replace(/^\s*[-•]\s/gm, '• ').trim()
      heading('Executive Summary')
      run(cleanText(analysis.executive_summary || ''))
      heading('Themes & Sentiment')
      run(cleanText(analysis.categories || ''))
    }

    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(...muted)
      doc.setFont('helvetica', 'normal')
      doc.text('Generated by Qualai — qualai.xyz', 20, 290)
      doc.text(`Page ${i} of ${pageCount}`, 170, 290)
    }

    doc.save(`qualai-report-${new Date().toISOString().split('T')[0]}.pdf`)
  }


  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0e0f0d; --surface: #161710; --green: #7db87a; --green-dim: #4a7a47;
          --text: #e8e6df; --muted: #7a7870; --border: rgba(125,184,122,0.15);
          --red: #e07070; --amber: #e0b870;
        }
        html, body { background: var(--bg); color: var(--text); }
        .page { min-height: 100vh; font-family: var(--font-sans), sans-serif; display: grid; grid-template-columns: 300px 1fr; grid-template-rows: auto 1fr; }
        .topbar { grid-column: 1/-1; display: flex; align-items: center; justify-content: space-between; padding: 20px 32px; border-bottom: 1px solid var(--border); }
        .logo { display: flex; align-items: center; gap: 8px; font-family: var(--font-wordmark), serif; font-size: 20px; color: var(--text); text-decoration: none; }
        .nav-links { display: flex; gap: 24px; }
        .nav-link { font-size: 12px; color: var(--muted); text-decoration: none; letter-spacing: 0.04em; transition: color 0.15s; }
        .nav-link:hover { color: var(--text); }
        .nav-link.active { color: var(--green); }
        .sidebar { border-right: 1px solid var(--border); overflow-y: auto; padding: 24px 0; }
        .sidebar-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); padding: 0 20px 12px; }
        .analysis-item { padding: 14px 20px; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.15s; }
        .analysis-item:hover { background: rgba(125,184,122,0.05); }
        .analysis-item.active { background: rgba(125,184,122,0.08); border-left: 2px solid var(--green); }
        .item-question { font-family: var(--font-mono), monospace; font-size: 12px; color: var(--text); margin-bottom: 6px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .item-meta { display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: var(--muted); }
        .sentiment-pills { display: flex; gap: 4px; }
        .pill { font-family: var(--font-mono), monospace; font-size: 10px; padding: 2px 6px; border-radius: 99px; font-weight: 500; }
        .pill-green { background: rgba(125,184,122,0.15); color: var(--green); }
        .pill-red { background: rgba(224,112,112,0.15); color: var(--red); }
        .pill-amber { background: rgba(224,184,112,0.15); color: var(--amber); }
        .main { overflow-y: auto; padding: 32px; }
        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--muted); text-align: center; gap: 12px; }
        .detail-question { font-family: var(--font-sans), sans-serif; font-weight: 700; letter-spacing: -0.02em; font-size: 24px; color: var(--text); margin-bottom: 8px; line-height: 1.3; }
        .detail-meta { display: flex; gap: 16px; font-size: 12px; color: var(--muted); margin-bottom: 28px; }
        .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 16px; text-align: center; }
        .stat-num { font-family: var(--font-mono), monospace; font-size: 28px; font-weight: 500; margin-bottom: 4px; }
        .stat-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
        .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        .chart-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px; }
        .chart-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--green); margin-bottom: 16px; }
        .bubble-map { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px; margin-bottom: 24px; }
        .bubbles { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 8px 0; }
        .bubble { font-family: var(--font-mono), monospace; border-radius: 99px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 400; text-align: center; padding: 8px 16px; transition: transform 0.15s; cursor: default; line-height: 1.3; }
        .bubble:hover { transform: scale(1.05); }
        .result-section { border: 1px solid var(--border); border-radius: 8px; padding: 20px; margin-bottom: 16px; background: var(--surface); }
        .result-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--green); margin-bottom: 12px; }
        .result-content { font-family: var(--font-mono), monospace; font-size: 13px; color: var(--text); line-height: 1.8; white-space: pre-wrap; font-weight: 400; }
        .new-btn { display: inline-flex; align-items: center; gap: 6px; background: var(--green); color: #0e0f0d; border: none; padding: 10px 20px; font-family: var(--font-sans), sans-serif; font-weight: 600; font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase; border-radius: 6px; cursor: pointer; text-decoration: none; transition: background 0.2s; margin-top: 16px; }
        .new-btn:hover { background: #8ec98b; }
        .custom-tooltip { background: #1e2018; border: 1px solid rgba(125,184,122,0.2); border-radius: 6px; padding: 8px 12px; font-size: 11px; color: var(--text); font-family: var(--font-mono), monospace; }

        /* Segmented sentiment mini-bar (shared: Theme Map + report cards) */
        .sbar { display: flex; height: 8px; border-radius: 99px; overflow: hidden; background: var(--border); }
        .sbar-legend { display: flex; gap: 12px; margin-top: 6px; font-family: var(--font-mono), monospace; font-size: 11px; }

        /* Theme Map — neutral tiles with a sentiment mini-bar (no dominant color) */
        .theme-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
        .theme-tile { border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; background: rgba(125,184,122,0.03); }
        .theme-tile-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
        .theme-tile-name { font-family: var(--font-sans), sans-serif; font-weight: 600; font-size: 13px; color: var(--text); line-height: 1.3; }
        .theme-tile-count { font-family: var(--font-mono), monospace; font-size: 12px; color: var(--muted); flex-shrink: 0; }
        .flagged-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; padding-top: 14px; border-top: 1px dashed var(--border); }
        .flagged-tile { display: inline-flex; align-items: center; gap: 8px; border: 1px dashed var(--amber); border-radius: 8px; padding: 8px 14px; background: rgba(224,184,112,0.06); }
        .flagged-icon { color: var(--amber); font-size: 13px; }
        .flagged-name { font-family: var(--font-sans), sans-serif; font-weight: 600; font-size: 12px; color: var(--amber); }
        .flagged-count { font-family: var(--font-mono), monospace; font-size: 12px; color: var(--muted); }

        /* Designed executive report */
        .report-section { border: 1px solid var(--border); border-radius: 8px; padding: 20px; margin-bottom: 16px; background: var(--surface); }
        .report-critical { border-color: var(--green-dim); background: rgba(125,184,122,0.05); }
        .report-headline { font-family: var(--font-sans), sans-serif; font-weight: 700; letter-spacing: -0.01em; font-size: 20px; color: var(--text); line-height: 1.3; margin-bottom: 10px; }
        .report-body { font-family: var(--font-mono), monospace; font-size: 13px; color: var(--text); line-height: 1.8; font-weight: 400; }
        .priority-list { display: flex; flex-direction: column; gap: 10px; }
        .priority-item { display: flex; align-items: center; gap: 12px; border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px; }
        .priority-text { flex: 1; }
        .priority-main { font-family: var(--font-sans), sans-serif; font-weight: 500; font-size: 13px; color: var(--text); line-height: 1.4; }
        .priority-cat { font-family: var(--font-mono), monospace; font-size: 11px; color: var(--muted); margin-top: 3px; }
        .urgency-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .urgency-badge { font-family: var(--font-sans), sans-serif; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; padding: 3px 8px; border-radius: 99px; flex-shrink: 0; }
        .urgency-high { }
        .urgency-dot.urgency-high { background: var(--red); }
        .urgency-badge.urgency-high { color: var(--red); background: rgba(224,112,112,0.14); }
        .urgency-dot.urgency-medium { background: var(--amber); }
        .urgency-badge.urgency-medium { color: var(--amber); background: rgba(224,184,112,0.14); }
        .urgency-dot.urgency-low { background: var(--green); }
        .urgency-badge.urgency-low { color: var(--green); background: rgba(125,184,122,0.14); }
        .category-card .category-name { font-family: var(--font-sans), sans-serif; font-weight: 600; font-size: 14px; color: var(--text); margin-bottom: 12px; }
        .priority-callout { margin-top: 14px; border-left: 2px solid var(--green); background: rgba(125,184,122,0.06); border-radius: 0 8px 8px 0; padding: 10px 14px; }
        .priority-callout-label { font-family: var(--font-sans), sans-serif; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--green); margin-bottom: 4px; }
        .priority-callout-text { font-family: var(--font-mono), monospace; font-size: 12.5px; color: var(--text); line-height: 1.6; }
        .evidence-appendix { border: 1px solid var(--border); border-radius: 8px; background: var(--surface); margin-bottom: 16px; }
        .evidence-summary { font-family: var(--font-sans), sans-serif; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--green); padding: 16px 20px; cursor: pointer; list-style: none; }
        .evidence-summary::-webkit-details-marker { display: none; }
        .evidence-summary::before { content: '▸ '; color: var(--muted); }
        details[open] .evidence-summary::before { content: '▾ '; }
        .evidence-body { padding: 0 20px 20px; display: flex; flex-direction: column; gap: 18px; }
        .evidence-group { display: flex; flex-direction: column; gap: 8px; }
        .evidence-cat { font-family: var(--font-sans), sans-serif; font-weight: 600; font-size: 12px; color: var(--text); }
        .evidence-quote { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; border-left: 2px solid var(--green-dim); padding: 8px 12px; margin: 0; background: rgba(125,184,122,0.04); border-radius: 0 6px 6px 0; }
        .evidence-text { font-family: var(--font-mono), monospace; font-size: 12px; color: var(--text); line-height: 1.6; font-style: italic; }
        .evidence-tag { font-family: var(--font-mono), monospace; font-size: 10px; color: var(--muted); white-space: nowrap; flex-shrink: 0; padding-top: 2px; }

        @media (max-width: 768px) {
        .page { grid-template-columns: 1fr; grid-template-rows: auto auto 1fr; }
        .topbar { padding: 16px 20px; }
        .nav-links { gap: 12px; }
        .nav-link { font-size: 11px; }
        .sidebar { border-right: none; border-bottom: 1px solid var(--border); max-height: 200px; }
        .main { padding: 20px 16px; }
        .stats-row { grid-template-columns: repeat(2, 1fr); }
        .charts-row { grid-template-columns: 1fr; }
        .detail-question { font-size: 18px; }
        .detail-meta { flex-wrap: wrap; gap: 8px; }
        }
      `}</style>

      <div className="page">
        <div className="topbar">
          <a href="/" className="logo">
            <img src="/koala-logo.svg" alt="Qualai" width={60} height={60} style={{display:'block', marginTop:'8px'}} />
            Qualai
          </a>
          <div className="nav-links">
            <a href="/analyze" className="nav-link">New analysis</a>
            <a href="/dashboard" className="nav-link active">Dashboard</a>
            <a href="/settings" className="nav-link">Settings</a>
          </div>
        </div>

        <div className="sidebar">
          <div className="sidebar-title">Past analyses</div>
          {loading && <div style={{padding:'20px',fontSize:'12px',color:'var(--muted)'}}>Loading...</div>}
          {!loading && analyses.length === 0 && (
            <div style={{padding:'20px',fontSize:'12px',color:'var(--muted)',lineHeight:1.6}}>No analyses yet.</div>
          )}
          {analyses.map(a => {
            const { pos, neg, neu } = getSentimentCounts(a.categories, a.question_type)
            return (
              <div key={a.id} className={`analysis-item ${selected?.id === a.id ? 'active' : ''}`} onClick={() => setSelected(a)}>
                <div className="item-question">{a.question}</div>
                <div className="item-meta">
                  <span>{formatDate(a.created_at)}</span>
                  <div className="sentiment-pills">
                    <span className="pill pill-green">{pos}+</span>
                    <span className="pill pill-red">{neg}-</span>
                    <span className="pill pill-amber">{neu}~</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="main">
          {!selected && (
            <div className="empty-state">
              <div style={{fontSize:'32px',opacity:0.4}}>📊</div>
              <div style={{fontSize:'13px',lineHeight:1.6}}>Select an analysis from the sidebar to view results.</div>
              <a href="/analyze" className="new-btn">Run new analysis</a>
            </div>
          )}

          {selected && (() => {
            const themes = parseThemes(selected.categories)
            const { pos, neg, neu } = getSentimentCounts(selected.categories, selected.question_type)
            const total = pos + neg + neu
            const dominantTheme = themes[0]?.name || 'N/A'
            const sentimentRatio = total > 0 ? Math.round((pos / total) * 100) : 0
            const avgCodes = selected.response_count > 0 ? (total / selected.response_count).toFixed(1) : '0'

            const pieData = [
              { name: 'Positive', value: pos },
              { name: 'Negative', value: neg },
              { name: 'Neutral', value: neu }
            ].filter(d => d.value > 0)

            const barData = themes.map(t => ({
              name: t.name.length > 20 ? t.name.substring(0, 20) + '...' : t.name,
              fullName: t.name,
              Positive: t.positive,
              Negative: t.negative,
              Neutral: t.neutral
            }))

            // Theme Map reuses the SAME `themes` the Theme Frequency chart uses.
            // Flagged-for-Review is a triage bucket, not a sentiment theme —
            // pull it out so it isn't shown as a coloured sentiment tile.
            const sentimentThemes = themes.filter(t => !isFlaggedTheme(t.name))
            const flaggedThemes = themes.filter(t => isFlaggedTheme(t.name))

            // Structured synthesis when available; null => legacy markdown blob.
            const synthesis = parseSynthesis(selected.executive_summary)

            return (
              <>
                <div className="detail-question">{selected.question}</div>
                <div className="detail-meta">
            <span>📅 {formatDate(selected.created_at)}</span>
            <span>💬 {selected.response_count} responses</span>
            <span>💰 Est. ${selected.cost_estimate}</span>
            <button onClick={() => exportPDF(selected)} style={{
                marginLeft: 'auto',
                background: 'transparent',
                border: '1px solid var(--green-dim)',
                color: 'var(--green)',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '11px',
                fontFamily: 'var(--font-sans), sans-serif',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.15s'
            }}>
                Export PDF
            </button>
            </div>

                <div className="stats-row">
                    <div className="stat-card">
                        <div className="stat-num" style={{color:'var(--green)'}}>{pos}</div>
                        <div className="stat-label">
                        {selected.question_type === 'strategic' ? 'Opportunity signals' :
                        selected.question_type === 'process' ? 'Working well' :
                        selected.question_type === 'exploration' ? 'Positive themes' :
                        'Positive codes'}
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-num" style={{color:'var(--red)'}}>{neg}</div>
                        <div className="stat-label">
                        {selected.question_type === 'strategic' ? 'Pain points' :
                        selected.question_type === 'process' ? 'Needs improvement' :
                        selected.question_type === 'exploration' ? 'Negative themes' :
                        'Negative codes'}
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-num" style={{color:'var(--amber)'}}>{neu}</div>
                        <div className="stat-label">
                        {selected.question_type === 'strategic' ? 'Considerations' :
                        selected.question_type === 'process' ? 'Unclear signals' :
                        selected.question_type === 'exploration' ? 'Neutral themes' :
                        'Neutral codes'}
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-num" style={{color:'var(--text)'}}>{sentimentRatio}%</div>
                        <div className="stat-label">
                        {selected.question_type === 'strategic' ? 'Opportunity ratio' :
                        selected.question_type === 'process' ? 'Satisfaction rate' :
                        selected.question_type === 'exploration' ? 'Positive ratio' :
                        'Positive ratio'}
                        </div>
                    </div>
                    </div>

                <div className="stats-row" style={{gridTemplateColumns:'1fr 1fr', marginBottom:'24px'}}>
                  <div className="stat-card" style={{textAlign:'left', padding:'16px 20px'}}>
                    <div className="stat-label" style={{marginBottom:'6px'}}>Top theme</div>
                    <div style={{fontSize:'14px', color:'var(--text)', fontWeight:400, lineHeight:1.4}}>{dominantTheme}</div>
                  </div>
                  <div className="stat-card" style={{textAlign:'left', padding:'16px 20px'}}>
                    <div className="stat-label" style={{marginBottom:'6px'}}>Avg codes / response</div>
                    <div style={{fontSize:'24px', color:'var(--text)', fontWeight:400}}>{avgCodes}</div>
                  </div>
                </div>

                <div className="charts-row">
                  <div className="chart-card">
                    <div className="chart-title">Sentiment breakdown</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.name === 'Positive' ? GREEN : entry.name === 'Negative' ? RED : AMBER} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{background:'#1e2018',border:'1px solid rgba(125,184,122,0.2)',borderRadius:'6px',fontFamily:'var(--font-mono), monospace',fontSize:'11px'}} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{display:'flex',gap:'16px',justifyContent:'center',fontSize:'11px',color:'var(--muted)',marginTop:'8px'}}>
                      <span style={{color:GREEN}}>● Positive</span>
                      <span style={{color:RED}}>● Negative</span>
                      <span style={{color:AMBER}}>● Neutral</span>
                    </div>
                  </div>

                  <div className="chart-card">
                    <div className="chart-title">Theme frequency</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={barData} margin={{top:0,right:0,left:-20,bottom:40}}>
                        <XAxis dataKey="name" tick={{fill:'#7a7870',fontSize:10,fontFamily:'var(--font-mono), monospace'}} angle={-35} textAnchor="end" interval={0} />
                        <YAxis tick={{fill:'#7a7870',fontSize:10,fontFamily:'var(--font-mono), monospace'}} />
                        <Tooltip
                          content={({active,payload}) => active && payload?.length ? (
                            <div className="custom-tooltip">
                              <div style={{marginBottom:'4px',color:'var(--text)'}}>{payload[0]?.payload?.fullName}</div>
                              {payload.map((p:any,i:number) => (
                                <div key={i} style={{color: p.name === 'Positive' ? GREEN : p.name === 'Negative' ? RED : AMBER}}>
                                  {p.name}: {p.value}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        />
                        <Bar dataKey="Positive" stackId="a" fill={GREEN} radius={[0,0,0,0]} />
                        <Bar dataKey="Negative" stackId="a" fill={RED} />
                        <Bar dataKey="Neutral" stackId="a" fill={AMBER} radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bubble-map">
                  <div className="chart-title">Theme map</div>
                  <div className="theme-grid">
                    {sentimentThemes.map((t, i) => (
                      <div key={i} className="theme-tile">
                        <div className="theme-tile-head">
                          <span className="theme-tile-name">{t.name}</span>
                          <span className="theme-tile-count">{t.total}</span>
                        </div>
                        <SentimentBar positive={t.positive} negative={t.negative} neutral={t.neutral} showText />
                      </div>
                    ))}
                  </div>
                  {flaggedThemes.length > 0 && (
                    <div className="flagged-row">
                      {flaggedThemes.map((t, i) => (
                        <div key={i} className="flagged-tile">
                          <span className="flagged-icon">⚑</span>
                          <span className="flagged-name">Flagged for review</span>
                          <span className="flagged-count">{t.total}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {synthesis ? (
                  <ReportView synthesis={synthesis} categoriesRaw={selected.categories} codesRaw={selected.codes} />
                ) : (
                  <>
                    <div className="result-section">
                      <div className="result-title">Executive summary</div>
                      <div className="result-content">{selected.executive_summary}</div>
                    </div>
                    <div className="result-section">
                      <div className="result-title">Themes & sentiment</div>
                      <div className="result-content">{selected.categories}</div>
                    </div>
                    <div className="result-section">
                      <div className="result-title">Qualitative codes</div>
                      <div className="result-content">{selected.codes}</div>
                    </div>
                  </>
                )}
              </>
            )
          })()}
        </div>
      </div>
    </>
  )
}