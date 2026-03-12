const express = require('express')
const path = require('path')

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}
const app = express()
const PORT = process.env.PORT || 3000
app.use(express.json())
app.use(express.static('public'))

const { createClient } = require('@supabase/supabase-js')
const stripeLib = require('stripe')
const stripe = process.env.STRIPE_SECRET_KEY ? stripeLib(process.env.STRIPE_SECRET_KEY) : null
const Anthropic = require('@anthropic-ai/sdk')

let supabase
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
}
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
console.log('SUPABASE_URL:', process.env.SUPABASE_URL)
// Generate Lua code
app.post('/api/generate', async (req, res) => {
  const { genre, theme, description } = req.body

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Generate a complete, working Roblox Lua script for a ${genre} game with the theme "${theme}". ${description ? 'Additional details: ' + description : ''}
      
      Include:
      - Complete game logic
      - Player systems
      - Monetization with game passes
      - Leaderboard system
      - Professional code structure with comments
      
      Return ONLY the Lua code, no explanations.`
    }]
  })

  res.json({ code: message.content[0].text })
})
// Create checkout session
app.post('/api/create-checkout', async (req, res) => {
  const { plan } = req.body
  
  const prices = {
    pro: 2900,
    studio: 5900
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: plan === 'pro' ? 'DevRift Pro' : 'DevRift Studio',
        },
        unit_amount: prices[plan],
        recurring: { interval: 'month' }
      },
      quantity: 1,
    }],
    mode: 'subscription',
    success_url: 'http://localhost:3000/devrift-dashboard.html?payment=success',
    cancel_url: 'http://localhost:3000/devrift-pricing.html',
  })

  res.json({ url: session.url })
})
// Test route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'devrift-final.html'))
})

// Register user
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return res.status(400).json({ error: error.message })
  res.json({ user: data.user })
})

// Login user
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return res.status(400).json({ error: error.message })
  res.json({ session: data.session })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
})