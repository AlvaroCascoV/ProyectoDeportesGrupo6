import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { Alumno } from '../../models/Alumno';
import { Observable } from 'rxjs';
import { Inscripcion } from '../../models/Inscripcion';

@Injectable({
  providedIn: 'root'
})
export class PerfilService {

  private url = environment.urlApi;

  constructor(private _http: HttpClient) { }

  getPerfil(token: string): Observable<Alumno>{
    const headers = new HttpHeaders({
      'Authorization': `bearer ${token}`
    });
    return this._http.get<Alumno>(`${this.url}api/usuariosdeportes/perfil`, {headers})
  }

  getActividadesUser(token: string): Observable<Inscripcion[]>{
    const headers = new HttpHeaders({
      'Authorization': `bearer ${token}`
    });
    return this._http.get<Inscripcion[]>(`${this.url}api/UsuariosDeportes/ActividadesUser`, {headers})
  }

}
