import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EventosService } from '../../services/eventos/eventos.service';
import { InscripcionesService } from '../../services/inscripciones/inscripciones.service';
import { ActividadesEvento } from '../../models/ActividadesEvento';
import Swal from 'sweetalert2';
import { firstValueFrom } from 'rxjs';
import { EquiposSelectorComponent } from '../equipos-selector/equipos-selector.component';

@Component({
  selector: 'app-inscripcion',
  standalone: true,
  imports: [FormsModule, EquiposSelectorComponent],
  templateUrl: './inscripcion.component.html',
  styleUrls: ['./inscripcion.component.css'],
})
export class InscripcionComponent implements OnInit {
  public idEventoActividad: number = 0;
  public actividadesEvento: ActividadesEvento[] = [];
  @Input() idEvento!: number;

  public actividadSeleccionada: ActividadesEvento | null = null;

  @ViewChild(EquiposSelectorComponent)
  equiposSelector?: EquiposSelectorComponent;

  constructor(
    private _servicioEventos: EventosService,
    private _servicioInscripciones: InscripcionesService
  ) {}

  ngOnInit(): void {
    this._servicioEventos
      .getActividadesEvento(this.idEvento)
      .subscribe((response) => {
        this.actividadesEvento = response;
      });
  }

  onActividadChange(): void {
    this.actividadSeleccionada =
      this.actividadesEvento.find(
        (a) => a.idEventoActividad === this.idEventoActividad
      ) ?? null;
  }

  async inscribirUsuario(): Promise<boolean> {
    const idUsuarioStr = localStorage.getItem('userID');
    if (!idUsuarioStr) {
      await Swal.fire({
        title: 'Error',
        text: 'No se ha encontrado el usuario. Vuelve a iniciar sesión.',
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
        text: 'El usuario no es válido. Vuelve a iniciar sesión.',
        icon: 'error',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#d33',
      });
      return false;
    }

    if (!this.idEventoActividad || this.idEventoActividad === 0) {
      await Swal.fire({
        title: 'Falta información',
        text: 'Selecciona una actividad para inscribirte.',
        icon: 'warning',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#3085d6',
      });
      return false;
    }

    if (!this.actividadSeleccionada) {
      await Swal.fire({
        title: 'Falta información',
        text: 'Selecciona una actividad válida.',
        icon: 'warning',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#3085d6',
      });
      return false;
    }

    const inscripcion = {
      idInscripcion: 0,
      idUsuario,
      idEventoActividad: this.idEventoActividad,
      // Captains are handled elsewhere; not needed here now.
      quiereSerCapitan: false,
      fechaInscripcion: new Date(),
    };

    // 1) Inscripción (si ya existe, seguimos adelante para permitir unirse a equipo)
    try {
      await firstValueFrom(
        this._servicioInscripciones.createInscripcion(inscripcion)
      );
    } catch (error: any) {
      if (error?.status !== 400) {
        await Swal.fire({
          title: 'Error',
          text: 'No se pudo completar la inscripción.',
          icon: 'error',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#d33',
        });
        return false;
      } else {
        // Inscripción ya existente: informamos al usuario y continuamos con el flujo.
        await Swal.fire({
          title: 'Ya estás inscrito',
          text: 'Ya estabas inscrito en esta actividad. Ahora puedes gestionar tu equipo.',
          icon: 'info',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#3085d6',
        });
      }
    }

    // 2) Equipo (crear/unirse) delegando en el componente
    if (!this.equiposSelector) {
      await Swal.fire({
        title: 'Error',
        text: 'No se pudo cargar el selector de equipos.',
        icon: 'error',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#d33',
      });
      return false;
    }

    return await this.equiposSelector.submit();
  }
}
