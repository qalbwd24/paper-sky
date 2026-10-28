/* Test pilots live in the host browser. Each uses its own real WebSocket seat. */
class PaperOnlineAI{
 static humanTarget(players,self){const distance=p=>Math.hypot(p.s.x-self.s.x,p.s.y-self.s.y,p.s.z-self.s.z);return players.filter(p=>p.id!==self.id&&p.online&&p.kind!=='bot').reduce((best,p)=>!best||distance(p)<distance(best)?p:best,null);}
 constructor({bridge,room,onInfo}){this.B=bridge;this.room=room;this.onInfo=onInfo;this.clients=new Map();this.delay=0;this.dsEnabled=false;this.last=performance.now();this.timer=setInterval(()=>this.tick(),16);}
 get metrics(){return [...this.clients].map(([id,c])=>({id,rtt:c.rtt||0,pending:c.pending.length,decisions:c.decisions,target:c.target||null,behavior:c.e.behavior,speedGoal:c.pursuit?.desiredSpeed,online:c.ws?.readyState===1,ds:c.ds?.metrics}));}
 sync(state){this.state=state;for(const p of state.players)if(p.kind==='bot'&&p.proxy===state.you&&!this.clients.has(p.id))this.add(p);for(const [id,c]of this.clients)if(!state.players.some(p=>p.id===id&&p.proxy===state.you)){this.close(c);this.clients.delete(id);}}
 setDelay(value){this.delay=value;this.clear();if(this.state)this.sync(this.state);}
 setDeepSeek(value){this.dsEnabled=!!value;for(const c of this.clients.values())c.ds?.setEnabled(this.dsEnabled);}
 close(c){c.closed=true;c.ws?.close();for(const t of c.timers)clearTimeout(t);c.timers.clear();}
 clear(){for(const c of this.clients.values())this.close(c);this.clients.clear();}
 stop(){this.clear();clearInterval(this.timer);}
 later(c,fn,delay=this.delay/2){if(c.closed)return;const timer=setTimeout(()=>{c.timers.delete(timer);if(!c.closed)fn();},delay);c.timers.add(timer);}
 send(c,value){this.later(c,()=>{if(c.ws.readyState===1)c.ws.send(JSON.stringify(value));});}
 add(player){const c={id:player.id,closed:false,timers:new Set(),epoch:-1,seq:0,pending:[],batch:[],body:new FlightContact(),acc:0,nextThink:0,decisions:0,lastPacket:0};this.clients.set(c.id,c);c.ds=new PaperOnlineDS({room:()=>this.room(),bot:c.id});c.ds.setEnabled(this.dsEnabled);c.pilot=new PaperPilot(this.B.world());c.e={id:parseInt(c.id.slice(-2),16)%3,hp:3,dead:0,s:{...player.s},controls:{},raceFast:false};c.pilot.reset(c.e);c.pursuit=new PaperPursuit(c.pilot,PaperOnlineAI.humanTarget);c.turnDebt=0;c.liftDebt=0;
  const leg=()=>{const e=c.e,p=ChaseNetPhysics.pos(e.s),h=c.state?.players.find(p=>p.id===c.state.hunter),isHunter=c.state?.hunter===c.id;let goal;if(isHunter){const target=PaperOnlineAI.humanTarget(c.state.players,{id:c.id,s:e.s});c.target=target?.id||null;if(target)goal=ChaseNetPhysics.pos(target.s).addScaledVector(ChaseNetPhysics.dir(target.s),target.s.speed*.4);}if(!goal){const forward=h&&h.id!==c.id? p.clone().sub(ChaseNetPhysics.pos(h.s)).normalize():ChaseNetPhysics.dir(e.s);goal=p.clone().addScaledVector(forward,100);goal.y=e.s.y+Math.sin(e.nav.metrics.legs+c.e.id)*8;const home=ChaseNetPhysics.pos(this.B.world().spawn(3));if(p.distanceTo(home)>380)goal=p.clone().lerp(home,.4);}c.pilot.clampGoal(goal);Object.assign(e.nav,{goal,origin:p,path:[],index:0,job:null,retry:c.time,lastGoalAt:c.time,progressAt:c.time,best:p.distanceTo(goal),mode:isHunter?'AI 追近':'AI 逃逸'});e.nav.metrics.legs++;};
  c.pilot.race={allowBraking:true,maxPitch:.22,profile:()=>c.state?.hunter===c.id?ChaseNetPhysics.hunter:ChaseNetPhysics.runner,isHunter:()=>c.state?.hunter===c.id,newLeg:leg,plan:()=>{}};
  const connect=()=>{if(c.closed)return;const ws=c.ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/chase/api/socket');ws.onopen=()=>this.send(c,{type:'attach',room:this.room(),bot:c.id});ws.onerror=()=>{};ws.onclose=()=>{if(!c.closed)this.later(c,connect,1500);};ws.onmessage=event=>this.later(c,()=>{let snap;try{snap=JSON.parse(event.data);}catch{return;}if(['closed','left','replaced'].includes(snap.type)){this.close(c);return;}if(snap.type==='pong'){c.rtt=Math.round(performance.now()-snap.at);return;}if(snap.type==='error'){this.close(c);return;}if(snap.type!=='state')return;const p=snap.players.find(p=>p.id===c.id);if(!p)return;c.state=snap;c.lastPacket=performance.now();c.time=snap.time;if(c.epoch!==p.epoch){c.epoch=p.epoch;c.target=null;c.seq=p.ack;c.pending=[];c.batch=[];c.acc=0;c.pilot.reset(c.e);c.pursuit.reset();c.turnDebt=c.liftDebt=0;}c.pending=c.pending.filter(f=>f.seq>p.ack);c.e.s={...p.s};ChaseNetPhysics.restore(c.body,p.contact);for(const f of c.pending)ChaseNetPhysics.step(c.e.s,f.input,snap.hunter===c.id,c.body,this.B.world());});};connect();
 }
 tick(){const now=performance.now(),dt=Math.min(.08,(now-this.last)/1000);this.last=now;for(const c of this.clients.values()){
  if(!c.state||c.closed||!c.state.running||c.state.waiting||c.ws.readyState!==1||now-c.lastPacket>2000)continue;
  c.acc+=dt;while(c.acc>=ChaseNetPhysics.DT&&c.pending.length<60){c.acc-=ChaseNetPhysics.DT;c.time+=ChaseNetPhysics.DT;const hunter=c.state.hunter===c.id;
   if(c.time>=c.nextThink){c.nextThink=c.time+.2;const others=c.state.players.filter(p=>p.id!==c.id).map((p,i)=>({id:i,s:p.s,dead:0}));if(hunter){c.pursuit.update(c.e,c.state.players,c.id,c.time,(c.rtt||0)/2000);c.target=c.pursuit.target;}else{c.e.raceFast=false;c.e.raceSlow=false;c.pilot.update(c.e,this.B.state,c.time,others,true);}c.decisions++;c.ds?.tick(c,this.B.world(),now);}
   const dsCommand=c.ds?.current(c,now);
   const command=dsCommand||c.e.command||{turn:0,pitch:.6};
   const input=PaperPursuit.input(command,c,dsCommand?(hunter&&dsCommand.boost):(hunter&&c.e.raceFast),dsCommand?dsCommand.slow:(c.e.raceSlow||c.e.nav.predictedClearance<1.2));const frame={seq:++c.seq,input};c.pending.push(frame);c.batch.push(frame);ChaseNetPhysics.step(c.e.s,input,hunter,c.body,this.B.world());if(c.batch.length>=2){this.send(c,{type:'input',epoch:c.epoch,frames:c.batch});c.batch=[];}
  }
  if(now-(c.pingAt||0)>2000){c.pingAt=now;this.send(c,{type:'ping',at:now});}
 }if(now-(this.infoAt||0)>1000){this.infoAt=now;const values=this.metrics;this.onInfo(values.length?'测试 AI '+values.length+' · 往返 '+values.map(m=>m.rtt?m.rtt+'ms':'测量中').join(' / ')+(this.dsEnabled?' · DS 快 '+values.reduce((n,m)=>n+(m.ds?.fastDecisions||0),0)+' / 慢 '+values.reduce((n,m)=>n+(m.ds?.plans||0),0)+' / 回退 '+values.reduce((n,m)=>n+(m.ds?.failures||0),0):''):'');}}
}

if(typeof module!=='undefined')module.exports=PaperOnlineAI;


