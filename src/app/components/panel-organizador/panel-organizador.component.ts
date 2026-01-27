import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Evento } from '../../models/Evento';
import { Actividad } from '../../models/Actividad';
import { EventosService } from '../../services/eventos/eventos.service';
import { ActividadesService } from '../../services/actividades/actividades.service';
import { InscripcionesService } from '../../services/inscripciones/inscripciones.service';
import { GestionCapitanesComponent } from '../gestion-capitanes/gestion-capitanes.component';
import Swal from 'sweetalert2';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-panel-organizador',
  standalone: true,
  imports: [FormsModule, CommonModule, GestionCapitanesComponent],
  templateUrl: './panel-organizador.component.html',
  styleUrl: './panel-organizador.component.css',
})
export class PanelOrganizadorComponent implements OnInit {
  // Estados para modales
  public mostrarModalEvento = false;
  public mostrarModalActividad = false;
  public mostrarModalDeleteEvento = false;
  public mostrarModalDeleteActividad = false;
  public insertandoActividades = false;
  public eventos: Evento[] = [];
  public idEventoAEliminar!: number;
  public idActividadAEliminar!: number;
  // Datos para formulario de evento
  public nuevoEvento = {
    fechaEvento: '',
  };
  public actividades: Actividad[] = [];
  public actividadesSeleccionadas: Actividad[] = [];
  public preciosActividades: { [key: number]: number } = {};

  // Datos para formulario de actividad
  public nuevaActividad = {
    nombre: '',
    minimoJugadores: 1,
  };

  constructor(
    private _servicioEventos: EventosService,
    private _servicioActividades: ActividadesService,
    private _servicioInscripciones: InscripcionesService,
    private _cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this._servicioActividades.getActividades().subscribe((response) => {
      this.actividades = response;
      console.log('Actividades:', this.actividades);
    });
    this._servicioEventos.getEventos().subscribe((response) => {
      this.eventos = response;
    });
  }

  // ====== MÉTODOS PARA MODAL DE EVENTO ======
  abrirModalEvento(): void {
    this.mostrarModalEvento = true;
  }

