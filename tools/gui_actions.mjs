import {MODULES,createExecutionPlan} from './modules.mjs'
import {createIO} from './custom_actions.mjs'
import {runStaminaPlan} from './stamina_plan.mjs'
export function moduleSucceeded(result,detail,status){
 if(!result||result.status!==status)return false
 const nodes=result.nodes.map(detail)
 return !nodes.some(n=>['FatalExit','AbortTask','AbortAfterStopFailure'].includes(n?.name))&&nodes.some(n=>['KeepGameOpenFinish','SuccessExit','Poker_Closed'].includes(n?.name)&&n.completed)
}
export function registerGuiActions(target){
 target.register_custom_action('GuiModule',async({context,param})=>{
  if(!Object.hasOwn(MODULES,param.module))throw Error('未知 GUI 模块')
  const plan=createExecutionPlan([param.module])
  const result=await context.clone().run_task(plan.taskEntry,plan.pipelineOverride)
  return moduleSucceeded(result,id=>context.tasker.node_detail(id),maa.Status.Succeeded)
 })
 target.register_custom_action('StaminaPlan',async({context,param})=>{
  const input=param??{}
  if(input.plan)return runStaminaPlan(createIO(context),input.plan)
  const stage=input.stage??context.get_node_data_parsed('Gui_StaminaStage')?.attach?.stage
  const mode=input.mode??context.get_node_data_parsed('Gui_StaminaMode')?.attach?.mode
  const count=mode==='all'?'all':Number(input.count??context.get_node_data_parsed('Gui_StaminaCount')?.attach?.count)
  return runStaminaPlan(createIO(context),[{stage,count}])
 })
}
