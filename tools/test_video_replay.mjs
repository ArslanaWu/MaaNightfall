import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
const root=path.resolve(import.meta.dirname,'..')
const frames=path.resolve(process.argv[2]??'.analysis/new-videos')
await import(pathToFileURL(path.join(os.homedir(),'.maa-tools/install/latest/node_modules/@maaxyz/maa-node/dist/index-client.js')).href)
maa.Global.log_dir=path.join(root,'.analysis/new-videos/replay-log')
maa.Global.stdout_level='Error'
const resource=new maa.Resource()
const load=resource.post_bundle(path.join(root,'assets/resource')); await load.wait()
assert.ok(load.succeeded)
const png=(name)=>{const b=fs.readFileSync(path.join(frames,name));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}
const reward='latest-097.png',role='latest-011.png',home='latest-133.png'
const scenes=[
 {name:'简报奖励后升级关闭并恢复列表',entry:'Briefing_CloseRewardAfterChoice',end:'Briefing_ListReady',initial:reward,steps:[
 ['Briefing_CloseRewardAfterChoice','latest-019.png',[600,630,80,60]],
 ['Briefing_CloseLevelUp','latest-025.png',[600,650,80,50]]
 ]},
 {name:'免费礼包双重检查及两个页签',entry:'Shop_OpenRecommended',end:'Shop_Finish',initial:'latest-163.png',steps:[
 ['Shop_OpenRecommended','latest-163.png',[290,65,180,65]],
 ['Shop_DailyOpenFree','latest-165.png',[290,335,190,55]],
 ['Shop_DailyConfirmFree',reward,[675,485,250,65]],
 ['Shop_DailyCloseReward','latest-169.png',[600,630,80,60]],
 ['Shop_OpenContract','latest-171.png',[620,65,180,65]],
 ['Shop_ContractOpenFree','latest-172.png',[290,335,190,55]],
 ['Shop_ContractConfirmFree',reward,[675,485,250,65]],
 ['Shop_ContractCloseReward','latest-177.png',[600,630,80,60]],
 ['Shop_ReturnHome',home,[130,20,50,50]],
 ]},
 {name:'已售罄跳过所有领取',entry:'Shop_DailyCheck',end:'Shop_Finish',initial:'latest-169.png',steps:[
 ['Shop_OpenContract','latest-177.png',[620,65,180,65]],['Shop_ReturnHome',home,[130,20,50,50]]
 ]},
 {name:'周常连续领取两次后关闭奖励并返回',entry:'Rewards_WeeklyLoop',end:'Rewards_Finish',initial:'weekly-009.png',steps:[
 ['Rewards_ClaimWeekly','weekly-011.png',[920,600,330,95]],
 ['Rewards_ClaimWeekly','weekly-013.png',[920,600,330,95]],
 ['Rewards_CloseAcquiredAfterWeekly','weekly-015.png',[600,630,80,60]],
 ['Rewards_ReturnHome',home,[130,20,50,50]]
 ]},
 {name:'周常无奖励时直接返回',entry:'Rewards_WeeklyLoop',end:'Rewards_Finish',initial:'weekly-015.png',steps:[
 ['Rewards_ReturnHome',home,[130,20,50,50]]
 ]},
 {name:'会面角色点击和返回',entry:'Briefing_HandleSelected',end:'Briefing_ListReady',initial:'latest-007.png',steps:[
 ['Briefing_MeetingTravel',role,[650,450,500,180]],
 ['Briefing_MeetingTapCharacter',reward,[600,320,60,60]],
 ['Briefing_MeetingCloseReward',role,[600,630,80,60]],
 ['Briefing_MeetingReturn','latest-025.png',[20,20,60,50]]
 ]},
 {name:'会面仁心升级后恢复',entry:'Briefing_HandleSelected',end:'Briefing_ListReady',initial:'latest-007.png',steps:[
 ['Briefing_MeetingTravel',role,[650,450,500,180]],
 ['Briefing_MeetingTapCharacter','latest-019.png',[600,320,60,60]],
 ['Briefing_CloseLevelUp',role,[600,650,80,50]],
 ['Briefing_MeetingReturn','latest-025.png',[20,20,60,50]]
 ]},
 {name:'简报零消耗战斗和结算',entry:'Briefing_BattleStart',end:'Briefing_ListReady',initial:'latest-045.png',steps:[
 ['Briefing_BattleStart','latest-089.png',[1060,610,170,70]],
 ['Briefing_BattleWon',reward,[600,650,80,50]],
 ['Briefing_BattleCloseReward','latest-025.png',[600,630,80,60]]
 ]},
 {name:'免费饮品两杯及已领取结束',entry:'Drinks_Check',end:'Drinks_Finish',initial:'latest-121.png',steps:[
 ['Drinks_NoonFree',reward,[725,545,180,60]],
 ['Drinks_CloseReward','latest-121.png',[600,630,80,60]],
 ['Drinks_AfternoonFree',reward,[1030,545,180,60]],
 ['Drinks_CloseReward','latest-129.png',[600,630,80,60]],
 ['Drinks_ReturnHome',home,[130,20,50,50]]
 ]},
 {name:'通行证任务、升级遮罩及奖励返回',entry:'Pass_DailyCheck',end:'Pass_Finish',initial:'latest-139.png',steps:[
 ['Pass_DailyClaim','latest-141.png',[610,625,230,75]],
 ['Pass_DailyClearAnimation','latest-145.png',[600,650,80,50]],
 ['Pass_DailyClearAnimation','latest-145.png',[600,650,80,50]],
 ['Pass_OpenWeekly','latest-145.png',[390,205,220,65]],
 ['Pass_OpenEvent','latest-145.png',[620,205,220,65]],
 ['Pass_OpenRewards','latest-147.png',[25,145,100,75]],
 ['Pass_RewardsClaim','latest-141.png',[610,625,230,75]],
 ['Pass_RewardsClearAnimation','latest-145.png',[600,650,80,50]],
 ['Pass_RewardsClearAnimation','latest-145.png',[600,650,80,50]],
 ['Pass_ReturnHome',home,[130,20,50,50]]
 ]}
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

