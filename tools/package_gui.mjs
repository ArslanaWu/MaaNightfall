import fs from 'node:fs'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import {buildInterface} from './build_gui_interface.mjs'
const root=path.resolve(import.meta.dirname,'..')
const version=process.argv[2]??'0.2.0'
if(!/^v?\d+\.\d+\.\d+(?:[-.][a-zA-Z0-9.-]+)?$/.test(version))throw Error('无效版本')
const out=path.join(root,'dist','MaaNightfall-'+version+'-win-x86_64')
if(fs.existsSync(out))throw Error('发行目录已存在，请选择新版本或先移走：'+out)
execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(root,'tools/build_launcher.ps1')],{stdio:'inherit',windowsHide:true})
for(const required of ['MaaNightfall.exe','MFAAvalonia.exe','runtimes/node/node.exe','runtimes/maa/node_modules/@maaxyz/maa-node/dist/index-server.js','runtimes/dotnet/dotnet.exe','assets/resource/model/ocr/rec.onnx']){
 if(!fs.existsSync(path.join(root,required)))throw Error('缺少发行依赖：'+required)
}
fs.mkdirSync(path.join(out,'resource/base'),{recursive:true})
const copy=(name)=>fs.cpSync(path.join(root,name),path.join(out,name),{recursive:true})
for(const name of ['assets','tools','docs','libs','plugins','MaaAgentBinary','README.md','LICENSE','package.json','package-lock.json','MaaNightfall.exe','run_gui.cmd','run_daily.cmd','update_runtime.cmd','libloader.dll'])if(fs.existsSync(path.join(root,name)))copy(name)
for(const name of fs.readdirSync(root))if(/^MFAAvalonia\.(exe|dll|deps.json|runtimeconfig.json)$/.test(name))copy(name)
for(const name of ['node','maa','dotnet','win-x64'])copy('runtimes/'+name)
fs.writeFileSync(path.join(out,'interface.json'),JSON.stringify(buildInterface({version:version.replace(/^v/,'')}),null,2)+'\n')
fs.writeFileSync(path.join(out,'.gui-release'),version+'\n')
fs.mkdirSync(path.join(out,'config'),{recursive:true})
fs.copyFileSync(path.join(root,'assets/gui_config_template.json'),path.join(out,'config/config.template.json'))
const zip=out+'.zip'
execFileSync('powershell.exe',['-NoProfile','-Command', 'Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory($env:MAANIGHTFALL_PACKAGE_DIR,$env:MAANIGHTFALL_PACKAGE_ZIP)'],{env:{...process.env,MAANIGHTFALL_PACKAGE_DIR:out,MAANIGHTFALL_PACKAGE_ZIP:zip},windowsHide:true})
console.log(zip)
