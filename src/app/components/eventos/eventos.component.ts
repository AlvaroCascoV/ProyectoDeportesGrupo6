import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Evento } from '../../models/Evento';
import { EventosService } from '../../services/eventos/eventos.service';

@Component({
  selector: 'app-eventos',
  standalone: true,
  imports: [RouterModule, FormsModule],
  templateUrl: './eventos.component.html',
  styleUrl: './eventos.component.css',
})
export class EventosComponent implements OnInit {
  public eventos: Evento[] = [];
  private eventosOriginales: Evento[] = [];
  public mostrarModal = false;
  public nuevoEvento = {
    fechaEvento: '',
    idProfesor: 0,
  };

  constructor(private _servicioEventos: EventosService) {}

  abrirModal(): void {
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.nuevoEvento = { fechaEvento: '', idProfesor: 0 };
  }

  crearEvento(): void {
    // TODO: Implementar la lógica para crear el evento
    console.log('Crear evento:', this.nuevoEvento);
    // Aquí llamarías al servicio para crear el evento
    // this._servicioEventos.crearEvento(this.nuevoEvento).subscribe(...)
    this.cerrarModal();
  }

  //pasar la fecha al formato dd/mm/yyyy
  formatearFecha(fecha: string): string {
    let fechaEvento = new Date(fecha);
    const dia = String(fechaEvento.getDate()).padStart(2, '0');
    const mes = String(fechaEvento.getMonth() + 1).padStart(2, '0');
    const anio = fechaEvento.getFullYear();
    const fechaFormateada = `${dia}/${mes}/${anio}`;
    return fechaFormateada;
  }

  comprobarFechaProxima(evento: Evento): boolean {
    // Buscar el evento original para obtener la fecha sin formatear
    const eventoOriginal = this.eventosOriginales.find(
      (e) => e.idEvento === evento.idEvento
    );
    if (!eventoOriginal) return false;

    let fechaEvento = new Date(eventoOriginal.fechaEvento);
    let ahora = new Date();
    return fechaEvento > ahora;
  }

  ngOnInit(): void {
    this._servicioEventos.getEventosActividades().subscribe((response) => {
      this.eventosOriginales = response;
      this.eventos = response.map((evento: any) => ({
        ...evento,
        fechaEvento: this.formatearFecha(evento.fechaEvento),
      }));
      console.log(response);
    });
  }
}
