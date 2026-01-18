import { Component, OnInit } from '@angular/core';
import { Alumno } from '../../models/Alumno';
import { PerfilService } from '../../services/perfil/perfil.service';
import { Inscripcion } from '../../models/Inscripcion';

@Component({
  selector: 'app-perfil',
  standalone: false,
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent implements OnInit{
  public usuario!: Alumno;
  public inscripciones: Inscripcion[] = [];
  public inscripcionesFiltro: Inscripcion[] = [];
  public filtroActivo: 'pasados' | 'proximos' | 'todos' = 'todos';
  constructor(private _servicioPerfil: PerfilService){}

  ngOnInit(): void {
    let token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VyRGF0YSI6IkpHb3cwSFBBdUVGVXhNekRJa1JkYmRpaGhuTk15bld4SFNZbVUxcTZ5bXJ0LzNTTmhIcnlNdW1LWk40OTlXYjVMdGppZ3JaY1ExTVBmUmpLdEVyaXVsUUZvMms0M0lsc0lIQm5HeDRWa3NPaXk3STE4UHBjUlNmQ0NuOWpVSmZkbnRTd1dmTFBZakR4QTZKY0JrRzloQ2lkVkQ3NjN5OXdWVDBENWV4bVRxTTVjODM2Q2MvN1Q4T3B2TVNWYXFydDFwWUJ6T0M1SzlYMEdMVlNOQnB6NUhtUTNQMlJYeUlvdHQ5dzRRWStOaHFnd1dPSU5HclZLdE5henBPNkhtU2V4NnVGUTZKU3pncXFJSU5Gb1RYcHRmbmdjcXJPcGlvM3BBOEVGcExJMENDQ1kwTjhER1pkZEF2R1ZPSUYxQW9DOFFPQlNXMVV3YXpJTUtOWlQxMkF5NG81Z21weXpDcTcxMkcvaERFQ1A3TlllNzJubEg2NnZVcHhoV21OQllnSHhkdm53RWQyYi9OMkhTWEVvMk4zdkFVVWZ1WTNvV1pzWE1OVVlkdzJFemo2bVo3cklDSmtDTEFzTkhTNW9MdUwiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJBTFVNTk8iLCJuYmYiOjE3Njg3MzE2OTcsImV4cCI6MTc2ODc0NjA5NywiaXNzIjoiaHR0cHM6Ly9sb2NhbGhvc3Q6NzAzMi8iLCJhdWQiOiJBcGlEZXBvcnRlc1RhamFtYXJDb3JlT0F1dGgifQ.cKol_B3V9katNvlNAuBNQ2xriMG7O7HSik1QavxMTQU"
    this._servicioPerfil.getPerfil(token).subscribe(response => {
      this.usuario = response;
      localStorage.setItem("userID", (response.idUsuario).toString());
      console.log("Usuario: "+JSON.stringify(this.usuario))
    })
    this._servicioPerfil.getActividadesUser(token).subscribe(response => {
      this.inscripciones = response;
      this.inscripciones.sort((a, b) => {
        const fechaA = new Date(a.fechaEvento).getTime();
        const fechaB = new Date(b.fechaEvento).getTime();
        return fechaA - fechaB;
      });
      this.inscripcionesFiltro = [...this.inscripciones];
      this.filtroActivo = 'todos';
    })
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

  filtrarPasados(){
    this.inscripcionesFiltro = this.inscripciones.filter((inscripcion)=> {
      return !this.comprobarFechaProxima(inscripcion.fechaEvento);
    });
    this.filtroActivo = 'pasados';
  }
  filtrarProximos(){
    this.inscripcionesFiltro = this.inscripciones.filter((inscripcion)=> {
      return this.comprobarFechaProxima(inscripcion.fechaEvento);
    });
    this.filtroActivo = 'proximos';
  }
  filtrarTodos(){
    this.inscripcionesFiltro = [...this.inscripciones];
    this.filtroActivo = 'todos';
  }
}
