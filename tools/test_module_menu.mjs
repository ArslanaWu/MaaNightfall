import assert from 'node:assert/strict'
import {PassThrough} from 'node:stream'
import {selectModuleMenu} from './module_menu.mjs'

const items=[{id:'start',label:'启动游戏'},{id:'friends',label:'好友赠礼'},{id:'close',label:'关闭游戏'}]
function terminal(){
  const input=new PassThrough(), output=new PassThrough()
  input.isTTY=true;output.isTTY=true;input.isRaw=false
  input.setRawMode=value=>{input.isRaw=value}
  let text='';output.on('data',buffer=>text+=buffer)
  return {input,output,text:()=>text}
}
async function choose(keys) {
  const io=terminal();const pending=selectModuleMenu(items,io)
  for(const key of keys)io.input.write(key)
  const result=await pending
  assert.equal(io.input.isRaw,false)
  assert.equal(io.input.listenerCount('keypress'),0)
  assert.ok(io.text().includes('[x]'))
  return result
}
assert.deepEqual(await choose(['\r']),['start','friends','close'])
assert.deepEqual(await choose(['\x1b[B',' ','\r']),['start','close'])
assert.deepEqual(await choose(['\x1b[A',' ','\r']),['start','friends'])
assert.deepEqual(await choose(['\x1b[B',' ',' ','\r']),['start','friends','close'])
assert.equal(await choose(['\x03']),null)
assert.equal(await choose(['\x1b']),null)
const io=terminal();let finished=false
const pending=selectModuleMenu(items,io).then(value=>{finished=true;return value})
for(let i=0;i<items.length;i++){io.input.write(' ');io.input.write('\x1b[B')}
io.input.write('\r')
await new Promise(resolve=>setImmediate(resolve))
assert.equal(finished,false)
assert.ok(io.text().includes('请至少勾选一个模块'))
io.input.write(' ');io.input.write('\r')
assert.deepEqual(await pending,['start'])
console.log('PASS 默认全选回车、上下移动、空格切换、循环选择、取消和空选保护')
