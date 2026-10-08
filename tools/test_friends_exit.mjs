import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'..');await import(pathToFileURL(path.join(root,'runtimes/maa/node_modules/@maaxyz/maa-node/dist/index-client.js')));
maa.Global.stdout_level='Off';maa.Global.log_dir=path.join(root,'.analysis/friends-exit-test');
const r=new maa.Resource();await r.post_bundle(path.join(root,'assets/resource')).wait();const t=new maa.Tasker();t.resource=r;
const b=fs.readFileSync(path.join(root,'debug/on_error/2026.09.22-09.58.45.406_Friends_Ready.png'));const img=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
for(const [name,hit] of [['Friends_ReturnHome',true],['Friends_AlreadyClaimed',false]]){const rec=r.get_node_data_parsed(name).recognition;const j=t.post_recognition(rec.type,rec.param,img);await j.wait();assert.equal(t.node_detail(j.get().nodes[0]).reco.hit,hit);}
let clicks=[];const c=new maa.CustomController({connect:()=>true,request_uuid:()=> 'friends-exit',get_features:()=>[],screencap:()=>img,click:(x,y)=>{clicks.push([x,y]);return true;}});await c.post_connection().wait();t.controller=c;
const timer=setTimeout(()=>process.exit(1),20000);
const task=t.post_task('Friends_Claim',{Friends_Claim:{post_delay:0},Friends_ReturnHome:{post_delay:0},Friends_Finish:{recognition:'DirectHit',action:'DoNothing',next:[]}});await task.wait();assert.ok(task.succeeded);assert.equal(clicks.length,2);assert.deepEqual(clicks.at(-1),[45,40]);console.log('PASS actual 4/6 page: one gift claim then return home, no repeated claims');clearTimeout(timer);t.destroy();c.destroy();r.destroy();process.exit(0);
