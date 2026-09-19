// Menu order, execution order and UI tasks share this single definition.
export const MODULES = {
  start: {label: '启动游戏'},
  drinks: {label: '每日免费饮品', entry: 'Drinks_OpenPlan', exit: 'Drinks_Finish'},
  friends: {label: '好友赠礼', entry: 'Friends_Open', exit: 'Friends_Finish'},
  stamina: {label: '清理体力', entry: 'Stamina_OpenFamilyAffairs', exit: 'Stamina_ReturnHome'},
  base: {label: '据点产物与订单', entry: 'Base_OpenRoom', exit: 'Base_ReturnHome'},
  dispatch: {label: '秘密派遣', entry: 'Dispatch_OpenBusiness', exit: 'Dispatch_Finish'},
  briefing: {label: '巡夜简报', entry: 'Briefing_OpenBusiness', exit: 'Briefing_ReturnHome'},
  impression: {label: '首领印象属性激活', entry: 'Impression_OpenBusiness', exit: 'Impression_Finish'},
  rewards: {label: '每日/每周奖励', entry: 'Rewards_OpenPlan', exit: 'Rewards_Finish'},
  pass: {label: '通行证任务与奖励', entry: 'Pass_Open', exit: 'Pass_Finish'},
  shop: {label: '商店免费礼包', entry: 'Shop_Open', exit: 'Shop_Finish'},
  exchange: {label: '指定商店兑换', entry: 'Exchange_Open', exit: 'Exchange_Finish'},
  challenge: {label: '缄默暗门挑战（每 15 天一次）', entry: 'Challenge_Run', exit: 'Challenge_Finish'},
  poker: {label: '罪恶博弈（每周两次，匹配后关闭游戏）', entry: 'Poker_Gate', exit: 'Poker_Skip'},
  close: {label: '关闭游戏'},
}
export const MODULE_ORDER = Object.keys(MODULES)
export const WORK_MODULES = MODULE_ORDER.filter(name => MODULES[name].entry)

export function normalizeModules(value) {
  const tokens = value.trim().toLowerCase().split(/[,，+\s]+/).filter(Boolean)
  if (!tokens.length) return [...MODULE_ORDER]
  const requested = tokens.map(token => /^\d+$/.test(token) ? MODULE_ORDER[Number(token) - 1] ?? token : token)
  const invalid = requested.filter(name => !Object.hasOwn(MODULES, name) && name !== 'all' && name !== '全部')
  if (invalid.length) throw new Error(`无效的模块名称或序号：${invalid.join(', ')}`)
  if (requested.includes('all') || requested.includes('全部')) return [...MODULE_ORDER]
  return MODULE_ORDER.filter(name => requested.includes(name))
}

export function createExecutionPlan(selectedModules) {
  const selectedWork = WORK_MODULES.filter(name => selectedModules.includes(name))
  const shouldStart = selectedModules.includes('start')
  const terminal = selectedModules.includes('close') ? 'SuccessExit' : 'KeepGameOpenFinish'
  const pipelineOverride = {}
  if (shouldStart) pipelineOverride.Startup_HomeReady = {next: selectedWork.length ? MODULES[selectedWork[0]].entry : terminal}
  selectedWork.forEach((name, index) => {
    const nextName = selectedWork[index + 1]
    pipelineOverride[MODULES[name].exit] = {next: nextName ? MODULES[nextName].entry : terminal}
  })
  const taskEntry = shouldStart ? 'DailyRoutine' : selectedWork.length ? MODULES[selectedWork[0]].entry : terminal
  return {pipelineOverride, taskEntry}
}
