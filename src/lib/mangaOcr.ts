import { AutoProcessor, AutoTokenizer, RawImage, env } from '@huggingface/transformers';
import * as ort from 'onnxruntime-web/wasm';

type Resources={tokenizer:Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>>;processor:Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>;encoder:ort.InferenceSession;decoder:ort.InferenceSession};
let resourcesPromise:Promise<Resources>|undefined;

async function loadResources(baseUrl:string,onProgress:(status:string)=>void):Promise<Resources>{
  if(resourcesPromise)return resourcesPromise;
  resourcesPromise=(async()=>{
    onProgress('carregando Manga OCR');
    env.allowRemoteModels=false;env.allowLocalModels=true;env.localModelPath=`${baseUrl}models/`;
    ort.env.wasm.numThreads=1;ort.env.wasm.wasmPaths=`${baseUrl}vendor/ort/`;
    const[tokenizer,processor,encoder,decoder]=await Promise.all([
      AutoTokenizer.from_pretrained('manga-ocr'),AutoProcessor.from_pretrained('manga-ocr'),
      ort.InferenceSession.create(`${baseUrl}models/manga-ocr/onnx/encoder_model_q4.onnx`,{executionProviders:['wasm']}),
      ort.InferenceSession.create(`${baseUrl}models/manga-ocr/onnx/decoder_model_q4.onnx`,{executionProviders:['wasm']})
    ]);
    return{tokenizer,processor,encoder,decoder};
  })();
  try{return await resourcesPromise;}catch(error){resourcesPromise=undefined;throw error;}
}

export async function recognizeMangaText(imageDataUrl:string,baseUrl:string,onProgress:(status:string)=>void){
  const{tokenizer,processor,encoder,decoder}=await loadResources(baseUrl,onProgress);
  const image=await RawImage.fromBlob(await(await fetch(imageDataUrl)).blob());
  const processed=await processor(image) as unknown as {pixel_values:{data:Float32Array;dims:number[]}};
  const pixels=processed.pixel_values;
  const encoded=await encoder.run({pixel_values:new ort.Tensor('float32',pixels.data,pixels.dims)});
  const hidden=encoded.last_hidden_state;const ids=[2];
  for(let step=0;step<64;step++){
    const inputIds=new ort.Tensor('int64',BigInt64Array.from(ids,BigInt),[1,ids.length]);
    const output=await decoder.run({input_ids:inputIds,encoder_hidden_states:hidden});
    const logits=output.logits,vocabulary=Number(logits.dims.at(-1)),offset=(Number(logits.dims[1])-1)*vocabulary,data=logits.data as Float32Array;
    let best=0;for(let token=1;token<vocabulary;token++)if(data[offset+token]>data[offset+best])best=token;
    if(best===3)break;ids.push(best);
  }
  return tokenizer.decode(ids,{skip_special_tokens:true}).replace(/\s+/g,'').trim();
}
