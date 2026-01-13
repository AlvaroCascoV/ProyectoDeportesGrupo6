import { Component, OnInit } from '@angular/core';
import { Evento } from '../../models/Evento';
import { EventosService } from '../../services/eventos.service';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  public eventos!: Evento[];
  public eventosProximos: Evento[] = [];
  constructor(private _servicioEventos: EventosService) {}

  //pasar la fecha al formato dd/mm/yyyy
  formatearFecha(fecha: string): string {
    let fechaEvento = new Date(fecha);
    const dia = String(fechaEvento.getDate()).padStart(2, '0');
    const mes = String(fechaEvento.getMonth() + 1).padStart(2, '0');
    const anio = fechaEvento.getFullYear();
    const fechaFormateada = `${dia}/${mes}/${anio}`;
    console.log(fechaFormateada);
    return fechaFormateada;
  }

  comprobarFechaProxima(fecha: string): boolean {
    let fechaEvento = new Date(fecha);
    let ahora = new Date(); //en produccion quitar la fecha
    if (fechaEvento > ahora) return true;
    else return false;
  }

  rellenarEventosProximos(eventos: Evento[]): void {
    eventos.forEach((evento) => {
      if (this.comprobarFechaProxima(evento.fechaEvento)) {
        this.eventosProximos.push(evento);
      }
    });
  }

  ngOnInit(): void {
    this._servicioEventos.getActividadesPorEvento().subscribe((response) => {
      this.eventos = response;
      console.log(response);
      //formatear las fechas
      this.rellenarEventosProximos(this.eventos);
      this.eventosProximos.map((evento) => {
        evento.fechaEvento = this.formatearFecha(evento.fechaEvento);
      });
    });
  }
}
