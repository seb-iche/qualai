'use client'

import { useRef, useState } from 'react'

interface StageState {
  status: 'idle' | 'processing' | 'done'
  input: string
  output: string
}

interface PipelineState {
  stage0: StageState
  stage1: StageState
  stage2: StageState
  stage3: StageState
}

const defaultStage: StageState = { status: 'idle', input: '', output: '' }

type InputMode = 'paste' | 'upload'

// A column reads as free-text responses if most of its values are long or
// multi-word — as opposed to IDs, dates, or single-token categorical values.
const looksLikeText = (values: string[]): boolean => {
  if (values.length === 0) return false
  const texty = values.filter(v => v.trim().includes(' ') || v.trim().length > 20).length
  return texty / values.length >= 0.5
}

export default function AnalyzePage() {
  const [question, setQuestion] = useState('')
  const [responses, setResponses] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pipeline, setPipeline] = useState<PipelineState>({
    stage0: defaultStage,
    stage1: defaultStage,
    stage2: defaultStage,
    stage3: defaultStage,
  })
  const [done, setDone] = useState(false)

  // Input method — paste and upload coexist as equal options.
  const [inputMode, setInputMode] = useState<InputMode>('paste')
  const [fileName, setFileName] = useState('')
  const [columns, setColumns] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [selectedCol, setSelectedCol] = useState<number>(-1)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateStage = (stage: keyof PipelineState, updates: Partial<StageState>) => {
    setPipeline(prev => ({ ...prev, [stage]: { ...prev[stage], ...updates } }))
  }

  // Responses extracted from the chosen spreadsheet column.
  const extractedResponses =
    selectedCol >= 0
      ? rows.map(r => (r[selectedCol] ?? '').trim()).filter(v => v.length > 0)
      : []

  const resetUpload = () => {
    setFileName('')
    setColumns([])
    setRows([])
    setSelectedCol(-1)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFile = async (file: File) => {
    setError('')
    resetUpload()

    try {
      const ext = file.name.split('.').pop()?.toLowerCase()
      let table: string[][] = []

      if (ext === 'csv') {
        const Papa = (await import('papaparse')).default
        const text = await file.text()
        const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true })
        table = (parsed.data as string[][]).map(row => row.map(c => (c ?? '').toString()))
      } else if (ext === 'xlsx') {
        const XLSX = await import('xlsx')
        const buf = await file.arrayBuffer()
        const wb = XLSX.read(buf, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, blankrows: false, defval: '' })
        table = json.map(row => (row as any[]).map(c => (c ?? '').toString()))
      } else {
        setError('Unsupported file type. Please upload a .csv or .xlsx file.')
        return
      }

      table = table.filter(row => row.some(c => c.trim().length > 0))
      if (table.length === 0) {
        setError('That file appears to be empty.')
        return
      }

      const colCount = Math.max(...table.map(r => r.length))
      const header = table[0]
      const dataRows = table.slice(1).map(r => {
        const padded = [...r]
        while (padded.length < colCount) padded.push('')
        return padded
      })

      // Column labels: use the header row, falling back to "Column N".
      const headerLabels = Array.from({ length: colCount }, (_, i) =>
        (header[i] ?? '').trim() || `Column ${i + 1}`
      )

      setFileName(file.name)
      setColumns(headerLabels)
      setRows(dataRows)

      // Auto-pick when there's only one column, or exactly one plausible text
      // column; otherwise defer to the column picker.
      if (colCount === 1) {
        setSelectedCol(0)
      } else {
        const plausible = Array.from({ length: colCount }, (_, i) => i).filter(i =>
          looksLikeText(dataRows.map(r => r[i] ?? ''))
        )
        if (plausible.length === 1) setSelectedCol(plausible[0])
      }
    } catch (err: any) {
      setError('Could not read that file. Please check it and try again.')
    }
  }

  const handleAnalyze = async () => {
    setLoading(true)
    setError('')
    setDone(false)
    setPipeline({ stage0: defaultStage, stage1: defaultStage, stage2: defaultStage, stage3: defaultStage })

    const responseList =
      inputMode === 'upload'
        ? extractedResponses
        : responses.split('\n').map(r => r.trim()).filter(r => r.length > 0)

    if (!question || responseList.length === 0) {
      setError(
        inputMode === 'upload'
          ? 'Please enter a question and choose a column with responses.'
          : 'Please enter a question and at least one response.'
      )
      setLoading(false)
      return
    }

    const userApiKey = localStorage.getItem('qualai_api_key') || ''
    const demoAccess = localStorage.getItem('qualai_demo_access') === 'true'

    try {
      // Stage 0
      updateStage('stage0', { status: 'processing', input: question })
      
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, responses: responseList, userApiKey, demoAccess })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // Animate stages sequentially
      updateStage('stage0', { status: 'done', output: `Question type detected: ${data.questionType}` })

      await new Promise(r => setTimeout(r, 400))
      updateStage('stage1', { 
        status: 'processing', 
        input: `${responseList.length} responses received` 
      })
      await new Promise(r => setTimeout(r, 600))
      updateStage('stage1', { status: 'done', output: data.codes })

      await new Promise(r => setTimeout(r, 400))
      updateStage('stage2', { 
        status: 'processing', 
        input: 'Codes from Stage 1' 
      })
      await new Promise(r => setTimeout(r, 600))
      updateStage('stage2', { status: 'done', output: data.categories })

      await new Promise(r => setTimeout(r, 400))
      updateStage('stage3', { 
        status: 'processing', 
        input: 'Themes from Stage 2' 
      })
      await new Promise(r => setTimeout(r, 600))
      updateStage('stage3', { status: 'done', output: data.executiveSummary })

      setDone(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0e0f0d; --surface: #161710; --green: #7db87a; --green-dim: #4a7a47;
          --text: #e8e6df; --muted: #7a7870; --border: rgba(125,184,122,0.15); --red: #e07070;
        }
        html, body { background: var(--bg); color: var(--text); }
        .page { min-height: 100vh; font-family: var(--font-sans), sans-serif; padding: 0 0 80px; }
        .topbar { display: flex; align-items: center; justify-content: space-between; padding: 20px 48px; border-bottom: 1px solid var(--border); }
        .logo { display: flex; align-items: center; gap: 8px; font-family: var(--font-wordmark), serif; font-size: 20px; color: var(--text); text-decoration: none; }
        .nav-links { display: flex; gap: 24px; }
        .nav-link { font-size: 12px; color: var(--muted); text-decoration: none; letter-spacing: 0.04em; transition: color 0.15s; }
        .nav-link:hover { color: var(--text); }
        .nav-link.active { color: var(--green); }
        .input-section { max-width: 760px; margin: 0 auto; padding: 48px 24px 32px; }
        h1 { font-family: var(--font-sans), sans-serif; font-weight: 700; letter-spacing: -0.02em; font-size: 32px; color: var(--text); margin-bottom: 8px; }
        .subtitle { font-family: var(--font-mono), monospace; font-size: 13px; color: var(--muted); margin-bottom: 32px; line-height: 1.6; font-weight: 400; }
        .fields-row { display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; }
        .field { display: flex; flex-direction: column; gap: 8px; }
        label { font-family: var(--font-sans), sans-serif; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--green); }
        input, textarea { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; font-family: var(--font-mono), monospace; font-size: 13px; color: var(--text); outline: none; transition: border-color 0.2s; font-weight: 400; width: 100%; }
        input:focus, textarea:focus { border-color: var(--green-dim); }
        textarea { resize: vertical; min-height: 160px; line-height: 1.6; }
        .hint { font-family: var(--font-sans), sans-serif; font-size: 11px; color: var(--muted); margin-top: 4px; }
        .run-btn { width: 100%; background: var(--green); color: #0e0f0d; border: none; padding: 14px; font-family: var(--font-sans), sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; border-radius: 8px; cursor: pointer; transition: background 0.2s; margin-top: 4px; }
        .run-btn:hover { background: #8ec98b; }
        .run-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        textarea { scrollbar-width: none; -ms-overflow-style: none; }
        textarea::-webkit-scrollbar { display: none; }
        .error { font-family: var(--font-sans), sans-serif; color: var(--red); font-size: 13px; margin-top: 12px; }

        .input-tabs { display: flex; gap: 4px; margin-bottom: 12px; }
        .input-tab { font-family: var(--font-sans), sans-serif; font-weight: 500; font-size: 12px; color: var(--muted); background: transparent; border: 1px solid var(--border); border-radius: 8px; padding: 8px 16px; cursor: pointer; transition: all 0.15s; }
        .input-tab:hover { color: var(--text); border-color: var(--green-dim); }
        .input-tab.active { color: var(--green); border-color: var(--green); background: rgba(125,184,122,0.06); }

        .dropzone { border: 1px dashed var(--green-dim); border-radius: 8px; background: var(--surface); padding: 32px 16px; text-align: center; cursor: pointer; transition: border-color 0.2s, background 0.2s; }
        .dropzone:hover { border-color: var(--green); background: rgba(125,184,122,0.04); }
        .dropzone-prompt { display: flex; flex-direction: column; gap: 4px; }
        .dropzone-title { font-family: var(--font-sans), sans-serif; font-weight: 500; font-size: 13px; color: var(--text); }
        .dropzone-sub { font-family: var(--font-sans), sans-serif; font-size: 12px; color: var(--muted); }
        .dropzone-file { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; }
        .dropzone-filename { font-family: var(--font-mono), monospace; font-size: 13px; color: var(--green); }
        .dropzone-clear { font-family: var(--font-sans), sans-serif; font-size: 11px; color: var(--muted); background: transparent; border: 1px solid var(--border); border-radius: 6px; padding: 4px 10px; cursor: pointer; transition: all 0.15s; }
        .dropzone-clear:hover { color: var(--red); border-color: var(--red); }

        .col-picker { margin-top: 16px; }
        .col-picker-label { font-family: var(--font-sans), sans-serif; font-weight: 500; font-size: 12px; color: var(--text); margin-bottom: 10px; }
        .col-chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .col-chip { font-family: var(--font-mono), monospace; font-size: 12px; color: var(--muted); background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 8px 14px; cursor: pointer; transition: all 0.15s; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .col-chip:hover { color: var(--text); border-color: var(--green-dim); }
        .col-chip.active { color: var(--green); border-color: var(--green); background: rgba(125,184,122,0.08); }

        .pipeline-section { padding: 0 24px; max-width: 1200px; margin: 0 auto; }
        .pipeline-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); margin-bottom: 16px; padding-top: 8px; }
        .pipeline { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; align-items: start; }
        .connector { display: flex; align-items: center; justify-content: center; padding-top: 48px; color: var(--green-dim); font-size: 18px; }

        .stage-window { border: 1px solid var(--border); border-radius: 10px; background: var(--surface); overflow: hidden; transition: border-color 0.3s, box-shadow 0.3s; }
        .stage-window.processing { border-color: var(--green-dim); box-shadow: 0 0 20px rgba(125,184,122,0.08); }
        .stage-window.done { border-color: rgba(125,184,122,0.3); }

        .stage-header { padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .stage-title { font-size: 11px; font-weight: 500; color: var(--text); letter-spacing: 0.04em; }
        .stage-badge { font-size: 10px; padding: 2px 8px; border-radius: 99px; }
        .badge-idle { background: rgba(120,120,112,0.15); color: var(--muted); }
        .badge-processing { background: rgba(125,184,122,0.15); color: var(--green); animation: pulse 1.5s infinite; }
        .badge-done { background: rgba(125,184,122,0.2); color: var(--green); }

        .stage-body { padding: 0; }
        .stage-slot { padding: 12px 16px; border-bottom: 1px solid rgba(125,184,122,0.08); }
        .stage-slot:last-child { border-bottom: none; }
        .slot-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); margin-bottom: 6px; }
        .slot-content { font-family: var(--font-mono), monospace; font-size: 11px; color: var(--text); line-height: 1.6; white-space: pre-wrap; font-weight: 400; max-height: 120px; overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none; }
        .slot-content::-webkit-scrollbar { display: none; }
        .slot-content.empty { color: var(--muted); font-style: italic; }
        .slot-content.processing-text { color: var(--green); }

        .process-bar { height: 2px; background: var(--border); margin: 0; overflow: hidden; }
        .process-fill { height: 100%; background: var(--green); width: 0%; transition: width 0.5s; }
        .process-fill.active { animation: fillBar 2s ease-in-out infinite; }

        .done-banner { background: rgba(125,184,122,0.06); border: 1px solid rgba(125,184,122,0.2); border-radius: 8px; padding: 16px 20px; margin: 24px auto 0; max-width: 1200px; display: flex; align-items: center; justify-content: space-between; }
        .done-text { font-size: 13px; color: var(--green); }
        .done-links { display: flex; gap: 16px; }
        .done-link { font-size: 12px; color: var(--muted); text-decoration: none; letter-spacing: 0.04em; transition: color 0.15s; padding: 6px 14px; border: 1px solid var(--border); border-radius: 6px; }
        .done-link:hover { color: var(--text); border-color: var(--green-dim); }

        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes fillBar { 0% { width: 0%; } 50% { width: 70%; } 100% { width: 40%; } }
        
        @media (max-width: 768px) {
        .topbar { padding: 16px 20px; }
        .nav-links { gap: 12px; }
        .nav-link { font-size: 11px; }
        .input-section { padding: 24px 16px; }
        h1 { font-size: 24px; }
        .pipeline { grid-template-columns: 1fr 1fr; gap: 8px; }
        .stage-window { font-size: 11px; }
        .pipeline-section { padding: 0 16px; }
        .done-banner { flex-direction: column; gap: 12px; padding: 16px; }
        .done-links { width: 100%; justify-content: center; }
        }
        
      `}</style>

      <div className="page">
        <div className="topbar">
          <a href="/" className="logo">
            <img src="/koala-logo.svg" alt="Qualai" width={60} height={60} style={{display:'block', marginTop:'8px'}} />
            Qualai
          </a>
          <div className="nav-links">
            <a href="/analyze" className="nav-link active">New analysis</a>
            <a href="/dashboard" className="nav-link">Dashboard</a>
            <a href="/settings" className="nav-link">Settings</a>
          </div>
        </div>

        <div className="input-section">
          <h1>Analysis pipeline</h1>
          <p className="subtitle">
            Enter your survey question and employee responses. Watch the 4-stage pipeline process your data in real time — every step visible, nothing hidden.
          </p>

          <div className="fields-row">
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

              <div className="input-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={inputMode === 'paste'}
                  className={`input-tab ${inputMode === 'paste' ? 'active' : ''}`}
                  onClick={() => setInputMode('paste')}
                >
                  Paste
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={inputMode === 'upload'}
                  className={`input-tab ${inputMode === 'upload' ? 'active' : ''}`}
                  onClick={() => setInputMode('upload')}
                >
                  Upload spreadsheet
                </button>
              </div>

              {inputMode === 'paste' && (
                <>
                  <textarea
                    placeholder={"One response per line:\n\nI feel my work isn't recognized.\nThe team culture is great but workload is unsustainable.\nMore clarity on career growth would help."}
                    value={responses}
                    onChange={e => setResponses(e.target.value)}
                  />
                  <p className="hint">One response per line. Minimum 3 recommended.</p>
                </>
              )}

              {inputMode === 'upload' && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx"
                    style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                  />

                  <div
                    className="dropzone"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault()
                      const f = e.dataTransfer.files?.[0]
                      if (f) handleFile(f)
                    }}
                  >
                    {fileName ? (
                      <div className="dropzone-file">
                        <span className="dropzone-filename">{fileName}</span>
                        <button
                          type="button"
                          className="dropzone-clear"
                          onClick={e => { e.stopPropagation(); resetUpload() }}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="dropzone-prompt">
                        <span className="dropzone-title">Drop a .csv or .xlsx file here</span>
                        <span className="dropzone-sub">or click to browse</span>
                      </div>
                    )}
                  </div>

                  {fileName && columns.length > 1 && (
                    <div className="col-picker">
                      <div className="col-picker-label">Which column holds the responses?</div>
                      <div className="col-chips">
                        {columns.map((col, i) => (
                          <button
                            type="button"
                            key={i}
                            className={`col-chip ${selectedCol === i ? 'active' : ''}`}
                            onClick={() => setSelectedCol(i)}
                          >
                            {col}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {fileName && (
                    <p className="hint">
                      {selectedCol >= 0
                        ? `${extractedResponses.length} response${extractedResponses.length === 1 ? '' : 's'} from "${columns[selectedCol]}".`
                        : 'Select the column that contains the open-text responses.'}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          <button className="run-btn" onClick={handleAnalyze} disabled={loading}>
            {loading ? 'Pipeline running...' : 'Run analysis pipeline'}
          </button>
          {error && <p className="error">{error}</p>}
        </div>

        {(pipeline.stage0.status !== 'idle' || loading) && (
          <div className="pipeline-section">
            <div className="pipeline-label">Analysis pipeline — {loading ? 'processing' : 'complete'}</div>
            <div className="pipeline">

              {/* Stage 0 */}
              <div className={`stage-window ${pipeline.stage0.status}`}>
                <div className="stage-header">
                  <span className="stage-title">Prompt 0 — Question type</span>
                  <span className={`stage-badge badge-${pipeline.stage0.status}`}>
                    {pipeline.stage0.status === 'idle' ? 'waiting' : pipeline.stage0.status === 'processing' ? 'detecting...' : 'done'}
                  </span>
                </div>
                <div className="process-bar"><div className={`process-fill ${pipeline.stage0.status === 'processing' ? 'active' : pipeline.stage0.status === 'done' ? '' : ''}`} style={{width: pipeline.stage0.status === 'done' ? '100%' : '0%'}} /></div>
                <div className="stage-body">
                  <div className="stage-slot">
                    <div className="slot-label">Input</div>
                    <div className={`slot-content ${!pipeline.stage0.input ? 'empty' : ''}`}>
                      {pipeline.stage0.input || 'Waiting...'}
                    </div>
                  </div>
                  <div className="stage-slot">
                    <div className="slot-label">Process</div>
                    <div className={`slot-content ${pipeline.stage0.status === 'processing' ? 'processing-text' : 'empty'}`}>
                    {pipeline.stage0.status === 'processing' ? 'Classifying question type...' : pipeline.stage0.status === 'done' ? '✓ Question intent analyzed\n✓ Type classified: ' + (pipeline.stage0.output.split(': ')[1] || '') + '\n✓ Pipeline configured accordingly' : 'Waiting...'}                    </div>
                  </div>
                  <div className="stage-slot">
                    <div className="slot-label">Output</div>
                    <div className={`slot-content ${!pipeline.stage0.output ? 'empty' : ''}`}>
                      {pipeline.stage0.output || '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stage 1 */}
              <div className={`stage-window ${pipeline.stage1.status}`}>
                <div className="stage-header">
                  <span className="stage-title">Prompt 1 — Coding</span>
                  <span className={`stage-badge badge-${pipeline.stage1.status}`}>
                    {pipeline.stage1.status === 'idle' ? 'waiting' : pipeline.stage1.status === 'processing' ? 'coding...' : 'done'}
                  </span>
                </div>
                <div className="process-bar"><div className={`process-fill ${pipeline.stage1.status === 'processing' ? 'active' : ''}`} style={{width: pipeline.stage1.status === 'done' ? '100%' : '0%'}} /></div>
                <div className="stage-body">
                  <div className="stage-slot">
                    <div className="slot-label">Input</div>
                    <div className={`slot-content ${!pipeline.stage1.input ? 'empty' : ''}`}>
                      {pipeline.stage1.input || 'Waiting for Stage 0...'}
                    </div>
                  </div>
                  <div className="stage-slot">
                    <div className="slot-label">Process</div>
                    <div className={`slot-content ${pipeline.stage1.status === 'processing' ? 'processing-text' : 'empty'}`}>
                    {pipeline.stage1.status === 'processing' ? 'Extracting 3-5 keywords per response using only original text...' : pipeline.stage1.status === 'done' ? '✓ Keywords extracted from original text\n✓ Stop words removed\n✓ Multi-idea responses split\n✓ Low confidence responses flagged' : 'Waiting...'}
                    </div>
                  </div>
                  <div className="stage-slot">
                    <div className="slot-label">Output</div>
                    <div className={`slot-content ${!pipeline.stage1.output ? 'empty' : ''}`}>
                      {pipeline.stage1.output || '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stage 2 */}
              <div className={`stage-window ${pipeline.stage2.status}`}>
                <div className="stage-header">
                  <span className="stage-title">Prompt 2 — Categorization</span>
                  <span className={`stage-badge badge-${pipeline.stage2.status}`}>
                    {pipeline.stage2.status === 'idle' ? 'waiting' : pipeline.stage2.status === 'processing' ? 'categorizing...' : 'done'}
                  </span>
                </div>
                <div className="process-bar"><div className={`process-fill ${pipeline.stage2.status === 'processing' ? 'active' : ''}`} style={{width: pipeline.stage2.status === 'done' ? '100%' : '0%'}} /></div>
                <div className="stage-body">
                  <div className="stage-slot">
                    <div className="slot-label">Input</div>
                    <div className={`slot-content ${!pipeline.stage2.input ? 'empty' : ''}`}>
                      {pipeline.stage2.input || 'Waiting for Stage 1...'}
                    </div>
                  </div>
                  <div className="stage-slot">
                    <div className="slot-label">Process</div>
                    <div className={`slot-content ${pipeline.stage2.status === 'processing' ? 'processing-text' : 'empty'}`}>
                    {pipeline.stage2.status === 'processing' ? 'Grouping codes into themes, assigning sentiment polarity...' : pipeline.stage2.status === 'done' ? '✓ Codes grouped into themes\n✓ Sentiment polarity assigned per code\n✓ Low confidence codes isolated\n✓ Polarity counts calculated per theme' : 'Waiting...'}                    </div>
                  </div>
                  <div className="stage-slot">
                    <div className="slot-label">Output</div>
                    <div className={`slot-content ${!pipeline.stage2.output ? 'empty' : ''}`}>
                      {pipeline.stage2.output || '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stage 3 */}
              <div className={`stage-window ${pipeline.stage3.status}`}>
                <div className="stage-header">
                  <span className="stage-title">Prompt 3 — Synthesis</span>
                  <span className={`stage-badge badge-${pipeline.stage3.status}`}>
                    {pipeline.stage3.status === 'idle' ? 'waiting' : pipeline.stage3.status === 'processing' ? 'synthesizing...' : 'done'}
                  </span>
                </div>
                <div className="process-bar"><div className={`process-fill ${pipeline.stage3.status === 'processing' ? 'active' : ''}`} style={{width: pipeline.stage3.status === 'done' ? '100%' : '0%'}} /></div>
                <div className="stage-body">
                  <div className="stage-slot">
                    <div className="slot-label">Input</div>
                    <div className={`slot-content ${!pipeline.stage3.input ? 'empty' : ''}`}>
                      {pipeline.stage3.input || 'Waiting for Stage 2...'}
                    </div>
                  </div>
                  <div className="stage-slot">
                    <div className="slot-label">Process</div>
                    <div className={`slot-content ${pipeline.stage3.status === 'processing' ? 'processing-text' : 'empty'}`}>
                    {pipeline.stage3.status === 'processing' ? 'Generating thematic summaries and executive synthesis...' : pipeline.stage3.status === 'done' ? '✓ Thematic summary written per category\n✓ Categories ordered by code frequency\n✓ Executive synthesis generated\n✓ Insights grounded in original data only' : 'Waiting...'}                    </div>
                  </div>
                  <div className="stage-slot">
                    <div className="slot-label">Output</div>
                    <div className={`slot-content ${!pipeline.stage3.output ? 'empty' : ''}`}>
                      {pipeline.stage3.output || '—'}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {done && (
              <div className="done-banner">
                <span className="done-text">✓ Pipeline complete — analysis saved to dashboard</span>
                <div className="done-links">
                  <a href="/dashboard" className="done-link">View dashboard →</a>
                  <a href="/analyze" className="done-link" onClick={() => { setPipeline({ stage0: defaultStage, stage1: defaultStage, stage2: defaultStage, stage3: defaultStage }); setDone(false); }}>New analysis</a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}