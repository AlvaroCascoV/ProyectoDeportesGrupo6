import { Component, OnInit } from '@angular/core';
import { Evento } from '../../models/Evento';
import { EventosService } from '../../services/eventos/eventos.service';
import { CalendarioComponent } from '../calendario/calendario.component';
import { ActividadesEvento } from '../../models/ActividadesEvento';
import { RouterModule } from '@angular/router';
import { DetallesComponent } from '../detalles/detalles.component';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  imports: [CalendarioComponent, RouterModule, DetallesComponent],
})
export class HomeComponent implements OnInit {
  public eventos!: Evento[];
  public eventosProximos: Evento[] = [];
  public eventosCalendario: Evento[] = [];
  private eventosOriginales: Evento[] = [];
  public mostrarModal: boolean = false;
  public actividadesEvento: ActividadesEvento[] = [];
  public cargandoActividades: boolean = false;
  public eventoSeleccionado!: Evento;
  public profesorActual: { id: number; nombre: string } | null = null;
  public cargandoProfesor: boolean = false;
  public mostrarFormularioInmediato: boolean = false;

  constructor(private _servicioEventos: EventosService) {}

  ngOnInit(): void {
    this._servicioEventos.getEventos().subscribe((response) => {
      const eventosOrdenados = response.sort((a, b) => {
        const fechaA = new Date(a.fechaEvento).getTime();
        const fechaB = new Date(b.fechaEvento).getTime();
        return fechaB - fechaA;
      });

      this.eventosOriginales = eventosOrdenados;
      this.eventos = eventosOrdenados.map((evento: any) => ({
        ...evento,
        fechaEvento: this.formatearFecha(evento.fechaEvento),
      }));

      this.eventosCalendario = eventosOrdenados;
      this.rellenarEventosProximos(this.eventosOriginales);
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
    if (fechaEvento > ahora) return true;
    else return false;
  }

  rellenarEventosProximos(eventos: Evento[]): void {
    // filtrar solo eventos futuros, ordenar por fecha asc (más cercano primero)
    // y crear copias con la fecha formateada para mostrar en la UI
    this.eventosProximos = eventos
      .filter((evento) => this.comprobarFechaProxima(evento.fechaEvento))
      .sort(
        (a, b) =>
          new Date(a.fechaEvento).getTime() - new Date(b.fechaEvento).getTime()
      )
      .map((evento) => {
        const copia: Evento = { ...evento } as Evento;
        copia.fechaEvento = this.formatearFecha(evento.fechaEvento);
        return copia;
      });
  }

  abrirModal(): void {
    this.mostrarModal = true;
  }

  abrirModalEvento(evento: Evento, mostrarFormulario: boolean = false): void {
    const eventoOriginal =
      this.eventosOriginales.find((e) => e.idEvento === evento.idEvento) ||
      evento;

    this.eventoSeleccionado = eventoOriginal;
    this.actividadesEvento = [];
    this.profesorActual = null;
    this.mostrarFormularioInmediato = mostrarFormulario;
    this.getActividadesEvento(eventoOriginal.idEvento);

    if (eventoOriginal.idProfesor >= 0) {
      this.cargarProfesor(eventoOriginal.idProfesor);
    }

    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.cargandoActividades = false;
    this.profesorActual = null;
    this.cargandoProfesor = false;
    this.mostrarFormularioInmediato = false;
  }

  getActividadesEvento(idEvento: number): void {
    this.cargandoActividades = true;
    this._servicioEventos.getActividadesEvento(idEvento).subscribe({
      next: (response) => {
        this.actividadesEvento = response;
        this.cargandoActividades = false;
      },
      error: () => {
        this.cargandoActividades = false;
      },
    });
  }

  cargarProfesor(idProfesor: number): void {
    if (this.cargandoProfesor) {
      return;
    }

    this.cargandoProfesor = true;

    this._servicioEventos.getProfesorById(idProfesor).subscribe({
      next: (profesor) => {
        if (
          profesor &&
          profesor.role?.toUpperCase() === 'PROFESOR' &&
          profesor.usuario
        ) {
          this.profesorActual = {
            id: idProfesor,
            nombre: profesor.usuario,
          };
        }
        this.cargandoProfesor = false;
      },
      error: () => {
        this.profesorActual = null;
        this.cargandoProfesor = false;
      },
    });
  }

  comprobarFechaProximaEvento(evento: Evento): boolean {
    const eventoOriginal = this.eventosOriginales.find(
      (e) => e.idEvento === evento.idEvento
    );
    if (!eventoOriginal) return false;

    const fechaEvento = new Date(eventoOriginal.fechaEvento);
    const ahora = new Date();
    return fechaEvento > ahora;
  }
}
