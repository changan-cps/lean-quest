import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {hostRoom} from './training-room.mjs';
class Connection extends EventEmitter{constructor(){super();this.open=true;this.sent=[];}send(x){this.sent.push(structuredClone(x));}close(){this.open=false;this.emit('close');}}
class Peer extends EventEmitter{static last;constructor(id){super();this.id=id;Peer.last=this;}destroy(){}reconnect(){}}
test('host enforces activity sessions, pause/reset, reconnect identity and shared-team state',t=>{
 const original={window:globalThis.window,si:globalThis.setInterval,ci:globalThis.clearInterval,st:globalThis.setTimeout,ct:globalThis.clearTimeout,now:Date.now};let clock=1000,tick,snapshot;
 globalThis.window={Peer};globalThis.setInterval=f=>(tick=f,1);globalThis.clearInterval=()=>{};globalThis.setTimeout=()=>1;globalThis.clearTimeout=()=>{};Date.now=()=>clock;
 t.after(()=>{globalThis.window=original.window;globalThis.setInterval=original.si;globalThis.clearInterval=original.ci;globalThis.setTimeout=original.st;globalThis.clearTimeout=original.ct;Date.now=original.now;});
 const host=hostRoom({factory:'assembly',level:1,mode:'coop'},s=>snapshot=structuredClone(s),()=>{});Peer.last.emit('open');
 const join=(token,name,team)=>{const c=new Connection();Peer.last.emit('connection',c);c.emit('data',{type:'join',token,name,team});return c;};
 const a=join('a'.repeat(32),'A','Team'),b=join('b'.repeat(32),'B','Team');assert.equal(snapshot.players.length,2);assert.equal(Object.values(snapshot.activities).some(Boolean),false);
 const action=(c,x,round=snapshot.round)=>{clock+=100;c.emit('data',{type:'action',round,action:x});};
 action(a,{type:'sort',station:0});assert.equal(snapshot.players[0].state.sorted[0],false);host.command('start');action(a,{type:'sort',station:0});assert.equal(snapshot.players[0].state.sorted[0],false);tick();assert.equal(snapshot.players[0].state.time,0);
 host.command('open-activity','parts');action(a,{type:'sort',station:0});assert.equal(snapshot.players[0].state.sorted[0],true);assert.equal(snapshot.players[1].state.budget,1160);action(b,{type:'sort',station:0});assert.equal(snapshot.players[0].state.budget,1160);
 action(a,{type:'observe'});assert.equal(snapshot.players[0].state.evidence,false);host.command('open-activity','gemba');action(a,{type:'observe'});assert.equal(snapshot.players[0].state.evidence,true);
 host.command('close-activity','parts');action(a,{type:'sort',station:1});assert.equal(snapshot.players[0].state.sorted[1],false);
 host.command('open-activity','production');tick();assert.equal(snapshot.players[0].state.time,10);assert.equal(snapshot.players[1].state.time,10);host.command('pause');tick();assert.equal(snapshot.players[0].state.time,10);action(a,{type:'fix'});assert.equal(snapshot.players[0].state.issueFixed,false);
 const id=snapshot.players[0].id;a.close();assert.equal(snapshot.players[0].online,false);const resumed=join('a'.repeat(32),'A','Team');assert.equal(snapshot.players.length,2);assert.equal(snapshot.players[0].id,id);assert.equal(snapshot.players[0].online,true);assert.equal(snapshot.players[0].state.budget,1160);
 const oldRound=snapshot.round;host.command('reset');assert.notEqual(snapshot.round,oldRound);assert.equal(Object.values(snapshot.activities).some(Boolean),false);assert.equal(snapshot.players[0].state.budget,1200);host.command('open-activity','parts');host.command('start');action(resumed,{type:'sort',station:0},oldRound);assert.equal(snapshot.players[0].state.sorted[0],false);
 clock+=20000;tick();assert.equal(snapshot.players.filter(p=>p.online).length,0);host.close();
});
