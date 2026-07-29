// Shared per-theme sentiment computation + synthesis types.
//
// This is THE single source of truth for how a category's positive / negative /
// neutral counts are derived from the stage-2 categorization text. It is reused
// by the Theme Frequency chart, the Theme Map, the report's category cards, and
// the API route that builds the executive synthesis — so those numbers can
// never drift apart. Do not re-implement this logic anywhere else.

export interface Theme {
  name: string
  positive: number
  negative: number
  neutral: number
  total: number
}

// "Flagged for Review" is a triage bucket for [LOW CONFIDENCE] codes, not a
// sentiment-bearing theme. It must be presented separately from real themes.
export const isFlaggedTheme = (name: string): boolean =>
  /flagged\s*for\s*review/i.test(name) || /^flagged/i.test(name.trim())

export const parseThemes = (categories: string): Theme[] => {
  const themes: Theme[] = []
  const categoryBlocks = categories.split(/Category:|##\s+Category:/).filter(b => b.trim())

  categoryBlocks.forEach(block => {
    const lines = block.split('\n').filter(l => l.trim())
    if (!lines.length) return
    const name = lines[0].replace(/[#*]/g, '').trim()
    if (!name || name.length > 60) return

    let pos = 0, neg = 0, neu = 0

    // Sentiment format
    const sentimentMatch = block.match(/Positive:\s*(\d+).*Negative:\s*(\d+).*Neutral:\s*(\d+)/i)
    // Strategic format
    const strategicMatch = block.match(/Opportunities:\s*(\d+).*Blockers:\s*(\d+).*Considerations:\s*(\d+)/i)
    // Process format
    const processMatch = block.match(/Working Well:\s*(\d+).*Needs Improvement:\s*(\d+).*Unclear:\s*(\d+)/i)
    // Exploration format
    const explorationMatch = block.match(/Prominent:\s*(\d+).*Emerging:\s*(\d+).*Peripheral:\s*(\d+)/i)

    if (sentimentMatch) {
      pos = parseInt(sentimentMatch[1])
      neg = parseInt(sentimentMatch[2])
      neu = parseInt(sentimentMatch[3])
    } else if (strategicMatch) {
      pos = parseInt(strategicMatch[1])
      neg = parseInt(strategicMatch[2])
      neu = parseInt(strategicMatch[3])
    } else if (processMatch) {
      pos = parseInt(processMatch[1])
      neg = parseInt(processMatch[2])
      neu = parseInt(processMatch[3])
    } else if (explorationMatch) {
      pos = parseInt(explorationMatch[1])
      neg = parseInt(explorationMatch[2])
      neu = parseInt(explorationMatch[3])
    } else {
      // Fallback — count keywords in block
      block.split('\n').forEach(line => {
        if (/positive|opportunity|working well|prominent/i.test(line)) pos++
        if (/negative|blocker|needs improvement|emerging/i.test(line)) neg++
        if (/neutral|consideration|unclear|peripheral/i.test(line)) neu++
      })
    }

    if (pos + neg + neu > 0) {
      themes.push({ name, positive: pos, negative: neg, neutral: neu, total: pos + neg + neu })
    }
  })

  return themes.sort((a, b) => b.total - a.total)
}

export const getSentimentCounts = (categories: string, questionType: string = 'sentiment') => {
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
    neu: acc.neu + t.neutral,
  }), { pos: 0, neg: 0, neu: 0 })
}

// ---------------------------------------------------------------------------
// Executive synthesis — structured data produced by pipeline stage 4.
// ---------------------------------------------------------------------------

export type Urgency = 'high' | 'medium' | 'low'

export interface EvidenceItem {
  originalComment: string
  tag: string
}

export interface SynthesisCategory {
  name: string
  sentiment: { positive: number; negative: number; neutral: number }
  narrative: string
  strategicPriority: string
  evidence: EvidenceItem[]
}

export interface TopPriority {
  priority: string
  urgency: Urgency
  relatedCategory: string
}

export interface Synthesis {
  criticalFindings: { headline: string; summary: string }
  topPriorities: TopPriority[]
  categories: SynthesisCategory[]
}

// Older analyses stored `executive_summary` as a markdown string. New analyses
// store the structured Synthesis JSON. This safely distinguishes the two:
// returns the parsed Synthesis, or null for legacy/malformed data so callers
// can fall back to rendering the raw string.
export const parseSynthesis = (raw: string | null | undefined): Synthesis | null => {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed.startsWith('{')) return null
  try {
    const obj = JSON.parse(trimmed)
    if (
      obj &&
      typeof obj === 'object' &&
      obj.criticalFindings &&
      Array.isArray(obj.categories)
    ) {
      return obj as Synthesis
    }
  } catch {
    // not JSON — legacy markdown string
  }
  return null
}
