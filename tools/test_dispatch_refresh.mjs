import assert from 'node:assert/strict'
import {freeRefreshQuota,shouldRefreshDispatch,runDispatchRefresh} from './dispatch_actions.mjs'
for(const text of ['刷新：1/3','付费刷新：1/3','免费刷薪：1/3','免费刷新：4/3','免费刷新：1/0','免费刷新：99/99'])assert.equal(freeRefreshQuota(text),null)
assert.deepEqual(freeRefreshQuota('免费刷新：1/3'),{remaining:1,limit:3})
assert.deepEqual(freeRefreshQuota('免费刷新: 0 / 4'),{remaining:0,limit:4})
for(const level of [null,3,5])assert.equal(shouldRefreshDispatch({level,reward:'coin'}),false)
for(const reward of [null,'envelope','crystal'])assert.equal(shouldRefreshDispatch({level:2,reward}),false)
assert.equal(shouldRefreshDispatch({level:2,reward:'coin',special:true}),false)
assert.equal(shouldRefreshDispatch({level:2,reward:'coin',active:true}),false)
function game(initial,{free=2,available=8,header='免费刷新',afterRefresh=[],unchanged=false,paidAfterRead=false,failAssign=false}={}){
 const rows=initial.map((row,index)=>({index,level:2,reward:'coin',active:false,special:false,...row}))
 const events=[];let selected=0,team=false,refreshes=0,headerReads=0
 const rowIndex=(y,offset)=>Math.round((y-offset-150)/104)
 const value=text=>text?[{text,score:0.99}]:[]
 const io={
  shot:async()=>true,wait:async()=>{},
  color:async(_image,param)=>rows[rowIndex(param.roi[1],3)].special,
  template:async(_image,param)=>param.template===`dispatch/reward_${rows[rowIndex(param.roi[1],35)].reward}.png`,
  ocr:async(_image,roi)=>{
   if(roi[0]===970&&roi[1]===75){headerReads++;return value((paidAfterRead&&headerReads>1?'付费刷新':header)+':'+free+'/3')}
   if(roi[0]===970&&roi[1]===565)return value('今日可派遣次数：'+available+'/8')
   if(roi[0]===113){const level=rows[rowIndex(roi[1],0)].level;return value(level==null?'':String(level))}
   if(roi[0]===300)return value(rows[rowIndex(roi[1],15)].active?'派遣中':'')
   if(roi[0]===930)return value('一键指派')
   throw Error('Unexpected OCR '+roi)
  },
  click:async(x,y)=>{
   if(x===220){selected=Math.round((y-190)/104);team=false;return}
   if(x===1100){
    assert.ok(available>0);assert.equal(rows[selected].active,false)
    if(failAssign)return
    if(!team){team=true;return}
    rows[selected].active=true;available--;events.push('assign '+selected);return
   }
   if(x===1165){
    assert.equal(header,'免费刷新');assert.ok(free>0)
    assert.ok(rows.filter(row=>!row.active).every(shouldRefreshDispatch),'protected task refreshed')
    events.push('refresh');refreshes++
    if(!unchanged)free--
    for(const [index,row] of Object.entries(afterRefresh[refreshes-1]??{}))Object.assign(rows[Number(index)],row)
    return
   }
   throw Error('Unexpected click '+[x,y])
  }
 }
 return {io,events,rows}
}
let g=game([{level:null,special:true},{level:5},{},{reward:'report'}],{afterRefresh:[{2:{reward:'envelope'}},{3:{level:3,reward:'report'}}]})
await runDispatchRefresh(g.io,()=>{})
assert.deepEqual(g.events,['assign 0','assign 1','refresh','assign 2','refresh','assign 3'])
for(const header of ['付费刷新','刷新','免费刷薪']){
 g=game([{}, {}, {}, {}],{header})
 await runDispatchRefresh(g.io,()=>{});assert.equal(g.events.includes('refresh'),false);assert.ok(g.rows.every(row=>row.active))
}
g=game([{}, {}, {}, {}],{free:0});await runDispatchRefresh(g.io,()=>{});assert.ok(!g.events.includes('refresh'))
g=game([{}, {}, {}, {}],{paidAfterRead:true});await runDispatchRefresh(g.io,()=>{});assert.ok(!g.events.includes('refresh'))
g=game([{level:3},{},{},{}],{available:0});await runDispatchRefresh(g.io,()=>{});assert.equal(g.events.length,0)
g=game([{level:3},{},{},{}],{failAssign:true});await runDispatchRefresh(g.io,()=>{});assert.ok(!g.events.includes('refresh'))
g=game([{}, {}, {}, {}],{unchanged:true});await assert.rejects(runDispatchRefresh(g.io,()=>{}),/免费刷新结果未确认/);assert.deepEqual(g.events,['refresh'])
g=game([{level:3},{reward:'envelope'},{reward:'crystal'},{level:5}]);await runDispatchRefresh(g.io,()=>{});assert.ok(!g.events.includes('refresh'))
console.log('PASS 保护任务先派出、只刷新二级金币/经验、每次重读免费额度、零额度/付费/识别失败不刷新、异常不重试')
