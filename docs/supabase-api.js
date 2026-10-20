import {rooms} from './data.js';
import {rpc,auth} from './supabase-client.js';
export async function resortFetch(input,options={}){
 try{
  const url=new URL(input,location.href),p=url.pathname,method=options.method||'GET',body=options.body?JSON.parse(options.body):{};
  let data;
  if(method==='GET'&&p==='/api/availability'){
   data=await rpc('ac_availability',{p_arrival:url.searchParams.get('arrival'),p_departure:url.searchParams.get('departure'),p_guests:Number(url.searchParams.get('guests')||2)});
   data.rooms=data.rooms.map(r=>({...rooms.find(x=>x.id===r.id),...r}));
  }else if(method==='POST'&&p==='/api/bookings'){
   await auth.ensureGuest();data=await rpc('ac_book',{p_payload:body},true);
  }else if(method==='GET'&&p==='/api/workspace'){
   data=await rpc('ac_workspace',{},true);data.rooms=rooms;
  }else if(method==='PATCH'&&p.startsWith('/api/bookings/')){
   data=await rpc('ac_booking_action',{p_id:decodeURIComponent(p.split('/').pop()),p_action:body.action,p_amount:body.amount??null},true);
  }else if(method==='PATCH'&&p==='/api/rooms'){
   data=await rpc('ac_room_state',{p_room:body.room,p_unit:Number(body.unit),p_state:body.state},true);
  }else if(method==='PATCH'&&p==='/api/profile'){
   data=await rpc('ac_profile',{p_name:body.name,p_notifications:Boolean(body.notifications)},true);
  }else return Response.json({error:'Unknown resort endpoint.'},{status:404});
  return Response.json(data,{status:method==='POST'&&p==='/api/bookings'?201:200});
 }catch(e){return Response.json({error:e.message,...([401,403].includes(e.status)||e.code==='42501'?{signIn:'./login.html'}:{})},{status:[401,403,409,429].includes(e.status)?e.status:e.code==='42501'?403:400});}
}
