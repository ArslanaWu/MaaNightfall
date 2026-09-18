import path from 'node:path'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'

const execute=promisify(execFile)
export async function ensureMuMu({
  instance=process.env.MAANIGHTFALL_MUMU_INSTANCE ?? '0',
  managerPath=process.env.MAANIGHTFALL_MUMU_MANAGER,
  run=execute,
}={}) {
  if(!/^\d+$/.test(String(instance))||Number(instance)>65535)throw Error('MuMu 实例编号无效')
  const args=['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(import.meta.dirname,'start_mumu.ps1'),'-Instance',String(instance)]
  if(managerPath)args.push('-ManagerPath',managerPath)
  let stdout
  try {
    ;({stdout}=await run('powershell.exe',args,{windowsHide:true,timeout:150000,maxBuffer:1024*1024,encoding:'utf8'}))
  } catch(error) {
    throw new Error('MuMu 启动或等待失败：'+(error.stderr?.trim()||error.message),{cause:error})
  }
  const state=JSON.parse(stdout.trim().replace(/^\uFEFF/,''))
  if(Number(state.index)!==Number(instance)||typeof state.address!=='string'||!/^.+:\d+$/.test(state.address))throw Error('MuMu 返回了无效的实例信息')
  return state
}
