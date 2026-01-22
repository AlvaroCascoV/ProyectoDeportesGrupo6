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
import Swal from 'sweetalert2';

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

  constructor(private _servicioEventos: EventosService) {}

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
