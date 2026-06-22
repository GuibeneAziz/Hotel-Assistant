#!/usr/bin/env node
/**
 * Smoke tests for the Docker deployment stack.
 * Usage: npm run docker:verify
 */

const APP_URL = process.env.APP_URL || 'http://localhost:3001'

const checks = []

function pass(name, detail) {
  checks.push({ name, ok: true, detail })
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`)
}

function fail(name, detail) {
  checks.push({ name, ok: false, detail })
  console.error(`❌ ${name}${detail ? ` — ${detail}` : ''}`)
}

async function fetchJson(path) {
  const response = await fetch(`${APP_URL}${path}`)
  const body = await response.json().catch(() => null)
  return { status: response.status, body }
}

async function main() {
  console.log(`\n🔍 Vérification Docker — ${APP_URL}\n`)

  try {
    const home = await fetch(APP_URL)
    if (home.status === 200) pass('Page d\'accueil', `HTTP ${home.status}`)
    else fail('Page d\'accueil', `HTTP ${home.status}`)
  } catch (error) {
    fail('Page d\'accueil', error.message)
  }

  try {
    const { status, body } = await fetchJson('/api/chat')
    if (status !== 200 || !body?.success) {
      fail('API /api/chat', `HTTP ${status}`)
    } else {
      const { redisConfigured, aiConfigured } = body.data || {}
      pass('API /api/chat', `redis=${redisConfigured}, ai=${aiConfigured}`)
      if (!redisConfigured) fail('Redis', 'non configuré dans le conteneur app')
      if (!aiConfigured) fail('IA', 'non configurée — vérifier AI_PROVIDER / Ollama / Groq')
    }
  } catch (error) {
    fail('API /api/chat', error.message)
  }

  try {
    const { status, body } = await fetchJson('/api/hotel-settings')
    if (status !== 200 || !body?.success) {
      fail('API /api/hotel-settings', `HTTP ${status}`)
    } else {
      const hotels = body.data || {}
      const count = Object.keys(hotels).length
      if (count >= 3) pass('Hôtels en base', `${count} hôtels`)
      else fail('Hôtels en base', `${count} hôtel(s) — attendu ≥ 3`)

      const sample = hotels['sindbad-hammamet']
      const dinner = sample?.restaurant?.dinner
      if (dinner?.start && dinner?.available) {
        pass('Horaires restaurant', `dîner ${dinner.start}–${dinner.end}`)
      } else {
        fail('Horaires restaurant', 'manquants — lancer npm run docker:seed-settings')
      }

      const attractions = sample?.nearbyAttractions?.length || 0
      if (attractions >= 10) pass('Attractions à proximité', `${attractions} pour Sindbad`)
      else fail('Attractions à proximité', `${attractions} — lancer npm run docker:seed`)
    }
  } catch (error) {
    fail('API /api/hotel-settings', error.message)
  }

  try {
    const login = await fetch(`${APP_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: '__invalid__' }),
    })
    if (login.status === 401) pass('Admin login endpoint', 'répond 401 pour mot de passe invalide')
    else fail('Admin login endpoint', `HTTP ${login.status} (attendu 401)`)
  } catch (error) {
    fail('Admin login endpoint', error.message)
  }

  const failed = checks.filter((c) => !c.ok)
  console.log('')
  if (failed.length === 0) {
    console.log('🎉 Stack Docker prête pour le déploiement.\n')
    process.exit(0)
  }

  console.log(`⚠️  ${failed.length} problème(s) à corriger avant production.\n`)
  process.exit(1)
}

main()
