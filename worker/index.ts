import {createRemoteJWKSet,jwtVerify} from 'jose';
import {parseSave,packSave} from '../src/engine';
interface Env { DB:D1Database; ASSETS:Fetcher; GOOGLE_CLIENT_ID:string; APP_ORIGIN:string }
const keys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const encoder=new TextEncoder();
const json=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
async function hash(s:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
function cookie(req:Request,name:string){return req.headers.get('Cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1);}
async function user(req:Request,env:Env){const token=cookie(req,'__Host-bb_session');if(!token||!/^[a-f0-9]{64}$/.test(token))return null;return env.DB.prepare('SELECT users.id,users.name FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=? AND expires_at>?').bind(await hash(token),Date.now()).first<{id:string;name:string}>();}
function token(){return [...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('');}
const sessionCookie=(value:string,max=60*60*24*30)=>`__Host-bb_session=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${max}`;
async function api(req:Request,env:Env,ctx:ExecutionContext):Promise<Response>{
 const url=new URL(req.url),path=url.pathname;
 if(req.method!=='GET'&&req.headers.get('Origin')!==url.origin)return json({error:'Request origin does not match.'},403);
 if(req.method!=='GET'&&!(req.headers.get('Content-Type')||'').startsWith('application/json'))return json({error:'JSON required.'},415);
 if(Number(req.headers.get('content-length')||0)>65536)return json({error:'Save is too large.'},413);
 if(path==='/api/config'&&req.method==='GET')return json({googleClientId:env.GOOGLE_CLIENT_ID||null});
 if(path==='/api/auth/nonce'&&req.method==='GET'){const nonce=token();return json({nonce},200,{'Set-Cookie':`__Host-bb_nonce=${nonce}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`});}
 if(path==='/api/auth/google'&&req.method==='POST'){
  if(!env.GOOGLE_CLIENT_ID)return json({error:'Google sign-in is being configured. You can keep playing as a guest.'},503);
  const body=await read(req);if(typeof body.credential!=='string'||body.credential.length>12000)return json({error:'Invalid Google credential.'},400);
  const nonce=cookie(req,'__Host-bb_nonce');if(!nonce)return json({error:'Sign-in expired. Please try again.'},401);
  let payload;try{({payload}=await jwtVerify(body.credential,keys,{audience:env.GOOGLE_CLIENT_ID,issuer:['https://accounts.google.com','accounts.google.com'],algorithms:['RS256']}));}catch{return json({error:'Google sign-in could not be verified. Please try again.'},401);}
  if(payload.nonce!==nonce||!payload.sub||!payload.email_verified)return json({error:'Google identity could not be verified.'},401);
  const name=typeof payload.given_name==='string'?payload.given_name.slice(0,80):'Player',now=Date.now(),session=token();
  await env.DB.batch([env.DB.prepare('INSERT INTO users(id,name,created_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name').bind(payload.sub,name,now),env.DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(await hash(session),payload.sub,now+30*86400000)]);
  ctx.waitUntil(env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(now).run());
  return json({user:{id:payload.sub,name}},200,{'Set-Cookie':sessionCookie(session)});
 }
 if(path==='/api/me'&&req.method==='GET')return json({user:await user(req,env)});
 if(path==='/api/logout'&&req.method==='POST'){const session=cookie(req,'__Host-bb_session');if(session)await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hash(session)).run();return json({ok:true},200,{'Set-Cookie':sessionCookie('',0)});}
 if(path==='/api/account'&&req.method==='DELETE'){const account=await user(req,env);if(!account)return json({error:'Sign in again to manage your account.'},401);await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(account.id),env.DB.prepare('DELETE FROM saves WHERE user_id=?').bind(account.id),env.DB.prepare('DELETE FROM users WHERE id=?').bind(account.id)]);return json({ok:true},200,{'Set-Cookie':sessionCookie('',0)});}
 if(path==='/api/save'){
  const account=await user(req,env);if(!account)return json({error:'Sign in again to sync your progress.'},401);
  if(req.method==='GET'){const row=await env.DB.prepare('SELECT data,version,updated_at FROM saves WHERE user_id=?').bind(account.id).first<{data:string;version:number;updated_at:number}>();return json(row?{save:JSON.parse(row.data),version:row.version}:{save:null,version:0});}
  if(req.method==='PUT'){
   const body=await read(req);const save=parseSave(body.save);if(!save||!Number.isInteger(body.version)||Number(body.version)<0)return json({error:'Invalid game save.'},400);
   const version=body.version as number,data=JSON.stringify(packSave(save));let result;
   if(version===0)result=await env.DB.prepare('INSERT INTO saves(user_id,data,version,updated_at) VALUES(?,?,1,?) ON CONFLICT(user_id) DO NOTHING').bind(account.id,data,Date.now()).run();
   else result=await env.DB.prepare('UPDATE saves SET data=?,version=version+1,updated_at=? WHERE user_id=? AND version=?').bind(data,Date.now(),account.id,version).run();
   if(!result.meta.changes){const row=await env.DB.prepare('SELECT data,version FROM saves WHERE user_id=?').bind(account.id).first<{data:string;version:number}>();return json({error:'Your account has a newer save. Choose which game to keep.',save:row?JSON.parse(row.data):null,version:row?.version||0},409);}
   return json({version:version+1});
  }
 }
 return json({error:'Not found.'},404);
}
async function read(req:Request):Promise<Record<string,unknown>>{const text=await req.text();if(text.length>65536)throw new Error('body');const value=JSON.parse(text);if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('body');return value;}
export default {async fetch(req:Request,env:Env,ctx:ExecutionContext){let response:Response;try{response=new URL(req.url).pathname.startsWith('/api/')?await api(req,env,ctx):await env.ASSETS.fetch(req);}catch(error){console.error('Request failed',error instanceof Error?error.name:'Unknown');response=json({error:'Unable to complete this request. Your game stays saved on this device.'},500);}const result=new Response(response.body,response);result.headers.set('X-Content-Type-Options','nosniff');result.headers.set('Referrer-Policy','strict-origin-when-cross-origin');result.headers.set('X-Frame-Options','DENY');result.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');result.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self' https://accounts.google.com/gsi/client https://*.clarity.ms; connect-src 'self' https://accounts.google.com https://*.clarity.ms https://c.bing.com; frame-src https://accounts.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.clarity.ms https://c.bing.com; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");return result;}};
