// GitHub Pages demonstration adapter. No server, secure login, or real payments.
// Records stay in this browser's localStorage. Use invented guest information.
import {rooms,quote,validateDates,nights,today} from './data.js';
const KEY='audrea-cove-pages-v1:'+new URL('.',import.meta.url).pathname;
const clean=(v,max=200)=>String(v??'').trim().slice(0,max);
function read(){try{return JSON.parse(localStorage.getItem(KEY))||{bookings:[],states:[],profile:{name:'Cove Demo Manager',role:'Browser demo manager',notifications:1}};}catch{throw Error('Browser storage is unavailable. Enable local storage to try the booking demo.');}}
function save(s){localStorage.setItem(KEY,JSON.stringify(s));}
function available(s,a,b,g){return rooms.map(r=>{const units=Array.from({length:r.units},(_,i)=>i+1).filter(unit=>!s.states.some(x=>x.room===r.id&&x.unit===unit&&x.state==='Maintenance')&&!s.bookings.some(x=>x.room===r.id&&x.unit===unit&&x.status!=='Cancelled'&&x.arrival<b&&x.departure>a));return {...r,available:g<=r.capacity?units.length:0,units:g<=r.capacity?units:[],quote:quote(r.id,a,b)};});}
export async function demoFetch(input,options={}){
 try{
  const url=new URL(input,location.href),p=url.pathname,method=options.method||'GET',s=read(),body=options.body?JSON.parse(options.body):{};
  const response=(data,status=200)=>Response.json(data,{status});
  if(method==='GET'&&p==='/api/workspace')return response({...s,user:{email:'demo@example.com'},rooms,today:today()});
  if(method==='GET'&&p==='/api/availability'){const a=url.searchParams.get('arrival'),b=url.searchParams.get('departure'),g=Number(url.searchParams.get('guests')||2);validateDates(a,b);if(!Number.isInteger(g)||g<1||g>4)throw Error('Choose between 1 and 4 guests.');return response({rooms:available(s,a,b,g)});}
  if(method==='POST'&&p==='/api/bookings'){
   validateDates(body.arrival,body.departure);const g=Number(body.guests);if(!Number.isInteger(g)||g<1||g>4)throw Error('Choose between 1 and 4 guests.');
   const name=clean(body.name,100),email=clean(body.email,150),phone=clean(body.phone,35);if(name.length<2||!/^\S+@\S+\.\S+$/.test(email)||phone.length<7)throw Error('Provide a name, email, and contact number. Use fictional details.');
   if(!['Pay at resort','Simulated GCash','Simulated card'].includes(body.payment))throw Error('Choose a demo payment method.');
   const r=available(s,body.arrival,body.departure,g).find(r=>r.id===body.room);if(!r?.available)return response({error:'This room is unavailable for those dates or guest count.'},409);
   const q=quote(r.id,body.arrival,body.departure),id='AC-'+crypto.randomUUID().slice(0,8).toUpperCase(),at=new Date().toISOString(),paid=body.payment==='Pay at resort'?0:q.deposit;
   const booking={id,room:r.id,unit:r.units[0],arrival:body.arrival,departure:body.departure,guests:g,name,email,phone,notes:clean(body.notes,800),total:q.total,paid,payment:body.payment,status:'Confirmed',created:at,history:[{at,event:'Browser-only demo reservation confirmed'},{at,event:paid?'Simulated deposit saved; no money charged':'Pay-at-resort selected; no payment collected'}]};
   s.bookings.unshift(booking);save(s);return response({...booking,room:r.name,nights:q.nights},201);
  }
  if(method==='PATCH'&&p.startsWith('/api/bookings/')){
   const id=decodeURIComponent(p.split('/').pop()),b=s.bookings.find(x=>x.id===id);if(!b)return response({error:'Demo reservation not found in this browser.'},404);let event='';
   if(body.action==='checkin'){if(b.status!=='Confirmed'||today()<b.arrival||today()>=b.departure)throw Error('Check-in is available during booked stay dates for confirmed reservations.');b.status='Checked in';event='Demo guest checked in';}
   else if(body.action==='checkout'){if(b.status!=='Checked in')throw Error('Check in this guest first.');if(b.paid<b.total)throw Error('Record the remaining demo balance before checkout.');b.status='Checked out';event='Demo guest checked out';}
   else if(body.action==='cancel'){if(b.status!=='Confirmed')throw Error('Only confirmed bookings can be cancelled.');b.status='Cancelled';event='Demo reservation cancelled; room released. No actual refund processed.';}
   else if(body.action==='payment'){const amount=Number(body.amount);if(b.status==='Cancelled'||!Number.isInteger(amount)||amount<=0||amount>b.total-b.paid)throw Error('Enter a valid whole-peso amount up to the outstanding balance.');b.paid+=amount;event='Simulated payment recorded: PHP '+amount+'; no money charged';}
   else throw Error('Unsupported demonstration action.');b.history.push({at:new Date().toISOString(),event});save(s);return response({ok:true});
  }
  if(method==='PATCH'&&p==='/api/rooms'){const r=rooms.find(r=>r.id===body.room),unit=Number(body.unit);if(!r||!Number.isInteger(unit)||unit<1||unit>r.units||!['Ready','Cleaning','Maintenance'].includes(body.state))throw Error('Choose a valid room and status.');const old=s.states.find(x=>x.room===r.id&&x.unit===unit);if(old)old.state=body.state;else s.states.push({room:r.id,unit,state:body.state});save(s);return response({ok:true});}
  if(method==='PATCH'&&p==='/api/profile'){const name=clean(body.name,80);if(name.length<2)throw Error('Enter at least two characters for the display name.');s.profile={name,role:'Browser demo manager',notifications:body.notifications?1:0};save(s);return response({ok:true});}
  return response({error:'Unknown demonstration endpoint.'},404);
 }catch(e){return Response.json({error:e.message||'The browser demo could not save this action.'},{status:400});}
}
