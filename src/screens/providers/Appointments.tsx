import React from "react";
import SiteHeader from "../../components/SiteHeader";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Search } from "lucide-react";

// Types
export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location: string;
  trial: string;
  color: string; // tailwind color bg-*
};

// Utilities
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0=Sun
  const diff = (day + 6) % 7; // Monday-start week
  return addDays(x, -diff);
}
function sameDay(a: Date, b: Date) { return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function toHM(date: Date) {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? "pm" : "am";
  const hh = ((h + 11) % 12) + 1;
  const mm = m.toString().padStart(2, "0");
  return `${hh}${mm === "00" ? "" : ":"+mm} ${ampm}`;
}

// Sample data
const seedEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Pre-Screening Call with DG-0109",
    start: new Date(2025, 6, 12, 11, 30),
    end: new Date(2025, 6, 12, 12, 0),
    location: "Virtual",
    trial: "DG-0109",
    color: "bg-indigo-100"
  },
  {
    id: "2",
    title: "Consultation Call",
    start: new Date(2025, 6, 15, 9, 0),
    end: new Date(2025, 6, 15, 10, 0),
    location: "Cottage Medicare Hospital",
    trial: "CM-200",
    color: "bg-rose-100"
  },
  {
    id: "3",
    title: "Pre-Screening Call with MN-290",
    start: new Date(2025, 6, 15, 13, 0),
    end: new Date(2025, 6, 15, 14, 0),
    location: "Cottage Medicare Hospital",
    trial: "MN-290",
    color: "bg-blue-100"
  },
  {
    id: "4",
    title: "Pre-Screening Call with AG-002",
    start: new Date(2025, 6, 15, 13, 0),
    end: new Date(2025, 6, 15, 14, 0),
    location: "Cottage Medicare Hospital",
    trial: "AG-002",
    color: "bg-emerald-100"
  }
];

