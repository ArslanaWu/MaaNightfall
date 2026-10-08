import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {findMaaNode} from './runtime.mjs'
import {createIO,exchangeShop} from './custom_actions.mjs'
import {readStaminaBalance} from './stamina_plan.mjs'
const root=path.resolve(import.meta.dirname,'..')
await import(pathToFileURL(findMaaNode()).href)
maa.Global.stdout_level='Off';maa.Global.log_dir=path.join(root,'.analysis/video14/replay-log')
const frames=path.join(root,'.analysis/video14')
const historical=path.join(root,'.analysis/live/run-1789732736872')
const bytes=file=>{const b=fs.readFileSync(file);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}
const resource=new maa.Resource();await resource.post_bundle(path.join(root,'assets/resource')).wait()
let fixtureBody
resource.register_custom_action('Fixture',async({context})=>fixtureBody(createIO(context)))
async function replay(entry,initial,steps,body){
 let current=initial,index=0,failure
 const controller=new maa.CustomController({connect:()=>true,request_uuid:()=>entry,get_features:()=>[],screencap:()=>bytes(current),swipe:()=>true,
  click:(x,y)=>{
   const step=steps[index]
   const radius=step?.[3]??30
   if(!step||Math.abs(x-step[0])>radius||Math.abs(y-step[1])>radius){failure=JSON.stringify({index,x,y,step});return false}
   current=step[2];index++;return true
  }})
 await controller.post_connection().wait()
 const tasker=new maa.Tasker();tasker.controller=controller;tasker.resource=resource
 fixtureBody=body
 const override=Object.fromEntries(resource.node_list.map(n=>[n,{post_delay:0,pre_delay:0,rate_limit:20,timeout:1000}]))
 override.Fixture={action:'Custom',custom_action:'Fixture',next:[]}
 override.Base_OpenOrders={...override.Base_OpenOrders,next:[]}
 try{
  const j=tasker.post_task(entry,override);await j.wait()
  assert.ok(j.succeeded,failure??'流程失败');assert.equal(failure,undefined);assert.equal(index,steps.length)
  console.log('PASS',entry,steps.length+' clicks')
 }finally{tasker.destroy();controller.destroy()}
}
const item=JSON.parse(fs.readFileSync(path.join(root,'assets/exchange_whitelist.json'))).special[0]
assert.equal(item.name,'契约之刃')
await replay('Fixture',path.join(frames,'frame-005.jpg'),[[382,305,path.join(frames,'frame-007.jpg')],[1038,451,path.join(frames,'frame-007.jpg')],[835,517,path.join(frames,'frame-008.jpg')],[640,680,path.join(frames,'frame-009.jpg')]],io=>exchangeShop(io,[item],()=>{}))
const reward=path.join(frames,'frame-008.jpg'),room=path.join(historical,'027_Base_OpenOrders.png')
await replay('Base_CheckBenefits',path.join(historical,'025_Base_CollectProduction.png'),[[1188,426,path.join(historical,'026_Base_RestartProduction.png'),45],[792,611,room,40],[1180,424,reward,45],[640,680,room],[840,615,room,40]],()=>true)
await replay('Base_CheckBenefits',room,[[1180,424,reward,45],[640,680,room],[840,615,room,40]],()=>true)
await replay('Base_CheckBenefits',path.join(frames,'base-no-benefits.png'),[[840,615,room,40]],()=>true)
await replay('Fixture',path.join(historical,'013_Stamina_OpenStage.png'),[],async io=>{assert.equal(await readStaminaBalance(io),189);return true})
resource.destroy();process.exit(0)
