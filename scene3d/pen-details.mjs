// Visual-only parts for the original pen factory. No production state is mutated.
import * as THREE from '../three.module.min.js';
import {instance,applyLod,rigidSkin,batchStatic} from './assets.mjs';

export function assetWorker(pack,w){
 const root=instance(pack,'worker');if(!root)return null;
 applyLod(root,pack.tier?.lod??0);
 const owned=new Map(),E=w.eq||{},L=w.look||{};
 const colors={M_UniformShirt:E.shirt||L.shirt,M_UniformPants:E.pants,M_Helmet:E.helmet||(w.sk>=.95?'#eef1f4':null),M_Skin:L.skin,M_Hair:L.hair,M_Gloves:E.gloves};
 root.traverse(o=>{if(!o.isMesh)return;const c=colors[o.material.name];if(c){if(!owned.has(o.material)){const m=o.material.clone();m.userData.own=true;m.color.set(c);owned.set(o.material,m);}o.material=owned.get(o.material);}});
 const arms=['upperarm_L','upperarm_R'].map(n=>root.getObjectByName(n));
 if(arms.some(a=>!a))return null;
 const skin=rigidSkin(root);
 root.userData={...root.userData,arms,ph:0,skin};return root;
}

export function addPenEquipment(parent,stn){
 const root=new THREE.Group();root.name='PenProcessEquipment';parent.add(root);
 const metal=new THREE.MeshStandardMaterial({color:'#aebac3',metalness:.88,roughness:.28});
 const graphite=new THREE.MeshStandardMaterial({color:'#253441',metalness:.48,roughness:.4});
 const blue=new THREE.MeshStandardMaterial({color:'#326785',metalness:.28,roughness:.45});
 const cream=new THREE.MeshStandardMaterial({color:'#e0ded6',metalness:.15,roughness:.6});
 const orange=new THREE.MeshStandardMaterial({color:'#ed9a32',roughness:.6});
 function box(w,h,d,m,x,y,z){const a=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;root.add(a);return a;}
 function cyl(r,h,m,x,y,z){const a=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,16),m);a.position.set(x,y,z);a.castShadow=true;root.add(a);return a;}
 // Extruded aluminium workstation with cross braces, drawer, levelling feet.
 for(const x of [-.78,.78])for(const z of [-.34,.34]){box(.045,.77,.045,metal,x,.44,z);cyl(.05,.045,graphite,x,.035,z);box(.006,.64,.048,graphite,x,.44,z);}
 for(const z of [-.34,.34])box(1.6,.055,.045,metal,0,.72,z);
 box(.54,.22,.5,cream,.33,.65,.02);box(.32,.018,.035,metal,.33,.67,.29);
 // Hose and tool balancer, plus a small digital OIS terminal.
 box(.045,1.2,.045,metal,.75,1.47,-.32);box(.48,.04,.04,metal,.54,2.07,-.32);
 const hose=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(.36,2.04,-.32),new THREE.Vector3(.43,1.73,-.24),new THREE.Vector3(.27,1.4,-.14)]),16,.008,6,false),graphite);root.add(hose);
 box(.05,.18,.04,blue,.27,1.3,-.14);
 box(.22,.16,.025,graphite,.69,1.19,-.31);const screen=box(.19,.12,.008,new THREE.MeshStandardMaterial({color:'#68b7c4',emissive:'#285862',emissiveIntensity:.4}),.69,1.19,-.294);screen.name='PenOIS';
 // Locator plate and indexed nests keep small pen components visible close up.
 box(.38,.022,.22,metal,0,.906,.02);for(let n=0;n<5;n++){box(.014,.009,.16,graphite,-.14+n*.07,.922,.02);}
 let ram=null;
 if(stn.has?.t9){
  box(.39,.035,.31,graphite,-.48,.9,-.13);box(.07,.51,.065,blue,-.62,1.15,-.23);box(.36,.09,.15,blue,-.49,1.41,-.17);
  cyl(.06,.21,metal,-.43,1.54,-.12);ram=cyl(.019,.21,metal,-.43,1.25,-.12);ram.userData.dynamic=true;
  box(.2,.018,.11,metal,-.43,.94,-.12);box(.1,.025,.04,orange,-.56,.94,.08);
 }
 if(stn.has?.t10){box(.29,.008,.21,cream,.27,.923,.17);for(let n=0;n<4;n++)box(.16,.002,.002,blue,.27,.929,.11+n*.025);}
 if(stn.has?.t11){box(.3,.012,.21,cream,-.5,.907,.16);box(.3,.08,.012,cream,-.5,.949,.055);box(.012,.08,.21,cream,-.65,.949,.16);}
 // Batch the static frame but leave the press ram animated independently.
 const batch=batchStatic(root);
 return {root,ram,batch};
}

export function disposeOwned(root){
 const geos=new Set(),mats=new Set(),textures=new Set();
 root.traverse(o=>{if(o.userData?.skin){o.userData.skin.dispose();o.userData.skin=null;}if(o.geometry&&(!o.userData.shared||o.userData.batch))geos.add(o.geometry);for(const m of [].concat(o.material||[])){if(!o.userData.shared||m.userData?.own){mats.add(m);for(const k of ['map','normalMap','roughnessMap','metalnessMap','aoMap'])if(m[k]&&!o.userData.shared)textures.add(m[k]);}}});
 geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
}
