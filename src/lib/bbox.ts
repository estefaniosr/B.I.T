import type { BBox } from './types';
export function normalizeBBox(box:BBox,image:{width:number;height:number},viewport:{width:number;height:number}):BBox {const sx=viewport.width/image.width,sy=viewport.height/image.height;return{x:box.x*sx,y:box.y*sy,width:box.width*sx,height:box.height*sy};}
