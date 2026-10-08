import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'..');await import(pathToFileURL(path.join(root,'runtimes/maa/node_modules/@maaxyz/maa-node/dist/index-client.js')));
maa.Global.stdout_level='Off';maa.Global.log_dir=path.join(root,'.analysis/pass-exit-test');
const r=new maa.Resource();await r.post_bundle(path.join(root,'assets/resource')).wait();const t=new maa.Tasker();t.resource=r;
const load=p=>{const b=fs.readFileSync(path.join(root,p));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};
const img=load('debug/on_error/2026.09.21-10.03.03.74_Pass_Open.png');const after=load('debug/on_error/2026.09.20-10.01.55.253_Base_SecondAction.png');
const rec=r.get_node_data_parsed('Pass_CloseUpgrade').recognition;
for(const [frame,hit] of [[img,true],[after,false]]){const j=t.post_recognition(rec.type,rec.param,frame);await j.wait();assert.equal(t.node_detail(j.get().nodes[0]).reco.hit,hit)}
console.log('PASS actual paid page detected; unrelated page rejected');
let closed=false,failure;const c=new maa.CustomController({connect:()=>true,request_uuid:()=> 'pass-exit',get_features:()=>[],screencap:()=>closed?after:img,click:(x,y)=>{if(closed||x!==45||y!==40){failure=[x,y];return false}closed=true;return true;}});
await c.post_connection().wait();t.controller=c;
const timer=setTimeout(()=>process.exit(1),15000);
const task=t.post_task('Pass_Open',{Pass_CloseUpgrade:{post_delay:0},Pass_OpenTasks:{recognition:'DirectHit',action:'DoNothing',next:'Pass_OpenDaily'},Pass_OpenDaily:{recognition:'DirectHit',action:'DoNothing',next:[]}});await task.wait();assert.ok(task.succeeded);assert.equal(failure,undefined);assert.ok(closed);assert.equal(t.node_detail(task.get().nodes.at(-1)).name,'Pass_OpenDaily');console.log('PASS only back clicked, then daily pass tasks reached');clearTimeout(timer);t.destroy();c.destroy();r.destroy();process.exit(0);
