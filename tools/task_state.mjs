import fs from 'node:fs'
import path from 'node:path'
import {WeeklyLedger} from './weekly_ledger.mjs'
const root=path.resolve(import.meta.dirname,'..')
const policies=JSON.parse(fs.readFileSync(path.join(root,'assets/task_policies.json')))
const file=path.join(root,'.state/weekly.json')
const [command='status',uid,key,countText]=process.argv.slice(2)
if(command==='status')console.log(fs.existsSync(file)?fs.readFileSync(file,'utf8'):'尚无周限记录')
else if(command==='set'){
 const count=Number(countText)
 if(!uid||!policies.tasks[key]||countText===undefined||!Number.isInteger(count)||count<0||count>policies.tasks[key].limit)throw Error('用法：node tools/task_state.mjs set UID 任务名 已完成次数')
 const ledger=new WeeklyLedger(file,policies)
 ledger.transaction(data=>{const entry=ledger.entry(data,uid,key);entry.completed=count;entry.pending=null;entry.note='手动校准'})
 console.log('已校准当前周期的 '+key+' 次数：'+count)
}else throw Error('支持 status 或 set UID 任务名 已完成次数')
