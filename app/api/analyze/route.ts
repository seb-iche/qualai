import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { parseThemes } from '@/lib/themes'

export async function POST(request: NextRequest) {
  const { question, responses, userApiKey } = await request.json()

  // Use user's own key if provided, otherwise fall back to Qualai's key
  const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY
  const client = new Anthropic({ apiKey })

// Prompt 0: Question type detection
const typeDetection = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 100,
    messages: [{
        role: 'user',
        content: `Classify this HR survey question into exactly one category. Read carefully.

        SENTIMENT — the question asks employees how they FEEL, what their EXPERIENCE is like, or about their WELLBEING. Examples: "How do you feel about...", "What is your experience with...", "How satisfied are you with..."

        STRATEGIC — the question asks what should be PRIORITIZED, CHANGED, or IMPROVED at an organizational level. Examples: "What should we focus on...", "What would you change about...", "What are your suggestions for..."

        PROCESS — the question asks how a specific WORKFLOW, PROCEDURE, or SYSTEM is working. Examples: "How is the hiring process working...", "What is your experience with the onboarding process...", "How effective is our performance review..."

        EXPLORATION — anything that doesn't clearly fit above.

        Question to classify: "${question}"

        Rules:
        - If the question contains "prioritize", "should we", "improve", "suggestions" → STRATEGIC
        - If the question contains "feel", "experience", "satisfied", "happy", "culture" → SENTIMENT  
        - If the question contains "process", "procedure", "system", "tool" AND asks how it works → PROCESS
        - When in doubt between strategic and process → STRATEGIC

        Reply with ONLY one word in lowercase: sentiment, strategic, process, or exploration.`
    }]
    })

    const questionType = typeDetection.content[0].type === 'text' 
    ? typeDetection.content[0].text.trim().toLowerCase().split(/\s+/)[0]
    : 'sentiment'

    //console.log('Prompt 0 raw response:', typeDetection.content[0])

  if (!question || !responses || responses.length === 0) {
    return NextResponse.json({ error: 'Missing question or responses' }, { status: 400 })
  }

  const responseList = responses.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')

  try {
    // Prompt 1: Coding
    const coding = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are a PhD Analyst with over 20 years of experience in HR and qualitative analysis with an emphasis on academic HR/OB research standards, performing qualitative coding of open-text survey responses.

Question: ${question}

Responses:
${responseList}

Instructions:
- For each response segment, create a code containing 3–5 keywords using only words from the original comment.
- Remove stop words that add no meaning (e.g. is, of, the) unless they preserve the idea.
- Each code must represent only one idea. If a segment has two ideas, split into two codes.
- MINIMUM 3 keywords per code. If a response is too short or vague to produce 3 meaningful keywords, write the code as: [LOW CONFIDENCE] + whatever keywords exist.
- Each code on a separate line, no bullets or numbers.`
      }]
    })

    const codes = coding.content[0].type === 'text' ? coding.content[0].text : ''

    // Prompt 2: Categorization — branched by question type
    const prompt2Content = questionType === 'strategic' ? 
    `You are a PhD Analyst performing thematic categorization for a STRATEGIC HR question.

    Codes extracted:
    ${codes}

    Instructions:
    - Group codes into themes representing strategic priorities.
    - For each code classify as: Opportunity (positive signal for improvement), Blocker (barrier or pain point), or Consideration (neutral or context-dependent).
    - ANY code marked [LOW CONFIDENCE] must go into a category called exactly: "Flagged for Review"
    - Count per category: Opportunities, Blockers, Considerations.

    Format:
    Category: [Name]
    code → Opportunity/Blocker/Consideration
    Counts: Opportunities: X | Blockers: Y | Considerations: Z`

    : questionType === 'process' ?
    `You are a PhD Analyst performing thematic categorization for a PROCESS EVALUATION HR question.

    Codes extracted:
    ${codes}

    Instructions:
    - Group codes into themes representing process areas.
    - For each code classify as: Working Well (positive), Needs Improvement (negative), or Unclear (neutral/ambiguous).
    - ANY code marked [LOW CONFIDENCE] must go into a category called exactly: "Flagged for Review"
    - Count per category: Working Well, Needs Improvement, Unclear.

    Format:
    Category: [Name]
    code → Working Well/Needs Improvement/Unclear
    Counts: Working Well: X | Needs Improvement: Y | Unclear: Z`

    : questionType === 'exploration' ?
    `You are a PhD Analyst performing thematic categorization for an EXPLORATORY HR question.

    Codes extracted:
    ${codes}

    Instructions:
    - Group codes into emerging themes based on frequency and similarity.
    - For each code note: Prominent (appears frequently or strongly), Emerging (mentioned but less developed), or Peripheral (minor or isolated).
    - ANY code marked [LOW CONFIDENCE] must go into a category called exactly: "Flagged for Review"
    - Count per category: Prominent, Emerging, Peripheral.

    Format:
    Category: [Name]
    code → Prominent/Emerging/Peripheral
    Counts: Prominent: X | Emerging: Y | Peripheral: Z`

    :
    `You are a PhD Analyst performing thematic categorization for a SENTIMENT HR question.

    Codes extracted:
    ${codes}

    Instructions:
    - Group codes into themes. Assign each code to one theme.
    - Themes must be concise and descriptive (e.g. Planning & Clarity, Collaboration & Teams).
    - Classify sentiment for each code as Positive, Negative, or Neutral.
    - ANY code marked [LOW CONFIDENCE] must go into a category called exactly: "Flagged for Review"
    - Do not mix [LOW CONFIDENCE] codes into regular themes.
    - Count polarity per category.

    Format:
    Category: [Name]
    code → Polarity
    Counts: Positive: X | Negative: Y | Neutral: Z`

    const categorization = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt2Content }]
    })

    const categories = categorization.content[0].type === 'text' ? categorization.content[0].text : ''

    // Prompt 3: Executive synthesis — structured JSON, grounded in the
    // original responses so evidence quotes real comments (traceability).
    const typeGuidance = questionType === 'strategic'
      ? 'Frame priorities as strategic actions; category tags are Opportunity / Blocker / Consideration.'
      : questionType === 'process'
      ? 'Frame priorities as process changes; category tags are Working Well / Needs Improvement / Unclear.'
      : questionType === 'exploration'
      ? 'Frame priorities as areas to investigate; category tags are Prominent / Emerging / Peripheral.'
      : 'Frame priorities around employee sentiment; category tags are Positive / Negative / Neutral.'

    const synthesisPrompt = `You are a PhD Analyst producing a leadership-ready synthesis of an HR survey. ${typeGuidance}

Question: ${question}

Categorized themes (with per-category polarity counts):
${categories}

Original employee responses (numbered — you MUST quote from these verbatim for evidence):
${responseList}

Return a SINGLE JSON object with exactly this shape:
{
  "criticalFindings": { "headline": "one-line headline for leadership", "summary": "2-4 sentence executive synthesis leading with the most important finding" },
  "topPriorities": [ { "priority": "specific action to take", "urgency": "high" | "medium" | "low", "relatedCategory": "related theme name" } ],
  "categories": [ { "name": "theme name (match the categorized themes above)", "narrative": "1-2 sentences on what this theme shows", "strategicPriority": "the single most important action or watch-item for this theme", "evidence": [ { "originalComment": "a VERBATIM quote copied exactly from a numbered response above", "tag": "the assigned polarity/label" } ] } ]
}

Rules:
- Output ONLY the JSON object — no markdown, no code fences, no commentary.
- Lead with the conclusion: criticalFindings and topPriorities are the most important output.
- Provide 2-4 topPriorities, most urgent first.
- Include one category per theme above, using the same names.
- evidence[].originalComment MUST be copied exactly from the numbered original responses — never paraphrase, invent, or use extracted keywords. Include 1-3 representative quotes per category.
- Every insight must trace back to the data. No invented findings.`

    const summary = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 3000,
    messages: [{ role: 'user', content: synthesisPrompt }]
    })

    const synthesisText = summary.content[0].type === 'text' ? summary.content[0].text : ''

    // Parse the model's JSON defensively; the widest brace pair tolerates any
    // stray prose or code fences. null => couldn't parse.
    const extractJson = (s: string): any | null => {
      const start = s.indexOf('{')
      const end = s.lastIndexOf('}')
      if (start === -1 || end === -1 || end < start) return null
      try { return JSON.parse(s.slice(start, end + 1)) } catch { return null }
    }
    const llm = extractJson(synthesisText)

    // Per-category sentiment comes from the SAME shared computation the charts
    // use (parseThemes) — never from the model — so the numbers can't drift.
    const themes = parseThemes(categories)
    const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const llmCats: any[] = llm && Array.isArray(llm.categories) ? llm.categories : []
    const mergedCategories = themes.map(t => {
      const match = llmCats.find(c => c && norm(c.name) === norm(t.name)) || {}
      const evidence = Array.isArray(match.evidence)
        ? match.evidence
            .filter((e: any) => e && typeof e.originalComment === 'string' && e.originalComment.trim())
            .map((e: any) => ({ originalComment: e.originalComment, tag: typeof e.tag === 'string' ? e.tag : '' }))
            .slice(0, 3)
        : []
      return {
        name: t.name,
        sentiment: { positive: t.positive, negative: t.negative, neutral: t.neutral },
        narrative: typeof match.narrative === 'string' ? match.narrative : '',
        strategicPriority: typeof match.strategicPriority === 'string' ? match.strategicPriority : '',
        evidence,
      }
    })

    const validUrgency = (u: any) => (['high', 'medium', 'low'].includes(u) ? u : 'medium')
    const synthesis = {
      criticalFindings: {
        headline: typeof llm?.criticalFindings?.headline === 'string' && llm.criticalFindings.headline.trim()
          ? llm.criticalFindings.headline
          : 'Executive summary',
        summary: typeof llm?.criticalFindings?.summary === 'string' ? llm.criticalFindings.summary : '',
      },
      topPriorities: llm && Array.isArray(llm.topPriorities)
        ? llm.topPriorities
            .filter((p: any) => p && typeof p.priority === 'string' && p.priority.trim())
            .map((p: any) => ({
              priority: p.priority,
              urgency: validUrgency(p.urgency),
              relatedCategory: typeof p.relatedCategory === 'string' ? p.relatedCategory : '',
            }))
            .slice(0, 4)
        : [],
      categories: mergedCategories,
    }

    // Store structured JSON when parsing succeeded; otherwise keep the raw text
    // as a legacy string the dashboard can still render.
    const executiveSummary = llm ? JSON.stringify(synthesis) : synthesisText
    // Short readable text for the /analyze pipeline animation only.
    const summaryPreview = synthesis.criticalFindings.summary || synthesisText
    
    const tokenEstimate = responses.length * 150
    const costEstimate = (tokenEstimate * 3 * 0.000015).toFixed(4)

    // Save to Supabase
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await supabase.from('analyses').insert({
    question,
    response_count: responses.length,
    codes,
    categories,
    executive_summary: executiveSummary,
    cost_estimate: costEstimate,
    question_type: questionType
    })

    return NextResponse.json({ codes, categories, executiveSummary: summaryPreview, costEstimate, responseCount: responses.length, questionType })

} catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}