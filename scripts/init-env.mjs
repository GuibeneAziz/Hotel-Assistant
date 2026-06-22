#!/usr/bin/env node
/**
 * Copy .env.example → .env if .env does not exist yet.
 */
import { copyFileSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const examplePath = path.join(root, '.env.example')
const envPath = path.join(root, '.env')

if (existsSync(envPath)) {
  console.log('✅ .env already exists — edit it directly (see .env.example for all variables)')
  process.exit(0)
}

if (!existsSync(examplePath)) {
  console.error('❌ Missing .env.example')
  process.exit(1)
}

copyFileSync(examplePath, envPath)
console.log('✅ Created .env from .env.example — fill in your secrets before running the app')
