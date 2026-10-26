import {validateConfig} from './core.js';
export async function config(){
 if(process.env.VERCEL_ENV!=='production'||process.env.WORD_HUNT_ENABLE_REAL!=='true')throw Error('Contest is disabled');
 const raw=process.env.WORD_HUNT_CONFIG_JSON;
 if(!raw)throw Error('Private configuration missing');
 const c=validateConfig(JSON.parse(raw));
 if(c.testOnly!==false||c.manualDrop!==true)throw Error('Approved real manual-drop configuration required');
 return c;
}
