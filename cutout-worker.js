let segmenter;
self.onmessage=async event=>{
 const {id,photo}=event.data;
 try{
  const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js');
  env.allowLocalModels=false;
  env.backends.onnx.wasm.numThreads=1;
  env.backends.onnx.wasm.proxy=false;
  if(!segmenter)segmenter=await pipeline('background-removal','onnx-community/ormbg-ONNX',{device:'wasm',dtype:'uint8',progress_callback:p=>self.postMessage({id,progress:p.status==='progress'?'Preparing the cut-out tools…':'Getting your creation ready…'})});
  self.postMessage({id,progress:'Finding your creation…'});
  const output=await segmenter(photo);
  const result=output[0];
  const canvas=new OffscreenCanvas(result.width,result.height);
  const ctx=canvas.getContext('2d');
  ctx.putImageData(new ImageData(new Uint8ClampedArray(result.data),result.width,result.height),0,0);
  const blob=await canvas.convertToBlob({type:'image/png'});
  const bytes=new Uint8Array(await blob.arrayBuffer());
  self.postMessage({id,bytes:bytes.buffer},[bytes.buffer]);
 }catch(error){segmenter=undefined;self.postMessage({id,error:String(error.message||error)})}
};
