import {config} from '../../lib/config.js';
import {status} from '../../lib/core.js';
import {headers} from '../../lib/http.js';
export default async function handler(req,res){headers(res);if(req.method!=='GET')return res.status(405).json({error:'method'});try{return res.status(200).json(status(await config(),Date.now()));}catch{return res.status(503).json({state:'not-yet',error:'unavailable'});}}
