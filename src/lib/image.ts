export async function imageDimensions(dataUrl:string){const blob=await(await fetch(dataUrl)).blob();const bitmap=await createImageBitmap(blob);const size={width:bitmap.width,height:bitmap.height};bitmap.close();return size;}

export type ImageRegion={x:number;y:number;width:number;height:number};

async function canvasDataUrl(canvas:OffscreenCanvas){
  const bytes=new Uint8Array(await(await canvas.convertToBlob({type:'image/png'})).arrayBuffer());
  let binary='';for(let offset=0;offset<bytes.length;offset+=8192)binary+=String.fromCharCode(...bytes.subarray(offset,offset+8192));
  return`data:image/png;base64,${btoa(binary)}`;
}

export async function cropImageRegion(dataUrl:string,region:ImageRegion){
  const blob=await(await fetch(dataUrl)).blob();const bitmap=await createImageBitmap(blob);
  const left=Math.max(0,Math.round(region.x)),top=Math.max(0,Math.round(region.y));
  const width=Math.max(1,Math.min(bitmap.width-left,Math.round(region.width))),height=Math.max(1,Math.min(bitmap.height-top,Math.round(region.height)));
  const canvas=new OffscreenCanvas(width,height),context=canvas.getContext('2d');if(!context){bitmap.close();throw new Error('Não foi possível recortar o balão.');}
  context.fillStyle='#fff';context.fillRect(0,0,width,height);context.drawImage(bitmap,left,top,width,height,0,0,width,height);bitmap.close();return canvasDataUrl(canvas);
}

/** Splits Japanese vertical columns into individual glyph images in reading order. */
export type VerticalGlyph={image:string;bbox:ImageRegion};
export async function extractVerticalGlyphs(dataUrl:string,region:ImageRegion):Promise<VerticalGlyph[]> {
  const blob=await(await fetch(dataUrl)).blob();const bitmap=await createImageBitmap(blob);
  const left=Math.max(0,Math.round(region.x)),top=Math.max(0,Math.round(region.y));
  const width=Math.max(1,Math.min(bitmap.width-left,Math.round(region.width)));
  const height=Math.max(1,Math.min(bitmap.height-top,Math.round(region.height)));
  const source=new OffscreenCanvas(width,height);const context=source.getContext('2d',{willReadFrequently:true});
  if(!context){bitmap.close();return[];}context.drawImage(bitmap,left,top,width,height,0,0,width,height);bitmap.close();
  const pixels=context.getImageData(0,0,width,height).data;const dark=new Uint8Array(width*height);
  for(let i=0,p=0;i<dark.length;i++,p+=4)dark[i]=pixels[p]<145&&pixels[p+1]<145&&pixels[p+2]<145?1:0;
  const ranges=(counts:number[],minimum:number,gap:number)=>{const found:Array<[number,number]>=[];let start=-1,last=-1;
    for(let i=0;i<counts.length;i++){if(counts[i]>=minimum){if(start<0)start=i;last=i;}else if(start>=0&&i-last>gap){found.push([start,last]);start=-1;last=-1;}}
    if(start>=0)found.push([start,last]);return found;};
  const xCounts=Array.from({length:width},(_,x)=>{let count=0;for(let y=0;y<height;y++)count+=dark[y*width+x];return count;});
  const candidateColumns=ranges(xCounts,2,Math.max(2,Math.round(width*.008))).filter(([a,b])=>b-a>=4&&b-a<width*.45);
  const widestColumn=Math.max(0,...candidateColumns.map(([a,b])=>b-a+1));
  // Furigana is intentionally much narrower than the dialogue columns. Reading
  // it as a full column duplicates words and destroys Japanese sentence order.
  const columns=candidateColumns.filter(([a,b])=>b-a+1>=widestColumn*.52).sort((a,b)=>b[0]-a[0]);
  const glyphs:VerticalGlyph[]=[];
  for(const[x0,x1]of columns){const columnWidth=x1-x0+1;
    const yCounts=Array.from({length:height},(_,y)=>{let count=0;for(let x=x0;x<=x1;x++)count+=dark[y*width+x];return count;});
    const rows=ranges(yCounts,1,Math.max(1,Math.round(columnWidth*.07))).filter(([a,b])=>b-a>=3);
    for(const[y0,y1]of rows){let ink=0;for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)ink+=dark[y*width+x];if(ink<12)continue;
      const glyphWidth=x1-x0+1,glyphHeight=y1-y0+1,size=Math.max(glyphWidth,glyphHeight)+24;
      const glyph=new OffscreenCanvas(size,size),glyphContext=glyph.getContext('2d');if(!glyphContext)continue;
      glyphContext.fillStyle='#fff';glyphContext.fillRect(0,0,size,size);
      glyphContext.drawImage(source,x0,y0,glyphWidth,glyphHeight,(size-glyphWidth)/2,(size-glyphHeight)/2,glyphWidth,glyphHeight);
      glyphs.push({image:await canvasDataUrl(glyph),bbox:{x:region.x+x0,y:region.y+y0,width:glyphWidth,height:glyphHeight}});
    }
  }
  return glyphs.slice(0,40);
}

