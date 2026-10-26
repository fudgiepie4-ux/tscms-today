import {config} from '../../lib/config.js';
import {check} from '../../lib/core.js';
import {storage} from '../../lib/storage.js';
import {headers,sameOrigin} from '../../lib/http.js';
export default async function handler(req,res){const now=Date.now();headers(res);if(req.method!=='POST')return res.status(405).json({error:'method'});if(!sameOrigin(req))return res.status(403).json({error:'origin'});if(!String(req.headers['content-type']||'').startsWith('application/json'))return res.status(415).json({error:'content-type'});try{const body=typeof req.body==='string'?JSON.parse(req.body):req.body;if(!body||JSON.stringify(body).length>4096)return res.status(400).json({result:'invalid'});return res.status(200).json(await check(await config(),body,storage,now));}catch{return res.status(503).json({result:'unavailable',recorded:false});}}
