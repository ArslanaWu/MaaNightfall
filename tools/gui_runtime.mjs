import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {execFileSync} from 'node:child_process'
const root=path.resolve(import.meta.dirname,'..')
const exe=path.join(root,'MFAAvalonia.exe')
const version='v2.16.1'
const digest='47a2b7ed086577319893386ecdaf17886cfb7d8ed20cdfe13abdc6925fd38fe0'
if(!fs.existsSync(exe)){
 const stage=path.join(root,'runtimes','gui-download')
 fs.mkdirSync(stage,{recursive:true})
 const zip=path.join(stage,'gui.zip')
 console.log('[GUI] 下载 MFAAvalonia '+version)
 const headers={Accept:'application/octet-stream','User-Agent':'MaaNightfall'}
 if(process.env.GITHUB_TOKEN)headers.Authorization='Bearer '+process.env.GITHUB_TOKEN
 const response=await fetch('https://api.github.com/repos/MaaXYZ/MFAAvalonia/releases/assets/542608775',{headers,signal:AbortSignal.timeout(180000)})
 if(!response.ok)throw Error('GUI 下载失败：'+response.status)
 const bytes=Buffer.from(await response.arrayBuffer())
 if(crypto.createHash('sha256').update(bytes).digest('hex')!==digest)throw Error('GUI 下载校验失败')
 fs.writeFileSync(zip,bytes)
 execFileSync('powershell.exe',['-NoProfile','-Command', 'Expand-Archive -LiteralPath $env:MAANIGHTFALL_GUI_ZIP -DestinationPath $env:MAANIGHTFALL_GUI_STAGE -Force'],{env:{...process.env,MAANIGHTFALL_GUI_ZIP:zip,MAANIGHTFALL_GUI_STAGE:path.join(stage,'unpacked')},windowsHide:true})
 for(const name of fs.readdirSync(path.join(stage,'unpacked')))fs.cpSync(path.join(stage,'unpacked',name),path.join(root,name),{recursive:true})
}
fs.mkdirSync(path.join(root,'resource/base'),{recursive:true})
const native=path.join(root,'runtimes/maa/node_modules/@maaxyz/maa-node-win32-x64')
const guiNative=path.join(root,'runtimes/win-x64/native')
fs.mkdirSync(guiNative,{recursive:true})
for(const name of fs.readdirSync(native))if(name.endsWith('.dll')){
 const source=path.join(native,name),dest=path.join(guiNative,name)
 if(!fs.existsSync(dest)||!fs.readFileSync(source).equals(fs.readFileSync(dest)))fs.copyFileSync(source,dest)
}
fs.mkdirSync(path.join(root,'config'),{recursive:true})
if(!fs.existsSync(path.join(root,'config/config.json')))fs.copyFileSync(path.join(root,'assets/gui_config_template.json'),path.join(root,'config/config.template.json'))
console.log('[GUI] 已准备 MFAAvalonia')
