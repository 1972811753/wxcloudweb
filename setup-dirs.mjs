import { mkdirSync } from 'fs'
const base = 'D:/WorkSpace/PrivareProject/wxcloudweb'
const dirs = [
  'apps/bigscreen/src/scenes',
  'apps/bigscreen/src/components/galaxy',
  'apps/bigscreen/src/components/danmu',
  'apps/bigscreen/src/components/lottery',
  'apps/bigscreen/src/components/climax',
  'apps/bigscreen/src/stores',
  'apps/bigscreen/src/hooks',
  'apps/mobile/src/views',
  'apps/mobile/src/components',
  'apps/mobile/src/stores',
  'apps/mobile/src/utils',
  'apps/mock-server/src',
  'packages/shared-types/src',
  'packages/shared-hooks/src',
]
dirs.forEach(d => mkdirSync(`${base}/${d}`, { recursive: true }))
console.log('All directories created.')