  cerrarModalEvento(): void {
    this.mostrarModalEvento = false;
    this.insertandoActividades = false;
    this.nuevoEvento = { fechaEvento: '' };
    this.actividadesSeleccionadas = [];
    this.preciosActividades = {};
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

    // Validar que todas las actividades seleccionadas tengan precio mayor a 0
    if (this.actividadesSeleccionadas.length > 0) {
      const actividadesPrecioNegativo = this.actividadesSeleccionadas.filter(
        (act) => this.preciosActividades[act.idActividad] < 0
      );

      if (actividadesPrecioNegativo.length > 0) {
        const nombresActividades = actividadesPrecioNegativo.map(a => a.nombre).join(', ');
        Swal.fire({
          title: 'Error',
          text: `Por favor, ingresa un precio válido (mayor o igual a 0) para: ${nombresActividades}`,
          icon: 'error',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#d33',
        });
        return;
      }
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
          Math.random() * profesoresDisponibles.length,
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
          // Activar el loader
          this.insertandoActividades = true;
          // Procesar actividades secuencialmente con delay
          this.insertarActividadesSecuencialmente(idEvento, 0, () => {
            // Una vez terminadas todas las inserciones, asociar el profesor
            this.insertandoActividades = false;
            this.asociarProfesorYFinalizar(idEvento, idProfesor);
          });
        } else {
          // Si no hay actividades, asociar el profesor directamente
          this.asociarProfesorYFinalizar(idEvento, idProfesor);
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

  // Método recursivo para insertar actividades una por una con delay
  insertarActividadesSecuencialmente(idEvento: number, index: number, onComplete: () => void): void {
    // Si ya procesamos todas las actividades, ejecutar el callback
    if (index >= this.actividadesSeleccionadas.length) {
      onComplete();
      return;
    }

    const act = this.actividadesSeleccionadas[index];
    console.log(`Añadiendo actividad ${index + 1}/${this.actividadesSeleccionadas.length}: ${act.nombre}`);

    // Insertar la actividad en el evento
    this._servicioEventos
      .insertarActividadesEvento(idEvento, act.idActividad)
      .subscribe({
        next: (response) => {
          console.log(response);
          const idEventoActividad = response.idEventoActividad || response.id;
          const precio = this.preciosActividades[act.idActividad] || 0;

          // Si hay precio, insertarlo con delay
          if (idEventoActividad && precio >= 0) {
            setTimeout(() => {
              console.log(`Insertando precio ${precio}€ para ${act.nombre}`);
              this._servicioActividades
                .insertarPrecioActividad(precio, idEventoActividad)
                .subscribe({
                  next: (precioResponse) => {
                    console.log('Precio insertado:', precioResponse);
                    // Continuar con la siguiente actividad después de 500ms
                    setTimeout(() => {
                      this.insertarActividadesSecuencialmente(idEvento, index + 1, onComplete);
                    }, 500);
                  },
                  error: (error) => {
                    console.error('Error al insertar precio:', error);
                    // Continuar con la siguiente aunque falle
                    setTimeout(() => {
                      this.insertarActividadesSecuencialmente(idEvento, index + 1, onComplete);
                    }, 500);
                  },
                });
            }, 500);
          } else {
            // Si no hay precio, continuar directamente
            this.insertarActividadesSecuencialmente(idEvento, index + 1, onComplete);
          }
        },
        error: (error) => {
          console.error('Error al insertar actividad:', error);
          // Continuar con la siguiente aunque falle
          this.insertarActividadesSecuencialmente(idEvento, index + 1, onComplete);
        },
      });
  }

  // Método para asociar el profesor y finalizar la creación
  asociarProfesorYFinalizar(idEvento: number, idProfesor: number): void {
    if (idEvento && idProfesor > 0) {
          this._servicioEventos
            .asociarProfesorEvento(idEvento, idProfesor)
            .subscribe({
              next: () => {
                this.cerrarModalEvento();
                // Refrescar lista de eventos
                this._servicioEventos.getEventos().subscribe((response) => {
                  this.eventos = response;
                });
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
                  this.preciosActividades = {};
                });
              },
              error: () => {
                // Refrescar lista de eventos incluso en caso de error
                this._servicioEventos.getEventos().subscribe((response) => {
                  this.eventos = response;
                });
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
                  this.preciosActividades = {};
                });
              },
            });
    } else {
      // Evento creado sin profesor (caso de fallback)
      this.cerrarModalEvento();
      Swal.fire({
        title: '¡Evento Creado!',
        text: 'El evento se ha creado correctamente',
        icon: 'success',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#3085d6',
      }).then(() => {
        this._servicioEventos.getEventos().subscribe((response) => {
          this.eventos = response;
        });
        this.actividadesSeleccionadas = [];
        this.preciosActividades = {};
      });
    }
  }

  onActividadSeleccionada(actividad: Actividad, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.checked) {
      if (
        !this.actividadesSeleccionadas.find(
          (a) => a.idActividad === actividad.idActividad,
        )
      ) {
        this.actividadesSeleccionadas.push(actividad);
      }
    } else {
      this.actividadesSeleccionadas = this.actividadesSeleccionadas.filter(
        (a) => a.idActividad !== actividad.idActividad,
      );
      // Limpiar el precio cuando se deselecciona
      delete this.preciosActividades[actividad.idActividad];
    }
  }

  actividadEstaPrecioSeleccionada(idActividad: number): boolean {
    return this.actividadesSeleccionadas.some(
      (a) => a.idActividad === idActividad,
    );
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

  formatearFecha(fecha: string): string {
    let fechaEvento = new Date(fecha);
    const dia = String(fechaEvento.getDate()).padStart(2, '0');
    const mes = String(fechaEvento.getMonth() + 1).padStart(2, '0');
    const anio = fechaEvento.getFullYear();
    const fechaFormateada = `${dia}/${mes}/${anio}`;
    return fechaFormateada;
  }
  abrirModalDeleteEvento() {
    this.mostrarModalDeleteEvento = true;
    this._servicioEventos.getEventos().subscribe((response) => {
      this.eventos = response;
    });
  }
  cerrarModalDeleteEvento() {
    this.mostrarModalDeleteEvento = false;
    this.idEventoAEliminar = 0;
  }
  deleteEvento() {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción no se podrá deshacer...',
      icon: 'question',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      cancelButtonColor: '#595d60',
      confirmButtonText: 'Eliminar',
      confirmButtonColor: '#c60000',
    }).then((result) => {
      if (result.isConfirmed) {
        this._servicioEventos.deleteEvento(this.idEventoAEliminar).subscribe({
          next: (response) => {
            Swal.fire({
              title: 'Evento Eliminado!',
              text: 'El evento se ha eliminado correctamente',
              icon: 'success',
              confirmButtonText: 'Aceptar',
              confirmButtonColor: '#3085d6',
            }).then(() => {
              this.cerrarModalDeleteEvento();
              // Recargar eventos
              this._servicioEventos.getEventos().subscribe((response) => {
                this.eventos = response;
              });
            });
          },
          error: (response) => {
            console.log(response);
            Swal.fire({
              title: 'Error',
              text: 'No se pudo eliminar el evento. Por favor, intenta nuevamente',
              icon: 'error',
              confirmButtonText: 'Aceptar',
              confirmButtonColor: '#d33',
            });
          },
        });
      }
    });
  }

  abrirModalDeleteActividad() {
    this.mostrarModalDeleteActividad = true;
  }
  cerrarModalDeleteActividad() {
    this.mostrarModalDeleteActividad = false;
    this.idActividadAEliminar = 0;
  }
  deleteActividad() {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción no se podrá deshacer...',
      icon: 'question',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      cancelButtonColor: '#595d60',
      confirmButtonText: 'Eliminar',
      confirmButtonColor: '#c60000',
    }).then((result) => {
      if (result.isConfirmed) {
        this._servicioActividades
          .deleteActividad(this.idActividadAEliminar)
          .subscribe({
            next: (response) => {
              Swal.fire({
                title: 'Actividad Eliminada!',
                text: 'La actividad se ha eliminado correctamente',
                icon: 'success',
                confirmButtonText: 'Aceptar',
                confirmButtonColor: '#3085d6',
              }).then(() => {
                this.cerrarModalDeleteActividad();
                // Recargar actividades
                this._servicioActividades
                  .getActividades()
                  .subscribe((response) => {
                    this.actividades = response;
                  });
              });
            },
            error: (response) => {
              console.log(response);
              Swal.fire({
                title: 'Error',
                text: 'No se pudo eliminar la actividad. Por favor, intenta nuevamente',
                icon: 'error',
                confirmButtonText: 'Aceptar',
                confirmButtonColor: '#d33',
              });
            },
          });
      }
    });
  }

  onCambiosCapitanes(): void {
    // Método opcional para manejar cambios en capitanes si es necesario
    // Por ejemplo, refrescar eventos si es necesario
  }
}
