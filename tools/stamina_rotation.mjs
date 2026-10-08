import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

export const FAMILY_ROTATION = ['dungeon', 'chamber', 'city', 'castle']
export const ROTATION_ANCHOR = '2026-10-09'
export const shanghaiDay = now => new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10)
const dayNumber = day => Date.parse(day + 'T00:00:00Z') / 86400000
export class StaminaRotation {
 constructor(file = new URL('../.state/stamina-rotation.json', import.meta.url), now = () => new Date()) { this.file = file; this.now = now }
 read() {
  const data = fs.existsSync(this.file) ? JSON.parse(fs.readFileSync(this.file, 'utf8')) : {accounts: {}}
  if (!data.accounts || typeof data.accounts !== 'object' || Array.isArray(data.accounts)) throw Error('家族遗迹轮换记录损坏')
  return data
 }
 next(uid) {
  const account = this.read().accounts[uid]
  const anchor = account?.anchorDay ?? ROTATION_ANCHOR
  if (account && (!/^\d{4}-\d{2}-\d{2}$/.test(anchor) || !Number.isFinite(dayNumber(anchor)) || typeof account !== 'object')) throw Error('家族遗迹轮换记录损坏')
  const offset = dayNumber(shanghaiDay(this.now())) - dayNumber(anchor)
  return FAMILY_ROTATION[((offset % 4) + 4) % 4]
 }
 complete(uid, stage) {
  if (!FAMILY_ROTATION.includes(stage)) throw Error('未知家族遗迹')
  const data = this.read()
  data.accounts[uid] = {anchorDay: data.accounts[uid]?.anchorDay ?? ROTATION_ANCHOR, lastCompletedDay: shanghaiDay(this.now()), lastStage: stage}
  const filename = this.file instanceof URL ? fileURLToPath(this.file) : this.file
  fs.mkdirSync(path.dirname(filename), {recursive: true})
  const temporary = filename + '.tmp'
  fs.writeFileSync(temporary, JSON.stringify(data, null, 2) + '\n')
  fs.renameSync(temporary, this.file)
 }
}
