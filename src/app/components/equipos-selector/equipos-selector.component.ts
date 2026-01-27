import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { firstValueFrom } from 'rxjs';

import { Equipo } from '../../models/Equipo';
import { Color } from '../../models/Color';
import { UsuarioEquipo } from '../../models/UsuarioEquipo';
import { EquiposService } from '../../services/equipos/equipos.service';
import { ColoresService } from '../../services/colores/colores.service';
import { PerfilService } from '../../services/perfil/perfil.service';
import { UserIdRoles } from '../../auth/constants/user-roles';
import { Inscripcion } from '../../models/Inscripcion';

@Component({
  selector: 'app-equipos-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './equipos-selector.component.html',
  styleUrls: ['./equipos-selector.component.css'],
})
export class EquiposSelectorComponent implements OnInit, OnChanges {
  @Input({ required: true }) idEvento!: number;
  @Input({ required: true }) idActividad!: number;
  @Input({ required: true }) idEventoActividad!: number;
  @Input({ required: true }) minimoJugadores!: number;

  @Input() showConfirmButton: boolean = true;

  public equipos: Equipo[] = [];
  public cargandoEquipos: boolean = false;

  public colores: Color[] = [];
  public cargandoColores: boolean = false;

  public selectedEquipoId: number | null = null;

  public mostrarCrearEquipo: boolean = false;
  public nuevoEquipoNombre: string = '';
  public nuevoEquipoColorId: number | null = null;

  public canCreateEquipos: boolean = false;

  public jugadoresEquipo: UsuarioEquipo[] = [];
  public cargandoJugadores: boolean = false;
  public idEquipoJugadores: number | null = null;

  private idCursoUsuario: number | null = null;

  public actividadesUsuario: Inscripcion[] = [];

  constructor(
    private _equiposService: EquiposService,
    private _coloresService: ColoresService,
    private _perfilService: PerfilService,
  ) {}

  ngOnInit(): void {
    const role = (localStorage.getItem('idRole') ?? '').toUpperCase();
    // Solo el CAPITAN puede crear equipos
    this.canCreateEquipos = role === UserIdRoles.CAPITAN;
    this.cargarColores();
    this.cargarCursoUsuario();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const idsChanged =
      changes['idEvento'] ||
      changes['idActividad'] ||
      changes['idEventoActividad'] ||
      changes['minimoJugadores'];

    if (idsChanged) {
      this.resetUIOnly();
      if (this.hasValidContext()) {
        this.refrescarEquipos();
      } else {
        this.equipos = [];
      }
    }
  }

