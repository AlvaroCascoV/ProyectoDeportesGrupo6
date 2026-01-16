import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { Aula } from '../../models/Aula';
import { AlumnoCurso } from '../../models/AlumnoCurso';

@Injectable({
  providedIn: 'root',
})
export class AulasService {
  private url = environment.urlApi;

  constructor(private _http: HttpClient) {}

  getCursosActivos(): Observable<Aula[]> {
    return this._http.get<Aula[]>(`${this.url}api/GestionEvento/CursosActivos`);
  }

  getAlumnosPorCurso(idCurso: number): Observable<AlumnoCurso[]> {
    return this._http.get<AlumnoCurso[]>(
      `${this.url}api/GestionEvento/UsuariosCurso/${idCurso}`
    );
  }
}
