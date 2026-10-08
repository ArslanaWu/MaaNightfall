import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
await import(pathToFileURL(path.join(root, 'runtimes/maa/node_modules/@maaxyz/maa-node/dist/index-client.js')))
maa.Global.stdout_level = 'Off'
maa.Global.log_dir = path.join(root, '.analysis/startup-regression')
const resource = new maa.Resource()
const load = resource.post_bundle(path.join(root, 'assets/resource'))
await load.wait()
assert.ok(load.succeeded)
const tasker = new maa.Tasker()
tasker.resource = resource
const image = filename => {
  const bytes = fs.readFileSync(filename)
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}
const timer = setTimeout(() => { console.error('Regression timed out'); process.exit(1) }, 60000)
let controller
try {
  // The real loading screen must survive the old 30-second startup limit.
  const loading = image(path.join(root, 'debug/on_error/2026.09.29-10.08.18.418_DailyRoutine.png'))
  const home = image(path.join(root, '.analysis/nightfall-home-20260929.png'))
  let started
  controller = new maa.CustomController({
    connect: () => true, request_uuid: () => 'startup-slow-load', get_features: () => [],
    start_app: () => { started = Date.now(); return true },
    screencap: () => Date.now() - started < 32000 ? loading : home,
    click: () => { throw new Error('Unexpected click during loading regression') },
  })
  controller.screenshot_target_short_side = 720
  await controller.post_connection().wait()
  tasker.controller = controller
  const job = tasker.post_task('DailyRoutine', {
    DailyRoutine: {post_delay: 0},
    Startup_HomeLayerDetected: {next: []},
  })
  await job.wait()
  assert.ok(job.succeeded)
  assert.ok(Date.now() - started >= 32000)
  console.log('PASS real loading screen waits beyond 30 seconds and reaches home')
  controller.destroy()
  controller = undefined

  if (process.argv[2]) {
    const yuan = process.argv[2]
    const pipeline = JSON.parse(fs.readFileSync(path.join(yuan, 'resource/base/pipeline/start_up.json'), 'utf8'))
    const screenshot = image(path.join(yuan, 'debug/on_error/sub_活动弹窗领取test_2026.09.29-11.05.47.377.png'))
    const claim = pipeline['sub_活动弹窗领取test']
    const close = pipeline['sub_活动签到关闭']
    assert.ok(!new RegExp(claim.recognition.param.expected).test('已领取'))
    let clicks = []
    controller = new maa.CustomController({
      connect: () => true, request_uuid: () => 'yuan-signin', get_features: () => [],
      screencap: () => screenshot,
      click: (x, y) => { clicks.push([x, y]); return true },
    })
    await controller.post_connection().wait()
    tasker.controller = controller
    for (const [name, node] of [['Claim', claim], ['Close', close]]) {
      const job = tasker.post_task(name, {[name]: {...node, next: [], on_error: [], post_delay: 0}})
      await job.wait()
      assert.ok(job.succeeded, name)
    }
    assert.equal(clicks.length, 2)
    assert.ok(clicks[0][0] > 185 && clicks[0][0] < 290 && clicks[0][1] > 795 && clicks[0][1] < 840, JSON.stringify(clicks))
    assert.ok(clicks[1][0] >= 640 && clicks[1][0] <= 691 && clicks[1][1] <= 43)
    console.log('PASS real anniversary screenshot clicks unclaimed reward and guarded close')
  }
} finally {
  clearTimeout(timer)
  tasker.destroy()
  controller?.destroy()
  resource.destroy()
}
process.exit(0)
