import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
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
    return this._http.post<Equipo>(`${this.url}api/equipos/create`, equipo, {
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

    // New API shape: POST /create/{idUsuario}/{idEquipo} (no body)
    return this._http
      .post<MiembroEquipo>(`${baseUrl}/${idUsuario}/${idEquipo}`, null, {
        headers,
      })
      .pipe(
        catchError((err) => {
          // Backwards compatibility with older endpoints:
          // - POST /create (body)
          // - POST /create/ALUMNO (body)
          if (err?.status !== 405 && err?.status !== 404)
            return throwError(() => err);

          const miembroPayload: MiembroEquipo = {
            idMiembroEquipo: 0,
            idEquipo,
            idUsuario,
          };

          return this._http
            .post<MiembroEquipo>(baseUrl, miembroPayload, { headers })
            .pipe(
              catchError((err2) => {
                if (err2?.status === 405 || err2?.status === 404) {
                  return this._http.post<MiembroEquipo>(
                    `${baseUrl}/ALUMNO`,
                    miembroPayload,
                    { headers }
                  );
                }
                return throwError(() => err2);
              })
            );
        })
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
