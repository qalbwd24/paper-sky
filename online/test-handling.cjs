const test=require('node:test'),assert=require('node:assert/strict'),C=require('../flight-core.js'),{P}=require('./world.cjs');
function fly(profile,input,seconds=.6,boostControl=0){const s={x:0,y:1200,z:0,yaw:0,pitch:0,bank:0,speed:25,distance:0,climbInput:0,boostControl};for(let i=0;i<seconds*60;i++)C.advance(s,{left:0,right:0,pitch:0,boost:false,...input},1/60,profile);return s;}
test('unboosted hunter turns both ways more sharply than a runner',()=>{
 for(const input of [{left:1},{right:1}]){const h=fly(P.hunter,input),r=fly(P.runner,input);assert(Math.abs(h.yaw)>Math.abs(r.yaw)*1.5);assert(Math.abs(h.bank)>Math.abs(r.bank));}
});
test('unboosted hunter responds more quickly in both climb and dive',()=>{
 for(const seconds of [.25,.6,1]){const h=fly(P.hunter,{pitch:1},seconds),r=fly(P.runner,{pitch:1},seconds);assert(h.pitch>r.pitch+.01);const hd=fly(P.hunter,{pitch:-1},seconds),rd=fly(P.runner,{pitch:-1},seconds);assert(hd.pitch<rd.pitch-.01);}
});
test('boosted hunter retains the less agile high speed mode and Shift release restores control',()=>{
 const slow=fly(P.hunter,{left:1,pitch:1}),fast=fly(P.hunter,{left:1,pitch:1,boost:true},.6,1),runner=fly(P.runner,{left:1,pitch:1});assert(slow.yaw>runner.yaw&&runner.yaw>fast.yaw);assert(slow.pitch>runner.pitch&&runner.pitch>fast.pitch);assert(fly(P.hunter,{pitch:-1}).pitch<fly(P.hunter,{pitch:-1,boost:true},.6,1).pitch);
 assert(fly(P.hunter,{left:1},2,1).yaw>fly(P.runner,{left:1},2).yaw);
});
