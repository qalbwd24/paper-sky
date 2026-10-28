'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{performance,monitorEventLoopDelay}=require('node:perf_hooks'),{WebSocketServer}=require('ws'),{Rooms,hash}=require('./rooms.cjs'),{P}=require('./world.cjs');
const {createDecisionBridge}=require('./decision-bridge.cjs');
const root=path.resolve(__dirname,'..'),prefix='/chase',runtime=['local-hall.html','index.html','style.css','game.js','online.html','online.css','paper-online.js','chase-net-view.js','paper-online-ai.js','paper-online-ds.js','paper-pursuit.js','chase-map.js','room-browser.js','room-browser.css','chase-net-physics.js','vendor/three.min.js','flight-core.js','ink-bird.js','original-plane.js','papersky-plane.js','assets/papersky-plane/plane-data.js','paper.js','valley.js','classroom.js','atrium-layout.js','atrium.js','flight-effects.js','paper-city-style.js','labyrinth.js','flight-contact.js','paper-pilot.js','paper-chase.js','paper-combat.js','assets/paperplane-original/plane-data.js','assets/paperplane-original/_MainTex.png','assets/ink-bird-fan-clean.png'];
function createServer(options={}){
 const decisionBridge=options.decisionBridge||createDecisionBridge();
 const rooms=options.rooms||new Rooms({maxRooms:Math.max(1,Math.min(4,Number(process.env.MAX_ROOMS)||2))}),origin=options.origin||process.env.PUBLIC_ORIGIN||'',dataFile=options.dataFile??process.env.DATA_FILE??path.join(__dirname,'private-data','rooms.json'),connections=new Map(),limits=new Map();
 if(dataFile&&fs.existsSync(dataFile))rooms.load(JSON.parse(fs.readFileSync(dataFile,'utf8')));
 let closing=false,dirty=false,saveAt=0,last=performance.now(),acc=0,frames=0,tickMs=0,maxTickMs=0,overruns=0,bytes=0;
 const lag=monitorEventLoopDelay({resolution:20});lag.enable();
 function persist(){if(!dataFile)return;fs.mkdirSync(path.dirname(dataFile),{recursive:true,mode:0o700});const tmp=dataFile+'.tmp';fs.writeFileSync(tmp,JSON.stringify(rooms.save()),{mode:0o600});fs.renameSync(tmp,dataFile);dirty=false;}
 function rate(key,max,period=1000){const now=Date.now();let b=limits.get(key);if(!b||now>b.until){b={n:0,until:now+period};limits.set(key,b);}return ++b.n<=max;}
 const identity=req=>{const token=/(?:^|;\s*)paper_chase=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie||'')?.[1];return token?hash(token):null;};
 const expected=req=>origin||'http://'+req.headers.host;
 const sameOrigin=req=>req.headers.origin===expected(req);
 const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
 async function body(req){let raw='';for await(const b of req){raw+=b;if(raw.length>4096)throw Error('请求过大');}return JSON.parse(raw||'{}');}
 const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://local'),pathname=decodeURIComponent(url.pathname),ip=req.socket.remoteAddress;
