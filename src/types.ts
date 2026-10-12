export type Overview={trade_date:number;states:number;active_stocks:number;events:number;themes:number;mode?:string};
export type Theme={theme_id:number;name:string;active_count:number;max_relevance?:number;sample_codes:string[]};
export type GNode={id:string;label:string;kind:'Event'|'Theme'|'Stock';properties:Record<string,unknown>};
export type GEdge={source:string;target:string;label:string};
export type Story={nodes:GNode[];edges:GEdge[];mode?:string};
export type Timeline={trade_date:number;role:string;lead_score?:number;confidence?:number;theme?:string};
