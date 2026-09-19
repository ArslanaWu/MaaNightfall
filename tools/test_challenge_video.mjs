import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
import {findMaaNode} from './runtime.mjs'
import {challengeState,waitForAutoTeam} from './challenge_actions.mjs'
const frameRoot=path.resolve(process.argv[2]??'.analysis/video11')
await import(pathToFileURL(findMaaNode()).href)
maa.Global.log_dir=path.join(frameRoot,'test-log');maa.Global.stdout_level='Error'
const resource=new maa.Resource()
const load=resource.post_bundle(path.resolve('assets/resource'));await load.wait()
assert.ok(load.succeeded)
const tasker=new maa.Tasker();tasker.resource=resource
async function recognize(file,type,param){
 const b=fs.readFileSync(file)
 const job=tasker.post_recognition(type,param,b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));await job.wait()
 return tasker.node_detail(job.get().nodes[0])?.reco
}
try{
 for(const [frame,expected] of [[75,'waiting'],[77,'waiting'],[81,'waiting'],[89,'team'],[91,'team'],[162,'waiting'],[163,'victory'],[169,'waiting'],[171,'paused'],[186,'waiting'],[228,'defeat'],[229,'defeat'],[230,'defeat']]){
  const file=path.join(frameRoot,'frame-'+String(frame).padStart(3,'0')+'.jpg')
  const result=await recognize(file,'OCR',{expected:'.*',threshold:0.85})
  assert.equal(challengeState(result?.detail?.filtered??[]),expected,'frame '+frame)
 }
 const popup=process.argv[3]
 if(popup){
  const node=resource.get_node_data_parsed('Stamina_CloseLevelUp')
  assert.equal((await recognize(path.resolve(popup),node.recognition.type,node.recognition.param))?.hit,true)
  // A battle result is not an account-level overlay.
  assert.equal((await recognize(path.join(frameRoot,'frame-163.jpg'),node.recognition.type,node.recognition.param))?.hit,false)
 }
 if(process.argv[4]){
  const node=resource.get_node_data_parsed('Dispatch_ClickRumorClose')
  const result=await recognize(path.resolve(process.argv[4]),node.recognition.type,node.recognition.param)
  assert.equal(result?.hit,true,'rumor close template')
  assert.ok(result.box[0]>=830&&result.box[0]<880&&result.box[1]<100,'new close position')
  assert.equal((await recognize(path.join(frameRoot,'frame-091.jpg'),node.recognition.type,node.recognition.param))?.hit,false)
 }
 if(process.argv[5]){
  const node=resource.get_node_data_parsed('Briefing_BattleStart')
  assert.equal((await recognize(path.resolve(process.argv[5]),node.recognition.type,node.recognition.param))?.hit,true,'zero-cost battle')
  const cost=node.recognition.param.all_of[1].recognition
  assert.equal((await recognize(path.join(frameRoot,'frame-003.jpg'),cost.type,{...cost.param,roi:[1090,630,70,35]}))?.hit,false,'nonzero cost must not match zero')
 }
 if(process.argv[6]){
  const node=resource.get_node_data_parsed('Briefing_CloseEventReward')
  assert.equal((await recognize(path.resolve(process.argv[6]),node.recognition.type,node.recognition.param))?.hit,true,'event reward overlay')
 }
 if(process.argv[7]){
  const node=resource.get_node_data_parsed('Briefing_BattleWon')
  assert.equal((await recognize(path.resolve(process.argv[7]),node.recognition.type,node.recognition.param))?.hit,true,'animated victory title')
  assert.equal((await recognize(path.join(frameRoot,'frame-228.jpg'),node.recognition.type,node.recognition.param))?.hit,false,'defeat is not victory')
 }
 if(process.argv[8]){
  await waitForAutoTeam({template:async(file,param)=>(await recognize(path.resolve(file),'TemplateMatch',param))?.hit,shot:async()=>process.argv[8],ocr:async(file,roi,expected)=>(await recognize(path.resolve(file),'OCR',{roi,expected,threshold:0.85}))?.detail?.filtered??[],wait:async()=>{}})
 }
 if(process.argv[9])assert.equal((await recognize(path.resolve(process.argv[9]),'TemplateMatch',{template:'challenge/empty_slot.png',roi:[660,280,580,310],threshold:0.85}))?.hit,true,'incomplete team must contain empty slot')
 console.log('PASS recorded lineup/victory/defeat/pause frames and supplied level-up screenshot')
}finally{tasker.destroy();resource.destroy()}

