import type {Timeline as T} from '../types';
export function Timeline({code,rows}:{code:string;rows:T[]}){
  return <section className="panel"><div className="panel-head"><div><span className="eyebrow">ROLE TIMELINE</span><h2>{code || '选择一只股票'}</h2></div></div><div className="timeline">{rows.length===0&&<div className="empty">点击故事图中的股票节点查看地位演化</div>}{rows.map((r,i)=>{
    const score = r.lead_score == null || String(r.lead_score).trim() === '' ? Number.NaN : Number(r.lead_score);
    return <div className="timeline-row" key={i}><div className="dot"/><div className="date">{r.trade_date}</div><div className="role"><b>{r.role||'—'}</b><span>{r.theme||''}</span></div><div className="score">{Number.isFinite(score)?score.toFixed(1):'—'}</div></div>;
  })}</div></section>
}
