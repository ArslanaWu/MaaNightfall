import assert from 'node:assert/strict'
import {ensureMuMu} from './mumu.mjs'
let calls=0
const run=async (exe,args,options)=>{
  calls++
  assert.equal(exe,'powershell.exe')
  assert.equal(args.at(-1),'C:\\custom path\\MuMuManager.exe')
  assert.ok(args.includes('0'))
  assert.equal(options.windowsHide,true)
  return {stdout:'{"index":0,"address":"127.0.0.1:16384","launched":true}\r\n'}
}
assert.equal((await ensureMuMu({instance:'0',managerPath:'C:\\custom path\\MuMuManager.exe',run})).launched,true)
await assert.rejects(ensureMuMu({instance:'-1',run}),/编号无效/)
assert.equal(calls,1)
await assert.rejects(ensureMuMu({instance:0,run:async()=>({stdout:'{"index":1,"address":"127.0.0.1:16416"}'})}),/无效/)
await assert.rejects(ensureMuMu({run:async()=>{throw Object.assign(Error('failure'),{stderr:'Not installed'})}}),/Not installed/)
console.log('PASS MuMu argument forwarding, instance validation and startup errors')
