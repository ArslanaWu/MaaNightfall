import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
const root=path.resolve(import.meta.dirname,'..')
const frameRoot=path.resolve(process.argv[2]??'.analysis/extra-videos')
await import(pathToFileURL(path.join(os.homedir(),'.maa-tools/install/latest/node_modules/@maaxyz/maa-node/dist/index-client.js')).href)
maa.Global.log_dir=path.join(root,'.analysis/new-videos/test-log')
maa.Global.stdout_level='Error'
const resource=new maa.Resource()
const load=resource.post_bundle(path.join(root,'assets/resource')); await load.wait()
if(!load.succeeded) throw Error('Resource load failed')
const tasker=new maa.Tasker(); tasker.resource=resource
// Frames: ffmpeg -i VIDEO -vf "fps=2,scale=1280:720" PREFIX-%03d.png
const cases=[
 ['v6-002',['Friends_Ready','Friends_Claim'],['Friends_AlreadyClaimed']],
 ['v6-005',['Friends_AlreadyClaimed'],[]],
 ['v6-008',['Pass_RewardsReady','Pass_RewardsClaim'],[]],
 ['../new-videos/latest-139',[],['Pass_RewardsReady','Pass_ReturnHome']],
 ['v8-003',['Impression_Open'],[]],
 ['v8-005',['Impression_ActivateLeft'],[]],
 ['v8-009',['Impression_ActivateRight'],[]],
 ['v8-017',['Poker_OpenRoom'],['Poker_Matched']],
 ['v8-018',['Poker_StartMatching'],['Poker_Matched']],
 ['v8-020',[],['Poker_Matched']],
 ['v8-027',['Poker_Matched'],[]],
 ['v8-029',['Poker_Matched'],[]],
 ['v10-005',['Exchange_OpenTab','Exchange_OpenSpecial','Exchange_OpenFamily','Exchange_BuySpecial'],['Exchange_BuyFamily']],
 ['v10-048',['Exchange_BuyFamily'],['Exchange_BuySpecial']],
].map(([f,h,m])=>[f+'.png',h,m])
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
 console.log(JSON.stringify({checks,failures}));process.exitCode=failures?1:0
}finally{tasker.destroy();resource.destroy()}
