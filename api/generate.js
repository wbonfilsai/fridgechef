import Anthropic from '@anthropic-ai/sdk'
import { Redis } from '@upstash/redis'
import { createClient } from '@supabase/supabase-js'

export const config = { maxDuration: 300 }

const ANON_LIMIT = 3
const WEEK_SECONDS = 604800

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-key-here') {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurée.' })
  }

  // Rate limiting: check if user is authenticated
  const authHeader = req.headers['authorization']
  const isAuthenticated = authHeader && authHeader.startsWith('Bearer ') && authHeader.length > 20

  // Check bonus generations for authenticated users
  let bonusRemaining = null
  if (isAuthenticated && process.env.VITE_SUPABASE_URL) {
    try {
      const token = authHeader.slice(7)
      const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      })
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('bonus_generations, bonus_expiry').eq('id', user.id).single()
        if (profile) {
          const expiry = profile.bonus_expiry ? new Date(profile.bonus_expiry).getTime() : 0
          if (expiry < Date.now() && profile.bonus_generations > 0) {
            // Expired, reset
            await supabase.from('profiles').update({ bonus_generations: 0 }).eq('id', user.id)
          } else if (profile.bonus_generations > 0 && expiry > Date.now()) {
            // Decrement bonus
            bonusRemaining = profile.bonus_generations - 1
            await supabase.from('profiles').update({ bonus_generations: bonusRemaining }).eq('id', user.id)
          }
        }
      }
    } catch (e) {
      console.error('[generate] bonus check error:', e.message)
    }
  }

  if (!isAuthenticated && process.env.KV_REST_API_URL) {
    try {
      const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })
      const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim()
      const key = `anon_gen:${ip}`

      const data = await redis.get(key)

      if (!data) {
        await redis.set(key, { count: 1, first_gen: Date.now() }, { ex: WEEK_SECONDS })
      } else {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data
        if (parsed.count >= ANON_LIMIT) {
          const resetIn = parsed.first_gen + (WEEK_SECONDS * 1000) - Date.now()
          return res.status(429).json({
            error: 'limit_reached',
            message_fr: 'Tu as utilisé tes 3 recettes offertes cette semaine. Crée un compte gratuit pour continuer.',
            message_en: "You've used your 3 free recipes this week. Create a free account to continue.",
            reset_in: Math.max(0, resetIn),
          })
        }
        await redis.set(key, { count: parsed.count + 1, first_gen: parsed.first_gen }, { ex: WEEK_SECONDS })
      }
    } catch (kvErr) {
      // If KV fails, allow the request (fail open)
      console.error('KV rate limit error:', kvErr.message)
    }
  }

  const { prompt, model, maxTokens } = req.body
  if (!prompt || typeof prompt !== 'string' || prompt.length > 8000) {
    return res.status(400).json({ error: 'Prompt invalide.' })
  }

  const ALLOWED_MODELS = ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5-20251001']
  const safeModel     = ALLOWED_MODELS.includes(model) ? model : 'claude-sonnet-4-6'
  const safeMaxTokens = Math.min(Math.max(100, parseInt(maxTokens) || 2000), 4096)

  // Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  if (bonusRemaining !== null) res.setHeader('X-Bonus-Remaining', String(bonusRemaining))
  res.flushHeaders()

  const send = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`)
  if (bonusRemaining !== null) send({ bonusRemaining })

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const stream = client.messages.stream({
    model: safeModel,
    max_tokens: safeMaxTokens,
    messages: [{ role: 'user', content: prompt }],
  })

  res.on('close', () => stream.abort())

  stream.on('text', (delta) => send({ text: delta }))

  try {
    await stream.finalMessage()
    res.write('data: [DONE]\n\n')
  } catch (err) {
    const isAbort = err.name === 'AbortError'
                 || err.name === 'APIUserAbortError'
                 || err.message?.toLowerCase().includes('abort')
    if (!isAbort) {
      const msg =
        err.status === 401 ? 'Clé API invalide (401).' :
        err.status === 429 ? 'Limite de requêtes atteinte (429).' :
        err.message || 'Erreur serveur.'
      send({ error: msg })
    }
  } finally {
    res.end()
  }
}
