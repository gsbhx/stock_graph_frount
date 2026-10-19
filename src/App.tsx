import { useEffect, useState } from 'react';
import { Database, Network, Newspaper, Target, RefreshCw } from 'lucide-react';
import { api } from './api';
import type { FocusStock, GNode, MarketStock, OpportunityItem, OpportunityResponse, Overview, Story, Theme, Timeline as T } from './types';
import { StoryGraph } from './components/StoryGraph';
import { Timeline } from './components/Timeline';
import { MarketBoard } from './components/MarketBoard';
import { OpportunityBoard } from './components/OpportunityBoard';
import { ResearchConsole } from './components/ResearchConsole';

function todayAsNumber() {
  const d = new Date();
  return Number(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`);
}
function toDateInput(value: number) { const raw = String(value); return raw.length === 8 ? raw.slice(0,4)+'-'+raw.slice(4,6)+'-'+raw.slice(6,8) : ''; }
const roleNames: Record<string,string> = { leader:'龙头',branch_leader:'分支龙头',frontline:'前排',short_frontline:'短线前排',trend_core:'趋势核心',trend_anchor:'趋势中军',capacity_core:'容量核心',risk_anchor:'风险观察' };
function formatScore(score?: number|string){const value=Number(score);if(!Number.isFinite(value))return '—';return (Math.abs(value)<=1?value*100:value).toFixed(1);}
function formatConfidence(confidence?: number|string){const value=Number(confidence);if(!Number.isFinite(value))return '—';return `${(Math.abs(value)<=1?value*100:value).toFixed(0)}%`;}

export default function App(){
  const initialDate=todayAsNumber();
  const [date,setDate]=useState(initialDate); const [dateInput,setDateInput]=useState(toDateInput(initialDate));
  const [overview,setOverview]=useState<Overview|null>(null); const [themes,setThemes]=useState<Theme[]>([]); const [marketStocks,setMarketStocks]=useState<MarketStock[]>([]);
  const [opportunities,setOpportunities]=useState<OpportunityResponse|null>(null); const [story,setStory]=useState<Story>({nodes:[],edges:[]});
  const [selectedNode,setSelectedNode]=useState<GNode|null>(null); const [stock,setStock]=useState(''); const [timeline,setTimeline]=useState<T[]>([]);
  const [loading,setLoading]=useState(false); const [error,setError]=useState('');

  const load=async()=>{
    setLoading(true);setError('');
    const results=await Promise.allSettled([
      api.overview(date),api.themes(date,100),api.stocks(date),api.story(date),api.opportunities(date),
    ] as const);
    const failures:string[]=[];
    const names=['市场概览','题材','活跃股票','关系图','机会排序'];
    results.forEach((result,index)=>{
      if(result.status==='rejected') failures.push(`${names[index]}：${String(result.reason)}`);
    });
    if(results[0].status==='fulfilled')setOverview(results[0].value);
    if(results[1].status==='fulfilled')setThemes(results[1].value);
    if(results[2].status==='fulfilled')setMarketStocks(results[2].value);
    if(results[3].status==='fulfilled')setStory(results[3].value);
    if(results[4].status==='fulfilled')setOpportunities(results[4].value);
    if(failures.length)setError(`部分接口读取失败（其他区域仍可使用）：${failures.join('；')}`);
    setLoading(false);
  };
  useEffect(()=>{setOverview(null);setThemes([]);setMarketStocks([]);setOpportunities(null);setStory({nodes:[],edges:[],focus:[]});setSelectedNode(null);setStock('');setTimeline([]);void load();},[date]);

  const selectNode=async(node:GNode)=>{setSelectedNode(node);setError('');if(node.kind!=='Stock'){setStock('');setTimeline([]);return;}const code=String(node.properties.code??node.id.replace('stock:',''));setStock(code);try{setTimeline(await api.timeline(code));}catch(cause){setError(String(cause));}};
  const selectTheme=(theme:Theme)=>{void selectNode({id:'theme:'+theme.theme_id,label:theme.name,kind:'Theme',properties:{theme_id:theme.theme_id,active_count:theme.active_count,sample_codes:theme.sample_codes}});};
  const selectFocusStock=(candidate:FocusStock)=>{const node=story.nodes.find(item=>item.id==='stock:'+candidate.code)??{id:'stock:'+candidate.code,label:candidate.name,kind:'Stock' as const,properties:{code:candidate.code,lead_score:candidate.lead_score,primary_role:candidate.role}};void selectNode(node);};
  const selectOpportunity=(candidate:OpportunityItem)=>{const stockRow=marketStocks.find(item=>item.code===candidate.code);selectFocusStock(stockRow??{code:candidate.code,name:candidate.name,role:candidate.role,theme:candidate.theme});};
  const clearSelection=()=>{setSelectedNode(null);setStock('');setTimeline([]);};

  const cards=[['图谱关系',overview?.relationships??0,Network],['活跃股票',overview?.active_stocks??0,Target],['催化事件',overview?.events??0,Newspaper],['活跃题材',overview?.themes??0,Database]] as const;
  const kindLabel=selectedNode?.kind==='Stock'?'股票':selectedNode?.kind==='Theme'?'题材':selectedNode?.kind==='Event'?'事件':'';

  return <main>
    <header><div><span className="eyebrow">STOCK_GRAPH / MULTI-AGENT RESEARCH PLATFORM</span><h1>A股研究智能体平台</h1><p>Temporal GraphRAG × 归因 × 短线结构 × 产业研究 × 决策排序。</p></div><div className="controls"><label className="date-control"><span className="sr-only">选择交易日</span><input type="date" aria-label="选择交易日" value={dateInput} onChange={event=>{const next=event.target.value;setDateInput(next);if(next)setDate(Number(next.replaceAll('-','')));}}/></label><button type="button" onClick={()=>void load()} disabled={loading}><RefreshCw size={16}/>{loading?'加载中':'刷新数据'}</button></div></header>
    {error&&<div className="error" role="alert">{error}</div>}
    {!loading&&!error&&overview&&overview.active_stocks===0&&marketStocks.length===0&&<div className="error" role="status">当前日期 {date} 没有可展示的已验证研究数据。请切换到实际完成研究的交易日；如果已经运行成功，请检查后端 Neo4j 投影。</div>}
    <section className="cards" aria-label="市场概览">{cards.map(([name,value,Icon])=><div className="card" key={name}><Icon size={20}/><span>{name}</span><strong>{value}</strong></div>)}</section>

    <OpportunityBoard data={opportunities} onSelect={selectOpportunity}/>
    <ResearchConsole date={date} onComplete={()=>void load()}/>
    <MarketBoard stocks={marketStocks} themes={themes} selectedCode={stock} onSelectStock={selectFocusStock}/>

    <section className="panel focus-panel" aria-label="重点关注个股"><div className="panel-head"><div><span className="eyebrow">FOCUS WATCH / RAW STRUCTURE</span><h2>原始领涨结构</h2><p className="focus-explainer">保留 Lead Score 原始排序，作为机会引擎的底层结构证据，而不是直接等同于“最有潜力”。</p></div><span className="mode">{story.focus?.length??0} 个候选</span></div>{story.focus?.length?<div className="focus-list">{story.focus.map((candidate,index)=>{const selected=selectedNode?.kind==='Stock'&&String(selectedNode.properties.code??'')===candidate.code;const role=candidate.role||'';return <button type="button" className={'focus-card'+(selected?' selected':'')+(role==='risk_anchor'?' risk':'')} key={candidate.code} aria-pressed={selected} onClick={()=>selectFocusStock(candidate)}><span className="focus-rank">{String(index+1).padStart(2,'0')}</span><span className="focus-company"><strong>{candidate.name||candidate.code}</strong><small>{candidate.code}</small></span><span className="focus-role">{roleNames[role]??(role||'角色待补')}</span><span className="focus-score"><strong>{formatScore(candidate.lead_score)}</strong><small>领涨分</small></span><span className="focus-theme">{candidate.theme||'题材未标注'}<small>信心 {formatConfidence(candidate.confidence)}</small></span><span className="focus-scores">短线 {formatScore(candidate.short_score)} · 趋势 {formatScore(candidate.trend_score)}</span></button>;})}</div>:<div className="focus-empty">这一天没有可用的角色评分。</div>}</section>

    <div className="grid top"><section className="panel graph-panel"><div className="panel-head"><div><span className="eyebrow">EVIDENCE GRAPH</span><h2>催化事件关系</h2></div><span className="mode">{overview?.mode??'—'}</span></div><p className="interaction-hint">图谱用于证据钻取；真正的机会排序在页面顶部。</p><StoryGraph story={story} onSelect={selectNode} selectedNodeId={selectedNode?.id??''}/></section><section className="panel"><div className="panel-head"><div><span className="eyebrow">THEME POWER</span><h2>题材全景</h2></div></div><p className="interaction-hint">按当日活跃结构查看题材，后续由产业 Agent 提供生命力判断。</p><div className="theme-list">{themes.map((theme,index)=>{const selected=selectedNode?.kind==='Theme'&&Number(selectedNode.properties.theme_id)===theme.theme_id;return <button type="button" className={'theme-row'+(selected?' selected':'')} key={theme.theme_id} aria-pressed={selected} onClick={()=>selectTheme(theme)}><span className="rank">{String(index+1).padStart(2,'0')}</span><span className="theme-main"><b>{theme.name}</b><small>{(theme.sample_codes??[]).join(' · ')}</small></span><span className="count">{theme.active_count}</span></button>;})}</div></section></div>

    {selectedNode&&<div className="selection-note" aria-live="polite"><span className="selection-kind">{kindLabel}</span><strong>{selectedNode.label}</strong><span>{selectedNode.kind==='Stock'?'代码 '+stock+' · 下方显示角色时间线':selectedNode.kind==='Theme'?'活跃股票 '+String(selectedNode.properties.active_count??'—'):'已选择此市场事件'}</span><button type="button" onClick={clearSelection}>清除选择</button></div>}
    <Timeline code={stock} rows={timeline}/><footer>V0.3 · Temporal GraphRAG · Multi-Agent Research · FastAPI + Neo4j + LangGraph + React</footer>
  </main>;
}
