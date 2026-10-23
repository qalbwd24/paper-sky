/* North-up X/Z radar; yaw zero flies toward -Z. No independent animation clock. */
(function(root){'use strict';
 const tip=yaw=>({x:-Math.sin(yaw),y:-Math.cos(yaw)});
 function drawArrow(ctx,{x,y,yaw=0,self=false,online=true,color}){
  const d=tip(yaw),size=self?7:6;
  ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(d.x,-d.y));
  ctx.globalAlpha=online?1:.45;ctx.fillStyle=color;ctx.strokeStyle=self?'#fffef4':'#453c32';ctx.lineWidth=self?1.8:1;
  ctx.beginPath();ctx.moveTo(0,-size);ctx.lineTo(size*.64,size*.72);ctx.lineTo(0,size*.34);ctx.lineTo(-size*.64,size*.72);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
 }
 const api={tip,drawArrow};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ChaseMap=api;
})(globalThis);
