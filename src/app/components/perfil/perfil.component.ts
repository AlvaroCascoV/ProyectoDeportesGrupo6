import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Alumno } from '../../models/Alumno';
import { PerfilService } from '../../services/perfil/perfil.service';
import { Inscripcion } from '../../models/Inscripcion';
import { CapitanActividadesService } from '../../services/capitan-actividades/capitan-actividades.service';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css',
})
export class PerfilComponent implements OnInit {
  public usuario!: Alumno;
  public inscripciones: Inscripcion[] = [];
  public inscripcionesFiltro: Inscripcion[] = [];
  public filtroActivo: 'pasados' | 'proximos' | 'todos' = 'todos';
  public esCapitan: Map<number, boolean> = new Map(); // idEventoActividad -> isCaptain

  constructor(
    private _servicioPerfil: PerfilService,
    private _servicioCapitanes: CapitanActividadesService,
    private _router: Router
  ) {}

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      this._router.navigateByUrl('/auth/login');
      return;
    }

    this._servicioPerfil.getPerfil(token).subscribe((response) => {
      this.usuario = response;
      localStorage.setItem('userID', response.idUsuario.toString());
      console.log('Usuario: ' + JSON.stringify(this.usuario));
      // Load captain status after user is loaded
      if (this.inscripciones.length > 0) {
        this.cargarEstadoCapitan();
      }
    });
    this._servicioPerfil.getActividadesUser(token).subscribe((response) => {
      this.inscripciones = response;
      this.inscripciones.sort((a, b) => {
        const fechaA = new Date(a.fechaEvento).getTime();
        const fechaB = new Date(b.fechaEvento).getTime();
        return fechaA - fechaB;
      });
      this.inscripcionesFiltro = [...this.inscripciones];
      this.filtroActivo = 'todos';
      // Load captain status after inscriptions are loaded
      if (this.usuario?.idUsuario) {
        this.cargarEstadoCapitan();
      }
    });
  }

  formatearFecha(fecha: string): string {
    let fechaEvento = new Date(fecha);
    const dia = String(fechaEvento.getDate()).padStart(2, '0');
    const mes = String(fechaEvento.getMonth() + 1).padStart(2, '0');
    const anio = fechaEvento.getFullYear();
    const fechaFormateada = `${dia}/${mes}/${anio}`;
    return fechaFormateada;
  }

  comprobarFechaProxima(fechaEvento: string): boolean {
    let fechaEventoDate = new Date(fechaEvento);
    let ahora = new Date();
    return fechaEventoDate > ahora;
  }

  filtrarPasados() {
    this.inscripcionesFiltro = this.inscripciones.filter((inscripcion) => {
      return !this.comprobarFechaProxima(inscripcion.fechaEvento);
    });
    this.filtroActivo = 'pasados';
  }
  filtrarProximos() {
    this.inscripcionesFiltro = this.inscripciones.filter((inscripcion) => {
      return this.comprobarFechaProxima(inscripcion.fechaEvento);
    });
    this.filtroActivo = 'proximos';
  }
  filtrarTodos() {
    this.inscripcionesFiltro = [...this.inscripciones];
    this.filtroActivo = 'todos';
  }

  cargarEstadoCapitan(): void {
    if (!this.usuario?.idUsuario) return;

    this.esCapitan.clear();
    const requests = this.inscripciones.map(inscripcion =>
      this._servicioCapitanes.getCapitanByEventoActividad(inscripcion.idEventoActividad)
    );

    if (requests.length === 0) {
      return;
    }
    forkJoin(requests).subscribe({
      next: (capitanes) => {
        capitanes.forEach((capitan, index) => {
          if (capitan && capitan.idUsuario === this.usuario.idUsuario) {
            this.esCapitan.set(this.inscripciones[index].idEventoActividad, true);
          } else {
            this.esCapitan.set(this.inscripciones[index].idEventoActividad, false);
          }
        });
      },
      error: () => {
        // Silently fail - captain status is optional
      },
    });
  }

  esCapitanActividad(idEventoActividad: number): boolean {
    return this.esCapitan.get(idEventoActividad) || false;
  }
}
