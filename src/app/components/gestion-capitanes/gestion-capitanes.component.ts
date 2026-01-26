import { Component, OnInit, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Evento } from '../../models/Evento';
import { ActividadesEvento } from '../../models/ActividadesEvento';
import { Alumno } from '../../models/Alumno';
import { CapitanActividad } from '../../models/CapitanActividad';
import { EventosService } from '../../services/eventos/eventos.service';
import { CapitanActividadesService } from '../../services/capitan-actividades/capitan-actividades.service';
import { InscripcionesService } from '../../services/inscripciones/inscripciones.service';
import Swal from 'sweetalert2';
import { forkJoin, firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-gestion-capitanes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gestion-capitanes.component.html',
  styleUrl: './gestion-capitanes.component.css',
})
export class GestionCapitanesComponent implements OnInit {
  @Output() cambiosRealizados = new EventEmitter<void>();

  // Estados para modales
  public mostrarModalCapitanes = false;
  public mostrarModalAsignarCapitan = false;

  // Gestión de capitanes
  public eventos: Evento[] = [];
  public actividadesConMinimo: ActividadesEvento[] = [];
  public actividadesConJugadores: Map<number, number> = new Map(); // idEventoActividad -> cantidad de jugadores
  public actividadesCargandoJugadores: Set<number> = new Set(); // idEventoActividad -> estado de carga
  public capitanesActividades: Map<number, Alumno> = new Map(); // idEventoActividad -> capitán
  public capitanesIds: Map<number, number> = new Map(); // idEventoActividad -> idCapitanActividad
  public actividadSeleccionadaParaCapitan: ActividadesEvento | null = null;
  public usuariosDisponibles: Alumno[] = [];
  public cargandoCapitanes = false;
  public cargandoUsuarios = false;

  constructor(
    private _servicioEventos: EventosService,
    private _servicioCapitanes: CapitanActividadesService,
    private _servicioInscripciones: InscripcionesService,
    private _cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // El componente se inicializa pero no carga datos hasta que se abra el modal
  }

