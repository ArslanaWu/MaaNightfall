import {joined} from './game_flow.mjs'

export const DISPATCH_ROWS = Array.from({length:4},(_,index)=>({index,y:150+104*index}))
export function freeRefreshQuota(text) {
 const match=joined([{text}]).match(/^免费刷新[:：](\d+)\/(\d+)$/)
 if(!match)return null
 const remaining=Number(match[1]),limit=Number(match[2])
 return limit>=1&&limit<=10&&remaining<=limit?{remaining,limit}:null
}
export function shouldRefreshDispatch(row) {
 return !row.active&&!row.special&&row.level===2&&['coin','report'].includes(row.reward)
}
export async function readDispatch(io,image) {
 image??=await io.shot()
 const quota=freeRefreshQuota(joined(await io.ocr(image,[970,75,150,60])))
 const allowance=joined(await io.ocr(image,[970,565,260,45])).match(/今日可派遣次数[:：](\d+)\/(\d+)/)
 const available=allowance&&Number(allowance[1])<=Number(allowance[2])?Number(allowance[1]):null
 const rows=[]
 for(const {index,y} of DISPATCH_ROWS){
  const grades=await io.ocr(image,[113,y,24,38],'^[235]$')
  const grade=grades.find(x=>/^[235]$/.test(x.text??'')&&(x.score??1)>=0.9)
  const status=joined(await io.ocr(image,[300,y+15,95,70]))
  const special=await io.color(image,{roi:[83,y+3,4,70],method:40,lower:[0,120,100],upper:[12,255,255],count:100})
  let reward=null
  for(const kind of ['coin','report']){
   if(await io.template(image,{template:`dispatch/reward_${kind}.png`,roi:[172,y+35,65,55],threshold:0.88})){
    if(reward){reward=null;break}
    reward=kind
   }
  }
  rows.push({index,level:grade?Number(grade.text):null,special,active:/派遣中|完成|可领取/.test(status),reward})
 }
 return {quota,available,rows}
}

async function assignRow(io,row,log) {
 await io.click(220,190+104*row.index,500)
 for(let attempt=0;attempt<2;attempt++){
  const image=await io.shot(),current=await readDispatch(io,image)
  if(current.rows[row.index].active)return true
  if(!current.available)return false
  const button=joined(await io.ocr(image,[930,600,310,90]))
  if(!/^(一键指派|键指派|派遣|开始派遣|确认派遣)$/.test(button))return false
  await io.click(1100,650,1000)
 }
 for(let attempt=0;attempt<8;attempt++){
  if((await readDispatch(io)).rows[row.index].active){log('[派遣] 已派出第 '+(row.index+1)+' 行');return true}
  await io.wait(400)
 }
 return false
}

export async function runDispatchRefresh(io,log=console.log) {
 let state=await readDispatch(io)
 const budget=state.quota?.remaining??0
 let refreshed=0
 while(refreshed<budget){
  // Refresh is treated as global: every task to keep must already be dispatched.
  for(const row of state.rows.filter(row=>!row.active&&!shouldRefreshDispatch(row))){
   if(!state.available||!await assignRow(io,row,log)){
    log('[派遣] 无法派出需要保留的任务，跳过免费刷新')
    return true
   }
   state=await readDispatch(io)
  }
  // Re-read all safeguards from one fresh image immediately before each refresh.
  state=await readDispatch(io)
  const pending=state.rows.filter(row=>!row.active)
  if(!state.available||!pending.length||!pending.every(shouldRefreshDispatch)||!state.quota?.remaining)break
  const previous=state.quota
  await io.click(1165,114,1000)
  let changed=false
  for(let attempt=0;attempt<10;attempt++){
   state=await readDispatch(io)
   if(state.quota?.limit===previous.limit&&state.quota.remaining===previous.remaining-1){changed=true;break}
   // No retry click or confirmation without another positively identified free quota.
   await io.wait(400)
  }
  if(!changed)throw Error('免费刷新结果未确认，停止派遣以避免重复刷新或付费')
  refreshed++
  log('[派遣] 免费刷新 '+refreshed+' 次；剩余 '+state.quota.remaining)
 }
 state=await readDispatch(io)
 for(const row of state.rows.filter(row=>!row.active)){
  if(!state.available)break
  if(!await assignRow(io,row,log))throw Error('未确认第 '+(row.index+1)+' 行派遣成功，停止')
  state=await readDispatch(io)
 }
 return true
}
