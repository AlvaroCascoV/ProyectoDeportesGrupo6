import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Evento } from '../../models/Evento';
import { ActividadesEvento } from '../../models/ActividadesEvento';
import { InscripcionComponent } from '../inscripcion/inscripcion.component';
import { EventosService } from '../../services/eventos/eventos.service';
import { CapitanActividadesService } from '../../services/capitan-actividades/capitan-actividades.service';
import { Alumno } from '../../models/Alumno';
import Swal from 'sweetalert2';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-detalles',
  standalone: true,
  imports: [CommonModule, InscripcionComponent],
  templateUrl: './detalles.component.html',
  styleUrl: './detalles.component.css',
})
export class DetallesComponent implements OnInit, OnChanges {
  @Input() evento!: Evento;
  @Input() mostrar: boolean = false;
  @Input() mostrarFormularioInmediato: boolean = false;

  @Output() cerrar = new EventEmitter<void>();

  @ViewChild(InscripcionComponent) inscripcionComponent?: InscripcionComponent;

  public actividadesEvento: ActividadesEvento[] = [];
  public cargandoActividades: boolean = false;
  public profesorActual: { id: number; nombre: string } | null = null;
  public cargandoProfesor: boolean = false;
  public mostrarFormulario: boolean = true;
  public preciosActividades: { [key: number]: number } = {};
  public capitanesActividades: Map<number, Alumno> = new Map();

  constructor(
    private _servicioEventos: EventosService,
    private _servicioCapitanes: CapitanActividadesService
  ) {}

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mostrar'] && changes['mostrar'].currentValue) {
      // Cuando se abre el modal, cargar datos
      if (this.evento) {
        this.getActividadesEvento(this.evento.idEvento);
        if (this.evento.idProfesor >= 0) {
          this.cargarProfesor(this.evento.idProfesor);
        }
      }

      if (this.mostrarFormularioInmediato) {
        this.mostrarFormulario = false;
      } else {
        this.mostrarFormulario = true;
      }
    }
    if (changes['mostrar'] && !changes['mostrar'].currentValue) {
      this.mostrarFormulario = true;
      this.actividadesEvento = [];
      this.preciosActividades = [];
      this.profesorActual = null;
      this.cargandoActividades = false;
      this.cargandoProfesor = false;
      this.capitanesActividades.clear();
    }
  }

  cerrarModal(): void {
    this.mostrarFormulario = true;
    this.cerrar.emit();
  }

  prevenirCierre(event: Event): void {
    event.stopPropagation();
  }

  mostrarForm(): void {
    this.mostrarFormulario = false;
  }

  async submitInscripcion(): Promise<void> {
    if (this.inscripcionComponent) {
      const result = await this.inscripcionComponent.inscribirUsuario();
      if (!result.ok) return;

      this.cerrarModal();

      // Si se redirige a /equipos, no mostramos un modal extra aquí.
      if (result.redirectedToEquipos) {
        return;
      }

      if (result.alreadyInscribed) {
        await Swal.fire({
          title: 'Ya estás inscrito',
          text: 'Ya estabas inscrito en esta actividad.',
          icon: 'info',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#3085d6',
        });
        return;
      }

      await Swal.fire({
        title: '¡Inscripción Confirmada!',
        text: 'Te has inscrito correctamente a la actividad.',
        icon: 'success',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#3085d6',
      });
    }
  }

  getActividadesEvento(idEvento: number): void {
    this.cargandoActividades = true;
    this._servicioEventos.getActividadesEvento(idEvento).subscribe({
      next: (response) => {
        this.actividadesEvento = response;
        this.cargarCapitanes();
        this.cargandoActividades = false;
      },
      error: () => {
        this.cargandoActividades = false;
      },
    });
  }

  cargarCapitanes(): void {
    this.capitanesActividades.clear();
    const requests = this.actividadesEvento.map(actividad =>
      this._servicioCapitanes.getCapitanByEventoActividad(actividad.idEventoActividad)
    );

    if (requests.length === 0) {
      return;
    }
    forkJoin(requests).subscribe({
      next: (capitanes) => {
        capitanes.forEach((capitan, index) => {
          if (capitan) {
            this.capitanesActividades.set(
              this.actividadesEvento[index].idEventoActividad,
              capitan
            );
          }
        });
      },
      error: () => {
        // Silently fail - captains are optional
      },
    });
  }

  getCapitanNombre(idEventoActividad: number): string {
    const capitan = this.capitanesActividades.get(idEventoActividad);
    if (!capitan) return '';
    // API returns 'usuario' field, but Alumno model has 'nombre' and 'apellidos'
    // Try both to be safe
    return (capitan as any).usuario || `${capitan.nombre} ${capitan.apellidos}` || 'Usuario';
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
    const fechaEvento = new Date(evento.fechaEvento);
    const ahora = new Date();
    return fechaEvento > ahora;
  }

  formatearFecha(fecha: string): string {
    const fechaEvento = new Date(fecha);
    const dia = String(fechaEvento.getDate()).padStart(2, '0');
    const mes = String(fechaEvento.getMonth() + 1).padStart(2, '0');
    const anio = fechaEvento.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }
}