// Mini month calendar
function MiniMonth({ value, onSelect }: { value: Date; onSelect: (d: Date) => void }) {
  const first = new Date(value.getFullYear(), value.getMonth(), 1);
  const start = startOfWeek(first);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) days.push(addDays(start, i));
  const month = value.getMonth();

  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{value.toLocaleString(undefined, { month: "long", year: "numeric" })}</div>
        <div className="flex gap-1">
          <button className="p-1 rounded hover:bg-gray-100" onClick={() => onSelect(new Date(value.getFullYear(), value.getMonth()-1, 1))}><ChevronLeft className="h-4 w-4"/></button>
          <button className="p-1 rounded hover:bg-gray-100" onClick={() => onSelect(new Date(value.getFullYear(), value.getMonth()+1, 1))}><ChevronRight className="h-4 w-4"/></button>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-7 text-xs text-gray-500">
        {["Mo","Tu","We","Th","Fr","Sa","Su"].map((d) => <div key={d} className="px-2 py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const isOther = d.getMonth() !== month;
          const isToday = sameDay(d, new Date());
          const isSelected = sameDay(d, value);
          return (
            <button
              key={d.toISOString()}
              onClick={() => onSelect(d)}
              className={`h-8 text-sm rounded m-1 ${isSelected ? "bg-blue-600 text-white" : isToday ? "border border-blue-600" : ""} ${isOther ? "text-gray-400" : "text-gray-700"}`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Toolbar({ current, setCurrent }: { current: Date; setCurrent: (d: Date) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button className="rounded border px-2 py-1 text-sm hover:bg-gray-50" onClick={() => setCurrent(new Date())}>Today</button>
      <div className="inline-flex border rounded overflow-hidden">
        <button className="px-2 py-1 hover:bg-gray-50" onClick={() => setCurrent(addDays(current, -7))}><ChevronLeft className="h-4 w-4"/></button>
        <div className="px-3 py-1 text-sm min-w-[150px] text-center">{current.toLocaleString(undefined, { month: "long", year: "numeric" })}</div>
        <button className="px-2 py-1 hover:bg-gray-50" onClick={() => setCurrent(addDays(current, 7))}><ChevronRight className="h-4 w-4"/></button>
      </div>
    </div>
  );
}

function ViewTabs({ view, setView }: { view: "day"|"week"|"month"; setView: (v: "day"|"week"|"month")=>void }) {
  const tabs: ("day"|"week"|"month")[] = ["day","week","month"];
  return (
    <div className="inline-flex rounded-full border overflow-hidden">
      {tabs.map((t) => (
        <button key={t} onClick={() => setView(t)} className={`px-3 py-1 text-sm ${view===t?"bg-gray-900 text-white":"hover:bg-gray-50"}`}>{t[0].toUpperCase()+t.slice(1)}</button>
      ))}
    </div>
  );
}

function WeekView({ weekStart, events }: { weekStart: Date; events: CalendarEvent[] }) {
  const hours = Array.from({ length: 10 }, (_, i) => i + 8); // 8-17
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  return (
    <div className="grid grid-cols-8 border rounded-lg overflow-hidden">
      <div className="bg-gray-50 text-xs text-gray-500 border-r p-2">PST</div>
      {days.map((d) => (
        <div key={d.toISOString()} className="text-xs text-gray-600 border-r p-2">{d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}</div>
      ))}
      {hours.map((h) => (
        <React.Fragment key={h}>
          <div className="border-r text-xs text-gray-500 p-2">{toHM(new Date(2000,0,1,h,0))}</div>
          {days.map((d) => {
            const slotStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, 0);
            const slotEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h+1, 0);
            const evs = events.filter(e => e.start < slotEnd && e.end > slotStart);
            return (
              <div key={`${d.toDateString()}-${h}`} className="relative h-20 border-r border-t">
                {evs.map((e) => (
                  <div key={e.id} className={`absolute inset-1 ${e.color} rounded p-2 text-[11px] leading-tight border`}>
                    <div className="font-medium truncate">{e.title}</div>
                    <div className="text-gray-700 truncate">{toHM(e.start)} - {toHM(e.end)}</div>
                    <div className="text-gray-700 truncate">{e.location}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

function DayView({ day, events }: { day: Date; events: CalendarEvent[] }) {
  const hours = Array.from({ length: 10 }, (_, i) => i + 8);
  return (
    <div className="grid grid-cols-[80px_1fr] border rounded-lg overflow-hidden">
      <div className="bg-gray-50 text-xs text-gray-500 border-r p-2">PST</div>
      <div className="p-2 text-xs text-gray-600">{day.toDateString()}</div>
      {hours.map((h) => {
        const slotStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, 0);
        const slotEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h+1, 0);
        const evs = events.filter(e => e.start < slotEnd && e.end > slotStart);
        return (
          <React.Fragment key={h}>
            <div className="border-r text-xs text-gray-500 p-2">{toHM(new Date(2000,0,1,h,0))}</div>
            <div className="relative h-20 border-t">
              {evs.map((e) => (
                <div key={e.id} className={`absolute inset-1 ${e.color} rounded p-2 text-[11px] leading-tight border`}>
                  <div className="font-medium truncate">{e.title}</div>
                  <div className="text-gray-700 truncate">{e.location}</div>
                </div>
              ))}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function MonthView({ value, events }: { value: Date; events: CalendarEvent[] }) {
  const first = new Date(value.getFullYear(), value.getMonth(), 1);
  const start = startOfWeek(first);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) days.push(addDays(start, i));
  const month = value.getMonth();
  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((d) => {
        const dayEvents = events.filter((e) => sameDay(e.start, d));
        return (
          <div key={d.toISOString()} className={`h-36 border rounded p-2 ${d.getMonth()!==month?"bg-gray-50":"bg-white"}`}>
            <div className="text-xs text-gray-500">{d.getDate()}</div>
            <div className="mt-1 space-y-1">
              {dayEvents.map((e) => (
                <div key={e.id} className={`truncate text-[11px] rounded px-2 py-1 border ${e.color}`}>{e.title}</div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Appointments(): JSX.Element {
  const [current, setCurrent] = React.useState<Date>(new Date(2025, 6, 12));
  const [view, setView] = React.useState<"day"|"week"|"month">("week");
  const [events] = React.useState<CalendarEvent[]>(seedEvents);
  const [trialFilter, setTrialFilter] = React.useState<string>("All");
  const [query, setQuery] = React.useState("");

  const weekStart = React.useMemo(() => startOfWeek(current), [current]);
  const trials = React.useMemo(() => ["All", ...Array.from(new Set(events.map(e => e.trial)))], [events]);
  const filtered = React.useMemo(() => {
    return events.filter((e) => {
      const matchTrial = trialFilter === "All" || e.trial === trialFilter;
      const matchText = query.trim().length === 0 || e.title.toLowerCase().includes(query.trim().toLowerCase());
      return matchTrial && matchText;
    });
  }, [events, trialFilter, query]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold">Appointments</h1>

        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Toolbar current={current} setCurrent={setCurrent} />
            <ViewTabs view={view} setView={setView} />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-4 w-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search by Patient, Trial or Keyword" className="pl-9 pr-3 py-2 rounded-full border text-sm w-64" />
            </div>
            <select value={trialFilter} onChange={(e)=>setTrialFilter(e.target.value)} className="border rounded-full px-3 py-2 text-sm">
              {trials.map((t) => <option key={t} value={t}>{t === "All" ? "All Trials" : t}</option>)}
            </select>
            <Link to="#" className="inline-flex items-center gap-2 rounded-full bg-blue-600 text-white px-3 py-2 text-sm hover:bg-blue-700"><Plus className="h-4 w-4"/>New</Link>
          </div>
        </div>

        <div className="mt-6 grid lg:grid-cols-4 gap-4">
          <div className="lg:col-span-1 space-y-4">
            <MiniMonth value={current} onSelect={setCurrent} />
            <div className="rounded-xl border bg-white p-3 text-sm">
              <div className="flex items-center gap-2 text-gray-700"><CalendarIcon className="h-4 w-4"/> Details</div>
              <div className="mt-2 text-gray-600">{current.toDateString()}</div>
              <div className="mt-2 space-y-2">
                {filtered.filter(e => sameDay(e.start, current)).map((e)=> (
                  <div key={e.id} className="rounded border p-2">
                    <div className="text-sm font-medium">{e.title}</div>
                    <div className="text-xs text-gray-600">{toHM(e.start)} – {toHM(e.end)} • {e.location}</div>
                  </div>
                ))}
                {filtered.filter(e => sameDay(e.start, current)).length === 0 && (
                  <div className="text-xs text-gray-500">No events</div>
                )}
              </div>
            </div>
          </div>
          <div className="lg:col-span-3 space-y-4">
            {view === "week" && <WeekView weekStart={weekStart} events={filtered} />}
            {view === "day" && <DayView day={current} events={filtered} />}
            {view === "month" && <MonthView value={current} events={filtered} />}
          </div>
        </div>
      </main>
    </div>
  );
}
