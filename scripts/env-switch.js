#!/usr/bin/env node

import { readFile, writeFile, access, constants } from 'fs/promises'
import { join } from 'path'

const ENVIRONMENTS = {
  production: '.clasp.prod.json',
  test: '.clasp.test.json',
}

const TARGET_FILE = '.clasp.json'

async function fileExists(filePath) {
  try {
    await access(filePath, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function switchEnvironment(env) {
  if (!ENVIRONMENTS[env]) {
    console.error(`❌ Unknown environment: ${env}`)
    console.error(
      `Available environments: ${Object.keys(ENVIRONMENTS).join(', ')}`,
    )
    process.exit(1)
  }

  const sourceFile = ENVIRONMENTS[env]

  if (!(await fileExists(sourceFile))) {
    console.error(`❌ Environment file not found: ${sourceFile}`)
    process.exit(1)
  }

  try {
    const config = await readFile(sourceFile, 'utf8')

    // Validate JSON before writing
    let parsed
    try {
      parsed = JSON.parse(config)
    } catch (parseError) {
      console.error(`❌ Invalid JSON in ${sourceFile}: ${parseError.message}`)
      process.exit(1)
    }

    // Validate required fields
    if (!parsed.scriptId) {
      console.error(`❌ Missing scriptId in ${sourceFile}`)
      process.exit(1)
    }

    await writeFile(TARGET_FILE, config)

    console.log(`✅ Switched to ${env} environment`)
    console.log(`📱 Script ID: ${parsed.scriptId}`)
  } catch (error) {
    console.error(`❌ Error switching environment: ${error.message}`)
    process.exit(1)
  }
}

async function getCurrentEnvironment() {
  try {
    if (!(await fileExists(TARGET_FILE))) {
      return 'unknown'
    }

    const currentConfig = JSON.parse(await readFile(TARGET_FILE, 'utf8'))

    for (const [env, file] of Object.entries(ENVIRONMENTS)) {
      if (await fileExists(file)) {
        try {
          const envConfig = JSON.parse(await readFile(file, 'utf8'))
          if (envConfig.scriptId === currentConfig.scriptId) {
            return env
          }
        } catch {
          // Skip malformed config files
          continue
        }
      }
    }

    return 'unknown'
  } catch (error) {
    console.error(`⚠️  Error reading current environment: ${error.message}`)
    return 'unknown'
  }
}

// Main execution
const command = process.argv[2]
const env = process.argv[3]

async function main() {
  try {
    if (command === 'switch' && env) {
      await switchEnvironment(env)
    } else if (command === 'current') {
      const current = await getCurrentEnvironment()
      console.log(`📍 Current environment: ${current}`)

      if (await fileExists(TARGET_FILE)) {
        try {
          const config = JSON.parse(await readFile(TARGET_FILE, 'utf8'))
          console.log(`📱 Script ID: ${config.scriptId}`)
        } catch (error) {
          console.error(`⚠️  Error reading current config: ${error.message}`)
        }
      }
    } else {
      console.log('Usage:')
      console.log('  node scripts/env-switch.js switch <environment>')
      console.log('  node scripts/env-switch.js current')
      console.log('')
      console.log('Available environments:')
      Object.keys(ENVIRONMENTS).forEach((env) => {
        console.log(`  - ${env}`)
      })
    }
  } catch (error) {
    console.error(`❌ Unexpected error: ${error.message}`)
    process.exit(1)
  }
}

main()
