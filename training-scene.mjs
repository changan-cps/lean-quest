import * as THREE from './three.module.min.js';
import {factory,cycleTimes,takt,ITEMS} from './training-core.mjs';
import {STATIONS,OVERVIEW,OVERVIEW_PORTRAIT,fitDistance,visuals} from './scene3d/layout.mjs';
import {FactoryAudio} from './scene3d/audio.mjs';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const SETTINGS_KEY='lq-train-3d';
// Viewer preferences (per device): quality tier, reduced motion. Sound stays with the page's sound button.
export function loadViewSettings(){let s={};try{s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')||{};}catch(e){}
 const mq=q=>{try{return matchMedia(q).matches;}catch(e){return false;}};
 return {quality:['low','medium','high'].includes(s.quality)?s.quality:(mq('(max-width:600px)')?'low':'medium'),reducedMotion:typeof s.reducedMotion==='boolean'?s.reducedMotion:mq('(prefers-reduced-motion: reduce)')};}
export function saveViewSettings(v){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify({quality:v.quality,reducedMotion:!!v.reducedMotion}));}catch(e){}}
const audio=new FactoryAudio();   // one ambience engine for the page, survives scene rebuilds
let roomEnvPromise=null;
export class FactoryScene {
 constructor(el,{onSelect=()=>{},profile={},quality,avatar=false,reducedMotion}={}){
 const pref=loadViewSettings();quality=quality||pref.quality;reducedMotion=reducedMotion??pref.reducedMotion;
 this.el=el;this.onSelect=onSelect;this.profile=profile;this.avatar=avatar;this.quality=quality;this.reducedMotion=reducedMotion;this.selected=-1;this.state=null;this.lastFactory='';this.disposed=false;this.targets=[];this.actors=[];this.products=[];this.racks=[];this.angle=.72;this.elevation=.62;this.distance=avatar?5.2:24;this.focus=new THREE.Vector3(0,avatar?1.3:0,0);
 this.goal={angle:this.angle,elevation:this.elevation,distance:this.distance,focus:this.focus.clone()};this.userZoom=0;this.pack=null;this.slice=null;this.loadState='idle';this.perf={frames:0,acc:0,fps:0,worst:0,last:0};
 this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#bfe3f7');this.scene.fog=new THREE.Fog('#bfe3f7',38,95);
 this.camera=new THREE.PerspectiveCamera(40,1,.1,160);this.renderer=new THREE.WebGLRenderer({antialias:quality!=='low',alpha:false,powerPreference:quality==='high'?'high-performance':'low-power'});this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,quality==='high'?2:quality==='low'?1:1.5));this.renderer.shadowMap.enabled=quality!=='low';this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.0;el.appendChild(this.renderer.domElement);this.renderer.domElement.setAttribute('aria-label','ฉากโรงงานสามมิติ หมุนด้วยการลากและซูมด้วยสองนิ้ว หรือใช้ปุ่มสถานีและปุ่มมุมกล้อง');
 this.hemi=new THREE.HemisphereLight('#e6f0ff','#5d5a55',1.1);this.scene.add(this.hemi);const sun=new THREE.DirectionalLight('#fff4e6',2.4);sun.position.set(6,16,10);sun.castShadow=quality!=='low';sun.shadow.mapSize.set(quality==='high'?2048:1024,quality==='high'?2048:1024);Object.assign(sun.shadow.camera,{left:-16,right:16,top:10,bottom:-10,near:1,far:45});sun.shadow.normalBias=.03;sun.shadow.bias=-.0004;this.scene.add(sun);this.sun=sun;const rim=new THREE.DirectionalLight('#cfe6ff',.8);rim.position.set(-12,8,-10);this.scene.add(rim);
 this.world=new THREE.Group();this.scene.add(this.world);this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.clock=new THREE.Clock();this.bindControls();this.resize=new ResizeObserver(()=>this.fit());this.resize.observe(el);this.fit();this.animate=this.animate.bind(this);this.frame=requestAnimationFrame(this.animate);
 this.born=performance.now();if(globalThis.LQ_DEBUG&&!avatar)globalThis.__lqScene=this;
 this.environment();
 if(avatar){this.buildFloor();this.person=this.human(0,0,0);this.world.add(this.person);}
 else this.mountOverlay();
 this.loadAssets();
 }
 environment(){if(!roomEnvPromise)roomEnvPromise=import('./vendor/three/RoomEnvironment.js').catch(()=>null);roomEnvPromise.then(m=>{if(!m||this.disposed)return;const pm=new THREE.PMREMGenerator(this.renderer);this.envTex=pm.fromScene(new m.RoomEnvironment(this.renderer),.04).texture;pm.dispose();this.scene.environment=this.envTex;this.scene.environmentIntensity=.75;});}
 // asset pack (GLB + KTX2) for the realistic Assembly slice / avatar; procedural scene stays as fallback
 loadAssets(){if(globalThis.LQ_NO_ASSETS)return;this.loadState='loading';this.setStatus('กำลังโหลดโมเดล 3 มิติ…');
 import('./scene3d/assets.mjs').then(A=>A.loadPack(this.renderer,this.quality,{onProgress:p=>{if(this.loadState==='loading')this.setStatus('กำลังโหลดโมเดล 3 มิติ '+Math.round(p.loaded/p.total*100)+'%');}})).then(pack=>{if(this.disposed)return;this.pack=pack;this.loadState=Object.keys(pack.models).length?'ready':'failed';
 if(this.loadState==='failed'){this.setStatus('ใช้ภาพแบบย่อ: โหลดโมเดลไม่สำเร็จ',true);return;}this.setStatus('');
 pack.phase2?.then(()=>{if(this.disposed)return;this.lastFactory='';if(this.state)this.update(this.state);if(this.avatar)this.mountAvatar();});
 if(this.avatar)this.mountAvatar();else{this.lastFactory='';if(this.state)this.update(this.state);}})
 .catch(e=>{if(this.disposed)return;this.loadState='failed';console.warn('3D assets unavailable, using procedural fallback',e);this.setStatus('ใช้ภาพแบบย่อ: โหลดโมเดลไม่สำเร็จ',true);});}
 setStatus(text,sticky=false){if(this.avatar&&!sticky&&!text){this.statusEl?.remove();this.statusEl=null;return;}if(!this.statusEl){if(!text||typeof document==='undefined')return;this.statusEl=document.createElement('div');this.statusEl.className='fs-status';this.statusEl.setAttribute('role','status');this.el.appendChild(this.statusEl);}this.statusEl.textContent=text;this.statusEl.hidden=!text;}
 // large tap targets over each station (>=48 CSS px), positioned by projecting the station anchor
 mountOverlay(){if(typeof document==='undefined')return;const box=document.createElement('div');box.className='fs-pins';this.pinEls=[0,1,2,3].map(j=>{const b=document.createElement('button');b.type='button';b.className='fs-pin';b.dataset.j=j;b.innerHTML=`<b>${j+1}</b><i class="fs-wip" hidden></i>`;b.addEventListener('click',e=>{e.stopPropagation();this.onSelect(j);});box.appendChild(b);return b;});this.el.appendChild(box);this.pinBox=box;}
 pinWorld(j){return this.slice?STATIONS[j].pin:[(j-1.5)*5.2,3.2,0];}
 updatePins(){if(!this.pinEls||!this.state)return;const w=this.el.clientWidth,h=this.el.clientHeight,v=new THREE.Vector3(),f=factory(this.state.factory),vis=visuals(this.state,cycleTimes(this.state));
 this.pinEls.forEach((b,j)=>{v.set(...this.pinWorld(j)).project(this.camera);const on=v.z<1&&Math.abs(v.x)<1.05&&Math.abs(v.y)<1.05;const x=Math.round((v.x*.5+.5)*w),y=Math.round((-v.y*.5+.5)*h);const key=on+':'+x+':'+y+':'+vis[j].andon+':'+vis[j].wip+':'+(this.selected===j);if(b._k===key)return;b._k=key;b.hidden=!on;b.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;b.dataset.andon=vis[j].andon;b.setAttribute('aria-pressed',String(this.selected===j));b.setAttribute('aria-label',`สถานี ${j+1} ${f.stations[j]} · ${({green:'กำลังผลิต',amber:'รอส่งต่อ',red:'เครื่องหยุด',off:'ว่าง'})[vis[j].andon]}${vis[j].wip?' · WIP '+vis[j].wip:''}`);const wi=b.querySelector('.fs-wip');wi.hidden=!vis[j].wip;wi.textContent=vis[j].wip;});}
 mat(c,metal=0,rough=.55){return new THREE.MeshStandardMaterial({color:c,metalness:metal,roughness:rough});}
 box(w,h,d,c,x=0,y=0,z=0,parent=this.world,metal=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),this.mat(c,metal));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 cylinder(r1,r2,h,c,x,y,z,parent=this.world){const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,16),this.mat(c,.45));m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
 ball(r,c,x,y,z,parent){const m=new THREE.Mesh(new THREE.SphereGeometry(r,20,14),this.mat(c));m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
 label(text,x,y,z,parent=this.world){const cv=document.createElement('canvas');cv.width=512;cv.height=96;const c=cv.getContext('2d');c.fillStyle='#102537';c.fillRect(0,0,512,96);c.font='bold 36px sans-serif';c.fillStyle='#e5f4ff';c.textAlign='center';c.fillText(text,256,62);const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(2.8,.525),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));m.position.set(x,y,z);parent.add(m);return m;}
 buildFloor(){const floor=this.box(65,.15,40,'#687682',0,-.12,0);floor.material.roughness=.75;floor.castShadow=false;
 for(let x=-30;x<=30;x+=4)this.box(.015,.005,36,'#82909b',x,-.035,0);for(let z=-16;z<=16;z+=4)this.box(60,.005,.015,'#82909b',0,-.035,z);
 if(this.avatar)return;
 for(const z of [-3.5,3.5])this.box(23,.014,.10,'#f8ca45',0,0,z);for(let x=-12;x<=12;x+=6){for(const z of [-7,7]){this.box(.24,8,.24,'#8e9aa7',x,4,z,undefined,.7);this.box(.5,.18,.5,'#f8ca45',x,.1,z);}this.box(.24,.24,14,'#a9b1ba',x,7.9,0,undefined,.5);for(const z of [-4,4]){const lamp=this.box(2.7,.09,.3,'#ffffff',x,7,z);lamp.material.emissive=new THREE.Color('#e4f3ff');lamp.material.emissiveIntensity=2;}}
 this.box(26,5,.18,'#354c60',0,2.5,-8);for(let x=-10;x<=10;x+=4)this.box(2.8,1.6,.05,'#789aad',x,3.2,-7.88);
 }
 human(x,y,z){const g=new THREE.Group();g.position.set(x,y,z);const skin='#c89171',suit=ITEMS.find(i=>i.id===this.profile.suit)?.color||'#2356a3',helmet=ITEMS.find(i=>i.id===this.profile.helmet)?.color||'#e7ecf2';
 this.box(.48,.63,.29,suit,0,1.19,0,g);this.box(.055,.57,.015,'#b9c7d2',0,1.21,.155,g);this.box(.12,.1,.018,'#c7d9e5',-.13,1.35,.16,g);this.box(.48,.06,.32,'#172132',0,.89,0,g);
 for(const side of [-1,1]){this.cylinder(.09,.085,.72,'#28344b',side*.135,.5,0,g);this.box(.18,.14,.35,'#172132',side*.135,.11,.055,g);}
 this.cylinder(.08,.08,.14,skin,0,1.58,0,g);const head=this.ball(.185,skin,0,1.8,0,g);head.scale.set(.82,1.14,.9);this.ball(.045,skin,0,1.77,.17,g);for(const side of [-1,1]){this.ball(.025,'#1d2731',side*.066,1.85,.143,g);this.ball(.034,skin,side*.155,1.8,0,g);}const cap=this.ball(.21,helmet,0,1.94,0,g);cap.scale.set(1,.65,1.07);this.cylinder(.23,.23,.035,helmet,0,1.93,.015,g);
 const arms=[];for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.32,1.43,0);this.cylinder(.082,.075,.37,suit,0,-.18,0,arm);this.cylinder(.064,.06,.34,suit,0,-.5,.03,arm);this.ball(.085,'#e0e4e5',0,-.71,.07,arm);g.add(arm);arms.push(arm);}g.userData.arms=arms;return g;
 }
 car(parent,x=0,y=.7,z=0,painted=true){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);const col=painted?'#d5e2e9':'#84919c';this.box(3.6,.47,1.65,col,0,.52,0,g,.72);this.box(2.5,.18,1.58,col,-.1,.85,0,g,.7);this.box(1.8,.58,1.42,col,-.13,1.11,0,g,.75);
 for(const s of [-1,1]){this.box(1.52,.38,.025,'#213e52',-.1,1.13,s*.723,g,.6);this.box(.065,.44,.05,col,-.08,1.13,s*.73,g,.6);this.box(2.9,.035,.025,'#e7ecf1',0,.85,s*.83,g,.8);for(const xx of [-1.16,1.16]){const tire=this.cylinder(.34,.34,.2,'#18212a',xx,.32,s*.8,g);tire.rotation.x=Math.PI/2;const hub=this.cylinder(.2,.2,.211,'#bec8d1',xx,.32,s*.81,g);hub.rotation.x=Math.PI/2;}this.box(.12,.12,.48,'#f5f3d7',1.82,.63,s*.5,g);this.box(.12,.12,.48,'#a93134',-1.82,.63,s*.5,g);}
 this.box(.04,.44,1.3,'#27495f',.78,1.12,0,g,.7);this.box(.04,.4,1.3,'#27495f',-1.05,1.12,0,g,.7);return g;
 }
 engine(parent){const g=new THREE.Group();parent.add(g);this.box(1.3,.65,.85,'#a7b0b9',0,.42,0,g,.85);this.box(1.4,.14,.92,'#334453',0,.82,0,g,.7);for(let i=0;i<4;i++){this.cylinder(.105,.105,.12,'#c3cbd3',-.45+i*.3,.95,0,g);this.box(.08,.26,.25,'#28303b',-.45+i*.3,.94,-.35,g);}const pulley=this.cylinder(.25,.25,.14,'#202b35',.75,.4,0,g);pulley.rotation.z=Math.PI/2;return g;}
 battery(parent){const g=new THREE.Group();parent.add(g);this.box(2.3,.15,1.35,'#9cabb5',0,.2,0,g,.8);for(let i=0;i<6;i++)for(let j=0;j<3;j++){this.box(.32,.19,.35,'#335e76',-.92+i*.365,.38,-.42+j*.42,g,.65);this.box(.16,.02,.05,'#db9d43',-.92+i*.365,.485,-.42+j*.42,g,.8);}this.box(1.4,.035,.05,'#dd752a',0,.51,.6,g);return g;}
 robot(parent,side){const g=new THREE.Group();g.position.set(0,0,side*2.25);parent.add(g);this.cylinder(.38,.48,.3,'#283644',0,.15,0,g);this.cylinder(.24,.27,.5,'#e99a36',0,.52,0,g);const a=this.box(.29,1.35,.32,'#e39330',0,1.3,-side*.25,g,.35);a.rotation.x=side*.42;this.ball(.23,'#303d4a',0,1.9,-side*.52,g);const b=this.box(.23,.23,1.2,'#e39330',0,1.93,-side*1,g,.4);this.box(.12,.42,.12,'#768691',0,1.7,-side*1.55,g,.8);return g;}
 rack(parent){const g=new THREE.Group();parent.add(g);for(const x of [-.66,.66])for(const z of [-.35,.35])this.box(.055,1.55,.055,'#aeb8bf',x,.79,z,g,.8);for(const y of [.18,.78,1.36]){this.box(1.43,.08,.8,'#a9b5bd',0,y,0,g,.7);for(let x=-.42;x<=.43;x+=.42){this.box(.34,.22,.55,'#24618e',x,y+.15,0,g);this.box(.16,.065,.012,'#f1f3db',x,y+.18,.283,g);}}return g;}
 clearWorld(){this.slice?.dispose();this.slice=null;this.world.traverse(o=>{if(o.userData?.shared)return;if(o.geometry)o.geometry.dispose();if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){m.map?.dispose();m.dispose();}}});this.world.clear();this.targets=[];this.actors=[];this.products=[];this.racks=[];}
 build(id){this.clearWorld();this.buildFloor();const f=factory(id);
 for(let j=0;j<4;j++){const g=new THREE.Group();const x=(j-1.5)*5.2;g.position.x=x;this.world.add(g);const pad=this.box(4.7,.025,6.4,j===this.selected?'#4f8090':'#455d69',0,.015,0,g);pad.userData.station=j;this.targets.push(pad);this.box(4.9,.20,1.85,'#34414e',0,.51,0,g,.7);for(let xx=-2.2;xx<2.3;xx+=.3){const roller=this.cylinder(.09,.09,1.8,'#8997a1',xx,.64,0,g);roller.rotation.x=Math.PI/2;}
 for(const xx of [-1.7,1.7])this.box(.14,.5,1.3,'#bbc4cc',xx,.25,0,g,.7);
 this.label(String(j+1).padStart(2,'0')+' · '+f.en,x,3.6,-2.5);
 const product=new THREE.Group();product.position.y=.72;g.add(product);if(id==='battery')this.battery(product);else if(id==='engine')this.engine(product);else this.car(product,0,-.4,0,id!=='weld');this.products.push(product);
 if(id==='weld'){this.robot(g,-1);this.robot(g,1);for(const z of [-3.0,3.0]){this.box(4.6,.07,.07,'#d7b44a',0,2.6,z,g);for(const xx of [-2.25,2.25])this.box(.06,2.6,.06,'#d7b44a',xx,1.3,z,g);}}
 if(id==='paint'&&j===2){for(const z of [-1.25,1.25])this.box(4.5,2.5,.10,'#cad9df',0,1.8,z,g,.35);this.box(4.5,.13,2.6,'#d8e0e6',0,3.1,0,g,.5);this.robot(g,-1);}
 if(id==='quality'){const arch=this.box(.18,2.7,2.5,'#d4e7f0',0,1.8,0,g,.4);arch.visible=false;for(const z of [-1.15,1.15])this.box(.12,2.6,.12,'#ecf5fa',0,1.5,z,g,.2);this.box(.12,.12,2.4,'#ecf5fa',0,2.78,0,g,.3);}
 const human=this.human(.3,0,2.35);human.rotation.y=Math.PI;g.add(human);this.actors.push(human);const rack=this.rack(g);rack.position.set(-1.5,0,4.5);this.racks.push(rack);
 const board=this.box(.65,.48,.10,'#1a2736',1.6,1.65,2.5,g);this.box(.065,1.4,.065,'#93a4b4',1.6,.7,2.5,g,.7);this.box(.43,.28,.02,'#3ea884',1.6,1.66,2.56,g);
 }
 this.issue=this.box(.75,.4,.65,'#d19547',-9,.2,3.8);this.label('LEAN QUEST · '+f.en,0,4.5,-7.7);this.lastFactory=id;
 }
 buildSlice(state){this.clearWorld();const f=factory(state.factory);return import('./scene3d/assembly.mjs').then(({AssemblySlice})=>{if(this.disposed||this.state?.factory!=='assembly')return;
 this.clearWorld();this.slice=new AssemblySlice(this.pack,{quality:this.quality,reducedMotion:this.reducedMotion,stationNames:f.stations,audio});this.world.add(this.slice.root);this.targets=this.slice.targets;
 this.slice.root.traverse(o=>{if(o.isMesh&&this.quality==='low'){o.castShadow=false;}});this.issue=this.slice.issue||new THREE.Group();this.scene.fog.near=34;this.lastFactory='assembly:slice';this.sliceReadyMs=Math.round(performance.now()-this.born);this.applyView(true);if(this.state)this.update(this.state);}).catch(e=>{console.warn('assembly slice failed, procedural fallback',e);this.loadState='failed';this.setStatus('ใช้ภาพแบบย่อ: สร้างฉากไม่สำเร็จ',true);this.lastFactory='';if(this.state)this.update(this.state);});}
 update(state){this.state=state;if(!state||this.avatar)return;
 const wantSlice=state.factory==='assembly'&&this.pack&&this.loadState==='ready';
 if(wantSlice){if(this.lastFactory!=='assembly:slice'){if(this.lastFactory!=='assembly:pending'){this.lastFactory='assembly:pending';this.buildSlice(state);}return;}this.slice.update(state,cycleTimes(state),takt(state));return;}
 if(this.lastFactory!==state.factory)this.build(state.factory);this.issue.visible=!state.issueFixed;for(let j=0;j<4;j++){this.racks[j].position.z=state.layout[j]==='near'?2.95:state.layout[j]==='side'?3.65:4.5;this.products[j].visible=state.active[j]!==null||state.blocked[j]!==null||state.status==='ready';this.targets[j].material.color.set(j===this.selected?'#537e8f':'#455d69');}}
 // camera framing that adapts to portrait phones (fits the station/line width to the screen)
 applyView(snap=false){const aspect=Math.max(.3,this.camera.aspect||1);if(this.avatar)return;
 if(this.slice||this.lastFactory==='assembly:pending'){const v=this.selected<0?(aspect<1.4?OVERVIEW_PORTRAIT:OVERVIEW):STATIONS[this.selected].view;this.goal.focus.set(...v.target);this.goal.angle=v.angle;this.goal.elevation=aspect<.8&&this.selected>=0?v.elevation+.1:v.elevation;this.goal.distance=clamp(fitDistance(v.width,this.camera.fov,aspect)+this.userZoom,4,70);}
 else{if(this.selected<0){this.goal.focus.set(0,0,0);this.goal.distance=clamp(fitDistance(23,this.camera.fov,aspect)+this.userZoom,8,60);}else{this.goal.focus.set((this.selected-1.5)*5.2,1,0);this.goal.distance=clamp(fitDistance(6.5,this.camera.fov,aspect)+this.userZoom,5,40);}this.goal.angle=this.angle;this.goal.elevation=this.elevation;}
 if(snap||this.reducedMotion){this.focus.copy(this.goal.focus);this.distance=this.goal.distance;this.angle=this.goal.angle;this.elevation=this.goal.elevation;}}
 select(j){this.selected=j;this.userZoom=0;if(this.slice||this.lastFactory==='assembly:pending')this.applyView();else{if(j<0){this.focus.set(0,0,0);this.distance=this.el.clientWidth<600?30:24;}else{this.focus.set((j-1.5)*5.2,1,0);this.distance=10;}this.applyView(true);}if(this.state)this.update(this.state);for(const b of this.pinEls||[])b._k='';}
 zoom(delta){if(this.avatar){this.distance=clamp(this.distance+delta,3,40);return;}this.userZoom=clamp(this.userZoom+delta,-30,40);this.goal.distance=clamp(this.goal.distance+delta,4,70);if(this.reducedMotion)this.distance=this.goal.distance;}
 setReducedMotion(on){this.reducedMotion=!!on;this.slice?.setReducedMotion(this.reducedMotion);if(on)this.applyView(true);}
 setSound(on){if(on)audio.start();else audio.stop();}
 stats(){const i=this.renderer.info;return {fps:this.perf.fps,worstFrameMs:Math.round(this.perf.lastWorst||0),sliceReadyMs:this.sliceReadyMs??null,drawCalls:i.render.calls,triangles:i.render.triangles,geometries:i.memory.geometries,textures:i.memory.textures,loadState:this.loadState,quality:this.quality,assetBytes:this.pack?.bytes||0,timings:this.pack?.timings||{},errors:this.pack?.errors||[]};}
 mountAvatar(){if(!this.pack?.models?.worker||!this.person)return;import('./scene3d/assets.mjs').then(A=>{if(this.disposed)return;const w=A.instance(this.pack,'worker');if(!w)return;A.applyLod(w,this.pack.tier?.lod??0);
 const suit=ITEMS.find(i=>i.id===this.profile.suit)?.color,helmet=ITEMS.find(i=>i.id===this.profile.helmet)?.color;
 w.traverse(o=>{if(!o.isMesh)return;const n=o.material.name;if((n==='M_UniformShirt'&&suit)||(n==='M_Helmet'&&helmet)){o.material=o.material.clone();o.material.userData.own=true;o.material.color.set(n==='M_Helmet'?helmet:suit);}});
 this.person.removeFromParent();this.person=w;w.userData.shared=true;this.world.add(w);this.mixer=new THREE.AnimationMixer(w);const c=A.clipsFor(this.pack,'worker').find(c=>c.name==='Idle');if(c)this.mixer.clipAction(c).play();this.focus.set(0,1.0,0);this.distance=2.7;});}
 bindControls(){const cv=this.renderer.domElement;this.abort=new AbortController();const opts={signal:this.abort.signal};let start=null,last=null,pointers=new Map(),pinch=0,moved=false;
 cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);start=[e.clientX,e.clientY];last=start;moved=false;if(pointers.size===2){const p=[...pointers.values()];pinch=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);}},opts);
 cv.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2){const p=[...pointers.values()],d=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);this.zoom((pinch-d)*.04);pinch=d;moved=true;}else if(last){const dx=e.clientX-last[0],dy=e.clientY-last[1];if(Math.hypot(e.clientX-start[0],e.clientY-start[1])>6)moved=true;this.angle-=dx*.008;this.elevation=clamp(this.elevation+dy*.005,.12,1.35);this.goal.angle=this.angle;this.goal.elevation=this.elevation;}last=[e.clientX,e.clientY];},opts);
 const up=e=>{pointers.delete(e.pointerId);if(!moved&&start&&!this.avatar){const r=cv.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);this.ray.setFromCamera(this.pointer,this.camera);const hit=this.ray.intersectObjects(this.targets,false)[0];if(hit)this.onSelect(hit.object.userData.station);}last=null;start=null;};cv.addEventListener('pointerup',up,opts);cv.addEventListener('pointercancel',()=>{pointers.clear();last=null;start=null;},opts);cv.addEventListener('wheel',e=>{e.preventDefault();this.zoom(e.deltaY*.01);},{...opts,passive:false});
 }
 fit(){const w=this.el.clientWidth,h=this.el.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.applyView(!this.state);}
 animate(t){if(this.disposed)return;const dt=Math.min(.1,this.clock.getDelta());
 // camera easing in real time (exponential smoothing), instant when reduced motion is on
 if(!this.avatar){const k=this.reducedMotion?1:1-Math.exp(-dt*5);this.focus.lerp(this.goal.focus,k);this.distance+=(this.goal.distance-this.distance)*k;if(this.slice||this.lastFactory==='assembly:pending'){this.angle+=(this.goal.angle-this.angle)*k;this.elevation+=(this.goal.elevation-this.elevation)*k;}}
 this.camera.position.set(this.focus.x+Math.sin(this.angle)*Math.cos(this.elevation)*this.distance,this.focus.y+Math.sin(this.elevation)*this.distance,this.focus.z+Math.cos(this.angle)*Math.cos(this.elevation)*this.distance);this.camera.lookAt(this.focus);
 if(this.slice)this.slice.tick(dt,t,this.camera);
 else if(this.state&&!this.avatar){this.actors.forEach((a,j)=>{const working=this.state.status==='running'&&this.state.active[j]!==null;const wave=working&&!this.reducedMotion?Math.sin(t*.005+j)*.18:0;a.userData.arms[0].rotation.x=-.5+wave;a.userData.arms[1].rotation.x=-.6-wave;});}
 if(this.mixer&&!this.reducedMotion)this.mixer.update(dt);
 this.renderer.render(this.scene,this.camera);this.updatePins();
 const p=this.perf;p.frames++;p.acc+=dt;p.worst=Math.max(p.worst,dt*1000);if(p.acc>=1){p.fps=Math.round(p.frames/p.acc);p.frames=0;p.acc=0;p.lastWorst=p.worst;p.worst=0;}
 this.frame=requestAnimationFrame(this.animate);}
 dispose(){this.disposed=true;cancelAnimationFrame(this.frame);this.abort.abort();this.resize.disconnect();this.clearWorld();this.mixer?.stopAllAction();this.envTex?.dispose();this.renderer.dispose();this.renderer.domElement.remove();this.pinBox?.remove();this.statusEl?.remove();}
}
