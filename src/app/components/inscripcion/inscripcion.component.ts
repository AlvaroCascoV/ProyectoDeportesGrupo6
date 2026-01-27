import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EventosService } from '../../services/eventos/eventos.service';
import { InscripcionesService } from '../../services/inscripciones/inscripciones.service';
import { ActividadesEvento } from '../../models/ActividadesEvento';
import { PerfilService } from '../../services/perfil/perfil.service';
import Swal from 'sweetalert2';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-inscripcion',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './inscripcion.component.html',
  styleUrls: ['./inscripcion.component.css'],
})
export class InscripcionComponent implements OnInit {
  public idEventoActividad: number = 0;
  public actividadesEvento: ActividadesEvento[] = [];
  @Input() idEvento!: number;
  @Input() inscritosPorActividad: { [idEventoActividad: number]: number } = {};

  public actividadSeleccionada: ActividadesEvento | null = null;
  public actividadEsPorEquipos: boolean = false;
  public quiereSerCapitan: boolean = false;

  constructor(
    private _servicioEventos: EventosService,
    private _servicioInscripciones: InscripcionesService,
    private _perfilService: PerfilService,
    private _router: Router
  ) {}

  ngOnInit(): void {
    console.log('[InscripcionComponent] idEvento recibido:', this.idEvento);
    this._servicioEventos
      .getActividadesEvento(this.idEvento)
      .subscribe((response) => {
        console.log(
          '[InscripcionComponent] Actividades del evento cargadas:',
          response
        );
        this.actividadesEvento = response;
      });
  }

  onActividadChange(): void {
    this.actividadSeleccionada =
      this.actividadesEvento.find(
        (a) => a.idEventoActividad === this.idEventoActividad
      ) ?? null;

    this.actividadEsPorEquipos = false;
    if (!this.actividadSeleccionada) return;

    // Heurística: actividades con mínimo de jugadores > 1 suelen ser por equipos.
    // (si en el futuro hay un flag explícito del backend, se debe usar ese)
    this.actividadEsPorEquipos = this.actividadSeleccionada.minimoJugadores > 1;
  }

  async inscribirUsuario(): Promise<{
    ok: boolean;
    redirectedToEquipos: boolean;
    alreadyInscribed: boolean;
  }> {
    const idUsuarioStr = localStorage.getItem('userID');
    if (!idUsuarioStr) {
      await Swal.fire({
        title: 'Error',
        text: 'No se ha encontrado el usuario. Vuelve a iniciar sesión.',
        icon: 'error',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#d33',
      });
      return { ok: false, redirectedToEquipos: false, alreadyInscribed: false };
    }

    const idUsuario = Number.parseInt(idUsuarioStr, 10);
    if (!Number.isFinite(idUsuario)) {
      await Swal.fire({
        title: 'Error',
        text: 'El usuario no es válido. Vuelve a iniciar sesión.',
        icon: 'error',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#d33',
      });
      return { ok: false, redirectedToEquipos: false, alreadyInscribed: false };
    }

    if (!this.idEventoActividad || this.idEventoActividad === 0) {
      await Swal.fire({
        title: 'Falta información',
        text: 'Selecciona una actividad para inscribirte.',
        icon: 'warning',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#3085d6',
      });
      return { ok: false, redirectedToEquipos: false, alreadyInscribed: false };
    }

    if (!this.actividadSeleccionada) {
      await Swal.fire({
        title: 'Falta información',
        text: 'Selecciona una actividad válida.',
        icon: 'warning',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#3085d6',
      });
      return { ok: false, redirectedToEquipos: false, alreadyInscribed: false };
    }

    const inscripcion = {
      idInscripcion: 0,
      idUsuario,
      idEventoActividad: this.idEventoActividad,
      quiereSerCapitan: this.quiereSerCapitan,
      fechaInscripcion: new Date(),
    };

    // 1) Pre-check: evitar un 400 cuando ya estás inscrito
    let alreadyInscribed = false;

    const token = localStorage.getItem('token');
    if (token) {
      try {
        const inscripciones = await firstValueFrom(
          this._perfilService.getActividadesUser(token)
        );
        alreadyInscribed = (inscripciones ?? []).some(
          (i) =>
            Number(i?.idUsuario) === idUsuario &&
            Number(i?.idEventoActividad) === this.idEventoActividad
        );
      } catch {
        // Si falla el pre-check, seguimos y dejamos que el backend valide.
      }
    }

    // 2) Inscripción (si ya existe, seguimos adelante)
    try {
      if (!alreadyInscribed) {
        await firstValueFrom(
          this._servicioInscripciones.createInscripcion(inscripcion)
        );
      }
    } catch (error: any) {
      if (error?.status !== 400) {
        await Swal.fire({
          title: 'Error',
          text: 'No se pudo completar la inscripción.',
          icon: 'error',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#d33',
        });
        return {
          ok: false,
          redirectedToEquipos: false,
          alreadyInscribed: false,
        };
      } else {
        // 400: normalmente es "ya inscrito", pero lo confirmamos para no enmascarar otros errores.
        if (token) {
          try {
            const inscripciones = await firstValueFrom(
              this._perfilService.getActividadesUser(token)
            );
            const exists = (inscripciones ?? []).some(
              (i) =>
                Number(i?.idUsuario) === idUsuario &&
                Number(i?.idEventoActividad) === this.idEventoActividad
            );

            if (exists) {
              alreadyInscribed = true;
            } else {
              const maybeMsg =
                error?.error?.message ||
                error?.error?.title ||
                (typeof error?.error === 'string' ? error?.error : null);

              await Swal.fire({
                title: 'Error',
                text:
                  typeof maybeMsg === 'string' && maybeMsg.trim().length > 0
                    ? maybeMsg
                    : 'No se pudo completar la inscripción.',
                icon: 'error',
                confirmButtonText: 'Aceptar',
                confirmButtonColor: '#d33',
              });
              return {
                ok: false,
                redirectedToEquipos: false,
                alreadyInscribed: false,
              };
            }
          } catch {
            // Si no podemos confirmar, asumimos "ya inscrito" para permitir continuar.
            alreadyInscribed = true;
          }
        } else {
          // Sin token no podemos confirmar; asumimos "ya inscrito" para permitir continuar.
          alreadyInscribed = true;
        }
      }
    }

    // 2) Si la actividad tiene equipos, redirigimos a /equipos con preselección
    if (this.actividadEsPorEquipos) {
      await Swal.fire({
        title: alreadyInscribed
          ? 'Ya estás inscrito'
          : 'Inscripción completada',
        text: alreadyInscribed
          ? 'Ya estabas inscrito en esta actividad. Esta actividad es por equipos, serás redirigido para unirte a un equipo'
          : 'Esta actividad es por equipos, serás redirigido para unirte a un equipo',
        icon: 'info',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#3085d6',
      });

      await this._router.navigate(['/equipos'], {
        queryParams: {
          idEvento: this.idEvento,
          idEventoActividad: this.idEventoActividad,
        },
      });

      return { ok: true, redirectedToEquipos: true, alreadyInscribed };
    }

    // Actividad sin equipos: no hay redirección
    return { ok: true, redirectedToEquipos: false, alreadyInscribed };
  }
}
