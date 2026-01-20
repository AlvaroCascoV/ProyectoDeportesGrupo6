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
import { MiembroEquipo } from '../../models/MiembroEquipo';
import { UsuarioEquipo } from '../../models/UsuarioEquipo';
import { EquiposService } from '../../services/equipos/equipos.service';
import { ColoresService } from '../../services/colores/colores.service';
import { PerfilService } from '../../services/perfil/perfil.service';

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

  constructor(
    private _equiposService: EquiposService,
    private _coloresService: ColoresService,
    private _perfilService: PerfilService
  ) {}

  ngOnInit(): void {
    const role = (localStorage.getItem('role') ?? '').toUpperCase();
    this.canCreateEquipos = role === 'CAPITAN' || role === 'ADMINISTRADOR';
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

  private validateCreateEquipoPermission(): boolean {
    if (this.canCreateEquipos) {
      return true;
    }

    void Swal.fire({
      title: 'No autorizado',
      text: 'Solo CAPITAN o ADMINISTRADOR puede crear equipos.',
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

    if (quiereUnirseEquipoExistente) {
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
          text: 'Solo CAPITAN o ADMINISTRADOR puede crear equipos.',
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
        this.idCursoUsuario!
      );

      let created: Equipo;
      try {
        created = await firstValueFrom(
          this._equiposService.createEquipo(equipoPayload)
        );
      } catch {
        await Swal.fire({
          title: 'Error',
          text: 'No se pudo crear el equipo.',
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

    try {
      await firstValueFrom(
        this._equiposService.joinEquipo(idUsuario, idEquipoObjetivo)
      );
    } catch (e: any) {
      const maybeMsg = e?.error?.message || e?.error?.title || e?.error || null;
      const fallbackMsg = quiereCrearEquipo
        ? 'El equipo se creó, pero no se pudo añadirte como miembro.'
        : 'No se pudo añadirte como miembro del equipo.';

      await Swal.fire({
        title: 'Error',
        text:
          typeof maybeMsg === 'string' && maybeMsg.trim().length > 0
            ? maybeMsg
            : fallbackMsg,
        icon: 'error',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#d33',
      });
      return false;
    }

    // Mantener la UI consistente: selecciona el equipo unido/creado y sale del modo de creación
    this.selectedEquipoId = idEquipoObjetivo;
    this.mostrarCrearEquipo = false;
    this.nuevoEquipoNombre = '';
    this.nuevoEquipoColorId = null;

    this.cargarJugadoresEquipo(idEquipoObjetivo);

    // On the /equipos page we want explicit feedback.
    // In the inscripción modal we keep it silent (showConfirmButton=false).
    if (this.showConfirmButton) {
      await Swal.fire({
        title: 'Listo',
        text: quiereCrearEquipo
          ? 'Equipo creado y te has unido correctamente.'
          : 'Te has unido al equipo correctamente.',
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
        // If user changed selection while loading, ignore old response
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
