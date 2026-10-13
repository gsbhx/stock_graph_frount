import { useMemo, useState, type KeyboardEvent } from 'react';
import type { GEdge, GNode, Story } from '../types';

const W = 900;
const ROW_GAP = 66;
const TOP_BOTTOM = 180;
const NODE_SIZES = {
  Event: { width: 220, height: 66 },
  Theme: { width: 174, height: 62 },
  Stock: { width: 166, height: 58 },
} as const;
const LAYER_X = { Event: 125, Theme: 450, Stock: 775 } as const;

type PositionedNode = GNode & { x: number; y: number };
type DisplayEdge = GEdge & { id: string; relation: 'affects' | 'membership'; displayLabel: string };

function displayEdges(edges: GEdge[], nodesById: Map<string, GNode>): DisplayEdge[] {
  const result: DisplayEdge[] = [];
  edges.forEach((edge, index) => {
    const source = nodesById.get(edge.source);
    const target = nodesById.get(edge.target);
    if (!source || !target) return;

    if (edge.label === 'IN_THEME') {
      const membership = source.kind === 'Theme' && target.kind === 'Stock'
        ? { source: edge.source, target: edge.target }
        : source.kind === 'Stock' && target.kind === 'Theme'
          ? { source: edge.target, target: edge.source }
          : null;
      if (!membership) return;
      result.push({
        ...edge,
        ...membership,
        id: `${index}:${edge.source}:${edge.target}`,
        relation: 'membership',
        displayLabel: '包含个股',
      });
      return;
    }

    if (edge.label === 'AFFECTS' && source.kind === 'Event') {
      result.push({
        ...edge,
        id: `${index}:${edge.source}:${edge.target}`,
        relation: 'affects',
        displayLabel: '影响',
      });
    }
  });
  return result;
}

function sortByConnections(nodes: GNode[], allNodes: GNode[], edges: DisplayEdge[], neighborNodes: GNode[]) {
  const byId = new Map<string, GNode>(allNodes.map((node) => [node.id, node] as [string, GNode]));
  const score = new Map<string, number[]>();
  const neighborOrder = new Map<string, number>(neighborNodes.map((node, index) => [node.id, index] as [string, number]));

  for (const edge of edges) {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (source && neighborOrder.has(source.id) && target) {
      score.set(target.id, [...(score.get(target.id) ?? []), neighborOrder.get(source.id) ?? 0]);
    }
    if (target && neighborOrder.has(target.id) && source) {
      score.set(source.id, [...(score.get(source.id) ?? []), neighborOrder.get(target.id) ?? 0]);
    }
  }

  const average = (id: string) => {
    const values = score.get(id);
    return values?.length ? values.reduce((sum, value) => sum + value, 0) / values.length : Number.POSITIVE_INFINITY;
  };
  return [...nodes].sort((a, b) => average(a.id) - average(b.id) || a.label.localeCompare(b.label, 'zh-CN'));
}

function boundaryPoint(from: PositionedNode, to: PositionedNode) {
  const size = NODE_SIZES[from.kind];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const scale = 1 / Math.sqrt((dx * dx) / ((size.width / 2) ** 2) + (dy * dy) / ((size.height / 2) ** 2));
  return { x: from.x + dx * scale, y: from.y + dy * scale };
}

function nodeCode(node: GNode) {
  return String(node.properties.code ?? '');
}

