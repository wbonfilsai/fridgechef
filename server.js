import { config } from 'dotenv'
config({ override: true })   // override even if ANTHROPIC_API_KEY is set empty in the shell
import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'

const app  = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }))
app.use(express.json({ limit: '32kb' }))

/* ── Health check ── */
app.get('/api/health', (_req, res) => res.json({ ok: true }))

/* ── Recipe generation (SSE streaming) ── */
app.post('/api/generate', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-key-here') {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY non configurée. Ajoutez votre clé dans le fichier .env et redémarrez le serveur.'
    })
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
  res.flushHeaders()

  const send = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`)

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const stream = client.messages.stream({
    model: safeModel,
    max_tokens: safeMaxTokens,
    messages: [{ role: 'user', content: prompt }],
  })

  // Abort Anthropic stream when the *response* connection closes (client navigates away)
  // Using res.on('close') is correct for SSE — req.on('close') fires too early
  // (right after flushHeaders when the request body is fully consumed).
  res.on('close', () => stream.abort())

  stream.on('text', (delta) => send({ text: delta }))

  try {
    await stream.finalMessage()
    res.write('data: [DONE]\n\n')
  } catch (err) {
    // The SDK throws APIUserAbortError (not a standard AbortError) when stream.abort() is called
    const isAbort = err.name === 'AbortError'
                 || err.name === 'APIUserAbortError'
                 || err.message?.toLowerCase().includes('abort')
    if (!isAbort) {
      const msg =
        err.status === 401 ? 'Clé API invalide (401). Vérifiez votre ANTHROPIC_API_KEY.' :
        err.status === 429 ? 'Limite de requêtes Anthropic atteinte (429). Réessayez dans un moment.' :
        err.message || 'Erreur serveur.'
      send({ error: msg })
    }
  } finally {
    res.end()
  }
})

/* ── Ingredient check (JSON, non-streaming) ── */
app.post('/api/check-ingredients', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-key-here') {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurée.' })
  }

  const { recipeName, recipeCuisine, userIngredients, people, cookingTime, dietary } = req.body
  if (!recipeName || typeof recipeName !== 'string' || !recipeCuisine) {
    return res.status(400).json({ error: 'Données invalides.' })
  }

  const userIngList = Array.isArray(userIngredients)
    ? userIngredients.map(i => `- ${i}`).join('\n')
    : '(non précisés)'

  const timeLabels = { express: '15 minutes', rapide: '30 minutes', normal: '45 minutes', leisurely: '1 heure ou plus' }
  const timeLabel = timeLabels[cookingTime] || '45 minutes'
  const dietLine = dietary && typeof dietary === 'string' && dietary.length < 200
    ? `\nContraintes: ${dietary}.` : ''

  const prompt = `Recette "${recipeName}" (${recipeCuisine}), ${people} pers., ${timeLabel}.${dietLine}
Ingrédients déjà disponibles :
${userIngList}

Réponds UNIQUEMENT avec un JSON — max 6 ingrédients complémentaires manquants. Si rien ne manque : [].
[{"name":"Ail","emoji":"🧄","note":"3 gousses"}]`

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = message.content[0].text
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return res.json({ ingredients: [] })
    const ingredients = JSON.parse(match[0])
    res.json({ ingredients: Array.isArray(ingredients) ? ingredients : [] })
  } catch (err) {
    const msg =
      err.status === 401 ? 'Clé API invalide.' :
      err.status === 429 ? 'Limite de requêtes atteinte.' :
      err.message || 'Erreur serveur.'
    res.status(500).json({ error: msg })
  }
})

/* ── Meal Plan generation (JSON, non-streaming) ── */
app.post('/api/meal-plan', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-key-here') {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurée.' })
  }

  const { prompt } = req.body
  if (!prompt || typeof prompt !== 'string' || prompt.length > 8000) {
    return res.status(400).json({ error: 'Prompt invalide.' })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = message.content[0].text
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return res.json({ plan: null, error: 'Format invalide.' })
    const plan = JSON.parse(match[0])
    res.json({ plan })
  } catch (err) {
    const msg =
      err.status === 401 ? 'Clé API invalide.' :
      err.status === 429 ? 'Limite de requêtes atteinte.' :
      err.message || 'Erreur serveur.'
    res.status(500).json({ error: msg })
  }
})

app.listen(PORT, () => {
  console.log(`\n🍳 FridgeChef backend → http://localhost:${PORT}`)
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-key-here') {
    console.warn('⚠️  ANTHROPIC_API_KEY manquante dans .env !\n')
  } else {
    console.log('✅ Clé API chargée depuis .env\n')
  }
})
