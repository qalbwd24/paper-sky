/* A browser bot's non-blocking dual-rate AI client. API secrets stay on the Node server. */
class PaperOnlineDS{
 constructor({room,bot}){this.room=room;this.bot=bot;this.enabled=false;this.plan=null;this.fast=null;this.planUntil=0;this.fastUntil=0;this.nextPlan=0;this.nextJudge=0;this.planBusy=false;this.fastBusy=false;this.decisions=0;this.plans=0;this.failures=0;this.latency=0;this.lastError='';}
 setEnabled(value){this.enabled=!!value;this.fast=null;this.fastUntil=0;this.nextPlan=0;this.nextJudge=0;this.plan=null;this.planUntil=0;}
 get metrics(){return {enabled:this.enabled,fastDecisions:this.decisions,plans:this.plans,failures:this.failures,latencyMs:this.latency,lastError:this.lastError,objective:this.plan?.objective||null};}
 static compact(s){return {x:Math.round(s.x),y:Math.round(s.y),z:Math.round(s.z),yaw:+s.yaw.toFixed(2),pitch:+s.pitch.toFixed(2),speed:+s.speed.toFixed(1)};}
 static angle(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b));}
 state(c,world){
  const snap=c.state,self=snap?.players.find(p=>p.id===c.id);if(!self)return null;
  const hunter=snap.players.find(p=>p.id===snap.hunter),isHunter=c.id===snap.hunter;
  const others=snap.players.filter(p=>p.id!==c.id&&p.online&&(!isHunter||p.kind!=='bot'));
  const target=isHunter?others.reduce((a,b)=>!a||Math.hypot(b.s.x-self.s.x,b.s.y-self.s.y,b.s.z-self.s.z)<Math.hypot(a.s.x-self.s.x,a.s.y-self.s.y,a.s.z-self.s.z)?b:a,null):hunter;
  const position=ChaseNetPhysics.pos(c.e.s),dir=ChaseNetPhysics.dir(c.e.s),rays=[];
  for(const offset of [-0.6,0,0.6]){
   const ray=dir.clone().applyAxisAngle(new THREE.Vector3(0,1,0),offset);
   const hit=world.raycast(position,ray,55);
   rays.push(hit?Math.round(hit.distance):55);
  }
  const bearing=target?Math.atan2(-(target.s.x-self.s.x),-(target.s.z-self.s.z)):self.s.yaw;
  return {role:isHunter?'hunter':'runner',self:PaperOnlineDS.compact(c.e.s),
   target:target?{...PaperOnlineDS.compact(target.s),distance:Math.round(position.distanceTo(ChaseNetPhysics.pos(target.s))),relativeBearing:+PaperOnlineDS.angle(bearing,c.e.s.yaw).toFixed(2)}:null,
   obstacles:{right:rays[0],front:rays[1],left:rays[2]},
   predictedClearance:+(c.e.nav?.predictedClearance||0).toFixed(2),
   baseline:{turn:+(c.e.command?.turn||0).toFixed(2),pitch:+(c.e.command?.pitch||0).toFixed(2),boost:!!c.e.raceFast,slow:!!c.e.raceSlow},
   plan:this.plan&&performance.now()<this.planUntil?this.plan:null};
 }
 async call(kind,state){
  const res=await fetch('/chase/api/ai/'+kind,{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({room:this.room(),bot:this.bot,state}),signal:AbortSignal.timeout(kind==='plan'?5500:1800)});
  const data=await res.json().catch(()=>({error:'Invalid bridge response'}));
  if(!res.ok)throw Error(data.error||'AI bridge unavailable');return data;
 }
 tick(c,world,now){
  if(!this.enabled||!c.state?.running||c.state?.waiting)return;
  const state=this.state(c,world);if(!state)return;
  if(now>=this.planUntil){this.plan=null;state.plan=null;}
  if(now>=this.nextPlan&&!this.planBusy){
   this.planBusy=true;this.nextPlan=now+2400;
   this.call('plan',state).then(plan=>{if(!this.enabled)return;this.plan=plan;this.planUntil=performance.now()+plan.ttlMs;this.plans++;this.lastError='';})
    .catch(e=>{this.failures++;this.lastError=e.message;}).finally(()=>this.planBusy=false);
  }
  if(now>=this.nextJudge&&!this.fastBusy){
   this.fastBusy=true;this.nextJudge=now+250;
   this.call('judge',state).then(action=>{if(!this.enabled)return;this.fast=action;this.fastUntil=performance.now()+650;this.decisions++;this.latency=action.latencyMs;this.lastError='';})
    .catch(e=>{this.failures++;this.lastError=e.message;}).finally(()=>this.fastBusy=false);
  }
 }
 current(c,now){
  if(!this.enabled||!this.fast||now>this.fastUntil)return null;
  // The existing rollout planner remains the safety controller near collisions.
  if(c.e.nav?.predictedClearance<2.2)return null;
  const a=this.fast;if(!Number.isFinite(a.turn)||!Number.isFinite(a.pitch))return null;
  return {turn:Math.max(-1,Math.min(1,a.turn)),pitch:Math.max(-1,Math.min(1,a.pitch)),boost:!!a.boost,slow:!!a.slow};
 }
}
if(typeof module!=='undefined')module.exports=PaperOnlineDS;
