import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Evento } from '../../models/Evento';
import { Actividad } from '../../models/Actividad';
import { ActividadesEvento } from '../../models/ActividadesEvento';
import { EventosService } from '../../services/eventos/eventos.service';
import { ProfesoresService } from '../../services/profesores/profesores.service';
import { ActividadesService } from '../../services/actividades/actividades.service';
import { PrecioActividadService } from '../../services/precio-actividad/precio-actividad.service';
import { InscripcionesService } from '../../services/inscripciones/inscripciones.service';
import { GestionCapitanesComponent } from '../gestion-capitanes/gestion-capitanes.component';
import { GestionPagosComponent } from '../gestion-pagos/gestion-pagos.component';
import Swal from 'sweetalert2';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-panel-organizador',
  standalone: true,
  imports: [FormsModule, CommonModule, GestionCapitanesComponent, GestionPagosComponent],
  templateUrl: './panel-organizador.component.html',
  styleUrl: './panel-organizador.component.css',
})
export class PanelOrganizadorComponent implements OnInit {
  // Estados para modales
  public mostrarModalEvento = false;
  public mostrarModalActividad = false;
  public mostrarModalUpdateEvento = false;
  public mostrarModalDeleteEvento = false;
  public mostrarModalDeleteActividad = false;
  public mostrarModalUpdateActividad = false;
  public insertandoActividades = false;
  public eventos: Evento[] = [];
  public idEventoAEliminar!: number;
  public idActividadAEliminar!: number;
  public idEventoActualizar = 0;
  // Datos para formulario de evento
  public nuevoEvento = {
    fechaEvento: '',
  };
  public actividades: Actividad[] = [];
  public actividadesSeleccionadas: Actividad[] = [];
  public preciosActividades: { [key: number]: number } = {};

  // Variables para modal de modificar evento
  public eventoAModificar: Evento | null = null;
  public actividadesEventoOriginal: ActividadesEvento[] = [];
  public actividadesModificarSeleccionadas: Actividad[] = [];
  public modificandoEvento = false;

  // Datos para formulario de actividad
  public nuevaActividad = {
    nombre: '',
    minimoJugadores: 1,
  };

  // Datos para modificar actividad
  public idActividadAModificar: number = 0;
  public actividadAModificar: Actividad = {
    idActividad: 0,
    nombre: '',
    minimoJugadores: 1,
  };

