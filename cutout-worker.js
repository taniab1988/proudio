// Lightweight U2-NetP: fixed 320px inference, independent of camera resolution.
let session,ort;
const MODEL='https://huggingface.co/tomjackson2023/rembg/resolve/cd3a3d6767a7859efea31ef0f2f373582cf06d82/u2netp.onnx';
self.onmessage=async({data:{id,photo}})=>{
 let bitmap;
 try{
  self.postMessage({id,progress:'Preparing the small cut-out tools…'});
  if(!ort){ort=await import('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.wasm.min.mjs');ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;ort.env.wasm.wasmPaths='https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/'}
  if(!session){const response=await fetch(MODEL);if(!response.ok)throw Error('Could not download cut-out tools.');session=await ort.InferenceSession.create(await response.arrayBuffer(),{executionProviders:['wasm'],graphOptimizationLevel:'all',enableCpuMemArena:false,enableMemPattern:false})}
  self.postMessage({id,progress:'Finding your creation…'});
  bitmap=await createImageBitmap(await(await fetch(photo)).blob());
  const small=new OffscreenCanvas(320,320),ctx=small.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0,320,320);
  const pixels=ctx.getImageData(0,0,320,320).data,size=320*320,input=new Float32Array(3*size),mean=[.485,.456,.406],std=[.229,.224,.225];
  let maxPixel=1;for(let p=0;p<pixels.length;p+=4)maxPixel=Math.max(maxPixel,pixels[p],pixels[p+1],pixels[p+2]);
  for(let i=0;i<size;i++)for(let c=0;c<3;c++)input[c*size+i]=(pixels[i*4+c]/maxPixel-mean[c])/std[c];
  const tensor=new ort.Tensor('float32',input,[1,3,320,320]),output=await session.run({[session.inputNames[0]]:tensor}),mask=output[session.outputNames[0]].data;
  let min=Infinity,max=-Infinity;for(const value of mask){min=Math.min(min,value);max=Math.max(max,value)}
  const maskImage=ctx.createImageData(320,320),range=Math.max(max-min,1e-6);for(let i=0;i<size;i++){const value=Math.round(255*(mask[i]-min)/range);maskImage.data.set([value,value,value,255],i*4)}ctx.putImageData(maskImage,0,0);
  const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),out=canvas.getContext('2d',{willReadFrequently:true});out.drawImage(small,0,0,bitmap.width,bitmap.height);const alpha=out.getImageData(0,0,bitmap.width,bitmap.height).data;out.clearRect(0,0,canvas.width,canvas.height);out.drawImage(bitmap,0,0);const image=out.getImageData(0,0,canvas.width,canvas.height);for(let i=0;i<image.data.length;i+=4)image.data[i+3]=Math.round(image.data[i+3]*alpha[i]/255);out.putImageData(image,0,0);
  const blob=await canvas.convertToBlob({type:'image/png'}),bytes=await blob.arrayBuffer();self.postMessage({id,bytes},[bytes]);tensor.dispose();for(const value of Object.values(output))value.dispose();
 }catch(error){self.postMessage({id,error:String(error.message||error)})}finally{bitmap?.close()}
};
