import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { asDate, dateKey, fromDate, monthCells, moveDays, moveMonth, sameDate, sameMonth, type CalendarDate } from "../lib/calendar";
import s from "./DatePicker.module.css";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const shortViewport = "(max-height: 222px)";
const weekdayIndex = (date: CalendarDate) => (asDate(date).getDay() + 6) % 7;
const fullDate = new Intl.DateTimeFormat("en", { dateStyle: "full" });
const monthLabel = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });
const readableDate = (date: CalendarDate) => fullDate.format(asDate(date));

export function DatePicker() {
  const [today, setToday] = useState(() => fromDate(new Date()));
  const [selected, setSelected] = useState(today);
  const [cursor, setCursor] = useState(today);
  const [compact, setCompact] = useState(() => matchMedia(shortViewport).matches);
  const [theme, setTheme] = useState(() => new URLSearchParams(location.search).get("theme") === "light" ? "light" : "dark");
  const [uiStyle, setUiStyle] = useState(() => new URLSearchParams(location.search).get("style") ?? undefined);
  const calendar = useRef<HTMLElement>(null);
  const focusOnUpdate = useRef(false);
  const weekStart = moveDays(cursor, -weekdayIndex(cursor));
  const dates = compact ? weekdays.map((_, index) => moveDays(weekStart, index)) : monthCells(cursor);

  useEffect(() => {
    const media = matchMedia(shortViewport);
    const resize = () => setCompact(media.matches);
    const syncEmbed = (event: MessageEvent) => {
      if (event.source !== parent || event.origin !== location.origin || event.data?.type !== "ui-moments:embed") return;
      setTheme(event.data.theme === "light" ? "light" : "dark");
      if (typeof event.data.style === "string") setUiStyle(event.data.style);
    };
    media.addEventListener("change", resize);
    window.addEventListener("message", syncEmbed);
    return () => {
      media.removeEventListener("change", resize);
      window.removeEventListener("message", syncEmbed);
    };
  }, []);

  useLayoutEffect(() => {
    if (!focusOnUpdate.current) return;
    calendar.current?.querySelector<HTMLButtonElement>(`[data-date="${dateKey(cursor)}"]`)?.focus();
    focusOnUpdate.current = false;
  }, [cursor]);

  function select(date: CalendarDate) {
    focusOnUpdate.current = true;
    setSelected(date);
    setCursor(date);
  }

  function browse(direction: number) {
    setCursor(date => compact ? moveDays(date, direction * 7) : moveMonth(date, direction));
  }

  function returnToToday() {
    const date = fromDate(new Date());
    setToday(date);
    select(date);
  }

  function onDayKey(event: KeyboardEvent<HTMLButtonElement>, date: CalendarDate) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const weekday = weekdayIndex(date);
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -weekday, End: 6 - weekday };
    let next: CalendarDate;
    if (Object.hasOwn(offsets, event.key)) next = moveDays(date, offsets[event.key]);
    else if (event.key === "PageUp" || event.key === "PageDown") next = moveMonth(date, event.key === "PageUp" ? -1 : 1);
    else return;
    event.preventDefault();
    focusOnUpdate.current = true;
    setCursor(next);
  }

  return (
    <div className={s.viewport} data-theme={theme} data-ui-style={uiStyle}>
      <section className={s.calendar} data-compact={compact} aria-label="Date picker" ref={calendar}>
        <header className={s.header}>
          <strong aria-live="polite">{monthLabel.format(asDate(cursor))}</strong>
          <div className={s.nav}>
            <button type="button" onClick={() => browse(-1)} aria-label={compact ? "Previous week" : "Previous month"}>
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" /></svg>
            </button>
            <button type="button" onClick={() => browse(1)} aria-label={compact ? "Next week" : "Next month"}>
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg>
            </button>
          </div>
        </header>
        <div className={s.grid} role="group" aria-label={compact ? "Dates this week" : "Dates this month"}>
          {weekdays.map(day => <span key={day} className={s.weekday} aria-hidden="true">{day}</span>)}
          {dates.map(date => {
            const key = dateKey(date);
            return (
              <button key={key} type="button" className={s.day} data-date={key}
                data-outside={!sameMonth(date, cursor)} tabIndex={sameDate(date, cursor) ? 0 : -1}
                aria-label={readableDate(date)} aria-current={sameDate(date, today) ? "date" : undefined}
                aria-pressed={sameDate(date, selected)} onClick={() => select(date)} onKeyDown={event => onDayKey(event, date)}>
                {date.day}
              </button>
            );
          })}
        </div>
        <footer className={s.footer}>
          <time dateTime={dateKey(selected)} aria-live="polite" aria-label={`Selected ${readableDate(selected)}`}>{dateKey(selected)}</time>
          <button type="button" onClick={returnToToday} aria-label="Go to today">Today</button>
        </footer>
      </section>
    </div>
  );
}
