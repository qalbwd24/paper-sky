const test=require('node:test'),assert=require('node:assert/strict'),{Rooms}=require('./rooms.cjs'),{P}=require('./world.cjs'),{tip}=require('../chase-map.js');
const empty={width:1680,depth:1680,spawn:()=>({x:0,y:1200,z:0,yaw:0}),raycast:()=>null,ground:()=>1062};
function fixture(){const rooms=new Rooms({world:empty}),{r,invite}=rooms.create('a','A','white');rooms.join(r,'b','B','math',invite);for(const p of r.players)p.online=true;rooms.start(r,'a',r.players[0].id);const [h,t]=r.players;for(const p of r.players){p.immune=0;Object.assign(p.s,{x:0,y:1200,z:0,yaw:0,pitch:0});}t.s.z=-34;return {rooms,r,h,t};}
test('requested capture constants and exact 138-tick lock at 34m, no duplicate scoring',()=>{
 assert.equal(P.RANGE,35);assert.equal(P.LOCK,2.3);const {rooms,r,h,t}=fixture(),step=P.step;P.step=()=>{};
 try{for(let i=0;i<137;i++)rooms.tick(r);assert.equal(r.missile,null);assert.equal(rooms.snapshot(r,'a').capture.reason,'locking');rooms.tick(r);assert.equal(r.missile.target,t.id);for(let i=0;i<60;i++)rooms.tick(r);assert.equal(h.score,1);assert.equal(t.caught,1);assert.equal(r.hunter,t.id);assert.equal(t.s.z,0);assert.equal(h.s.z,0);assert.equal(rooms.snapshot(r,'a').rules.range,35);}finally{P.step=step;}
});
test('distance is symmetric at identical authoritative time despite independently predicted views',()=>{
 const {rooms,r,h,t}=fixture();for(let i=0;i<150;i++){h.s.x+=.07;t.s.z-=.03;r.time=i*P.DT;
  const a=rooms.snapshot(r,'a'),b=rooms.snapshot(r,'b');assert.equal(a.time,b.time);assert.equal(a.players.find(p=>p.id===t.id).rangeToYou,b.players.find(p=>p.id===h.id).rangeToYou);assert.deepEqual(a.capture,b.capture);
 }assert(P.pos(h.s).distanceTo(P.pos(t.s))>14);
});
test('capture diagnostics distinguish range, angle, wall, immunity and frozen room',()=>{
 const {rooms,r,h,t}=fixture();t.s.z=-35.01;assert.equal(rooms.captureView(r).reason,'range');t.s.z=4;assert.equal(rooms.captureView(r).reason,'angle');t.s.z=-34;rooms.world={...empty,raycast:()=>({fraction:.5})};assert.equal(rooms.captureView(r).reason,'blocked');rooms.world=empty;t.immune=3;assert.equal(rooms.captureView(r).reason,'immune');t.online=false;assert.equal(rooms.captureView(r).reason,'disconnect');t.online=true;r.running=false;assert.equal(rooms.captureView(r).reason,'waiting');
});
test('leaving range/angle or a wall interrupts continuous lock and must earn 2.3s again',()=>{
 const {rooms,r,t}=fixture(),step=P.step;P.step=()=>{};try{
  for(let i=0;i<40;i++)rooms.tick(r);assert(r.lock.time>.6);t.s.z=-36;rooms.tick(r);assert.equal(r.lock.time,0);t.s.z=-34;
  for(let i=0;i<137;i++)rooms.tick(r);assert.equal(r.missile,null);rooms.tick(r);assert(r.missile);
 }finally{P.step=step;}
});
test('50 degree full cone (25 degree half angle) includes boundary and rejects outside in horizontal and vertical planes',()=>{
 const {rooms,r,h,t}=fixture();assert.equal(P.CONE,25);assert.equal(rooms.captureView(r).coneDegrees,25);
 for(const vertical of [false,true])for(const sign of [-1,1])for(const degrees of [24.99,25,25.01,30]){const a=degrees*Math.PI/180;t.s={...h.s,x:h.s.x+(vertical?0:sign*20*Math.sin(a)),y:h.s.y+(vertical?sign*20*Math.sin(a):0),z:h.s.z-20*Math.cos(a)};assert.equal(P.eligible(empty,h.s,t.s),degrees<=25);} 
});
test('diagonal target outside circular cone is rejected although each axis is below 25 degrees',()=>{const {h,t}=fixture();const a=20*Math.PI/180,d=20;t.s={...h.s,x:h.s.x+d*Math.tan(a),y:h.s.y+d*Math.tan(a),z:h.s.z-d};assert.equal(P.inspect(empty,h.s,t.s).reason,'angle');});
test('radar arrows match flight heading at all four compass directions',()=>{
 for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){const d=P.dir({yaw,pitch:0}),v=tip(yaw);assert(Math.abs(v.x-d.x)<1e-12);assert(Math.abs(v.y-d.z)<1e-12);}
});
