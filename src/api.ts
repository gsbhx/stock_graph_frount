import type {MarketStock,Overview,Theme,Story,Timeline} from './types';
const BASE=import.meta.env.VITE_API_BASE ?? 'http://localhost:8010/api';
async function get<T>(path:string):Promise<T>{const r=await fetch(BASE+path);if(!r.ok)throw new Error(await r.text());return r.json();}
export const api={overview:(d:number)=>get<Overview>(`/dashboard/${d}/overview`),themes:(d:number,limit=20)=>get<Theme[]>(`/dashboard/${d}/themes?limit=${limit}`),stocks:(d:number)=>get<MarketStock[]>(`/dashboard/${d}/stocks`),story:(d:number)=>get<Story>(`/dashboard/${d}/story`),timeline:(c:string)=>get<Timeline[]>(`/dashboard/stock/${c}/timeline`)};
