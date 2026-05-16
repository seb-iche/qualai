import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

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

console.log('Prompt 0 raw response:', typeDetection.content[0])

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

    // Prompt 3: Executive Summary — branched by question type
    const prompt3Content = questionType === 'strategic' ?
    `You are a PhD Analyst producing a strategic HR synthesis.

    Question: ${question}

    Categorized themes:
    ${categories}

    Produce a thematic summary per category focused on strategic priorities. Then write a 2-3 paragraph executive synthesis for HR leadership that identifies the top priorities to act on, the key blockers to address, and specific recommended next steps. Stay grounded in the data — no invented insights.`

    : questionType === 'process' ?
    `You are a PhD Analyst producing a process evaluation HR synthesis.

    Question: ${question}

    Categorized themes:
    ${categories}

    Produce a thematic summary per category focused on process effectiveness. Then write a 2-3 paragraph executive synthesis for HR leadership that identifies what is working well and should be preserved, what needs immediate improvement, and specific process changes recommended. Stay grounded in the data — no invented insights.`

    : questionType === 'exploration' ?
    `You are a PhD Analyst producing an exploratory HR synthesis.

    Question: ${question}

    Categorized themes:
    ${categories}

    Produce a thematic summary per category identifying emerging patterns. Then write a 2-3 paragraph executive synthesis for HR leadership that maps the landscape of themes discovered, highlights the most prominent signals, and suggests areas for deeper investigation. Stay grounded in the data — no invented insights.`

    :
    `You are a PhD Analyst performing thematic summarization for a sentiment HR question.

    Question: ${question}

    Categorized themes:
    ${categories}

    Produce a thematic summary per category and a 2-3 paragraph executive synthesis for HR leadership. Stay grounded in the data — no invented insights.`

    const summary = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt3Content }]
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
    cost_estimate: costEstimate,
    question_type: questionType
    })

    return NextResponse.json({ codes, categories, executiveSummary, costEstimate, responseCount: responses.length, questionType })

} catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}