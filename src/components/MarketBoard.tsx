import { useMemo, useState } from 'react';
import type { MarketStock, Theme } from '../types';

const roleNames: Record<string, string> = {
  leader: '龙头',
  branch_leader: '分支龙头',
  frontline: '前排',
  short_frontline: '短线前排',
  trend_core: '趋势核心',
  trend_anchor: '趋势中军',
  capacity_core: '容量核心',
  risk_anchor: '风险观察',
};

function score(value?: number | string) {
  if (value == null || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return (Math.abs(number) <= 1 ? number * 100 : number).toFixed(1);
}

function confidence(value?: number | string) {
  if (value == null || value === '') return '—';
  const number = Number(value);
  return Number.isFinite(number) ? `${(Math.abs(number) <= 1 ? number * 100 : number).toFixed(0)}%` : '—';
}

export function MarketBoard({
  stocks,
  themes,
  selectedCode,
  onSelectStock,
}: {
  stocks: MarketStock[];
  themes: Theme[];
  selectedCode: string;
  onSelectStock: (stock: MarketStock) => void;
}) {
  const [query, setQuery] = useState('');
  const [themeFilter, setThemeFilter] = useState('');
  const [sortBy, setSortBy] = useState<'lead' | 'relevance'>('lead');

  const visibleStocks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return stocks
      .filter((stock) => !themeFilter || stock.themes.some((theme) => theme.name === themeFilter) || stock.theme === themeFilter)
      .filter((stock) => !normalizedQuery || `${stock.code} ${stock.name}`.toLocaleLowerCase().includes(normalizedQuery))
      .sort((a, b) => {
        const rawA = sortBy === 'lead' ? a.lead_score : a.theme_relevance;
        const rawB = sortBy === 'lead' ? b.lead_score : b.theme_relevance;
        const aScore = rawA == null || rawA === '' ? Number.NEGATIVE_INFINITY : Number(rawA);
        const bScore = rawB == null || rawB === '' ? Number.NEGATIVE_INFINITY : Number(rawB);
        const validA = Number.isFinite(aScore) ? aScore : Number.NEGATIVE_INFINITY;
        const validB = Number.isFinite(bScore) ? bScore : Number.NEGATIVE_INFINITY;
        return validB - validA || a.code.localeCompare(b.code);
      });
  }, [stocks, query, themeFilter, sortBy]);

  const scoredCount = stocks.filter((stock) => Number.isFinite(Number(stock.lead_score))).length;
  const roleMissingCount = stocks.filter((stock) => !stock.role).length;

  return (
    <section className="panel market-panel" aria-label="全市场个股">
      <div className="panel-head">
        <div>
          <span className="eyebrow">DAILY MARKET / ALL ACTIVE STOCKS</span>
          <h2>全市场个股</h2>
          <p className="focus-explainer">覆盖当日全部活跃标的，不依赖催化事件筛选；可按题材筛选或搜索个股。</p>
        </div>
        <span className="mode">全量数据</span>
      </div>

      <div className="market-summary">
        <span><strong>{stocks.length}</strong> 只活跃个股</span>
        <span><strong>{scoredCount}</strong> 只有 Lead Score</span>
        <span><strong>{themes.length}</strong> 个活跃题材</span>
        <span><strong>{roleMissingCount}</strong> 只角色待补</span>
      </div>

      <div className="market-controls">
        <label>
          <span className="sr-only">搜索股票名称或代码</span>
          <input type="search" placeholder="搜索名称或代码" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label>
          <span className="sr-only">按题材筛选</span>
          <select value={themeFilter} onChange={(event) => setThemeFilter(event.target.value)}>
            <option value="">全部题材</option>
            {themes.map((theme) => <option value={theme.name} key={theme.theme_id}>{theme.name}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">全市场排序方式</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as 'lead' | 'relevance')}>
            <option value="lead">按 Lead Score 排序</option>
            <option value="relevance">按题材相关度排序</option>
          </select>
        </label>
        <span className="market-result-count">显示 {visibleStocks.length} / {stocks.length}</span>
      </div>

      <div className="market-table" role="table" aria-label="当日全市场个股排名">
        <div className="market-row market-header" role="row">
          <span role="columnheader">排名</span>
          <span role="columnheader">个股</span>
          <span role="columnheader">所属题材</span>
          <span role="columnheader">角色</span>
          <span role="columnheader">Lead Score</span>
          <span role="columnheader">信心</span>
          <span role="columnheader">题材相关度</span>
        </div>
        <div className="market-rows" role="rowgroup">
          {visibleStocks.map((stock, index) => {
            const stockThemes = stock.themes.map((theme) => theme.name).filter(Boolean).join(' · ') || stock.theme || '未标注';
            return (
              <button
                type="button"
                role="row"
                className={'market-row market-stock-row' + (stock.code === selectedCode ? ' selected' : '')}
                key={stock.code}
                aria-label={`选择${stock.name} ${stock.code}，${stockThemes}，Lead Score ${score(stock.lead_score)}`}
                aria-pressed={stock.code === selectedCode}
                onClick={() => onSelectStock(stock)}
              >
                <span className="market-rank" role="cell">{String(index + 1).padStart(3, '0')}</span>
                <span className="market-company" role="cell"><strong>{stock.name || stock.code}</strong><small>{stock.code}</small></span>
                <span className="market-themes" role="cell" title={stockThemes}>{stockThemes}</span>
                <span role="cell">{(roleNames[stock.role] ?? stock.role) || '待补'}</span>
                <strong className="market-score" role="cell">{score(stock.lead_score)}</strong>
                <span role="cell">{confidence(stock.confidence)}</span>
                <span role="cell">{score(stock.theme_relevance)}</span>
              </button>
            );
          })}
          {visibleStocks.length === 0 && <div className="market-empty">没有符合条件的个股。</div>}
        </div>
      </div>
    </section>
  );
}
