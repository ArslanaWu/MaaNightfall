import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {IntervalLedger} from './interval_ledger.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nightfall-cycle-'));const file=path.join(dir,'record.json');const period={days:15,anchor:'2026-09-23T05:00:00+08:00'};let now=Date.parse('2026-09-25T13:00:00+08:00');const ledger=new IntervalLedger(file,()=>now);
try{
 fs.writeFileSync(file,JSON.stringify({test:{silentDoor:{completedAt:'2026-09-19T13:02:39.979Z',nextEligibleAt:'2026-09-25T21:04:50+08:00'}}}));
 assert.equal(ledger.due('test','silentDoor',period),true);await ledger.run('test','silentDoor',period,async()=>true);assert.equal(ledger.due('test','silentDoor',period),false);
 now=Date.parse('2026-10-08T04:59:59+08:00');assert.equal(ledger.due('test','silentDoor',period),false);
 now=Date.parse('2026-10-08T05:00:00+08:00');assert.equal(ledger.due('test','silentDoor',period),true);
 console.log('PASS current period due, no repeat, next period starts Oct 8 at 05:00 CST');
}finally{fs.rmSync(dir,{recursive:true,force:true})}
