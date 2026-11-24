import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Load backend/.env (if present) into process.env using Node's built-in loader. */
export function loadEnv() {
  const file = path.join(ROOT, 'backend', '.env')
  if (existsSync(file)) process.loadEnvFile(file)
}
