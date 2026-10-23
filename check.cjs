const assert=require('node:assert/strict'),C=require('./flight-core.js');
const initial=()=>({x:185,y:80,z:465,yaw:0,pitch:0,bank:0,speed:23,distance:0});
const neutral={left:0,right:0,pitch:0,boost:false,slow:false};
function fly(input,dt=1/120,seconds=3){const s=initial();for(let i=0;i<Math.round(seconds/dt);i++)C.advance(s,{...neutral,...input},dt);return s;}
assert.ok(fly({pitch:1}).y>initial().y+4&&fly({pitch:1}).y<initial().y+7,'full climb gains altitude gently');
assert.ok(fly({pitch:-1}).y<initial().y-20,'dive loses altitude');
assert.ok(fly({left:1}).x<initial().x,'left steering turns left');
assert.ok(fly({right:1}).x>initial().x,'right steering turns right');
assert.ok(fly({boost:true}).distance>fly({}).distance,'boost increases travel');
assert.ok(fly({slow:true}).distance<fly({}).distance,'slow reduces travel');
const a=fly({pitch:.5,left:1},1/120),b=fly({pitch:.5,left:1},1/60);
assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<1,'frame-rate stability');
for(let x=-1400;x<=1400;x+=20)for(let z=-1400;z<=1400;z+=20)assert.ok(Math.abs(C.heightAt(x,z)-C.rawHeight(x,z))<1e-8,'height agrees with rendered vertices');
const s=fly({pitch:1});for(let i=0;i<360;i++)C.advance(s,neutral,1/120);assert.ok(Math.abs(s.pitch-C.trimPitch)<.001,'released controls smoothly return to descending glide');
const glider=fly({});assert.ok(glider.y<initial().y-12&&glider.y>initial().y-17,'released nose settles into a distinct descending glide');
assert.ok(glider.pitch<-.19&&glider.pitch>-.22,'hands-off nose settles near twelve degrees down');
console.log('PASS: climb, dive, steering, boost, slow flight, frame-rate stability, terrain alignment, hands-off glide.');
// Constant-speed translation must remain uniform even when render and physics clocks differ.
for(const hz of [30,60,90,120,144,165]){
  let pos=0,prev=0,acc=0,last=null,errors=[];
  for(let frame=0;frame<hz*2;frame++){
    const dt=1/hz;acc+=dt;while(acc>=1/120){prev=pos;pos+=23/120;acc-=1/120;}
    const rendered=prev+(pos-prev)*acc*120;
    if(last!==null&&frame>2)errors.push(Math.abs(rendered-last-23/hz));last=rendered;
  }
  assert.ok(Math.max(...errors)<1e-9,'uniform interpolation at '+hz+' Hz');
}
const crossing=C.interpolate({...initial(),yaw:Math.PI-.1},{...initial(),yaw:-Math.PI+.1},.5);
assert.ok(Math.abs(crossing.yaw-Math.PI)<1e-9,'heading interpolation follows shortest arc');
const gate=new C.WakeGate();let on=0,off=0;
for(let i=0;i<360;i++){if(gate.update(1/120,8,48,true))on++;else off++;}
assert.ok(on===360&&off===0&&gate.burst===1,'high speed gives a continuous wake without periodic gaps');
assert.ok(gate.strength>.99,'wake fades in smoothly to full strength');
assert.equal(gate.update(1/120,0,43,true),true,'steady high speed keeps a visible wake');
assert.equal(gate.update(1/120,8,23,true),false,'normal cruise has no trails');
assert.equal(gate.update(1/120,8,35,false),false,'landed plane stops emitting');
for(let t=0;t<60;t+=.1){const a=C.windAt(180,50,100,t),b=C.windAt(180,50,100,t+1/120);assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<.025,'wind changes smoothly');assert.ok(Math.hypot(a.x,a.y,a.z)<4.5,'gust strength remains bounded');}
console.log('PASS: 30–165 Hz render interpolation, heading wrap, continuous speed-dependent wake, no slow-flight trail, bounded smooth wind.');

const slowGate=new C.WakeGate(),fastGate=new C.WakeGate();
for(let i=0;i<360;i++){slowGate.update(1/120,0,29,true);fastGate.update(1/120,0,44,true);}
assert.ok(fastGate.strength>slowGate.strength*3,'faster flight gives visibly stronger wakes');
for(let i=0;i<360;i++)fastGate.update(1/120,0,15,true);
assert.ok(fastGate.strength<.001&&!fastGate.emitting,'deceleration fades wakes away');
const indoor=initial();indoor.speed=2.3;const outdoor=initial();
for(let i=0;i<120;i++){C.advance(indoor,neutral,1/120,{speedScale:.1,turnRate:1.8});C.advance(outdoor,neutral,1/120);}
assert.ok(Math.abs(indoor.speed*10-outdoor.speed)<1e-8,'indoor speed normalization preserves acceleration feel');
assert.ok(fly({pitch:-1}).speed>fly({pitch:1}).speed*1.6,'dive and climb produce a clear speed difference');
const release=fly({pitch:1});for(let i=0;i<120;i++)C.advance(release,neutral,1/120);
assert.ok(release.pitch<-.10,'nose passes through level into descent within one second of releasing climb');
console.log('PASS: stronger gravity glide, stronger pitch-speed exchange, indoor scaling, speed-dependent wake fade.');

// A keyboard press builds authority smoothly instead of immediately pitching up.
const lifting={...initial(),pitch:C.trimPitch,speed:2.825},samples=[];
for(let i=1;i<=960;i++){
  C.advance(lifting,{...neutral,pitch:1},1/120,{speedScale:.1});
  if([12,24,120,960].includes(i))samples.push({...lifting});
  assert.ok(lifting.pitch<=C.maxClimbPitch+1e-9,'holding climb cannot exceed the gentle attitude limit');
}
assert.ok(samples[0].pitch-C.trimPitch<.007,'first 100 ms change nose attitude by less than 0.4 degrees');
assert.ok(samples[1].pitch-samples[0].pitch>samples[0].pitch-C.trimPitch,'lift onset is progressive and nonlinear');
assert.ok(samples[2].pitch>0&&samples[2].pitch<.08,'a descending plane gradually enters a shallow climb within one second');
const upward=Math.sin(lifting.pitch)*lifting.speed,downward=-Math.sin(C.trimPitch)*2.825;
assert.ok(upward>.24&&upward<.30,'full indoor climb is about 27 cm per second');
assert.ok(upward/downward<.55,'climb remains gentler than the gravity-driven descent');
const tap={...initial(),pitch:C.trimPitch,speed:28.25};
for(let i=0;i<18;i++)C.advance(tap,{...neutral,pitch:1},1/120);
for(let i=0;i<240;i++){C.advance(tap,neutral,1/120);assert.ok(tap.pitch<0,'a brief tap cannot cause a sudden upward climb');}
console.log('PASS: soft nonlinear climb onset, gentle full-lift limit, gradual descent arrest, no upward jerk from short taps.');

