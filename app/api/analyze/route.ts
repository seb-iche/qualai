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

For each response segment, create a code containing 3–5 keywords using only words from the original comment. Each code on a separate line, no bullets or numbers.`
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

Group these codes into themes. For each code label sentiment as Positive, Negative, or Neutral.

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

    return NextResponse.json({ codes, categories, executiveSummary, costEstimate, responseCount: responses.length })

} catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}