// Proxy must strip client x-room-admin on ordinary paths and inject it only after admin authentication.
  if(pathname.startsWith(prefix+'/admin/api/')){
   if(process.env.TRUST_ROOM_ADMIN_PROXY!=='1'||req.headers['x-room-admin']!=='admin'||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(ip))return json(res,403,{error:'Forbidden'});
   if(!rate('admin:'+ip,120,10000))return json(res,429,{error:'Too many requests'});
   if(pathname===prefix+'/admin/api/rooms'&&req.method==='GET')return json(res,200,{rooms:[...rooms.rooms.values()].map(r=>({id:r.id,count:r.players.length,online:r.players.filter(p=>p.online).length,phase:r.running?'playing':'waiting',host:r.players.find(p=>p.identity===r.owner)?.name??null}))});
   if(req.method==='POST'&&!sameOrigin(req))return json(res,403,{error:'Invalid origin'});
   if(pathname===prefix+'/admin/api/dissolve'&&req.method==='POST'){
    if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))return json(res,415,{error:'Expected JSON'});
    const b=await body(req);if(!b||Array.isArray(b)||typeof b.id!=='string'||!/^[a-f0-9]{8}$/.test(b.id))return json(res,400,{error:'Invalid room id'});
    const r=rooms.rooms.get(b.id);if(!r)return json(res,404,{error:'Room not found'});
    rooms.rooms.delete(r.id);dirty=true;
    try{persist();}catch{rooms.rooms.set(r.id,r);return json(res,500,{error:'Room persistence failed'});}
    for(const [ws,c]of connections)if(c.room===r.id){send(ws,{type:'closed',message:'管理员已解散房间'});ws.close();}
    return json(res,200,{ok:true});
   }
   return json(res,404,{error:'Not found'});
  }
  if(pathname===prefix){res.writeHead(308,{Location:prefix+'/'}).end();return;}
  if(pathname.startsWith(prefix+'/api/')){
   if(!rate('http:'+ip,120,10000))return json(res,429,{error:'操作过于频繁'});
   if(req.method==='POST'&&!sameOrigin(req))return json(res,403,{error:'请求来源无效'});
   if(pathname===prefix+'/api/ai/status'&&req.method==='GET')return json(res,200,decisionBridge.status());
   if(pathname===prefix+'/api/health')return json(res,200,{ok:true,version:'paper-chase-online-7',rooms:rooms.rooms.size,maxRooms:rooms.maxRooms,tickHz:60,snapshotHz:20,performance:metrics()});
   if(pathname===prefix+'/api/session'&&req.method==='GET'){if(!identity(req))res.setHeader('Set-Cookie',`paper_chase=${crypto.randomBytes(32).toString('hex')}; Path=/chase/; HttpOnly; SameSite=Strict; Max-Age=2592000${origin.startsWith('https:')?'; Secure':''}`);return json(res,200,{ok:true});}
   const who=identity(req);if(!who)return json(res,401,{error:'请刷新页面重新连接'});
   if([prefix+'/api/rooms',prefix+'/api/lobby'].includes(pathname)&&req.method==='GET')return json(res,200,{rooms:[...rooms.rooms.values()].map(r=>({id:r.id,name:(r.players.find(p=>p.identity===r.owner)?.name||'纸翼旅人')+'的追逐赛',capacity:4,public:r.public===true,joinable:r.public===true&&r.players.length<4,phase:r.running?'playing':'waiting',count:r.players.length,online:r.players.filter(p=>p.online).length,running:r.running,mine:!!rooms.member(r,who),host:r.players.find(p=>p.identity===r.owner)?.name,players:r.players.map(p=>({name:p.name,online:p.online}))}))});
   if(req.method!=='POST')return json(res,404,{error:'接口不存在'});
   const b=await body(req);
   if([prefix+'/api/ai/plan',prefix+'/api/ai/judge'].includes(pathname)){
    if(!decisionBridge.status().enabled)return json(res,503,{error:'请先在本地配置 AI_BRIDGE_ENABLED 和模型 API Key'});
    const kind=pathname.endsWith('/plan')?'plan':'judge';
    const r=rooms.rooms.get(b.room),owner=r&&rooms.member(r,who);
    const bot=r?.players.find(p=>p.kind==='bot'&&p.id===b.bot&&p.proxy===owner?.id);
    if(!bot)return json(res,403,{error:'没有控制这个 AI 的权限'});
    if(!b.state||typeof b.state!=='object'||Array.isArray(b.state))return json(res,400,{error:'无效的 AI 状态'});
    if(!rate('ai:'+who+':'+b.bot+':'+kind,kind==='plan'?1:4,kind==='plan'?1800:1000))return json(res,429,{error:'AI 决策频率受限'});
    try{return json(res,200,await decisionBridge.decide(kind,b.state));}
    catch(e){return json(res,502,{error:e.message});}
   }
   if(!rate('action:'+who,20,10000))return json(res,429,{error:'操作过于频繁'});
   if(pathname===prefix+'/api/create'){const {r,invite}=rooms.create(who,b.name,b.skin,b.public);dirty=true;return json(res,200,{room:r.id,invite});}
   const r=rooms.rooms.get(b.room);if(pathname===prefix+'/api/leave'&&(!r||!rooms.member(r,who)))return json(res,200,{ok:true});if(!r)return json(res,404,{error:'房间已解散或过期'});
   if(pathname===prefix+'/api/join'){rooms.join(r,who,b.name,b.skin,b.invite);dirty=true;return json(res,200,{room:r.id});}
   if(!rooms.member(r,who))return json(res,403,{error:'你不在这个房间'});
   if(pathname===prefix+'/api/settings'){rooms.requireHost(r,who);if(typeof b.public!=='boolean')throw Error('请选择是否公开加入');r.public=b.public;r.version++;dirty=true;return json(res,200,{ok:true});}
   if(pathname===prefix+'/api/bots'){const proxy=rooms.member(r,who).id;if(b.action==='fill'){while(r.players.length<4)rooms.addBot(r,who);}else if(b.action==='clear'){for(const p of [...r.players])if(p.kind==='bot'&&p.proxy===proxy)rooms.remove(r,p.identity);}else throw Error('未知测试操作');dirty=true;return json(res,200,{ok:true});}
   if(pathname===prefix+'/api/leave'){rooms.remove(r,who);for(const [ws,c]of connections)if(c.who===who&&c.room===r.id){send(ws,{type:'left'});ws.close();}dirty=true;return json(res,200,{ok:true});}
   if(pathname===prefix+'/api/dissolve'){rooms.requireHost(r,who);rooms.rooms.delete(r.id);for(const [ws,c]of connections)if(c.room===r.id){send(ws,{type:'closed',message:'房主已解散房间'});ws.close();}dirty=true;return json(res,200,{ok:true});}
   return json(res,404,{error:'接口不存在'});
  }
  if(!origin&&req.method==='GET'&&['/games/','/games','/games/rooms/','/games/rooms'].includes(pathname)){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}).end(fs.readFileSync(path.join(root,'local-hall.html')));return;}
  const file=pathname===prefix+'/'?'online.html':pathname.slice(prefix.length+1);
  if(req.method!=='GET'||!pathname.startsWith(prefix+'/')||!runtime.includes(file))return res.writeHead(404).end('Not found');
  const filePath=path.join(root,file);if(!fs.existsSync(filePath))return res.writeHead(404).end('Not found');
  res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png'})[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'});fs.createReadStream(filePath).pipe(res);
 }catch(e){json(res,400,{error:e.message});}});
 const wss=new WebSocketServer({noServer:true,maxPayload:4096,perMessageDeflate:false});
 server.on('upgrade',(req,socket,head)=>{if(req.url!==prefix+'/api/socket'||!sameOrigin(req)||!identity(req)||connections.size>=24||!rate('upgrade:'+req.socket.remoteAddress,20,10000)){socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));});
 function send(ws,data){if(ws.readyState!==1)return;if(ws.bufferedAmount>128*1024){ws.close(1013,'连接太慢，请重新连接');return;}const text=JSON.stringify(data);bytes+=Buffer.byteLength(text);ws.send(text);}
 wss.on('connection',(ws,req)=>{const c={who:identity(req),room:null,p:null,alive:true};connections.set(ws,c);ws.on('pong',()=>c.alive=true);ws.on('error',()=>{});
  ws.on('message',raw=>{try{if(!rate('ws:'+c.who,90))throw Error('消息过于频繁');const b=JSON.parse(raw);if(b.type==='attach'){
    if(c.room)throw Error('连接已经加入房间');const r=rooms.rooms.get(b.room),p=b.bot?r?.players.find(p=>p.kind==='bot'&&p.id===b.bot&&p.proxy===rooms.member(r,c.who)?.id):r&&rooms.member(r,c.who);if(b.bot&&p){c.botOwner=c.who;c.who=p.identity;}if(!p)throw Error('请先加入房间');for(const [other,d]of connections)if(other!==ws&&d.who===c.who&&d.room===r.id){send(other,{type:'replaced'});other.close();}c.room=r.id;c.p=p;p.online=true;p.epoch++;p.ack=0;p.queue=[];p.lastSeq=0;p.input=P.neutral();r.lock={id:null,time:0};r.missile=null;dirty=true;send(ws,rooms.snapshot(r,c.who));return;
   }
   const r=rooms.rooms.get(c.room),p=r&&rooms.member(r,c.who);if(!r||!p)throw Error('房间已失效');if(c.botOwner&&p.proxy!==rooms.member(r,c.botOwner)?.id)throw Error('AI 代理控制权已失效');if(b.type==='leave'){rooms.remove(r,c.who);dirty=true;send(ws,{type:'left'});ws.close();return;}
   if(b.type==='input'){if(b.epoch!==p.epoch||!Array.isArray(b.frames)||b.frames.length>6)return;for(const f of b.frames){if(!Number.isSafeInteger(f.seq)||f.seq<=Math.max(p.ack,p.lastSeq||0)||f.seq>Math.max(p.ack,p.lastSeq||0)+60||p.queue.length>=40)continue;p.queue.push({seq:f.seq,input:P.input(f.input)});p.lastSeq=f.seq;}return;}
   if(b.type==='skin'){if(!P.skins.includes(b.skin))throw Error('皮肤不存在');p.skin=b.skin;dirty=true;return;}
   if(b.type==='ping'){send(ws,{type:'pong',at:b.at});return;}
   if(!rate('host:'+c.who,6,10000))throw Error('操作过于频繁');if(b.version!==r.version)throw Error('房间状态已变化，请重试');
   if(b.type==='start')rooms.start(r,c.who,b.hunter);else if(b.type==='designate')rooms.designate(r,c.who,b.hunter);else throw Error('未知操作');for(const q of r.players)q.lastSeq=0;dirty=true;
  }catch(e){send(ws,{type:'error',message:e.message});}});
  ws.on('close',()=>{connections.delete(ws);if(c.p&&![...connections.values()].some(d=>d.p===c.p)){c.p.online=false;c.p.disconnected=Date.now();c.p.queue=[];c.p.input=P.neutral();const r=rooms.rooms.get(c.room);if(r){r.lock={id:null,time:0};r.missile=null;}dirty=true;}});
 });
 const timer=setInterval(()=>{const now=performance.now();acc+=Math.min((now-last)/1000,.1);last=now;let steps=0;while(acc>=P.DT&&steps++<4){const start=performance.now();for(const r of rooms.rooms.values())rooms.tick(r);const took=performance.now()-start;tickMs=tickMs*.98+took*.02;maxTickMs=Math.max(maxTickMs,took);acc-=P.DT;frames++;if(frames%3===0){for(const [ws,c]of connections){const r=rooms.rooms.get(c.room);if(c.room&&(!r||!rooms.member(r,c.who))){send(ws,{type:'left'});ws.close();continue;}if(r&&((r.running&&r.players.every(p=>p.online))||frames%30===0))send(ws,rooms.snapshot(r,c.who));}dirty=true;}}if(acc>P.DT*4){acc=0;overruns++;}},8);
 const maintenance=setInterval(()=>{rooms.sweep();for(const [k,v]of limits)if(v.until<Date.now())limits.delete(k);if(limits.size>10000)limits.clear();for(const [ws,c]of connections){if(!c.alive)ws.terminate();else{c.alive=false;ws.ping();}}if(dirty&&Date.now()-saveAt>2000){try{persist();saveAt=Date.now();}catch{console.error('Room persistence failed; keeping current rooms in memory.');}}},5000);
 function metrics(){return {rssMB:process.memoryUsage().rss/1048576,heapMB:process.memoryUsage().heapUsed/1048576,tickMs,maxTickMs,overruns,connections:connections.size,bytes,loopP95Ms:lag.percentile(95)/1e6};}
 async function close(){if(closing)return;closing=true;clearInterval(timer);clearInterval(maintenance);lag.disable();persist();for(const ws of connections.keys())ws.terminate();wss.close();await new Promise(resolve=>server.close(resolve));}
 return {server,rooms,close,metrics,runtime};
}
if(require.main===module){const app=createServer();app.server.listen(Number(process.env.PORT||8770),process.env.HOST||'127.0.0.1',()=>console.log('Paper Chase online: http://127.0.0.1:'+(process.env.PORT||8770)+'/chase/'));for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>app.close().then(()=>process.exit(0)));}
module.exports={createServer,runtime};
