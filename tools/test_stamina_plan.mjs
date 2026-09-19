import assert from 'node:assert/strict'
import {runStaminaPlan} from './stamina_plan.mjs'
const hit=(text,x,y,w=100,h=30)=>({text,box:[x,y,w,h]})
function fakeGame(balance,{wrongCost=false}={}){
 let state='home',quantity=1,stage='作战演练'
 const swept=[]
 const pages=()=>({
 home:[hit('家族事务',1000,320)],
 business:[hit('物资',610,650)],
 carousel:[hit('物资',610,650),hit('作战',430,160),hit('金钱',930,190)],
 stage:[hit('X'+stage,60,570),hit(stage,920,120),hit('X',920,70),hit(balance+'/300',1110,25),hit('扫荡',945,630)],
 dialog:[hit('扫荡次数',560,300),hit('扫荡',920,480,65,30)],
 reward:[hit('扫荡完成',530,490)]
 })[state]
 return {
  swept,io:{
   shot:async()=>state,wait:async()=>{},drag:async()=>{},
   ocr:async(_image,roi)=>{
    if(roi[0]===670)return [hit(String(quantity),690,300)]
    if(roi[0]===815)return [hit(String(-quantity*10+(wrongCost?1:0)),830,480)]
    if(roi[0]===880&&roi[1]===45)return [hit('X',920,70)]
    return pages()
   },
   click:async(x,y)=>{
    if(x===156&&y===40){state='home';return}
    if(state==='home'){state='business';return}
    if(state==='business'){state='carousel';return}
    if(state==='carousel'){stage=x>950?'金钱时代':'作战演练';state='stage';return}
    if(state==='stage'&&x>850&&y>600){state='dialog';quantity=1;return}
    if(state==='stage')return
    if(state==='dialog'){
     if(y<400){if(x===956)quantity=Math.min(10,Math.floor(balance/10));if(x===318)quantity=1;if(x===907)quantity++;return}
     assert.ok(quantity*10<=balance);balance-=quantity*10;swept.push({stage,quantity});state='reward';return
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
