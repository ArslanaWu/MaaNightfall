import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {registerActions} from './custom_actions.mjs'
function findMaaNode() {
  const installRoot = path.join(os.homedir(), '.maa-tools', 'install')
  const candidates = ['latest', '5.13.0']

  if (fs.existsSync(installRoot)) {
    const otherVersions = fs
      .readdirSync(installRoot, { withFileTypes: true })
      .filter((item) => item.isDirectory() && !candidates.includes(item.name))
      .map((item) => item.name)
      .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }))
    candidates.push(...otherVersions)
  }

  for (const version of candidates) {
    const entry = path.join(installRoot, version, 'node_modules', '@maaxyz', 'maa-node', 'dist', 'index-client.js')
    if (fs.existsSync(entry)) return entry
  }

  throw new Error('没有找到 MaaFramework 运行库。请先在项目目录执行：node_modules\\.bin\\maa-tools.cmd check')
}

await import(pathToFileURL(findMaaNode().replace('index-client.js','index-server.js')).href)
registerActions(maa.Server,path.resolve(import.meta.dirname,'..'))
if(!await maa.Server.start_up(process.argv.at(-1)))throw Error('Agent 启动失败')
await maa.Server.join()
await maa.Server.shut_down()
