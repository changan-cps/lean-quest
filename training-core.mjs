// Pure, deterministic training model. All process values are fictional teaching data.
export const FACTORIES = [
  {id:'weld',name:'เชื่อมตัวถัง',en:'Welding',color:'#e68b36',product:'ตัวถัง',stations:['เตรียมชิ้นส่วน','จัดจิ๊ก / จับยึด','เชื่อมตัวถัง','ตรวจแนวเชื่อม'],tasks:['ตรวจ Part ตามรุ่น','จัดชุดชิ้นส่วน','วางแผงตัวถัง','จับยึดตามมาตรฐาน','เชื่อมจุดหลัก','เชื่อมจุดเสริม','ตรวจจุดเชื่อม','บันทึกผลตรวจ'],times:[14,15,22,35,24,23,19,20],fixed:[4,5,6],issue:'ชิ้นส่วนต่างรุ่นปะปนที่จุดเตรียม',standard:'แยกชิ้นส่วนตามรุ่นและมีป้ายตำแหน่งก่อนนำเข้าจิ๊ก',waste:'Defect',fix:'แยกช่องและติดป้ายรุ่น',why:'การปะปนทำให้เลือกชิ้นส่วนผิดและต้องแก้ไขงานก่อนส่งต่อ'},
  {id:'paint',name:'พ่นสี',en:'Painting',color:'#a78bfa',product:'ตัวถังพ่นสี',stations:['เตรียมผิว','เตรียมสี / Masking','พ่นและอบจำลอง','ตรวจผิว'],tasks:['ตรวจผิวก่อนพ่น','ทำความสะอาด','จัดชุดสี','Masking ตามรุ่น','พ่นสีตามมาตรฐาน','อบตามเวลาที่กำหนด','ตรวจผิวสำเร็จ','จัดเส้นทางงานแก้ไข'],times:[13,16,21,34,25,22,21,18],fixed:[4,5,6],issue:'ภาชนะสีไม่มีการระบุรุ่นและสถานะ',standard:'ภาชนะสีต้องระบุชนิด รุ่น และสถานะที่ตรวจสอบได้',waste:'Defect',fix:'ระบุสีและแยกสถานะ',why:'การระบุสีและสถานะช่วยป้องกันใช้วัสดุผิดและลดงานแก้ไข'},
  {id:'assembly',name:'ประกอบรถยนต์',en:'Assembly',color:'#4c9fff',product:'รถยนต์',stations:['เตรียมชุดประกอบ','ประกอบชิ้นส่วน','ขันและยืนยัน','ตรวจส่งต่อ'],tasks:['ตรวจรุ่น / เตรียม Part','จัดชุดเครื่องมือ','ติดตั้งขายึด','ประกอบชิ้นส่วน','ขันตามมาตรฐาน','ยืนยันผลการขัน','ตรวจความครบถ้วน','บันทึก Traceability'],times:[12,15,23,35,24,23,21,18],fixed:[4,5],issue:'กล่อง Part วางนอกตำแหน่งและไม่มีป้ายรุ่น',standard:'Part ต้องอยู่ในตำแหน่งกำหนด มีป้ายรุ่น และเข้าถึงโดยไม่กีดขวางทางเดิน',waste:'Motion',fix:'จัดตำแหน่งและป้าย Part',why:'ตำแหน่งที่ชัดเจนช่วยลดการค้นหาและป้องกันการหยิบผิด'},
  {id:'quality',name:'ตรวจสอบคุณภาพ',en:'Quality Inspection',color:'#49c9a9',product:'ชิ้นงานที่ตรวจแล้ว',stations:['รับและระบุงาน','ตรวจตามรายการ','ทดสอบยืนยัน','ตัดสินและบันทึก'],tasks:['อ่านหมายเลขงาน','ตรวจเอกสารรุ่น','ตรวจรายการ A','ตรวจรายการ B','ทดสอบตามมาตรฐาน','ตรวจผลทดสอบ','แยก OK / NG','บันทึกและส่งต่อ'],times:[12,16,22,34,23,22,21,19],fixed:[4,5,6],issue:'งาน OK กับงานรอตรวจอยู่ในพื้นที่เดียวกัน',standard:'ต้องแยกสถานะรอตรวจ OK และ NG พร้อมการบ่งชี้ที่ชัดเจน',waste:'Defect',fix:'แยกพื้นที่ตามสถานะ',why:'การแยกสถานะป้องกันการส่งชิ้นงานที่ยังไม่ผ่านการตรวจ'},
  {id:'battery',name:'ผลิตแบตเตอรี่',en:'Battery Module / Pack',color:'#69b9ee',product:'แพ็กจำลอง',stations:['เตรียม Module','ประกอบ Pack','ยืนยันจุดต่อ','ตรวจและบันทึก'],tasks:['ตรวจรหัส Module','เตรียมชุดอุปกรณ์','วาง Module ตามลำดับ','ติดตั้งชิ้นส่วนยึด','ต่อจุดเชื่อมต่อตาม WI','ยืนยันผลจุดต่อ','ทดสอบตามมาตรฐาน','บันทึก Serial ของ Pack'],times:[15,15,21,34,25,23,20,20],fixed:[4,5,6],issue:'รหัส Module กับช่องจัดเก็บไม่ตรงกัน',standard:'ตรวจรหัสและลำดับ Module ให้ตรงกับมาตรฐานก่อนประกอบ',waste:'Defect',fix:'ตรวจรหัสและจัดช่องใหม่',why:'การระบุและยืนยันรหัสช่วยป้องกันประกอบผิดและรักษาการตรวจย้อนกลับ'},
  {id:'engine',name:'ผลิตเครื่องยนต์',en:'Engine Manufacturing',color:'#fbbe62',product:'เครื่องยนต์',stations:['เตรียมชิ้นส่วน','ประกอบชุดเครื่อง','ขันและทดสอบ','ตรวจส่งต่อ'],tasks:['ตรวจรหัสชิ้นส่วน','จัดชุดประกอบ','ประกอบชิ้นส่วนหลัก','ประกอบชุดเสริม','ขันตามมาตรฐาน','ทดสอบตาม WI','ยืนยันผลตรวจ','บันทึกหมายเลขเครื่อง'],times:[14,15,22,35,23,24,18,21],fixed:[4,5,6],issue:'เครื่องมือไม่มีสถานะตรวจสอบที่ชัดเจน',standard:'เครื่องมือที่ใช้ต้องมีสถานะพร้อมใช้งานและตรวจสอบตามมาตรฐาน',waste:'Defect',fix:'ยืนยันสถานะเครื่องมือ',why:'การยืนยันเครื่องมือช่วยป้องกันข้อผิดพลาดจากอุปกรณ์ที่ไม่พร้อม'}
];
export const factory = id => FACTORIES.find(f=>f.id===id)||FACTORIES[2];
export const TASK_MODES = [
  {id:'production',name:'ทดลองผลิต',desc:'ปรับแผนแล้วดู CT, WIP และงานดีจริงจากแบบจำลอง'},
  {id:'balance',name:'Line Balance',desc:'กระจาย Element ภายใต้ลำดับงานและเครื่องมือประจำสถานี'},
  {id:'parts',name:'จัด Part / 5ส',desc:'ทดลองตำแหน่งหยิบและพื้นที่เติมของ'},
  {id:'gemba',name:'ค้นหาความผิดปกติ',desc:'ตรวจมาตรฐาน ระบุหลักฐาน แล้วเลือกวิธีแก้'}
];
export const ROLES=['พนักงานใหม่','พนักงานชำนาญ','หัวหน้าทีม','หัวหน้าพื้นที่','Lean Specialist','CPS Master'];
export const ITEMS=[
 {id:'navy',name:'ชุดน้ำเงิน',color:'#2356a3',slot:'suit',price:0,currency:'coins'},
 {id:'teal',name:'ชุดเขียวเข้ม',color:'#087f80',slot:'suit',price:120,currency:'coins'},
 {id:'graphite',name:'ชุดเทาเข้ม',color:'#434e62',slot:'suit',price:180,currency:'coins'},
 {id:'orange',name:'ชุดผู้ประสานงาน',color:'#ce6736',slot:'suit',price:240,currency:'coins'},
 {id:'white',name:'หมวกขาว',color:'#e7ecf2',slot:'helmet',price:0,currency:'coins'},
 {id:'yellow',name:'หมวกเหลือง',color:'#ffd04b',slot:'helmet',price:90,currency:'coins'},
 {id:'blue',name:'หมวกฟ้า',color:'#53c6ef',slot:'helmet',price:2,currency:'gems'}
];
export const newProfile=()=>({version:1,name:'',team:'',xp:0,coins:0,gems:0,owned:['navy','white'],suit:'navy',helmet:'white',completed:{}});
export function repairProfile(raw){const p=newProfile();if(!raw||typeof raw!=='object')return p;for(const k of ['name','team'])p[k]=String(raw[k]||'').slice(0,30);for(const k of ['xp','coins','gems'])p[k]=Math.max(0,Math.min(1e7,Number(raw[k])||0));p.owned=[...new Set([...p.owned,...(Array.isArray(raw.owned)?raw.owned:[]).filter(x=>ITEMS.some(i=>i.id===x))])];for(const k of ['suit','helmet'])if(p.owned.includes(raw[k])&&ITEMS.find(i=>i.id===raw[k])?.slot===k)p[k]=raw[k];if(raw.completed&&typeof raw.completed==='object'&&!Array.isArray(raw.completed))for(const [k,v]of Object.entries(raw.completed))if(/^(weld|paint|assembly|quality|battery|engine)-[1-6]$/.test(k)&&Number.isFinite(v))p.completed[k]=Math.max(0,Math.min(100,v));return p;}
export function career(p){const badges=Object.keys(p.completed).length;return ROLES[Math.min(5,Math.floor(badges/6))];}
export function buy(p,id){const item=ITEMS.find(i=>i.id===id);if(!item)return false;if(!p.owned.includes(id)){if(p[item.currency]<item.price)return false;p[item.currency]-=item.price;p.owned.push(id);}p[item.slot]=id;return true;}
export function reward(p,s){const r=results(s);if(!r.pass)return {awarded:false,...r};const key=s.factory+'-'+s.level;const first=!(key in p.completed);p.completed[key]=Math.max(p.completed[key]||0,r.score);if(first){p.xp+=100;p.coins+=80;p.gems+=s.level===6?3:1;}return {awarded:first,...r};}
export function newState(id='assembly',level=1,seed=73){const f=factory(id);return {version:1,factory:f.id,level:Math.max(1,Math.min(6,Math.floor(level)||1)),seed,mode:'production',assign:[0,0,1,1,2,2,3,3],layout:['far','far','side','side'],sorted:[false,false,false,false],poka:[false,false,false,false],maintained:[false,false,false,false],budget:1200,issueFixed:false,evidence:false,diagnosed:false,log:[],lastError:'',...freshRun()};}
function freshRun(){return {time:0,duration:900,status:'ready',released:0,completed:0,good:0,rework:0,queues:[0,0,0,0],busy:[0,0,0,0],active:[null,null,null,null],blocked:[null,null,null,null],busyTime:[0,0,0,0],waitTime:[0,0,0,0],downTime:[0,0,0,0],maxWip:0,wipArea:0,previous:null};}
export const takt=s=>s.level>=5?54:60;
export function cycleTimes(s){const f=factory(s.factory);return f.stations.map((_,j)=>f.times.reduce((a,t,i)=>a+(s.assign[i]===j?t:0),0)+(s.layout[j]==='near'?3:s.layout[j]==='side'?7:15)+(s.sorted[j]?0:7)+(s.level>=5?3:0));}
export function metrics(s){const ct=cycleTimes(s),max=Math.max(...ct);return {ct,bottleneck:ct.indexOf(max),balance:Math.round(ct.reduce((a,b)=>a+b,0)/(ct.length*max)*100),capacity:Math.floor(3600/max),output:s.good,wip:s.queues.reduce((a,b)=>a+b,0)+s.active.filter(x=>x!==null).length+s.blocked.filter(x=>x!==null).length,fpy:s.completed?Math.round(s.good/s.completed*100):0,avgWip:s.time?+(s.wipArea/s.time).toFixed(1):0};}
function record(s,text){s.log.push({time:s.time,text});if(s.log.length>80)s.log.shift();}
function resetTrial(s){const prev=s.time>0?{...metrics(s),time:s.time,completed:s.completed}:s.previous;Object.assign(s,freshRun());s.previous=prev;}
export function act(s,a){s.lastError='';const fail=t=>(s.lastError=t,false);if(!a||typeof a!=='object')return fail('คำสั่งไม่ถูกต้อง');
 if(a.type==='pause'){if(s.status==='running')s.status='paused';return true;}
 if(a.type==='run'){if(s.status==='done')resetTrial(s);s.status='running';return true;}
 if(a.type==='observe'){s.evidence=true;record(s,'เปิดมาตรฐานและตรวจหลักฐาน');return true;}
 if(a.type==='diagnose'){if(!s.evidence)return fail('เปิดมาตรฐานและดูหลักฐานก่อน');if(a.answer!==factory(s.factory).waste)return fail('ลองพิจารณาความต่างจากมาตรฐานและผลที่เกิดขึ้นอีกครั้ง');s.diagnosed=true;record(s,'ระบุปัญหาตรงกับหลักฐาน');return true;}
 if(s.status==='running')return fail('พักการทดลองก่อนปรับแผน');
 let price=0;const j=Number(a.station);if(['layout','sort','poka','maintain'].includes(a.type)&&(!Number.isInteger(j)||j<0||j>3))return fail('เลือกสถานีให้ถูกต้อง');
 if(a.type==='move'){const i=Number(a.task),to=Number(a.to);if(!Number.isInteger(i)||i<0||i>7||!Number.isInteger(to)||to<0||to>3)return fail('ตำแหน่งไม่ถูกต้อง');if(factory(s.factory).fixed.includes(i))return fail('Element นี้ใช้เครื่องมือประจำสถานี ย้ายไม่ได้');if((i>0&&s.assign[i-1]>to)||(i<7&&s.assign[i+1]<to))return fail('ลำดับงานก่อน–หลังไม่อนุญาตให้ย้ายไปสถานีนี้');if(to===s.assign[i])return true;resetTrial(s);s.assign[i]=to;record(s,`ย้าย ${factory(s.factory).tasks[i]} ไปสถานี ${to+1}`);return true;}
 if(a.type==='layout'){if(!['near','side','far'].includes(a.position))return fail('ตำแหน่งไม่ถูกต้อง');if(s.layout[j]===a.position)return true;price=60;}
 else if(a.type==='sort'){if(s.sorted[j])return true;price=40;}
 else if(a.type==='poka'){if(s.poka[j])return true;price=100;}
 else if(a.type==='maintain'){if(s.maintained[j])return true;price=80;}
 else if(a.type==='fix'){if(!s.diagnosed)return fail('ตรวจหลักฐานและระบุปัญหาก่อน');if(s.issueFixed)return true;price=80;}
 else return fail('คำสั่งนี้ไม่รองรับ');
 if(s.budget<price)return fail('งบโรงงานไม่พอ');resetTrial(s);s.budget-=price;
 if(a.type==='layout')s.layout[j]=a.position;
 if(a.type==='sort')s.sorted[j]=true;
 if(a.type==='poka')s.poka[j]=true;
 if(a.type==='maintain')s.maintained[j]=true;
 if(a.type==='fix')s.issueFixed=true;
 record(s,a.type==='fix'?'แก้ไขความผิดปกติตามมาตรฐาน':`สถานี ${j+1}: ${a.type==='layout'?'จัดตำแหน่ง Part '+a.position:a.type==='sort'?'สะสางและกำหนดตำแหน่ง':a.type==='poka'?'เพิ่มการยืนยันชิ้นส่วน':'ตรวจความพร้อมเครื่องมือ'}`);return true;
}
// Blocking-after-service with finite buffers. A blocked workpiece remains in its station.
export function step(s,seconds=1){if(s.status!=='running')return s;const ct=cycleTimes(s);for(let t=0;t<Math.max(0,Math.min(900,Math.floor(seconds)));t++){if(s.time>=s.duration){s.status='done';break;}s.time++;
 if((s.time-1)%takt(s)===0){s.queues[0]++;s.released++;}
 for(let j=3;j>=0;j--){if(s.blocked[j]!==null){if(j===3||s.queues[j+1]<2){const unit=s.blocked[j];s.blocked[j]=null;if(j<3)s.queues[j+1]++;else{ s.completed++;const bad=[7,11,13,17].some((n,k)=>(s.completed+s.seed)%n===0&&!s.poka[k])||((s.completed+s.seed)%5===0&&!s.issueFixed);if(bad)s.rework++;else s.good++;} }else{s.waitTime[j]++;continue;}}
 const down=s.level>=4&&!s.maintained[j]&&s.time>=240+j*20&&s.time<270+j*20;
 if(down){s.downTime[j]++;continue;}
 if(s.active[j]!==null){s.busy[j]--;s.busyTime[j]++;if(s.busy[j]<=0){s.blocked[j]=s.active[j];s.active[j]=null;}}
 if(s.active[j]===null&&s.blocked[j]===null&&s.queues[j]>0){s.queues[j]--;s.active[j]=s.time;s.busy[j]=ct[j];}
 }
 const wip=metrics(s).wip;s.wipArea+=wip;s.maxWip=Math.max(s.maxWip,wip);if(s.time===s.duration){s.status='done';record(s,'จบการทดลอง 15 นาทีจำลอง');}}
 return s;}
