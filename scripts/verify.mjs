import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker from '../worker/index.js';
import {createDB} from './local-db.mjs';
import {today,datePlus,quote,validateDates} from '../src/data.js';
const DB=createDB();let owner='tester-one';
async function call(path,method='GET',body=null,auth=true,origin='https://audrea.test'){const req=new Request('https://audrea.test'+path,{method,headers:{...(auth?{'oai-authenticated-user-id':owner,'oai-authenticated-user-email':'demo@example.com'}:{}),'Content-Type':'application/json',Origin:origin},...(body?{body:JSON.stringify(body)}:{})});const res=await worker.fetch(req,{DB,LOCAL_PREVIEW:true});return {status:res.status,data:await res.json()};}
const a=today(),b=datePlus(a,2),details={room:'garden',arrival:a,departure:b,guests:2,name:'Test Guest',email:'test@example.com',phone:'09000000000',notes:'Fictional verification reservation',payment:'Simulated GCash'};
assert.equal((await call('/api/workspace','GET',null,false)).status,401);
assert.equal((await call('/api/bookings','POST',details,true,'https://other.example')).status,403);
assert.throws(()=>validateDates('2026-02-30','2026-03-02'));
assert.throws(()=>validateDates(datePlus(a,-1),b));
assert.throws(()=>validateDates(a,datePlus(a,31)));
assert.equal(quote('garden','2027-01-01','2027-01-03').total,10800);
let r=await call(`/api/availability?arrival=${a}&departure=${b}&guests=2`);assert.equal(r.data.rooms[0].available,6);
r=await call('/api/bookings','POST',{...details,guests:3});assert.equal(r.status,409);
r=await call('/api/bookings','POST',details);assert.equal(r.status,201,JSON.stringify(r.data));const id=r.data.id,total=r.data.total;assert.equal(r.data.paid,Math.ceil(total*.5));
assert.equal((await call(`/api/availability?arrival=${a}&departure=${b}&guests=2`)).data.rooms[0].available,5);
owner='tester-two';assert.equal((await call('/api/workspace')).data.bookings.length,0);assert.equal((await call('/api/bookings/'+id,'PATCH',{action:'cancel'})).status,404);owner='tester-one';
assert.equal((await call('/api/bookings/'+id,'PATCH',{action:'checkout'})).status,400);
assert.equal((await call('/api/bookings/'+id,'PATCH',{action:'checkin'})).status,200);
assert.equal((await call('/api/bookings/'+id,'PATCH',{action:'checkout'})).status,400);
assert.equal((await call('/api/bookings/'+id,'PATCH',{action:'payment',amount:total})).status,400);
assert.equal((await call('/api/bookings/'+id,'PATCH',{action:'payment',amount:total-Math.ceil(total*.5)})).status,200);
assert.equal((await call('/api/bookings/'+id,'PATCH',{action:'checkout'})).status,200);
const next=await call('/api/bookings','POST',{...details,name:'Cancel Guest',arrival:datePlus(a,4),departure:datePlus(a,6)});assert.equal(next.status,201);assert.equal((await call('/api/bookings/'+next.data.id,'PATCH',{action:'cancel'})).status,200);assert.equal((await call(`/api/availability?arrival=${datePlus(a,4)}&departure=${datePlus(a,6)}&guests=2`)).data.rooms[0].available,6);
assert.equal((await call('/api/rooms','PATCH',{room:'garden',unit:1,state:'Maintenance'})).status,200);assert.equal((await call(`/api/availability?arrival=${datePlus(a,8)}&departure=${datePlus(a,10)}&guests=2`)).data.rooms[0].available,5);
assert.equal((await call('/api/profile','PATCH',{name:'Test Manager',notifications:false})).status,200);assert.equal((await call('/api/workspace')).data.profile.name,'Test Manager');
// Fill the remaining five units and verify sold-out inventory.
for(let i=0;i<5;i++)assert.equal((await call('/api/bookings','POST',{...details,arrival:datePlus(a,8),departure:datePlus(a,10)})).status,201);
assert.equal((await call('/api/bookings','POST',{...details,arrival:datePlus(a,8),departure:datePlus(a,10)})).status,409);
for(const file of['hero.jpg','garden.jpg','suite.jpg','villa.jpg']){const img=await readFile(new URL('../public/images/'+file,import.meta.url));assert(img.length>10000,'Missing or empty image: '+file);}
DB.close();console.log('PASS: authentication, workspace authorization, origin protection, date rules, weekend rates, capacity, persistence, inventory, sold-out prevention, cancellation, check-in/out, payments, profile, maintenance and image assets.');
