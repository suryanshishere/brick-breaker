import {describe,it,expect,vi} from 'vitest';
import worker from '../worker/index';
const origin='https://brick-breaker.suryansh.lol';
function env(){return {DB:{prepare:vi.fn(()=>{throw new Error('Database must not be accessed');})},ASSETS:{fetch:vi.fn(()=>new Response('asset'))},GOOGLE_CLIENT_ID:'test-client',APP_ORIGIN:origin} as never;}
const ctx={waitUntil:vi.fn()} as never;
describe('account API boundaries',()=>{
 it('denies anonymous save reads and writes',async()=>{for(const method of ['GET','PUT']){const e=env();const req=new Request(origin+'/api/save',{method,headers:method==='PUT'?{'Origin':origin,'Content-Type':'application/json'}:{}});const response=await worker.fetch(req,e,ctx);expect(response.status).toBe(401);}});
 it('rejects cross-origin save writes and logout before accessing the database',async()=>{for(const path of ['/api/save','/api/logout','/api/account']){const response=await worker.fetch(new Request(origin+path,{method:'POST',headers:{Origin:'https://malicious.example','Content-Type':'application/json'},body:'{}'}),env(),ctx);expect(response.status).toBe(403);}});
 it('requires an unexpired login nonce for Google authentication',async()=>{const r=await worker.fetch(new Request(origin+'/api/auth/google',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({credential:'not-a-token'})}),env(),ctx);expect(r.status).toBe(401);});
 it('issues non-cacheable, HttpOnly, Secure nonces with restricted framing',async()=>{const r=await worker.fetch(new Request(origin+'/api/auth/nonce'),env(),ctx);expect(r.status).toBe(200);expect(r.headers.get('Set-Cookie')).toContain('HttpOnly; Secure; SameSite=Strict');expect(r.headers.get('Cache-Control')).toBe('no-store');expect(r.headers.get('X-Frame-Options')).toBe('DENY');const data=await r.json() as {nonce:string};expect(data.nonce).toMatch(/^[a-f0-9]{64}$/);});
});
