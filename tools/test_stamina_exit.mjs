import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'..');await import(pathToFileURL(path.join(root,'runtimes/maa/node_modules/@maaxyz/maa-node/dist/index-client.js')));
maa.Global.stdout_level='Off';maa.Global.log_dir=path.join(root,'.analysis/stamina-exit-test');
const r=new maa.Resource();await r.post_bundle(path.join(root,'assets/resource')).wait();const t=new maa.Tasker();t.resource=r;
const b=fs.readFileSync(path.join(root,'debug/on_error/2026.09.20-10.13.47.457_Stamina_HandleSweepResult.png'));const img=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
const rec=r.get_node_data_parsed('Stamina_CloseSpiritSupply').recognition;const j=t.post_recognition(rec.type,rec.param,img);await j.wait();assert.ok(t.node_detail(j.get().nodes[0]).reco.hit);console.log('PASS actual 09/20 screenshot identifies supply popup');
const blank=fs.readFileSync(path.join(root,'debug/on_error/2026.09.20-10.01.55.253_Base_SecondAction.png'));const after=blank.buffer.slice(blank.byteOffset,blank.byteOffset+blank.byteLength);let closed=false;const c=new maa.CustomController({connect:()=>true,request_uuid:()=> 'stamina-exit',get_features:()=>[],screencap:()=>closed?after:img,click:(x,y)=>{if(!closed){assert.equal(x,640);assert.equal(y,680);closed=true}else{assert.equal(x,156);assert.equal(y,40)}return true;}});
await c.post_connection().wait();t.controller=c;
const timer=setTimeout(()=>process.exit(1),15000);
const task=t.post_task('Stamina_HandleSweepResult',{Stamina_StageAfterSweep:{recognition:'DirectHit'},Stamina_CloseSpiritSupply:{post_delay:0},Stamina_CloseLevelUp:{enabled:false},Stamina_CloseLootDetails:{enabled:false},Stamina_CloseAcquired:{enabled:false},Stamina_ReturnHome:{post_delay:0},Base_OpenRoom:{recognition:'DirectHit',action:'DoNothing',next:[]}});await task.wait();assert.ok(task.succeeded);assert.ok(closed);assert.equal(t.node_detail(task.get().nodes.at(-1)).name,'Base_OpenRoom');console.log('PASS popup closes at safe blank, continues to base without buying');clearTimeout(timer);t.destroy();c.destroy();r.destroy();process.exit(0);


