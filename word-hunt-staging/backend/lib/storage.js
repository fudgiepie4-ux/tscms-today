import {put,get} from '@vercel/blob';
export const storage={
 async create(path,value){try{await put(path,JSON.stringify(value),{access:'private',addRandomSuffix:false,allowOverwrite:false,contentType:'application/json'});return true;}catch(e){const existing=await this.read(path);if(existing)return false;throw e;}},
 async read(path){const b=await get(path,{access:'private',useCache:false});if(!b)return null;if(b.statusCode!==200)throw Error('Unexpected storage result');return JSON.parse(await new Response(b.stream).text());}
};
