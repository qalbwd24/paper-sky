'use strict';
// Server-only DeepSeek/OpenAI-compatible decision bridge. No API keys reach the browser.
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const finite=(value,fallback=0)=>typeof value==='number'&&Number.isFinite(value)?value:fallback;
const enumOf=(value,choices,fallback)=>choices.includes(value)?value:fallback;
function normalize(kind,answer){
 if(!answer||typeof answer!=='object'||Array.isArray(answer))throw Error('Invalid decision JSON');
 const reason=typeof answer.reason==='string'?answer.reason.slice(0,120):'';
 if(kind==='plan')return {
  objective:enumOf(answer.objective,['pursue','evade','patrol'],'patrol'),
  preferredSide:enumOf(answer.preferredSide,['left','right','center'],'center'),
  altitudeBias:clamp(finite(answer.altitudeBias),-1,1),
  speedMode:enumOf(answer.speedMode,['fast','normal','slow'],'normal'),
  ttlMs:clamp(Math.round(finite(answer.ttlMs,4000)),1500,8000),reason
 };
 if(kind==='judge')return {
  turn:clamp(finite(answer.turn),-1,1),
  pitch:clamp(finite(answer.pitch),-1,1),
  boost:answer.boost===true,slow:answer.slow===true,reason
 };
 throw Error('Unknown decision kind');
}
const SYSTEM={
 plan:'You plan for a 3D paper-airplane chase game. Input is authoritative numerical state. Do not invent obstacles or teleport. Return only JSON: {"objective":"pursue|evade|patrol","preferredSide":"left|right|center","altitudeBias":0,"speedMode":"fast|normal|slow","ttlMs":4000,"reason":"short"}. Plan a short maneuver rather than a long story. A hunter should pursue a human player; a runner should evade the hunter. Treat obstacle distances as meters.',
 judge:'You control a 3D paper airplane. Return only JSON: {"turn":0,"pitch":0,"boost":false,"slow":false,"reason":"short"}. turn +1 means turn left, -1 right. pitch +1 means climb, -1 dive. Respect state.plan as a strategic preference, but immediately prioritize obstacle clearance and survival. No teleports. Prefer conservative movement near walls.'
};
function createDecisionBridge({env=process.env,fetchImpl=globalThis.fetch,clock=()=>Date.now()}={}){
 const enabled=env.AI_BRIDGE_ENABLED==='1';
 const root=env.DEEPSEEK_BASE_URL||'https://api.deepseek.com';
 const settings={
  plan:{model:env.PLANNER_MODEL||'deepseek-v4-pro',base:env.PLANNER_BASE_URL||root,key:env.PLANNER_API_KEY||env.DEEPSEEK_API_KEY,timeout:clamp(Number(env.PLANNER_TIMEOUT_MS)||4500,500,15000),tokens:360,think:env.PLANNER_THINKING!=='0'},
  judge:{model:env.FAST_MODEL||'deepseek-flash',base:env.FAST_BASE_URL||root,key:env.FAST_API_KEY||env.DEEPSEEK_API_KEY,timeout:clamp(Number(env.FAST_TIMEOUT_MS)||900,250,10000),tokens:180,think:false}
 };
 let used=0,windowAt=clock();
 const maxPerMinute=clamp(Number(env.AI_MAX_CALLS_PER_MIN)||120,1,1200);
 function status(){return {enabled:enabled&&!!settings.plan.key&&!!settings.judge.key,fastModel:settings.judge.model,plannerModel:settings.plan.model};}
 async function decide(kind,state){
  if(!Object.hasOwn(settings,kind))throw Error('Unknown decision kind');
  const cfg=settings[kind];
  if(!enabled||!cfg.key)throw Error('AI bridge is disabled or missing a key');
  const input=JSON.stringify(state);
  if(input.length>2800)throw Error('AI state too large');
  const now=clock();if(now-windowAt>=60000){windowAt=now;used=0;}
  if(used>=maxPerMinute)throw Error('AI call budget exceeded');used++;
  const url=cfg.base.replace(/\/+$/,'')+'/chat/completions';
  if(!/^https:\/\//.test(url)&&!/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\//.test(url))throw Error('AI API endpoint must be HTTPS or local loopback');
  const started=clock();
  const payload={
   model:cfg.model,messages:[{role:'system',content:SYSTEM[kind]},{role:'user',content:input}],
   response_format:{type:'json_object'},max_tokens:cfg.tokens,stream:false,
   thinking:{type:cfg.think?'enabled':'disabled'}
  };
  if(cfg.think)payload.reasoning_effort='low';else payload.temperature=0.1;
  let response;
  try{response=await fetchImpl(url,{
   method:'POST',headers:{Authorization:'Bearer '+cfg.key,'Content-Type':'application/json'},
   body:JSON.stringify(payload),signal:AbortSignal.timeout(cfg.timeout)
  });}catch{throw Error('AI provider timeout or network error');}
  if(!response.ok)throw Error('AI provider HTTP '+response.status);
  let value;try{value=await response.json();}catch{throw Error('AI provider returned invalid JSON');}
  if(value.choices?.[0]?.finish_reason==='length')throw Error('AI response was truncated');
  let answer;try{answer=JSON.parse(value.choices?.[0]?.message?.content||'');}
  catch{throw Error('AI returned invalid decision JSON');}
  return {...normalize(kind,answer),model:cfg.model,latencyMs:clamp(clock()-started,0,60000),usage:{input:value.usage?.prompt_tokens||0,output:value.usage?.completion_tokens||0}};
 }
 return {status,decide,normalize};
}
module.exports={createDecisionBridge,normalize};
