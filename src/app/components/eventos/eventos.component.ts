import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Evento } from '../../models/Evento';
import { EventosService } from '../../services/eventos/eventos.service';
import { ProfesoresService } from '../../services/profesores/profesores.service';
import { DetallesComponent } from '../detalles/detalles.component';
import { ActividadesService } from '../../services/actividades/actividades.service';
import { PrecioActividadService } from '../../services/precio-actividad/precio-actividad.service';
import { Actividad } from '../../models/Actividad';
import Swal from 'sweetalert2';
import { forkJoin } from 'rxjs';
import { CapitanActividadesService } from '../../services/capitan-actividades/capitan-actividades.service';
import { PartidoResultadoService } from '../../services/resultados/partido-resultado.service';
import { EquiposService } from '../../services/equipos/equipos.service';
import { ResultadosService } from '../../services/resultados/resultados.service';
import { ActividadesEvento } from '../../models/ActividadesEvento';
import { Equipo } from '../../models/Equipo';

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
  public eventosFiltrados: Evento[] = [];
  public filtroActivo: 'todos' | 'proximos' | 'pasados' = 'todos';
  public mostrarModal = false;
  public mostrarModalDetalles = false;
  public mostrarFormularioInmediato = false;
  public eventoSeleccionado!: Evento;
  public esOrganizador: boolean = false;
  public insertandoActividades: boolean = false;
  public nuevoEvento = {
    fechaEvento: '',
  };
  public actividades: Actividad[] = [];
  public actividadesSeleccionadas: Actividad[] = [];
  public preciosActividades: { [key: number]: number } = {};

  // Variables para modal de modificar evento
  public mostrarModalModificar = false;
  public eventoAModificar!: Evento;
  public actividadesEventoOriginal: ActividadesEvento[] = [];
  public actividadesModificarSeleccionadas: Actividad[] = [];
  public modificandoEvento = false;

  // Captain create resultado
  public esCapitan: boolean = false;
  public mostrarModalCrearResultado: boolean = false;
  public eventoCrearResultado: Evento | null = null;
  public actividadesEventoCrear: ActividadesEvento[] = [];
  public equiposCrear: Equipo[] = [];
  public formResultado = {
    idEventoActividad: 0,
    idActividad: 0,
    idEquipoLocal: 0,
    idEquipoVisitante: 0,
    puntosLocal: 0,
    puntosVisitante: 0,
  };
  constructor(
    private _servicioEventos: EventosService,
    private _servicioProfesores: ProfesoresService,
    private _servicioActividades: ActividadesService,
    private _servicioPrecioActividad: PrecioActividadService,
    private _capitanService: CapitanActividadesService,
    private _partidoResultadoService: PartidoResultadoService,
    private _equiposService: EquiposService,
    private _resultadosService: ResultadosService,
  ) {}

  abrirModal(): void {
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.insertandoActividades = false;
    this.nuevoEvento = { fechaEvento: '' };
    this.preciosActividades = {};
  }

  actividadEstaPrecioSeleccionada(idActividad: number): boolean {
    return this.actividadesSeleccionadas.some(a => a.idActividad === idActividad);
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
                  this.cerrarModal();
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
                    this.cerrarModal();
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
                    this.cerrarModal();
                    this.actividadesSeleccionadas = [];
                    this.preciosActividades = {};
                  });
                },
              });
      } else {
        // Evento creado sin profesor (caso de fallback)
        this.cerrarModal();
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
    const eventoOriginal =
      this.eventosOriginales.find((e) => e.idEvento === evento.idEvento) ||
      evento;

    this.eventoSeleccionado = eventoOriginal;
    this.mostrarModalDetalles = true;
  }

  cerrarModalDetalles(): void {
    this.mostrarModalDetalles = false;
    this.mostrarFormularioInmediato = false;
  }

  abrirModalInscripcion(evento: Evento): void {
    const eventoOriginal =
      this.eventosOriginales.find((e) => e.idEvento === evento.idEvento) ||
      evento;

    this.eventoSeleccionado = eventoOriginal;
    this.mostrarFormularioInmediato = true;
    this.mostrarModalDetalles = true;
  }

  onActividadSeleccionada(actividad: Actividad, event: Event): void {
    //coge el checkbox seleccionado
    const input = event.target as HTMLInputElement;
    if (input.checked) {
      //busca en actividades si ya se habia añadido la actividad del checkbox y sino la añade
      if (
        !this.actividadesSeleccionadas.find(
          (a) => a.idActividad === actividad.idActividad
        )
      ) {
        this.actividadesSeleccionadas.push(actividad);
      }
    } else {
      //si esta en actividadesSeleccionadas las filtra para que solo quede una
      this.actividadesSeleccionadas = this.actividadesSeleccionadas.filter(
        (a) => a.idActividad !== actividad.idActividad
      );
      // Limpiar el precio de la actividad deseleccionada
      delete this.preciosActividades[actividad.idActividad];
    }
    console.log('Actividades seleccionadas:', this.actividadesSeleccionadas);
  }

  filtrarTodos(): void {
    this.eventosFiltrados = [...this.eventos];
    this.filtroActivo = 'todos';
  }

  filtrarProximos(): void {
    this.eventosFiltrados = this.eventos.filter((evento) =>
      this.comprobarFechaProxima(evento)
    );
    this.filtroActivo = 'proximos';
  }

  filtrarPasados(): void {
    this.eventosFiltrados = this.eventos.filter(
      (evento) => !this.comprobarFechaProxima(evento)
    );
    this.filtroActivo = 'pasados';
  }

  // ====== FUNCIONES PARA MODIFICAR EVENTO ======

  abrirModalModificar(evento: Evento): void {
    // Buscar el evento original para obtener la fecha sin formatear
    const eventoOriginal = this.eventosOriginales.find(
      (e) => e.idEvento === evento.idEvento
    );
    if (!eventoOriginal) return;

    this.eventoAModificar = { ...eventoOriginal };
    // Convertir la fecha al formato para input date (YYYY-MM-DD)
    // Extraer directamente la fecha sin conversiones de zona horaria
    this.eventoAModificar.fechaEvento = eventoOriginal.fechaEvento.split('T')[0];

    this.actividadesModificarSeleccionadas = [];
    this.actividadesEventoOriginal = [];
    this.mostrarModalModificar = true;

    // Cargar las actividades del evento
    this._servicioEventos.getActividadesEvento(evento.idEvento).subscribe({
      next: (actividadesEvento) => {
        this.actividadesEventoOriginal = actividadesEvento || [];
        // Marcar las actividades que ya están asociadas al evento
        this.actividadesModificarSeleccionadas = this.actividades.filter((act) =>
          this.actividadesEventoOriginal.some(
            (ae) => ae.idActividad === act.idActividad
          )
        );
      },
      error: () => {
        this.actividadesEventoOriginal = [];
        this.actividadesModificarSeleccionadas = [];
      },
    });
  }

  cerrarModalModificar(): void {
    this.mostrarModalModificar = false;
    this.modificandoEvento = false;
    this.actividadesModificarSeleccionadas = [];
    this.actividadesEventoOriginal = [];
  }

  actividadEstaSeleccionadaModificar(idActividad: number): boolean {
    return this.actividadesModificarSeleccionadas.some(
      (a) => a.idActividad === idActividad
    );
  }

  onActividadSeleccionadaModificar(actividad: Actividad, event: Event): void {
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
          .insertarActividadesEvento(this.eventoAModificar.idEvento, actividad.idActividad)
          .subscribe({
            next: (response) => {
              console.log('Actividad insertada:', response);
              // Añadir a las actividades originales para mantener el tracking
              this.actividadesEventoOriginal.push({
                idEventoActividad: response.idEventoActividad || response.id,
                idEvento: this.eventoAModificar.idEvento,
                idActividad: actividad.idActividad,
                nombreActividad: actividad.nombre,
                posicion: 0,
                fechaEvento: this.eventoAModificar.fechaEvento,
                idProfesor: this.eventoAModificar.idProfesor,
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
    if (!this.eventoAModificar.fechaEvento) {
      Swal.fire({
        title: 'Error',
        text: 'Por favor, selecciona una fecha para el evento',
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
        this.cerrarModalModificar();

        // Refrescar lista de eventos
        this._servicioEventos.getEventos().subscribe((response) => {
          const ahora = new Date().getTime();
          const eventosOrdenados = [...response].sort((a, b) => {
            const fechaA = new Date(a.fechaEvento).getTime();
            const fechaB = new Date(b.fechaEvento).getTime();
            const esProximoA = fechaA > ahora;
            const esProximoB = fechaB > ahora;
            if (esProximoA !== esProximoB) {
              return esProximoA ? -1 : 1;
            }
            if (esProximoA) {
              return fechaA - fechaB;
            }
            return fechaB - fechaA;
          });
          this.eventosOriginales = eventosOrdenados;
          this.eventos = eventosOrdenados.map((evento: any) => ({
            ...evento,
            fechaEvento: this.formatearFecha(evento.fechaEvento),
          }));
          this.eventosFiltrados = [...this.eventos];
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

  ngOnInit(): void {
    if (parseInt(localStorage.getItem('idRole') || '0') == 4) {
      this.esOrganizador = true;
    }

    // detección de capitán
    const userIdRaw = localStorage.getItem('userID');
    const userId = userIdRaw ? Number.parseInt(userIdRaw, 10) : NaN;
    if (Number.isFinite(userId) && userId > 0) {
      this._capitanService.getCapitanByUsuario(userId).subscribe({
        next: (capitan) => (this.esCapitan = !!capitan),
        error: () => (this.esCapitan = false),
      });
    } else {
      this.esCapitan = false;
    }
    this._servicioEventos.getEventos().subscribe((response) => {
      // En "todos": primero próximos/abiertos y después pasados.
      // - Próximos: fecha ascendente (el más cercano primero)
      // - Pasados: fecha descendente (el más reciente primero)
      const ahora = new Date().getTime();
      const eventosOrdenados = [...response].sort((a, b) => {
        const fechaA = new Date(a.fechaEvento).getTime();
        const fechaB = new Date(b.fechaEvento).getTime();

        const esProximoA = fechaA > ahora;
        const esProximoB = fechaB > ahora;

        // Primero próximos, luego pasados
        if (esProximoA !== esProximoB) {
          return esProximoA ? -1 : 1;
        }

        // Dentro de cada grupo
        if (esProximoA) {
          return fechaA - fechaB;
        }
        return fechaB - fechaA;
      });

      this.eventosOriginales = eventosOrdenados;
      this.eventos = eventosOrdenados.map((evento: any) => ({
        ...evento,
        fechaEvento: this.formatearFecha(evento.fechaEvento),
      }));

      this.eventosFiltrados = [...this.eventos];
      this.filtroActivo = 'todos';

      console.log(response);
    });

    this._servicioActividades.getActividades().subscribe((response) => {
      this.actividades = response;
      console.log('Actividades:' + this.actividades);
    });
  }

  abrirModalCrearResultado(evento: Evento): void {
    if (!this.esCapitan) return;
    // find original event to keep raw date/id
    const eventoOriginal =
      this.eventosOriginales.find((e) => e.idEvento === evento.idEvento) || evento;
    this.eventoCrearResultado = eventoOriginal;
    this.mostrarModalCrearResultado = true;
    this.actividadesEventoCrear = [];
    this.equiposCrear = [];
    this.formResultado = {
      idEventoActividad: 0,
      idActividad: 0,
      idEquipoLocal: 0,
      idEquipoVisitante: 0,
      puntosLocal: 0,
      puntosVisitante: 0,
    };

    this._servicioEventos.getActividadesEvento(eventoOriginal.idEvento).subscribe({
      next: (acts) => (this.actividadesEventoCrear = acts ?? []),
      error: () => (this.actividadesEventoCrear = []),
    });
  }

  cerrarModalCrearResultado(): void {
    this.mostrarModalCrearResultado = false;
    this.eventoCrearResultado = null;
    this.actividadesEventoCrear = [];
    this.equiposCrear = [];
  }

  onActividadEventoCrearChange(): void {
    const idEventoActividad = Number(this.formResultado.idEventoActividad || 0);
    const act = this.actividadesEventoCrear.find((a) => a.idEventoActividad === idEventoActividad);
    this.formResultado.idActividad = act?.idActividad ?? 0;
    this.formResultado.idEquipoLocal = 0;
    this.formResultado.idEquipoVisitante = 0;
    this.equiposCrear = [];
    if (!this.eventoCrearResultado || !act?.idActividad) return;
    this._equiposService
      .getEquiposActividadEvento(act.idActividad, this.eventoCrearResultado.idEvento)
      .subscribe({
        next: (equipos) => (this.equiposCrear = equipos ?? []),
        error: () => (this.equiposCrear = []),
      });
  }

  crearResultado(): void {
    if (!this.eventoCrearResultado) return;
    if (
      !this.formResultado.idEventoActividad ||
      !this.formResultado.idEquipoLocal ||
      !this.formResultado.idEquipoVisitante
    ) {
      Swal.fire({
        title: 'Datos incompletos',
        text: 'Selecciona actividad y ambos equipos.',
        icon: 'warning',
        confirmButtonText: 'Aceptar',
      });
      return;
    }
    if (this.formResultado.idEquipoLocal === this.formResultado.idEquipoVisitante) {
      Swal.fire({
        title: 'Equipos inválidos',
        text: 'El equipo local y visitante no pueden ser el mismo.',
        icon: 'warning',
        confirmButtonText: 'Aceptar',
      });
      return;
    }

    this._partidoResultadoService
      .create({
        idPartidoResultado: 0,
        idEventoActividad: this.formResultado.idEventoActividad,
        idEquipoLocal: this.formResultado.idEquipoLocal,
        idEquipoVisitante: this.formResultado.idEquipoVisitante,
        puntosLocal: this.formResultado.puntosLocal,
        puntosVisitante: this.formResultado.puntosVisitante,
      })
      .subscribe({
        next: () => {
          // Invalidar caché de resultados para que /resultados muestre datos actualizados.
          this._resultadosService.invalidateCache();
          Swal.fire({
            title: 'Resultado creado',
            text: 'Se ha guardado el resultado correctamente.',
            icon: 'success',
            confirmButtonText: 'Aceptar',
          }).then(() => this.cerrarModalCrearResultado());
        },
        error: () => {
          Swal.fire({
            title: 'Error',
            text: 'No se pudo crear el resultado (requiere rol capitán).',
            icon: 'error',
            confirmButtonText: 'Aceptar',
          });
        },
      });
  }
}
