import { ArrowUpRight, Layers3, Radar, Sprout } from 'lucide-react';
import type { OpportunityItem, OpportunityResponse } from '../types';

const lanes = [
  { key: 'attack', title: '明日进攻', subtitle: 'ATTACK', score: 'attack_score', Icon: ArrowUpRight },
  { key: 'rotation', title: '轮动潜伏', subtitle: 'ROTATION', score: 'rotation_score', Icon: Radar },
  { key: 'industry', title: '长期产业', subtitle: 'INDUSTRY', score: 'industry_score', Icon: Sprout },
] as const;

const roleName: Record<string, string> = {
  leader: '龙头', branch_leader: '分支龙头', frontline: '前排', short_frontline: '短线前排',
  trend_core: '趋势核心', trend_anchor: '趋势中军', capacity_core: '容量核心', risk_anchor: '风险观察',
};

export function OpportunityBoard({ data, onSelect }: { data: OpportunityResponse | null; onSelect: (item: OpportunityItem) => void }) {
  return (
    <section className="panel opportunity-panel" aria-label="今日机会驾驶舱">
      <div className="panel-head opportunity-head">
        <div>
          <span className="eyebrow">OPPORTUNITY ENGINE / THREE HORIZONS</span>
          <h2>今日机会驾驶舱</h2>
          <p className="focus-explainer">把“今天最强”与“接下来值得关注”分开：进攻、轮动、产业三个时间尺度独立排序。</p>
        </div>
        <span className="mode">{data?.scoring_model ?? '—'}</span>
      </div>
      <div className="opportunity-grid">
        {lanes.map(({ key, title, subtitle, score, Icon }) => {
          const rows = data?.[key] ?? [];
          return (
            <div className="opportunity-lane" key={key}>
              <div className="opportunity-lane-title"><Icon size={18} /><div><strong>{title}</strong><small>{subtitle}</small></div></div>
              <div className="opportunity-list">
                {rows.slice(0, 6).map((item, index) => (
                  <button className="opportunity-card" type="button" key={`${key}-${item.code}`} onClick={() => onSelect(item)}>
                    <span className="opportunity-rank">{String(index + 1).padStart(2, '0')}</span>
                    <span className="opportunity-company"><strong>{item.name}</strong><small>{item.code} · {item.theme || '题材待补'}</small></span>
                    <span className="opportunity-role">{roleName[item.role] ?? (item.role || '角色待补')}</span>
                    <span className="opportunity-score"><b>{item[score].toFixed(1)}</b><small>{item.action}</small></span>
                    <span className="opportunity-reason">{item.reasons[0] ?? '等待更多结构证据'}</span>
                    <span className={'opportunity-risk' + (item.risks.length ? ' active' : '')}>{item.risks[0] ?? '暂无显著风险标签'}</span>
                  </button>
                ))}
                {!rows.length && <div className="opportunity-empty"><Layers3 size={18} />暂无可评分数据</div>}
              </div>
            </div>
          );
        })}
      </div>
      {data?.model_note && <p className="opportunity-note">{data.model_note}</p>}
    </section>
  );
}
