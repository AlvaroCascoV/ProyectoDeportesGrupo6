import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { PrecioActividad } from '../../models/PrecioActividad';

@Injectable({
  providedIn: 'root',
})
export class PrecioActividadService {
  private url = environment.urlApi;

  constructor(private _http: HttpClient) {}

  /** Obtiene todos los precios de actividades. */
  getPreciosActividad(): Observable<PrecioActividad[]> {
    const header = new HttpHeaders().set(
      'Authorization',
      `Bearer ${localStorage.getItem('token')}`
    );
    return this._http.get<PrecioActividad[]>(`${this.url}api/PrecioActividad`, {
      headers: header,
    });
  }

  /** Obtiene un precio concreto por su idPrecioActividad. */
  getPrecioActividadById(
    idPrecioActividad: number
  ): Observable<PrecioActividad> {
    const header = new HttpHeaders().set(
      'Authorization',
      `Bearer ${localStorage.getItem('token')}`
    );
    return this._http.get<PrecioActividad>(
      `${this.url}api/PrecioActividad/${idPrecioActividad}`,
      { headers: header }
    );
  }

  /** Crea un precio para una actividad de un evento. */
  insertarPrecioActividad(
    precio: number,
    idEventoActividad: number
  ): Observable<PrecioActividad> {
    const precioActividad = {
      idPrecioActividad: 0,
      idEventoActividad,
      precioTotal: precio,
    };
    const header = new HttpHeaders().set(
      'Authorization',
      `Bearer ${localStorage.getItem('token')}`
    );
    return this._http.post<PrecioActividad>(
      `${this.url}api/precioactividad/create`,
      precioActividad,
      { headers: header }
    );
  }
}
