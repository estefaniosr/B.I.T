import type { Message } from './lib/messages';

declare global { interface Window { __bubbleImageTranslatorVersion?:string } }

if(window.__bubbleImageTranslatorVersion!=='1.4.1'){
  window.__bubbleImageTranslatorVersion='1.4.1';
  const ID='bubble-image-translator-overlay';
  let scrollTimer:number|undefined;
  const clear=()=>document.getElementById(ID)?.remove();
  const render=(message:Extract<Message,{type:'RENDER'}>)=>{
    clear();
    const root=document.createElement('div');root.id=ID;root.setAttribute('aria-label','Traduções de imagens');
    for(const item of message.items){
      const box=document.createElement('div');box.className=`bit-box${item.region==='bubble'?' bit-bubble':''}`;
      const padX=item.region==='bubble'?0:Math.max(8,Math.min(22,item.bbox.width*.12));
      const padY=item.region==='bubble'?0:Math.max(6,Math.min(18,item.bbox.height*.18));
      const width=Math.min(440,Math.max(64,item.bbox.width+padX*2));
      const height=Math.min(420,Math.max(32,item.bbox.height+padY*2));
      const left=Math.max(4,Math.min(window.innerWidth-width-4,item.bbox.x-padX));
      const top=Math.max(4,Math.min(window.innerHeight-height-4,item.bbox.y-padY));
      const fontSize=Math.max(12,Math.min(28,item.bbox.height*.3,Math.sqrt(Math.max(1,width*height)/Math.max(1,item.translatedText.length))*.82));
      box.style.cssText=`left:${left}px;top:${top}px;width:${width}px;min-height:${height}px;max-height:420px;font-size:${fontSize}px`;
      const translated=document.createElement('div');translated.className='bit-translated';translated.textContent=item.translatedText;box.append(translated);
      if(message.showOriginal){const original=document.createElement('div');original.className='bit-original';original.textContent=item.originalText;box.append(original);}
      root.append(box);
    }
    document.documentElement.append(root);
  };
  chrome.runtime.onMessage.addListener((message:Message)=>{if(message.type==='CLEAR')clear();if(message.type==='RENDER')render(message);});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')clear();});
  const refreshAfterViewportChange=()=>{clear();if(scrollTimer!==undefined)window.clearTimeout(scrollTimer);scrollTimer=window.setTimeout(()=>{void chrome.runtime.sendMessage({type:'RETRANSLATE'} satisfies Message);},700);};
  document.addEventListener('scroll',refreshAfterViewportChange,{capture:true,passive:true});
  window.addEventListener('scroll',refreshAfterViewportChange,{passive:true});
  window.addEventListener('resize',refreshAfterViewportChange,{passive:true});
}
