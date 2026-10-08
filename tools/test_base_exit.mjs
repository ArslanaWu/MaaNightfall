import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'..');
await import(pathToFileURL(path.join(root,'runtimes/maa/node_modules/@maaxyz/maa-node/dist/index-client.js')));
maa.Global.stdout_level='Off';maa.Global.log_dir=path.join(root,'.analysis/base-exit-test');
const bytes=fs.readFileSync(path.join(root,'assets/resource/image/base/order_icon.png'));
const png=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
async function run(label,kind,submit,refresh){
 const r=new maa.Resource();await r.post_bundle(path.join(root,'assets/resource')).wait();
 const c=new maa.CustomController({connect:()=>true,request_uuid:()=>label,get_features:()=>[],screencap:()=>png,click:()=>true});
 await c.post_connection().wait();const t=new maa.Tasker();t.resource=r;t.controller=c;
 const override=Object.fromEntries(r.node_list.filter(n=>n.startsWith('Base_')).map(n=>[n,{pre_delay:0,post_delay:0,rate_limit:5,timeout:30}]));
 for(const type of ['First','Second']){
  override['Base_'+type+'StillPresent']={recognition:'DirectHit'};
  override['Base_'+type+'Submit']={recognition:'DirectHit',target:[200,550],enabled:submit,max_hit:2};
  override['Base_'+type+'Refresh']={recognition:'DirectHit',enabled:refresh,max_hit:2};
 }
 override.Base_ReturnHome={recognition:'DirectHit',next:'Dispatch_OpenBusiness'};
 override.Dispatch_OpenBusiness={recognition:'DirectHit',action:'DoNothing',next:[],pre_delay:0,post_delay:0};
 const start=kind==='First'?'Base_OrderProcess':'Base_SecondOrderProcess';
 const watchdog=setTimeout(()=>{console.error('FAIL stuck: '+label);process.exit(1)},10000);
 try{const j=t.post_task(start,override);await j.wait();assert.ok(j.succeeded,label);const names=j.get().nodes.map(id=>t.node_detail(id).name);assert.ok(names.includes('Base_LeaveOrders'));assert.equal(names.at(-1),'Dispatch_OpenBusiness');assert.ok(!names.includes('FatalExit'));assert.ok(names.filter(n=>n==='Base_'+kind+'Refresh').length<=2);console.log('PASS '+label+' -> 后续派遣');}
 finally{clearTimeout(watchdog);t.destroy();c.destroy();r.destroy();}
}
await run('特供订单刷新上限后仍有商品','First',false,true);
await run('专项订单刷新上限后仍有商品','Second',false,true);
await run('特供订单无可用提交或刷新','First',false,false);
await run('专项订单无可用提交或刷新','Second',false,false);
await run('可提交订单优先提交再刷新','Second',true,true);
process.exit(0);
