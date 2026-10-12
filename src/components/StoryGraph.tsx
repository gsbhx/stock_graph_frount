import type {Story,GNode} from '../types';
const W=820,H=430;
function pos(n:GNode,i:number,total:number){const groups={Event:0,Theme:1,Stock:2} as const;const x=[100,410,710][groups[n.kind]];const same=Math.max(1,total);const y=65+(i%(same))*Math.min(72,320/Math.max(1,same-1));return {x,y};}
export function StoryGraph({story,onStock}:{story:Story;onStock:(code:string)=>void}){
 const grouped={Event:story.nodes.filter(n=>n.kind==='Event'),Theme:story.nodes.filter(n=>n.kind==='Theme'),Stock:story.nodes.filter(n=>n.kind==='Stock')};
 const coords=new Map<string,{x:number;y:number}>(); (Object.keys(grouped) as (keyof typeof grouped)[]).forEach(k=>grouped[k].forEach((n,i)=>coords.set(n.id,pos(n,i,grouped[k].length))));
 return <div className="graph-wrap"><svg viewBox={`0 0 ${W} ${H}`} className="story-svg">
  {story.edges.map((e,i)=>{const a=coords.get(e.source),b=coords.get(e.target); if(!a||!b)return null; return <g key={i}><line x1={a.x+45} y1={a.y} x2={b.x-45} y2={b.y}/><text x={(a.x+b.x)/2} y={(a.y+b.y)/2-5}>{e.label}</text></g>})}
  {story.nodes.map(n=>{const p=coords.get(n.id)!;return <g key={n.id} className={`node ${n.kind.toLowerCase()}`} onClick={()=>{if(n.kind==='Stock')onStock(String(n.properties.code??n.id.replace('stock:','')))}}><circle cx={p.x} cy={p.y} r="42"/><text x={p.x} y={p.y+4} textAnchor="middle">{n.label.slice(0,9)}</text></g>})}
 </svg></div>
}
