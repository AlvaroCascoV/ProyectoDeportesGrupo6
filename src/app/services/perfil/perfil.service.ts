import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { Alumno } from '../../models/Alumno';
import { Observable } from 'rxjs';

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

  getActividadesUser(token: string): Observable<any>{
    const headers = new HttpHeaders({
      'Authorization': `bearer ${token}`
    });
    return this._http.get<any>(`${this.url}api/UsuariosDeportes/ActividadesUser`, {headers})
  }

}
