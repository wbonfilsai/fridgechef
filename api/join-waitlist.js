import { createClient } from '@supabase/supabase-js'

export const config = { maxDuration: 30 }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers['authorization']
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = authHeader.slice(7)
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  try {
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return res.status(401).json({ error: 'Invalid token' })

    const { data: profile } = await supabase
      .from('profiles')
      .select('waitlist_joined')
      .eq('id', user.id)
      .single()

    if (profile?.waitlist_joined) {
      return res.status(400).json({ error: 'already_joined' })
    }

    const expiry = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        bonus_generations: 10,
        bonus_expiry: expiry,
        waitlist_joined: true,
      })
      .eq('id', user.id)

    if (updateErr) throw updateErr

    res.json({ success: true, bonus: 10, expiry })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' })
  }
}
