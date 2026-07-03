import type { Message } from './lib/messages';
import type { WorkerEvent } from './lib/types';
import { translateTexts } from './lib/translator';

let activeWorker:Worker|undefined;
const report=(status:string,error?:string)=>chrome.runtime.sendMessage({type:'STATUS',status,error} satisfies Message).catch(()=>{});

chrome.runtime.onMessage.addListener((message:Message)=>{
  if(message.type!=='PROCESS_OFFSCREEN')return;
  void (async()=>{
    try{
      activeWorker?.terminate();
      const worker=new Worker(chrome.runtime.getURL('worker.js'),{type:'module'});activeWorker=worker;
      worker.onmessage=async({data}:MessageEvent<WorkerEvent>)=>{
        if(data.type==='status')await report(data.status);
        if(data.type==='error'){worker.terminate();activeWorker=undefined;await chrome.runtime.sendMessage({type:'OFFSCREEN_FAILED',tabId:message.tabId,error:data.error} satisfies Message);await report('Erro',data.error);}
        if(data.type==='result'){worker.terminate();activeWorker=undefined;try{await report('Traduzindo');const translated=await translateTexts(data.items.map(item=>item.originalText),message.settings.sourceLang,message.settings.targetLang,status=>void report(status));const items=data.items.map((item,index)=>({...item,translatedText:translated[index]}));await chrome.runtime.sendMessage({type:'OFFSCREEN_RESULT',tabId:message.tabId,items,showOriginal:message.settings.showOriginal,cacheKey:message.cacheKey,useCache:message.settings.useCache} satisfies Message);await report('Finalizado');}catch(error){const text=error instanceof Error?error.message:String(error);await chrome.runtime.sendMessage({type:'OFFSCREEN_FAILED',tabId:message.tabId,error:text} satisfies Message);await report('Erro',text);}}
      };
      worker.onerror=event=>{worker.terminate();activeWorker=undefined;const text=event.message||'Falha ao iniciar o processador local.';void chrome.runtime.sendMessage({type:'OFFSCREEN_FAILED',tabId:message.tabId,error:text} satisfies Message);void report('Erro',text);};
      worker.postMessage({image:message.image,settings:message.settings,viewport:message.viewport,extensionBaseUrl:chrome.runtime.getURL('')});
    }catch(error){const text=error instanceof Error?error.message:String(error);await chrome.runtime.sendMessage({type:'OFFSCREEN_FAILED',tabId:message.tabId,error:text} satisfies Message);await report('Erro',text);}
  })();
});
