import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// A release carries the complete maa-tools installation's node_modules tree,
// including Maa Node's native libraries and transitive dependencies.
export function findMaaNode({
  projectRoot = path.resolve(import.meta.dirname, '..'),
  homeDir = os.homedir(),
  server = false,
} = {}) {
  const entryName = server ? 'index-server.js' : 'index-client.js'
  const entryAt = root => path.join(root, 'node_modules', '@maaxyz', 'maa-node', 'dist', entryName)
  const bundledRoot = path.join(projectRoot, 'runtimes', 'maa')
  if (fs.existsSync(bundledRoot)) {
    const entry = entryAt(bundledRoot)
    if (!fs.existsSync(entry)) throw new Error('包内 MaaFramework 运行库不完整，缺少：' + entry)
    return entry
  }

  const installRoot = path.join(homeDir, '.maa-tools', 'install')
  const candidates = ['latest', '5.13.0']
  if (fs.existsSync(installRoot)) {
    candidates.push(...fs.readdirSync(installRoot, {withFileTypes: true})
      .filter(item => item.isDirectory() && !candidates.includes(item.name))
      .map(item => item.name)
      .sort((left, right) => right.localeCompare(left, undefined, {numeric: true})))
  }
  for (const version of candidates) {
    const entry = entryAt(path.join(installRoot, version))
    if (fs.existsSync(entry)) return entry
  }
  throw new Error('没有找到 MaaFramework 运行库。请使用完整发行包，或在源码目录执行：node_modules\\.bin\\maa-tools.cmd check')
}
