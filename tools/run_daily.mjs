import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline/promises'
import { pathToFileURL } from 'node:url'

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..')
const RESOURCE_PATH = path.join(PROJECT_ROOT, 'assets', 'resource')
const ENTRY = 'DailyRoutine'
const DEVICE_DISCOVERY_ATTEMPTS = 30
const DEVICE_DISCOVERY_DELAY_MS = 2000

const MODULES = {
  start: {
    label: '启动游戏',
  },
  stamina: {
    label: '清理体力',
    entry: 'Stamina_OpenFamilyAffairs',
    exit: 'Stamina_ReturnHome',
  },
  base: {
    label: '据点产物与订单',
    entry: 'Base_OpenRoom',
    exit: 'Base_ReturnHome',
  },
  dispatch: {
    label: '秘密派遣',
    entry: 'Dispatch_OpenBusiness',
    exit: 'Dispatch_Finish',
  },
  briefing: {
    label: '巡夜简报',
    entry: 'Briefing_OpenBusiness',
    exit: 'Briefing_ReturnHome',
  },
  rewards: {
    label: '每日/每周奖励',
    entry: 'Rewards_OpenPlan',
    exit: 'Rewards_Finish',
  },
  close: {
    label: '关闭游戏',
  },
  drinks: {
    label: '每日免费饮品',
    entry: 'Drinks_OpenPlan',
    exit: 'Drinks_Finish',
  },
  pass: {
    label: '通行证任务与奖励',
    entry: 'Pass_Open',
    exit: 'Pass_Finish',
  },
  shop: {
    label: '商店免费礼包',
    entry: 'Shop_Open',
    exit: 'Shop_Finish',
  },
}

const MODULE_ORDER = Object.keys(MODULES)
const WORK_MODULES = ['drinks', 'stamina', 'base', 'dispatch', 'briefing', 'rewards', 'pass', 'shop']

function modulesArgument() {
  const pluralIndex = process.argv.indexOf('--modules')
  if (pluralIndex >= 0) return process.argv[pluralIndex + 1]

  const singularIndex = process.argv.indexOf('--module')
  return singularIndex >= 0 ? process.argv[singularIndex + 1] : undefined
}

function normalizeModules(value) {
  const requested = value
    .split(/[,+\s]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

  if (requested.includes('all')) return [...MODULE_ORDER]

  const invalid = requested.filter((name) => !(name in MODULES))
  if (invalid.length) throw new Error(`未知模块：${invalid.join(', ')}`)

  const selected = MODULE_ORDER.filter((name) => requested.includes(name))
  if (!selected.length) throw new Error('至少需要选择一个模块。')
  return selected
}

async function selectModules({ interactive }) {
  const argument = modulesArgument()
  if (argument) return normalizeModules(argument)
  if (!interactive || !process.stdin.isTTY) return [...MODULE_ORDER]

  console.log('[MaaYMZX] 请选择本次执行的模块（可多选）：')
  MODULE_ORDER.forEach((name, index) => console.log(`  ${index + 1}. ${MODULES[name].label}`))

  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = (await prompt.question('请输入序号，用空格分隔（直接回车执行全部）：')).trim()
  prompt.close()

  if (!answer) return [...MODULE_ORDER]

  const numbers = answer
    .split(/[,，+\s]+/)
    .map((item) => Number(item))
  if (numbers.some((number) => !Number.isInteger(number) || number < 1 || number > MODULE_ORDER.length)) {
    throw new Error(`无效的模块序号：${answer}`)
  }

  const requested = numbers.map((number) => MODULE_ORDER[number - 1])
  return MODULE_ORDER.filter((name) => requested.includes(name))
}

function createExecutionPlan(selectedModules) {
  const selectedWork = WORK_MODULES.filter((name) => selectedModules.includes(name))
  const shouldStart = selectedModules.includes('start')
  const shouldClose = selectedModules.includes('close')
  const terminal = shouldClose ? 'SuccessExit' : 'KeepGameOpenFinish'
  const pipelineOverride = {}

  if (shouldStart) {
    pipelineOverride.Startup_HomeReady = {
      next: selectedWork.length ? MODULES[selectedWork[0]].entry : terminal,
    }
  }

  selectedWork.forEach((name, index) => {
    const nextName = selectedWork[index + 1]
    pipelineOverride[MODULES[name].exit] = {
      next: nextName ? MODULES[nextName].entry : terminal,
    }
  })

  const taskEntry = shouldStart
    ? ENTRY
    : selectedWork.length
      ? MODULES[selectedWork[0]].entry
      : terminal

  return { pipelineOverride, taskEntry }
}

function findMaaNode() {
  const installRoot = path.join(os.homedir(), '.maa-tools', 'install')
  const candidates = ['latest', '5.13.0']

  if (fs.existsSync(installRoot)) {
    const otherVersions = fs
      .readdirSync(installRoot, { withFileTypes: true })
      .filter((item) => item.isDirectory() && !candidates.includes(item.name))
      .map((item) => item.name)
      .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }))
    candidates.push(...otherVersions)
  }

  for (const version of candidates) {
    const entry = path.join(installRoot, version, 'node_modules', '@maaxyz', 'maa-node', 'dist', 'index-client.js')
    if (fs.existsSync(entry)) return entry
  }

  throw new Error('没有找到 MaaFramework 运行库。请先在项目目录执行：node_modules\\.bin\\maa-tools.cmd check')
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
  console.log(`[MaaYMZX] 任务状态：${statusName(result.status)}`)

  const succeeded = taskJob.succeeded
  tasker.destroy()
  controller.destroy()
  resource.destroy()

  if (!succeeded) throw new Error('任务未正常完成；详细信息请查看 debug\\maafw.log。')
  const ending = selectedModules.includes('close') ? '游戏已关闭。' : '游戏保持开启。'
  console.log(`[MaaYMZX] 所选模块执行完成，${ending}`)
}

main().catch((error) => {
  console.error(`[MaaYMZX] ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
