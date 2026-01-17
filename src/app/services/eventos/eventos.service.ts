import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Evento } from '../../models/Evento';
import { ActividadesEvento } from '../../models/ActividadesEvento';

@Injectable({
  providedIn: 'root',
})
export class EventosService {
  private url = environment.urlApi;

  constructor(private _http: HttpClient) {}

  getEventos(): Observable<Evento[]> {
    return this._http.get<Evento[]>(`${this.url}api/eventos`);
  }

  getActividadesEvento(idEvento: number): Observable<ActividadesEvento[]> {
    return this._http.get<ActividadesEvento[]>(
      `${this.url}api/actividades/actividadesevento/${idEvento}`
    );
  }

  getProfesorById(idProfesor: number): Observable<any> {
    return this._http.get<any>(
      `${this.url}api/ProfesEventos/FindProfe?idprofesor=${idProfesor}`
    );
  }

  getEventosActividades(): Observable<Evento[]> {
    // para cada evento sacamos las actividades
    // metemos las actividades en la propiedad listaActividades de los eventos
    return this._http.get<Evento[]>(this.url + 'api/Eventos').pipe(
      map((eventos: Evento[]) => {
        eventos.forEach((e) => {
          this._http
            .get<ActividadesEvento[]>(
              `${this.url}api/actividades/actividadeseventos/${e.idEvento}`
            )
            .subscribe((lista) => (e.listaActividades = lista));
        });
        // devolvemos los eventos de inmediato; las actividades llegarán luego
        return eventos;
      })
    );
  }

  //  inserta un nuevo evento por la fecha
  insertEvento(fechaEvento: string): Observable<any> {
    // La fecha va en la URL en formato ISO: 2026-01-15T09:47:13.513Z
    // Codificar la fecha para la URL (los caracteres especiales necesitan encoding)
    const fechaEncoded = encodeURIComponent(fechaEvento);
    const url = `${this.url}api/Eventos/create/${fechaEncoded}`;
    return this._http.post<any>(url, null);
  }

  asociarProfesorEvento(idEvento: number, idProfesor: number): Observable<any> {
    const url = `${this.url}api/ProfesEventos/AsociarProfesorEvento/${idEvento}/${idProfesor}`;
    return this._http.post<any>(url, null);
  }

  insertarActividadesEvento(idEvento:number, idActividad:number): Observable<any>{
    return this._http.post<any>(`${this.url}api/ActividadesEvento/create?idevento=${idEvento}&idactividad=${idActividad}`,null)
  }
}
