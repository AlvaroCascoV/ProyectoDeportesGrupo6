import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Profesor } from '../../models/Profesor';

@Injectable({
  providedIn: 'root',
})
export class ProfesoresService {
  private url = environment.urlApi;

  constructor(private _http: HttpClient) {}

  getProfesorById(idProfesor: number): Observable<Profesor> {
    return this._http.get<Profesor>(
      `${this.url}api/ProfesEventos/FindProfe?idprofesor=${idProfesor}`,
    );
  }

  // Obtiene todos los profesores activos del año actual
  getProfesoresActivos(): Observable<Profesor[]> {
    return this._http.get<Profesor[]>(`${this.url}api/ProfesEventos/ProfesActivos`);
  }

  // Obtiene los profesores que no tienen eventos asignados
  getProfesoresSinEventos(): Observable<Profesor[]> {
    return this._http.get<Profesor[]>(
      `${this.url}api/ProfesEventos/ProfesSinEventos`,
    );
  }

  // Obtiene los profesores que ya tienen eventos asignados
  getProfesoresConEventos(): Observable<Profesor[]> {
    return this._http.get<Profesor[]>(
      `${this.url}api/ProfesEventos/ProfesConEventos`,
    );
  }

  // Elimina la asociación de un profesor con un evento
  eliminarProfesorEvento(idEvento: number): Observable<any> {
    const url = `${this.url}api/ProfesEventos/EliminarProfesorEvento/${idEvento}`;
    let header = new HttpHeaders().set(
      'Authorization',
      `Bearer ${localStorage.getItem('token')}`,
    );
    return this._http.delete<any>(url, { headers: header });
  }

  asociarProfesorEvento(idEvento: number, idProfesor: number): Observable<any> {
    const url = `${this.url}api/ProfesEventos/AsociarProfesorEvento/${idEvento}/${idProfesor}`;
    let header = new HttpHeaders().set(
      'Authorization',
      `Bearer ${localStorage.getItem('token')}`,
    );
    return this._http.post<any>(url, null, { headers: header });
  }
}
