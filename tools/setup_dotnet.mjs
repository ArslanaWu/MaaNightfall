import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {execFileSync} from 'node:child_process'
const root=path.resolve(import.meta.dirname,'..')
const target=path.join(root,'runtimes/dotnet')
if(!fs.existsSync(path.join(target,'dotnet.exe'))){
 const meta=await fetch('https://builds.dotnet.microsoft.com/dotnet/release-metadata/10.0/releases.json',{signal:AbortSignal.timeout(30000)})
 if(!meta.ok)throw Error('无法读取 .NET 版本')
 const data=await meta.json()
 const release=data.releases.find(r=>r.runtime.version===data['latest-runtime'])
 const file=release?.runtime.files.find(f=>f.rid==='win-x64'&&f.name==='dotnet-runtime-win-x64.zip')
 if(!file)throw Error('没有匹配的 .NET 10 Windows 运行库')
 console.log('[GUI] 下载包内 .NET '+release.runtime.version)
 const response=await fetch(file.url,{signal:AbortSignal.timeout(180000)})
 if(!response.ok)throw Error('.NET 下载失败')
 const bytes=Buffer.from(await response.arrayBuffer())
 if(crypto.createHash('sha512').update(bytes).digest('hex')!==file.hash.toLowerCase())throw Error('.NET 校验失败')
 const zip=path.join(root,'runtimes/dotnet.zip')
 fs.writeFileSync(zip,bytes)
 fs.mkdirSync(target,{recursive:true})
 execFileSync('powershell.exe',['-NoProfile','-Command','Expand-Archive -LiteralPath $env:MAANIGHTFALL_DOTNET_ZIP -DestinationPath $env:MAANIGHTFALL_DOTNET_DIR -Force'],{env:{...process.env,MAANIGHTFALL_DOTNET_ZIP:zip,MAANIGHTFALL_DOTNET_DIR:target},windowsHide:true})
}
