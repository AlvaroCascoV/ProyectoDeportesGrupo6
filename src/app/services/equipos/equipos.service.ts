import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { Equipo } from '../../models/Equipo';
import { MiembroEquipo } from '../../models/MiembroEquipo';
import { UsuarioEquipo } from '../../models/UsuarioEquipo';

@Injectable({
  providedIn: 'root',
})
export class EquiposService {
  private url = environment.urlApi;

  constructor(private _http: HttpClient) {}

  getEquiposActividadEvento(
    idActividad: number,
    idEvento: number
  ): Observable<Equipo[]> {
    return this._http.get<Equipo[]>(
      `${this.url}api/Equipos/EquiposActividadEvento/${idActividad}/${idEvento}`,
      { headers: this.getOptionalAuthHeaders() }
    );
  }

  createEquipo(equipo: Equipo): Observable<Equipo> {
    return this._http.post<Equipo>(`${this.url}api/Equipos/create`, equipo, {
      headers: this.getOptionalAuthHeaders(),
    });
  }

  getUsuariosEquipo(idEquipo: number): Observable<UsuarioEquipo[]> {
    const headers = this.getOptionalAuthHeaders();
    return this._http.get<UsuarioEquipo[]>(
      `${this.url}api/Equipos/UsuariosEquipo/${idEquipo}`,
      { headers }
    );
  }

  joinEquipo(idUsuario: number, idEquipo: number): Observable<MiembroEquipo> {
    const headers = this.getOptionalAuthHeaders();
    const baseUrl = `${this.url}api/MiembroEquipos/create`;

    return this._http.post<MiembroEquipo>(
      `${baseUrl}/${idUsuario}/${idEquipo}`,
      null,
      { headers }
    );
  }

  joinEquipoNew(idEquipo: number): Observable<any>{
    const header = new HttpHeaders().set(
      'Authorization',
      `Bearer ${localStorage.getItem('token')}`
    );
    return this._http.post<any>(`${this.url}api/UsuariosDeportes/ApuntarmeEquipo/${idEquipo}`, null, {headers: header});
  }

  private getOptionalAuthHeaders(): HttpHeaders | undefined {
    const token = localStorage.getItem('token');
    if (!token) return undefined;
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }
}
