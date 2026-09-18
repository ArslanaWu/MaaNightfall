import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
const root=path.resolve(import.meta.dirname,'..')
const frames=path.resolve(process.argv[2]??'.analysis/extra-videos')
await import(pathToFileURL(path.join(os.homedir(),'.maa-tools/install/latest/node_modules/@maaxyz/maa-node/dist/index-client.js')).href)
maa.Global.log_dir=path.join(root,'.analysis/new-videos/replay-log')
maa.Global.stdout_level='Error'
const resource=new maa.Resource()
const load=resource.post_bundle(path.join(root,'assets/resource')); await load.wait()
assert.ok(load.succeeded)
const png=(name)=>{const b=fs.readFileSync(path.join(frames,name));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}
const reward='latest-097.png',role='latest-011.png',home='latest-133.png'
const scenes=[
 {name:'好友领取后返回',entry:'Friends_Ready',end:'Friends_Finish',initial:'v6-002.png',steps:[
 ['Friends_Claim','v6-004.png',[1000,600,220,90]],['Friends_CloseReward','v6-005.png',[600,650,80,50]],['Friends_ReturnHome','v6-001.png',[20,20,60,50]]]},
 {name:'仁心和铁腕逐项激活',entry:'Impression_LeftCheck',end:'Impression_Finish',initial:'v8-005.png',steps:[
 ['Impression_ActivateLeft','v8-007.png',[575,395,70,55]],['Impression_SelectIron','v8-009.png',[1080,320,80,60]],['Impression_ActivateRight','v8-011.png',[410,395,70,55]],['Impression_ReturnHome','v6-001.png',[130,20,50,50]]]},
 {name:'奖励页点击落空后重试并领取',entry:'Pass_OpenRewards',end:'Pass_Finish',initial:'../new-videos/latest-139.png',steps:[
 ['Pass_OpenRewards','../new-videos/latest-139.png',[25,145,100,75]],['Pass_OpenRewards','v6-008.png',[25,145,100,75]],['Pass_RewardsClaim','../new-videos/latest-141.png',[610,625,230,75]],['Pass_RewardsClearAnimation','v6-008.png',[600,650,80,50]],['Pass_RewardsClearAnimation','v6-008.png',[600,650,80,50]],['Pass_ReturnHome','v6-001.png',[130,20,50,50]]]},
]
let failures=0
for(const scene of scenes){
 let current=scene.initial,index=0,active='',failure
 const controller=new maa.CustomController({
  connect:()=>true,request_uuid:()=> 'video-replay',get_features:()=>[],
  screencap:()=>png(current),
  click:(x,y)=>{
   const expected=scene.steps[index]
   if(!expected){failure='Unexpected extra click '+active;return false}
   const [node,next,[rx,ry,w,h]]=expected
   if(active!==node||x<rx||x>rx+w||y<ry||y>ry+h){
    failure=JSON.stringify({step:index,expected:node,actual:active,x,y});return false
   }
   index++;current=next;return true
  },
  stop_app:()=>{failure??='Pipeline attempted FatalExit';return true}
 })
 await controller.post_connection().wait()
 const tasker=new maa.Tasker();tasker.resource=resource;tasker.controller=controller
 tasker.add_context_sink((_ctx,msg)=>{if(msg.msg.endsWith('Action.Starting'))active=msg.name})
 const overrides=Object.fromEntries(resource.node_list.map(n=>[n,{pre_delay:0,post_delay:0,repeat_delay:0,rate_limit:10,timeout:800}]))
 overrides[scene.end]={...overrides[scene.end],next:[]}
 try{
  const job=tasker.post_task(scene.entry,overrides);await job.wait()
  assert.ok(job.succeeded,failure??'Pipeline failed')
  assert.equal(failure,undefined)
  assert.equal(index,scene.steps.length,'Not all expected clicks ran')
  console.log('PASS',scene.name,index+' clicks')
 }catch(e){failures++;console.log('FAIL',scene.name,e.message)}
 finally{tasker.destroy();controller.destroy()}
}
resource.destroy()
console.log(JSON.stringify({scenes:scenes.length,failures}))
// CustomController callbacks keep the native bridge alive after destroy().
process.exit(failures?1:0)