export function StoryGraph({
  story,
  onSelect,
  selectedNodeId,
}: {
  story: Story;
  onSelect: (node: GNode) => void;
  selectedNodeId: string;
}) {
  const [hoveredEdgeId, setHoveredEdgeId] = useState('');
  const nodesById = useMemo(
    () => new Map<string, GNode>(story.nodes.map((node) => [node.id, node] as [string, GNode])),
    [story.nodes],
  );
  const edges = useMemo(() => displayEdges(story.edges, nodesById), [story.edges, nodesById]);
  const layers = useMemo(() => {
    const events = story.nodes.filter((node) => node.kind === 'Event').sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
    const themes = sortByConnections(story.nodes.filter((node) => node.kind === 'Theme'), story.nodes, edges, events);
    const stocks = sortByConnections(story.nodes.filter((node) => node.kind === 'Stock'), story.nodes, edges, themes);
    return { Event: events, Theme: themes, Stock: stocks };
  }, [story.nodes, edges]);
  const themeStockCounts = new Map<string, number>();
  edges.forEach((edge) => {
    if (edge.relation === 'membership') {
      themeStockCounts.set(edge.source, (themeStockCounts.get(edge.source) ?? 0) + 1);
    }
  });

  const maxLayerSize = Math.max(1, layers.Event.length, layers.Theme.length, layers.Stock.length);
  const height = Math.max(430, TOP_BOTTOM + (maxLayerSize - 1) * ROW_GAP);
  const positions = useMemo(() => {
    const map = new Map<string, PositionedNode>();
    (Object.keys(layers) as (keyof typeof layers)[]).forEach((kind) => {
      const list = layers[kind];
      const firstY = height / 2 - ((list.length - 1) * ROW_GAP) / 2;
      list.forEach((node, index) => map.set(node.id, { ...node, x: LAYER_X[kind], y: firstY + index * ROW_GAP }));
    });
    return map;
  }, [height, layers]);

  const relatedIds = new Set<string>();
  const selectedNodeIsInGraph = nodesById.has(selectedNodeId);
  if (selectedNodeIsInGraph) {
    relatedIds.add(selectedNodeId);
    edges.forEach((edge) => {
      if (edge.source === selectedNodeId) relatedIds.add(edge.target);
      if (edge.target === selectedNodeId) relatedIds.add(edge.source);
    });
  }

  const handleNodeKey = (event: KeyboardEvent<SVGGElement>, node: GNode) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(node);
    }
  };

  return (
    <div className="graph-wrap">
      {story.nodes.length === 0 ? (
        <div className="graph-empty">当前交易日暂无可展示的事件、题材或个股关系。</div>
      ) : (
        <>
          <div className="graph-summary" aria-live="polite">
            <span>当前视图</span>
            <span>{story.nodes.length} 个节点</span>
            <span>{edges.length} 条关系</span>
            {edges.length === 0 && <span className="graph-no-relations">当前图谱还没有关系数据</span>}
          </div>
          <svg
            viewBox={`0 0 ${W} ${height}`}
            className="story-svg"
            role="group"
            aria-label="市场关系图：催化事件影响题材或个股，题材包含个股"
          >
            <defs>
              <marker id="arrow-affects" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" className="arrow-affects" />
              </marker>
              <marker id="arrow-membership" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" className="arrow-membership" />
              </marker>
            </defs>

            {(Object.keys(layers) as (keyof typeof layers)[]).map((kind) => (
              <g key={kind} className="graph-layer-label">
                <text x={LAYER_X[kind]} y="35" textAnchor="middle">{kind === 'Event' ? '催化事件' : kind === 'Theme' ? '关联题材' : '相关个股'}</text>
                <text x={LAYER_X[kind]} y="53" textAnchor="middle" className="layer-count">{layers[kind].length}</text>
              </g>
            ))}

            {edges.map((edge) => {
              const from = positions.get(edge.source);
              const to = positions.get(edge.target);
              if (!from || !to) return null;
              const start = boundaryPoint(from, to);
              const end = boundaryPoint(to, from);
              const midpointX = (start.x + end.x) / 2;
              const midpointY = (start.y + end.y) / 2;
              const highlighted = hoveredEdgeId === edge.id || relatedIds.has(edge.source) && relatedIds.has(edge.target);
              const dimmed = selectedNodeIsInGraph && !highlighted;
              const showLabel = hoveredEdgeId === edge.id || highlighted || edges.length <= 10;
              const sourceLabel = nodesById.get(edge.source)?.label ?? edge.source;
              const targetLabel = nodesById.get(edge.target)?.label ?? edge.target;
              return (
                <g
                  key={edge.id}
                  className={`edge ${edge.relation}${highlighted ? ' highlighted' : ''}${dimmed ? ' dimmed' : ''}`}
                  onMouseEnter={() => setHoveredEdgeId(edge.id)}
                  onMouseLeave={() => setHoveredEdgeId('')}
                >
                  <title>{`${sourceLabel} — ${edge.displayLabel} → ${targetLabel}`}</title>
                  <line
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    markerEnd={`url(#arrow-${edge.relation})`}
                  />
                  <line className="edge-hit-area" x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
                  {showLabel && (
                    <g className="edge-label" transform={`translate(${midpointX}, ${midpointY})`}>
                      <rect x="-30" y="-11" width="60" height="22" rx="8" />
                      <text textAnchor="middle" dominantBaseline="central">{edge.displayLabel}</text>
                    </g>
                  )}
                </g>
              );
            })}

            {story.nodes.map((node) => {
              const point = positions.get(node.id);
              if (!point) return null;
              const size = NODE_SIZES[node.kind];
              const selected = selectedNodeId === node.id;
              const isFocus = node.kind === 'Stock' && node.properties.focus_rank != null;
              const related = relatedIds.has(node.id);
              const dimmed = selectedNodeIsInGraph && !related;
              const code = nodeCode(node);
              let secondary = '催化事件';
              if (node.kind === 'Stock') {
                secondary = code;
              } else if (node.kind === 'Theme') {
                const relatedStockCount = themeStockCounts.get(node.id);
                secondary = relatedStockCount != null
                  ? `图中关联 ${relatedStockCount} 只个股`
                  : node.properties.active_count != null
                    ? `${String(node.properties.active_count)} 只活跃个股`
                    : '题材';
              }
              const maxLabelLength = Math.floor((size.width - 26) / 13);
              const visibleLabel = node.label.length > maxLabelLength
                ? `${node.label.slice(0, maxLabelLength - 1)}…`
                : node.label;
              return (
                <g
                  key={node.id}
                  className={`node ${node.kind.toLowerCase()}${isFocus ? ' focus' : ''}${selected ? ' selected' : ''}${dimmed ? ' dimmed' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`选择${node.kind === 'Stock' ? '个股' : node.kind === 'Theme' ? '题材' : '事件'}：${node.label}`}
                  aria-pressed={selected}
                  onClick={() => onSelect(node)}
                  onKeyDown={(event) => handleNodeKey(event, node)}
                >
                  <title>{node.label}{code ? `（${code}）` : ''}</title>
                  <rect
                    x={point.x - size.width / 2}
                    y={point.y - size.height / 2}
                    width={size.width}
                    height={size.height}
                    rx="14"
                  />
                  <text className="node-label" x={point.x} y={point.y - 2} textAnchor="middle">{visibleLabel}</text>
                  <text className="node-secondary" x={point.x} y={point.y + 17} textAnchor="middle">{secondary}</text>
                </g>
              );
            })}
          </svg>
          <div className="graph-legend" aria-label="关系图例">
            <span><i className="legend-line affects" />事件影响</span>
            <span><i className="legend-line membership" />题材包含个股</span>
            <small>选择节点可查看它直接关联的关系</small>
          </div>
        </>
      )}
    </div>
  );
}
