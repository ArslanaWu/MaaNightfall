import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {pathToFileURL} from 'node:url'
import path from 'node:path'
import {findMaaNode} from './runtime.mjs'
await import(pathToFileURL(findMaaNode()).href)
const client=new maa.Client(),resource=new maa.Resource()
client.bind_resource(resource);client.timeout='10000'
const child=spawn(process.execPath,[path.join(import.meta.dirname,'agent_server.mjs'),client.identifier,'socket_id='+client.identifier,'instance_name=GUI smoke'],{windowsHide:true,stdio:'pipe'})
let errors=''
child.stderr.on('data',b=>{errors+=b})
try{
 await client.connect()
 assert.equal(client.connected,true,errors)
 for(const action of ['GuiModule','StaminaPlan','SilentDoor','ExchangeWhitelist'])assert.ok(client.custom_action_list?.includes(action),action)
 console.log('PASS GUI Agent IPC and registered module/stamina/interval/exchange actions')
}finally{client.disconnect();child.kill();resource.destroy()}
