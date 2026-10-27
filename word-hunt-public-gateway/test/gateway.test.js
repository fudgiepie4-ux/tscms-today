import test from 'node:test';
import assert from 'node:assert/strict';
import {proxy} from '../lib/gateway.js';

function response(){
  return {code:200,headers:{},body:null,
    setHeader(name,value){this.headers[name.toLowerCase()]=value;},
    status(code){this.code=code;return this;},
    json(payload){this.body=payload;return this;},
    end(){return this;}
  };
}
const header={origin:'https://tscmsradio.com'};
const withSecret=(fn)=>{const prev=process.env.WORD_HUNT_UPSTREAM_BYPASS_SECRET;process.env.WORD_HUNT_UPSTREAM_BYPASS_SECRET='dummy_secret_abcdefghijklmnopqrstuvwxyz_123456789';
  return Promise.resolve().then(fn).finally(()=>{if(prev===undefined)delete process.env.WORD_HUNT_UPSTREAM_BYPASS_SECRET;else process.env.WORD_HUNT_UPSTREAM_BYPASS_SECRET=prev;});
};

test('status is public via server-side bypass, without exposing credentials',async()=>{
 await withSecret(async()=>{
  const old=globalThis.fetch;
  try{
   let target,options;
   globalThis.fetch=async(u,o)=>{target=u;options=o;return new Response(JSON.stringify({state:'not-yet'}),{headers:{'Content-Type':'application/json'}});};
   const res=response();await proxy({method:'GET',headers:header},res,'status');
   assert.equal(res.code,200);assert.deepEqual(res.body,{state:'not-yet'});
   assert.match(target,/\/api\/word-hunt\/status$/);
   assert.equal(options.headers['x-vercel-protection-bypass'],process.env.WORD_HUNT_UPSTREAM_BYPASS_SECRET);
   assert.equal(res.headers['x-vercel-protection-bypass'],undefined);
  }finally{globalThis.fetch=old;}
 });
});
test('mark path is encoded; unsupported flip fails before upstream',async()=>{
 await withSecret(async()=>{
  const old=globalThis.fetch;
  try{
   let calls=0;
   globalThis.fetch=async(u)=>{calls++;assert.match(u,/mark\?path=%2Fjournal\.html/);return new Response('{"active":false}',{headers:{'Content-Type':'application/json'}});};
   let res=response();
   await proxy({method:'GET',headers:header,query:{path:'/journal.html'}},res,'mark');
   assert.equal(res.code,200);assert.deepEqual(res.body,{active:false});
   res=response();await proxy({method:'POST',headers:header},res,'flip');
   assert.equal(res.code,404);assert.equal(calls,1);
  }finally{globalThis.fetch=old;}
 });
});
test('origin and method deny unauthorized browser calls',async()=>{
 await withSecret(async()=>{
  let res=response();await proxy({method:'GET',headers:{origin:'https://evil.example'}},res,'status');assert.equal(res.code,403);
  res=response();await proxy({method:'POST',headers:header},res,'status');assert.equal(res.code,405);
  res=response();await proxy({method:'OPTIONS',headers:header},res,'check');assert.equal(res.code,204);
  assert.equal(res.headers['access-control-allow-origin'],'https://tscmsradio.com');
 });
});
test('missing bypass, malformed entry and invalid upstream response all fail closed',async()=>{
 const prev=process.env.WORD_HUNT_UPSTREAM_BYPASS_SECRET;delete process.env.WORD_HUNT_UPSTREAM_BYPASS_SECRET;
 try{let res=response();await proxy({method:'GET',headers:header},res,'status');assert.equal(res.code,503);}
 finally{if(prev!==undefined)process.env.WORD_HUNT_UPSTREAM_BYPASS_SECRET=prev;}
 await withSecret(async()=>{
  let res=response();await proxy({method:'POST',headers:{...header,'content-type':'application/json'},body:{x:'x'.repeat(4097)}},res,'check');assert.equal(res.code,400);
  const old=globalThis.fetch;try{globalThis.fetch=async()=>new Response('<html>login</html>',{headers:{'Content-Type':'text/html'}});
    res=response();await proxy({method:'GET',headers:header},res,'status');assert.equal(res.code,503);
  }finally{globalThis.fetch=old;}
 });
});
