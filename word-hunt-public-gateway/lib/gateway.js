// Standalone Word Hunt public gateway. No /flip route exists in this project.
const ORIGIN = 'https://tscmsradio.com';
const UPSTREAM = 'https://tscms-word-hunt-production-candidate-fudgiepie4-7168s-projects.vercel.app';
const ROUTES = Object.freeze({status:'GET',mark:'GET',check:'POST'});
function respond(res,code,body){return res.status(code).json(body);}
export async function proxy(req,res,route){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('Vary','Origin');
  const origin=String(req.headers.origin||'');
  if(origin===ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin',ORIGIN);
    res.setHeader('Access-Control-Allow-Methods',ROUTES[route]+', OPTIONS');
    res.setHeader('Access-Control-Allow-Headers','Content-Type');
    res.setHeader('Access-Control-Max-Age','600');
  }
  if(origin && origin!==ORIGIN)return respond(res,403,{error:'origin'});
  if(!Object.hasOwn(ROUTES,route))return respond(res,404,{error:'not_found'});
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!==ROUTES[route])return respond(res,405,{error:'method'});
  const secret=process.env.WORD_HUNT_UPSTREAM_BYPASS_SECRET;
  if(typeof secret!=='string'||secret.length<32)return respond(res,503,{error:'unavailable'});
  let url=UPSTREAM+'/api/word-hunt/'+route;
  if(route==='mark'){
    const path=String(req.query?.path||'');
    if(path.length>180||!/^\/[a-zA-Z0-9/_-]+\.html$/.test(path))return respond(res,400,{active:false});
    url+='?path='+encodeURIComponent(path);
  }
  let body;
  if(route==='check'){
    if(!String(req.headers['content-type']||'').startsWith('application/json'))return respond(res,415,{error:'content_type'});
    try {
      const input=typeof req.body==='string'?JSON.parse(req.body):req.body;
      body=JSON.stringify(input);
      if(!input||typeof input!=='object'||Array.isArray(input)||body.length>4096)return respond(res,400,{error:'invalid'});
    }catch{return respond(res,400,{error:'invalid'});}
  }
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),8000);
  try{
    const upstream=await fetch(url,{
      method:ROUTES[route],redirect:'manual',signal:controller.signal,cache:'no-store',
      headers:{
        'Accept':'application/json',
        'x-vercel-protection-bypass':secret,
        ...(route==='check'?{'Content-Type':'application/json'}:{})
      },
      ...(body===undefined?{}:{body})
    });
    if(upstream.status>=300&&upstream.status<400)throw Error('unexpected redirect');
    if(!String(upstream.headers.get('content-type')||'').toLowerCase().includes('application/json'))throw Error('upstream not JSON');
    const raw=await upstream.text();
    if(raw.length>16384)throw Error('upstream oversized');
    const data=JSON.parse(raw);
    if(!data||typeof data!=='object'||Array.isArray(data))throw Error('invalid upstream response');
    return respond(res,upstream.status,data);
  }catch{return respond(res,503,route==='mark'?{active:false}:{error:'unavailable'});}
  finally{clearTimeout(timer);}
}
