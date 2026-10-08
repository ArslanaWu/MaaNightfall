import fs from 'node:fs'
import {StaminaRotation} from './stamina_rotation.mjs'
import {screen,find,joined,tap,waitFor,home,openAffairs} from './game_flow.mjs'
export const STAGES=JSON.parse(fs.readFileSync(new URL('../assets/stamina_stages.json',import.meta.url),'utf8'))
export const DEFAULT_PLAN = [{stage:'party',count:3},{stage:'family_rotation',count:'all'}]
export async function readStaminaBalance(io){
 const match=joined(await io.ocr(await io.shot(),[1070,10,200,60])).match(/(\d+)\/(\d+)/)
 if(!match||Number(match[1])>Number(match[2]))throw Error('无法确认当前体力，未开始扫荡')
 return Number(match[1])
}
export function validatePlan(plan){
 if(!Array.isArray(plan)||!plan.length||plan.length>100)throw Error('体力计划须包含 1 到 100 条')
 return plan.map(row=>{
  const stage=row.stage==='family_rotation'?{id:'family_rotation',name:'家族遗迹轮换',cost:30}:STAGES.find(x=>x.id===row.stage)
  if(!stage)throw Error('未知体力关卡')
  if(row.count!=='all'&&(!Number.isInteger(row.count)||row.count<1||row.count>999))throw Error('次数须为 1 到 999 或 all')
  return {...stage,count:row.count}
 })
}
export function requestedCount(requested,available){
 if(!Number.isInteger(available)||available<1||available>999)throw Error('无法确认可扫荡次数')
 return requested==='all'?available:Math.min(requested,available)
}
export async function openStaminaStage(io,stage){
 await openAffairs(io,'物资')
 // Return horizontal carousel to its first card before looking for a category.
 for(let i=0;i<4;i++)await io.drag(200,360,1080,360)
 let card
 for(let i=0;i<14;i++){
  card=find(await screen(io),new RegExp(stage.category),[220,80,1040,520])
  if(card)break
  await io.drag(1000,360,580,360)
 }
 if(!card)throw Error('找不到物资入口：'+stage.name)
 for(let attempt=0;attempt<3;attempt++){
  await io.click(Math.min(1150,card.box[0]+card.box[2]/2+130),400,1300)
  const after=await screen(io)
  if(!find(after,/^物资$/,[0,620,1280,100]))break
  card=find(after,new RegExp(stage.category),[220,80,1040,520])
  if(!card)throw Error('物资卡片未定位：'+stage.name)
 }
 await waitFor(io,s=>!find(s,/^物资$/,[0,620,1280,100]),'进入'+stage.name)
 if(stage.substage)await tap(io,await waitFor(io,s=>find(s,new RegExp(stage.name),[820,55,450,560]),stage.name))
 // The recording uses difficulty X. Scroll the left stage list to its end.
 for(let i=0;i<3;i++)await io.drag(190,570,190,180)
 const choice=await waitFor(io,s=>s.filter(x=>new RegExp(stage.name).test(x.text??'')&&x.box[0]<350&&x.box[1]>90&&x.box[1]<650).sort((a,b)=>b.box[1]-a.box[1])[0],stage.name+' X')
 await tap(io,choice)
 await waitFor(io,s=>find(s,new RegExp('^'+stage.name+'$'),[880,85,380,100]),'关卡标题')
 const tier=joined(await io.ocr(await io.shot(),[880,45,115,75],'^X$'))
 if(tier!=='X')throw Error('未确认 X 难度，停止扫荡')
}
export async function runStaminaPlan(io,plan,log=console.log,{inspectOnly=false,rotation=new StaminaRotation()}={}){
 const rows=validatePlan(plan)
 let uid,rotationStage
 if(rows.some(row=>row.id==='family_rotation')){
  const items=await io.ocr(await io.shot(),[0,670,240,50],'UID.*')
  uid=joined(items).match(/UID[:：]?(\d+)/i)?.[1]
  if(!uid)throw Error('无法确认 UID，停止家族遗迹轮换')
  rotationStage=rotation.next(uid)
 }
 let batches=0
 while(rows.length){
  if(++batches>1000)throw Error('体力计划超过批次上限')
  const row=rows.shift()
  const rotating=row.id==='family_rotation'
  const stage=rotating?STAGES.find(x=>x.id===rotationStage):row
  await openStaminaStage(io,stage)
  if(inspectOnly){log('[体力计划] 已确认 '+stage.name+' X');await home(io);continue}
  const page=await screen(io)
  const balance=await readStaminaBalance(io)
  if(balance<row.cost){log('[体力计划] '+row.name+' 体力不足，跳过');await home(io);continue}
  await tap(io,find(page,/^扫荡$/,[850,590,260,100]))
  await waitFor(io,s=>find(s,/扫荡次数/),'扫荡次数')
  await io.click(956,347,400)
  const readCount=async()=>Number(joined(await io.ocr(await io.shot(),[670,290,75,43],'^[0-9]+$')))
  const available=await readCount(),count=requestedCount(row.count,available)
  if(count!==available){
   await io.click(318,347,250)
   for(let i=1;i<count;i++)await io.click(907,347,90)
  }
  if(await readCount()!==count)throw Error('扫荡次数未确认，停止')
  const costText=joined(await io.ocr(await io.shot(),[815,474,80,42],'-?[0-9]+'))
  if(Math.abs(Number(costText))!==count*row.cost||count*row.cost>balance)throw Error('扫荡消耗校验失败，未提交')
  await tap(io,find(await screen(io),/^扫荡$/,[900,465,100,65]),1200)
  let rewarded=false,finished=false
  for(let i=0;i<24;i++){
   const items=await screen(io)
   if(find(items,/体力不足|购买体力|恢复体力/))throw Error('体力不足或出现购买窗口，停止；不会购买体力')
   if(find(items,/扫荡完成|获得物品/)){rewarded=true;await io.click(640,680,1000);continue}
   if(find(items,/等级提升|属性提升|等级提高/)){await io.click(640,680,1000);continue}
   if(rewarded&&find(items,new RegExp('^'+stage.name+'$'),[880,85,380,100])){finished=true;break}
   await io.wait(500)
  }
  if(!finished)throw Error('扫荡结果未确认，停止以避免重复消耗')
  if(rotating)rotation.complete(uid,stage.id)
  log('[体力计划] '+stage.name+' X × '+count)
  await home(io)
  if(row.count==='all'||row.count>count)rows.unshift({...row,count:row.count==='all'?'all':row.count-count})
 }
 return true
}
