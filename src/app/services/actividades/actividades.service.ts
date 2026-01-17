import { HttpClient } from '@angular/common/http';
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

}
