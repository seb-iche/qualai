import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export async function POST(request: NextRequest) {
  const { question, responses } = await request.json()

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

    // Prompt 2: Categorization
    const categorization = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are a PhD Analyst with over 20 years of experience in HR and qualitative analysis, performing thematic categorization.

Codes extracted:
${codes}

Instructions:
- Group codes into themes. Assign each code to one theme.
- Themes must be concise and descriptive (e.g. Planning & Clarity, Collaboration & Teams).
- Classify sentiment for each code as Positive, Negative, or Neutral.
- ANY code marked [LOW CONFIDENCE] must be grouped into a separate category called exactly: "Flagged for Review"
- Do not mix [LOW CONFIDENCE] codes into regular themes.
- Count polarity per category.


Format:
Category: [Name]
code → Polarity
Counts: Positive: X | Negative: Y | Neutral: Z`
      }]
    })

    const categories = categorization.content[0].type === 'text' ? categorization.content[0].text : ''

    // Prompt 3: Executive Summary
    const summary = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are a PhD Analyst with over 20 years of experience in HR and qualitative analysis, performing thematic summarization.

Question: ${question}

Categorized themes:
${categories}

Produce a thematic summary per category and a 2-3 paragraph executive synthesis for HR leadership. Stay grounded in the data — no invented insights.`
      }]
    })

    const executiveSummary = summary.content[0].type === 'text' ? summary.content[0].text : ''

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
    cost_estimate: costEstimate
    })

    return NextResponse.json({ codes, categories, executiveSummary, costEstimate, responseCount: responses.length })

} catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}