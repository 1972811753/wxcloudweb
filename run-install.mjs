import { spawnSync } from 'child_process'

const result = spawnSync('pnpm', ['install', '--no-frozen-lockfile'], {
  cwd: 'D:/WorkSpace/PrivareProject/wxcloudweb',
  encoding: 'utf8',
  shell: true,
  timeout: 180000,
})

console.log('status:', result.status)
console.log('stdout:', result.stdout?.slice(0, 3000))
console.log('stderr:', result.stderr?.slice(0, 2000))
if (result.error) console.log('error:', result.error.message)

