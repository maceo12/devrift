const express = require('express')
const path = require('path')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')
const stripeLib = require('stripe')
const Anthropic = require('@anthropic-ai/sdk')

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(cors({ origin: '*' }))
app.use(express.static('public'))

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xqejbamnakovaxksctsi.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_wKy4pUESJJnfMQ0sQDF7kw_l8bFMaqM'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const stripe = process.env.STRIPE_SECRET_KEY ? stripeLib(process.env.STRIPE_SECRET_KEY) : null
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

app.post('/api/generate', async (req, res) => {
  try {
    const { genre, theme, description } = req.body
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: `Generate a complete, working Roblox Lua game: a ${genre} game with the theme "${theme}".
${description ? 'Additional details:\n' + description : ''}

CRITICAL RULES FOR CODE STRUCTURE:
You MUST separate the code into distinct scripts, each labeled with a marker comment on its own line indicating WHERE to place it in Roblox Studio. Use EXACTLY these marker formats:

-- [ServerScriptService] MainGameScript
-- [StarterPlayerScripts] ClientScript
-- [ReplicatedStorage] SharedModule
-- [ServerStorage] DataModule
-- [StarterGui] GuiScript

Each marker MUST:
1. Be on its own line
2. Start with "-- [" followed by the exact Roblox service name and "]"
3. Include a short script name after the bracket

Between each script section, add a blank line separator.

REQUIREMENTS FOR THE GAME:
- Complete game logic split properly between server and client
- Player data / leaderstats (ServerScriptService)
- Client-side UI and controls (StarterPlayerScripts or StarterGui)
- Shared modules/configs in ReplicatedStorage
- Monetization with game passes
- Leaderboard system
- Professional code structure with comments explaining each section

Use at least 2 different services (ServerScriptService + one other minimum).

Return ONLY the Lua code with the markers. No explanations, no markdown, no backticks.` }]
    })
    res.json({ code: message.content[0].text })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/create-checkout', async (req, res) => {
  try {
    const { plan } = req.body
    const prices = { pro: 2900, studio: 5900 }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price_data: { currency: 'usd', product_data: { name: plan === 'pro' ? 'DevRift Pro' : 'DevRift Studio' }, unit_amount: prices[plan], recurring: { interval: 'month' } }, quantity: 1 }],
      mode: 'subscription',
      success_url: 'https://devrifty.vercel.app/devrift-dashboard.html?payment=success',
      cancel_url: 'https://devrifty.vercel.app/devrift-pricing.html',
    })
    res.json({ url: session.url })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'devrift-final.html'))
})

app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return res.status(400).json({ error: error.message })
    res.json({ user: data.user })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return res.status(400).json({ error: error.message })
    res.json({ session: data.session })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})