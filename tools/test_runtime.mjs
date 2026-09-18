import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import {findMaaNode} from './runtime.mjs'

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ymzx-runtime-'))
const projectRoot = path.join(temp, 'portable package with spaces')
const homeDir = path.join(temp, 'home')
const options = {projectRoot, homeDir}
const entryAt = (root, server=false) => path.join(root, 'node_modules/@maaxyz/maa-node/dist', server?'index-server.js':'index-client.js')
const make = filename => { fs.mkdirSync(path.dirname(filename), {recursive:true}); fs.writeFileSync(filename, '') }
const cache = version => path.join(homeDir, '.maa-tools/install', version)
const bundled = path.join(projectRoot, 'runtimes/maa')
try {
  assert.throws(() => findMaaNode(options), /没有找到/)
  make(entryAt(cache('5.9.0')))
  make(entryAt(cache('5.14.0')))
  assert.equal(findMaaNode(options), entryAt(cache('5.14.0')))
  make(entryAt(cache('5.13.0')))
  assert.equal(findMaaNode(options), entryAt(cache('5.13.0')))
  make(entryAt(cache('latest')))
  assert.equal(findMaaNode(options), entryAt(cache('latest')))
  make(entryAt(bundled))
  assert.equal(findMaaNode(options), entryAt(bundled))
  assert.throws(() => findMaaNode({...options,server:true}), /包内.*不完整/)
  make(entryAt(bundled,true))
  assert.equal(findMaaNode({...options,server:true}), entryAt(bundled,true))
  fs.unlinkSync(entryAt(bundled))
  assert.throws(() => findMaaNode(options), /包内.*不完整/)

  if (process.platform === 'win32') {
    const helper=path.resolve(import.meta.dirname,'resolve_node.ps1')
    const quoted=value=>"'"+value.replaceAll("'","''")+"'"
    const shell=path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe')
    const resolve=()=>execFileSync(shell,['-NoProfile','-Command',
      "$ErrorActionPreference='Stop'; . "+quoted(helper)+"; Resolve-ProjectNode -ProjectRoot "+quoted(projectRoot)
    ],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()
    const fallback=resolve()
    assert.ok(fs.existsSync(fallback))
    const bundledNode=path.join(projectRoot,'runtimes/node/node.exe')
    make(bundledNode)
    assert.equal(resolve(),bundledNode)
    fs.unlinkSync(bundledNode)
    assert.throws(resolve, /Bundled Node.js is incomplete/)
  }
  console.log('PASS 包内优先、缓存回退、Agent 入口、缺失报错及含空格路径')
} finally {
  const resolved=path.resolve(temp)
  if (!resolved.startsWith(path.resolve(os.tmpdir())+path.sep) || !path.basename(resolved).startsWith('ymzx-runtime-')) throw Error('Unsafe fixture path')
  fs.rmSync(resolved,{recursive:true,force:true})
}
