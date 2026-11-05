let worker,nextId=0;
const waiting=new Map();
export function cancelBackground(){for(const task of waiting.values()){clearTimeout(task.timer);task.reject(new Error('Cut-out cancelled.'))}waiting.clear();worker?.terminate();worker=null}
function getWorker(){if(!worker){worker=new Worker(new URL('./cutout-worker.js',import.meta.url),{type:'module'});worker.onmessage=event=>{const {id,progress,bytes,error}=event.data;const task=waiting.get(id);if(!task)return;if(progress){task.progress(progress);return}clearTimeout(task.timer);waiting.delete(id);error?task.reject(new Error(error)):task.resolve(new Blob([bytes],{type:'image/png'}));if(waiting.size===0){worker.terminate();worker=null}};worker.onerror=()=>{for(const task of waiting.values()){clearTimeout(task.timer);task.reject(new Error('The cut-out tools could not start.'))}waiting.clear();worker.terminate();worker=null}}return worker}
export async function removeBackground(photo,progress=()=>{}){
 const id=++nextId;
 const blob=await new Promise((resolve,reject)=>{const current=getWorker();const timer=setTimeout(()=>{waiting.delete(id);reject(new Error('The cut-out took too long. Please try a smaller photo.'));current.terminate();worker=null},60000);waiting.set(id,{resolve,reject,progress,timer});current.postMessage({id,photo})});
 return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)})
}