  async inscribirte() {
    const idUsuario = parseInt(localStorage.getItem('userID') || '0', 10);
    const validacion = await this.validarPuedeUnirseOInscribirse(idUsuario);
    if (!validacion.canProceed) {
      Swal.fire({
        title: validacion.title,
        text: validacion.text,
        icon: 'info',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    const idEquipo = this.selectedEquipoId ?? 0;
    this._equiposService.joinEquipoNew(idEquipo).subscribe({
      next: (response) => {
        console.log(response);
        // Invalidar caché de actividades para que la próxima inscripcionesUser() vuelva a pedir datos (usuario con equipo/inscripción nueva)
        this.actividadesUsuario = [];
        Swal.fire({
          title: 'Te has unido al equipo.',
          icon: 'success',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#3085d6',
        });
        this.refrescarEquipos();
      },
      error: (err: HttpErrorResponse) => {
        const { title, text } = this.getJoinEquipoErrorMessage(err);
        Swal.fire({
          title,
          text,
          icon: 'error',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#3085d6',
        });
      },
    });
  }

  async inscripcionesUser(): Promise<Inscripcion[]> {
    // Usa cache local para evitar múltiples llamadas
    if (this.actividadesUsuario.length > 0) {
      return this.actividadesUsuario;
    }

    const token = localStorage.getItem('token') || '';
    try {
      const response = await firstValueFrom(
        this._perfilService.getActividadesUser(token),
      );
      console.log('Actividades user:' + JSON.stringify(response));
      this.actividadesUsuario = response ?? [];
      return this.actividadesUsuario;
    } catch {
      this.actividadesUsuario = [];
      return [];
    }
  }

  /**
   * Indica si el usuario está inscrito en este evento y, en ese caso, en qué actividad.
   * Sirve para detectar "inscrito en *otra* actividad del mismo evento": si
   * idActividad !== this.idActividad bloqueamos (un equipo por evento). Si está
   * en la *misma* actividad, este check permite seguir; el estar ya en un equipo
   * lo controla usuarioYaEstaEnEquipo (p. ej. ya en un equipo de esta actividad).
   */
  private async getInscripcionEnEsteEvento(): Promise<{
    enEvento: boolean;
    actividadNombre?: string;
    idActividad?: number;
  }> {
    const actividadesUser = await this.inscripcionesUser();
    const encontrada = actividadesUser.find(
      (actividad) => actividad.idEvento === this.idEvento,
    );
    return {
      enEvento: !!encontrada,
      actividadNombre: encontrada?.nombreActividad,
      idActividad: encontrada?.idActividad,
    };
  }

  /**
   * True cuando el usuario está inscrito en una actividad *distinta* de este evento.
   * La misma actividad no se bloquea aquí (usuarioYaEstaEnEquipo bloquea si ya está en un equipo).
   */
  private async estaInscritoEnOtraActividadDelMismoEvento(): Promise<{
    bloqueado: boolean;
    nombreActividad?: string;
  }> {
    const inscripcion = await this.getInscripcionEnEsteEvento();
    const otraActividad =
      inscripcion.enEvento && inscripcion.idActividad !== this.idActividad;
    return {
      bloqueado: otraActividad,
      nombreActividad: inscripcion.actividadNombre,
    };
  }

  onEquipoSeleccionado(idEquipo: number): void {
    const idEquipoNum = Number(idEquipo);
    if (!Number.isFinite(idEquipoNum) || idEquipoNum <= 0) return;
    this.selectedEquipoId = idEquipoNum;
    this.cargarJugadoresEquipo(idEquipoNum);
  }

  getEquipoColorNombre(idColor: number): string {
    const id = Number(idColor);
    if (!Number.isFinite(id)) return 'Sin color';
    return (
      this.colores.find((c) => c.idColor === id)?.nombreColor ?? `Color ${id}`
    );
  }

  get coloresDisponibles(): Color[] {
    // Obtener los IDs de colores ya usados por los equipos existentes
    const coloresUsados = new Set(this.equipos.map((e) => e.idColor));
    // Filtrar solo los colores que no están en uso
    return this.colores.filter((color) => !coloresUsados.has(color.idColor));
  }

  private async usuarioYaEstaEnEquipo(idUsuario: number): Promise<{
    estaEnEquipo: boolean;
    equipoNombre?: string;
    idEquipo?: number;
  }> {
    // Verificar en cada equipo si el usuario ya está inscrito
    for (const equipo of this.equipos) {
      try {
        const jugadores = await firstValueFrom(
          this._equiposService.getUsuariosEquipo(equipo.idEquipo),
        );
        const estaEnEsteEquipo = jugadores?.some(
          (j) => j.idUsuario === idUsuario,
        );
        if (estaEnEsteEquipo) {
          return {
            estaEnEquipo: true,
            equipoNombre: equipo.nombreEquipo,
            idEquipo: equipo.idEquipo,
          };
        }
      } catch {
        // Continuar con el siguiente equipo si hay error
        continue;
      }
    }
    return { estaEnEquipo: false };
  }

  /**
   * Comprueba si el usuario puede unirse/inscribirse en un equipo.
   * Dos comprobaciones independientes:
   * 1) Ya está en un equipo (cualquier equipo de esta actividad) → bloquear.
   * 2) Inscrito en una actividad *distinta* de este evento → bloquear. La misma
   *    actividad se permite aquí; si ya está en un equipo ahí, lo cubre la comprobación 1.
   */
  private async validarPuedeUnirseOInscribirse(idUsuario: number): Promise<
    | { canProceed: true }
    | { canProceed: false; title: string; text: string; idEquipoToSelect?: number }
  > {
    const verificacion = await this.usuarioYaEstaEnEquipo(idUsuario);
    if (verificacion.estaEnEquipo) {
      return {
        canProceed: false,
        title: 'Ya estás en un equipo',
        text: `Ya eres miembro del equipo "${verificacion.equipoNombre}". No puedes unirte a otro equipo.`,
        idEquipoToSelect: verificacion.idEquipo,
      };
    }
    const otraActividad =
      await this.estaInscritoEnOtraActividadDelMismoEvento();
    if (otraActividad.bloqueado) {
      return {
        canProceed: false,
        title: 'No puedes unirte al equipo',
        text: `Ya estás inscrito en este evento en la actividad "${otraActividad.nombreActividad ?? 'otra actividad'}". Solo puedes estar en un equipo dentro de un mismo evento.`,
      };
    }
    return { canProceed: true };
  }

  /**
   * Obtiene título y texto para el usuario a partir de errores HTTP al unirse al equipo,
   * usando el cuerpo de la respuesta cuando exista y mensajes según el código de estado en caso contrario.
   */
  private getJoinEquipoErrorMessage(
    err: HttpErrorResponse,
  ): { title: string; text: string } {
    const body = err.error;
    let fromBody: string | undefined;
    if (typeof body === 'string') {
      fromBody = body;
    } else if (body && typeof body === 'object') {
      const o = body as Record<string, unknown>;
      fromBody = [o['message'], o['error'], o['Message']].find(
        (v): v is string => typeof v === 'string' && v.trim().length > 0,
      );
    }
    if (fromBody) {
      return {
        title: 'No se ha podido unir al equipo',
        text: fromBody.trim(),
      };
    }
    switch (err.status) {
      case 0:
        return {
          title: 'Error de conexión',
          text: 'No se ha podido conectar. Comprueba tu conexión e inténtalo de nuevo.',
        };
      case 401:
        return {
          title: 'No autorizado',
          text: 'Tu sesión puede haber caducado. Inicia sesión de nuevo.',
        };
      case 403:
        return {
          title: 'No permitido',
          text: 'No tienes permiso para unirte a este equipo o el equipo está lleno.',
        };
      case 404:
        return {
          title: 'Equipo no encontrado',
          text: 'El equipo ya no existe o no está disponible.',
        };
      case 409:
        return {
          title: 'No se puede unir',
          text: 'El equipo está lleno o ya estás inscrito.',
        };
      default:
        return {
          title: 'No se ha podido unir al equipo',
          text:
            err.status != null && err.status >= 500
              ? 'Error del servidor. Inténtalo más tarde.'
              : 'Ha ocurrido un error. Inténtalo de nuevo.',
        };
    }
  }

  private validateCreateEquipoPermission(): boolean {
    if (this.canCreateEquipos) {
      return true;
    }

    void Swal.fire({
      title: 'No autorizado',
      text: 'Solo el CAPITAN puede crear equipos.',
      icon: 'warning',
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#3085d6',
    });

    return false;
  }

  toggleCrearEquipo(): void {
    if (!this.validateCreateEquipoPermission()) {
      return;
    }
    this.mostrarCrearEquipo = !this.mostrarCrearEquipo;
    if (this.mostrarCrearEquipo) {
      this.selectedEquipoId = null;
    }
  }

  async confirmar(): Promise<boolean> {
    return this.submit();
  }

  async submit(): Promise<boolean> {
    if (!this.hasValidContext()) {
      await Swal.fire({
        title: 'Falta informacion',
        text: 'Selecciona un evento y una actividad validos.',
        icon: 'warning',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#3085d6',
      });
      return false;
    }

    const idUsuarioStr = localStorage.getItem('userID');
    if (!idUsuarioStr) {
      await Swal.fire({
        title: 'Error',
        text: 'No se ha encontrado el usuario. Vuelve a iniciar sesion.',
        icon: 'error',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#d33',
      });
      return false;
    }

    const idUsuario = Number.parseInt(idUsuarioStr, 10);
    if (!Number.isFinite(idUsuario)) {
      await Swal.fire({
        title: 'Error',
        text: 'El usuario no es valido. Vuelve a iniciar sesion.',
        icon: 'error',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#d33',
      });
      return false;
    }

    const quiereCrearEquipo =
      this.mostrarCrearEquipo && this.nuevoEquipoNombre.trim().length > 0;
    const selectedEquipoIdNum =
      this.selectedEquipoId != null ? Number(this.selectedEquipoId) : null;
    const quiereUnirseEquipoExistente = selectedEquipoIdNum != null;

    if (!quiereCrearEquipo && !quiereUnirseEquipoExistente) {
      await Swal.fire({
        title: 'Equipo requerido',
        text: 'Selecciona un equipo o crea uno nuevo para continuar.',
        icon: 'warning',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#3085d6',
      });
      return false;
    }

    // Solo validar "ya en equipo" / "otra actividad mismo evento" cuando va a UNIRSE a un equipo existente.
    // Al CREAR equipo no se aplica: el capitán puede crear aunque ya esté en otro equipo.
    if (quiereUnirseEquipoExistente) {
      const validacion = await this.validarPuedeUnirseOInscribirse(idUsuario);
      if (!validacion.canProceed) {
        await Swal.fire({
          title: validacion.title,
          text: validacion.text,
          icon: 'info',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#3085d6',
        });
        if (validacion.idEquipoToSelect != null) {
          this.selectedEquipoId = validacion.idEquipoToSelect;
          this.cargarJugadoresEquipo(validacion.idEquipoToSelect);
        }
        return false;
      }
      if (!Number.isFinite(selectedEquipoIdNum) || selectedEquipoIdNum <= 0) {
        await Swal.fire({
          title: 'Falta informacion',
          text: 'Selecciona un equipo valido.',
          icon: 'warning',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#3085d6',
        });
        return false;
      }
    }

    if (quiereCrearEquipo) {
      if (!this.canCreateEquipos) {
        await Swal.fire({
          title: 'No autorizado',
          text: 'Solo el CAPITAN puede crear equipos.',
          icon: 'warning',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#3085d6',
        });
        return false;
      }
      if (this.nuevoEquipoColorId == null) {
        await Swal.fire({
          title: 'Falta informacion',
          text: 'Selecciona un color para el nuevo equipo.',
          icon: 'warning',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#3085d6',
        });
        return false;
      }
      if (this.idCursoUsuario == null) {
        await Swal.fire({
          title: 'Falta informacion',
          text: 'No se pudo obtener el curso del usuario (idCurso). Vuelve a iniciar sesion.',
          icon: 'error',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#d33',
        });
        return false;
      }
    }

    let idEquipoObjetivo: number;
    if (quiereCrearEquipo) {
      const equipoPayload = new Equipo(
        0,
        this.idEventoActividad,
        this.nuevoEquipoNombre.trim(),
        this.minimoJugadores,
        this.nuevoEquipoColorId!,
        this.idCursoUsuario!,
      );

      let created: Equipo;
      try {
        created = await firstValueFrom(
          this._equiposService.createEquipo(equipoPayload),
        );
      } catch (err) {
        const status = err instanceof HttpErrorResponse ? err.status : null;
        const text =
          status === 403
            ? 'No tienes permiso para crear equipos. Solo el CAPITAN puede crear equipos.'
            : 'No se pudo crear el equipo.';
        await Swal.fire({
          title: status === 403 ? 'Acceso denegado' : 'Error',
          text,
          icon: 'error',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#d33',
        });
        return false;
      }

      if (!created?.idEquipo) {
        await Swal.fire({
          title: 'Error',
          text: 'El equipo se creo, pero no se recibió el idEquipo.',
          icon: 'error',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#d33',
        });
        return false;
      }

      idEquipoObjetivo = created.idEquipo;
    } else {
      idEquipoObjetivo = selectedEquipoIdNum!;
    }

    // La unión al equipo por API se hace en inscribirte() / joinEquipoNew; aquí solo actualizamos UI y refrescamos.
    // Mantener la UI consistente: selecciona el equipo unido/creado y sale del modo de creación
    this.selectedEquipoId = idEquipoObjetivo;
    this.mostrarCrearEquipo = false;
    this.nuevoEquipoNombre = '';
    this.nuevoEquipoColorId = null;

    this.cargarJugadoresEquipo(idEquipoObjetivo);

    // En la página de equipos mostramos feedback explícito.
    // En el modal de inscripción no mostramos mensaje (showConfirmButton=false).
    if (this.showConfirmButton) {
      await Swal.fire({
        title: 'Listo',
        text: quiereCrearEquipo
          ? 'Equipo creado correctamente.'
          : 'Equipo seleccionado correctamente.',
        icon: 'success',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#3085d6',
      });
    }

    this.refrescarEquipos();
    return true;
  }

  refrescarEquipos(): void {
    if (!this.hasValidContext()) return;

    this.cargandoEquipos = true;
    this._equiposService
      .getEquiposActividadEvento(this.idActividad, this.idEvento)
      .subscribe({
        next: (equipos) => {
          this.equipos = equipos ?? [];
          this.cargandoEquipos = false;
          if (this.equipos.length === 0 && this.canCreateEquipos) {
            this.mostrarCrearEquipo = true;
          }

          if (this.selectedEquipoId != null) {
            const selected = Number(this.selectedEquipoId);
            if (Number.isFinite(selected) && selected > 0) {
              this.cargarJugadoresEquipo(selected);
            }
          }
        },
        error: () => {
          this.equipos = [];
          this.cargandoEquipos = false;
        },
      });
  }

  private hasValidContext(): boolean {
    return (
      Number.isFinite(this.idEvento) &&
      this.idEvento > 0 &&
      Number.isFinite(this.idActividad) &&
      this.idActividad > 0 &&
      Number.isFinite(this.idEventoActividad) &&
      this.idEventoActividad > 0 &&
      Number.isFinite(this.minimoJugadores) &&
      this.minimoJugadores >= 0
    );
  }

  private resetUIOnly(): void {
    this.selectedEquipoId = null;
    this.mostrarCrearEquipo = false;
    this.nuevoEquipoNombre = '';
    this.nuevoEquipoColorId = null;

    this.jugadoresEquipo = [];
    this.cargandoJugadores = false;
    this.idEquipoJugadores = null;
  }

  private cargarJugadoresEquipo(idEquipo: number): void {
    if (this.cargandoJugadores && this.idEquipoJugadores === idEquipo) return;

    this.cargandoJugadores = true;
    this.idEquipoJugadores = idEquipo;
    this._equiposService.getUsuariosEquipo(idEquipo).subscribe({
      next: (jugadores) => {
        // Si el usuario cambió de equipo mientras cargaba, ignorar la respuesta antigua
        if (this.idEquipoJugadores !== idEquipo) return;
        this.jugadoresEquipo = jugadores ?? [];
        this.cargandoJugadores = false;
      },
      error: () => {
        if (this.idEquipoJugadores !== idEquipo) return;
        this.jugadoresEquipo = [];
        this.cargandoJugadores = false;
      },
    });
  }

  private cargarColores(): void {
    this.cargandoColores = true;
    this._coloresService.getColores().subscribe({
      next: (colores) => {
        this.colores = colores ?? [];
        this.cargandoColores = false;
      },
      error: () => {
        this.colores = [];
        this.cargandoColores = false;
      },
    });
  }

  private cargarCursoUsuario(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      this.idCursoUsuario = null;
      return;
    }
    this._perfilService.getPerfil(token).subscribe({
      next: (perfil) => {
        this.idCursoUsuario = perfil?.idCurso ?? null;
      },
      error: () => {
        this.idCursoUsuario = null;
      },
    });
  }
}