  constructor(
    private _servicioEventos: EventosService,
    private _servicioProfesores: ProfesoresService,
    private _servicioActividades: ActividadesService,
    private _servicioPrecioActividad: PrecioActividadService,
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
      sinEventos: this._servicioProfesores.getProfesoresSinEventos(),
      conEventos: this._servicioProfesores.getProfesoresConEventos(),
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
        // Espaciamos ligeramente cada petición para evitar errores 500 por demasiadas llamadas simultáneas.
        if (idEvento && this.actividadesSeleccionadas.length > 0) {
          let delayMs = 0;
          const incrementoDelay = 200; // 200 ms entre llamadas; ajustable si hace falta

          // Activar el loader mientras se insertan las actividades
          this.insertandoActividades = true;

          this.actividadesSeleccionadas.forEach((act) => {
            console.log('Programando inserción de actividad: ' + act.nombre);
            setTimeout(() => {
              console.log('Añadiendo actividad: ' + act.nombre);
              this._servicioEventos
                .insertarActividadesEvento(idEvento, act.idActividad)
                .subscribe({
                  next: (response) => {
                    console.log(response);
                    // Obtener el idEventoActividad de la respuesta
                    const idEventoActividad =
                      response.idEventoActividad || response.id;
                    // Obtener el precio de la actividad
                    const precio =
                      this.preciosActividades[act.idActividad] || 0;
                    // Insertar el precio de la actividad si se ha definido
                    if (idEventoActividad && precio > 0) {
                      this._servicioPrecioActividad
                        .insertarPrecioActividad(precio, idEventoActividad)
                        .subscribe({
                          next: (precioResponse) => {
                            console.log('Precio: ' + precioResponse);
                            console.log('Precio insertado:', precioResponse);
                          },
                          error: (error) => {
                            console.error(
                              'Error al insertar precio:',
                              error,
                            );
                          },
                        });
                    }
                  },
                  error: (error) => {
                    console.error('Error al insertar actividad:', error);
                  },
                });
            }, delayMs);

            delayMs += incrementoDelay;
          });

          // Cuando hayan pasado todos los delays, asociar el profesor y desactivar el loader
          setTimeout(() => {
            this.insertandoActividades = false;
            this.asociarProfesorYFinalizar(idEvento, idProfesor);
          }, delayMs + 500);
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

  // Método para asociar el profesor y finalizar la creación
  asociarProfesorYFinalizar(idEvento: number, idProfesor: number): void {
    if (idEvento && idProfesor > 0) {
          this._servicioProfesores
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

  abrirModalUpdateEvento(): void {
    this.mostrarModalUpdateEvento = true;
    this._servicioEventos.getEventos().subscribe((response) => {
      this.eventos = response;
    });
  }

  cerrarModalUpdateEvento(): void {
    this.mostrarModalUpdateEvento = false;
    this.modificandoEvento = false;
    this.idEventoActualizar = 0;
    this.eventoAModificar = null;
    this.actividadesModificarSeleccionadas = [];
    this.actividadesEventoOriginal = [];
  }

  onEventoSeleccionadoParaModificar(): void {
    if (!this.idEventoActualizar) return;

    const eventoSeleccionado = this.eventos.find(
      (e) => e.idEvento === this.idEventoActualizar
    );
    if (!eventoSeleccionado) return;

    this.eventoAModificar = { ...eventoSeleccionado };
    // Convertir la fecha al formato para input date (YYYY-MM-DD)
    const fecha = new Date(eventoSeleccionado.fechaEvento);
    this.eventoAModificar.fechaEvento = fecha.toISOString().split('T')[0];

    this.actividadesModificarSeleccionadas = [];
    this.actividadesEventoOriginal = [];

    // Cargar actividades y actividades del evento en paralelo para evitar estado vacío si actividades aún no ha llegado
    forkJoin({
      actividades: this._servicioActividades.getActividades(),
      actividadesEvento: this._servicioEventos.getActividadesEvento(this.idEventoActualizar),
    }).subscribe({
      next: (result) => {
        this.actividadesEventoOriginal = result.actividadesEvento || [];
        this.actividadesModificarSeleccionadas = result.actividades.filter((act) =>
          this.actividadesEventoOriginal.some(
            (ae) => ae.idActividad === act.idActividad
          )
        );
        this._cdr.detectChanges();
      },
      error: () => {
        this.actividadesEventoOriginal = [];
        this.actividadesModificarSeleccionadas = [];
      },
    });
  }

  actividadEstaSeleccionadaModificar(idActividad: number): boolean {
    return this.actividadesModificarSeleccionadas.some(
      (a) => a.idActividad === idActividad
    );
  }

  onActividadSeleccionadaModificar(actividad: Actividad, event: Event): void {
    const evento = this.eventoAModificar;
    if (!evento) return;
    const input = event.target as HTMLInputElement;
    const actividadEvento = this.actividadesEventoOriginal.find(
      (ae) => ae.idActividad === actividad.idActividad
    );

    if (input.checked) {
      // Añadir actividad si no existe
      if (!this.actividadesModificarSeleccionadas.find(
        (a) => a.idActividad === actividad.idActividad
      )) {
        this.actividadesModificarSeleccionadas.push(actividad);
      }

      // Si no estaba en el evento original, insertar
      if (!actividadEvento) {
        this._servicioEventos
          .insertarActividadesEvento(evento.idEvento, actividad.idActividad)
          .subscribe({
            next: (response) => {
              console.log('Actividad insertada:', response);
              // Añadir a las actividades originales para mantener el tracking
              this.actividadesEventoOriginal.push({
                idEventoActividad: response.idEventoActividad || response.id,
                idEvento: evento.idEvento,
                idActividad: actividad.idActividad,
                nombreActividad: actividad.nombre,
                posicion: 0,
                fechaEvento: evento.fechaEvento,
                idProfesor: evento.idProfesor,
                minimoJugadores: 0,
              } as ActividadesEvento);
              Swal.fire({
                title: 'Actividad añadida',
                text: `Se ha añadido "${actividad.nombre}" al evento`,
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
              });
            },
            error: (error) => {
              console.error('Error al insertar actividad:', error);
              // Revertir selección
              this.actividadesModificarSeleccionadas = this.actividadesModificarSeleccionadas.filter(
                (a) => a.idActividad !== actividad.idActividad
              );
              input.checked = false;
              Swal.fire({
                title: 'Error',
                text: 'No se pudo añadir la actividad',
                icon: 'error',
              });
            },
          });
      }
    } else {
      // Quitar de seleccionadas
      this.actividadesModificarSeleccionadas = this.actividadesModificarSeleccionadas.filter(
        (a) => a.idActividad !== actividad.idActividad
      );

      // Si estaba en el evento original, eliminar
      if (actividadEvento) {
        this._servicioEventos
          .deleteActividadesEvento(actividadEvento.idEventoActividad)
          .subscribe({
            next: () => {
              console.log('Actividad eliminada');
              // Quitar de las actividades originales
              this.actividadesEventoOriginal = this.actividadesEventoOriginal.filter(
                (ae) => ae.idActividad !== actividad.idActividad
              );
              Swal.fire({
                title: 'Actividad eliminada',
                text: `Se ha eliminado "${actividad.nombre}" del evento`,
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
              });
            },
            error: (error) => {
              console.error('Error al eliminar actividad:', error);
              // Revertir selección
              this.actividadesModificarSeleccionadas.push(actividad);
              input.checked = true;
              Swal.fire({
                title: 'Error',
                text: 'No se pudo eliminar la actividad',
                icon: 'error',
              });
            },
          });
      }
    }
  }

  modificarEvento(): void {
    if (!this.eventoAModificar || !this.eventoAModificar.fechaEvento) {
      Swal.fire({
        title: 'Error',
        text: 'Por favor, selecciona un evento y una fecha',
        icon: 'error',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#d33',
      });
      return;
    }

    this.modificandoEvento = true;

    // Convertir la fecha al formato ISO
    const fechaISO = new Date(this.eventoAModificar.fechaEvento).toISOString();
    const eventoActualizado: Evento = {
      idEvento: this.eventoAModificar.idEvento,
      fechaEvento: fechaISO,
      idProfesor: this.eventoAModificar.idProfesor,
      listaActividades: [],
    };

    this._servicioEventos.updateEvento(eventoActualizado).subscribe({
      next: () => {
        this.modificandoEvento = false;
        this.cerrarModalUpdateEvento();

        // Refrescar lista de eventos
        this._servicioEventos.getEventos().subscribe((response) => {
          this.eventos = response;
        });

        Swal.fire({
          title: '¡Evento Modificado!',
          text: 'El evento se ha actualizado correctamente',
          icon: 'success',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#3085d6',
        });
      },
      error: () => {
        this.modificandoEvento = false;
        Swal.fire({
          title: 'Error',
          text: 'No se pudo modificar el evento. Por favor, intenta nuevamente',
          icon: 'error',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#d33',
        });
      },
    });
  }

  abrirModalUpdateActividad(): void {
    this.mostrarModalUpdateActividad = true;
    this._servicioActividades.getActividades().subscribe((response) => {
      this.actividades = response;
    });
  }

  cerrarModalUpdateActividad(): void {
    this.mostrarModalUpdateActividad = false;
    this.idActividadAModificar = 0;
    this.actividadAModificar = {
      idActividad: 0,
      nombre: '',
      minimoJugadores: 1,
    };
  }

  onActividadSeleccionadaParaModificar(): void {
    if (!this.idActividadAModificar) {
      this.actividadAModificar = {
        idActividad: 0,
        nombre: '',
        minimoJugadores: 1,
      };
      return;
    }

    const actividadSeleccionada = this.actividades.find(
      (a) => a.idActividad === this.idActividadAModificar
    );

    if (actividadSeleccionada) {
      this.actividadAModificar = { ...actividadSeleccionada };
    }
  }

  modificarActividad(): void {
    if (!this.actividadAModificar.nombre) {
      Swal.fire({
        title: 'Error',
        text: 'Por favor, ingresa un nombre para la actividad',
        icon: 'error',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#d33',
      });
      return;
    }

    if (this.actividadAModificar.minimoJugadores < 1) {
      Swal.fire({
        title: 'Error',
        text: 'El mínimo de jugadores debe ser al menos 1',
        icon: 'error',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#d33',
      });
      return;
    }

    this._servicioActividades.updateActividad(this.actividadAModificar).subscribe({
      next: () => {
        Swal.fire({
          title: '¡Actividad Modificada!',
          text: 'La actividad se ha actualizado correctamente',
          icon: 'success',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#3085d6',
        }).then(() => {
          this.cerrarModalUpdateActividad();
          // Recargar actividades
          this._servicioActividades.getActividades().subscribe((response) => {
            this.actividades = response;
          });
        });
      },
      error: () => {
        Swal.fire({
          title: 'Error',
          text: 'No se pudo modificar la actividad. Por favor, intenta nuevamente',
          icon: 'error',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#d33',
        });
      },
    });
  }
}
