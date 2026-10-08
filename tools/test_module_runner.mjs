import assert from 'node:assert/strict';import {runModuleSequence} from './module_runner.mjs'
let calls=[];let result=await runModuleSequence(['start','friends','briefing','rewards','close'],{execute:async n=>{calls.push(n);return{ok:n!=='briefing',stopped:false}},log:()=>{}})
assert.deepEqual(calls,['start','friends','briefing','start','rewards','close']);assert.deepEqual(result.failed,['briefing']);assert.equal(result.aborted,false)
calls=[];result=await runModuleSequence(['start','rewards','poker','close'],{execute:async n=>{calls.push(n);return {ok:true,stopped:n==='poker'}},log:()=>{}})
assert.deepEqual(calls,['start','rewards','poker']);assert.equal(result.stopped,true)
calls=[];result=await runModuleSequence(['start','briefing','rewards','close'],{execute:async n=>{calls.push(n);return{ok:n!=='start'}},log:()=>{}})
assert.deepEqual(calls,['start']);assert.equal(result.aborted,true)
console.log('PASS module failure resumes next, match skips close, startup failure aborts safely')
