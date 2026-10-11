import {newState,act,step,results,FACTORIES} from './training-core.mjs';
const PREFIX='leanquest-training-v1-';
const clean=x=>String(x||'').trim().slice(0,30);
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
const configOK=c=>c&&FACTORIES.some(f=>f.id===c.factory)&&Number.isInteger(c.level)&&c.level>=1&&c.level<=6&&['individual','teams','coop'].includes(c.mode);
export function hostRoom(config,onChange,onStatus){
 if(!configOK(config))throw Error('การตั้งค่าห้องไม่ถูกต้อง');
 if(!window.Peer)throw Error('โหลดระบบห้องไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ต');
 const code=String(100000+crypto.getRandomValues(new Uint32Array(1))[0]%900000);
 let closed=false,revision=0;const players=new Map(),connections=new Set(),sessions=new Map(),groups=new Map();
 let settings={...config},phase='waiting';let activities={production:false,balance:false,parts:false,gemba:false};const peer=new window.Peer(PREFIX+code);let round=token();
 function snapshot(){return {type:'snapshot',version:1,code,round,phase,settings,activities:{...activities},revision:++revision,players:[...players.values()].map(p=>({id:p.id,name:p.name,team:p.team,online:p.online,state:p.state,score:results(p.state).score,lastSeen:p.lastSeen}))};}
 function publish(){if(closed)return;const data=snapshot();for(const c of connections)if(c.open)c.send(data);onChange(data);}
 function stateFor(p){const group=settings.mode==='coop'?'team:'+p.team:'player:'+p.id;if(!groups.has(group))groups.set(group,newState(settings.factory,settings.level));return groups.get(group);}
 peer.on('open',()=>{onStatus('พร้อมรับผู้เล่น');publish();});
 peer.on('error',e=>onStatus('เชื่อมต่อห้องไม่ได้: '+(e.type||'network')));
 peer.on('disconnected',()=>{onStatus('กำลังเชื่อมต่อระบบห้องใหม่');if(!closed)peer.reconnect();});
 peer.on('connection',c=>{connections.add(c);let member=null,lastAction=0;const expire=setTimeout(()=>{if(!member)c.close();},12000);
 c.on('data',m=>{if(!m||typeof m!=='object')return;
 if(m.type==='join'&&!member){if(typeof m.token!=='string'||!/^[a-f0-9]{32}$/.test(m.token)||!clean(m.name)){c.send({type:'error',message:'กรอกชื่อผู้เล่นก่อนเข้าห้อง'});return;}if(settings.mode!=='individual'&&!clean(m.team)){c.send({type:'error',message:'กรอกชื่อทีมสำหรับโหมดทีม'});return;}
 let p=sessions.get(m.token);if(!p){if(players.size>=60){c.send({type:'error',message:'ห้องนี้เต็มแล้ว (60 คน)'});c.close();return;}p={id:token(),name:clean(m.name),team:clean(m.team),online:true,lastSeen:Date.now(),connection:c};p.state=stateFor(p);if(phase==='active'&&activities.production&&p.state.status!=='done')act(p.state,{type:'run'});players.set(p.id,p);sessions.set(m.token,p);}else{if(p.connection&&p.connection!==c)p.connection.close();p.connection=c;p.online=true;p.lastSeen=Date.now();}
 member=p;clearTimeout(expire);c.send({type:'welcome',id:p.id});publish();return;}
 if(!member||member.connection!==c)return;member.lastSeen=Date.now();
 if(m.type==='ping'){c.send({type:'pong'});return;}
 if(m.type==='action'&&m.round===round){if(Date.now()-lastAction<80)return;lastAction=Date.now();if(phase!=='active'){c.send({type:'error',message:'รอผู้ควบคุมเริ่มหรือดำเนินรอบต่อ'});return;}const a=m.action;if(!a||!['move','layout','sort','poka','maintain','observe','diagnose','fix'].includes(a.type))return;
 const activity=a.type==='move'?'balance':['observe','diagnose','fix'].includes(a.type)?'gemba':'parts';if(!activities[activity]){c.send({type:'error',message:'กิจกรรมนี้ยังไม่เปิด Session กรุณารอผู้ควบคุม'});return;}const was=member.state.status==='running';if(was)member.state.status='paused';const ok=act(member.state,a);if(was&&member.state.status!=='done')member.state.status='running';if(!ok)c.send({type:'error',message:member.state.lastError});publish();}
 });
 const gone=()=>{clearTimeout(expire);connections.delete(c);if(member&&member.connection===c){member.online=false;member.connection=null;publish();}};c.on('close',gone);c.on('error',gone);});
 const tick=setInterval(()=>{for(const p of players.values())if(p.online&&Date.now()-p.lastSeen>18000){p.online=false;p.connection?.close();p.connection=null;}if(phase==='active'&&activities.production){const activeStates=new Set([...players.values()].filter(p=>p.online).map(p=>p.state));for(const s of activeStates)step(s,10);if(activeStates.size&&[...activeStates].every(s=>s.status==='done'))phase='ended';}publish();},1000);
 return {code,command(cmd,next){if(['open-activity','close-activity'].includes(cmd)){if(!Object.hasOwn(activities,next))return;activities[next]=cmd==='open-activity';if(next==='production')for(const s of groups.values())if(s.status!=='done')act(s,{type:activities.production&&phase==='active'?'run':'pause'});}if(cmd==='start'){phase='active';if(activities.production)for(const s of groups.values())if(s.status!=='done')act(s,{type:'run'});}if(cmd==='pause'){phase='paused';for(const s of groups.values())act(s,{type:'pause'});}if(cmd==='end'){phase='ended';for(const s of groups.values())act(s,{type:'pause'});}if(cmd==='reset'){if(next&&!configOK(next))return;settings=next?{...next}:settings;round=token();phase='waiting';activities={production:false,balance:false,parts:false,gemba:false};groups.clear();for(const p of players.values())p.state=stateFor(p);}publish();},close(){closed=true;clearInterval(tick);for(const c of connections)c.close();peer.destroy();}};
}
export function joinRoom(code,who,onChange,onStatus,onError){
 if(!/^\d{6}$/.test(code))throw Error('รหัสห้องใหม่มี 6 หลัก');if(!window.Peer)throw Error('โหลดระบบห้องไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ต');
 let session;try{session=sessionStorage.getItem('lqt-session')||token();sessionStorage.setItem('lqt-session',session);}catch{session=token();}
 let peer=new window.Peer(),conn=null,closed=false,retryTimer=null,attempt=0,id=null,last=null;
 const retry=()=>{if(closed||retryTimer)return;onStatus('ขาดการเชื่อมต่อ กำลังลองใหม่');retryTimer=setTimeout(()=>{retryTimer=null;connect();},Math.min(15000,1500*2**Math.min(attempt++,3)));};
 function connect(){if(closed||peer.destroyed||!peer.id)return;const c=peer.connect(PREFIX+code,{reliable:true});conn=c;onStatus('กำลังเข้าห้อง '+code);const timeout=setTimeout(()=>{if(!c.open){c.close();retry();}},10000);
 c.on('open',()=>{clearTimeout(timeout);attempt=0;c.send({type:'join',token:session,name:clean(who.name),team:clean(who.team)});onStatus('เชื่อมต่อแล้ว');});
 c.on('data',m=>{if(conn!==c||!m)return;if(m.type==='welcome')id=m.id;if(m.type==='snapshot'&&m.version===1){last=m;onChange(m,id);}if(m.type==='error')onError(m.message);});
 c.on('close',()=>{clearTimeout(timeout);if(conn===c)retry();});c.on('error',()=>{clearTimeout(timeout);if(conn===c)retry();});}
 peer.on('open',connect);peer.on('error',e=>{onStatus(e.type==='peer-unavailable'?'ไม่พบห้อง ตรวจรหัสและให้ผู้ควบคุมเปิดหน้าห้องค้างไว้':'ระบบห้อง: '+e.type);if(e.type==='peer-unavailable')retry();});peer.on('disconnected',()=>{if(!closed)peer.reconnect();});
 const ping=setInterval(()=>{if(conn?.open)conn.send({type:'ping'});},5000);
 return {send(action){if(!conn?.open||!last){onError('ยังไม่ได้เชื่อมต่อกับห้อง');return;}conn.send({type:'action',round:last.round,action});},close(){closed=true;clearInterval(ping);clearTimeout(retryTimer);conn?.close();peer.destroy();}};
}