/** Finds enclosed, mostly-white comic balloon interiors without uploading pixels. */
export async function detectSpeechBubbles(dataUrl:string):Promise<ImageRegion[]> {
  const blob=await(await fetch(dataUrl)).blob();
  const bitmap=await createImageBitmap(blob);
  const scale=Math.min(1,900/Math.max(bitmap.width,bitmap.height));
  const width=Math.max(1,Math.round(bitmap.width*scale));
  const height=Math.max(1,Math.round(bitmap.height*scale));
  const canvas=new OffscreenCanvas(width,height);
  const context=canvas.getContext('2d',{willReadFrequently:true});
  if(!context){bitmap.close();return[];}
  context.drawImage(bitmap,0,0,width,height);bitmap.close();
  const pixels=context.getImageData(0,0,width,height).data;
  const white=new Uint8Array(width*height);
  for(let index=0,p=0;index<white.length;index++,p+=4){
    // Slightly relaxed threshold keeps anti-aliased balloon interiors connected.
    white[index]=pixels[p]>=238&&pixels[p+1]>=238&&pixels[p+2]>=238?1:0;
  }
  const visited=new Uint8Array(white.length);const regions:ImageRegion[]=[];
  const minArea=width*height*.0015;const maxArea=width*height*.22;
  for(let seed=0;seed<white.length;seed++){
    if(!white[seed]||visited[seed])continue;
    const queue=[seed];visited[seed]=1;let head=0,area=0;
    let minX=width,minY=height,maxX=0,maxY=0,touchesEdge=false;
    while(head<queue.length){
      const position=queue[head++],x=position%width,y=Math.floor(position/width);area++;
      if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;
      if(x===0||y===0||x===width-1||y===height-1)touchesEdge=true;
      const neighbors=[position-1,position+1,position-width,position+width];
      for(const next of neighbors){
        if(next<0||next>=white.length||visited[next]||!white[next])continue;
        const nx=next%width;if(Math.abs(nx-x)>1)continue;
        visited[next]=1;queue.push(next);
      }
    }
    const boxWidth=maxX-minX+1,boxHeight=maxY-minY+1,fill=area/(boxWidth*boxHeight),boxArea=boxWidth*boxHeight,aspect=boxWidth/boxHeight;
    if(touchesEdge||area<minArea||area>maxArea||boxArea>width*height*.19||boxWidth<35||boxHeight<35||boxWidth>width*.58||boxHeight>height*.72||aspect<.32||aspect>2.2||fill<.42)continue;
    const pad=Math.max(2,Math.round(Math.min(boxWidth,boxHeight)*.035));
    regions.push({x:(minX+pad)/scale,y:(minY+pad)/scale,width:(boxWidth-pad*2)/scale,height:(boxHeight-pad*2)/scale});
  }
  return regions.sort((a,b)=>(b.width*b.height)-(a.width*a.height)).slice(0,12);
}
