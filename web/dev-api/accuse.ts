// Dev implementation of POST /api/accuse. The Python backend in server/accuse.py is the same rules.
// The solution stays server-side: it is read from the gitignored case file and never reaches the client bundle.

type Claim = 'opportunity' | 'falseAlibi' | 'replica'
const CLAIMS: Claim[] = ['opportunity', 'falseAlibi', 'replica']

interface Solution {
  culprit: string
  claims: Record<Claim, { best: string[]; ok: string[] }>
  chain: string[]
}

export interface AccuseBody {
  culprit?: string
  evidence?: string[]
  timedOut?: boolean // the player ran out of time; an empty report is allowed
}

export interface AccuseContext {
  solution: Solution
  ip: string
}

type Result = { status: number; json: unknown }

const MAX_RECORDS = 3
const hits = new Map<string, number[]>()

function rateLimited(ip: string) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000)
  recent.push(now)
  hits.set(ip, recent)
  return recent.length > 12
}

export async function handleAccuse(body: AccuseBody, ctx: AccuseContext): Promise<Result> {
  if (rateLimited(ctx.ip)) return { status: 429, json: { error: 'Too many reports. Wait a minute and try again.' } }
  const { solution } = ctx
  const culprit = String(body.culprit ?? '')
  const picked = [...new Set((Array.isArray(body.evidence) ? body.evidence : []).map(String))].slice(0, MAX_RECORDS)
  const timedOut = body.timedOut === true
  if (!culprit && !timedOut) return { status: 400, json: { error: 'Name a suspect first.' } }

  const culpritCorrect = culprit === solution.culprit
  let supported = true
  for (const c of CLAIMS) {
    const rule = solution.claims[c]
    const hasBest = rule.best.some((id) => picked.includes(id))
    const hasOk = rule.ok.some((id) => picked.includes(id))
    if (!hasBest && !hasOk) supported = false
  }

  const verdict = culpritCorrect ? (supported ? 'solved' : 'partial') : 'incorrect'
  const rating =
    timedOut && verdict !== 'solved'
      ? 'Out of time'
      : verdict === 'incorrect'
        ? 'Case unsolved'
        : verdict === 'partial'
          ? 'Right suspect, thin case'
          : 'Case solved'

  return {
    status: 200,
    json: {
      ok: true,
      verdict,
      rating,
      culprit: solution.culprit,
      explanation: solution.chain,
    },
  }
}
