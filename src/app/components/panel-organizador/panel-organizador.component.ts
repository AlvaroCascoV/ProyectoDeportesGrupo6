import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Evento } from '../../models/Evento';
import { Actividad } from '../../models/Actividad';
import { EventosService } from '../../services/eventos/eventos.service';
import { ActividadesService } from '../../services/actividades/actividades.service';
import Swal from 'sweetalert2';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-panel-organizador',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './panel-organizador.component.html',
  styleUrl: './panel-organizador.component.css',
})
export class PanelOrganizadorComponent implements OnInit {
  // Estados para modales
  public mostrarModalEvento = false;
  public mostrarModalActividad = false;

  // Datos para formulario de evento
  public nuevoEvento = {
    fechaEvento: '',
  };
  public actividades: Actividad[] = [];
  public actividadesSeleccionadas: Actividad[] = [];

  // Datos para formulario de actividad
  public nuevaActividad = {
    nombre: '',
    minimoJugadores: 1,
  };

  constructor(
    private _servicioEventos: EventosService,
    private _servicioActividades: ActividadesService
  ) {}

  ngOnInit(): void {
    this._servicioActividades.getActividades().subscribe((response) => {
      this.actividades = response;
      console.log('Actividades:', this.actividades);
    });
  }

  // ====== MÉTODOS PARA MODAL DE EVENTO ======
  abrirModalEvento(): void {
    this.mostrarModalEvento = true;
  }

  cerrarModalEvento(): void {
    this.mostrarModalEvento = false;
    this.nuevoEvento = { fechaEvento: '' };
    this.actividadesSeleccionadas = [];
  }

