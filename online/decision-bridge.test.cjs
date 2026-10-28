'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createDecisionBridge,normalize}=require('./decision-bridge.cjs');
test('normalizes model output and blocks invalid controls',()=>{
 const a=normalize('judge',{turn:99,pitch:-88,boost:true,slow:false,reason:'ok'});
 assert.deepEqual({turn:a.turn,pitch:a.pitch,boost:a.boost,slow:a.slow},{turn:1,pitch:-1,boost:true,slow:false});
 const p=normalize('plan',{objective:'pursue',preferredSide:'left',altitudeBias:50,speedMode:'fast',ttlMs:99999});
 assert.equal(p.altitudeBias,1);assert.equal(p.ttlMs,8000);
 assert.throws(()=>normalize('plan',null),/Invalid/);
});
test('requires explicit opt in and keeps key off status endpoint',async()=>{
 const b=createDecisionBridge({env:{DEEPSEEK_API_KEY:'secret'}});
 assert.equal(b.status().enabled,false);assert.doesNotMatch(JSON.stringify(b.status()),/secret/);
 await assert.rejects(()=>b.decide('judge',{}),/disabled/);
});
test('judge and plan use distinct models; fast disables thinking; plan is passed through',async()=>{
 const requests=[];
 const fetchImpl=async(url,options)=>{
  requests.push({url,body:JSON.parse(options.body),authorization:options.headers.Authorization});
  const kind=requests.length===1?'plan':'judge';
  return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(kind==='plan'?{objective:'pursue',preferredSide:'right',altitudeBias:0.2,speedMode:'fast',ttlMs:2400}:{turn:0.4,pitch:-0.2,boost:true,slow:false})}}],usage:{prompt_tokens:50,completion_tokens:20}})};
 };
 const b=createDecisionBridge({env:{AI_BRIDGE_ENABLED:'1',DEEPSEEK_API_KEY:'secret',PLANNER_MODEL:'large',FAST_MODEL:'small'},fetchImpl});
 const plan=await b.decide('plan',{role:'hunter'});const action=await b.decide('judge',{role:'hunter',plan});
 assert.equal(b.status().enabled,true);
 assert.equal(plan.objective,'pursue');assert.equal(action.turn,0.4);
 assert.equal(requests[0].body.model,'large');assert.equal(requests[0].body.thinking.type,'enabled');
 assert.equal(requests[1].body.model,'small');assert.equal(requests[1].body.thinking.type,'disabled');
 assert.equal(JSON.parse(requests[1].body.messages[1].content).plan.objective,'pursue');
 assert.equal(requests[0].authorization,'Bearer secret');
});
test('rejects malformed model answer and enforces a call budget',async()=>{
 let n=0;
 const b=createDecisionBridge({env:{AI_BRIDGE_ENABLED:'1',DEEPSEEK_API_KEY:'secret',AI_MAX_CALLS_PER_MIN:'1'},fetchImpl:async()=>{n++;return {ok:true,json:async()=>({choices:[{message:{content:'not json'}}]})};}});
 await assert.rejects(()=>b.decide('judge',{a:1}),/invalid decision/);
 await assert.rejects(()=>b.decide('judge',{a:1}),/budget/);
 assert.equal(n,1);
});
