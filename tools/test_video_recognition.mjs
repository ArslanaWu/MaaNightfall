import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
const root=path.resolve(import.meta.dirname,'..')
const frameRoot=path.resolve(process.argv[2]??'.analysis/new-videos')
await import(pathToFileURL(path.join(os.homedir(),'.maa-tools/install/latest/node_modules/@maaxyz/maa-node/dist/index-client.js')).href)
maa.Global.log_dir=path.join(root,'.analysis/new-videos/test-log')
maa.Global.stdout_level='Error'
const resource=new maa.Resource()
const load=resource.post_bundle(path.join(root,'assets/resource')); await load.wait()
if(!load.succeeded) throw Error('Resource load failed')
const tasker=new maa.Tasker(); tasker.resource=resource
// Frames: ffmpeg -i VIDEO -vf "fps=2,scale=1280:720" PREFIX-%03d.png
const cases=[
 ['latest-007.png',['Briefing_MeetingSelected','Briefing_MeetingTravel'],['Briefing_AlreadySettled']],
 ['latest-011.png',['Briefing_MeetingTapCharacter','Briefing_MeetingReturn'],['Briefing_BattleStart']],
 ['latest-025.png',['Briefing_AlreadySettled'],[]],
 ['latest-045.png',['Briefing_BattleStart'],[]],
 ['latest-089.png',['Briefing_BattleWon'],['Briefing_BattleFailed']],
 ['latest-097.png',['Briefing_BattleCloseReward'],[]],
 ['latest-121.png',['Drinks_NoonFree','Drinks_AfternoonFree'],[]],
 ['latest-129.png',['Drinks_ReturnHome'],['Drinks_NoonFree','Drinks_AfternoonFree']],
 ['latest-133.png',['Pass_Open','Shop_Open'],['Briefing_MeetingTapCharacter']],
 ['latest-139.png',['Pass_DailyClaim','Pass_OpenWeekly','Pass_OpenEvent'],[]],
 ['latest-145.png',['Pass_OpenRewards'],['Pass_DailyClaim']],
 ['latest-147.png',['Pass_RewardsClaim'],[]],
 ['latest-163.png',['Shop_DailyOpenFree','Shop_OpenContract'],['Shop_DailySoldOut','Shop_DailyConfirmFree']],
 ['latest-165.png',['Shop_DailyConfirmFree'],['Shop_ContractConfirmFree','Shop_DailyOpenFree']],
 ['latest-169.png',['Shop_DailySoldOut'],[]],
 ['latest-171.png',['Shop_ContractOpenFree'],['Shop_DailyOpenFree']],
 ['latest-172.png',['Shop_ContractConfirmFree'],['Shop_DailyConfirmFree']],
 ['latest-177.png',['Shop_ContractSoldOut','Shop_ReturnHome'],[]],
 ['weekly-009.png',['Rewards_ClaimWeekly'],[]],
 ['weekly-011.png',['Rewards_ClaimWeekly'],[]],
 ['weekly-013.png',['Rewards_CloseAcquiredAfterWeekly'],[]],
 ['weekly-015.png',['Rewards_WeeklyReady','Rewards_ReturnHome'],['Rewards_ClaimWeekly']],
]
let failures=0,checks=0
async function check(file,node,expected,override){
 const buf=fs.readFileSync(path.join(frameRoot,file))
 const image=buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength)
 const reco=override??resource.get_node_data_parsed(node).recognition
 const job=tasker.post_recognition(reco.type,reco.param,image); await job.wait()
 const detail=tasker.node_detail(job.get().nodes[0])?.reco
 const hit=detail?.hit??false; checks++
 if(hit!==expected){failures++;console.log('FAIL',file,node,{expected,hit,detail:JSON.stringify(detail?.detail)})}
 else console.log('PASS',file,node,hit)
}
try{
 for(const [file,hits,misses] of cases){
  for(const node of hits) await check(file,node,true)
  for(const node of misses) await check(file,node,false)
 }
 // The identical free-price recognizer must reject the paid card next to the free one.
 const free=structuredClone(resource.get_node_data_parsed('Shop_DailyOpenFree').recognition.param.all_of[1].recognition)
 free.param.roi=[525,335,190,55]
 await check('latest-163.png','Shop_DailyOpenFree/paid-price',false,free)
 // Shop claim recognition must reject a paid recommendation screen.
 for(const node of ['Shop_DailyOpenFree','Shop_DailyConfirmFree','Shop_ContractOpenFree','Shop_ContractConfirmFree']){
  await check('latest-161.png',node,false)
 }
 console.log(JSON.stringify({checks,failures}))
 process.exitCode=failures?1:0
}finally{tasker.destroy();resource.destroy()}

