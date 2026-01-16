import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Evento } from '../../models/Evento';
import { EventosService } from '../../services/eventos/eventos.service';
import { DetallesComponent } from '../detalles/detalles.component';

@Component({
  selector: 'app-eventos',
  standalone: true,
  imports: [RouterModule, FormsModule, DetallesComponent],
  templateUrl: './eventos.component.html',
  styleUrl: './eventos.component.css',
})
export class EventosComponent implements OnInit {
  public eventos: Evento[] = [];
  private eventosOriginales: Evento[] = [];
  public mostrarModal = false;
  public mostrarModalDetalles = false;
  public eventoSeleccionado!: Evento;
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
    if (!this.nuevoEvento.fechaEvento) {
      return;
    }

    // Validar profesor primero si se proporcionó un ID
    if (this.nuevoEvento.idProfesor > 0) {
      this._servicioEventos
        .getProfesorById(this.nuevoEvento.idProfesor)
        .subscribe({
          next: (profesor) => {
            // Si es profesor válido, crear el evento
            if (profesor && profesor.role?.toUpperCase() === 'PROFESOR') {
              this.crearEventoConFecha();
            } else {
              // TODO: Mostrar error "El usuario asignado no es un profesor"
            }
          },
          error: () => {
            // Si hay error (incluyendo 204), no es profesor
            // TODO: Mostrar error "El usuario asignado no es un profesor"
          },
        });
    } else {
      // Si no hay profesor, crear evento sin profesor
      this.crearEventoConFecha();
    }
  }

  crearEventoConFecha(): void {
    // Convertir la fecha a formato ISO (2026-01-15T09:47:13.513Z)
    const fechaISO = new Date(this.nuevoEvento.fechaEvento).toISOString();

    this._servicioEventos.insertEvento(fechaISO).subscribe({
      next: (response) => {
        const idEvento = response.idEvento || response.id;

        // Asociar profesor al evento recién creado
        if (idEvento && this.nuevoEvento.idProfesor > 0) {
          this._servicioEventos
            .asociarProfesorEvento(idEvento, this.nuevoEvento.idProfesor)
            .subscribe({
              next: () => {
                // Recargar eventos después de crear y asociar
                this.ngOnInit();
                this.cerrarModal();
              },
              error: () => {
                // Aún así recargar eventos aunque falle la asociación
                this.ngOnInit();
                this.cerrarModal();
              },
            });
        } else {
          // Si no hay profesor o no se pudo obtener el idEvento, solo recargar
          this.ngOnInit();
          this.cerrarModal();
        }
      },
      error: () => {
        // TODO: Mostrar mensaje de error al usuario
      },
    });
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

  abrirModalDetalles(evento: Evento): void {
    const eventoOriginal = this.eventosOriginales.find(
      (e) => e.idEvento === evento.idEvento
    ) || evento;
    
    this.eventoSeleccionado = eventoOriginal;
    this.mostrarModalDetalles = true;
  }

  cerrarModalDetalles(): void {
    this.mostrarModalDetalles = false;
  }

  ngOnInit(): void {
    this._servicioEventos.getEventos().subscribe((response) => {
      // Ordenar eventos por fecha (más recientes primero)
      const eventosOrdenados = response.sort((a, b) => {
        const fechaA = new Date(a.fechaEvento).getTime();
        const fechaB = new Date(b.fechaEvento).getTime();
        return fechaB - fechaA; // Orden descendente (más recientes primero)
      });

      this.eventosOriginales = eventosOrdenados;
      this.eventos = eventosOrdenados.map((evento: any) => ({
        ...evento,
        fechaEvento: this.formatearFecha(evento.fechaEvento),
      }));

      console.log(response);
    });
  }
}
