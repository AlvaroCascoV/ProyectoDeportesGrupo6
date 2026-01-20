import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Evento } from '../../models/Evento';
import { Actividad } from '../../models/Actividad';
import { EventosService } from '../../services/eventos/eventos.service';
import { ActividadesService } from '../../services/actividades/actividades.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-panel-organizador',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './panel-organizador.component.html',
  styleUrl: './panel-organizador.component.css'
})
export class PanelOrganizadorComponent implements OnInit {
  // Estados para modales
  public mostrarModalEvento = false;
  public mostrarModalActividad = false;

  // Datos para formulario de evento
  public nuevoEvento = {
    fechaEvento: '',
    idProfesor: 0,
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
    this.nuevoEvento = { fechaEvento: '', idProfesor: 0 };
    this.actividadesSeleccionadas = [];
  }

  crearEvento(): void {
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
              Swal.fire({
                title: 'Error',
                text: 'El usuario asignado no es un profesor',
                icon: 'error',
                confirmButtonText: 'Aceptar',
                confirmButtonColor: '#d33',
              });
            }
          },
          error: () => {
            Swal.fire({
              title: 'Error',
              text: 'El usuario asignado no es un profesor',
              icon: 'error',
              confirmButtonText: 'Aceptar',
              confirmButtonColor: '#d33',
            });
          },
        });
    } else {
      // Si no hay profesor, crear evento sin profesor
      this.crearEventoConFecha();
    }
  }

  crearEventoConFecha(): void {
    // Convertir la fecha a formato ISO
    const fechaISO = new Date(this.nuevoEvento.fechaEvento).toISOString();

    this._servicioEventos.insertEvento(fechaISO).subscribe({
      next: (response) => {
        const idEvento = response.idEvento || response.id;
        console.log('Evento añadido: ' + idEvento);

        // Insertar actividades si las hay
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

        // Asociar profesor al evento recién creado
        if (idEvento && this.nuevoEvento.idProfesor > 0) {
          this._servicioEventos
            .asociarProfesorEvento(idEvento, this.nuevoEvento.idProfesor)
            .subscribe({
              next: () => {
                this.cerrarModalEvento();
                // Evento creado con éxito
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
              },
              error: () => {
                // Evento creado pero error asociando profesor
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
          // Evento creado sin profesor
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
