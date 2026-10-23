/* Presentation clock follows server simulation time; arrival jitter never rewinds it. */
(function(root){
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 class Clock{
  constructor(delay=.12){this.baseDelay=delay;this.delay=delay;this.jitter=0;this.rate=1;this.time=null;this.latest=0;this.received=0;this.starved=0;}
  push(time,now){if(time<this.latest)return;const elapsed=(now-this.received)/1000,step=time-this.latest;if(this.advancing&&this.time!==null&&step>0&&step<.3&&elapsed<.8){this.jitter=Math.max(this.jitter*.96,Math.abs(elapsed-step));this.delay=clamp(this.baseDelay+this.jitter*1.5,this.baseDelay,.28);}this.advancing=step>0;this.latest=time;this.received=now;if(this.time===null)this.time=time-this.delay;}
  advance(dt,now,running=true){if(this.time===null)return 0;if(!running){this.time=Math.min(this.latest,this.time+dt);this.rate=1;return this.time;}const target=this.latest+clamp((now-this.received)/1000,0,.3)-this.delay,wanted=clamp(1+(target-this.time)*3,.8,1.08);this.rate+=(wanted-this.rate)*(1-Math.exp(-5*dt));const next=this.time+dt*this.rate;if(next>this.latest)this.starved++;this.time=Math.min(this.latest,next);return this.time;}
 }
 function sample(frames,time,interpolate){let a=frames[0],b=a;for(const frame of frames){if(frame.time<=time)a=frame;if(frame.time>=time){b=frame;break;}b=frame;}return a===b?{...a.s}:interpolate(a.s,b.s,clamp((time-a.time)/(b.time-a.time),0,1));}
 // Monotone Hermite tangents smooth velocity at snapshots without overshooting
 // the endpoints. Collision / respawn discontinuities still use separate epochs.
 function motion(frames,time,interpolate){const out=sample(frames,time,interpolate);let i=0;while(i+1<frames.length&&frames[i+1].time<=time)i++;const a=frames[i],b=frames[i+1];if(!b||time<a.time)return out;const span=b.time-a.time;if(span<=0||span>.2)return out;const prev=frames[Math.max(0,i-1)],next=frames[Math.min(frames.length-1,i+2)],t=clamp((time-a.time)/span,0,1),t2=t*t,t3=t2*t;
  for(const k of ['x','y','z']){const delta=b.s[k]-a.s[k];if(Math.abs(delta)<1e-8){out[k]=a.s[k];continue;}let m0=(b.s[k]-prev.s[k])/(b.time-prev.time)*span,m1=(next.s[k]-a.s[k])/(next.time-a.time)*span;let alpha=clamp(m0/delta,0,3),beta=clamp(m1/delta,0,3);const norm=Math.hypot(alpha,beta);if(norm>3){alpha*=3/norm;beta*=3/norm;}m0=alpha*delta;m1=beta*delta;out[k]=(2*t3-3*t2+1)*a.s[k]+(t3-2*t2+t)*m0+(-2*t3+3*t2)*b.s[k]+(t3-t2)*m1;}
  return out;
 }
 class PoseFilter{constructor(){this.value=null;}reset(){this.value=null;}update(target,dt,interpolate){if(!this.value||Math.hypot(target.x-this.value.x,target.y-this.value.y,target.z-this.value.z)>18)this.value={...target};else this.value=interpolate(this.value,target,1-Math.exp(-32*Math.max(0,dt)));return this.value;}}
 const api={Clock,sample,motion,PoseFilter};if(typeof module!=='undefined')module.exports=api;else root.ChaseNetView=api;
})(globalThis);
