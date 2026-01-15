import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { Observable } from 'rxjs';

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

}
