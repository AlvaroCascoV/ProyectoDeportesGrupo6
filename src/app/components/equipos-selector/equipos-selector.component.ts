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
import {
  EquiposService,
  MiembroEquipoRole,
} from '../../services/equipos/equipos.service';
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

  @Input() role: MiembroEquipoRole = 'ALUMNO';
  @Input() showConfirmButton: boolean = true;

  public equipos: Equipo[] = [];
  public cargandoEquipos: boolean = false;

  public colores: Color[] = [];
  public cargandoColores: boolean = false;

  public selectedEquipoId: number | null = null;

  public mostrarCrearEquipo: boolean = false;
  public nuevoEquipoNombre: string = '';
  public nuevoEquipoColorId: number | null = null;

  private idCursoUsuario: number | null = null;

  constructor(
    private _equiposService: EquiposService,
    private _coloresService: ColoresService,
    private _perfilService: PerfilService
  ) {}

  ngOnInit(): void {
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

  toggleCrearEquipo(): void {
    this.mostrarCrearEquipo = !this.mostrarCrearEquipo;
    if (this.mostrarCrearEquipo) {
      this.selectedEquipoId = null;
    }
  }

  async confirmar(): Promise<boolean> {
    return this.submit(this.role);
  }

  async submit(role: MiembroEquipoRole): Promise<boolean> {
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
    let roleFinal: MiembroEquipoRole = role;

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
      roleFinal = 'ALUMNO';
    } else {
      idEquipoObjetivo = selectedEquipoIdNum!;
    }

    const miembroPayload = new MiembroEquipo(0, idEquipoObjetivo, idUsuario);

    try {
      await firstValueFrom(
        this._equiposService.joinEquipo('ALUMNO', miembroPayload)
      );
    } catch (e: any) {
      const maybeMsg =
        e?.error?.message || e?.error?.title || e?.error || null;

      await Swal.fire({
        title: 'Error',
        text:
          typeof maybeMsg === 'string' && maybeMsg.trim().length > 0
            ? maybeMsg
            : 'El equipo se creó, pero no se pudo añadirte como miembro.',
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
          if (this.equipos.length === 0) {
            this.mostrarCrearEquipo = true;
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
