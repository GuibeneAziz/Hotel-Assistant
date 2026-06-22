#!/usr/bin/env node
// Script to generate bcrypt password hash for admin password
// Usage: node scripts/hash-password.js <password>

const bcrypt = require('bcryptjs')

const SALT_ROUNDS = 12

async function main() {
  const password = process.argv[2]

  if (!password) {
    console.error('❌ Error: Password argument is required')
    console.log('\nUsage: node scripts/hash-password.js <password>')
    console.log('\nExample: node scripts/hash-password.js MySecurePassword123!')
    process.exit(1)
  }

  // Validate password strength
  const errors = []
  
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  if (errors.length > 0) {
    console.error('❌ Password does not meet requirements:')
    errors.forEach(err => console.error(`   - ${err}`))
    process.exit(1)
  }

  console.log('🔐 Generating password hash...')
  
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS)
    
    console.log('\n✅ Password hash generated successfully!')
    console.log('\n📋 Add this to your .env file:')
    console.log('─'.repeat(60))
    console.log(`ADMIN_PASSWORD_HASH=${hash}`)
    console.log('─'.repeat(60))
    console.log('\n⚠️  IMPORTANT:')
    console.log('   - Keep this hash secure')
    console.log('   - Never commit .env to version control')
    console.log('   - Use different passwords for different environments')
    console.log('\n✅ Done!')
  } catch (error) {
    console.error('❌ Error generating hash:', error.message)
    process.exit(1)
  }
}

main()
