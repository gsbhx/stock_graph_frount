import { useEffect, useState } from 'react';
import { BookOpenText, BrainCircuit, Play, RefreshCw } from 'lucide-react';
import { api } from '../api';
import type { ReportResponse, WorkflowRun } from '../types';
import { MarkdownReport } from './MarkdownReport';

export function ResearchConsole({ date, onComplete }: { date: number; onComplete?: () => void }) {
  const [mode, setMode] = useState<'current' | 'pit'>('current');
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const loadReport = async () => {
    try { setReport(await api.report(date)); } catch { setReport(null); }
  };

  useEffect(() => { setRun(null); setError(''); void loadReport(); }, [date]);

  const execute = async () => {
    setRunning(true); setError('');
    try {
      const next = await api.runResearch(date, mode);
      setRun(next);
      await loadReport();
      onComplete?.();
    } catch (cause) { setError(String(cause)); }
    finally { setRunning(false); }
  };

  return (
    <section className="panel research-console" aria-label="多智能体研究中心">
      <div className="panel-head">
        <div><span className="eyebrow">MULTI-AGENT RESEARCH / REPORT CENTER</span><h2>研究与报告中心</h2><p className="focus-explainer">归因回答 Why，短线回答 Now，产业回答 Long-term；三套工作流独立验证后再汇总。</p></div>
        <BrainCircuit size={24} />
      </div>
      <div className="research-controls">
        <div className="knowledge-mode">
          <button className={mode === 'current' ? 'active' : ''} onClick={() => setMode('current')} type="button">当前知识</button>
          <button className={mode === 'pit' ? 'active' : ''} onClick={() => setMode('pit')} type="button">严格 PIT 回放</button>
        </div>
        <button className="run-research" type="button" onClick={() => void execute()} disabled={running}>
          {running ? <RefreshCw size={17} className="spin" /> : <Play size={17} />}{running ? '研究执行中' : '运行全量研究'}
        </button>
      </div>
      <p className="mode-help">{mode === 'current' ? '允许今天补抓到的旧闻按真实 published_at 回填历史时间线。' : '同时约束 known_at；晚抓数据不会泄露到当时的历史决策。'}</p>
      {error && <div className="error">{error}</div>}
      {run && <div className="stage-strip">{run.stages.map(stage => <span className={`stage-pill ${stage.status.toLowerCase()}`} key={stage.name}><b>{stage.name}</b>{stage.status}</span>)}</div>}
      <div className="report-view">
        <div className="report-title"><BookOpenText size={18} /><strong>页面研究报告</strong><span>{report?.run?.run_id ? report.run.run_id.slice(0, 8) : '尚未生成'}</span></div>
        {report?.markdown ? <div className="report-content"><MarkdownReport markdown={report.markdown} /></div> : <div className="report-empty">选择日期后运行研究，报告会直接出现在这里。</div>}
      </div>
    </section>
  );
}
