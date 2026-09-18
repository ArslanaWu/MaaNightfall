import assert from 'node:assert/strict'
import {MODULES, MODULE_ORDER, WORK_MODULES, normalizeModules, createExecutionPlan} from './modules.mjs'

assert.equal(MODULE_ORDER.length,14)
assert.deepEqual(normalizeModules(''),MODULE_ORDER)
assert.deepEqual(normalizeModules('  '),MODULE_ORDER)
assert.deepEqual(normalizeModules('all'),MODULE_ORDER)
assert.deepEqual(normalizeModules('10，1 3,10 14'),['start','friends','pass','close'])
assert.deepEqual(normalizeModules('pass start friends close'),['start','friends','pass','close'])
assert.equal(WORK_MODULES.at(-1),'poker')
assert.ok(WORK_MODULES.indexOf('friends')<WORK_MODULES.indexOf('stamina'))
for(const input of ['0','15','1.5','all typo','__proto__'])assert.throws(()=>normalizeModules(input))

const selected=createExecutionPlan(normalizeModules('10 1 3 14'))
assert.equal(selected.taskEntry,'DailyRoutine')
assert.deepEqual(selected.pipelineOverride,{
  Startup_HomeReady:{next:'Friends_Open'},
  Friends_Finish:{next:'Pass_Open'},
  Pass_Finish:{next:'SuccessExit'},
})
assert.equal(createExecutionPlan(['start']).pipelineOverride.Startup_HomeReady.next,'KeepGameOpenFinish')
assert.equal(createExecutionPlan(['close']).taskEntry,'SuccessExit')
assert.equal(createExecutionPlan(['exchange']).pipelineOverride.Exchange_Finish.next,'KeepGameOpenFinish')
assert.equal(createExecutionPlan(['poker']).pipelineOverride.Poker_Skip.next,'KeepGameOpenFinish')
assert.equal(createExecutionPlan(['poker','close']).pipelineOverride.Poker_Skip.next,'SuccessExit')

// Every standalone work module must end without falling into unselected work.
for(const name of WORK_MODULES){
  const plan=createExecutionPlan([name])
  assert.equal(plan.taskEntry,MODULES[name].entry)
  assert.equal(plan.pipelineOverride[MODULES[name].exit].next,'KeepGameOpenFinish')
}
console.log('PASS 模块排序、多选去重、单模块隔离和启动/关闭衔接')
