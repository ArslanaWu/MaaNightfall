import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {IntervalLedger,DAY_MS} from './interval_ledger.mjs'
import {challengeState,runChallenge,waitForAutoTeam} from './challenge_actions.mjs'
const hit=(text,x=600,y=350)=>({text,box:[x,y,80,30]})
const home=[hit('家族事务')],tab=[hit('挑战',930,655)]
const portal=[hit('缄默暗门')]
const top=[hit('无尽之阶',50,220),hit('10',345,90)]
const bottom=[hit('无尽之阶',50,220),hit('01',472,530)]
const team=[hit('Lv.80'),hit('关卡增益'),hit('自行组队',810,628),hit('开始战斗',1020,620)]
const manual=[hit('关卡增益'),hit('自动组队',810,628),hit('开始战斗',1020,620)]
const paused=[hit('暂停中'),hit('重新挑战'),hit('退出战斗'),hit('继续作战',836,528)]
const victory=[hit('继续挑战',1133,637)]
const defeat=[hit('行动失败'),hit('重新挑战',416,549),hit('退出战斗',730,549)]
assert.equal(challengeState(paused),'paused')
assert.equal(challengeState(victory),'victory')
assert.equal(challengeState(defeat),'defeat')
assert.equal(challengeState([hit('开始战斗')]),'waiting')
let index=0,clicks=[],drags=0
let scenes=[home,tab,portal,top,top,bottom,manual,team,[],victory,manual,team,defeat,home]
const io={
 template:async()=>false,shot:async()=>index,ocr:async()=>scenes[index],
 click:async(x,y)=>{clicks.push([x,y]);index++},
 drag:async(...points)=>{drags++;if(points[1]<points[3]){assert.deepEqual(points,[650,230,650,620]);return}assert.deepEqual(points,[650,620,650,230]);index++},
 wait:async()=>{if(scenes[index].length===0)index++},
}
assert.equal(await runChallenge(io,()=>{}),true)
assert.equal(drags,5)
assert.ok(clicks.some(([x,y])=>x===512&&y===545)) // exact bottom floor 01
assert.ok(clicks.some(([x,y])=>x===1173&&y===652)) // continue after victory
assert.ok(clicks.some(([x,y])=>x===770&&y===564)) // exit after defeat
assert.ok(!clicks.some(([x,y])=>x===456&&y===564)) // never retry defeat
index=0;clicks=[]
scenes=[home,tab,portal,top,top,bottom,manual,team,[hit('EX10无尽之阶'),hit('行动成功'),hit('作战用时'),hit('返回',1120,630)],home]
assert.equal(await runChallenge(io,()=>{}),true)
assert.deepEqual(clicks.at(-1),[1160,645])
await assert.rejects(waitForAutoTeam({template:async()=>false,shot:async()=>0,ocr:async()=>[],wait:async()=>{}}),/仍有空位/)
await assert.rejects(waitForAutoTeam({shot:async()=>0,ocr:async()=>[hit('Lv.80')],template:async()=>true,wait:async()=>{}}),/仍有空位/)
let nav=0
await assert.rejects(runChallenge({
 template:async()=>false,shot:async()=>nav,ocr:async()=>[home,tab,portal,top,bottom,manual,team,[]][nav],
 click:async()=>{nav++},drag:async(...points)=>{if(points[1]>points[3])nav++},wait:async()=>{},
},()=>{},{maxPolls:3}),/时限/)
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nightfall-interval-'))
const file=path.join(dir,'intervals.json')
let now=Date.UTC(2026,8,19,6)
const ledger=new IntervalLedger(file,()=>now)
try{
 assert.equal(ledger.due('a','silentDoor',15),true)
 let calls=0
 await ledger.run('a','silentDoor',15,async()=>{calls++;return true})
 assert.equal((await ledger.run('a','silentDoor',15,async()=>{calls++;return true})).skipped,true)
 assert.equal(calls,1)
 assert.equal(ledger.due('b','silentDoor',15),true)
 now+=15*DAY_MS-1;assert.equal(ledger.due('a','silentDoor',15),false)
 now++;assert.equal(ledger.due('a','silentDoor',15),true)
 await assert.rejects(ledger.run('a','silentDoor',15,async()=>{throw Error('interrupted')}),/interrupted/)
 assert.equal(ledger.due('a','silentDoor',15),true)
 fs.writeFileSync(file+'.lock','')
 await assert.rejects(ledger.run('a','silentDoor',15,async()=>true),/执行锁/)
 fs.unlinkSync(file+'.lock')
 assert.equal(fs.existsSync(file+'.lock'),false)
 assert.throws(()=>ledger.due('a','silentDoor',0),/正整数/)
 for(const corrupt of [[],{a:{silentDoor:{}}},{a:{silentDoor:{completedAt:'invalid'}}}]){
  fs.writeFileSync(file,JSON.stringify(corrupt));assert.throws(()=>ledger.due('a','silentDoor',15),/损坏/)
 }
}finally{
 for(const name of fs.readdirSync(dir))fs.unlinkSync(path.join(dir,name))
 fs.rmdirSync(dir)
}
console.log('PASS first-floor search, automatic lineup, pause, victory continuation, defeat exit, timeout, account isolation, 15-day boundary and failure retry')

