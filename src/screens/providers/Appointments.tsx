import React from "react";
import SiteHeader from "../../components/SiteHeader";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Search, Plus, X } from "lucide-react";
import { usePagination } from "../../lib/usePagination";
import { Pagination } from "../../components/ui/pagination";
import { useAuth } from "../../lib/auth";
import {
  getAppointmentsAsync,
  addAppointmentAsync,
  cancelAppointmentAsync,
  type Appointment,
  type AppointmentType,
} from "../../lib/providerAppointments";
import { getAddedTrials } from "../../lib/providerTrials";

// Types
export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location: string;
  trial: string;
  color: string; // tailwind color bg-*
  appointmentId?: string;
  patientId?: string;
  status?: string;
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

// Create Appointment Modal
function CreateAppointmentModal({
  isOpen,
  onClose,
  onSave,
  trials,
  selectedDate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointment: Omit<Appointment, "id">) => Promise<void>;
  trials: { nctId: string; title: string }[];
  selectedDate: Date;
}) {
  const [title, setTitle] = React.useState("");
  const [appointmentType, setAppointmentType] = React.useState<AppointmentType>("screening");
  const [nctId, setNctId] = React.useState("");
  const [date, setDate] = React.useState(selectedDate.toISOString().split("T")[0]);
  const [startTime, setStartTime] = React.useState("09:00");
  const [endTime, setEndTime] = React.useState("10:00");
  const [location, setLocation] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setDate(selectedDate.toISOString().split("T")[0]);
  }, [selectedDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !startTime || !endTime) return;

    setSaving(true);
    try {
      const startDateTime = new Date(`${date}T${startTime}:00`);
      const endDateTime = new Date(`${date}T${endTime}:00`);

      await onSave({
        title,
        appointmentType,
        nctId: nctId || undefined,
        time: startDateTime.toISOString(),
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        location,
        notes,
      });

      // Reset form
      setTitle("");
      setAppointmentType("screening");
      setNctId("");
      setStartTime("09:00");
      setEndTime("10:00");
      setLocation("");
      setNotes("");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">New Appointment</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Initial Screening - John Doe"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={appointmentType}
              onChange={(e) => setAppointmentType(e.target.value as AppointmentType)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="screening">Screening</option>
              <option value="consent">Consent</option>
              <option value="treatment">Treatment</option>
              <option value="follow_up">Follow-up</option>
              <option value="assessment">Assessment</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trial (optional)</label>
            <select
              value={nctId}
              onChange={(e) => setNctId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">No specific trial</option>
              {trials.map((t) => (
                <option key={t.nctId} value={t.nctId}>
                  {t.nctId} - {t.title.slice(0, 50)}...
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Room 204, Building A"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border rounded-lg px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title}
              className="flex-1 bg-gray-900 text-white rounded-lg px-4 py-2 text-sm hover:bg-black disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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

function ViewTabs({ view, setView }: { view: "day"|"week"|"month"|"list"; setView: (v: "day"|"week"|"month"|"list")=>void }) {
  const tabs: ("day"|"week"|"month"|"list")[] = ["day","week","month","list"];
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
    <div className="overflow-x-auto">
      <div className="grid grid-cols-1 md:grid-cols-8 border rounded-lg overflow-hidden min-w-[800px]">
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
                <div key={`${d.toDateString()}-${h}`} className="relative min-h-[80px] md:h-20 border-r border-t">
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
    </div>
  );
}

function DayView({ day, events }: { day: Date; events: CalendarEvent[] }) {
  const hours = Array.from({ length: 10 }, (_, i) => i + 8);
  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-[80px_1fr] border rounded-lg overflow-hidden min-w-[300px]">
        <div className="bg-gray-50 text-xs text-gray-500 border-r p-2">PST</div>
        <div className="p-2 text-xs text-gray-600">{day.toDateString()}</div>
        {hours.map((h) => {
          const slotStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, 0);
          const slotEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h+1, 0);
          const evs = events.filter(e => e.start < slotEnd && e.end > slotStart);
          return (
            <React.Fragment key={h}>
              <div className="border-r text-xs text-gray-500 p-2">{toHM(new Date(2000,0,1,h,0))}</div>
              <div className="relative min-h-[80px] md:h-20 border-t">
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

function ListView({ events, pageItems, currentPage, totalPages, onPageChange }: {
  events: CalendarEvent[];
  pageItems: CalendarEvent[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Trial</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pageItems.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${event.color} border`} />
                      <span className="font-medium">{event.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{event.trial}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {event.start.toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {toHM(event.start)} - {toHM(event.end)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{event.location}</td>
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No appointments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {events.length > 0 && (
          <div className="px-4 py-3 border-t">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Appointments(): JSX.Element {
  const { user } = useAuth();
  const userId = user?.userId || "";
  const [current, setCurrent] = React.useState<Date>(new Date());
  const [view, setView] = React.useState<"day"|"week"|"month"|"list">("week");
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [trialFilter, setTrialFilter] = React.useState<string>("All");
  const [query, setQuery] = React.useState("");
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [providerTrials, setProviderTrials] = React.useState<{ nctId: string; title: string }[]>([]);

  // Load appointments from backend
  React.useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Load trials
        const trials = getAddedTrials(userId);
        setProviderTrials(trials.map(t => ({ nctId: t.nctId, title: t.title })));

        // Load appointments
        const appointments = await getAppointmentsAsync(userId);

        // Convert to CalendarEvent format
        const calendarEvents: CalendarEvent[] = appointments.map((apt) => ({
          id: apt.id || apt.appointmentId || "",
          appointmentId: apt.appointmentId,
          title: apt.title,
          start: new Date(apt.startTime || apt.time),
          end: apt.endTime ? new Date(apt.endTime) : new Date(new Date(apt.startTime || apt.time).getTime() + 60 * 60 * 1000),
          location: apt.location || "",
          trial: apt.nctId || apt.trial || "",
          color: apt.color || getColorForType(apt.appointmentType),
          patientId: apt.patientId,
          status: apt.status,
        }));

        setEvents(calendarEvents);
      } catch (error) {
        console.error("Failed to load appointments:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId]);

  const getColorForType = (type?: string): string => {
    switch (type) {
      case "screening": return "bg-blue-100";
      case "consent": return "bg-green-100";
      case "treatment": return "bg-purple-100";
      case "follow_up": return "bg-yellow-100";
      case "assessment": return "bg-orange-100";
      default: return "bg-gray-100";
    }
  };

  const handleCreateAppointment = async (appointment: Omit<Appointment, "id">) => {
    if (!userId) return;

    const result = await addAppointmentAsync(userId, appointment);

    if (result.ok && result.appointment) {
      // Add to local events
      const newEvent: CalendarEvent = {
        id: result.appointment.id || result.appointment.appointmentId || "",
        appointmentId: result.appointment.appointmentId,
        title: result.appointment.title,
        start: new Date(result.appointment.startTime || result.appointment.time),
        end: result.appointment.endTime
          ? new Date(result.appointment.endTime)
          : new Date(new Date(result.appointment.startTime || result.appointment.time).getTime() + 60 * 60 * 1000),
        location: result.appointment.location || "",
        trial: result.appointment.nctId || "",
        color: getColorForType(result.appointment.appointmentType),
        status: result.appointment.status,
      };

      setEvents((prev) => [...prev, newEvent]);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!userId || !appointmentId) return;

    const result = await cancelAppointmentAsync(userId, appointmentId);

    if (result.ok) {
      setEvents((prev) => prev.filter((e) => e.id !== appointmentId && e.appointmentId !== appointmentId));
    }
  };

  const weekStart = React.useMemo(() => startOfWeek(current), [current]);
  const trials = React.useMemo(() => ["All", ...Array.from(new Set(events.map(e => e.trial)))], [events]);
  const filtered = React.useMemo(() => {
    return events.filter((e) => {
      const matchTrial = trialFilter === "All" || e.trial === trialFilter;
      const matchText = query.trim().length === 0 || e.title.toLowerCase().includes(query.trim().toLowerCase());
      return matchTrial && matchText;
    });
  }, [events, trialFilter, query]);

  // Pagination for list view
  const {
    currentPage,
    totalPages,
    pageItems,
    goToPage,
  } = usePagination({
    items: filtered,
    pageSize: 20,
  });

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
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-gray-900 text-white rounded-full px-4 py-2 text-sm hover:bg-black"
            >
              <Plus className="h-4 w-4" />
              New Appointment
            </button>
            <div className="relative">
              <Search className="h-4 w-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search by Patient, Trial or Keyword" className="pl-9 pr-3 py-2 rounded-full border text-sm w-64" />
            </div>
            <select value={trialFilter} onChange={(e)=>setTrialFilter(e.target.value)} className="border rounded-full px-3 py-2 text-sm">
              {trials.map((t) => <option key={t} value={t}>{t === "All" ? "All Trials" : t}</option>)}
            </select>
          </div>
        </div>

        {view === "list" ? (
          <div className="mt-6">
            <ListView
              events={filtered}
              pageItems={pageItems}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
            />
          </div>
        ) : (
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
        )}

        {loading && (
          <div className="mt-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        )}
      </main>

      <CreateAppointmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateAppointment}
        trials={providerTrials}
        selectedDate={current}
      />
    </div>
  );
}
