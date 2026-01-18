import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Evento } from '../../models/Evento';
import { EventosService } from '../../services/eventos/eventos.service';
import { DetallesComponent } from '../detalles/detalles.component';
import { ActividadesService } from '../../services/actividades/actividades.service';
import { Actividad } from '../../models/Actividad';
import Swal from 'sweetalert2';

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
  public nuevoEvento = {
    fechaEvento: '',
    idProfesor: 0,
  };
  public actividades: Actividad[] = [];
  public actividadesSeleccionadas: Actividad[] = [];
  constructor(
    private _servicioEventos: EventosService,
    private _servicioActividades: ActividadesService
  ) {}

  abrirModal(): void {
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.nuevoEvento = { fechaEvento: '', idProfesor: 0 };
  }

  crearEvento(): void {
    if (!this.nuevoEvento.fechaEvento) {
      Swal.fire({
        title: 'Error',
        text: 'Por favor, selecciona una fecha para el evento',
        icon: 'error',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#d33'
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
                confirmButtonColor: '#d33'
              });
            }
          },
          error: () => {
            Swal.fire({
              title: 'Error',
              text: 'El usuario asignado no es un profesor',
              icon: 'error',
              confirmButtonText: 'Aceptar',
              confirmButtonColor: '#d33'
            });
          },
        });
    } else {
      // Si no hay profesor, crear evento sin profesor
      this.crearEventoConFecha();
    }
  }

  crearEventoConFecha(): void {
    // Convertir la fecha a formato ISO (2026-01-15T09:47:13.513Z)
    const fechaISO = new Date(this.nuevoEvento.fechaEvento).toISOString();

    this._servicioEventos.insertEvento(fechaISO).subscribe({
      next: (response) => {
        const idEvento = response.idEvento || response.id;
        console.log("Evento añadido: "+idEvento)
        
        // Insertar actividades si las hay
        if (idEvento && this.actividadesSeleccionadas.length > 0) {
          this.actividadesSeleccionadas.forEach(act => {
            console.log("Añadiendo actividad: "+act.nombre)
            this._servicioEventos.insertarActividadesEvento(idEvento, act.idActividad)
            .subscribe({
              next: (response) => {
                console.log(response)
              },
              error: (error) => {
                console.error("Error al insertar actividad:", error)
              }
            })
          });
        }
        
        // Asociar profesor al evento recién creado
        if (idEvento && this.nuevoEvento.idProfesor > 0) {
          this._servicioEventos
            .asociarProfesorEvento(idEvento, this.nuevoEvento.idProfesor)
            .subscribe({
              next: () => {
                this.cerrarModal();
                // Evento creado con éxito
                Swal.fire({
                  title: '¡Evento Creado!',
                  text: 'El evento se ha creado correctamente',
                  icon: 'success',
                  confirmButtonText: 'Aceptar',
                  confirmButtonColor: '#3085d6'
                }).then(() => {
                  this.ngOnInit();
                  this.cerrarModal();
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
                  confirmButtonColor: '#ff9800'
                }).then(() => {
                  this.ngOnInit();
                  this.cerrarModal();
                  this.actividadesSeleccionadas = [];
                });
              },
            });
        } else {
          // Evento creado sin profesor
          this.cerrarModal();
          Swal.fire({
            title: '¡Evento Creado!',
            text: 'El evento se ha creado correctamente',
            icon: 'success',
            confirmButtonText: 'Aceptar',
            confirmButtonColor: '#3085d6'
          }).then(() => {
            this.ngOnInit();
            this.cerrarModal();
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
          confirmButtonColor: '#d33'
        });
      },
    });
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
    const eventoOriginal = this.eventosOriginales.find(
      (e) => e.idEvento === evento.idEvento
    ) || evento;
    
    this.eventoSeleccionado = eventoOriginal;
    this.mostrarModalDetalles = true;
  }

  cerrarModalDetalles(): void {
    this.mostrarModalDetalles = false;
    this.mostrarFormularioInmediato = false;
  }

  abrirModalInscripcion(evento: Evento): void {
    const eventoOriginal = this.eventosOriginales.find(
      (e) => e.idEvento === evento.idEvento
    ) || evento;
    
    this.eventoSeleccionado = eventoOriginal;
    this.mostrarFormularioInmediato = true;
    this.mostrarModalDetalles = true;
  }

  onActividadSeleccionada(actividad: Actividad, event: Event): void {
    //coge el checkbox seleccionado
    const input = event.target as HTMLInputElement;
    if (input.checked) {
      //busca en actividades si ya se habia añadido la actividad del checkbox y sino la añade
      if (!this.actividadesSeleccionadas.find(a => a.idActividad === actividad.idActividad)) {
        this.actividadesSeleccionadas.push(actividad);
      }
    } else { //si esta en actividadesSeleccionadas las filtra para que solo quede una
      this.actividadesSeleccionadas = this.actividadesSeleccionadas.filter(
        a => a.idActividad !== actividad.idActividad
      );
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
    this.eventosFiltrados = this.eventos.filter((evento) =>
      !this.comprobarFechaProxima(evento)
    );
    this.filtroActivo = 'pasados';
  }

  ngOnInit(): void {
    this._servicioEventos.getEventos().subscribe((response) => {
      // Ordenar eventos por fecha (más recientes primero)
      const eventosOrdenados = response.sort((a, b) => {
        const fechaA = new Date(a.fechaEvento).getTime();
        const fechaB = new Date(b.fechaEvento).getTime();
        return fechaA- fechaB; // Orden descendente (más recientes primero)
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

    this._servicioActividades.getActividades().subscribe(response=>{
      this.actividades = response;
      console.log("Actividades:"+this.actividades)
    })
  }
}
