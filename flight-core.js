/* Shared pure flight / terrain rules. Units are metres and seconds. */
(function(root){
  'use strict';
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const trimPitch=-.21; // About 12 degrees nose-down when released.
  const maxClimbPitch=8*Math.PI/180; // Moderate climb, with the same soft lift ramp.
  const riverX=z=>60*Math.sin(z/260)+28*Math.sin(z/115);
  const rawHeight=(x,z)=>{
    const d=Math.abs(x-riverX(z));
    if(d<23)return -2;
    const bank=clamp((d-23)/27,0,1);
    const hills=10+9*Math.sin(x/180+z/330)+6*Math.sin(z/130)*Math.sin(x/160);
    const mountain=Math.pow(Math.max(0,d-220)/85,1.55);
    return -2+bank*(7+Math.max(0,hills)+mountain);
  };
  // Same diagonals as the visible terrain mesh, so landing matches its surface.
  const heightAt=(x,z)=>{
    const s=20,x0=Math.floor(x/s)*s,z0=Math.floor(z/s)*s,u=(x-x0)/s,v=(z-z0)/s;
    const a=rawHeight(x0,z0),b=rawHeight(x0+s,z0),c=rawHeight(x0,z0+s),d=rawHeight(x0+s,z0+s);
    return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);
  };
  const direction=(yaw,pitch)=>({x:-Math.sin(yaw)*Math.cos(pitch),y:Math.sin(pitch),z:-Math.cos(yaw)*Math.cos(pitch)});
  // Low-frequency, continuous gusts; never sample per-frame random noise.
  const windAt=(x,y,z,t)=>({
    x:1.5+1.15*Math.sin(t*.43+z*.003)+.45*Math.sin(t*.87+x*.004),
    y:.38*Math.sin(t*.57+x*.007)+.16*Math.sin(t*1.13+z*.005),
    z:.65*Math.sin(t*.34+x*.003)-.5,
    gust:.5+.5*Math.sin(t*.71+z*.004)
  });
  const angleLerp=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
  function interpolate(a,b,t){const out={};for(const k of ['x','y','z','pitch','bank','speed','distance'])out[k]=a[k]+(b[k]-a[k])*t;out.yaw=angleLerp(a.yaw,b.yaw,t);return out;}
  // Smooth speed-driven wake visibility, with hysteresis to avoid flickering.
  class WakeGate {
    constructor(){this.reset();}
    reset(){this.burst=0;this.emitting=false;this.strength=0;}
    update(dt,acceleration,speed,active){
      const eligible=active&&speed>(this.emitting?24:25);
      if(eligible&&!this.emitting)this.burst++;
      this.emitting=eligible;
      const target=eligible?clamp((speed-24)/22,0,1):0;
      this.strength+=(target-this.strength)*(1-Math.exp(-dt*4));
      return this.emitting;
    }
  }
  function advance(s,input,dt,config={}){
    const scale=config.speedScale||1;
    // Blend handling on Shift transitions, so extra agility never snaps the attitude.
    s.boostControl=(s.boostControl||0)+((input.boost?1:0)-(s.boostControl||0))*(1-Math.exp(-4*dt));
    const boost=s.boostControl,blend=(normal,accelerated)=>normal+((accelerated??normal)-normal)*boost;
    const climbLimit=blend(config.maxClimbPitch??maxClimbPitch,config.boostClimbPitch);
    const turnRate=blend(config.turnRate||.75,config.boostTurnRate),bankLimit=blend(config.bankAngle??.48,config.boostBankAngle);
    const lerp=1-Math.exp(-(input.pitch<0?blend(config.diveResponse??3,config.boostDiveResponse):blend(config.pitchResponse??2.3,config.boostPitchResponse))*dt),turn=input.left-input.right;
    // Build lift progressively. Smoothstep has a flat onset, so a short key tap
    // cannot yank the nose upward; full lift leaves only a small climb surplus.
    const liftCommand=clamp(input.pitch,0,1);
    s.climbInput=(s.climbInput||0)+(liftCommand-(s.climbInput||0))*(1-Math.exp(-(liftCommand>0?blend(config.liftResponse??3,config.boostLiftResponse):blend(config.liftReleaseResponse??4.5,config.boostLiftReleaseResponse))*dt));
    const lift=s.climbInput*s.climbInput*(3-2*s.climbInput);
    const restPitch=config.trimPitch??trimPitch;
    const targetPitch=input.pitch<0?input.pitch*.72:restPitch+(climbLimit-restPitch)*lift;
    s.pitch+=(targetPitch-s.pitch)*lerp;
    s.bank+=(turn*bankLimit-s.bank)*(1-Math.exp(-4*dt));
    s.yaw+=turn*turnRate*dt;
    const speedLimit=input.boost?(config.maxSpeed||Infinity):Math.min(config.cruiseMaxSpeed||Infinity,config.maxSpeed||Infinity);
    const target=clamp((input.boost?(config.boostSpeed||43):input.slow?(config.slowSpeed||13):(config.cruiseSpeed||23))-s.pitch*(config.pitchDrag||25),6,speedLimit)*scale;
    const oldSpeed=s.speed;
    s.speed+=(target-s.speed)*(1-Math.exp(-(config.accelerationRate||1.25)*dt));
    s.acceleration=(s.speed-oldSpeed)/dt;
    const d=direction(s.yaw,s.pitch);
    s.x+=d.x*s.speed*dt;s.y+=d.y*s.speed*dt;s.z+=d.z*s.speed*dt;
    s.distance+=s.speed*dt;
    return s;
  }
  const api={clamp,trimPitch,maxClimbPitch,riverX,rawHeight,heightAt,direction,advance,windAt,angleLerp,interpolate,WakeGate};
  if(typeof module!=='undefined')module.exports=api;else root.FlightCore=api;
})(typeof window!=='undefined'?window:globalThis);


