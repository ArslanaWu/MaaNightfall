import {WORK_MODULES} from './modules.mjs'
export async function runModuleSequence(selected,{execute,log=console.log}){
 const failed=[];let stopped=false,recover=false,aborted=false
 const start=async()=>{const result=await execute('start');if(!result.ok){failed.push('start');aborted=true;log('[模块] 启动游戏失败，无法安全继续');return false}return true}
 if(selected.includes('start')&&!await start())return {failed,aborted,stopped}
 for(const name of WORK_MODULES.filter(name=>selected.includes(name))){
  if(recover&&!await start())break
  recover=false
  const result=await execute(name)
  if(result.stopped){stopped=true;break}
  if(result.unrecoverable){failed.push(name);aborted=true;log('[模块] '+name+' 后设备无法安全恢复，停止后续执行');break}
  if(!result.ok){failed.push(name);recover=true;log('[模块] '+name+' 失败，下一模块重新启动游戏后继续')}
 }
 if(selected.includes('close')&&!stopped){const result=await execute('close');if(!result.ok){failed.push('close');aborted=true}}
 return {failed,aborted,stopped}
}
