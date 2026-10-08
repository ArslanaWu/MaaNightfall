import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
await import(pathToFileURL(path.join(root, 'runtimes/maa/node_modules/@maaxyz/maa-node/dist/index-client.js')).href)
maa.Global.stdout_level = 'Off'
maa.Global.log_dir = path.join(root, '.analysis/briefing-leave-race')

const resource = new maa.Resource()
const load = resource.post_bundle(path.join(root, 'assets/resource'))
await load.wait()
assert.ok(load.succeeded)
const timer = setTimeout(() => process.exit(1), 20000)

for (const name of [
  '2026.09.27-10.02.29.119_Briefing_Leave.png',
  '2026.09.28-10.00.58.28_Briefing_Leave.png',
]) {
  const bytes = fs.readFileSync(path.join(root, 'debug/on_error', name))
  const popup = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  const clicks = []
  const controller = new maa.CustomController({
    connect: () => true,
    request_uuid: () => 'briefing-leave-race',
    get_features: () => [],
    screencap: () => popup,
    click: (x, y) => { clicks.push([x, y]); return true },
  })
  const connect = controller.post_connection()
  await connect.wait()
  assert.ok(connect.succeeded)
  const screen = controller.post_screencap()
  await screen.wait()
  assert.ok(screen.succeeded)
  const tasker = new maa.Tasker()
  tasker.resource = resource
  tasker.controller = controller
  const job = tasker.post_task('Briefing_Leave', {
    Briefing_CloseRewardBeforeLeave: {post_delay: 0, next: []},
  })
  await job.wait()
  assert.ok(job.succeeded, `Failed to recover ${name}`)
  assert.deepEqual(clicks, [[45, 40], [640, 680]], name)
  tasker.destroy()
  controller.destroy()
  console.log(`PASS delayed reward after Leave: ${name}`)
}

clearTimeout(timer)
resource.destroy()
process.exit(0)
