import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {createRequire} from 'node:module'

const [archive,destination,integrity,expectedName,expectedVersion]=process.argv.slice(2)
if(!archive||!destination||!integrity?.startsWith('sha512-')||!expectedName||!expectedVersion)throw Error('Invalid package install arguments')
const actual=crypto.createHash('sha512').update(fs.readFileSync(archive)).digest('base64')
if(actual!==integrity.slice(7))throw Error('Package integrity mismatch: '+expectedName)
// Use the archive library shipped with official Node.js; no npm installation,
// user configuration, install scripts or additional downloads are involved.
const require=createRequire(path.join(path.dirname(process.execPath),'node_modules/npm/package.json'))
const tar=require('tar')
await tar.x({
  file:archive,cwd:destination,strip:1,strict:true,preservePaths:false,
  filter(name,entry) {
    if(!name.startsWith('package/')||name.split('/').includes('..'))throw Error('Invalid archive path')
    if(!['File','Directory'].includes(entry.type))throw Error('Unsupported archive entry type: '+entry.type)
    return true
  },
})
const pkg=JSON.parse(fs.readFileSync(path.join(destination,'package.json'),'utf8'))
if(pkg.name!==expectedName||pkg.version!==expectedVersion)throw Error('Unexpected package identity')
console.log('PASS verified package '+expectedName+'@'+expectedVersion)
