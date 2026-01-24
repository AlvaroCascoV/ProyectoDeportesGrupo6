import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Actividad } from '../../models/Actividad';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class ActividadesService {
  private url = environment.urlApi;
  constructor(private _http:HttpClient) { }

  getActividades(): Observable<Actividad[]>{
    return this._http.get<Actividad[]>(`${this.url}api/actividades`)
  }

  insertActividad(actividad: any): Observable<Actividad> {
    let header = new HttpHeaders().set("Authorization", `Bearer ${localStorage.getItem("token")}`)
    return this._http.post<Actividad>(`${this.url}api/actividades/create`, actividad, {headers:header});
  }

  insertarPrecioActividad(precio:number, idEventoActividad:number): Observable<any>{
    let precioActividad = {
      "idPrecioActividad": 0,
      "idEventoActividad": idEventoActividad,
      "precioTotal": precio
    }
    let header = new HttpHeaders().set("Authorization", `Bearer ${localStorage.getItem("token")}`);
    return this._http.post<any>(`${this.url}api/precioactividad/create`, precioActividad, {headers:header});
  }

  getPrecioActividades(idPrecioActividad: number): Observable<any>{
    let header = new HttpHeaders().set("Authorization", `Bearer ${localStorage.getItem("token")}`)
    return this._http.get<any>(`${this.url}api/precioactividades/${idPrecioActividad}`, {headers: header});
  }
  
  deleteActividad(idActividad:number): Observable<any>{
    let header = new HttpHeaders().set("Authorization", `Bearer ${localStorage.getItem("token")}`)
    return this._http.get<any>(`${this.url}api/actividades/${idActividad}`, {headers: header});
  }
}
