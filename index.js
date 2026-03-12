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

let supabase
setTimeout(() => {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  )
}, 0)
const stripe = stripeLib(process.env.STRIPE_SECRET_KEY)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

app.post('/api/generate', async (req, res) => {
  try {
    const { genre, theme, description } = req.body
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: `Generate a complete, working Roblox Lua script for a ${genre} game with the theme "${theme}". ${description ? 'Additional details: ' + description : ''} Include: Complete game logic, Player systems, Monetization with game passes, Leaderboard system, Professional code structure with comments. Return ONLY the Lua code, no explanations.` }]
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