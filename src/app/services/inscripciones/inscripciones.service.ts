import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { Observable } from 'rxjs';
import { Inscripcion } from '../../models/Inscripcion';
import { Alumno } from '../../models/Alumno';

@Injectable({
  providedIn: 'root'
})
export class InscripcionesService {
  private url = environment.urlApi;
  constructor(private _http:HttpClient) { }

  createInscripcion(inscripcion: any): Observable<any>{
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    return this._http.post(`${this.url}api/inscripciones/create`, inscripcion, { headers })
  }

  updateInscripcion(inscripcion: any): Observable<Inscripcion> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    });
    return this._http.put<Inscripcion>(`${this.url}api/inscripciones/update`, inscripcion, { headers });
  }

  getInscripcionById(idInscripcion: number): Observable<Inscripcion> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    });
    return this._http.get<Inscripcion>(`${this.url}api/Inscripciones/${idInscripcion}`, { headers });
  }

  getUsuariosQuierenSerCapitanEvento(idEvento: number): Observable<Alumno[]> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    });
    return this._http.get<Alumno[]>(`${this.url}api/Inscripciones/InscripcionesUsuariosQuierenSerCapitan/${idEvento}`, { headers });
  }

  getUsuariosQuierenSerCapitanActividad(idEvento: number, idActividad: number): Observable<Alumno[]> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    });
    return this._http.get<Alumno[]>(`${this.url}api/Inscripciones/InscripcionesUsuariosEventoCapitanActividad/${idEvento}?idactividad=${idActividad}`, { headers });
  }

  getUsuariosEventoActividad(idEvento: number, idActividad: number): Observable<Alumno[]> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    });
    return this._http.get<Alumno[]>(`${this.url}api/Inscripciones/InscripcionesUsuariosEventoActividad/${idEvento}?idactividad=${idActividad}`, { headers });
  }

}
