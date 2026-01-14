import { Component, OnInit } from '@angular/core';
import { Evento } from '../../models/Evento';
import { EventosService } from '../../services/eventos/eventos.service';
import { CalendarioComponent } from '../calendario/calendario.component';
import { ActividadesEvento } from '../../models/ActividadesEvento';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  imports: [CalendarioComponent]
})
export class HomeComponent implements OnInit {
  public eventos!: Evento[];
  public eventosProximos: Evento[] = [];
  public eventosCalendario: Evento[] = [];
  public mostrarModal: boolean = false;
  public actividadesEvento!: ActividadesEvento[];
  public eventoSeleccionado!: Evento;
  
  constructor(private _servicioEventos: EventosService) {}

  ngOnInit(): void {
    this._servicioEventos.getEventos().subscribe((response) => {
      this.eventos = response;
      this.eventosCalendario = response;
      console.log("Respuesta: "+JSON.stringify(response));
      this.rellenarEventosProximos(this.eventos);
    });
  }

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
    let ahora = new Date(); 
    if (fechaEvento > ahora) 
      return true;
    else 
      return false;
  }

   rellenarEventosProximos(eventos: Evento[]): void {
    // filtrar solo eventos futuros, ordenar por fecha asc (más cercano primero)
    // y crear copias con la fecha formateada para mostrar en la UI
    this.eventosProximos = eventos
      .filter((evento) => this.comprobarFechaProxima(evento.fechaEvento))
      .sort((a, b) => new Date(a.fechaEvento).getTime() - new Date(b.fechaEvento).getTime())
      .map((evento) => {
        const copia: Evento = { ...evento } as Evento;
        copia.fechaEvento = this.formatearFecha(evento.fechaEvento);
        return copia;
      });
  }

  abrirModal(): void {
    this.mostrarModal = true;
  }

  abrirModalEvento(evento: Evento): void {
    this.eventoSeleccionado = evento;
    this.getActividadesEvento(evento.idEvento);
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  getActividadesEvento(idEvento:number){
    this._servicioEventos.getActividadesEvento(idEvento)
    .subscribe(response => {
      this.actividadesEvento = response
    })
  }

}
