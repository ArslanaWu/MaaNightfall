import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {registerActions} from './custom_actions.mjs'
const root=path.resolve(import.meta.dirname,'..'),frames=path.resolve(process.argv[2]??'.analysis/extra-videos')
await import(pathToFileURL(path.join(os.homedir(),'.maa-tools/install/latest/node_modules/@maaxyz/maa-node/dist/index-client.js')).href)
maa.Global.stdout_level='Error';maa.Global.log_dir=path.join(root,'.analysis/extra-videos/action-log')
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ymzx-actions-'));fs.mkdirSync(path.join(temp,'assets'))
fs.copyFileSync(path.join(root,'assets/task_policies.json'),path.join(temp,'assets/task_policies.json'))
const allow=JSON.parse(fs.readFileSync(path.join(root,'assets/exchange_whitelist.json')))
fs.writeFileSync(path.join(temp,'assets/exchange_whitelist.json'),JSON.stringify({special:[allow.special[0]],family:[allow.family[0]]}))
const png=f=>{const b=fs.readFileSync(path.join(frames,f+'.png'));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}
let failures=0
async function run(name,entry,initial,clickSteps,{end,skip=false,poker=false}={}){
 let current=initial,index=0,stops=0,matchShots=0,failure
 const resource=new maa.Resource();registerActions(resource,temp);await resource.post_bundle(path.join(root,'assets/resource')).wait()
 const controller=new maa.CustomController({connect:()=>true,request_uuid:()=>name,get_features:()=>[],
  screencap:()=>{if(poker&&current==='v8-020'&&++matchShots>=3)current='v8-027';return png(current)},
  swipe:()=>true,
  click:(x,y)=>{const step=clickSteps[index];if(!step||Math.abs(x-step[0])>35||Math.abs(y-step[1])>35){failure=JSON.stringify({index,x,y,step});return false}current=step[2];index++;return true},
  stop_app:()=>{stops++;if(!poker||current!=='v8-027')failure??='Unexpected stop before matched at '+current;return true}})
 await controller.post_connection().wait();const tasker=new maa.Tasker();tasker.resource=resource;tasker.controller=controller
 const override=Object.fromEntries(resource.node_list.map(n=>[n,{pre_delay:0,post_delay:0,repeat_delay:0,rate_limit:20,timeout:6000}]))
 if(end)override[end]={...override[end],next:[]}
 override.Poker_Skip={next:'KeepGameOpenFinish'}
 try{const job=tasker.post_task(entry,override);await job.wait();assert.ok(job.succeeded);assert.equal(failure,undefined);assert.equal(index,clickSteps.length);assert.equal(stops,poker&&!skip?1:0);const names=job.get().nodes.map(id=>tasker.node_detail(id).name);assert.ok(!names.includes('FatalExit'));if(poker)assert.ok(names.includes(skip?'Poker_Skip':'Poker_Closed'));console.log('PASS',name)}catch(e){failures++;console.log('FAIL',name,e.message,{current,index})}
 finally{tasker.destroy();controller.destroy();resource.destroy()}
}
try{
 await run('特供商店白名单最大兑换','Exchange_BuySpecial','v10-005',[[619,588,'v10-007'],[1038,451,'v10-008'],[835,517,'v10-009'],[640,680,'v10-012']],{end:'Exchange_BuySpecial'})
 await run('家族白名单最大兑换','Exchange_BuyFamily','v10-048',[[382,305,'v10-050'],[1038,451,'v10-050'],[835,517,'v10-051'],[640,680,'v10-060']],{end:'Exchange_BuyFamily'})
 const pokerSteps=[[1090,645,'v8-002'],[240,490,'v8-017'],[920,450,'v8-018'],[640,590,'v8-020']]
 await run('第一次匹配确认后立即关闭','Poker_Gate','v6-001',pokerSteps,{poker:true})
 await run('第二次匹配确认后立即关闭','Poker_Gate','v6-001',pokerSteps,{poker:true})
 await run('第三次运行直接跳过','Poker_Gate','v6-001',[],{poker:true,skip:true})
 const state=JSON.parse(fs.readFileSync(path.join(temp,'.state/weekly.json')));assert.equal(state.accounts['100102081'].poker.completed,2)
}finally{fs.rmSync(temp,{recursive:true,force:true})}
console.log(JSON.stringify({failures}));process.exit(failures?1:0)
