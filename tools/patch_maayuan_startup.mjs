import fs from 'node:fs'
import path from 'node:path'

// Apply only the startup-sign-in fix; retain the installed version and local tasks.
const root = process.argv[2]
if (!root) throw new Error('Usage: node tools/patch_maayuan_startup.mjs <MaaYuan directory>')
const file = path.join(root, 'resource/base/pipeline/start_up.json')
const original = fs.readFileSync(file, 'utf8')
const pipeline = JSON.parse(original)
const claim = pipeline['sub_活动弹窗领取test']
const entry = pipeline['sub_活动弹窗关闭']
const reward = pipeline['确认收取小鸟签到']
if (!claim?.recognition?.param || !entry?.recognition || !reward?.recognition) {
  throw new Error('Unrecognized startup pipeline; no files changed')
}
claim.recognition.param.expected = '^领取$'
claim.action = {type: 'Click', param: {target: true}}
claim.next = ['sub_活动签到奖励确认', 'sub_活动签到关闭']
claim.on_error = ['sub_活动签到关闭']
claim.timeout = 10000
pipeline['sub_活动签到奖励确认'] = {
  ...structuredClone(reward),
  next: ['sub_活动签到关闭'],
  on_error: ['sub_活动签到关闭'],
  timeout: 10000,
  post_delay: 800,
}
pipeline['sub_活动签到关闭'] = {
  recognition: structuredClone(entry.recognition),
  action: {type: 'Click', param: {target: [640, 0, 51, 43]}},
  post_delay: 800,
}
entry.next = ['sub_活动弹窗领取test', 'sub_活动签到关闭']
const updated = JSON.stringify(pipeline, null, 2) + '\n'
if (updated === original) {
  console.log('Startup sign-in fix already installed')
} else {
  const backup = file + '.before-signin-' + Date.now() + '.bak'
  fs.copyFileSync(file, backup, fs.constants.COPYFILE_EXCL)
  fs.writeFileSync(file, updated)
  console.log('Patched ' + file + '\nBackup: ' + backup)
}
