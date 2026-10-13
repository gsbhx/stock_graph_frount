import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, BookOpenText, BrainCircuit, GitBranch, Play, RefreshCw, RotateCcw, ShieldAlert } from 'lucide-react';
import { api } from '../api';
import type { RegisteredWorkflow, ReportResponse, ResearchAssets, ResumeDecision, RunEvent, WorkflowRun } from '../types';
import { MarkdownReport } from './MarkdownReport';

const STOPPED = new Set(['PASS', 'PASS_DEGRADED', 'FAIL', 'REVIEW_REQUIRED', 'WAITING_REVIEW']);
const COMPLETE = new Set(['PASS', 'PASS_DEGRADED', 'FAIL']);

function formatClock(ts?: number | null) {
  if (!ts) return '';
  return new Date(ts * 1000).toLocaleTimeString('zh-CN', { hour12: false });
}

export function ResearchConsole({ date, onComplete }: { date: number; onComplete?: () => void }) {
  const [mode, setMode] = useState<'current' | 'pit'>('current');
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [assets, setAssets] = useState<ResearchAssets | null>(null);
  const [running, setRunning] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [error, setError] = useState('');
  const eventCursor = useRef(0);

  const loadReport = async () => {
    try { setReport(await api.report(date)); } catch { setReport(null); }
  };
  const loadAssets = async () => {
    try { setAssets(await api.researchAssets()); } catch (cause) { setError(`工作流注册表检查失败：${String(cause)}`); }
  };

  useEffect(() => {
    setRun(null); setEvents([]); eventCursor.current = 0; setRunning(false); setReviewNote(''); setError('');
    void loadReport(); void loadAssets();
  }, [date]);

  useEffect(() => {
    if (!run?.run_id || STOPPED.has(run.status)) return;
    const runId = run.run_id;
    let stopped = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const poll = async () => {
      try {
        const [next, eventPage] = await Promise.all([
          api.workflowRun(runId),
          api.workflowEvents(runId, eventCursor.current),
        ]);
        if (stopped) return;
        setRun(next);
        if (eventPage.events.length) {
          eventCursor.current = eventPage.next_after;
          setEvents(previous => [...previous, ...eventPage.events].slice(-160));
        }
        if (STOPPED.has(next.status)) {
          stopped = true;
          if (timer) clearInterval(timer);
          setRunning(false);
          if (COMPLETE.has(next.status)) {
            await loadReport();
            onComplete?.();
          }
        }
      } catch (cause) {
        if (!stopped) setError(`运行状态读取失败：${String(cause)}`);
      }
    };

    void poll();
    timer = setInterval(() => void poll(), 1000);
    return () => { stopped = true; if (timer) clearInterval(timer); };
  }, [run?.run_id, run?.status]);

  const execute = async () => {
    setRunning(true); setError(''); setEvents([]); setReviewNote(''); eventCursor.current = 0;
    try {
      const queued = await api.runResearch(date, mode);
      setRun(queued);
    } catch (cause) {
      setError(String(cause)); setRunning(false);
    }
  };

  const resume = async (decision?: ResumeDecision) => {
    if (!run?.run_id) return;
    setRunning(true); setError('');
    try {
      const resumed = await api.resumeWorkflow(run.run_id, decision);
      setRun(resumed);
      if (decision) setReviewNote('');
    } catch (cause) {
      setError(String(cause)); setRunning(false);
    }
  };

  const workflows = useMemo<RegisteredWorkflow[]>(() => {
    if (assets?.workflows?.length) return [...assets.workflows].sort((a, b) => a.order - b.order);
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

  const progress = run?.progress;
  const progressPct = progress?.total ? Math.min(100, Math.round(progress.completed / progress.total * 100)) : 0;
  const canRecoverCrash = Boolean(run?.run_id && ['FAIL', 'REVIEW_REQUIRED'].includes(run.status) && !run.review_payload);
  const waitingReview = run?.status === 'WAITING_REVIEW' || Boolean(run?.review_payload);
  const stages = run?.stages || [];

  return (
    <section className="panel research-console" aria-label="多智能体研究中心">
      <div className="panel-head">
        <div>
          <span className="eyebrow">LANGGRAPH MULTI-AGENT ORCHESTRATOR / LIVE RUN CENTER</span>
          <h2>统一研究编排与运行中心</h2>
          <p className="focus-explainer">Manifest 经 Registry 编译为 LangGraph StateGraph；checkpoint、断点恢复和人工 interrupt 由 LangGraph 管理，页面实时展示当前 workflow、node 与动作。</p>
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
            <small>{workflow.id} · {workflow.version}{workflow.nodes ? ` · ${workflow.nodes} nodes` : ''}{workflow.depends_on.length ? ` · depends: ${workflow.depends_on.join(' → ')}` : ' · root workflow'}</small>
            {workflow.exports.length > 0 && <small className="workflow-exports">exports: {workflow.exports.join(' · ')}</small>}
            {workflow.error && <small className="workflow-error">{workflow.error}</small>}
          </div>
        ))}
      </div>

      <div className="research-controls">
        <div className="knowledge-mode">
          <button className={mode === 'current' ? 'active' : ''} onClick={() => setMode('current')} type="button" disabled={running}>当前知识</button>
          <button className={mode === 'pit' ? 'active' : ''} onClick={() => setMode('pit')} type="button" disabled={running}>严格 PIT 回放</button>
        </div>
        <div className="run-actions">
          {canRecoverCrash && <button className="resume-research" type="button" onClick={() => void resume()} disabled={running}><RotateCcw size={16} />恢复 LangGraph Thread</button>}
          <button className="run-research" type="button" onClick={() => void execute()} disabled={running || workflows.some(item => !item.ready)}>
            {running ? <RefreshCw size={17} className="spin" /> : <Play size={17} />}{running ? 'LangGraph 执行中' : '运行完整研究图'}
          </button>
        </div>
      </div>
      <p className="mode-help">{mode === 'current' ? '允许当前已抓取证据进入真实发布时间线。' : '同时约束 known_at；晚抓数据不会泄露到历史决策。'} 执行断点由 persistent LangGraph checkpointer 保存，RunStore 只负责可观测审计。</p>

      {error && <div className="error">{error}</div>}

      {run && <div className={`live-run ${run.status.toLowerCase()}`}>
        <div className="live-run-head">
          <div><Activity size={17}/><strong>Run {run.run_id.slice(0, 8)}</strong><span className="run-status">{run.status}</span></div>
          <small>{run.resume_count ? `已恢复 ${run.resume_count} 次` : '首次执行'}{run.updated_at ? ` · ${formatClock(run.updated_at)}` : ''}</small>
        </div>
        <div className="live-progress-track"><span style={{ width: `${progressPct}%` }} /></div>
        <div className="live-progress-meta">
          <strong>{progress?.total ? `${progress.completed}/${progress.total}` : run.status === 'QUEUED' ? '等待执行' : '准备工作流'}</strong>
          <span>{progressPct}%</span>
        </div>
        <div className="current-execution">
          <div><small>STAGE</small><strong>{run.current_stage || '—'}</strong></div>
          <div><small>WORKFLOW</small><strong>{run.current_workflow || '—'}</strong></div>
          <div><small>NODE</small><strong>{run.current_node || '—'}</strong></div>
          <div className="current-action"><small>正在做什么</small><strong>{run.current_action || (STOPPED.has(run.status) ? '运行暂停/结束' : '准备中')}</strong></div>
        </div>
        {run.langgraph_thread_id && <div className="thread-id"><small>LANGGRAPH THREAD</small><code>{run.langgraph_thread_id}</code></div>}
        {run.error && !waitingReview && <div className="run-error">{run.error}</div>}

        {waitingReview && <div className="human-review-panel">
          <div className="human-review-title"><ShieldAlert size={18}/><div><strong>需要人工审核</strong><small>LangGraph interrupt 已保存当前状态，选择动作后从原 thread 继续。</small></div></div>
          <div className="human-review-context">
            <span><small>WORKFLOW</small><b>{run.review_payload?.workflow || run.current_workflow || '—'}</b></span>
            <span><small>NODE</small><b>{run.review_payload?.node || run.current_node || '—'}</b></span>
          </div>
          <p>{run.review_payload?.reason || run.error || 'Validator 要求人工确认。'}</p>
          <textarea value={reviewNote} onChange={event => setReviewNote(event.target.value)} placeholder="可选：填写人工审核备注" rows={2}/>
          <div className="human-review-actions">
            <button type="button" disabled={running} onClick={() => void resume({action:'retry', note:reviewNote})}><RotateCcw size={15}/>补证据 / 重试</button>
            <button type="button" disabled={running} onClick={() => void resume({action:'continue_degraded', note:reviewNote})}>人工确认继续</button>
            <button className="danger" type="button" disabled={running} onClick={() => void resume({action:'stop', note:reviewNote})}>停止工作流</button>
          </div>
        </div>}

        {events.length > 0 && <div className="run-events">
          <div className="event-title"><strong>运行事件</strong><small>最近 {Math.min(events.length, 12)} 条</small></div>
          {events.slice(-12).reverse().map(event => <div className="event-row" key={event.seq}>
            <time>{formatClock(event.ts)}</time>
            <span className={`event-status ${(event.status || '').toLowerCase()}`}>{event.status || event.event}</span>
            <strong>{[event.workflow, event.node].filter(Boolean).join(' / ') || event.action || event.event}</strong>
            <small>{event.action && event.node ? event.action : event.message || ''}{event.duration_ms != null ? ` · ${event.duration_ms}ms` : ''}{event.attempt && event.attempt > 1 ? ` · attempt ${event.attempt}` : ''}</small>
          </div>)}
        </div>}
      </div>}

      {stages.length > 0 && <>
        <div className="stage-strip">{stages.map(stage => <span className={`stage-pill ${stage.status.toLowerCase()}`} key={stage.name}><b>{stage.name}</b>{stage.status}</span>)}</div>
        <div className="stage-errors">{stages.filter(stage => stage.error).map(stage => <div key={stage.name}><strong>{stage.name}</strong><code>{stage.error}</code></div>)}</div>
      </>}

      <div className="report-view">
        <div className="report-title"><BookOpenText size={18} /><strong>页面研究报告</strong><span>{report?.run?.run_id ? report.run.run_id.slice(0, 8) : '尚未生成'}</span></div>
        {report?.markdown ? <div className="report-content"><MarkdownReport markdown={report.markdown} /></div> : <div className="report-empty">运行完整研究图后，报告会直接出现在这里；执行过程中可在上方实时查看 LangGraph 节点状态。</div>}
      </div>
    </section>
  );
}
