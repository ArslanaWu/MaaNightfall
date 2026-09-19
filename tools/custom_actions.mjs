import {IntervalLedger} from './interval_ledger.mjs'
import {runChallenge} from './challenge_actions.mjs'
import fs from 'node:fs'
import path from 'node:path'
import {WeeklyLedger} from './weekly_ledger.mjs'

export const normalizeText = text => text.normalize('NFKC').replace(/\s/g,'')
export function parseInteger(text) { const s=text.replace(/[ ,，]/g,'');return /^\d+$/.test(s)?Number(s):null }
export function parseFraction(text) { const m=text.replace(/\s/g,'').match(/(\d+)\/(\d+)/);return m ? [Number(m[1]),Number(m[2])] : null }
export function validateExchange(item, details) {
  const {title, weekly, quantity, total, balance}=details
  return normalizeText(title)===normalizeText(item.name) && weekly?.[1]===item.weeklyLimit &&
    weekly[0]>0 && weekly[0]<=weekly[1] && quantity?.[0]>0 && quantity[0]<=weekly[0] &&
    quantity[0]<=quantity[1] && quantity[1]<=item.weeklyLimit && Number.isInteger(total) && total===item.price*quantity[0] &&
    Number.isInteger(balance) && balance>=total
}
const wait=ms=>new Promise(r=>setTimeout(r,ms))
export function createIO(context) {
  const controller=context.tasker.controller
  return {
    async shot(){const j=controller.post_screencap();await j.wait();if(!j.succeeded)throw Error('截图失败');return controller.cached_image},
    async template(image,param){return Boolean((await context.run_recognition_direct('TemplateMatch',param,image))?.hit)},
    async ocr(image,roi,expected='.*') { const r=await context.run_recognition_direct('OCR',{roi,expected,threshold:0.85},image);return r?.detail?.filtered ?? [] },
    async click(x,y,delay=800){const j=controller.post_click(x,y);await j.wait();if(!j.succeeded)throw Error('点击失败');await wait(delay)},
    async swipe(up){const j=controller.post_swipe(1030,up?600:230,1030,up?240:630,550);await j.wait();if(!j.succeeded)throw Error('滚动失败');await wait(900)},
    async drag(x1,y1,x2,y2){const j=controller.post_swipe(x1,y1,x2,y2,650);await j.wait();if(!j.succeeded)throw Error('滑动失败');await wait(900)},
    async stop(){const j=controller.post_stop_app('com.bmystu.peng.gw');await j.wait();if(!j.succeeded)throw Error('关闭游戏失败')},
    wait,
  }
}
const text=items=>items.map(x=>x.text??'').join('')
export async function readDetails(io,image) {
  // Price ROI excludes the currency icon, which OCR may otherwise read as a digit.
  const title=text(await io.ocr(image,[500,170,410,65]))
  const weekText=text(await io.ocr(image,[250,470,190,55]))
  return {title,weekly:/每周/.test(weekText)?parseFraction(weekText):null,
    quantity:parseFraction(text(await io.ocr(image,[670,390,260,50]))),
    total:parseInteger(text(await io.ocr(image,[750,485,155,60]))),
    balance:parseInteger(text(await io.ocr(image,[1110,15,110,50])))}
}