export function results(s){const m=metrics(s);const threshold=s.level>=5?10:9;const flow=Math.min(1,s.good/threshold);const quality=s.completed?s.good/s.completed:0;const score=Math.round(flow*45+quality*20+(s.issueFixed?15:0)+m.balance*.2);const pass=s.time>=s.duration&&s.good>=threshold&&quality>=.85&&s.issueFixed&&(s.level<2||s.sorted.every(Boolean))&&(s.level<3||Math.max(...m.ct)<=takt(s)+5)&&(s.level<6||s.budget>=0);return {score,pass,target:threshold,...m};}
export function baseline(id,level){const s=newState(id,level);act(s,{type:'run'});step(s,900);return metrics(s);}
export function validateState(s){return !!s&&s.version===1&&FACTORIES.some(f=>f.id===s.factory)&&Array.isArray(s.assign)&&s.assign.length===8&&s.assign.every((v,i)=>Number.isInteger(v)&&v>=0&&v<4&&(!i||s.assign[i-1]<=v))&&['layout','sorted','poka','maintained','queues','busy','active','blocked','busyTime','waitTime','downTime'].every(k=>Array.isArray(s[k])&&s[k].length===4)&&Number.isFinite(s.time)&&s.time>=0&&s.time<=900&&Number.isFinite(s.budget)&&s.budget>=0&&s.budget<=1200&&Array.isArray(s.log)&&s.log.length<=80&&['ready','running','paused','done'].includes(s.status)&&Number.isInteger(s.level)&&s.level>=1&&s.level<=6;}
