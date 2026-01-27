import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Evento } from '../../models/Evento';
import { EventosService } from '../../services/eventos/eventos.service';
import { ProfesoresService } from '../../services/profesores/profesores.service';
import { DetallesComponent } from '../detalles/detalles.component';
import { ActividadesService } from '../../services/actividades/actividades.service';
import { Actividad } from '../../models/Actividad';
import Swal from 'sweetalert2';
import { forkJoin } from 'rxjs';

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
  constructor(
    private _servicioEventos: EventosService,
    private _servicioProfesores: ProfesoresService,
    private _servicioActividades: ActividadesService
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

  ngOnInit(): void {
    if (parseInt(localStorage.getItem('idRole') || '0') == 4) {
      this.esOrganizador = true;
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
}
