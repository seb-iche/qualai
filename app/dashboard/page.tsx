'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

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

interface Theme {
  name: string
  positive: number
  negative: number
  neutral: number
  total: number
}

const parseThemes = (categories: string): Theme[] => {
  const themes: Theme[] = []
  const categoryBlocks = categories.split(/Category:|##\s+Category:/).filter(b => b.trim())
  categoryBlocks.forEach(block => {
    const lines = block.split('\n').filter(l => l.trim())
    if (!lines.length) return
    const name = lines[0].replace(/[#*]/g, '').trim()
    if (!name || name.length > 60) return
    let pos = 0, neg = 0, neu = 0
    block.split('\n').forEach(line => {
      if (/positive/i.test(line)) pos++
      if (/negative/i.test(line)) neg++
      if (/neutral/i.test(line)) neu++
    })
    const countMatch = block.match(/Positive:\s*(\d+).*Negative:\s*(\d+).*Neutral:\s*(\d+)/i)
    if (countMatch) {
      pos = parseInt(countMatch[1])
      neg = parseInt(countMatch[2])
      neu = parseInt(countMatch[3])
    }
    if (pos + neg + neu > 0) {
      themes.push({ name, positive: pos, negative: neg, neutral: neu, total: pos + neg + neu })
    }
  })
  return themes.sort((a, b) => b.total - a.total)
}

const getSentimentCounts = (categories: string, questionType: string = 'sentiment') => {
  if (questionType === 'strategic') {
    const opportunities = (categories.match(/Opportunity/g) || []).length
    const blockers = (categories.match(/Blocker/g) || []).length
    const considerations = (categories.match(/Consideration/g) || []).length
    return { pos: opportunities, neg: blockers, neu: considerations }
  } else if (questionType === 'process') {
    const working = (categories.match(/Working Well/g) || []).length
    const needs = (categories.match(/Needs Improvement/g) || []).length
    const unclear = (categories.match(/Unclear/g) || []).length
    return { pos: working, neg: needs, neu: unclear }
  } else if (questionType === 'exploration') {
    const prominent = (categories.match(/Prominent/g) || []).length
    const emerging = (categories.match(/Emerging/g) || []).length
    const peripheral = (categories.match(/Peripheral/g) || []).length
    return { pos: prominent, neg: emerging, neu: peripheral }
  }
  const themes = parseThemes(categories)
  return themes.reduce((acc, t) => ({
    pos: acc.pos + t.positive,
    neg: acc.neg + t.negative,
    neu: acc.neu + t.neutral
  }), { pos: 0, neg: 0, neu: 0 })
}

const GREEN = '#7db87a'
const RED = '#e07070'
const AMBER = '#e0b870'
const MUTED = '#7a7870'

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
    const cleanText = (text: string) => text
        .replace(/#{1,3}\s/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/→/g, '->')
        .replace(/---/g, '')
        .replace(/^\s*[-•]\s/gm, '• ')
        .trim()
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()

    const green = [125, 184, 122] as [number, number, number]
    const dark = [26, 26, 26] as [number, number, number]
    const muted = [120, 120, 112] as [number, number, number]

    let y = 20

    doc.setFontSize(22)
    doc.setTextColor(...green)
    doc.setFont('helvetica', 'bold')
    doc.text('QUALAI', 20, y)

    y += 8
    doc.setFontSize(10)
    doc.setTextColor(...muted)
    doc.setFont('helvetica', 'normal')
    doc.text('Qualitative Analysis Report', 20, y)

    y += 6
    doc.text(formatDate(analysis.created_at), 20, y)

    y += 8
    doc.setDrawColor(...green)
    doc.setLineWidth(0.3)
    doc.line(20, y, 190, y)

    y += 10
    doc.setFontSize(13)
    doc.setTextColor(...dark)
    doc.setFont('helvetica', 'bold')
    doc.text('Survey Question', 20, y)

    y += 7
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    const questionLines = doc.splitTextToSize(analysis.question, 170)
    doc.text(questionLines, 20, y)
    y += questionLines.length * 6 + 6

    const { pos, neg, neu } = getSentimentCounts(analysis.categories, analysis.question_type)
    const total = pos + neg + neu
    const ratio = total > 0 ? Math.round((pos / total) * 100) : 0

    doc.setFontSize(10)
    doc.setTextColor(...muted)
    doc.text(`Responses analyzed: ${analysis.response_count}`, 20, y)
    y += 5.5
    doc.text(`Positive codes: ${pos}   |   Negative codes: ${neg}   |   Neutral codes: ${neu}`, 20, y)
    y += 5.5
    doc.text(`Positive ratio: ${ratio}%   |   Avg codes per response: ${(total / analysis.response_count).toFixed(1)}`, 20, y)
    y += 5.5

    const themes = parseThemes(analysis.categories)
    if (themes.length > 0) {
    doc.text(`Top theme: ${themes[0].name}   |   Total themes identified: ${themes.length}`, 20, y)
    y += 5.5
    }

    y += 8
    doc.line(20, y, 190, y)

    y += 10
    doc.setFontSize(13)
    doc.setTextColor(...green)
    doc.setFont('helvetica', 'bold')
    doc.text('Executive Summary', 20, y)

    y += 7
    doc.setFontSize(10)
    doc.setTextColor(...dark)
    doc.setFont('helvetica', 'normal')
    const summaryLines = doc.splitTextToSize(cleanText(analysis.executive_summary), 170)
    summaryLines.forEach((line: string) => {
      if (y > 270) { doc.addPage(); y = 20 }
      doc.text(line, 20, y)
      y += 5.5
    })

    y += 6
    if (y > 260) { doc.addPage(); y = 20 }
    doc.setFontSize(13)
    doc.setTextColor(...green)
    doc.setFont('helvetica', 'bold')
    doc.text('Themes & Sentiment', 20, y)

    y += 7
    doc.setFontSize(10)
    doc.setTextColor(...dark)
    doc.setFont('helvetica', 'normal')
    const categoryLines = doc.splitTextToSize(cleanText(analysis.categories), 170)
    categoryLines.forEach((line: string) => {
      if (y > 270) { doc.addPage(); y = 20 }
      doc.text(line, 20, y)
      y += 5.5
    })

    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(...muted)
      doc.text('Generated by Qualai — qualai.vercel.app', 20, 290)
      doc.text(`Page ${i} of ${pageCount}`, 170, 290)
    }

    doc.save(`qualai-report-${new Date().toISOString().split('T')[0]}.pdf`)
  }


  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0e0f0d; --surface: #161710; --green: #7db87a; --green-dim: #4a7a47;
          --text: #e8e6df; --muted: #7a7870; --border: rgba(125,184,122,0.15);
          --red: #e07070; --amber: #e0b870;
        }
        html, body { background: var(--bg); color: var(--text); }
        .page { min-height: 100vh; font-family: 'DM Mono', monospace; display: grid; grid-template-columns: 300px 1fr; grid-template-rows: auto 1fr; }
        .topbar { grid-column: 1/-1; display: flex; align-items: center; justify-content: space-between; padding: 20px 32px; border-bottom: 1px solid var(--border); }
        .logo { display: flex; align-items: center; gap: 8px; font-family: 'DM Serif Display', serif; font-size: 20px; color: var(--text); text-decoration: none; }
        .nav-links { display: flex; gap: 24px; }
        .nav-link { font-size: 12px; color: var(--muted); text-decoration: none; letter-spacing: 0.04em; transition: color 0.15s; }
        .nav-link:hover { color: var(--text); }
        .nav-link.active { color: var(--green); }
        .sidebar { border-right: 1px solid var(--border); overflow-y: auto; padding: 24px 0; }
        .sidebar-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); padding: 0 20px 12px; }
        .analysis-item { padding: 14px 20px; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.15s; }
        .analysis-item:hover { background: rgba(125,184,122,0.05); }
        .analysis-item.active { background: rgba(125,184,122,0.08); border-left: 2px solid var(--green); }
        .item-question { font-size: 12px; color: var(--text); margin-bottom: 6px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .item-meta { display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: var(--muted); }
        .sentiment-pills { display: flex; gap: 4px; }
        .pill { font-size: 10px; padding: 2px 6px; border-radius: 99px; font-weight: 500; }
        .pill-green { background: rgba(125,184,122,0.15); color: var(--green); }
        .pill-red { background: rgba(224,112,112,0.15); color: var(--red); }
        .pill-amber { background: rgba(224,184,112,0.15); color: var(--amber); }
        .main { overflow-y: auto; padding: 32px; }
        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--muted); text-align: center; gap: 12px; }
        .detail-question { font-family: 'DM Serif Display', serif; font-size: 24px; color: var(--text); margin-bottom: 8px; line-height: 1.3; }
        .detail-meta { display: flex; gap: 16px; font-size: 12px; color: var(--muted); margin-bottom: 28px; }
        .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 16px; text-align: center; }
        .stat-num { font-size: 28px; font-weight: 400; margin-bottom: 4px; }
        .stat-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
        .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        .chart-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px; }
        .chart-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--green); margin-bottom: 16px; }
        .bubble-map { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px; margin-bottom: 24px; }
        .bubbles { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 8px 0; }
        .bubble { border-radius: 99px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 400; text-align: center; padding: 8px 16px; transition: transform 0.15s; cursor: default; line-height: 1.3; }
        .bubble:hover { transform: scale(1.05); }
        .result-section { border: 1px solid var(--border); border-radius: 8px; padding: 20px; margin-bottom: 16px; background: var(--surface); }
        .result-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--green); margin-bottom: 12px; }
        .result-content { font-size: 13px; color: var(--text); line-height: 1.8; white-space: pre-wrap; font-weight: 300; }
        .new-btn { display: inline-flex; align-items: center; gap: 6px; background: var(--green); color: #0e0f0d; border: none; padding: 10px 20px; font-family: 'DM Mono', monospace; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; border-radius: 6px; cursor: pointer; text-decoration: none; transition: background 0.2s; margin-top: 16px; }
        .new-btn:hover { background: #8ec98b; }
        .custom-tooltip { background: #1e2018; border: 1px solid rgba(125,184,122,0.2); border-radius: 6px; padding: 8px 12px; font-size: 11px; color: var(--text); font-family: 'DM Mono', monospace; }
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

            const maxTotal = Math.max(...themes.map(t => t.total))

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
                fontFamily: 'DM Mono, monospace',
                letterSpacing: '0.06em',
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
                        <Tooltip contentStyle={{background:'#1e2018',border:'1px solid rgba(125,184,122,0.2)',borderRadius:'6px',fontFamily:'DM Mono',fontSize:'11px'}} />
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
                        <XAxis dataKey="name" tick={{fill:'#7a7870',fontSize:10,fontFamily:'DM Mono'}} angle={-35} textAnchor="end" interval={0} />
                        <YAxis tick={{fill:'#7a7870',fontSize:10,fontFamily:'DM Mono'}} />
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
                  <div className="bubbles">
                    {themes.map((t, i) => {
                      const size = 0.6 + (t.total / maxTotal) * 0.8
                      const dominantSentiment = t.positive >= t.negative && t.positive >= t.neutral ? 'positive'
                        : t.negative >= t.positive && t.negative >= t.neutral ? 'negative' : 'neutral'
                      const bg = dominantSentiment === 'positive' ? 'rgba(125,184,122,0.12)'
                        : dominantSentiment === 'negative' ? 'rgba(224,112,112,0.12)' : 'rgba(224,184,112,0.12)'
                      const border = dominantSentiment === 'positive' ? 'rgba(125,184,122,0.3)'
                        : dominantSentiment === 'negative' ? 'rgba(224,112,112,0.3)' : 'rgba(224,184,112,0.3)'
                      const color = dominantSentiment === 'positive' ? GREEN
                        : dominantSentiment === 'negative' ? RED : AMBER
                      return (
                        <div key={i} className="bubble" style={{
                          background: bg,
                          border: `1px solid ${border}`,
                          color,
                          fontSize: `${10 + (t.total / maxTotal) * 6}px`,
                          padding: `${6 + (t.total / maxTotal) * 8}px ${12 + (t.total / maxTotal) * 12}px`
                        }}>
                          {t.name}
                          <span style={{marginLeft:'6px',opacity:0.6,fontSize:'10px'}}>({t.total})</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

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
            )
          })()}
        </div>
      </div>
    </>
  )
}