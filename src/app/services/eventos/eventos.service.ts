import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Evento } from '../../models/Evento';
import { ActividadesEvento } from '../../models/ActividadesEvento';

@Injectable({
  providedIn: 'root'
})
export class EventosService {
  private url = environment.urlApi;
  
  constructor(private _http : HttpClient) { }

  getEventos(): Observable<Evento[]>{
    return this._http.get<Evento[]>(`${this.url}api/eventos`)
  }

  getActividadesEvento(idEvento: number): Observable<ActividadesEvento[]>{
    return this._http.get<ActividadesEvento[]>(`${this.url}api/actividades/actividadesevento/${idEvento}`);
  }

  getEventosActividades(): Observable<Evento[]>{
    // para cada evento sacamos las actividades
    // metemos las actividades en la propiedad listaActividades de los eventos
    return this._http.get<Evento[]>(this.url + 'api/Eventos').pipe(
      map((eventos: Evento[]) => {
        eventos.forEach(e => {
          this._http.get<ActividadesEvento[]>(`${this.url}api/actividades/actividadeseventos/${e.idEvento}`)
            .subscribe(lista => e.listaActividades = lista);
        });
        // devolvemos los eventos de inmediato; las actividades llegarán luego
        return eventos;
      })
    );
  }
}
