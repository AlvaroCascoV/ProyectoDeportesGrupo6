import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Evento } from '../../models/Evento';
import { EventosService } from '../../services/eventos/eventos.service';
import { ActividadesEvento } from '../../models/ActividadesEvento';

@Component({
  selector: 'app-eventos',
  standalone: true,
  imports: [RouterModule, FormsModule],
  templateUrl: './eventos.component.html',
  styleUrl: './eventos.component.css',
})
export class EventosComponent implements OnInit {
  public eventos: Evento[] = [];
  private eventosOriginales: Evento[] = [];
  public mostrarModal = false;
  public mostrarModalDetalles = false;
  public eventoSeleccionado!: Evento;
  public actividadesEvento!: ActividadesEvento[];
  public cargandoActividades = false;
  public cargandoProfesores = false;
  public profesoresMap: Map<number, string> = new Map();
  public profesoresRolesMap: Map<number, string> = new Map();
  public nuevoEvento = {
    fechaEvento: '',
    idProfesor: 0,
  };

  constructor(private _servicioEventos: EventosService) {}

  abrirModal(): void {
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.nuevoEvento = { fechaEvento: '', idProfesor: 0 };
  }

  crearEvento(): void {
    if (!this.nuevoEvento.fechaEvento) {
      return;
    }

    // Convertir la fecha a formato ISO (2026-01-15T09:47:13.513Z)
    const fechaISO = new Date(this.nuevoEvento.fechaEvento).toISOString();

    this._servicioEventos.insertEvento(fechaISO).subscribe({
      next: () => {
        // Recargar eventos después de crear
        this.ngOnInit();
        this.cerrarModal();
      },
      error: (error) => {
        console.error('Error al crear evento:', error);
        // TODO: Mostrar mensaje de error al usuario
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

  getActividadesEvento(idEvento: number): void {
    this.cargandoActividades = true;
    this._servicioEventos
      .getActividadesEvento(idEvento)
      .subscribe((response) => {
        this.actividadesEvento = response;
        this.cargandoActividades = false;
        console.log(response);
      });
  }

  abrirModalDetalles(evento: Evento): void {
    this.eventoSeleccionado = evento;
    this.actividadesEvento = [];
    this.getActividadesEvento(evento.idEvento);
    this.mostrarModalDetalles = true;
  }

  cerrarModalDetalles(): void {
    this.mostrarModalDetalles = false;
    this.cargandoActividades = false;
  }

  getNombreProfesor(idProfesor: number): string {
    return this.profesoresMap.get(idProfesor) || '';
  }

  tieneNombreProfesor(idProfesor: number): boolean {
    return this.profesoresMap.has(idProfesor);
  }

  esProfesorValido(
    idProfesor: number
  ): 'no_asignado' | 'no_es_profesor' | 'valido' {
    if (idProfesor < 0) {
      return 'no_asignado';
    }
    // Si ya terminó de cargar y el ID no está en la lista de profesores activos,
    // entonces el usuario no es un profesor
    if (!this.cargandoProfesores && !this.profesoresMap.has(idProfesor)) {
      return 'no_es_profesor';
    }
    // Si está en el mapa, verificar que sea profesor
    if (this.profesoresMap.has(idProfesor)) {
      const role = this.profesoresRolesMap.get(idProfesor);
      if (role && role.toUpperCase() !== 'PROFESOR') {
        return 'no_es_profesor';
      }
      return 'valido';
    }
    // Si aún está cargando, asumimos que es válido (puede que aún no se haya cargado)
    return 'valido';
  }

  cargarProfesores(): void {
    this.cargandoProfesores = true;
    // Cargar todos los profesores activos de una vez
    this._servicioEventos.getProfesoresActivos().subscribe({
      next: (profesores) => {
        profesores.forEach((profesor) => {
          // El campo 'usuario' contiene el nombre completo
          this.profesoresMap.set(
            profesor.idUsuario,
            profesor.usuario || `Profesor ${profesor.idUsuario}`
          );
          // Guardar el rol para verificar si es profesor
          this.profesoresRolesMap.set(profesor.idUsuario, profesor.role || '');
        });
        this.cargandoProfesores = false;
      },
      error: () => {
        console.error('Error al cargar profesores');
        this.cargandoProfesores = false;
      },
    });
  }

  ngOnInit(): void {
    // Cargar profesores primero
    this.cargarProfesores();

    this._servicioEventos.getEventos().subscribe((response) => {
      // Ordenar eventos por fecha (más recientes primero)
      const eventosOrdenados = response.sort((a, b) => {
        const fechaA = new Date(a.fechaEvento).getTime();
        const fechaB = new Date(b.fechaEvento).getTime();
        return fechaB - fechaA; // Orden descendente (más recientes primero)
      });

      this.eventosOriginales = eventosOrdenados;
      this.eventos = eventosOrdenados.map((evento: any) => ({
        ...evento,
        fechaEvento: this.formatearFecha(evento.fechaEvento),
      }));

      console.log(response);
    });
  }
}
