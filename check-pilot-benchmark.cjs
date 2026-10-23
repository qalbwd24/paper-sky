const fs=require('fs'),vm=require('vm'),THREE=require('./vendor/three.min.js'),C=require('./flight-core.js'),{performance}=require('perf_hooks');
const sb={THREE,FlightCore:C,module:{exports:{}}};vm.createContext(sb);vm.runInContext(fs.readFileSync('labyrinth.js','utf8')+';this.R=Labyrinth;',sb);vm.runInContext(fs.readFileSync('paper-pilot.js','utf8'),sb);const Pilot=sb.module.exports;
vm.runInContext(fs.readFileSync('backups/before-ai-planner-20260912-145337/paper-combat.js','utf8')+';this.Old=PaperCombat;',sb);
function simulate(seed,algorithm,seconds=120,moving=false){
 const world=sb.buildLabyrinth(seed),player={...world.spawn(3),pitch:0,bank:0,speed:moving?25:0},pilot=new Pilot(world),fake=Object.create(sb.Old.prototype);Object.assign(fake,{world,floor:3});
 const enemies=Array.from({length:3},(_,id)=>({id,hp:3,dead:0}));let crashes=0,maxSpeed=0,ms=0,decisions=0,arrivals=0,plans=0,escapes=0;const cells=new Set(),samples=[],timeStep=1/120;
 function spawn(e){let found=false,p;const f=pilot.dir(player),right=new THREE.Vector3(-f.z,0,f.x);for(let i=0;i<35;i++){p=pilot.pos(player).addScaledVector(f,14+e.id*8+i*9).addScaledVector(right,(e.id-1)*2+Math.sin(i*2)*18);p.y+=-2-e.id*.8+i*.8;if(world.floorAt(p.y)===3&&pilot.clear(p,p.clone().addScaledVector(f,45),3)){found=true;break;}}e.s={x:p.x,y:p.y,z:p.z,yaw:player.yaw,pitch:0,bank:0,speed:8,distance:0,acceleration:0,climbInput:.57,boostControl:0};e.controls={left:0,right:0,pitch:.57,boost:false,slow:false};e.dead=found?0:3;e.waypoint=e.id;pilot.reset(e);e.nextThink=0;e.lastSample=pilot.pos(e.s);}
 for(const e of enemies)spawn(e);
 for(let i=0;i<seconds*120;i++){const time=i*timeStep;if(moving){const angle=time*.04,origin=world.spawn(3);player.x=origin.x+Math.sin(angle)*110;player.z=origin.z-100+Math.cos(angle)*100;player.y=origin.y+Math.sin(time*.08)*6;player.yaw=-Math.PI/2-angle;}
  for(const e of enemies){if(e.dead>0){e.dead-=timeStep;if(e.dead<=0)spawn(e);continue;}
   if(time>=e.nextThink){const begin=performance.now();if(algorithm==='old')fake.decide(e,player);else pilot.update(e,player,time,enemies,!moving);ms+=performance.now()-begin;decisions++;e.nextThink=time+(algorithm==='old'?.1:.12);}
   if(algorithm==='new')pilot.smooth(e,timeStep);const before=pilot.pos(e.s),profile=algorithm==='new'?pilot.profile(e):{...sb.R.combatProfile,cruiseSpeed:e.behavior==='伴飞'?C.clamp(player.speed-2+(before.distanceTo(pilot.pos(player))<15?4:0),8,26):22+e.id*2,cruiseMaxSpeed:30,maxSpeed:30,turnRate:.95};C.advance(e.s,e.controls,timeStep,profile);maxSpeed=Math.max(maxSpeed,e.s.speed);const now=pilot.pos(e.s),delta=now.clone().sub(before),length=delta.length(),wall=world.raycast(before,delta.divideScalar(length),length+.784);
   if(wall||now.y<world.ground(now.x,now.z,now.y)+.448){crashes++;arrivals+=e.nav.metrics.arrivals;plans+=e.nav.metrics.plans;escapes+=e.nav.metrics.escapes;e.dead=4;continue;}
   if(i%120===0)cells.add([Math.floor(e.s.x/25),Math.floor(e.s.z/25),Math.floor(e.s.y/25)].join(','));if(i%1200===0){samples.push(now.distanceTo(e.lastSample));e.lastSample.copy(now);}
  }
 }
 for(const e of enemies){arrivals+=e.nav.metrics.arrivals;plans+=e.nav.metrics.plans;escapes+=e.nav.metrics.escapes;}
 return {seed,algorithm,seconds,moving,crashes,cells:cells.size,mean10sDisplacement:samples.slice(3).reduce((a,b)=>a+b,0)/Math.max(1,samples.length-3),arrivals,plans,escapes,maxSpeed,meanDecisionMs:ms/decisions};
}
const quick=process.argv.includes('--quick'),results=[];for(const seed of quick?[73021]:[73021,17,2300099960])for(const algorithm of ['old','new']){const result=simulate(seed,algorithm,quick?60:120);results.push(result);console.log(JSON.stringify(result));}
if(!quick){const moving=simulate(73021,'new',120,true);results.push(moving);console.log(JSON.stringify(moving));}fs.writeFileSync('references/pilot-benchmark'+(quick?'-quick':'')+'.json',JSON.stringify(results,null,2));
const assert=require('node:assert/strict');for(const r of results.filter(r=>r.algorithm==='new'&&!r.moving)){const old=results.find(p=>p.seed===r.seed&&p.algorithm==='old');assert(r.cells>old.cells*4,'must explore beyond the old orbit');assert(r.arrivals>=r.seconds/6,'must complete flight legs');assert(r.maxSpeed<=30,'respect speed limit');assert(r.crashes<=1,'patrol cannot rely on repeated crash/respawn');}
