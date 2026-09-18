import path from 'node:path'
import fs from 'node:fs'
import {pathToFileURL} from 'node:url'
import {registerActions} from './custom_actions.mjs'

const [maaRoot,resourcePath] = process.argv.slice(2)
if (!maaRoot || !resourcePath) throw new Error('Expected runtime and resource paths')
const server=process.argv.includes('--server')
await import(pathToFileURL(path.join(maaRoot,'node_modules/@maaxyz/maa-node/dist',server?'index-server.js':'index-client.js')).href)
if (!server) {
  const logDir=path.join(path.resolve(import.meta.dirname,'..'),'debug','runtime-check')
  fs.mkdirSync(logDir,{recursive:true})
  maa.Global.log_dir=logDir
  maa.Global.stdout_level='Error'
  const resource=new maa.Resource()
  try {
    registerActions(resource,path.resolve(import.meta.dirname,'..'))
    const job=resource.post_bundle(resourcePath)
    await job.wait()
    if(!job.succeeded)throw Error('Failed to load project resources')
  } finally {resource.destroy()}
}
console.log('PASS '+(server?'Agent import':'resource loading'))
