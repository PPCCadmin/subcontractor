// Local development: runs the API server (saving to ./.data) and the Vite dev
// server together. Ctrl+C stops both.
import { spawn } from 'node:child_process'

const env = { ...process.env, PORT: '3001', DATA_DIR: process.env.DATA_DIR || '.data' }
const children = [
  spawn('npm', ['run', 'dev:api'], { stdio: 'inherit', shell: true, env }),
  spawn('npm', ['run', 'dev:web'], { stdio: 'inherit', shell: true }),
]

const stop = () => children.forEach(child => child.kill())
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
children.forEach(child => child.on('exit', code => { stop(); process.exitCode = code ?? 0 }))
