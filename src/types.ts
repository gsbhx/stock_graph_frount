export type Overview={trade_date:number;states:number;active_stocks:number;events:number;themes:number;relationships?:number;mode?:string};
export type Theme={theme_id:number;name:string;active_count:number;max_relevance?:number;sample_codes:string[]};
export type GNode={id:string;label:string;kind:'Event'|'Theme'|'Stock';properties:Record<string,unknown>};
export type GEdge={source:string;target:string;label:string};
export type FocusStock={code:string;name:string;role:string;lead_score?:number|string;confidence?:number|string;short_score?:number|string;trend_score?:number|string;capacity_score?:number|string;risk_score?:number|string;theme?:string;theme_id?:number|string;};
export type MarketStock=FocusStock & {themes:{theme_id:number;name:string;relevance?:number|string}[];theme_relevance?:number|string};
export type Story={nodes:GNode[];edges:GEdge[];focus?:FocusStock[];mode?:string};
export type Timeline={trade_date:number;role:string;lead_score?:number|string;confidence?:number|string;theme?:string};
