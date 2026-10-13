import { Fragment, type ReactNode } from 'react';

type Alignment = 'left' | 'center' | 'right';
type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][]; alignments: Alignment[] }
  | { type: 'code'; language: string; text: string }
  | { type: 'rule' };

function tableCells(line: string) {
  const escapedPipe = '\u0000';
  const source = line.trim().replace(/\\\|/g, escapedPipe);
  const content = source.startsWith('|') ? source.slice(1) : source;
  const unwrapped = content.endsWith('|') ? content.slice(0, -1) : content;
  return unwrapped.split('|').map((cell) => cell.replaceAll(escapedPipe, '|').trim());
}

function isTableSeparator(line: string) {
  const cells = tableCells(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isBlockStart(lines: string[], index: number) {
  const line = lines[index] ?? '';
  return /^#{1,6}\s+/.test(line)
    || /^```/.test(line)
    || /^\s*>/.test(line)
    || /^\s*([-+*]|\d+[.)])\s+/.test(line)
    || /^(\s*[-*_]){3,}\s*$/.test(line)
    || (line.includes('|') && isTableSeparator(lines[index + 1] ?? ''));
}

function parseMarkdown(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const codeFence = line.match(/^```([^\s`]*)/);
    if (codeFence) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) codeLines.push(lines[index++]);
      if (index < lines.length) index += 1;
      blocks.push({ type: 'code', language: codeFence[1], text: codeLines.join('\n') });
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
      index += 1;
      continue;
    }

    if (/^(\s*[-*_]){3,}\s*$/.test(line)) {
      blocks.push({ type: 'rule' });
      index += 1;
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) {
        quote.push(lines[index++].replace(/^\s*>\s?/, ''));
      }
      blocks.push({ type: 'quote', text: quote.join(' ') });
      continue;
    }

    if (line.includes('|') && isTableSeparator(lines[index + 1] ?? '')) {
      const headers = tableCells(line);
      const separator = tableCells(lines[index + 1]);
      const alignments = headers.map((_, cellIndex): Alignment => {
        const marker = separator[cellIndex] ?? '---';
        return marker.startsWith(':') && marker.endsWith(':') ? 'center' : marker.endsWith(':') ? 'right' : 'left';
      });
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].trim() && lines[index].includes('|')) {
        rows.push(tableCells(lines[index++]));
      }
      blocks.push({ type: 'table', headers, rows, alignments });
      continue;
    }

    const firstListItem = line.match(/^\s*([-+*]|\d+[.)])\s+(.+)$/);
    if (firstListItem) {
      const ordered = /^\d/.test(firstListItem[1]);
      const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index].match(/^\s*([-+*]|\d+[.)])\s+(.+)$/);
        if (!item || /^\d/.test(item[1]) !== ordered) break;
        items.push(item[2]);
        index += 1;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines, index)) {
      paragraph.push(lines[index++].trim());
    }
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }

  return blocks;
}

function inlineMarkdown(text: string): ReactNode[] {
  const syntax = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\((?:https?:\/\/|mailto:)[^)]+\))/g;
  const nodes: ReactNode[] = [];
  let previous = 0;
  let match: RegExpExecArray | null;

  while ((match = syntax.exec(text)) !== null) {
    if (match.index > previous) nodes.push(text.slice(previous, match.index));
    const value = match[0];
    let node: ReactNode = value;
    if (value.startsWith('**') || value.startsWith('__')) {
      node = <strong>{value.slice(2, -2)}</strong>;
    } else if (value.startsWith('`')) {
      node = <code>{value.slice(1, -1)}</code>;
    } else if (value.startsWith('*') || value.startsWith('_')) {
      node = <em>{value.slice(1, -1)}</em>;
    } else {
      const link = value.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) node = <a href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>;
    }
    nodes.push(<Fragment key={`${match.index}-${value}`}>{node}</Fragment>);
    previous = match.index + value.length;
  }

  if (previous < text.length) nodes.push(text.slice(previous));
  return nodes;
}

export function MarkdownReport({ markdown }: { markdown: string }) {
  const blocks = parseMarkdown(markdown);
  return (
    <article className="markdown-report">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const Tag = `h${Math.min(block.level, 4)}` as 'h1' | 'h2' | 'h3' | 'h4';
          return <Tag className={`markdown-heading level-${block.level}`} key={index}>{inlineMarkdown(block.text)}</Tag>;
        }
        if (block.type === 'paragraph') return <p key={index}>{inlineMarkdown(block.text)}</p>;
        if (block.type === 'quote') return <blockquote key={index}>{inlineMarkdown(block.text)}</blockquote>;
        if (block.type === 'rule') return <hr key={index} />;
        if (block.type === 'code') {
          return <pre className="markdown-code" key={index}><code>{block.text}</code></pre>;
        }
        if (block.type === 'list') {
          const Tag = block.ordered ? 'ol' : 'ul';
          return <Tag className="markdown-list" key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{inlineMarkdown(item)}</li>)}</Tag>;
        }
        return (
          <div className="markdown-table-wrap" key={index}>
            <table>
              <thead><tr>{block.headers.map((header, cellIndex) => <th key={cellIndex} style={{ textAlign: block.alignments[cellIndex] }}>{inlineMarkdown(header)}</th>)}</tr></thead>
              <tbody>{block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>{block.headers.map((_, cellIndex) => <td key={cellIndex} style={{ textAlign: block.alignments[cellIndex] }}>{inlineMarkdown(row[cellIndex] ?? '')}</td>)}</tr>
              ))}</tbody>
            </table>
          </div>
        );
      })}
    </article>
  );
}
