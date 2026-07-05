const required = [
  'AUTH_SECRET',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
]

const placeholderPattern = /^(dummy|example|changeme|change-me|placeholder|test)$/i

const errors = []

for (const name of required) {
  const value = process.env[name]?.trim()
  if (!value) {
    errors.push(`${name} is required`)
    continue
  }

  if (placeholderPattern.test(value) || value.toLowerCase().includes('dummy')) {
    errors.push(`${name} must not use a placeholder value`)
  }
}

const authSecret = process.env.AUTH_SECRET?.trim()
if (authSecret && authSecret.length < 32) {
  errors.push('AUTH_SECRET must have at least 32 characters')
}

const emailFrom = process.env.EMAIL_FROM?.trim()
if (emailFrom && !emailFrom.includes('@')) {
  errors.push('EMAIL_FROM must be a valid sender email address')
}

if (errors.length > 0) {
  console.error('Required CI/production environment variables are not configured:')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  console.error('Configure these in GitHub Actions secrets/variables before deploying.')
  process.exit(1)
}

console.log('Required CI/production environment variables are configured.')
