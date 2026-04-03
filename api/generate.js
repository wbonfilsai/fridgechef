import Anthropic from '@anthropic-ai/sdk'

export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-key-here') {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY non configurée.'
    })
  }

  const { prompt } = req.body
  if (!prompt || typeof prompt !== 'string' || prompt.length > 8000) {
    return res.status(400).json({ error: 'Prompt invalide.' })
  }

  // Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const send = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`)

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const stream = client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
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
