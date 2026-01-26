import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment.development';
import { CapitanActividad } from '../../models/CapitanActividad';
import { Alumno } from '../../models/Alumno';

@Injectable({
  providedIn: 'root'
})
export class CapitanActividadesService {
  private url = environment.urlApi;

  constructor(private _http: HttpClient) {}

  getAllCapitanActividades(): Observable<CapitanActividad[]> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    });
    return this._http.get<CapitanActividad[]>(`${this.url}api/CapitanActividades`, { headers });
  }

  getCapitanByUsuario(idUsuario: number): Observable<Alumno | null> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    });
    return this._http.get<Alumno>(`${this.url}api/CapitanActividades/FindCapitanUsuario/${idUsuario}`, { 
      headers,
      observe: 'response'
    }).pipe(
      map(response => response.body),
      catchError(error => {
        // Handle 204 No Content or other errors
        if (error.status === 204 || error.status === 404) {
          return of(null);
        }
        throw error;
      })
    );
  }

  getCapitanByEventoActividad(idEventoActividad: number): Observable<Alumno | null> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    });
    return this._http.get<Alumno>(`${this.url}api/CapitanActividades/FindCapitanEventoActividad/${idEventoActividad}`, { 
      headers,
      observe: 'response'
    }).pipe(
      map(response => response.body),
      catchError(error => {
        // Handle 204 No Content or other errors
        if (error.status === 204 || error.status === 404) {
          return of(null);
        }
        throw error;
      })
    );
  }

  getCapitanActividadById(idCapitanActividad: number): Observable<CapitanActividad> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    });
    return this._http.get<CapitanActividad>(`${this.url}api/CapitanActividades/${idCapitanActividad}`, { headers });
  }

  createCapitanActividad(capitan: CapitanActividad): Observable<CapitanActividad> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    });
    return this._http.post<CapitanActividad>(`${this.url}api/CapitanActividades/create`, capitan, { 
      headers
    }).pipe(
      catchError((error: any) => {
        // Si es 204 No Content o cualquier código 2xx (incluyendo errores de parseo JSON), considerar éxito
        const status = error?.status || error?.error?.status;
        if (status === 204 || (status >= 200 && status < 300)) {
          return of(capitan);
        }
        // Solo lanzar error si es un código de error real (>= 400)
        throw error;
      })
    );
  }

  updateCapitanActividad(capitan: CapitanActividad): Observable<CapitanActividad> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    });
    return this._http.put<CapitanActividad>(`${this.url}api/CapitanActividades/update`, capitan, { 
      headers
    }).pipe(
      catchError((error: any) => {
        // Si es 204 No Content o cualquier código 2xx, considerar éxito
        // Esto puede ocurrir cuando la API devuelve éxito pero sin cuerpo o con error de parseo JSON
        const status = error?.status || error?.error?.status;
        if (status === 204 || (status >= 200 && status < 300)) {
          return of(capitan);
        }
        // Si es un error de parseo JSON pero el status es 2xx, también considerar éxito
        if (error?.name === 'HttpErrorResponse' && status >= 200 && status < 300) {
          return of(capitan);
        }
        // Solo lanzar error si es un código de error real (>= 400)
        throw error;
      })
    );
  }

  deleteCapitanActividad(idCapitanActividad: number): Observable<void> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    });
    return this._http.delete<void>(`${this.url}api/CapitanActividades/${idCapitanActividad}`, { 
      headers,
      observe: 'response'
    }).pipe(
      map(() => undefined),
      catchError(error => {
        // Si es 204 o 200, considerar éxito
        if (error.status === 204 || (error.status >= 200 && error.status < 300)) {
          return of(undefined);
        }
        throw error;
      })
    );
  }
}