  crearEvento(): void {
    // Validar que se haya seleccionado una fecha
    if (!this.nuevoEvento.fechaEvento) {
      Swal.fire({
        title: 'Error',
        text: 'Por favor, selecciona una fecha para el evento',
        icon: 'error',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#d33',
      });
      return;
    }

    // Obtener profesores sin eventos y con eventos para asignar aleatoriamente
    // Usamos forkJoin para hacer ambas peticiones en paralelo
    forkJoin({
      sinEventos: this._servicioEventos.getProfesoresSinEventos(),
      conEventos: this._servicioEventos.getProfesoresConEventos(),
    }).subscribe({
      next: (result) => {
        let profesoresDisponibles: any[] = [];

        // Priorizar profesores sin eventos para distribuir la carga equitativamente
        if (result.sinEventos && result.sinEventos.length > 0) {
          profesoresDisponibles = result.sinEventos;
        } else if (result.conEventos && result.conEventos.length > 0) {
          // Si todos tienen eventos, usar profesores con eventos como fallback
          profesoresDisponibles = result.conEventos;
        }

        // Validar que haya profesores disponibles
        if (profesoresDisponibles.length === 0) {
          Swal.fire({
            title: 'Error',
            text: 'No hay profesores disponibles para asignar al evento',
            icon: 'error',
            confirmButtonText: 'Aceptar',
            confirmButtonColor: '#d33',
          });
          return;
        }

        // Seleccionar un profesor aleatorio de la lista disponible
        const indiceAleatorio = Math.floor(
          Math.random() * profesoresDisponibles.length
        );
        const profesorAleatorio = profesoresDisponibles[indiceAleatorio];
        const idProfesor = profesorAleatorio.idUsuario;

        // Crear el evento con el profesor asignado aleatoriamente
        this.crearEventoConFecha(idProfesor);
      },
      error: () => {
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron obtener los profesores disponibles',
          icon: 'error',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#d33',
        });
      },
    });
  }

  // Crea el evento con la fecha seleccionada y asocia el profesor asignado aleatoriamente
  crearEventoConFecha(idProfesor: number): void {
    // Convertir la fecha a formato ISO
    const fechaISO = new Date(this.nuevoEvento.fechaEvento).toISOString();

    this._servicioEventos.insertEvento(fechaISO).subscribe({
      next: (response) => {
        const idEvento = response.idEvento || response.id;
        console.log('Evento añadido: ' + idEvento);

        // Insertar actividades seleccionadas si las hay
        if (idEvento && this.actividadesSeleccionadas.length > 0) {
          this.actividadesSeleccionadas.forEach((act) => {
            console.log('Añadiendo actividad: ' + act.nombre);
            this._servicioEventos
              .insertarActividadesEvento(idEvento, act.idActividad)
              .subscribe({
                next: (response) => {
                  console.log(response);
                },
                error: (error) => {
                  console.error('Error al insertar actividad:', error);
                },
              });
          });
        }

        // Asociar el profesor seleccionado aleatoriamente al evento recién creado
        if (idEvento && idProfesor > 0) {
          this._servicioEventos
            .asociarProfesorEvento(idEvento, idProfesor)
            .subscribe({
              next: () => {
                this.cerrarModalEvento();
                // Evento creado con éxito y profesor asignado
                Swal.fire({
                  title: '¡Evento Creado!',
                  text: 'El evento se ha creado correctamente con un profesor asignado aleatoriamente',
                  icon: 'success',
                  confirmButtonText: 'Aceptar',
                  confirmButtonColor: '#3085d6',
                }).then(() => {
                  this.cerrarModalEvento();
                  this.actividadesSeleccionadas = [];
                });
              },
              error: () => {
                // Evento creado pero error al asociar el profesor
                Swal.fire({
                  title: 'Evento Creado',
                  text: 'El evento se creó, pero hubo un error al asignar el profesor',
                  icon: 'warning',
                  confirmButtonText: 'Aceptar',
                  confirmButtonColor: '#ff9800',
                }).then(() => {
                  this.cerrarModalEvento();
                  this.actividadesSeleccionadas = [];
                });
              },
            });
        } else {
          // Evento creado sin profesor (caso de fallback, no debería ocurrir normalmente)
          this.cerrarModalEvento();
          Swal.fire({
            title: '¡Evento Creado!',
            text: 'El evento se ha creado correctamente',
            icon: 'success',
            confirmButtonText: 'Aceptar',
            confirmButtonColor: '#3085d6',
          }).then(() => {
            this.cerrarModalEvento();
            this.actividadesSeleccionadas = [];
          });
        }
      },
      error: () => {
        Swal.fire({
          title: 'Error',
          text: 'No se pudo crear el evento. Por favor, intenta nuevamente',
          icon: 'error',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#d33',
        });
      },
    });
  }

  onActividadSeleccionada(actividad: Actividad, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.checked) {
      if (
        !this.actividadesSeleccionadas.find(
          (a) => a.idActividad === actividad.idActividad
        )
      ) {
        this.actividadesSeleccionadas.push(actividad);
      }
    } else {
      this.actividadesSeleccionadas = this.actividadesSeleccionadas.filter(
        (a) => a.idActividad !== actividad.idActividad
      );
    }
  }

  // ====== MÉTODOS PARA MODAL DE ACTIVIDAD ======
  abrirModalActividad(): void {
    this.mostrarModalActividad = true;
  }

  cerrarModalActividad(): void {
    this.mostrarModalActividad = false;
    this.nuevaActividad = { nombre: '', minimoJugadores: 1 };
  }

  crearActividad(): void {
    if (!this.nuevaActividad.nombre) {
      Swal.fire({
        title: 'Error',
        text: 'Por favor, ingresa un nombre para la actividad',
        icon: 'error',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#d33',
      });
      return;
    }

    if (this.nuevaActividad.minimoJugadores < 1) {
      Swal.fire({
        title: 'Error',
        text: 'El mínimo de jugadores debe ser al menos 1',
        icon: 'error',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#d33',
      });
      return;
    }

    // Crear objeto para enviar al servicio
    const actividadData = {
      IdActividad: 0,
      nombre: this.nuevaActividad.nombre,
      minimoJugadores: this.nuevaActividad.minimoJugadores,
    };

    this._servicioActividades.insertActividad(actividadData).subscribe({
      next: (response) => {
        Swal.fire({
          title: '¡Actividad Creada!',
          text: 'La actividad se ha creado correctamente',
          icon: 'success',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#3085d6',
        }).then(() => {
          this.cerrarModalActividad();
          // Recargar actividades
          this._servicioActividades.getActividades().subscribe((response) => {
            this.actividades = response;
          });
        });
      },
      error: () => {
        Swal.fire({
          title: 'Error',
          text: 'No se pudo crear la actividad. Por favor, intenta nuevamente',
          icon: 'error',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#d33',
        });
      },
    });
  }
}
