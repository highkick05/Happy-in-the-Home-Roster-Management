import React from 'react';
import { format, addDays, subDays } from 'date-fns';

export default function CustomAgenda({ events, date, length, localizer, components, onSelectEvent }: any) {
  const end = addDays(date, length || 30);
  const inRange = events.filter((e: any) => e.start >= date && e.start < end);
  
  const groups: Record<string, any[]> = {};
  inRange.sort((a: any, b: any) => a.start.getTime() - b.start.getTime()).forEach((e: any) => {
    const dayKey = format(e.start, 'EEEE, d MMMM yyyy');
    if (!groups[dayKey]) groups[dayKey] = [];
    groups[dayKey].push(e);
  });

  const groupedEvents = Object.keys(groups).map(key => ({
    dateLabel: key,
    events: groups[key]
  }));

  const AgendaEvent = components?.agenda?.event || components?.event || (({ event }: any) => <div>{event.title}</div>);

  return (
    <div className="h-full overflow-y-auto p-2 md:p-6 custom-agenda-view bg-zinc-950/20">
      {groupedEvents.length === 0 ? (
        <div className="flex items-center justify-center p-4 md:p-8 text-zinc-500 font-medium bg-black/20 rounded-xl border border-white/5 mx-2 md:mx-0">
          No shifts found starting from {format(date, 'd MMM yyyy')} for the next {length || 30} days.
        </div>
      ) : (
        groupedEvents.map(group => (
          <div key={group.dateLabel} className="flex flex-col gap-3 mb-6 relative">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-brand-teal uppercase border-b border-zinc-800 pb-2 mb-2">
              {group.dateLabel}
            </h2>
            <div className="flex flex-col gap-2">
              {group.events.map(event => (
                <div key={event.id} onClick={() => onSelectEvent && onSelectEvent(event)} className="w-full">
                  <AgendaEvent event={event} />
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

CustomAgenda.title = (start: Date, { localizer, length = 30 }: any) => {
  const end = addDays(start, length);
  return `${localizer.format(start, 'PP')} – ${localizer.format(end, 'PP')}`;
};

CustomAgenda.navigate = (date: Date, action: string, { length = 30 }: any) => {
  switch (action) {
    case 'PREV':
      return subDays(date, length);
    case 'NEXT':
      return addDays(date, length);
    default:
      return date;
  }
};
