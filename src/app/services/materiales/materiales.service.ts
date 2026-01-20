import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { Material } from '../../models/Material';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MaterialesService {
  private url = environment.urlApi;
  constructor(private _http:HttpClient) { }

  getMaterialesEventoActividad(idEventoActividad: number): Observable<Material[]>{
      return this._http.get<Material[]>(`${this.url}api/materiales/materialesactividad/${idEventoActividad}`)
  }

  aportarMaterial(idMaterial: number, idAlumno:number): Observable<any>{
    return this._http.put<any>(`${this.url}api/materiales/aportarmaterial/${idMaterial}/${idAlumno}`,{});
  }

  solicitarMaterial(material: Material):Observable<any>{
    return this._http.post<any>(`${this.url}api/materiales/create`, material);
  }
}
