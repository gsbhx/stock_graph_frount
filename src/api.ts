import type {MarketStock,Overview,Theme,Story,Timeline,OpportunityResponse,WorkflowRun,RunEventsResponse,ReportResponse,ResearchAssets,ResumeDecision} from './types';
const BASE=import.meta.env.VITE_API_BASE ?? 'http://localhost:8010/api';
async function get<T>(path:string):Promise<T>{const r=await fetch(BASE+path);if(!r.ok)throw new Error(await r.text());return r.json();}
async function post<T>(path:string,body:unknown={}):Promise<T>{const r=await fetch(BASE+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error(await r.text());return r.json();}
export type ResearchDates = { dates: number[]; latest: number | null };
export const api={
  researchDates: (limit=365) => get<ResearchDates>(`/dashboard/dates?limit=${limit}`),
  overview:(d:number)=>get<Overview>(`/dashboard/${d}/overview`),
  themes:(d:number,limit=20)=>get<Theme[]>(`/dashboard/${d}/themes?limit=${limit}`),
  stocks:(d:number)=>get<MarketStock[]>(`/dashboard/${d}/stocks`),
  story:(d:number)=>get<Story>(`/dashboard/${d}/story`),
  timeline:(c:string)=>get<Timeline[]>(`/dashboard/stock/${c}/timeline`),
  opportunities:(d:number)=>get<OpportunityResponse>(`/opportunities/${d}`),
  researchAssets:()=>get<ResearchAssets>('/workflows/assets'),
  runResearch:(d:number,knowledge_mode:'current'|'pit'='current')=>post<WorkflowRun>('/workflows/daily',{trade_date:d,knowledge_mode}),
  workflowRun:(runId:string)=>get<WorkflowRun>(`/workflows/${runId}`),
  workflowEvents:(runId:string,after=0)=>get<RunEventsResponse>(`/workflows/${runId}/events?after=${after}`),
  resumeWorkflow:(runId:string,decision?:ResumeDecision)=>post<WorkflowRun>(`/workflows/${runId}/resume`,decision?{decision}:{}),
  report:(d:number)=>get<ReportResponse>(`/reports/${d}`),
};
