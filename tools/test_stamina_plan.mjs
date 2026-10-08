import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {runStaminaPlan,DEFAULT_PLAN} from './stamina_plan.mjs'
import {StaminaRotation} from './stamina_rotation.mjs'
const hit=(text,x,y,w=100,h=30)=>({text,box:[x,y,w,h]})
function fakeGame(balance,{wrongCost=false,noReward=false}={}){
 let state='home',quantity=1,stage='作战演练'
 const swept=[]
 const family=['地牢血痕','密室残垣','市井焦土','古堡回声']
 const cost=()=>family.includes(stage)?30:10
 const pages=()=>({
 home:[hit('家族事务',1000,320),hit('UID:123',10,690)],
 business:[hit('物资',610,650)],
 carousel:[hit('物资',610,650),hit('作战',430,160),hit('金钱',930,190),hit('欲望',620,190),hit('家族',760,190)],
 family:family.map((name,i)=>hit(name,900,80+i*110)),
 stage:[hit('X'+stage,60,570),hit(stage,920,120),hit('X',920,70),hit(balance+'/240',1110,25),hit('扫荡',945,630)],
 dialog:[hit('扫荡次数',560,300),hit('扫荡',920,480,65,30)],
 reward:noReward?[]:[hit('扫荡完成',530,490)]
 })[state]
 return {
  swept,io:{
   shot:async()=>state,wait:async()=>{},drag:async()=>{},
   ocr:async(_image,roi)=>{
    if(roi[0]===670)return [hit(String(quantity),690,300)]
    if(roi[0]===815)return [hit(String(-quantity*cost()+(wrongCost?1:0)),830,480)]
    if(roi[0]===880&&roi[1]===45)return [hit('X',920,70)]
    return pages()
   },
   click:async(x,y)=>{
    if(x===156&&y===40){state='home';return}
    if(state==='home'){state='business';return}
    if(state==='business'){state='carousel';return}
    if(state==='carousel'){
     if(x>850&&x<1000){state='family';return}
     stage=x>1000?'金钱时代':x>720?'欲望酒会':'作战演练';state='stage';return
    }
    if(state==='family'){stage=family[Math.round((y-95)/110)];state='stage';return}
    if(state==='stage'&&x>850&&y>600){state='dialog';quantity=1;return}
    if(state==='stage')return
    if(state==='dialog'){
     if(y<400){if(x===956)quantity=Math.min(10,Math.floor(balance/cost()));if(x===318)quantity=1;if(x===907)quantity++;return}
     assert.ok(quantity*cost()<=balance);balance-=quantity*cost();swept.push({stage,quantity});state='reward';return
    }
    if(state==='reward')state='stage'
   }
  }
 }
}
const run=async(game,plan)=>runStaminaPlan(game.io,plan,()=>{})
let game=fakeGame(126)
await run(game,[{stage:'drill',count:20}])
assert.deepEqual(game.swept.map(x=>x.quantity),[10,2])
game=fakeGame(60)
await run(game,[{stage:'drill',count:3},{stage:'money',count:2}])
assert.deepEqual(game.swept,[{stage:'作战演练',quantity:3},{stage:'金钱时代',quantity:2}])
game=fakeGame(35)
await run(game,[{stage:'drill',count:'all'}])
assert.deepEqual(game.swept.map(x=>x.quantity),[3])
game=fakeGame(5)
await run(game,[{stage:'drill',count:1}])
assert.equal(game.swept.length,0)
game=fakeGame(60,{wrongCost:true})
await assert.rejects(run(game,[{stage:'drill',count:2}]),/消耗校验失败/)
assert.equal(game.swept.length,0)
console.log('PASS stamina multi-batch counts, plan order, partial affordability, all mode and cost mismatch protection')
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ymzx-rotation-'))
try{
 let now=new Date('2026-10-09T02:00:00Z')
 const rotation=new StaminaRotation(path.join(dir,'rotation.json'),()=>now)
 game=fakeGame(186)
 await runStaminaPlan(game.io,DEFAULT_PLAN,()=>{},{rotation})
 assert.deepEqual(game.swept,[{stage:'欲望酒会',quantity:3},{stage:'地牢血痕',quantity:5}])
 assert.equal(new StaminaRotation(rotation.file,()=>now).next('123'),'dungeon')
 assert.equal(rotation.next('456'),'dungeon')
 game=fakeGame(60)
 await runStaminaPlan(game.io,DEFAULT_PLAN,()=>{},{rotation})
 assert.deepEqual(game.swept,[{stage:'欲望酒会',quantity:3},{stage:'地牢血痕',quantity:1}])
 // Shanghai midnight advances the calendar slot even if no task ran that day.
 now=new Date('2026-10-09T15:59:59Z');assert.equal(rotation.next('123'),'dungeon')
 now=new Date('2026-10-09T16:00:00Z');assert.equal(rotation.next('123'),'chamber')
 game=fakeGame(96)
 await runStaminaPlan(game.io,DEFAULT_PLAN,()=>{},{rotation})
 assert.deepEqual(game.swept,[{stage:'欲望酒会',quantity:3},{stage:'密室残垣',quantity:2}])
 now=new Date('2026-10-11T02:00:00Z');assert.equal(rotation.next('123'),'city')
 now=new Date('2026-10-12T02:00:00Z');assert.equal(rotation.next('123'),'castle')
 now=new Date('2026-10-13T02:00:00Z');assert.equal(rotation.next('123'),'dungeon')
 const before=rotation.next('123')
 game=fakeGame(30,{noReward:true})
 await assert.rejects(runStaminaPlan(game.io,[{stage:'family_rotation',count:1}],()=>{},{rotation}),/结果未确认/)
 assert.equal(rotation.next('123'),before)
 game=fakeGame(29)
 await runStaminaPlan(game.io,[{stage:'family_rotation',count:'all'}],()=>{},{rotation})
 assert.equal(game.swept.length,0);assert.equal(rotation.next('123'),before)
 console.log('PASS 酒会 3 次优先、当天同一种用尽体力、上海日期边界、四天循环和异常保护')
}finally{fs.rmSync(dir,{recursive:true,force:true})}
