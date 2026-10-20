import {rooms,quote,validateDates,nights,today} from '../src/data.js';
const ASSETS=/*__ASSET_BUNDLE__*/{};
const json=(v,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const safeText=(s,max=200)=>String(s??'').trim().slice(0,max);
function identity(req){const id=req.headers.get('oai-authenticated-user-id'),email=req.headers.get('oai-authenticated-user-email');return id&&email?{id,email}:null;}
async function availability(db,owner,a,b,count){const taken=(await db.prepare('SELECT room,unit FROM occupied_nights WHERE owner=? AND day>=? AND day<? GROUP BY room,unit').bind(owner,a,b).all()).results;const blocked=(await db.prepare("SELECT room,unit FROM room_state WHERE owner=? AND state='Maintenance'").bind(owner).all()).results;return rooms.map(r=>{const units=Array.from({length:r.units},(_,i)=>i+1).filter(u=>![...taken,...blocked].some(t=>t.room===r.id&&t.unit===u));return {...r,available:count<=r.capacity?units.length:0,units:count<=r.capacity?units:[],quote:quote(r.id,a,b)};});}
function sameOrigin(req){const origin=req.headers.get('origin');return !origin||origin===new URL(req.url).origin;}
async function api(req,env,url){
 const user=identity(req);if(!user)return json({error:'Sign in to your private resort workspace to continue.',signIn:'/signin-with-chatgpt?return_to=%2Fadmin'},401);
 if(!env.DB)return json({error:'The reservation database is not connected yet.'},503);
 if(req.method!=='GET'&&!sameOrigin(req))return json({error:'This action must be submitted from Audrea Cove.'},403);
 const db=env.DB,owner=user.id,p=url.pathname;
 if(req.method==='GET'&&p==='/api/availability'){const a=url.searchParams.get('arrival'),b=url.searchParams.get('departure'),g=Number(url.searchParams.get('guests')||2);validateDates(a,b);if(!Number.isInteger(g)||g<1||g>4)throw fail('Choose between 1 and 4 guests.');return json({rooms:await availability(db,owner,a,b,g)});}
 if(req.method==='GET'&&p==='/api/workspace'){
  const bookings=(await db.prepare('SELECT * FROM reservations WHERE owner=? ORDER BY created DESC').bind(owner).all()).results;
  const profile=await db.prepare('SELECT * FROM profiles WHERE owner=?').bind(owner).first();
  const states=(await db.prepare('SELECT room,unit,state FROM room_state WHERE owner=?').bind(owner).all()).results;
  return json({bookings:bookings.map(b=>({...b,history:JSON.parse(b.history)})),profile:profile||{name:'Cove Manager',role:'Resort manager',notifications:1},user:{email:user.email},states,rooms,today:today()});
 }
 if(req.method==='POST'&&p==='/api/bookings'){
  if(Number(req.headers.get('content-length')||0)>20000)throw fail('This request is too large.',413);
  const body=await req.json(),a=body.arrival,b=body.departure,g=Number(body.guests);validateDates(a,b);
  const name=safeText(body.name,100),email=safeText(body.email,150),phone=safeText(body.phone,35),notes=safeText(body.notes,800);
  if(name.length<2||!/^\S+@\S+\.\S+$/.test(email)||phone.length<7)throw fail('Please provide a name, valid email, and contact number.');
  if(!Number.isInteger(g)||g<1||g>4)throw fail('Choose between 1 and 4 guests.');
  if(!['Pay at resort','Simulated GCash','Simulated card'].includes(body.payment))throw fail('Choose a supported demo payment method.');
  const chosen=(await availability(db,owner,a,b,g)).find(r=>r.id===body.room);if(!chosen||!chosen.available)throw fail('That room is no longer available for your dates. Try another room or date.',409);
  const id='AC-'+crypto.randomUUID().slice(0,8).toUpperCase(),unit=chosen.units[0],price=quote(chosen.id,a,b),created=new Date().toISOString(),paid=body.payment==='Pay at resort'?0:price.deposit;
  const history=JSON.stringify([{at:created,event:'Demo reservation confirmed'},{at:created,event:paid?'Simulated 50% deposit recorded; no money charged':'Pay-at-resort selected; no payment collected'}]);
  const statements=[db.prepare('INSERT INTO reservations (id,owner,room,unit,arrival,departure,guests,name,email,phone,notes,total,paid,status,payment,created,history) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,owner,chosen.id,unit,a,b,g,name,email,phone,notes,price.total,paid,'Confirmed',body.payment,created,history),...nights(a,b).map(day=>db.prepare('INSERT INTO occupied_nights (owner,room,unit,day,booking) VALUES (?,?,?,?,?)').bind(owner,chosen.id,unit,day,id))];
  try{await db.batch(statements);}catch(e){if(String(e).includes('UNIQUE'))throw fail('Another reservation just took that room. Please search again.',409);throw e;}
  return json({id,room:chosen.name,unit,arrival:a,departure:b,guests:g,total:price.total,paid,payment:body.payment,name,email,nights:price.nights},201);
 }
 if(req.method==='PATCH'&&p.startsWith('/api/bookings/')){
  const id=decodeURIComponent(p.split('/').pop()),body=await req.json();
  const b=await db.prepare('SELECT * FROM reservations WHERE id=? AND owner=?').bind(id,owner).first();if(!b)throw fail('Reservation not found.',404);
  const stamp=new Date().toISOString(),history=JSON.parse(b.history);let status=b.status,paid=b.paid,event='';
  if(body.action==='checkin'){if(status!=='Confirmed')throw fail('Only confirmed bookings can be checked in.');if(today()<b.arrival||today()>=b.departure)throw fail('Check-in is available on a booked stay date.');status='Checked in';event='Guest checked in';}
  else if(body.action==='checkout'){if(status!=='Checked in')throw fail('Check in this guest first.');if(paid<b.total)throw fail('Record the remaining demo balance before checkout.');status='Checked out';event='Guest checked out';}
  else if(body.action==='cancel'){if(status!=='Confirmed')throw fail('Only confirmed reservations can be cancelled.');status='Cancelled';event='Reservation cancelled; inventory released. Demo refund requires review.';}
  else if(body.action==='payment'){if(status==='Cancelled')throw fail('Cannot collect a payment on a cancelled booking.');const value=Number(body.amount);if(!Number.isInteger(value)||value<=0||paid+value>b.total)throw fail('Enter a positive whole-peso amount up to the outstanding balance.');paid+=value;event='Simulated payment recorded: PHP '+value+'; no money charged';}
  else throw fail('Unsupported reservation action.');
  history.push({at:stamp,event});const ops=[db.prepare('UPDATE reservations SET status=?,paid=?,history=? WHERE id=? AND owner=? AND status=? AND paid=?').bind(status,paid,JSON.stringify(history),id,owner,b.status,b.paid)];
  if(status==='Cancelled')ops.push(db.prepare("DELETE FROM occupied_nights WHERE booking=? AND owner=? AND EXISTS(SELECT 1 FROM reservations WHERE id=? AND status='Cancelled')").bind(id,owner,id));
  const result=await db.batch(ops);if(!result[0].meta.changes)throw fail('This booking changed. Refresh and try again.',409);return json({ok:true});
 }
 if(req.method==='PATCH'&&p==='/api/profile'){const b=await req.json(),name=safeText(b.name,80);if(name.length<2)throw fail('Enter a display name with at least 2 characters.');await db.prepare('INSERT INTO profiles(owner,name,role,notifications) VALUES(?,?,?,?) ON CONFLICT(owner) DO UPDATE SET name=excluded.name,notifications=excluded.notifications').bind(owner,name,'Resort manager',b.notifications?1:0).run();return json({ok:true});}
 if(req.method==='PATCH'&&p==='/api/rooms'){const b=await req.json(),r=rooms.find(r=>r.id===b.room),unit=Number(b.unit);if(!r||!Number.isInteger(unit)||unit<1||unit>r.units||!['Ready','Cleaning','Maintenance'].includes(b.state))throw fail('Choose a valid room and housekeeping status.');await db.prepare('INSERT INTO room_state(owner,room,unit,state) VALUES(?,?,?,?) ON CONFLICT(owner,room,unit) DO UPDATE SET state=excluded.state').bind(owner,r.id,unit,b.state).run();return json({ok:true});}
 return json({error:'Endpoint not found.'},404);
}
export default {async fetch(req,env){const url=new URL(req.url);try{
 if(url.pathname.startsWith('/api/'))return await api(req,env,url);
 if(!['GET','HEAD'].includes(req.method))return new Response('Method not allowed',{status:405});
 let path=url.pathname;if(path==='/')path='/index.html';if(path==='/admin'||path==='/admin/')path='/admin.html';
 if(path==='/admin.html'&&!identity(req))return Response.redirect(url.origin+'/signin-with-chatgpt?return_to=%2Fadmin',302);
 const a=ASSETS[path];if(!a)return new Response('Not found',{status:404});
 const data=a.binary?Uint8Array.from(atob(a.content),c=>c.charCodeAt(0)):a.content;
 return new Response(req.method==='HEAD'?null:data,{headers:{'Content-Type':a.type,'Cache-Control':a.type.startsWith('image/')?'public,max-age=86400':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com; base-uri 'self'; form-action 'self'"}});
 }catch(e){return json({error:e.status?e.message:'Something went wrong. Please try again.',...(env.LOCAL_PREVIEW?{detail:String(e)}:{})},e.status||400);}}};
