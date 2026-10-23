const test=require('node:test'),assert=require('node:assert/strict'),{createServer}=require('./server.cjs'),{Rooms,hash}=require('./rooms.cjs'),{WebSocket}=require('ws'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
async function harness(t,host='127.0.0.1'){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chase-admin-test-')),dataFile=path.join(dir,'rooms.json'),app=createServer({rooms:new Rooms(),dataFile});await new Promise(r=>app.server.listen(0,host,r));const clients=[];t.after(async()=>{for(const ws of clients)ws.terminate();await app.close();fs.rmSync(dir,{recursive:true,force:true});});return {app,dataFile,clients,url:'http://'+host+':'+app.server.address().port,base:'/chase/'};}


async function seed(h,existing){
 const cookie=(await fetch(h.url+'/chase/api/session')).headers.get('set-cookie').split(';')[0];
 const response=await fetch(h.url+'/chase/api/'+(existing?'join':'create'),{method:'POST',headers:{Cookie:cookie,Origin:h.url,'Content-Type':'application/json'},body:JSON.stringify({name:'房主',...(existing?{room:existing.id,invite:existing.secret}:{})})});const created=await response.json();assert.equal(response.status,200);
 const ws=new WebSocket(h.url.replace('http:','ws:')+'/chase/api/socket',{headers:{Cookie:cookie,Origin:h.url}});h.clients.push(ws);
 await new Promise((resolve,reject)=>{ws.on('error',reject);ws.on('open',()=>ws.send(JSON.stringify({type:'attach',room:created.room})));ws.once('message',resolve);});
 return {id:created.room,client:ws,secret:created.invite,room:h.app.rooms.rooms.get(created.room)};
}

function enable(t){const old=process.env.TRUST_ROOM_ADMIN_PROXY;process.env.TRUST_ROOM_ADMIN_PROXY='1';t.after(()=>{if(old===undefined)delete process.env.TRUST_ROOM_ADMIN_PROXY;else process.env.TRUST_ROOM_ADMIN_PROXY=old;});}
test('trusted admin lists only minimal room metadata',async t=>{enable(t);const h=await harness(t),a=await seed(h);const response=await call(h,'rooms',admin);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');const value=await response.json();assert.deepEqual(value,{rooms:[{id:a.id,count:1,online:1,phase:'waiting',host:'房主'}]});assert(!JSON.stringify(value).includes(a.secret));});


test('admin POST rejects cross-origin, missing origin and malformed payloads without deleting',async t=>{enable(t);const h=await harness(t),a=await seed(h);const endpoint=h.url+h.base+'admin/api/dissolve';
 for(const origin of [undefined,'https://evil.invalid','null']){const response=await fetch(endpoint,{method:'POST',headers:{...admin,'Content-Type':'application/json',...(origin?{Origin:origin}:{})},body:JSON.stringify({id:a.id})});assert.equal(response.status,403);}
 for(const body of ['{','null','[]','{}',JSON.stringify({id:[a.id]}),JSON.stringify({id:' '+a.id}),JSON.stringify({id:a.id,padding:'x'.repeat(4096)})]){assert.equal((await fetch(endpoint,{method:'POST',headers:{...admin,Origin:h.url,'Content-Type':'application/json'},body})).status,400);}
 assert.equal((await fetch(endpoint,{method:'POST',headers:{...admin,Origin:h.url,'Content-Type':'text/plain'},body:JSON.stringify({id:a.id})})).status,415);
 assert.equal((await fetch(endpoint,{method:'GET',headers:admin})).status,404);
 assert.equal((await call(h,'rooms',admin)).status,200);assert.equal((await (await call(h,'rooms',admin)).json()).rooms[0].id,a.id);
});


function watch(ws,out){ws.on('message',raw=>{const value=JSON.parse(raw);if(value.type==='closed')out.push(value);});}
const disconnected=ws=>ws.readyState===3;

test('dissolve only selected room, notify every member, disconnect and retire state',async t=>{enable(t);const h=await harness(t),a=await seed(h),member=await seed(h,a),b=await seed(h);
 h.app.rooms.start(a.room,a.room.owner,a.room.players[0].id);
 const notices=[];for(const entry of [a,member])watch(entry.client,notices);
 assert.equal((await call(h,'dissolve',admin,{id:h.base==='/chase/'?'ffffffff':'AAAAAAAA'})).status,404);
 assert.equal((await call(h,'dissolve',{}, {id:a.id})).status,403);
 const response=await call(h,'dissolve',admin,{id:a.id});assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true});
 await until(()=>notices.length===2&&[a,member].every(e=>disconnected(e.client)));
 assert.deepEqual(notices,[{type:'closed',message:'管理员已解散房间'},{type:'closed',message:'管理员已解散房间'}]);
 assert.equal(disconnected(b.client),false);
 assert.deepEqual((await (await call(h,'rooms',admin)).json()).rooms.map(r=>r.id),[b.id]);
 assert.equal((await call(h,'dissolve',admin,{id:a.id})).status,404);
 assert.deepEqual(JSON.parse(fs.readFileSync(h.dataFile,'utf8')).map(r=>r.id),[b.id]);const restored=new Rooms();restored.load(JSON.parse(fs.readFileSync(h.dataFile,'utf8')));assert(!restored.rooms.has(a.id));await until(()=>h.app.metrics().connections===1);assert.equal(h.app.metrics().connections,1);
});
async function until(fn){const end=Date.now()+2000;while(!fn()){if(Date.now()>end)throw Error('Notification/disconnect timeout');await new Promise(r=>setTimeout(r,10));}}


test('non-loopback peer cannot spoof proxy headers',async t=>{enable(t);const {networkInterfaces}=await import('node:os'),{request}=await import('node:http');const address=Object.values(networkInterfaces()).flat().find(a=>a.family==='IPv4'&&!a.internal)?.address;assert(address,'test needs a non-loopback local interface');const h=await harness(t,address);
 for(const route of ['rooms','dissolve']){const status=await new Promise((resolve,reject)=>{const req=request(h.url+h.base+'admin/api/'+route,{localAddress:address,method:route==='rooms'?'GET':'POST',headers:{...admin,Origin:h.url,'x-forwarded-for':'127.0.0.1','x-real-ip':'127.0.0.1'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();});assert.equal(status,403);}
});
test('admin request flooding is bounded',async t=>{enable(t);const h=await harness(t);let blocked=false;for(let i=0;i<125;i++){if((await call(h,'rooms',admin)).status===429){blocked=true;break;}}assert(blocked);});

test('failed durable delete restores room and does not disconnect members',async t=>{enable(t);const h=await harness(t),a=await seed(h);fs.mkdirSync(h.dataFile+'.tmp');try{const response=await call(h,'dissolve',admin,{id:a.id});assert.equal(response.status,500);assert.deepEqual(await response.json(),{error:'Room persistence failed'});assert(h.app.rooms.rooms.has(a.id));assert(!disconnected(a.client));}finally{fs.rmSync(h.dataFile+'.tmp',{recursive:true,force:true});}});
test('playing phase remains minimal',async t=>{enable(t);const h=await harness(t),a=await seed(h);await seed(h,a);h.app.rooms.start(a.room,a.room.owner,a.room.players[0].id);const room=(await (await call(h,'rooms',admin)).json()).rooms[0];assert.deepEqual(Object.keys(room).sort(),['count','host','id','online','phase']);assert.equal(room.phase,'playing');});

const admin={'x-room-admin':'admin'};
async function call(h,route='rooms',headers={},data){return fetch(h.url+h.base+'admin/api/'+route,{method:data===undefined?'GET':'POST',headers:{...headers,...(data===undefined?{}:{Origin:h.url,'Content-Type':'application/json'})},...(data===undefined?{}:{body:JSON.stringify(data)})});}
test('admin endpoints fail closed without env or exact header',async t=>{
 const old=process.env.TRUST_ROOM_ADMIN_PROXY;t.after(()=>{if(old===undefined)delete process.env.TRUST_ROOM_ADMIN_PROXY;else process.env.TRUST_ROOM_ADMIN_PROXY=old;});
 const h=await harness(t);
 for(const flag of [undefined,'0','true','1']){if(flag===undefined)delete process.env.TRUST_ROOM_ADMIN_PROXY;else process.env.TRUST_ROOM_ADMIN_PROXY=flag;
  for(const header of [{},{'x-room-admin':'Admin'},{'x-room-admin':'admin, admin'},...(flag==='1'?[]:[admin])]){
   assert.equal((await call(h,'rooms',header)).status,403);
   assert.equal((await call(h,'dissolve',header,{id:'missing'})).status,403);
  }
 }
});
