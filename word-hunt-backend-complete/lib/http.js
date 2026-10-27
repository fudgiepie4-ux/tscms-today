const trusted='https://tscmsradio.com';
export function headers(res){
 res.setHeader('Cache-Control','no-store, max-age=0');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 res.setHeader('Vary','Origin');
}
export function allowed(req,res,method){
 const origin=String(req.headers?.origin||'');
 const own='https://'+String(req.headers?.host||'');
 if(origin&&origin!==trusted&&origin!==own)return false;
 if(origin===trusted){
  res.setHeader('Access-Control-Allow-Origin',trusted);
  res.setHeader('Access-Control-Allow-Methods',method+', OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
  res.setHeader('Access-Control-Max-Age','600');
 }
 return true;
}
export function preflight(req,res,method){
 if(!allowed(req,res,method))return res.status(403).json({error:'origin'});
 if(req.method==='OPTIONS'){res.status(204).end();return true;}
 return false;
}
export const isDisabled=()=>process.env.WORD_HUNT_ENABLE_REAL!=='true';
