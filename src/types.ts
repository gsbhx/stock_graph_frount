export type Overview={trade_date:number;states:number;active_stocks:number;events:number;themes:number;relationships?:number;mode?:string};
export type Theme={theme_id:number;name:string;active_count:number;max_relevance?:number;sample_codes:string[]};
export type GNode={id:string;label:string;kind:'Event'|'Theme'|'Stock';properties:Record<string,unknown>};
export type GEdge={source:string;target:string;label:string};
export type FocusStock={code:string;name:string;role:string;lead_score?:number|string;confidence?:number|string;short_score?:number|string;trend_score?:number|string;capacity_score?:number|string;risk_score?:number|string;theme?:string;theme_id?:number|string;};
export type MarketStock=FocusStock & {themes:{theme_id:number;name:string;relevance?:number|string}[];theme_relevance?:number|string};
export type Story={nodes:GNode[];edges:GEdge[];focus?:FocusStock[];mode?:string};
export type Timeline={trade_date:number;role:string;lead_score?:number|string;confidence?:number|string;theme?:string};

export type OpportunityItem={code:string;name:string;theme:string;role:string;attack_score:number;rotation_score:number;industry_score:number;confidence:number;catalyst_score:number;risk_score:number;action:'ATTACK'|'WATCH'|'OBSERVE'|string;reasons:string[];risks:string[];scoring_model:string};
export type OpportunityResponse={trade_date:number;scoring_model:string;model_note:string;attack:OpportunityItem[];rotation:OpportunityItem[];industry:OpportunityItem[];all:OpportunityItem[]};
export type ResearchAssets={attribution:string|null;shortterm:string|null;industry:string|null;attribution_source?:string|null;shortterm_source?:string|null;industry_source?:string|null;errors?:Record<string,string>};
export type WorkflowStage={name:string;status:string;artifact?:string|null;error?:string|null;meta?:Record<string,unknown>|null};
export type WorkflowRun={run_id:string;trade_date:number;knowledge_mode?:'current'|'pit';status:string;run_dir?:string;research_assets?:ResearchAssets;stages:WorkflowStage[]};
export type ReportResponse={run:WorkflowRun;markdown:string};
