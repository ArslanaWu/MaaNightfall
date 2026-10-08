import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {findMaaNode} from './runtime.mjs'
import {createIO,registerActions} from './custom_actions.mjs'
import {readDispatch,shouldRefreshDispatch,runDispatchRefresh} from './dispatch_actions.mjs'
const root=path.resolve(import.meta.dirname,'..')
await import(pathToFileURL(findMaaNode()).href)
maa.Global.stdout_level='Off';maa.Global.log_dir=path.join(root,'.analysis/dispatch-refresh/replay-log')
const resource=new maa.Resource();registerActions(resource,root);await resource.post_bundle(path.join(root,'assets/resource')).wait()
let observed
resource.register_custom_action('InspectDispatch',async({context})=>{observed=await readDispatch(createIO(context));return true})
async function inspect(file,entry='InspectDispatch'){
 let clicks=0
 const b=fs.readFileSync(file),bytes=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)
 const controller=new maa.CustomController({connect:()=>true,request_uuid:()=>file,get_features:()=>[],screencap:()=>bytes,click:()=>{clicks++;return false}})
 await controller.post_connection().wait()
 const tasker=new maa.Tasker();tasker.controller=controller;tasker.resource=resource
 try{
  const job=tasker.post_task(entry,{InspectDispatch:{action:'Custom',custom_action:'InspectDispatch',next:[]},Dispatch_RefreshAndAssign:{next:[]}});await job.wait()
  assert.ok(job.succeeded);assert.equal(clicks,0)
  return observed
 }finally{tasker.destroy();controller.destroy()}
}
let data=await inspect(path.join(root,'.analysis/live/run-1789732966098/017_Dispatch_Assign.png'))
console.log('Historical',JSON.stringify(data))
assert.equal(data.rows[0].reward,null)
assert.equal(data.rows[1].level,3);assert.equal(data.rows[1].reward,'report')
assert.equal(shouldRefreshDispatch(data.rows[1]),false)
assert.equal(data.rows[2].level,2);assert.equal(data.rows[2].reward,'coin')
assert.equal(data.rows[3].level,2);assert.equal(data.rows[3].reward,'coin')
assert.equal(shouldRefreshDispatch(data.rows[2]),true)
data=await inspect(path.join(root,'.analysis/dispatch-refresh/current.png'))
console.log('Current',JSON.stringify(data))
assert.equal(data.quota.remaining,1);assert.equal(data.available,0)
assert.ok(data.rows.every(row=>!shouldRefreshDispatch(row)))
assert.equal(data.rows[0].special,true)
assert.ok(data.rows.every(row=>row.reward===null))
await inspect(path.join(root,'.analysis/dispatch-refresh/current.png'),'Dispatch_RefreshAndAssign')
console.log('PASS actual dispatch icons, grade recognition, special/envelope/crystal protection and zero allowance performs no clicks')
// Replay normal assignment using the historical before/after screens; no refresh
// footage is available, so the fixture supplies an exhausted free quota here.
const historical=path.join(root,'.analysis/live/run-1789732966098')
const steps=[]
const names=['017_Dispatch_Assign.png','021_Dispatch_Assign.png','025_Dispatch_Assign.png','029_Dispatch_Assign.png','032_Dispatch_Finish.png']
for(let index=0;index<4;index++)steps.push([220,190+104*index,names[index]],[1100,650,names[index]],[1100,650,names[index+1]])
let current=names[0],stepIndex=0,failure
const controller=new maa.CustomController({connect:()=>true,request_uuid:()=> 'dispatch-assignment-replay',get_features:()=>[],
 screencap:()=>{const b=fs.readFileSync(path.join(historical,current));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)},
 click:(x,y)=>{const step=steps[stepIndex];if(!step||x!==step[0]||y!==step[1]){failure=JSON.stringify({stepIndex,x,y,step});return false}current=step[2];stepIndex++;return true}})
await controller.post_connection().wait()
const tasker=new maa.Tasker();tasker.controller=controller;tasker.resource=resource
resource.register_custom_action('ReplayDispatch',async({context})=>{
 const io=createIO(context),ocr=io.ocr
 io.ocr=(image,roi,expected)=>roi[0]===970&&roi[1]===75?[{text:'免费刷新：0/4'}]:ocr(image,roi,expected)
 return runDispatchRefresh(io,()=>{})
})
try{
 const job=tasker.post_task('ReplayDispatch',{ReplayDispatch:{action:'Custom',custom_action:'ReplayDispatch',next:[]}});await job.wait()
 assert.ok(job.succeeded);assert.equal(failure,undefined);assert.equal(stepIndex,12)
 console.log('PASS historical four-row assignment completes without refresh clicks')
}finally{tasker.destroy();controller.destroy()}
resource.destroy();process.exit(0)
