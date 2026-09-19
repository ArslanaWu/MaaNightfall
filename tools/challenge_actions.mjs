import {screen,find,joined,tap,waitFor,home,openAffairs} from './game_flow.mjs'
export function challengeState(items) {
 if(find(items,/暂停中/)&&find(items,/继续作战/))return 'paused'
 if(find(items,/退出战斗/)&&find(items,/重新挑战|行动.*失败/))return 'defeat'
 if(find(items,/继续战斗|继续挑战/))return 'victory'
 if(find(items,/开始战斗/)&&find(items,/关卡增益/))return 'team'
 if(find(items,/确定/)&&find(items,/队伍|入阵|战斗/))return 'confirm'
 if(find(items,/等级提升|获得物品/))return 'reward'
 return 'waiting'
}
export async function waitForAutoTeam(io){
 let stable=0
 for(let attempt=0;attempt<10;attempt++){
  const image=await io.shot();let filled=0
  for(const y of [350,538])for(const x of [665,753,841,960,1048,1136]){
   const text=joined(await io.ocr(image,[x,y,90,43],'[0-9]+'))
   if(Number(text.match(/\d+/)?.[0])>0)filled++
  }
  const empty=await io.template(image,{template:'challenge/empty_slot.png',roi:[660,280,580,310],threshold:0.85})
  if(filled>=6&&!empty){if(++stable>=2)return}else stable=0
  await io.wait(700)
 }
 throw Error('自动组队后仍有空位或等级无法确认，未开始战斗')
}
export async function runChallenge(io,log=console.log,{maxPolls=2400,maxWins=100}={}) {
 await openAffairs(io,'挑战')
 await tap(io,await waitFor(io,s=>find(s,/缄默暗门/),'缄默暗门'))
 await tap(io,await waitFor(io,s=>find(s,/^无尽之阶$/,[0,150,220,150]),'无尽之阶'))
 // Reset to the upper end before discovering the last floor; a remembered
 // scroll position must not make a middle floor look like the final one.
 for(let n=0;n<4;n++)await io.drag(650,230,650,620)
 let first,highestFloor=0
 for(let n=0;n<20;n++){
  const map=await screen(io)
  for(const row of map){if(/^\d{1,2}$/.test(row.text??'')&&row.box[0]>=220&&row.box[0]<870)highestFloor=Math.max(highestFloor,Number(row.text))}
  first=find(map,/^0?1$/,[220,70,650,580])
  if(first)break
  await io.drag(650,620,650,230)
 }
 if(!first)throw Error('滚动后仍未找到暗门 01 关')
 log('[缄默暗门] 从 01 关开始挑战')
 await tap(io,first)
 let wins=0,waiting=0,starting=0
 for(let poll=0;poll<maxPolls;poll++){
  const items=await screen(io),state=challengeState(items)
  if(state==='defeat'){
   await tap(io,find(items,/退出战斗/),1600)
   await home(io)
   log('[缄默暗门] 战斗失败，已退出；本次胜利 '+wins+' 场')
   return true
  }
  const completedFloor=Number(joined(items).match(/EX(\d+)/i)?.[1])
  if(highestFloor>0&&completedFloor===highestFloor&&find(items,/作战用时/)&&find(items,/成功|LV\.?\d+/)){
   const exit=find(items,/^返回|^完成|^退出/,[800,550,470,140])
   if(exit)await tap(io,exit,1800);else await io.click(640,680,1800)
   await home(io);log('[缄默暗门] 全部关卡已完成');return true
  }
  if(state==='victory'){
   starting=0;wins++;log('[缄默暗门] 胜利 '+wins+' 场')
   if(wins>=maxWins)throw Error('挑战达到安全场数上限')
   await tap(io,find(items,/继续战斗|继续挑战/),1800);waiting=0;continue
  }
  if(state==='team'){
   if(starting){if(++starting>20)throw Error('点击开始战斗后未离开组队界面');await io.wait(500);continue}
   // OCR reads the game's automatic-fill button as either 自动 or 自行.
   // Always activate it; its presence does not mean the existing team was filled.
   await tap(io,find(items,/自[动行]组队/,[750,590,220,100]),1800)
   await waitForAutoTeam(io)
   const ready=await screen(io)
   log('[缄默暗门] 自动组队完成，阵容已稳定且未发现空位')
   await tap(io,find(ready,/开始战斗/),1500);waiting=0;starting=1;continue
  }
  if(state==='confirm'){await tap(io,find(items,/^确定$/));continue}
  if(state==='reward'){await io.click(640,680);continue}
  if(find(items,/全部通关|挑战完成/)){await home(io);return true}
  // Bounds cover two fights and loading per floor; unknown screens never trigger retry.
  if(++waiting>360)throw Error('挑战六分钟未出现可识别结算')
  await io.wait(1000)
 }
 throw Error('挑战超过总执行时限')
}

