import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { Equipo } from '../../models/Equipo';
import { MiembroEquipo } from '../../models/MiembroEquipo';

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
    return this._http.post<Equipo>(`${this.url}api/equipos/create`, equipo, {
      headers: this.getOptionalAuthHeaders(),
    });
  }

  joinEquipo(miembro: MiembroEquipo): Observable<any> {
    return this._http.post<any>(
      `${this.url}api/MiembroEquipos/create`,
      miembro,
      { headers: this.getOptionalAuthHeaders() }
    );
  }

  private getOptionalAuthHeaders(): HttpHeaders | undefined {
    const token = localStorage.getItem('token');
    if (!token) return undefined;
    return new HttpHeaders({
      Authorization: `bearer ${token}`,
    });
  }
}
