import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {MODULES,MODULE_ORDER} from './modules.mjs'
import {STAGES} from './stamina_plan.mjs'
export function buildInterface({version=fs.readFileSync(new URL('../VERSION',import.meta.url),'utf8').trim(),assetRoot='assets',toolRoot='tools'}={}){
 const task=MODULE_ORDER.map(name=>({
  name,label:name==='stamina'?'体力计划':MODULES[name].label,
  entry:name==='stamina'?'Gui_Stamina':'Gui_'+name,default_check:true,
  ...(name==='stamina'?{description:'默认先执行欲望酒会 X 3 次，再用当天的家族遗迹消耗全部剩余体力。按天依次轮换地牢血痕、密室残垣、市井焦土、古堡回声，四天一轮，同一天保持同一种。默认日常忽略下方次数；单关卡可自选次数。不购买体力。',option:['stamina_stage','stamina_mode']}:{})
 }))
 return {
  interface_version:2,name:'MaaNightfall',description:'夜幕之下日常助手 · 自用，可能不会稳定更新；使用风险自行承担。',
  version,github:'https://github.com/ArslanaWu/MaaNightfall',license:'MIT',
  welcome:'使用横屏模拟器并提前登录游戏。默认按顺序执行全部模块；体力计划可重复添加并排序，罪恶博弈请保持在工作任务最后。',
  controller:[{name:'MuMu 模拟器',type:'Adb',display_short_side:720}],
  resource:[{name:'官服',path:['{PROJECT_DIR}/'+assetRoot+'/resource']}],
  pretask:{name:'prepare_mumu',label:'启动 MuMu',exec:'{PROJECT_DIR}/../../runtimes/node/node.exe',args:['../../tools/gui_prepare.mjs']},
  agent:{child_exec:'{PROJECT_DIR}/'+(assetRoot==='.'?'../':'')+'runtimes/node/node.exe',child_args:['{PROJECT_DIR}/'+toolRoot+'/agent_server.mjs']},
  task,
  option:{
   stamina_stage:{type:'select',label:'关卡（难度 X）',default_case:'daily',cases:[{id:'daily',name:'日常：欲望酒会 3 次 → 家族遗迹按天轮换'},...STAGES].map(s=>({name:s.id,label:s.name,pipeline_override:{Gui_StaminaStage:{attach:{stage:s.id}}}}))},
   stamina_mode:{type:'select',label:'执行次数',default_case:'all',cases:[
    {name:'all',label:'消耗可用体力',pipeline_override:{Gui_StaminaMode:{attach:{mode:'all'}}}},
    {name:'count',label:'指定次数',option:['stamina_count'],pipeline_override:{Gui_StaminaMode:{attach:{mode:'count'}}}}
   ]},
   stamina_count:{type:'input',label:'次数',inputs:[{name:'count',label:'扫荡次数',default:'1',pipeline_type:'int',verify:'^[1-9][0-9]{0,2}$'}],pipeline_override:{Gui_StaminaCount:{attach:{count:'{count}'}}}}
  },
  preset:[{name:'daily',label:'完整日常',task:task.map(t=>({name:t.name,enabled:true}))}]
 }
}
export function buildGuiPipeline(){
 return Object.fromEntries([
 ...MODULE_ORDER.filter(x=>x!=='stamina').map(module=>['Gui_'+module,{action:'Custom',custom_action:'GuiModule',custom_action_param:{module},on_error:[]}]),
 ['Gui_Stamina',{action:'Custom',custom_action:'StaminaPlan',on_error:[]}],
 ['Gui_StaminaStage',{attach:{stage:'daily'},on_error:[]}],
 ['Gui_StaminaMode',{attach:{mode:'all'},on_error:[]}],
 ['Gui_StaminaCount',{attach:{count:1},on_error:[]}]
 ])
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const root=path.resolve(import.meta.dirname,'..')
 const output=process.argv.includes('--root')?'interface.json':'assets/interface.json'
 const opts=process.argv.includes('--root')?{}:{assetRoot:'.',toolRoot:'../tools'}
 fs.writeFileSync(path.join(root,output),JSON.stringify(buildInterface(opts),null,2)+'\n')
 fs.writeFileSync(path.join(root,'assets/resource/pipeline/95_gui.json'),JSON.stringify(buildGuiPipeline(),null,2)+'\n')
}
