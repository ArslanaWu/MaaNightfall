import assert from 'node:assert/strict'
import fs from 'node:fs'
import {buildInterface,buildGuiPipeline} from './build_gui_interface.mjs'
import {MODULE_ORDER} from './modules.mjs'
import {moduleSucceeded} from './gui_actions.mjs'
import {STAGES,validatePlan,requestedCount} from './stamina_plan.mjs'
const ui=buildInterface()
assert.deepEqual(ui.task.map(t=>t.name),MODULE_ORDER)
assert.ok(ui.task.every(t=>t.default_check))
assert.equal(ui.option.stamina_stage.cases.length,11)
assert.equal(ui.github,'https://github.com/ArslanaWu/MaaNightfall')
for(const t of ui.task){assert.ok(buildGuiPipeline()[t.entry]);assert.deepEqual(buildGuiPipeline()[t.entry].on_error,[])}
const overrides=[ui.option.stamina_stage.cases[1].pipeline_override,ui.option.stamina_mode.cases[1].pipeline_override,ui.option.stamina_count.pipeline_override]
const merged=Object.assign({},...overrides)
assert.equal(merged.Gui_StaminaStage.attach.stage,'drill')
assert.equal(merged.Gui_StaminaMode.attach.mode,'count')
assert.equal(merged.Gui_StaminaCount.attach.count,'{count}')
assert.equal(validatePlan([{stage:'money',count:3},{stage:'castle',count:'all'}]).length,2)
assert.throws(()=>validatePlan([{stage:'money',count:0}]))
assert.throws(()=>validatePlan([{stage:'unknown',count:1}]))
assert.throws(()=>validatePlan([{stage:'money',count:1.5}]))
assert.equal(requestedCount(8,3),3)
assert.equal(requestedCount('all',5),5)
assert.equal(requestedCount(2,10),2)
assert.throws(()=>requestedCount(2,NaN))
const detail=id=>({name:id,completed:true})
assert.equal(moduleSucceeded({status:3,nodes:['KeepGameOpenFinish']},detail,3),true)
assert.equal(moduleSucceeded({status:3,nodes:['FatalExit','KeepGameOpenFinish']},detail,3),false)
assert.equal(moduleSucceeded({status:3,nodes:[]},detail,3),false)
assert.equal(moduleSucceeded({status:4,nodes:['KeepGameOpenFinish']},detail,3),false)
assert.deepEqual(JSON.parse(fs.readFileSync('assets/interface.json','utf8')),buildInterface({assetRoot:'.',toolRoot:'../tools'}))
console.log('PASS GUI module order/defaults, options, plan validation, limited stamina and failure propagation')
