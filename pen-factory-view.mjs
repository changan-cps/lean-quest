import {assetWorker,addPenEquipment,disposeOwned} from './scene3d/pen-details.mjs';
const PEN3D=(()=>{
  const SRC=["./three.module.min.js","https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.module.min.js"];
  let THREE=null,loading=null,PACK=null,ASSETS=null;
  function load(){if(THREE)return Promise.resolve(THREE);if(loading)return loading;
    loading=(async()=>{let err;for(const u of SRC){try{const m=await import(u);if(m&&m.WebGLRenderer){THREE=m;return m}}catch(e){err=e}}throw err||new Error("three.js not available")})();return loading}
  const INKS=["#2356c9","#d23a2e","#1d2228"];
  const GC=6,GR=3,CW=2.5,CD=2.7;
  const cellXZ=cell=>[(cell.c-2.5)*CW,(cell.r-1)*CD];
  // ---------- small helpers ----------
  function labelTex(text,o){o=o||{};const pad=12,fs=o.fs||28,cv=document.createElement("canvas"),c=cv.getContext("2d");c.font=`700 ${fs}px "IBM Plex Sans Thai",system-ui,sans-serif`;const w=Math.ceil(c.measureText(text).width)+pad*2,h=fs+pad*1.4;cv.width=w*2;cv.height=h*2;c.scale(2,2);
    c.fillStyle=o.bg||"rgba(20,24,30,.82)";const r=h/2;c.beginPath();c.moveTo(r,0);c.arcTo(w,0,w,h,r);c.arcTo(w,h,0,h,r);c.arcTo(0,h,0,0,r);c.arcTo(0,0,w,0,r);c.closePath();c.fill();
    c.font=`700 ${fs}px "IBM Plex Sans Thai",system-ui,sans-serif`;c.textAlign="center";c.textBaseline="middle";c.fillStyle=o.fg||"#fff";c.fillText(text,w/2,h/2+1);const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return {t,w,h}}
  function sprite(text,o){const {t,w,h}=labelTex(text,o);const m=new THREE.SpriteMaterial({map:t,transparent:true,depthTest:o&&o.depth!==false});const s=new THREE.Sprite(m);const k=(o&&o.k)||.011;s.scale.set(w*k,h*k,1);s.userData.text=text;s.userData.o=o||{};return s}
  function setSprite(s,text){if(s.userData.text===text)return;s.material.map.dispose();const {t,w,h}=labelTex(text,s.userData.o);s.material.map=t;s.material.needsUpdate=true;const k=s.userData.o.k||.011;s.scale.set(w*k,h*k,1);s.userData.text=text}
  function mat(color,o){return new THREE.MeshStandardMaterial(Object.assign({color,roughness:.6,metalness:0},o||{}))}
  function box(w,h,d,m,x,y,z){const g=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);g.position.set(x||0,y||0,z||0);g.castShadow=true;g.receiveShadow=true;return g}
  function cyl(r1,r2,h,m,seg){const g=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,seg||16),m);g.castShadow=true;g.receiveShadow=true;return g}
  function roomEnv(){// compact version of three's RoomEnvironment (MIT) for PBR reflections
    const s=new THREE.Scene(),geo=new THREE.BoxGeometry();geo.deleteAttribute("uv");
    const rm=new THREE.MeshStandardMaterial({side:THREE.BackSide}),bm=new THREE.MeshStandardMaterial();
    const L=new THREE.PointLight(0xffffff,900,28,2);L.position.set(.4,16.2,.3);s.add(L);
    const room=new THREE.Mesh(geo,rm);room.position.set(-.76,13.2,.72);room.scale.set(31.7,28.3,28.6);s.add(room);
    [[-10.9,2,1.85,-.195,2.33,7.9,4.65],[-5.6,-.75,-.76,.99,1.97,1.53,3.96],[6.17,.86,7.8,.56,3.93,6.29,3.69],[-2,0,6.1,.33,2,4.57,2.06],[2.29,-.76,-2.62,-.29,1.55,1.55,1.5],[-2.19,-.37,-5.55,.52,3.88,3.49,2.99]].forEach(b=>{const m=new THREE.Mesh(geo,bm);m.position.set(b[0],b[1],b[2]);m.rotation.y=b[3];m.scale.set(b[4],b[5],b[6]);s.add(m)});
    const al=i=>{const m=new THREE.MeshBasicMaterial();m.color.setScalar(i);return m};
    [[-16.1,14.4,8.2,.1,2.43,2.74,50],[-16.1,18,-8.2,.1,2.43,2.75,50],[14.9,12.2,-1.8,.15,4.27,6.33,17],[-.46,8.9,14.5,4.38,5.44,.09,43],[3.2,11.5,-12.5,2.5,2,.1,20],[0,20,0,1,.1,1,100]].forEach(b=>{const m=new THREE.Mesh(geo,al(b[6]));m.position.set(b[0],b[1],b[2]);m.scale.set(b[3],b[4],b[5]);s.add(m)});
    return s}
  function floorTex(){const cv=document.createElement("canvas");cv.width=1024;cv.height=512;const c=cv.getContext("2d");
    const g=c.createLinearGradient(0,0,0,512);g.addColorStop(0,"#bfc6cb");g.addColorStop(1,"#adb5bb");c.fillStyle=g;c.fillRect(0,0,1024,512);
    const img=c.getImageData(0,0,1024,512),d=img.data;let seed=7;for(let i=0;i<d.length;i+=4){seed=(seed*16807)%2147483647;const v=(seed/2147483647-.5)*14;d[i]+=v;d[i+1]+=v;d[i+2]+=v}c.putImageData(img,0,0);
    c.strokeStyle="rgba(0,0,0,.05)";c.lineWidth=2;for(let x=0;x<1024;x+=64){c.beginPath();c.moveTo(x,0);c.lineTo(x,512);c.stroke()}for(let y=0;y<512;y+=64){c.beginPath();c.moveTo(0,y);c.lineTo(1024,y);c.stroke()}
    const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,2);t.anisotropy=8;return t}
  function boardTex(draw){const cv=document.createElement("canvas");cv.width=640;cv.height=320;const c=cv.getContext("2d");draw(c,cv.width,cv.height);const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return {cv,c,t}}
  // ---------- worker ----------
  function worker(w){
    const detailed=PACK&&assetWorker(PACK,w);if(detailed)return detailed;// Changan-style uniform: navy work shirt with red piping, khaki trousers, blue safety helmet, ID badge, black safety shoes
    const E=w.eq||{},g=new THREE.Group(),L=w.look||{},skin=mat(L.skin||"#e6b993",{roughness:.7}),isNew=!w.eq&&w.sk<.85,lead=w.sk>=.95;
    const shirt=mat(E.shirt||"#2e3d5c",{roughness:.8}),pants=mat(E.pants||"#cdbb9b",{roughness:.9}),red=mat(E.trim||"#c8322b",{roughness:.6}),shoe=mat(E.shoes||"#1a1d21",{roughness:E.shoes==="#e8b923"?.3:.5,metalness:E.shoes==="#e8b923"?.6:0});
    [-.1,.1].forEach(x=>{const l=cyl(.065,.075,.78,pants);l.position.set(x,.42,0);g.add(l);const sh=box(.13,.07,.22,shoe,x,.035,.04);g.add(sh)});
    g.add(box(.3,.06,.2,mat("#1f2430"),0,.8,0));// belt
    const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.2,.4,4,12),shirt);torso.position.y=1.08;torso.castShadow=true;g.add(torso);
    g.add(box(.012,.42,.012,red,0,1.1,.2));// red piping down the placket
    g.add(box(.26,.012,.012,red,0,1.3,.19));// red piping along the yoke
    const collar=new THREE.Mesh(new THREE.CylinderGeometry(.12,.14,.06,12,1,true),shirt);collar.position.y=1.36;g.add(collar);
    g.add(box(.11,.07,.01,mat("#3a4a6a"),-.12,1.17,.2));g.add(box(.11,.07,.01,mat("#3a4a6a"),.12,1.17,.2));// chest pockets
    g.add(box(.05,.012,.012,red,-.12,1.205,.21));g.add(box(.05,.012,.012,red,.12,1.205,.21));
    const card=box(.07,.1,.006,mat("#ffffff",{roughness:.4}),.1,1.02,.2);g.add(card);g.add(box(.07,.02,.007,mat("#1f3f8f"),.1,1.06,.2));g.add(box(.004,.12,.004,mat("#1f3f8f"),.1,1.14,.2));
    g.add(box(.055,.032,.006,mat("#e8722a"),-.11,1.26,.195));// company logo
    const arms=[];[-1,1].forEach(k=>{const p=new THREE.Group();p.position.set(k*.25,1.3,0);const a=new THREE.Mesh(new THREE.CapsuleGeometry(.06,.3,3,8),shirt);a.position.y=-.2;a.castShadow=true;p.add(a);const h=new THREE.Mesh(new THREE.SphereGeometry(.055,10,8),skin);h.position.y=-.42;p.add(h);
      if(lead&&k<0){const patch=box(.06,.05,.012,red,0,-.06,.05);p.add(patch)}// red team-leader patch on the shoulder
      if(isNew&&k>0){const band=cyl(.068,.068,.06,mat("#2fbf6b"));band.position.y=-.12;p.add(band)}
      p.rotation.x=-.9;g.add(p);arms.push(p)});
    const head=new THREE.Mesh(new THREE.SphereGeometry(.14,16,14),skin);head.position.y=1.56;head.castShadow=true;g.add(head);
    const hair=new THREE.Mesh(new THREE.SphereGeometry(.145,16,10,0,Math.PI*2,0,Math.PI*.55),mat(L.hair||"#2b1f17",{roughness:.9}));hair.position.y=1.565;g.add(hair);
    if(L.g==="f"){const pony=new THREE.Mesh(new THREE.CapsuleGeometry(.05,.2,3,8),mat(L.hair||"#2b1f17"));pony.position.set(0,1.4,-.13);g.add(pony)}
    // safety helmet: blue (leader white), with brim and ridges; new hires get a yellow band
    const helC=E.helmet||(lead?"#f2f4f6":"#1f5fd0"),helM=mat(helC,{roughness:helC==="#e8b923"?.25:.35,metalness:helC==="#e8b923"?.7:.05});const hel=new THREE.Mesh(new THREE.SphereGeometry(.165,18,12,0,Math.PI*2,0,Math.PI*.52),helM);hel.position.y=1.6;g.add(hel);
    const brim=new THREE.Mesh(new THREE.TorusGeometry(.165,.018,8,24),helM);brim.rotation.x=Math.PI/2;brim.position.y=1.6;g.add(brim);g.add(box(.09,.015,.1,helM,0,1.6,.2));
    if(isNew){const band=cyl(.17,.17,.03,mat("#f2b705"));band.position.y=1.62;g.add(band)}
    [-.05,.05].forEach(x=>{const e=new THREE.Mesh(new THREE.SphereGeometry(.014,8,8),mat("#22180f"));e.position.set(x,1.57,.13);g.add(e)});
    g.add(box(.04,.008,.01,mat("#9a4637"),0,1.5,.135));
    if(w.glasses){g.add(box(.14,.04,.004,mat("#2a2f35",{transparent:true,opacity:.5}),0,1.57,.14))}
    g.userData={arms,ph:Math.random()*6};g.traverse(o=>{if(o.isMesh)o.castShadow=true});return g}
  function pen(ink){const g=new THREE.Group();const body=cyl(.006,.006,.14,mat("#eef2f5",{roughness:.35}));body.rotation.z=Math.PI/2;g.add(body);const tip=cyl(.006,.001,.02,mat(ink||INKS[0],{roughness:.4}));tip.rotation.z=Math.PI/2;tip.position.x=.08;g.add(tip);const clip=box(.05,.004,.008,mat("#9aa3ab",{metalness:.8,roughness:.3}),-.04,.009,0);g.add(clip);return g}
  // ---------- station ----------
  function station(stn,i){const g=new THREE.Group(),w=1.7,d=.85;
    const steel=mat("#e6eaee",{metalness:.3,roughness:.4}),top=mat("#d9dee3",{roughness:.5}),matG=mat("#2f8a66",{roughness:.85});
    g.add(box(w,.05,d,top,0,.85,0));g.add(box(w-.12,.012,d-.12,matG,0,.88,0));
    [[-w/2+.05,-d/2+.05],[w/2-.05,-d/2+.05],[-w/2+.05,d/2-.05],[w/2-.05,d/2-.05]].forEach(p=>{const l=cyl(.02,.02,.83,steel,8);l.position.set(p[0],.415,p[1]);g.add(l)});
    g.add(box(w-.1,.02,d-.2,mat("#8d969e",{metalness:.5,roughness:.5}),0,.3,0));
    for(let k=0;k<4;k++){g.add(box(.3,.16,.4,mat(["#2356c9","#2f8a3a","#d97706","#2356c9"][k],{roughness:.7}),-.6+k*.4,.39,0))}
    // light frame and sign
    [-w/2+.1,w/2-.1].forEach(x=>{const p=cyl(.018,.018,2.3,steel,8);p.position.set(x,1.15,-d/2-.95);g.add(p)});
    g.add(box(w-.2,.05,.1,steel,0,2.3,-d/2-.95));const lamp=box(w-.4,.02,.3,new THREE.MeshStandardMaterial({color:"#fffbe6",emissive:"#fff4c2",emissiveIntensity:1.6}),0,2.28,-d/2-.4);g.add(lamp);g.add(box(w-.2,.03,.03,steel,0,2.3,-d/2-.4));[-w/2+.1,w/2-.1].forEach(x=>g.add(box(.03,.03,.6,steel,x,2.3,-d/2-.65)));
    const sign=sprite(`S${i+1} · ${stn.name}`,{bg:"#1f3f8f",fs:30,k:.0062});sign.position.set(0,2.6,-d/2-.95);g.add(sign);
    const ct=sprite("CT",{bg:"rgba(29,145,82,.95)",fs:28,k:.005});ct.position.set(0,.62,d/2+.08);g.add(ct);
    const msg=sprite(" ",{bg:"#cf3a2e",fs:26,k:.0055});msg.position.set(0,2.05,-d/2-.3);msg.visible=false;g.add(msg);
    // part bins on bench
    const picks=stn.tasks.filter(t=>/^t[12467]$/.test(t));picks.slice(0,4).forEach((t,k)=>{const b=box(.17,.09,.12,mat("#2356c9",{roughness:.65}),w/2-.16-k*.2,.925,-.26);g.add(b);const col={t1:"#d23a2e",t2:"#c9d0d6",t4:"#e9eef3",t6:"#f0b429",t7:"#cfd8e3"}[t];g.add(box(.12,.03,.08,mat(col),w/2-.16-k*.2,.96,-.26))});

    if(stn.has&&stn.has.t10){g.add(box(.22,.004,.16,mat("#ffffff"),.2,.878,.1))}
    if(stn.has&&stn.has.t11){g.add(box(.3,.12,.22,mat("#c49a66",{roughness:.8}),-.5,.94,.12))}
    // WIP tray (left front)
    const tray=box(.34,.03,.14,mat("#2b3138",{roughness:.6}),-.55,.9,.25);g.add(tray);const pens=[];for(let k=0;k<6;k++){const p=pen(INKS[k%3]);p.position.set(-.67+k*.05,.925,.25);p.rotation.y=Math.PI/2;p.visible=false;g.add(p);pens.push(p)}
    // andon
    const pole=cyl(.015,.015,2.3,steel,8);pole.position.set(w/2+.12,1.15,-d/2-.95);g.add(pole);const lights=["#ff3b2f","#f0b429","#2fbf6b"].map((cc,j)=>{const m=new THREE.MeshStandardMaterial({color:cc,emissive:cc,emissiveIntensity:0,roughness:.3});const s=new THREE.Mesh(new THREE.SphereGeometry(.06,12,10),m);s.position.set(w/2+.12,2.45-j*.14,-d/2-.95);g.add(s);return s});
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({color:"#ff3b2f",transparent:true,opacity:0,depthWrite:false}));glow.scale.set(.5,.5,1);glow.position.set(w/2+.12,2.45,-d/2-.95);g.add(glow);
    [[-w/2-.25,0],[w/2+.25,0]].forEach(p=>g.add(box(.06,.004,d+1.6,mat("#f2d03b"),p[0],.004,-.5)));
    const hit=box(w+.4,2.8,d+1.6,new THREE.MeshBasicMaterial({visible:false}),0,1.4,-.5);hit.userData.station=i;g.add(hit);
    const equipment=addPenEquipment(g,stn);g.userData={ct,msg,sign,pens,lights,glow,hit,workers:[],w,equipment};return g}
  function rack(){const detailed=PACK&&ASSETS.instance(PACK,'flowrack');if(detailed){ASSETS.applyLod(detailed,PACK.tier.lod);const label=sprite("คลังชิ้นส่วน",{bg:"rgba(20,24,30,.85)",fs:28,k:.0055});label.position.y=2.5;detailed.add(label);detailed.userData.label=label;return detailed;}const g=new THREE.Group(),steel=mat("#5c6670",{metalness:.6,roughness:.4});[-.6,.6].forEach(x=>{[-.25,.25].forEach(z=>{const p=box(.05,2.2,.05,steel,x,1.1,z);g.add(p)})});
    for(let k=0;k<4;k++){const y=.35+k*.55;g.add(box(1.3,.03,.6,mat("#8a949c",{metalness:.5,roughness:.5}),0,y,0));for(let j=0;j<3;j++)g.add(box(.36,.22,.42,mat(["#2356c9","#d23a2e","#1d2228","#2f8a3a"][(k+j)%4],{roughness:.7}),-.42+j*.42,y+.13,0))}
    const s=sprite("คลังชิ้นส่วน",{bg:"rgba(20,24,30,.85)",fs:28,k:.0055});s.position.y=2.5;g.add(s);g.userData.label=s;return g}
  function shipping(){const g=new THREE.Group();g.add(box(1.4,.12,1.1,mat("#9b7b52",{roughness:.9}),0,.06,0));const cartons=[];for(let k=0;k<12;k++){const b=box(.4,.32,.32,mat("#c49a66",{roughness:.85}),-.45+(k%3)*.45,.28+Math.floor(k/3)*.33,(k%2?.2:-.2));b.visible=false;g.add(b);cartons.push(b)}
    const s=sprite("ส่งลูกค้า",{bg:"rgba(20,24,30,.85)",fs:28,k:.0055});s.position.y=2.2;g.add(s);g.userData={cartons};return g}
  // ---------- scene ----------
  async function mount(wrap,st,opt){await load();
    if(!(window.WebGLRenderingContext))throw new Error("no webgl");
    const mobile=window.matchMedia("(max-width:640px)").matches,reduced=window.matchMedia("(prefers-reduced-motion:reduce)").matches;let disposed=false;const R=new THREE.WebGLRenderer({antialias:!mobile,powerPreference:mobile?"low-power":"high-performance"});R.setPixelRatio(Math.min(mobile?1:1.75,window.devicePixelRatio||1));R.shadowMap.enabled=!mobile;R.shadowMap.type=THREE.PCFSoftShadowMap;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=.95;
    try{ASSETS=await import('./scene3d/assets.mjs');PACK=await ASSETS.loadPack(R,mobile?'low':'medium',{models:['hall','worker','flowrack']});await PACK.phase2;}catch(e){console.warn('Pen factory assets unavailable; using detailed procedural view',e);PACK=null;}
    if(!wrap.isConnected){R.dispose();throw new Error('Pen factory view was closed while loading');}
    R.domElement.className="pf3d-canvas";wrap.insertBefore(R.domElement,wrap.firstChild);
    const scene=new THREE.Scene();scene.background=new THREE.Color("#dfe5ea");scene.fog=new THREE.Fog("#dfe5ea",30,60);
    const pm=new THREE.PMREMGenerator(R),envScene=roomEnv(),envTarget=pm.fromScene(envScene,.04);scene.environment=envTarget.texture;disposeOwned(envScene);pm.dispose();
    const cam=new THREE.PerspectiveCamera(42,16/9,.1,80);
    const sun=new THREE.DirectionalLight("#fff6e0",2.8);sun.position.set(6,11,7);sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);Object.assign(sun.shadow.camera,{left:-12,right:12,top:10,bottom:-10,near:1,far:40});sun.shadow.bias=-.0004;scene.add(sun);
    scene.add(new THREE.HemisphereLight("#eef3f8","#8d949a",.7));
    const shell=new THREE.Group();
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(36,20),new THREE.MeshStandardMaterial({map:floorTex(),roughness:.3,metalness:.05}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;shell.add(floor);
    // aisle lines
    const yl=mat("#f2d03b",{roughness:.6});[-1.5,1.5].forEach(r=>{const l=box(GC*CW+2,.004,.05,yl,0,.003,r*CD);l.receiveShadow=false;shell.add(l)});
    // back wall with windows and boards
    const wall=box(40,9,.3,mat("#e8ecef",{roughness:.95}),0,4.5,-GR*CD/2-2.4);shell.add(wall);
    for(let k=-3;k<=3;k++){const win=box(3.2,1.3,.05,new THREE.MeshStandardMaterial({color:"#bcd7ec",emissive:"#dbeefc",emissiveIntensity:.6,roughness:.2,metalness:.1}),k*5,4.6,-GR*CD/2-2.22);shell.add(win);shell.add(box(3.3,1.4,.03,mat("#9fb0bd"),k*5,4.6,-GR*CD/2-2.24))}
    for(let k=-2;k<=2;k++){const l=box(2.6,.06,.25,new THREE.MeshStandardMaterial({color:"#ffffff",emissive:"#fffbe6",emissiveIntensity:1.2}),k*6,7.9,-1);shell.add(l)}
    // columns, trusses, ceiling, side equipment
    const colM=mat("#e4e8eb",{roughness:.8});[-9,-3,3,9].forEach(x=>{shell.add(box(.4,9,.4,colM,x,4.5,-GR*CD/2-2.2))});
    const truss=mat("#d0d6db",{metalness:.4,roughness:.5});for(let x=-12;x<=12;x+=6){shell.add(box(.18,.5,22,truss,x,8.6,0))}for(let z=-7;z<=7;z+=3.5){shell.add(box(30,.4,.15,truss,0,8.4,z))}
    const ceil=new THREE.Mesh(new THREE.PlaneGeometry(40,24),mat("#d7dde2",{roughness:.95}));ceil.rotation.x=Math.PI/2;ceil.position.y=9;shell.add(ceil);
    [[-9,-GR*CD/2-2.2],[9,-GR*CD/2-2.2]].forEach(p=>{const fan=new THREE.Group();const cage=new THREE.Mesh(new THREE.TorusGeometry(.42,.03,8,24),mat("#dfe3e6",{metalness:.5}));fan.add(cage);for(let k=0;k<3;k++){const bl=box(.1,.34,.02,mat("#3a4048"),0,.2,0);bl.rotation.z=k*Math.PI*2/3;const pv=new THREE.Group();pv.add(bl);pv.rotation.z=k*2.1;fan.add(pv)}fan.position.set(p[0],3.3,p[1]+.45);shell.add(fan)});
    const ext=cyl(.08,.08,.5,mat("#d23a2e",{roughness:.4}));ext.position.set(-9.3,.9,-GR*CD/2-1.9);shell.add(ext);
    const trolley=(x,z)=>{const g=new THREE.Group();const fr=mat("#2353b3",{metalness:.5,roughness:.4});[[-.35,-.25],[.35,-.25],[-.35,.25],[.35,.25]].forEach(p=>{g.add(cyl(.02,.02,1.1,fr,8).translateX(p[0]).translateY(.55).translateZ(p[1]))});[.3,.7,1.05].forEach(y=>g.add(box(.76,.02,.56,mat("#9aa3ab"),0,y,0)));for(let k=0;k<4;k++)g.add(box(.3,.12,.22,mat(k%2?"#e9eef3":"#2a2f35"),-.2+(k%2)*.4,.8+Math.floor(k/2)*.0,-.12+Math.floor(k/2)*.26));g.position.set(x,0,z);shell.add(g)};
    trolley(-8.5,2.2);trolley(8.6,-1.2);
    const hall=PACK&&ASSETS.instance(PACK,'hall');
    if(hall){disposeOwned(shell);hall.scale.z=.72;ASSETS.applyLod(hall,PACK.tier.lod);scene.add(hall);
      for(let x=-12;x<=12;x+=4){const light=box(2.5,.045,.2,new THREE.MeshStandardMaterial({color:'#fff',emissive:'#edf5ff',emissiveIntensity:2}),x,7.6,-1);scene.add(light);}
    }else scene.add(shell);
    const boards={};const mkBoard=(key,x,w,h)=>{const b=boardTex((c,W,H)=>{c.fillStyle="#fff";c.fillRect(0,0,W,H)});const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:b.t,roughness:.6}));m.position.set(x,2.9,-GR*CD/2-2.24);scene.add(m);boards[key]=b;return m};
    mkBoard("goal",-7,4.2,2.1);mkBoard("hour",0,4.2,2.1);mkBoard("demand",7,4.2,2.1);
    const rk=rack(),rp=cellXZ({c:-1.1,r:1});rk.position.set(rp[0],0,rp[1]);scene.add(rk);
    const sh=shipping(),sp=cellXZ({c:6.1,r:1});sh.position.set(sp[0],0,sp[1]);scene.add(sh);
    const pathLine=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:"#ffffff",dashSize:.3,gapSize:.2,transparent:true,opacity:.8}));pathLine.position.y=.01;scene.add(pathLine);
    const stGroups=[],wkGroups=new Map(),flyers=[];let hits=[];
    // orbit camera
    const ctl={pol:.55,az:.25,dist:14,tx:0,cx:0,tz:.3,span:8,selected:-1};let drag=null,moved=0,pinch=null;
    function frame(){const a=R.domElement.clientWidth/Math.max(1,R.domElement.clientHeight);cam.aspect=a;cam.fov=a<1?52:46;cam.updateProjectionMatrix();const span=ctl.selected>=0?3.2:(ctl.span||6),half=span/2+1.2,tanH=Math.tan(cam.fov*Math.PI/360)*a;ctl.base=Math.max(half/tanH,(2.8)/Math.tan(cam.fov*Math.PI/360))*1.04}
    function place(){const d=ctl.base*ctl.zoom,pol=Math.min(ctl.pol,Math.asin(Math.min(1,6.2/d))),y=Math.sin(pol)*d,r=Math.cos(pol)*d;const lim=(ctl.span||6)/2+3;ctl.tx=Math.max(ctl.cx-lim,Math.min(ctl.cx+lim,ctl.tx));cam.position.set(ctl.tx+Math.sin(ctl.az)*r,y+1.2,ctl.tz+Math.cos(ctl.az)*r);cam.lookAt(ctl.tx,1.1,ctl.tz)}
    ctl.zoom=1;
    const el=R.domElement;el.style.touchAction="none";
    el.addEventListener("pointerdown",e=>{if(pinch)return;drag={x:e.clientX,y:e.clientY,tx:ctl.tx,pol:ctl.pol,az:ctl.az};moved=0;el.setPointerCapture(e.pointerId)});
    el.addEventListener("pointermove",e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;moved=Math.max(moved,Math.abs(dx)+Math.abs(dy));ctl.az=drag.az-dx*.006;ctl.pol=Math.min(1.1,Math.max(.32,drag.pol+dy*.004));place()});
    el.addEventListener("pointerup",e=>{if(!drag)return;const wasTap=moved<6;drag=null;if(wasTap)pick(e)});
    el.addEventListener("pointercancel",()=>{drag=null});
    el.addEventListener("wheel",e=>{e.preventDefault();ctl.zoom=Math.min(1.8,Math.max(.45,ctl.zoom*(1+e.deltaY*.001)));place()},{passive:false});
    el.addEventListener("touchstart",e=>{if(e.touches.length===2){drag=null;pinch={d:Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY),z:ctl.zoom}}},{passive:true});
    el.addEventListener("touchmove",e=>{if(pinch&&e.touches.length===2){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);ctl.zoom=Math.min(1.8,Math.max(.45,pinch.z*pinch.d/d));place()}},{passive:true});
    el.addEventListener("touchend",e=>{if(e.touches.length<2)pinch=null},{passive:true});
    const ray=new THREE.Raycaster(),v2=new THREE.Vector2();
    function pick(e){const r=el.getBoundingClientRect();v2.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height*2-1));ray.setFromCamera(v2,cam);const h=ray.intersectObjects(hits,false)[0];if(h&&opt&&opt.onStation)opt.onStation(h.object.userData.station)}
    function resize(){const w=wrap.clientWidth,h=wrap.clientHeight;if(!w||!h)return;R.setSize(w,h,false);frame();place()}
    const ro=new ResizeObserver(resize);ro.observe(wrap);resize();
    // ---------- sync scene with game state ----------
    const layoutSignature=()=>st.S.map(x=>[x.cell.c,x.cell.r,x.name,x.tasks.join(",")].join(":")).join("|");
    function rebuild(){wkGroups.forEach(w=>w.removeFromParent());stGroups.forEach(g=>{scene.remove(g);disposeOwned(g)});stGroups.length=0;hits=[];
      st.S.forEach((x,i)=>{const g=station(x,i);const p=cellXZ(x.cell);g.position.set(p[0],0,p[1]);scene.add(g);stGroups.push(g);hits.push(g.userData.hit)});
      const pts=[rp].concat(st.S.map(x=>cellXZ(x.cell))).concat([sp]).map(p=>new THREE.Vector3(p[0],.02,p[1]+.9));pathLine.geometry.dispose();pathLine.geometry=new THREE.BufferGeometry().setFromPoints(pts);pathLine.computeLineDistances();
      const cx=st.S.length?st.S.reduce((a,x)=>a+cellXZ(x.cell)[0],0)/st.S.length:0,cz=st.S.length?st.S.reduce((a,x)=>a+cellXZ(x.cell)[1],0)/st.S.length:0;const xs=st.S.map(x=>cellXZ(x.cell)[0]);ctl.span=st.S.length?Math.max(...xs)-Math.min(...xs)+1.8:6;ctl.cx=cx;ctl.tx=cx;ctl.tz=cz-.1;ctl.selected=-1;frame();place();sig=layoutSignature()}
    let sig=null,boardT=0,lastFlow=0;
    function drawBoards(){const g=boards.goal,c=g.c;c.fillStyle="#fff";c.fillRect(0,0,640,320);c.fillStyle="#1f3f8f";c.fillRect(0,0,640,54);c.font="700 28px 'IBM Plex Sans Thai',system-ui,sans-serif";c.textAlign="center";c.textBaseline="middle";c.fillStyle="#fff";c.fillText("บอร์ดเป้าหมาย SQDCPME",320,27);
      (st.goalRows||[]).forEach((r,i)=>{const x=40+i*82;c.fillStyle=r.col;c.fillRect(x,80,70,70);c.fillStyle="#fff";c.font="700 40px system-ui";c.fillText(r.k,x+35,116);c.fillStyle=r.ok==null?"#c3cad0":r.ok?"#2fbf6b":"#ff3b2f";c.beginPath();c.arc(x+35,190,16,0,7);c.fill();c.fillStyle="#1b222a";c.font="600 24px 'IBM Plex Sans Thai',system-ui,sans-serif";c.fillText(r.txt,x+35,250)});g.t.needsUpdate=true;
      const h=boards.hour,hc=h.c;hc.fillStyle="#fff";hc.fillRect(0,0,640,320);hc.fillStyle="#1f3f8f";hc.fillRect(0,0,640,54);hc.font="700 28px 'IBM Plex Sans Thai',system-ui,sans-serif";hc.textAlign="center";hc.fillStyle="#fff";hc.fillText("Hourly Board · แผน / ทำได้",320,27);hc.fillStyle="#0f1214";hc.fillRect(20,70,600,230);hc.font="600 26px ui-monospace,monospace";hc.textAlign="left";
      const r0=Math.max(0,st.round-3);for(let k=0;k<5;k++){const r=r0+k,p=st.hourly[r],cur=st.round===r,y=100+k*44;hc.fillStyle=cur?"#ffd84d":"#7fd8a0";hc.fillText(`R${r+1} ${String(p?Math.round(p.plan*3600/720):"-").padStart(3)} JPH`,34,y);if(p&&(p.act>0||st.round>=r)){hc.fillStyle="#9fb0bd";hc.fillText(`แผน ${String(Math.round(p.plan)).padStart(3)}`,300,y);hc.fillStyle=p.act>=p.plan*(cur?((st.t%720)/720):1)-.5?"#38e070":"#ff6a5c";hc.fillText(`ทำได้ ${String(p.act).padStart(3)}`,450,y)}}h.t.needsUpdate=true;
      const d=boards.demand,dc=d.c;dc.fillStyle="#fff";dc.fillRect(0,0,640,320);dc.fillStyle="#1f3f8f";dc.fillRect(0,0,640,54);dc.font="700 28px 'IBM Plex Sans Thai',system-ui,sans-serif";dc.textAlign="center";dc.fillStyle="#fff";dc.fillText("ความต้องการลูกค้า",320,27);dc.fillStyle="#1b222a";dc.font="700 72px 'IBM Plex Sans Thai',system-ui,sans-serif";dc.fillText(`${st.jph} ด้าม/ชม.`,320,150);dc.fillStyle="#5d666e";dc.font="600 30px 'IBM Plex Sans Thai',system-ui,sans-serif";dc.fillText(`Takt ${(3600/st.jph).toFixed(1)} วินาที · รอบ ${st.round+1}`,320,220);dc.fillStyle="#e4e8eb";dc.fillRect(60,260,520,22);dc.fillStyle="#2356a3";dc.fillRect(60,260,520*((st.t%720)/720),22);d.t.needsUpdate=true}
    function update(dtp){if(disposed)return;const S=st.S;const s2=layoutSignature();if(s2!==sig)rebuild();const motion=reduced?0:Math.min(.1,dtp);
      boardT-=dtp;if(boardT<=0){boardT=1;drawBoards()}
      const tk=3600/st.jph,t=st.t/6;
      S.forEach((x,i)=>{const g=stGroups[i],u=g.userData,ws=st.workers.filter(w=>w.st===i&&!w.absent);
        // workers
        const ids=ws.map(w=>w.id).join(",");if(u.wk!==ids){u.workers.forEach(k=>g.remove(k));u.workers=ws.map((w,k)=>{let m=wkGroups.get(w.id);if(!m){m=worker(w);wkGroups.set(w.id,m)}m.position.set((k-(ws.length-1)/2)*.6,0,-.72);m.rotation.y=0;g.add(m);return m});u.wk=ids}
        ws.forEach((w,k)=>{const m=u.workers[k];if(!m)return;const busy=!!w.job&&!(x.broken||x.repair>0);m.userData.ph+=motion*(busy?7:1.5);const a=m.userData.arms;const s=Math.sin(m.userData.ph);a[0].rotation.x=-.9+(busy?s*.35:0);a[1].rotation.x=-.9+(busy?-s*.3:.05);a[0].rotation.z=.15+(busy?Math.cos(m.userData.ph*.7)*.1:0);a[1].rotation.z=-.15;m.position.y=busy?Math.abs(Math.sin(m.userData.ph*.5))*.01:0});
        if(u.equipment.ram)u.equipment.ram.position.y=1.25-(ws.some(w=>w.job)&&!x.broken&&!x.repair&&!reduced?(Math.sin(st.t*.7)+1)*.027:0);
        // andon
        const sk=ws.reduce((a,w)=>a+w.sk,0),ct=sk?x.wc/sk:Infinity,state=x.broken||x.dev?0:(x.repair>0||!ws.length?1:2),blink=state===0?(Math.floor(t*2)%2===0):true;
        u.lights.forEach((l,j)=>{l.material.emissiveIntensity=j===state&&blink?2.2:0});u.glow.position.y=2.45-state*.14;u.glow.material.color.set(["#ff3b2f","#f0b429","#2fbf6b"][state]);u.glow.material.opacity=blink?(state===0?.75:state===1?.45:.3):0;
        setSprite(u.ct,(st.buf[i].length?`WIP ${st.buf[i].length} · `:"")+(isFinite(ct)?`CT ${ct.toFixed(1)}s`:"CT -"));u.ct.material.map.needsUpdate=true;u.ct.userData.o.bg=isFinite(ct)&&ct<=tk?"rgba(29,145,82,.95)":"rgba(207,58,46,.95)";
        const m=x.broken?"🔧 เครื่องอัดเสีย แตะเรียกช่าง":x.repair>0?`กำลังซ่อม ${Math.ceil(x.repair/60)} นาที`:(x.dev&&st.t>=x.devSeen)?"⚠️ ไม่ทำตาม OIS แตะยืนยัน":!ws.length?"ไม่มีคน":"";
        if(m){u.msg.visible=true;setSprite(u.msg,m)}else u.msg.visible=false;
        u.pens.forEach((p,k)=>{p.visible=k<st.buf[i].length;if(p.visible){const ink=(st.buf[i][k]||{}).ink||INKS[0];p.children[1].material.color.set(ink)}})});
      // flow animation
      (st.flow||[]).forEach(f=>{if(f.id>lastFlow){lastFlow=f.id;const from=f.from<0?rp:f.from>=S.length?sp:cellXZ(S[f.from].cell),to=f.to>=S.length?sp:cellXZ(S[f.to].cell);const p=pen(f.ink);scene.add(p);flyers.push({m:p,a:from,b:to,t:0})}});
      for(let k=flyers.length-1;k>=0;k--){const f=flyers[k];f.t+=dtp*1.6;if(f.t>=1){scene.remove(f.m);disposeOwned(f.m);flyers.splice(k,1);continue}const e=f.t;f.m.position.set(f.a[0]+(f.b[0]-f.a[0])*e,.93,f.a[1]+(f.b[1]-f.a[1])*e+.9);f.m.rotation.y=Math.atan2(f.b[1]-f.a[1],f.b[0]-f.a[0])}
      // shipping cartons & rack label
      const n=st.buf[S.length]?st.buf[S.length].length+Math.min(9,Math.floor(st.shipped/12)):0;sh.userData.cartons.forEach((c,k)=>c.visible=k<n);
      setSprite(rk.userData.label,st.noMat?"คลังชิ้นส่วน · เงินไม่พอซื้อ!":"คลังชิ้นส่วน");
      // idle workers near the rack
      const idle=st.workers.filter(w=>w.st<0&&!w.absent);idle.forEach((w,k)=>{let m=wkGroups.get(w.id);if(!m){m=worker(w);wkGroups.set(w.id,m)}if(m.parent!==scene){if(m.parent)m.parent.remove(m);scene.add(m)}m.position.set(rp[0]+1.2+k*.7,0,rp[1]+2.2);m.rotation.y=Math.PI;m.userData.arms[0].rotation.x=-.1;m.userData.arms[1].rotation.x=-.1});
      st.workers.filter(w=>w.absent).forEach(w=>{const m=wkGroups.get(w.id);if(m&&m.parent)m.parent.remove(m)});
      const lf=Math.min(1.7,Math.max(.8,cam.position.distanceTo(new THREE.Vector3(ctl.tx,1,ctl.tz))/9));scene.traverse(o=>{if(o.isSprite&&o.userData.text!=null){const k=o.userData.o.k||.011,m=o.material.map.image;o.scale.set(m.width/2*k*lf,m.height/2*k*lf,1)}});
      if(ctl.me&&!reduced){ctl.me.rotation.y=-.35+Math.sin(performance.now()/1400)*.25}
      R.render(scene,cam)}
    // the player's own character (outfit from the Equipment screen) stands at the line as line leader
    if(window.EQUIP){try{const lk=EQUIP.look3d(),me=worker({look:{g:lk.body.g,skin:lk.body.skin,hair:lk.body.hair},sk:1,eq:lk});if(lk.vest){const vm=mat(lk.vest,{roughness:.6});[-1,1].forEach(k=>me.add(box(.16,.42,.03,vm,k*.11,1.08,.2)))}if(lk.gloves&&!PACK){me.userData.arms.forEach(a=>a.children[1]?.material?.color.set(lk.gloves))}
      const tag=sprite("คุณ · หัวหน้าไลน์",{bg:"rgba(232,185,35,.95)",fg:"#1b222a",fs:26,k:.005});tag.position.y=2.05;me.add(tag);me.position.set(rp[0]+1.3,0,rp[1]+1.6);me.rotation.y=-.35;me.userData.arms[0].rotation.x=-.35;me.userData.arms[1].rotation.x=-1.2;scene.add(me);ctl.me=me}catch(e){console.warn(e)}}
    rebuild();update(0);
    return {update,resize,focus(i){const x=st.S[i];ctl.selected=x?i:-1;ctl.zoom=1;if(x){const p=cellXZ(x.cell);ctl.tx=p[0];ctl.tz=p[1]-.2;ctl.pol=.48;ctl.az=.18;}else{const ps=st.S.map(x=>cellXZ(x.cell));ctl.tx=ps.reduce((a,p)=>a+p[0],0)/Math.max(1,ps.length);ctl.tz=ps.reduce((a,p)=>a+p[1],0)/Math.max(1,ps.length);ctl.pol=.55;ctl.az=.25;}frame();place();update(0);},zoom(delta){ctl.zoom=Math.min(1.8,Math.max(.25,ctl.zoom+delta));place();update(0);},dispose(){if(disposed)return;disposed=true;ro.disconnect();wkGroups.forEach(w=>{w.removeFromParent();disposeOwned(w)});if(ctl.me){ctl.me.removeFromParent();disposeOwned(ctl.me)}disposeOwned(scene);envTarget.dispose();R.dispose();R.domElement.remove()},el:R.domElement}}
  return {mount,load};
})();
export const mount=PEN3D.mount;
export const load=PEN3D.load;
