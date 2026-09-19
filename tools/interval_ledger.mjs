import fs from 'node:fs'
import path from 'node:path'
export const DAY_MS=24*60*60*1000
// Rolling intervals are independent of calendar-week quotas.
export class IntervalLedger {
 constructor(file,now=()=>Date.now()){this.file=file;this.now=now}
 read(){
  const data=fs.existsSync(this.file)?JSON.parse(fs.readFileSync(this.file,'utf8')):{}
  const object=x=>x&&typeof x==='object'&&!Array.isArray(x)
  if(!object(data)||Object.values(data).some(account=>!object(account)||Object.values(account).some(record=>!object(record)||typeof record.completedAt!=='string'||!Number.isFinite(Date.parse(record.completedAt))||(record.nextEligibleAt!==undefined&&(typeof record.nextEligibleAt!=='string'||!Number.isFinite(Date.parse(record.nextEligibleAt)))))))throw Error('周期记录损坏，拒绝重置执行时间')
  return data
 }
 due(uid,key,days){
  if(!Number.isInteger(days)||days<1)throw Error('周期天数必须是正整数')
  const record=this.read()[uid]?.[key]
  if(record?.nextEligibleAt!==undefined)return this.now()>=Date.parse(record.nextEligibleAt)
  const last=record?.completedAt
  if(!last)return true
  const timestamp=Date.parse(last)
  if(!Number.isFinite(timestamp))throw Error('周期记录损坏，无法判断上次执行时间')
  return this.now()-timestamp>=days*DAY_MS
 }
 complete(uid,key){
  const data=this.read()
  data[uid]??={};data[uid][key]={completedAt:new Date(this.now()).toISOString()}
  fs.mkdirSync(path.dirname(this.file),{recursive:true})
  fs.writeFileSync(this.file+'.tmp',JSON.stringify(data,null,2)+'\n')
  fs.renameSync(this.file+'.tmp',this.file)
 }
 async run(uid,key,days,action){
  fs.mkdirSync(path.dirname(this.file),{recursive:true})
  const lock=this.file+'.lock'
  let fd
  try{fd=fs.openSync(lock,'wx')}catch(e){
   if(e.code==='EEXIST')throw Error('周期任务已有执行锁；确认没有其他任务运行后删除 '+lock)
   throw e
  }
  try{
   if(!this.due(uid,key,days))return {skipped:true}
   if(!await action())throw Error('周期任务未正常结束，不记录完成')
   this.complete(uid,key)
   return {skipped:false}
  }finally{fs.closeSync(fd);fs.unlinkSync(lock)}
 }
}

