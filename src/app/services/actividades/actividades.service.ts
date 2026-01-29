import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Actividad } from '../../models/Actividad';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class ActividadesService {
  private url = environment.urlApi;
  constructor(private _http: HttpClient) {}

  getActividades(): Observable<Actividad[]> {
    return this._http.get<Actividad[]>(`${this.url}api/actividades`);
  }

  insertActividad(actividad: any): Observable<Actividad> {
    const header = new HttpHeaders().set(
      'Authorization',
      `Bearer ${localStorage.getItem('token')}`
    );
    return this._http.post<Actividad>(
      `${this.url}api/actividades/create`,
      actividad,
      { headers: header }
    );
  }

  updateActividad(actividad: Actividad): Observable<any> {
    const header = new HttpHeaders().set(
      'Authorization',
      `Bearer ${localStorage.getItem('token')}`
    );
    return this._http.put<any>(`${this.url}api/actividades/update`, actividad, { headers: header });
  }
  deleteActividad(idActividad: number): Observable<any> {
    const header = new HttpHeaders().set(
      'Authorization',
      `Bearer ${localStorage.getItem('token')}`
    );
    return this._http.delete<any>(
      `${this.url}api/actividades/${idActividad}`,
      { headers: header }
    );
  }
}
