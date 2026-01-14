import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CalendarOptions, EventSourceInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import esLocale from '@fullcalendar/core/locales/es';
import { FullCalendarModule } from '@fullcalendar/angular';
import { Evento } from '../../models/Evento';

@Component({
  selector: 'app-calendario',
  templateUrl: './calendario.component.html',
  standalone: true,
  imports: [FullCalendarModule]
})
export class CalendarioComponent implements OnChanges {
  // recibe el array de eventos desde el home
  @Input() eventosRecibidos: Evento[] = [];
  @Output() eventoSeleccionado = new EventEmitter<Evento>();

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin],
    initialView: 'dayGridMonth',
    locale: esLocale,
    firstDay: 1,
    height: 'auto',
    contentHeight: 'auto',
    expandRows: true,
    dayMaxEventRows: true,
    events: [],
    eventClick: (info) => this.onEventClick(info)
  };

  // cuando los eventos cambian en el padre 
  // se actualizan en el calendario
  ngOnChanges(changes: SimpleChanges) {
    if (changes['eventosRecibidos']) {
      this.calendarOptions = {
        ...this.calendarOptions,
        events: this.mapEventosToCalendar(this.eventosRecibidos)
      };
    }
  }

  private mapEventosToCalendar(eventos: Evento[]): EventSourceInput {
    return eventos.map((evento) => ({
      title: 'Evento ' + evento.idEvento,
      start: evento.fechaEvento,
      id: evento.idEvento.toString(),
      extendedProps: { evento }
    }));
  }

  onEventClick(info: any): void {
    const evento: Evento | undefined = info.event.extendedProps?.['evento']
      ?? this.eventosRecibidos.find((e) => e.idEvento.toString() === info.event.id);
    if (evento) {
      this.eventoSeleccionado.emit(evento);
    }
  }
}