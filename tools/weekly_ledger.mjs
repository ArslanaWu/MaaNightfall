import fs from 'node:fs'
import path from 'node:path'

export function periodKey(now, reset) {
  const shifted = new Date(now.getTime() + (reset.utcOffsetHours - reset.hour) * 3600000)
  shifted.setUTCDate(shifted.getUTCDate() - (shifted.getUTCDay() - reset.weekday + 7) % 7)
  return shifted.toISOString().slice(0, 10)
}

// Shared by all limited tasks; pending attempts count until reconciled to avoid
// starting another game after a process crash between matching and confirmation.
export class WeeklyLedger {
  constructor(file, policies, now = () => new Date()) {
    this.file = file; this.policies = policies; this.now = now
  }
  transaction(fn) {
    fs.mkdirSync(path.dirname(this.file), {recursive:true})
    const lock = this.file + '.lock'
    const fd = fs.openSync(lock, 'wx')
    try {
      const data = fs.existsSync(this.file) ? JSON.parse(fs.readFileSync(this.file,'utf8')) : {version:1, accounts:{}}
      if(data.version !== 1 || !data.accounts) throw Error('周限记录格式无效，停止执行')
      const result = fn(data)
      const temp = this.file + '.tmp'
      fs.writeFileSync(temp, JSON.stringify(data,null,2)+'\n')
      fs.renameSync(temp,this.file)
      return result
    } finally { fs.closeSync(fd); fs.unlinkSync(lock) }
  }
  entry(data, uid, key) {
    if(!/^\d+$/.test(uid) || !this.policies.tasks[key]) throw Error('未知账号或周限任务')
    const week = periodKey(this.now(),this.policies.reset)
    const account = data.accounts[uid] ??= {}
    if(account[key]?.week !== week) account[key] = {week, completed:0, pending:null}
    const e=account[key]
    if(!Number.isInteger(e.completed)||e.completed<0) throw Error('周限次数记录无效')
    return e
  }
  available(uid,key) {return this.transaction(d=>{const e=this.entry(d,uid,key);return !e.pending && e.completed<this.policies.tasks[key].limit})}
  reserve(uid,key) {return this.transaction(d=>{const e=this.entry(d,uid,key);if(e.pending||e.completed>=this.policies.tasks[key].limit)return false;e.pending=this.now().toISOString();return true})}
  complete(uid,key) {return this.transaction(d=>{const e=this.entry(d,uid,key);if(!e.pending)throw Error('匹配确认缺少预留记录');e.completed++;e.pending=null})}
}
