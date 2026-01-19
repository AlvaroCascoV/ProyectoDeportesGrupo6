import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Alumno } from '../../models/Alumno';
import { PerfilService } from '../../services/perfil/perfil.service';
import { Inscripcion } from '../../models/Inscripcion';
import { Router } from '@angular/router';

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
  constructor(
    private _servicioPerfil: PerfilService,
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
}
