import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {WeeklyLedger,periodKey} from './weekly_ledger.mjs'
import {validateExchange,exchangeShop} from './custom_actions.mjs'
const policies=JSON.parse(fs.readFileSync(new URL('../assets/task_policies.json',import.meta.url)))
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ymzx-quota-test-'))
try {
 let now=new Date('2026-09-20T20:59:59Z')
 const ledger=new WeeklyLedger(path.join(dir,'weekly.json'),policies,()=>now)
 assert.equal(periodKey(now,policies.reset),'2026-09-14')
 assert.ok(ledger.reserve('123','poker'));assert.equal(ledger.reserve('123','poker'),false)
 assert.equal(new WeeklyLedger(ledger.file,policies,()=>now).available('123','poker'),false)
 ledger.complete('123','poker');assert.ok(ledger.reserve('123','poker'));ledger.complete('123','poker')
 assert.equal(ledger.available('123','poker'),false)
 assert.ok(ledger.available('456','poker'))
 now=new Date('2026-09-20T21:00:00Z');assert.equal(periodKey(now,policies.reset),'2026-09-21');assert.ok(ledger.available('123','poker'))
 fs.writeFileSync(ledger.file,'corrupt');assert.throws(()=>ledger.available('123','poker'))
 console.log('PASS 每周边界、重启持久化、账号隔离、重复预留和损坏记录保护')
}finally{fs.rmSync(dir,{recursive:true,force:true})}
const item={name:'爱欲灵感Ⅱ',price:30,weeklyLimit:10}
const good={title:'爱欲灵感II',weekly:[10,10],quantity:[2,10],total:60,balance:75}
assert.ok(validateExchange(item,good))
for(const change of [{title:'作战报告'},{total:61},{balance:59},{weekly:[10,50]},{quantity:[11,10]},{total:null}])assert.equal(validateExchange(item,{...good,...change}),false)
// The maximum button supplies the affordable quantity; the automation never
// presses plus/minus or estimates how many units to request.
for(const [balance,maximum,expectedPurchase] of [[75,2,true],[0,0,false],[20,10,false]]){
 let stage='list',qty=1,purchases=0,maxClicks=0
 const io={shot:async()=>stage,wait:async()=>{},swipe:async()=>{},ocr:async(image,roi,expected)=>{
  let value=''
  if(image==='list' && roi[0]===260)return [{text:item.name,box:[568,293,101,24]}]
  if(image==='list' && expected==='^30$')value='30'
  if(image==='details'){
   if(roi[0]===500)value=item.name
   if(roi[0]===250)value='每周10/10'
   if(roi[0]===670)value='选择数量：'+qty+'/10'
   if(roi[0]===750)value=String(qty*30)
   if(roi[0]===1110)value=String(balance)
  }
  if(image==='reward' && expected==='获得物品')value='获得物品'
  return value?[{text:value,box:roi}]:[]
 },click:async(x,y)=>{
  if(stage==='list'){stage='details';return}
  if(x===1038){qty=maximum;maxClicks++;return}
  if(x===1087){stage='list';return}
  if(x===835){purchases++;stage='reward';return}
  if(stage==='reward'&&x===640){stage='list';return}
  throw Error('Unexpected click '+[x,y])
 }}
 await exchangeShop(io,[item],()=>{})
 assert.equal(purchases,Number(expectedPurchase));assert.equal(maxClicks,balance?1:0)
}
console.log('PASS 白名单、周限档位、最大按钮部分兑换、零余额和超余额阻止')