  // ====== MÉTODOS PARA GESTIÓN DE CAPITANES ======
  abrirModalCapitanes(): void {
    this.mostrarModalCapitanes = true;
    // Refrescar eventos primero, luego cargar actividades
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

        // Mostrar actividades INMEDIATAMENTE sin esperar los conteos de jugadores
        this.actividadesConMinimo = todasActividades;
        this.cargandoCapitanes = false;
        this._cdr.detectChanges();

        // Cargar conteos de jugadores en segundo plano y actualizar conforme llegan
        // Usar lotes pequeños para no sobrecargar la API
        this.cargarJugadoresEnLotes(todasActividades);
        
        // Cargar capitanes en segundo plano
        setTimeout(() => this.cargarCapitanes(), 0);
      },
      error: () => {
        this.cargandoCapitanes = false;
        this._cdr.detectChanges();
      },
    });
  }

  cargarJugadoresEnLotes(actividades: ActividadesEvento[]): void {
    // Marcar todas las actividades como cargando
    actividades.forEach(actividad => {
      this.actividadesCargandoJugadores.add(actividad.idEventoActividad);
    });
    this._cdr.detectChanges();

    // Cargar conteos de jugadores en lotes de 5 para no sobrecargar la API
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
          
          // Cargar siguiente lote
          currentIndex += batchSize;
          if (currentIndex < actividades.length) {
            setTimeout(loadBatch, 50); // Pequeño retraso entre lotes
          }
        },
        error: () => {
          // En caso de error, establecer 0 para este lote y marcar como cargado
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

    // Iniciar carga del primer lote
    loadBatch();
  }

  cargarCapitanes(): void {
    this.capitanesActividades.clear();
    this.capitanesIds.clear();
    
    if (this.actividadesConMinimo.length === 0) {
      this._cdr.detectChanges();
      return;
    }

    // Cargar todos los capitanes de una vez, luego hacer coincidencias - más rápido que llamadas individuales
    this._servicioCapitanes.getAllCapitanActividades().subscribe({
      next: (todos) => {
        // Crear mapas para búsqueda rápida
        const capitanMap = new Map<number, CapitanActividad>();
        todos.forEach(c => {
          capitanMap.set(c.idEventoActividad, c);
        });

        // Almacenar IDs inmediatamente del mapa para todas las actividades con capitanes
        this.actividadesConMinimo.forEach(actividad => {
          const capitanData = capitanMap.get(actividad.idEventoActividad);
          if (capitanData) {
            this.capitanesIds.set(actividad.idEventoActividad, capitanData.idCapitanActividad);
          }
        });

        // Solo obtener detalles de capitanes para actividades que tienen capitanes
        const actividadesConCapitan = this.actividadesConMinimo.filter(actividad =>
          capitanMap.has(actividad.idEventoActividad)
        );

        if (actividadesConCapitan.length === 0) {
          this._cdr.detectChanges();
          return;
        }

        // Cargar detalles de capitanes en lotes para no sobrecargar la API
        this.cargarDetallesCapitanesEnLotes(actividadesConCapitan);
      },
      error: () => {
        // Si no podemos cargar capitanes, aún mostrar actividades
        this._cdr.detectChanges();
      }
    });
  }

  cargarDetallesCapitanesEnLotes(actividades: ActividadesEvento[]): void {
    // Cargar detalles de capitanes en lotes de 3
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
          
          // Cargar siguiente lote
          currentIndex += batchSize;
          if (currentIndex < actividades.length) {
            setTimeout(loadBatch, 30); // Pequeño retraso entre lotes
          } else {
            this._cdr.detectChanges();
          }
        },
        error: () => {
          // En caso de error, continuar con el siguiente lote
          currentIndex += batchSize;
          if (currentIndex < actividades.length) {
            setTimeout(loadBatch, 30);
          } else {
            this._cdr.detectChanges();
          }
        }
      });
    };

    // Iniciar carga del primer lote
    loadBatch();
  }

  refrescarCapitanActividad(idEventoActividad: number): void {
    // Refrescar detalles del capitán en segundo plano (no bloqueante)
    // El ID ya debería estar en el mapa desde guardarCapitan, solo necesitamos obtener los detalles
    this._servicioCapitanes.getCapitanByEventoActividad(idEventoActividad).subscribe({
      next: (capitan) => {
        if (capitan) {
          this.capitanesActividades.set(idEventoActividad, capitan);
        } else {
          // Eliminar si ya no es capitán
          this.capitanesActividades.delete(idEventoActividad);
          this.capitanesIds.delete(idEventoActividad);
        }
        this._cdr.detectChanges();
      },
      error: () => {
        // Si hay error (como 204), eliminar capitán
        this.capitanesActividades.delete(idEventoActividad);
        this.capitanesIds.delete(idEventoActividad);
        this._cdr.detectChanges();
      },
    });
  }

  // Método auxiliar para verificar si el usuario ya es capitán
  private esCapitanActual(idEventoActividad: number, idUsuario: number): boolean {
    const currentCaptain = this.capitanesActividades.get(idEventoActividad);
    return currentCaptain?.idUsuario === idUsuario;
  }

  // Método auxiliar para obtener confirmación para cambiar capitán
  private async confirmarCambioCapitan(
    idEventoActividad: number,
    nuevoCapitanNombre: string
  ): Promise<boolean> {
    const existingId = this.capitanesIds.get(idEventoActividad);
    const currentCaptain = this.capitanesActividades.get(idEventoActividad);
    
    if (!existingId || !currentCaptain) {
      return true; // No hay capitán existente, no es necesario confirmar
    }

    const result = await Swal.fire({
      title: '¿Cambiar capitán?',
      html: `El capitán actual es <strong>${this.getCapitanNombre(idEventoActividad)}</strong>.<br>
             ¿Deseas cambiarlo por <strong>${nuevoCapitanNombre}</strong>?`,
      icon: 'question',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      cancelButtonColor: '#595d60',
      confirmButtonText: 'Sí, cambiar',
      confirmButtonColor: '#3085d6',
    });

    return result.isConfirmed;
  }

  // Método auxiliar para crear o actualizar capitán
  private async guardarCapitan(capitan: CapitanActividad): Promise<void> {
    const existingId = this.capitanesIds.get(capitan.idEventoActividad);
    
    try {
      if (existingId) {
        capitan.idCapitanActividad = existingId;
        const updated = await firstValueFrom(
          this._servicioCapitanes.updateCapitanActividad(capitan)
        );
        // Actualizar ID por si cambió (si la respuesta tiene ID, usarlo; si no, mantener el existente)
        if (updated && updated.idCapitanActividad) {
          this.capitanesIds.set(capitan.idEventoActividad, updated.idCapitanActividad);
        } else {
          // Si no hay ID en la respuesta, mantener el existente
          this.capitanesIds.set(capitan.idEventoActividad, existingId);
        }
      } else {
        const created = await firstValueFrom(
          this._servicioCapitanes.createCapitanActividad(capitan)
        );
        // Almacenar el nuevo ID (si la respuesta tiene ID, usarlo)
        if (created && created.idCapitanActividad) {
          this.capitanesIds.set(capitan.idEventoActividad, created.idCapitanActividad);
        }
      }
    } catch (error: any) {
      // Solo ignorar errores cuando el status HTTP indica éxito (2xx/204),
      // por ejemplo problemas de parseo JSON con una respuesta exitosa.
      const status = error?.status;

      // Considerar como error real:
      // - Errores de red/CORS (status === 0)
      // - Códigos fuera del rango 2xx (status < 200 o status >= 300)
      // - Errores sin código de estado definido
      if (status === 0 || status == null || status < 200 || status >= 300) {
        throw error;
      }
      // Si es 204 o cualquier 2xx, asumimos que la operación fue exitosa
      // y que cualquier problema es de parseo u otro no crítico.
    }
  }

  async seleccionarCapitanAleatorio(actividad: ActividadesEvento): Promise<void> {
    // Verificar si se alcanzó el mínimo de jugadores
    if (!this.tieneMinimoJugadores(actividad)) {
      await Swal.fire({
        title: 'Mínimo no alcanzado',
        text: `Esta actividad necesita ${actividad.minimoJugadores} jugadores. Actualmente tiene ${this.getJugadoresCount(actividad.idEventoActividad) ?? 0}.`,
        icon: 'warning',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#ff9800',
      });
      return;
    }

    // Declarar variables fuera del try para que estén disponibles en el catch
    let selectedUser: Alumno | undefined;
    let selectedUserName: string = '';

    try {
      // Obtener usuarios que quieren ser capitán
      let candidatos = await firstValueFrom(
        this._servicioInscripciones.getUsuariosQuierenSerCapitanActividad(
          actividad.idEvento,
          actividad.idActividad
        )
      );

      // Si no hay candidatos, obtener todos los usuarios registrados
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

      // Selección aleatoria
      const randomIndex = Math.floor(Math.random() * candidatos.length);
      selectedUser = candidatos[randomIndex];
      selectedUserName = this.getUsuarioNombre(selectedUser);

      // Verificar si este usuario ya es el capitán
      if (this.esCapitanActual(actividad.idEventoActividad, selectedUser.idUsuario)) {
        await Swal.fire({
          title: 'Ya es capitán',
          text: `${selectedUserName} ya es el capitán de esta actividad.`,
          icon: 'info',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#3085d6',
        });
        return;
      }

      // Pedir confirmación si se está cambiando un capitán existente
      const confirmed = await this.confirmarCambioCapitan(
        actividad.idEventoActividad,
        selectedUserName
      );
      if (!confirmed) {
        return;
      }
      
      // Crear/actualizar capitán
      const capitan: CapitanActividad = {
        idCapitanActividad: 0, // Será establecido por guardarCapitan si se actualiza
        idEventoActividad: actividad.idEventoActividad,
        idUsuario: selectedUser.idUsuario,
      };

      await this.guardarCapitan(capitan);

      // Actualizar detalles del capitán inmediatamente desde el usuario seleccionado
      this.capitanesActividades.set(actividad.idEventoActividad, selectedUser as any);

      await Swal.fire({
        title: '¡Capitán Asignado!',
        text: `Se ha asignado ${selectedUserName} como capitán`,
        icon: 'success',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#3085d6',
      });

      // Refrescar detalles del capitán en segundo plano para asegurar consistencia
      this.refrescarCapitanActividad(actividad.idEventoActividad);
      this.cambiosRealizados.emit();
    } catch (error: any) {
      console.error('Error al asignar capitán:', error);
      // Solo mostrar error si es un error real (status >= 400)
      // Si el status es 2xx, la operación fue exitosa (puede ser un problema de parseo JSON)
      if (error?.status && error.status >= 400) {
        const errorMessage = error?.error?.message || error?.message || 'No se pudo asignar el capitán';
        await Swal.fire({
          title: 'Error',
          text: errorMessage,
          icon: 'error',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#d33',
        });
      } else if (selectedUser && selectedUserName) {
        // Si es 2xx y tenemos los datos del usuario, la operación fue exitosa
        await Swal.fire({
          title: '¡Capitán Asignado!',
          text: `Se ha asignado ${selectedUserName} como capitán`,
          icon: 'success',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#3085d6',
        });
        // Actualizar detalles del capitán inmediatamente desde el usuario seleccionado
        this.capitanesActividades.set(actividad.idEventoActividad, selectedUser as any);
        // Refrescar detalles del capitán en segundo plano para asegurar consistencia
        this.refrescarCapitanActividad(actividad.idEventoActividad);
        this.cambiosRealizados.emit();
      }
      // Si es 2xx pero no tenemos los datos del usuario, no hacer nada (ya se manejó en el servicio)
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

    // Verificar si ya tenemos el conteo de usuarios en caché, usarlo para mostrar inmediatamente
    const cachedCount = this.actividadesConJugadores.get(actividad.idEventoActividad);
    if (cachedCount !== undefined && cachedCount === 0) {
      // Si sabemos que hay 0 usuarios, mostrar inmediatamente
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
          Swal.fire({
            title: 'Error al cargar usuarios',
            text: 'No se pudo cargar la lista de usuarios disponibles. Por favor, inténtalo de nuevo más tarde.',
            icon: 'error',
            confirmButtonText: 'Aceptar',
          }).finally(() => {
            this._cdr.detectChanges();
          });
        },
      });
  }

  async asignarCapitanManual(usuario: Alumno): Promise<void> {
    if (!this.actividadSeleccionadaParaCapitan) return;

    // Verificar si se alcanzó el mínimo de jugadores
    if (!this.tieneMinimoJugadores(this.actividadSeleccionadaParaCapitan)) {
      await Swal.fire({
        title: 'Mínimo no alcanzado',
        text: `Esta actividad necesita ${this.actividadSeleccionadaParaCapitan.minimoJugadores} jugadores. Actualmente tiene ${this.getJugadoresCount(this.actividadSeleccionadaParaCapitan.idEventoActividad) ?? 0}.`,
        icon: 'warning',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#ff9800',
      });
      return;
    }

    const usuarioNombre = this.getUsuarioNombre(usuario);

    // Verificar si este usuario ya es el capitán
    if (this.esCapitanActual(this.actividadSeleccionadaParaCapitan.idEventoActividad, usuario.idUsuario)) {
      await Swal.fire({
        title: 'Ya es capitán',
        text: `${usuarioNombre} ya es el capitán de esta actividad.`,
        icon: 'info',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    // Pedir confirmación si se está cambiando un capitán existente
    const confirmed = await this.confirmarCambioCapitan(
      this.actividadSeleccionadaParaCapitan.idEventoActividad,
      usuarioNombre
    );
    if (!confirmed) {
      return;
    }

    try {
      const capitan: CapitanActividad = {
        idCapitanActividad: 0, // Será establecido por guardarCapitan si se actualiza
        idEventoActividad: this.actividadSeleccionadaParaCapitan.idEventoActividad,
        idUsuario: usuario.idUsuario,
      };

      await this.guardarCapitan(capitan);

      // Actualizar detalles del capitán inmediatamente desde el usuario seleccionado
      this.capitanesActividades.set(
        this.actividadSeleccionadaParaCapitan.idEventoActividad,
        usuario as any
      );

      await Swal.fire({
        title: '¡Capitán Asignado!',
        text: `Se ha asignado ${usuarioNombre} como capitán`,
        icon: 'success',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#3085d6',
      });

      // Refrescar detalles del capitán para asegurar consistencia (no bloqueante)
      this.refrescarCapitanActividad(this.actividadSeleccionadaParaCapitan.idEventoActividad);
      this.cambiosRealizados.emit();
      
      this.cerrarModalAsignarCapitan();
    } catch (error: any) {
      console.error('Error al asignar capitán manualmente:', error);
      // Solo mostrar error si es un error real (status >= 400)
      // Si el status es 2xx, la operación fue exitosa (puede ser un problema de parseo JSON)
      if (error?.status && error.status >= 400) {
        const errorMessage = error?.error?.message || error?.message || 'No se pudo asignar el capitán';
        await Swal.fire({
          title: 'Error',
          text: errorMessage,
          icon: 'error',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#d33',
        });
      } else {
        // Si es 2xx, la operación fue exitosa, mostrar mensaje de éxito
        await Swal.fire({
          title: '¡Capitán Asignado!',
          text: `Se ha asignado ${usuarioNombre} como capitán`,
          icon: 'success',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#3085d6',
        });
        // Actualizar detalles del capitán inmediatamente desde el usuario seleccionado
        this.capitanesActividades.set(
          this.actividadSeleccionadaParaCapitan.idEventoActividad,
          usuario as any
        );
        // Refrescar detalles del capitán para asegurar consistencia (no bloqueante)
        this.refrescarCapitanActividad(this.actividadSeleccionadaParaCapitan.idEventoActividad);
        this.cambiosRealizados.emit();
        this.cerrarModalAsignarCapitan();
      }
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
        // Eliminar de los mapas inmediatamente
        this.capitanesActividades.delete(actividad.idEventoActividad);
        this.capitanesIds.delete(actividad.idEventoActividad);
        this.cambiosRealizados.emit();
      } catch (error: any) {
        console.error('Error al eliminar capitán:', error);
        // Solo mostrar error si es un error real (status >= 400)
        // Si es 204 o 2xx, considerar éxito
        if (error?.status && error.status >= 400) {
          const errorMessage = error?.error?.message || error?.message || 'No se pudo eliminar el capitán';
          await Swal.fire({
            title: 'Error',
            text: errorMessage,
            icon: 'error',
            confirmButtonText: 'Aceptar',
            confirmButtonColor: '#d33',
          });
        } else {
          // Si es 204 o 2xx, considerar éxito y actualizar UI
          this.capitanesActividades.delete(actividad.idEventoActividad);
          this.capitanesIds.delete(actividad.idEventoActividad);
          this.cambiosRealizados.emit();
          await Swal.fire({
            title: 'Capitán Eliminado',
            text: 'El capitán ha sido eliminado correctamente',
            icon: 'success',
            confirmButtonText: 'Aceptar',
            confirmButtonColor: '#3085d6',
          });
        }
      }
    }
  }

  getCapitanNombre(idEventoActividad: number): string {
    const capitan = this.capitanesActividades.get(idEventoActividad);
    if (!capitan) return '';
    // La API devuelve el campo 'usuario', pero el modelo Alumno tiene 'nombre' y 'apellidos'
    // Intentar ambos para estar seguros
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
      return null; // Aún cargando
    }
    return this.actividadesConJugadores.get(idEventoActividad) ?? 0;
  }

  estaCargandoJugadores(idEventoActividad: number): boolean {
    return this.actividadesCargandoJugadores.has(idEventoActividad);
  }

  tieneMinimoJugadores(actividad: ActividadesEvento): boolean {
    // Si aún está cargando, devolver false para mantener los botones deshabilitados
    if (this.estaCargandoJugadores(actividad.idEventoActividad)) {
      return false;
    }
    const count = this.getJugadoresCount(actividad.idEventoActividad);
    return count !== null && count >= actividad.minimoJugadores;
  }
}
