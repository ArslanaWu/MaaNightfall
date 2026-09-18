import {MODULES, MODULE_ORDER, WORK_MODULES, normalizeModules, createExecutionPlan} from './modules.mjs'
import {registerActions} from './custom_actions.mjs'
import fs from 'node:fs'
import {findMaaNode} from './runtime.mjs'
import path from 'node:path'
import {selectModuleMenu} from './module_menu.mjs'
import { pathToFileURL } from 'node:url'

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..')
const RESOURCE_PATH = path.join(PROJECT_ROOT, 'assets', 'resource')
const DEVICE_DISCOVERY_ATTEMPTS = 30
const DEVICE_DISCOVERY_DELAY_MS = 2000

function modulesArgument() {
  const pluralIndex = process.argv.indexOf('--modules')
  if (pluralIndex >= 0) return process.argv[pluralIndex + 1]

  const singularIndex = process.argv.indexOf('--module')
  return singularIndex >= 0 ? process.argv[singularIndex + 1] : undefined
}

async function selectModules({ interactive }) {
  const argument = modulesArgument()
  if (argument) return normalizeModules(argument)
  if (!interactive || !process.stdin.isTTY) return [...MODULE_ORDER]
  return selectModuleMenu(MODULE_ORDER.map(id => ({id, label: MODULES[id].label})))
}

function statusName(status) {
  for (const [name, value] of Object.entries(maa.Status)) {
    if (value === status) return name
  }
  return String(status)
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function isMuMuDevice(device) {
  const [name, , , , , config] = device
  if (/mumu/i.test(name)) return true

  try {
    return Boolean(JSON.parse(config)?.extras?.mumu?.enable)
  } catch {
    return false
  }
}

async function connectMuMuController() {
  let lastError

  for (let attempt = 1; attempt <= DEVICE_DISCOVERY_ATTEMPTS; attempt++) {
    let controller

    try {
      // Do not pass a fixed ADB path here. The global finder asks MuMuManager for
      // the running instance and returns its ADB path, serial and MuMu extras.
      const devices = await maa.AdbController.find()
      const device = devices?.find(isMuMuDevice)
      if (device) {
        const [, adbPath, address, screencapMethods, inputMethods, config] = device
        controller = new maa.AdbController(
          adbPath,
          address,
          screencapMethods,
          inputMethods,
          config,
        )
        controller.screenshot_target_short_side = 720

        const connectJob = controller.post_connection()
        await connectJob.wait()
        if (connectJob.succeeded) {
          const connectedController = controller
          controller = undefined
          return { controller: connectedController, address }
        }

        lastError = new Error(`MaaFramework 无法连接 ${address}`)
      }
    } catch (error) {
      lastError = error
    } finally {
      controller?.destroy()
    }

    if (attempt === 1) {
      const waitSeconds = (DEVICE_DISCOVERY_ATTEMPTS * DEVICE_DISCOVERY_DELAY_MS) / 1000
      console.log(`[MaaYMZX] MuMu/ADB 尚未就绪，最多等待 ${waitSeconds} 秒……`)
    }
    if (attempt < DEVICE_DISCOVERY_ATTEMPTS) await sleep(DEVICE_DISCOVERY_DELAY_MS)
  }

  const reason = lastError instanceof Error ? `（最后一次错误：${lastError.message}）` : ''
  throw new Error(`无法连接 MuMu 12，请确认模拟器已启动且 ADB 调试可用。${reason}`)
}

async function main() {
  const checkOnly = process.argv.includes('--check')
  const probeOnly = process.argv.includes('--probe')
  const selectedModules = await selectModules({ interactive: !checkOnly && !probeOnly })
  if (selectedModules === null) {
    console.log('[MaaYMZX] 已取消执行。')
    return
  }
  const executionPlan = createExecutionPlan(selectedModules)

  await import(pathToFileURL(findMaaNode()).href)

  const logDir = path.join(PROJECT_ROOT, 'debug')
  fs.mkdirSync(logDir, { recursive: true })
  maa.Global.log_dir = logDir
  maa.Global.stdout_level = 'Error'
  maa.Global.save_on_error = true

  console.log(`[MaaYMZX] MaaFramework ${maa.Global.version}`)
  console.log('[MaaYMZX] 正在加载识别资源……')

  const resource = new maa.Resource()
  registerActions(resource, PROJECT_ROOT)
  const loadJob = resource.post_bundle(RESOURCE_PATH)
  await loadJob.wait()
  if (!loadJob.succeeded) throw new Error(`资源加载失败：${RESOURCE_PATH}`)
  resource.override_pipeline(executionPlan.pipelineOverride)

  if (checkOnly) {
    const labels = selectedModules.map((name) => MODULES[name].label).join('、')
    console.log(`[MaaYMZX] 运行库、资源和所选模块均可正常加载：${labels}`)
    resource.destroy()
    return
  }

  console.log('[MaaYMZX] 正在通过 MuMuManager 查找模拟器……')
  const { controller, address } = await connectMuMuController()
  console.log(`[MaaYMZX] 已发现 MuMu：${address}`)

  console.log(`[MaaYMZX] 已连接，分辨率：${controller.resolution?.join('×') ?? '未知'}`)
  if (probeOnly) {
    console.log('[MaaYMZX] 模拟器连接测试通过；没有执行游戏任务。')
    controller.destroy()
    resource.destroy()
    return
  }

  const tasker = new maa.Tasker()
  tasker.resource = resource
  tasker.controller = controller
  tasker.add_context_sink((_context, message) => {
    if (message.msg.endsWith('PipelineNode.Starting')) console.log(`[执行] ${message.name}`)
  })

  if (!tasker.inited) throw new Error('Tasker 初始化失败。')

  const executionOrder = [
    ...(selectedModules.includes('start') ? ['start'] : []),
    ...WORK_MODULES.filter((name) => selectedModules.includes(name)),
    ...(selectedModules.includes('close') ? ['close'] : []),
  ]
  const labels = executionOrder.map((name) => MODULES[name].label).join(' → ')
  if (!selectedModules.includes('start') && selectedModules.some((name) => WORK_MODULES.includes(name))) {
    console.log('[MaaYMZX] 未选择“启动游戏”，请确保游戏已经停在主界面。')
  }
  console.log(`[MaaYMZX] 开始执行：${labels}。请不要操作模拟器。`)
  const taskJob = tasker.post_task(executionPlan.taskEntry)
  await taskJob.wait()
  const result = taskJob.get()
  const completedNodes = result.nodes.map((id) => tasker.node_detail(id))
  const terminal = selectedModules.includes('close') ? 'SuccessExit' : 'KeepGameOpenFinish'
  const aborted = completedNodes.some((node) => ['FatalExit', 'AbortTask', 'AbortAfterStopFailure'].includes(node?.name))
  const succeeded = taskJob.succeeded && !aborted && completedNodes.some((node) => [terminal, 'Poker_Closed'].includes(node?.name) && node.completed)
  console.log(`[MaaYMZX] 任务状态：${succeeded ? statusName(result.status) : 'Failed'}`)
  tasker.destroy()
  controller.destroy()
  resource.destroy()

  if (!succeeded) throw new Error('任务未正常完成；详细信息请查看 debug\\maafw.log。')
  const ending = (selectedModules.includes('close') || completedNodes.some(node => node?.name === 'Poker_Closed')) ? '游戏已关闭。' : '游戏保持开启。'
  console.log(`[MaaYMZX] 所选模块执行完成，${ending}`)
}

main().catch((error) => {
  console.error(`[MaaYMZX] ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
