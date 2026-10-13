import { useEffect, useMemo, useState } from 'react';
import { BookOpenText, BrainCircuit, GitBranch, Play, RefreshCw } from 'lucide-react';
import { api } from '../api';
import type { RegisteredWorkflow, ReportResponse, ResearchAssets, WorkflowRun } from '../types';
import { MarkdownReport } from './MarkdownReport';

export function ResearchConsole({ date, onComplete }: { date: number; onComplete?: () => void }) {
  const [mode, setMode] = useState<'current' | 'pit'>('current');
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [assets, setAssets] = useState<ResearchAssets | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const loadReport = async () => {
    try { setReport(await api.report(date)); } catch { setReport(null); }
  };
  const loadAssets = async () => {
    try { setAssets(await api.researchAssets()); } catch (cause) { setError(`工作流注册表检查失败：${String(cause)}`); }
  };

  useEffect(() => { setRun(null); setError(''); void loadReport(); void loadAssets(); }, [date]);

  const execute = async () => {
    setRunning(true); setError('');
    try {
      const next = await api.runResearch(date, mode);
      setRun(next);
      if (next.workflow_registry) setAssets(next.workflow_registry);
      else if (next.research_assets) setAssets(next.research_assets);
      await loadReport();
      onComplete?.();
    } catch (cause) { setError(String(cause)); }
    finally { setRunning(false); }
  };

  const workflows = useMemo<RegisteredWorkflow[]>(() => {
    if (assets?.workflows?.length) return [...assets.workflows].sort((a, b) => a.order - b.order);
    // v0.3 compatibility while backend/frontend are rolled out independently.
    const fallback: RegisteredWorkflow[] = [];
    const legacy = [
      ['attribution', 'Daily Stock Attribution', assets?.attribution, assets?.errors?.attribution],
      ['shortterm', 'A-Share Short-Term Research', assets?.shortterm, assets?.errors?.shortterm],
      ['industry', 'Long-Term Industry Structure Research', assets?.industry, assets?.errors?.industry],
    ] as const;
    legacy.forEach(([id, title, path, assetError], index) => {
      fallback.push({ id, title, version: 'legacy', order: (index + 1) * 10, enabled: true, depends_on: [], exports: [], manifest: '', asset_root: path || '', skills_root: path || '', ready: Boolean(path), error: assetError, nodes: 0 });
    });
    return fallback;
  }, [assets]);

  return (
    <section className="panel research-console" aria-label="多智能体研究中心">
      <div className="panel-head">
        <div>
          <span className="eyebrow">UNIFIED WORKFLOW ORCHESTRATOR / REPORT CENTER</span>
          <h2>统一研究编排与报告中心</h2>
          <p className="focus-explainer">平台从 Registry 自动发现研究工作流；依赖、Skill、Validator、Gate、重试和正式 exports 都由同一 Runtime 管理。</p>
        </div>
        <BrainCircuit size={24} />
      </div>

      <div className="registry-summary">
        <GitBranch size={16} />
        <span>Workflow Registry</span>
        <code>{assets?.registry || '.stock_graph/workflows'}</code>
        <strong>{workflows.filter(item => item.ready).length}/{workflows.length} READY</strong>
      </div>

      <div className="asset-grid workflow-grid">
        {workflows.map((workflow, index) => (
          <div className={`asset-card workflow-card ${workflow.ready ? 'ready' : 'missing'}`} key={workflow.id}>
            <div>
              <strong>{String(index + 1).padStart(2, '0')} · {workflow.title}</strong>
              <span>{workflow.ready ? 'READY' : 'MISSING'}</span>
            </div>
            <code>{workflow.asset_root || workflow.error || '工作流资产尚未解析'}</code>
            <small>
              {workflow.id} · {workflow.version}
              {workflow.nodes ? ` · ${workflow.nodes} nodes` : ''}
              {workflow.depends_on.length ? ` · depends: ${workflow.depends_on.join(' → ')}` : ' · root workflow'}
            </small>
            {workflow.exports.length > 0 && <small className="workflow-exports">exports: {workflow.exports.join(' · ')}</small>}
            {workflow.error && <small className="workflow-error">{workflow.error}</small>}
          </div>
        ))}
      </div>

      <div className="research-controls">
        <div className="knowledge-mode">
          <button className={mode === 'current' ? 'active' : ''} onClick={() => setMode('current')} type="button">当前知识</button>
          <button className={mode === 'pit' ? 'active' : ''} onClick={() => setMode('pit')} type="button">严格 PIT 回放</button>
        </div>
        <button className="run-research" type="button" onClick={() => void execute()} disabled={running || workflows.some(item => !item.ready)}>
          {running ? <RefreshCw size={17} className="spin" /> : <Play size={17} />}{running ? '统一编排执行中' : '运行完整研究图'}
        </button>
      </div>
      <p className="mode-help">{mode === 'current' ? '允许今天补抓到的旧闻按真实 published_at 回填历史时间线。' : '同时约束 known_at；晚抓数据不会泄露到当时的历史决策。'} 所有研究域都通过同一 Workflow Engine 执行。</p>
      {error && <div className="error">{error}</div>}
      {run && <>
        <div className="stage-strip">{run.stages.map(stage => <span className={`stage-pill ${stage.status.toLowerCase()}`} key={stage.name}><b>{stage.name}</b>{stage.status}</span>)}</div>
        <div className="stage-errors">{run.stages.filter(stage => stage.error).map(stage => <div key={stage.name}><strong>{stage.name}</strong><code>{stage.error}</code></div>)}</div>
      </>}
      <div className="report-view">
        <div className="report-title"><BookOpenText size={18} /><strong>页面研究报告</strong><span>{report?.run?.run_id ? report.run.run_id.slice(0, 8) : '尚未生成'}</span></div>
        {report?.markdown ? <div className="report-content"><MarkdownReport markdown={report.markdown} /></div> : <div className="report-empty">选择日期后运行完整研究图，报告会直接出现在这里。</div>}
      </div>
    </section>
  );
}