export async function exchangeShop(io,items,log=console.log) {
  const handled=new Set()
  // Reset scroll in this tab, then examine bounded pages; never click an item
  // unless its exact title and the recorded unit price match the allowlist.
  for(let n=0;n<3;n++)await io.swipe(false)
  for(let page=0;page<8;page++) {
    let pageItems=await io.ocr(await io.shot(),[260,120,950,550])
    for(const item of items) {
      if(handled.has(item.name))continue
      const matches=pageItems.filter(r=>normalizeText(r.text??'')===normalizeText(item.name))
      for(const match of matches) {
        const [x,y,w,h]=match.box
        if(y<220 || y+h+65>715)continue
        const image=await io.shot()
        if((await io.ocr(image,[Math.max(250,x-35),Math.max(125,y-85),220,80],'售罄|后补货')).length){handled.add(item.name);break}
        const price=text(await io.ocr(image,[Math.max(250,x-35),y+h+10,200,65],'^'+item.price+'$'))
        if(parseInteger(price)!==item.price)continue
        await io.click(x+w/2,y+h/2,950)
        const detailImage=await io.shot()
        if((await io.ocr(detailImage,[420,320,440,90],'商品已售罄')).length){handled.add(item.name);break}
        let before=await readDetails(io,detailImage)
        if(normalizeText(before.title)!==normalizeText(item.name))throw Error('兑换详情与白名单不符，已停止')
        if(!before.weekly || before.weekly[1]!==item.weeklyLimit) {await io.click(1087,173);continue}
        handled.add(item.name)
        if(before.weekly[0]===0 || before.balance===0){await io.click(1087,173);break}
        // The game's maximum button handles stock and available currency.
        await io.click(1038,451,650)
        const details=await readDetails(io,await io.shot())
        if(!validateExchange(item,details)) {
          log('[兑换] 跳过 '+item.name+'：额度/余额或价格无法确认')
          await io.click(1087,173);break
        }
        await io.click(835,517,1000)
        let rewarded=false
        for(let n=0;n<8;n++){
          const shot=await io.shot()
          if((await io.ocr(shot,[430,70,430,170],'获得物品')).length){rewarded=true;await io.click(640,680,900);break}
          if((await io.ocr(shot,[350,200,650,320],'不足|不够|售罄')).length)break
          await io.wait(350)
        }
        if(!rewarded)throw Error('兑换未确认成功，停止以避免重复提交：'+item.name)
        log('[兑换] '+item.name+' × '+details.quantity[0])
        break
      }
    }
    if(handled.size===items.length)break
    await io.swipe(true)
  }
  log('[兑换] 本页签已检查完毕；未出现、已兑完或余额不足的白名单物品已跳过')
  return true
}

export function registerActions(target, root) {
  const policies=JSON.parse(fs.readFileSync(path.join(root,'assets/task_policies.json'),'utf8'))
  const whitelist=JSON.parse(fs.readFileSync(path.join(root,'assets/exchange_whitelist.json'),'utf8'))
  const ledger=new WeeklyLedger(path.join(root,'.state/weekly.json'),policies)
  const intervals=new IntervalLedger(path.join(root,'.state/intervals.json'))
  target.register_custom_action('SilentDoor',async ({context})=>{
    const io=createIO(context)
    const identity=text(await io.ocr(await io.shot(),[0,670,240,50],'UID.*')).match(/UID\s*[:：]?\s*(\d+)/i)?.[1]
    if(!identity)throw Error('无法识别 UID，停止周期挑战')
    const result=await intervals.run(identity,'silentDoor',policies.intervalTasks.silentDoor.days,()=>runChallenge(io))
    console.log(result.skipped?'[缄默暗门] 未到下次执行时间，跳过':'[缄默暗门] 已记录完成，15 天后再执行')
    return true
  })
  let uid
  target.register_custom_action('ExchangeWhitelist',async ({context,param})=>{
    if(!whitelist[param.shop])throw Error('未知兑换页签')
    return exchangeShop(createIO(context),whitelist[param.shop])
  })
  target.register_custom_action('WeeklyGate',async ({context,param})=>{
    const io=createIO(context)
    const s=text(await io.ocr(await io.shot(),[0,670,240,50],'UID.*'))
    uid=s.match(/UID\s*[:：]?\s*(\d+)/i)?.[1]
    if(!uid)throw Error('无法识别 UID，停止周限操作')
    const available=ledger.available(uid,param.key)
    context.override_next('Poker_Gate',[available?'Poker_OpenBusiness':'Poker_Skip'])
    console.log('[周限] '+(available?'本周还有次数':'本周已达限额或有待确认匹配，跳过'))
    return true
  })
  target.register_custom_action('WeeklyStartMatch',async ({context,param})=>{
    if(!ledger.reserve(uid,param.key))throw Error('周限已占用，未开始匹配')
    await createIO(context).click(640,590,300)
    return true
  })
  target.register_custom_action('WeeklyMatchedExit',async ({context,param})=>{
    // Persist before closing. A stop failure cannot cause another match next run.
    ledger.complete(uid,param.key)
    await createIO(context).stop()
    return true
  })
}
