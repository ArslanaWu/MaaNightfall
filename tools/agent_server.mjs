import {findMaaNode} from './runtime.mjs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {registerActions} from './custom_actions.mjs'
await import(pathToFileURL(findMaaNode({server:true})).href)
registerActions(maa.Server,path.resolve(import.meta.dirname,'..'))
if(!await maa.Server.start_up(process.argv.at(-1)))throw Error('Agent 启动失败')
await maa.Server.join()
await maa.Server.shut_down()
