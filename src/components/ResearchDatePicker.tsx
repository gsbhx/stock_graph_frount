import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import './ResearchDatePicker.css';

type Props = {
  value: number;
  availableDates?: number[];
  onChange: (date: number) => void;
};

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

function digits(date: number) {
  const raw = String(date);
  return {
    year: Number(raw.slice(0, 4)),
    month: Number(raw.slice(4, 6)),
    day: Number(raw.slice(6, 8)),
  };
}

function ymd(year: number, month: number, day: number) {
  return year * 10000 + month * 100 + day;
}

function readable(date: number) {
  const { year, month, day } = digits(date);
  return `${year}年${String(month).padStart(2, '0')}月${String(day).padStart(2, '0')}日`;
}

function localToday() {
  const d = new Date();
  return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** A click-based calendar independent of native browser date-input behavior. */
export function ResearchDatePicker({ value, availableDates = [], onChange }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = digits(value);
  const [viewYear, setViewYear] = useState(selected.year);
  const [viewMonth, setViewMonth] = useState(selected.month);

  const researchDays = new Set(availableDates);
  const latest = availableDates.length ? Math.max(...availableDates) : null;
  const firstDayIndex = (new Date(viewYear, viewMonth - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const cells: Array<number | null> = [
    ...Array.from({ length: firstDayIndex }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const show = () => {
    if (!open) {
      setViewYear(selected.year);
      setViewMonth(selected.month);
    }
    setOpen(!open);
  };
  const changeMonth = (offset: number) => {
    const moved = new Date(viewYear, viewMonth - 1 + offset, 1);
    setViewYear(moved.getFullYear());
    setViewMonth(moved.getMonth() + 1);
  };
  const pick = (date: number) => {
    onChange(date);
    setOpen(false);
  };

  const maxYear = Math.max(new Date().getFullYear() + 1, selected.year);
  const minYear = Math.min(2010, selected.year);
  return (
    <div className="research-date-picker" ref={wrapperRef}>
      <button
        type="button"
        className="research-date-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`选择研究日期，当前${readable(value)}`}
        onClick={show}
      >
        <CalendarDays size={17} />
        <span>{readable(value)}</span>
        <ChevronDown size={15} className={open ? 'date-chevron opened' : 'date-chevron'} />
      </button>
      {open && (
        <div className="research-calendar" role="dialog" aria-label="选择研究日期">
          <div className="calendar-month-navigation">
            <button type="button" aria-label="上个月" onClick={() => changeMonth(-1)}>
              <ChevronLeft size={18} />
            </button>
            <div className="calendar-month-selectors">
              <select aria-label="年份" value={viewYear} onChange={(e) => setViewYear(Number(e.target.value))}>
                {Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i).reverse().map(y => (
                  <option value={y} key={y}>{y}年</option>
                ))}
              </select>
              <select aria-label="月份" value={viewMonth} onChange={(e) => setViewMonth(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option value={m} key={m}>{m}月</option>
                ))}
              </select>
            </div>
            <button type="button" aria-label="下个月" onClick={() => changeMonth(1)}>
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="calendar-grid" role="grid" aria-label={`${viewYear}年${viewMonth}月`}>
            {WEEKDAYS.map((label, i) => <div className="calendar-weekday" key={i}>周{label}</div>)}
            {cells.map((day, index) => {
              if (day === null) return <span aria-hidden="true" className="calendar-blank" key={`blank-${index}`} />;
              const dayValue = ymd(viewYear, viewMonth, day);
              const hasResearch = researchDays.has(dayValue);
              const isSelected = value === dayValue;
              const isToday = localToday() === dayValue;
              const weekend = index % 7 >= 5;
              return (
                <button
                  type="button"
                  role="gridcell"
                  key={dayValue}
                  aria-selected={isSelected}
                  aria-label={`${readable(dayValue)}${hasResearch ? '，已有研究数据' : '，尚无已验证研究数据'}`}
                  title={hasResearch ? '已有研究数据' : '可选择此日期执行研究'}
                  className={[
                    'calendar-day',
                    hasResearch ? 'has-research' : '',
                    isSelected ? 'selected' : '',
                    isToday ? 'today' : '',
                    weekend ? 'weekend' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => pick(dayValue)}
                >
                  {day}
                  {hasResearch && <i className="calendar-research-dot" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          <div className="calendar-footer">
            <small><i className="calendar-research-dot" /> 已有研究数据</small>
            <div>
              <button type="button" onClick={() => pick(localToday())}>今天</button>
              {latest !== null && <button type="button" onClick={() => pick(latest)}>最新研究日</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
