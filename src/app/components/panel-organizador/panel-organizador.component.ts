import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Evento } from '../../models/Evento';
import { Actividad } from '../../models/Actividad';
import { EventosService } from '../../services/eventos/eventos.service';
import { ActividadesService } from '../../services/actividades/actividades.service';
import { CapitanActividadesService } from '../../services/capitan-actividades/capitan-actividades.service';
import { InscripcionesService } from '../../services/inscripciones/inscripciones.service';
import { ActividadesEvento } from '../../models/ActividadesEvento';
import { Alumno } from '../../models/Alumno';
import { CapitanActividad } from '../../models/CapitanActividad';
import Swal from 'sweetalert2';
import { forkJoin, firstValueFrom } from 'rxjs';

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
  public mostrarModalDeleteEvento = false;
  public mostrarModalDeleteActividad = false;
  public mostrarModalCapitanes = false;
  public mostrarModalAsignarCapitan = false;
  public eventos: Evento[] = [];
  public idEventoAEliminar!: number;
  public idActividadAEliminar!: number;
  
  // Gestión de capitanes
  public actividadesConMinimo: ActividadesEvento[] = [];
  public actividadesConJugadores: Map<number, number> = new Map(); // idEventoActividad -> player count
  public actividadesCargandoJugadores: Set<number> = new Set(); // idEventoActividad -> loading state
  public capitanesActividades: Map<number, Alumno> = new Map(); // idEventoActividad -> captain
  public capitanesIds: Map<number, number> = new Map(); // idEventoActividad -> idCapitanActividad
  public actividadSeleccionadaParaCapitan: ActividadesEvento | null = null;
  public usuariosDisponibles: Alumno[] = [];
  public cargandoCapitanes = false;
  public cargandoUsuarios = false;
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
    private _servicioCapitanes: CapitanActividadesService,
    private _servicioInscripciones: InscripcionesService,
    private _cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this._servicioActividades.getActividades().subscribe((response) => {
      this.actividades = response;
      console.log('Actividades:', this.actividades);
    });
    this._servicioEventos.getEventos().subscribe(response => {
      this.eventos = response;
      this.cargarActividadesConMinimo();
    })
  }

  // ====== MÉTODOS PARA MODAL DE EVENTO ======
  abrirModalEvento(): void {
    this.mostrarModalEvento = true;
  }

  cerrarModalEvento(): void {
    this.mostrarModalEvento = false;
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
                  // Obtener el idEventoActividad de la respuesta
                  const idEventoActividad = response.idEventoActividad || response.id;
                  // Obtener el precio de la actividad
                  const precio = this.preciosActividades[act.idActividad] || 0;
                  // Insertar el precio de la actividad si se ha definido
                  if (idEventoActividad && precio > 0) {
                    this._servicioActividades
                      .insertarPrecioActividad(precio, idEventoActividad)
                      .subscribe({
                        next: (precioResponse) => {
                          console.log("Precio: "+precioResponse);
                          console.log('Precio insertado:', precioResponse);
                        },
                        error: (error) => {
                          console.error('Error al insertar precio:', error);
                        },
                      });
                  }
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
                // Refresh eventos list
                this._servicioEventos.getEventos().subscribe(response => {
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
                // Refresh eventos list even on error
                this._servicioEventos.getEventos().subscribe(response => {
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
          // Evento creado sin profesor (caso de fallback, no debería ocurrir normalmente)
          this.cerrarModalEvento();
          Swal.fire({
            title: '¡Evento Creado!',
            text: 'El evento se ha creado correctamente',
            icon: 'success',
            confirmButtonText: 'Aceptar',
            confirmButtonColor: '#3085d6',
          }).then(() => {
            
            this._servicioEventos.getEventos().subscribe(response => {
              this.eventos = response;
              this.cerrarModalEvento();
            })
            this.actividadesSeleccionadas = [];
            this.preciosActividades = {};
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
      // Limpiar el precio cuando se deselecciona
      delete this.preciosActividades[actividad.idActividad];
    }
  }

  actividadEstaPrecioSeleccionada(idActividad: number): boolean {
    return this.actividadesSeleccionadas.some(
      (a) => a.idActividad === idActividad
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
  abrirModalDeleteEvento(){
    this.mostrarModalDeleteEvento = true;
    this._servicioEventos.getEventos().subscribe(response => {
      this.eventos = response
    })
  }
  cerrarModalDeleteEvento(){
    this.mostrarModalDeleteEvento = false;
    this.idEventoAEliminar = 0;
  }
  deleteEvento(){

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
                  this._servicioEventos.getEventos().subscribe(response => {
                    this.eventos = response;
                  })
                });
              },
              error: (response) => {
                console.log(response)
                Swal.fire({
                  title: 'Error',
                  text: 'No se pudo eliminar el evento. Por favor, intenta nuevamente',
                  icon: 'error',
                  confirmButtonText: 'Aceptar',
                  confirmButtonColor: '#d33',
                });
              },
            })
          }
        });
      }

  abrirModalDeleteActividad(){
    this.mostrarModalDeleteActividad = true;
  }
  cerrarModalDeleteActividad(){
    this.mostrarModalDeleteActividad = false;
    this.idActividadAEliminar = 0;
  }
  deleteActividad(){

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
            this._servicioActividades.deleteActividad(this.idActividadAEliminar).subscribe({
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
                  this._servicioActividades.getActividades().subscribe(response => {
                    this.actividades = response;
                  })
                });
              },
              error: (response) => {
                console.log(response)
                Swal.fire({
                  title: 'Error',
                  text: 'No se pudo eliminar la actividad. Por favor, intenta nuevamente',
                  icon: 'error',
                  confirmButtonText: 'Aceptar',
                  confirmButtonColor: '#d33',
                });
              },
            })
          }
        });
      }

  // ====== MÉTODOS PARA GESTIÓN DE CAPITANES ======
  abrirModalCapitanes(): void {
    this.mostrarModalCapitanes = true;
    // Refresh events first, then load activities
    this._servicioEventos.getEventos().subscribe({
      next: (eventos) => {
        this.eventos = eventos;
        this.cargarActividadesConMinimo();
      },
      error: () => {
        this.cargarActividadesConMinimo();
      }
    });
  }

  cerrarModalCapitanes(): void {
    this.mostrarModalCapitanes = false;
    this.actividadSeleccionadaParaCapitan = null;
    this.usuariosDisponibles = [];
  }

  cargarActividadesConMinimo(): void {
    this.cargandoCapitanes = true;
    this.actividadesConJugadores.clear();
    this.actividadesCargandoJugadores.clear();
    const requests: any[] = [];
    
    this.eventos.forEach(evento => {
      requests.push(this._servicioEventos.getActividadesEvento(evento.idEvento));
    });

    if (requests.length === 0) {
      this.cargandoCapitanes = false;
      return;
    }

    forkJoin(requests).subscribe({
      next: (responses: ActividadesEvento[][]) => {
        const todasActividades: ActividadesEvento[] = [];
        responses.forEach(actividades => {
          todasActividades.push(...actividades);
        });

        if (todasActividades.length === 0) {
          this.actividadesConMinimo = [];
          this.cargandoCapitanes = false;
          this._cdr.detectChanges();
          return;
        }

        // Show activities IMMEDIATELY without waiting for player counts
        this.actividadesConMinimo = todasActividades;
        this.cargandoCapitanes = false;
        this._cdr.detectChanges();

        // Load player counts in background and update as they come in
        // Use smaller batches to avoid overwhelming the API
        this.cargarJugadoresEnLotes(todasActividades);
        
        // Load captains in background
        setTimeout(() => this.cargarCapitanes(), 0);
      },
      error: () => {
        this.cargandoCapitanes = false;
        this._cdr.detectChanges();
      },
    });
  }

  cargarJugadoresEnLotes(actividades: ActividadesEvento[]): void {
    // Mark all activities as loading
    actividades.forEach(actividad => {
      this.actividadesCargandoJugadores.add(actividad.idEventoActividad);
    });
    this._cdr.detectChanges();

    // Load player counts in batches of 5 to avoid overwhelming the API
    const batchSize = 5;
    let currentIndex = 0;

    const loadBatch = () => {
      const batch = actividades.slice(currentIndex, currentIndex + batchSize);
      if (batch.length === 0) return;

      const batchRequests = batch.map(actividad =>
        this._servicioInscripciones.getUsuariosEventoActividad(
          actividad.idEvento,
          actividad.idActividad
        )
      );

      forkJoin(batchRequests).subscribe({
        next: (usuariosArrays) => {
          usuariosArrays.forEach((usuarios, index) => {
            const idEventoActividad = batch[index].idEventoActividad;
            const playerCount = usuarios ? usuarios.length : 0;
            this.actividadesConJugadores.set(idEventoActividad, playerCount);
            this.actividadesCargandoJugadores.delete(idEventoActividad);
          });
          this._cdr.detectChanges();
          
          // Load next batch
          currentIndex += batchSize;
          if (currentIndex < actividades.length) {
            setTimeout(loadBatch, 50); // Small delay between batches
          }
        },
        error: () => {
          // On error, set 0 for this batch and mark as loaded
          batch.forEach(actividad => {
            this.actividadesConJugadores.set(actividad.idEventoActividad, 0);
            this.actividadesCargandoJugadores.delete(actividad.idEventoActividad);
          });
          this._cdr.detectChanges();
          
          currentIndex += batchSize;
          if (currentIndex < actividades.length) {
            setTimeout(loadBatch, 50);
          }
        },
      });
    };

    // Start loading first batch
    loadBatch();
  }

  cargarCapitanes(): void {
    this.capitanesActividades.clear();
    this.capitanesIds.clear();
    
    if (this.actividadesConMinimo.length === 0) {
      this._cdr.detectChanges();
      return;
    }

    // Load all captains once, then match them - this is faster than individual calls
    this._servicioCapitanes.getAllCapitanActividades().subscribe({
      next: (todos) => {
        // Create maps for quick lookup
        const capitanMap = new Map<number, CapitanActividad>();
        todos.forEach(c => {
          capitanMap.set(c.idEventoActividad, c);
        });

        // Store IDs immediately from the map for all activities with captains
        this.actividadesConMinimo.forEach(actividad => {
          const capitanData = capitanMap.get(actividad.idEventoActividad);
          if (capitanData) {
            this.capitanesIds.set(actividad.idEventoActividad, capitanData.idCapitanActividad);
          }
        });

        // Only fetch captain details for activities that have captains
        const actividadesConCapitan = this.actividadesConMinimo.filter(actividad =>
          capitanMap.has(actividad.idEventoActividad)
        );

        if (actividadesConCapitan.length === 0) {
          this._cdr.detectChanges();
          return;
        }

        // Load captain details in batches to avoid overwhelming the API
        this.cargarDetallesCapitanesEnLotes(actividadesConCapitan);
      },
      error: () => {
        // If we can't load captains, still show activities
        this._cdr.detectChanges();
      }
    });
  }

  cargarDetallesCapitanesEnLotes(actividades: ActividadesEvento[]): void {
    // Load captain details in batches of 3
    const batchSize = 3;
    let currentIndex = 0;

    const loadBatch = () => {
      const batch = actividades.slice(currentIndex, currentIndex + batchSize);
      if (batch.length === 0) {
        this._cdr.detectChanges();
        return;
      }

      const captainRequests = batch.map(actividad =>
        this._servicioCapitanes.getCapitanByEventoActividad(actividad.idEventoActividad)
      );

      forkJoin(captainRequests).subscribe({
        next: (capitanes) => {
          capitanes.forEach((capitan, index) => {
            if (capitan) {
              const idEventoActividad = batch[index].idEventoActividad;
              this.capitanesActividades.set(idEventoActividad, capitan);
            }
          });
          this._cdr.detectChanges();
          
          // Load next batch
          currentIndex += batchSize;
          if (currentIndex < actividades.length) {
            setTimeout(loadBatch, 30); // Small delay between batches
          } else {
            this._cdr.detectChanges();
          }
        },
        error: () => {
          // On error, continue with next batch
          currentIndex += batchSize;
          if (currentIndex < actividades.length) {
            setTimeout(loadBatch, 30);
          } else {
            this._cdr.detectChanges();
          }
        }
      });
    };

    // Start loading first batch
    loadBatch();
  }

  async refrescarCapitanActividad(idEventoActividad: number): Promise<void> {
    // Refresh captain for a specific activity
    try {
      const capitan = await firstValueFrom(
        this._servicioCapitanes.getCapitanByEventoActividad(idEventoActividad)
      );
      
      if (capitan) {
        // Update cached captain details for this activity
        this.capitanesActividades.set(idEventoActividad, capitan);
      } else {
        // Remove if no longer captain
        this.capitanesActividades.delete(idEventoActividad);
        this.capitanesIds.delete(idEventoActividad);
      }
      this._cdr.detectChanges();
    } catch (error) {
      // If error (like 204), remove captain
      this.capitanesActividades.delete(idEventoActividad);
      this.capitanesIds.delete(idEventoActividad);
      this._cdr.detectChanges();
    }
  }

  async seleccionarCapitanAleatorio(actividad: ActividadesEvento): Promise<void> {
    // Check if minimum players is met
    if (!this.tieneMinimoJugadores(actividad)) {
      await Swal.fire({
        title: 'Mínimo no alcanzado',
        text: `Esta actividad necesita ${actividad.minimoJugadores} jugadores. Actualmente tiene ${this.getJugadoresCount(actividad.idEventoActividad)}.`,
        icon: 'warning',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#ff9800',
      });
      return;
    }

    try {
      // Get users who want to be captain
      let candidatos = await firstValueFrom(
        this._servicioInscripciones.getUsuariosQuierenSerCapitanActividad(
          actividad.idEvento,
          actividad.idActividad
        )
      );

      // If no candidates, get all registered users
      if (candidatos.length === 0) {
        candidatos = await firstValueFrom(
          this._servicioInscripciones.getUsuariosEventoActividad(
            actividad.idEvento,
            actividad.idActividad
          )
        );
      }

      if (candidatos.length === 0) {
        await Swal.fire({
          title: 'Error',
          text: 'No hay usuarios registrados para esta actividad',
          icon: 'error',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#d33',
        });
        return;
      }

      // Random selection
      const randomIndex = Math.floor(Math.random() * candidatos.length);
      const selectedUser = candidatos[randomIndex];

      // Check if this user is already the captain
      const currentCaptain = this.capitanesActividades.get(actividad.idEventoActividad);
      
      if (currentCaptain && currentCaptain.idUsuario === selectedUser.idUsuario) {
        await Swal.fire({
          title: 'Ya es capitán',
          text: `${(selectedUser as any).usuario || selectedUser.nombre || 'Usuario'} ya es el capitán de esta actividad.`,
          icon: 'info',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#3085d6',
        });
        return;
      }

      // Check if captain already exists and ask for confirmation to change
      const existingId = this.capitanesIds.get(actividad.idEventoActividad);
      
      if (existingId && currentCaptain) {
        const result = await Swal.fire({
          title: '¿Cambiar capitán?',
          html: `El capitán actual es <strong>${this.getCapitanNombre(actividad.idEventoActividad)}</strong>.<br>
                 ¿Deseas cambiarlo por <strong>${(selectedUser as any).usuario || selectedUser.nombre || 'Usuario'}</strong>?`,
          icon: 'question',
          showCancelButton: true,
          cancelButtonText: 'Cancelar',
          cancelButtonColor: '#595d60',
          confirmButtonText: 'Sí, cambiar',
          confirmButtonColor: '#3085d6',
        });

        if (!result.isConfirmed) {
          return;
        }
      }
      
      const capitan: CapitanActividad = {
        idCapitanActividad: existingId || 0,
        idEventoActividad: actividad.idEventoActividad,
        idUsuario: selectedUser.idUsuario,
      };

      if (existingId) {
        await firstValueFrom(this._servicioCapitanes.updateCapitanActividad(capitan));
      } else {
        await firstValueFrom(this._servicioCapitanes.createCapitanActividad(capitan));
      }

      await Swal.fire({
        title: '¡Capitán Asignado!',
        text: `Se ha asignado ${(selectedUser as any).usuario || selectedUser.nombre || 'Usuario'} como capitán`,
        icon: 'success',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#3085d6',
      });

      // Refresh captain data for this activity
      await this.refrescarCapitanActividad(actividad.idEventoActividad);
    } catch (error) {
      await Swal.fire({
        title: 'Error',
        text: 'No se pudo asignar el capitán',
        icon: 'error',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#d33',
      });
    }
  }

  abrirModalAsignarCapitan(actividad: ActividadesEvento): void {
    this.actividadSeleccionadaParaCapitan = actividad;
    this.cargarUsuariosDisponibles(actividad);
    this.mostrarModalAsignarCapitan = true;
  }

  cerrarModalAsignarCapitan(): void {
    this.mostrarModalAsignarCapitan = false;
    this.actividadSeleccionadaParaCapitan = null;
    this.usuariosDisponibles = [];
    this.cargandoUsuarios = false;
  }

  cargarUsuariosDisponibles(actividad: ActividadesEvento): void {
    this.cargandoUsuarios = true;
    this.usuariosDisponibles = [];

    // Check if we already have the user count cached, use that to show immediately
    const cachedCount = this.actividadesConJugadores.get(actividad.idEventoActividad);
    if (cachedCount !== undefined && cachedCount === 0) {
      // If we know there are 0 users, show immediately
      this.usuariosDisponibles = [];
      this.cargandoUsuarios = false;
      this._cdr.detectChanges();
      return;
    }

    this._servicioInscripciones
      .getUsuariosEventoActividad(actividad.idEvento, actividad.idActividad)
      .subscribe({
        next: (usuarios) => {
          this.usuariosDisponibles = usuarios || [];
          this.cargandoUsuarios = false;
          this._cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading users:', error);
          this.usuariosDisponibles = [];
          this.cargandoUsuarios = false;
          this._cdr.detectChanges();
        },
      });
  }

  private async verificarMinimoJugadoresYMostrarAlerta(
    actividad: ActividadesEvento
  ): Promise<boolean> {
    if (this.tieneMinimoJugadores(actividad)) {
      return true;
    }

    await Swal.fire({
      title: 'Mínimo no alcanzado',
      text: `Esta actividad necesita ${actividad.minimoJugadores} jugadores. Actualmente tiene ${this.getJugadoresCount(actividad.idEventoActividad)}.`,
      icon: 'warning',
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#ff9800',
    });

    return false;
  }

  async asignarCapitanManual(usuario: Alumno): Promise<void> {
    if (!this.actividadSeleccionadaParaCapitan) return;

    const minimoAlcanzado = await this.verificarMinimoJugadoresYMostrarAlerta(
      this.actividadSeleccionadaParaCapitan
    );
    if (!minimoAlcanzado) {
      return;
    }

    // Check if this user is already the captain
    const currentCaptain = this.capitanesActividades.get(
      this.actividadSeleccionadaParaCapitan.idEventoActividad
    );
    
    if (currentCaptain && currentCaptain.idUsuario === usuario.idUsuario) {
      await Swal.fire({
        title: 'Ya es capitán',
        text: `${this.getUsuarioNombre(usuario)} ya es el capitán de esta actividad.`,
        icon: 'info',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    // If there's already a captain, ask for confirmation to change
    const existingId = this.capitanesIds.get(
      this.actividadSeleccionadaParaCapitan.idEventoActividad
    );

    if (existingId && currentCaptain) {
      const result = await Swal.fire({
        title: '¿Cambiar capitán?',
        html: `El capitán actual es <strong>${this.getCapitanNombre(this.actividadSeleccionadaParaCapitan.idEventoActividad)}</strong>.<br>
               ¿Deseas cambiarlo por <strong>${this.getUsuarioNombre(usuario)}</strong>?`,
        icon: 'question',
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        cancelButtonColor: '#595d60',
        confirmButtonText: 'Sí, cambiar',
        confirmButtonColor: '#3085d6',
      });

      if (!result.isConfirmed) {
        return;
      }
    }

    try {
      const capitan: CapitanActividad = {
        idCapitanActividad: existingId || 0,
        idEventoActividad: this.actividadSeleccionadaParaCapitan.idEventoActividad,
        idUsuario: usuario.idUsuario,
      };

      if (existingId) {
        await firstValueFrom(this._servicioCapitanes.updateCapitanActividad(capitan));
      } else {
        await firstValueFrom(this._servicioCapitanes.createCapitanActividad(capitan));
      }

      await Swal.fire({
        title: '¡Capitán Asignado!',
        text: `Se ha asignado ${(usuario as any).usuario || usuario.nombre || 'Usuario'} como capitán`,
        icon: 'success',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#3085d6',
      });

      // Refresh captain data before closing modal
      if (this.actividadSeleccionadaParaCapitan) {
        await this.refrescarCapitanActividad(this.actividadSeleccionadaParaCapitan.idEventoActividad);
      }
      
      this.cerrarModalAsignarCapitan();
    } catch (error) {
      await Swal.fire({
        title: 'Error',
        text: 'No se pudo asignar el capitán',
        icon: 'error',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#d33',
      });
    }
  }

  async eliminarCapitan(actividad: ActividadesEvento): Promise<void> {
    const idCapitanActividad = this.capitanesIds.get(actividad.idEventoActividad);
    if (!idCapitanActividad) return;

    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Se eliminará el capitán de esta actividad',
      icon: 'warning',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      cancelButtonColor: '#595d60',
      confirmButtonText: 'Eliminar',
      confirmButtonColor: '#d33',
    });

    if (result.isConfirmed) {
      try {
        await firstValueFrom(
          this._servicioCapitanes.deleteCapitanActividad(idCapitanActividad)
        );
        await Swal.fire({
          title: 'Capitán Eliminado',
          text: 'El capitán ha sido eliminado correctamente',
          icon: 'success',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#3085d6',
        });
        // Remove from maps immediately
        this.capitanesActividades.delete(actividad.idEventoActividad);
        this.capitanesIds.delete(actividad.idEventoActividad);
      } catch (error) {
        await Swal.fire({
          title: 'Error',
          text: 'No se pudo eliminar el capitán',
          icon: 'error',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#d33',
        });
      }
    }
  }

  getCapitanNombre(idEventoActividad: number): string {
    const capitan = this.capitanesActividades.get(idEventoActividad);
    if (!capitan) return '';
    // API returns 'usuario' field, but Alumno model has 'nombre' and 'apellidos'
    // Try both to be safe
    return (capitan as any).usuario || `${capitan.nombre} ${capitan.apellidos}` || 'Usuario';
  }

  tieneCapitan(idEventoActividad: number): boolean {
    return this.capitanesActividades.has(idEventoActividad);
  }

  getUsuarioNombre(usuario: Alumno): string {
    return (usuario as any).usuario || usuario.nombre || 'Usuario';
  }

  getJugadoresCount(idEventoActividad: number): number | null {
    if (this.actividadesCargandoJugadores.has(idEventoActividad)) {
      return null; // Still loading
    }
    return this.actividadesConJugadores.get(idEventoActividad) ?? 0;
  }

  estaCargandoJugadores(idEventoActividad: number): boolean {
    return this.actividadesCargandoJugadores.has(idEventoActividad);
  }

  tieneMinimoJugadores(actividad: ActividadesEvento): boolean {
    // If still loading, return false to keep buttons disabled
    if (this.estaCargandoJugadores(actividad.idEventoActividad)) {
      return false;
    }
    const count = this.getJugadoresCount(actividad.idEventoActividad);
    return count !== null && count >= actividad.minimoJugadores;
  }
      
}
