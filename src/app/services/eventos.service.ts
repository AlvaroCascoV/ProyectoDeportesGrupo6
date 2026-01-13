import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { switchMap, mergeMap, toArray, map } from 'rxjs/operators';
import { Evento } from '../models/Evento';
import { ActividadesEvento } from '../models/ActividadesEvento';

@Injectable({
  providedIn: 'root'
})
export class EventosService {
  private url = environment.urlApi;
  
  constructor(private _http : HttpClient) { }

  getActividadesPorEvento(): Observable<Evento[]>{
    // Primero obtenemos la lista de eventos y luego, por cada evento,
    // hacemos una petición al endpoint que devuelve las actividades de ese evento.
    return this._http.get<Evento[]>(this.url + 'api/Eventos').pipe(
      // convertimos el array de eventos en un stream de eventos
      switchMap((eventos: Evento[]) =>
        from(eventos).pipe(
          // para cada evento, pedimos sus actividades y mapeamos al evento con listaActividades
          mergeMap((evento: Evento) =>
            this._http.get<ActividadesEvento[]>(this.url+"api/actividades/actividadesevento/"+evento.idEvento).pipe(
              map((lista: ActividadesEvento[]) => ({ ...evento, listaActividades: lista }))
            )
          ),
          // recomponemos el array final de eventos ya enriquecidos
          toArray()
        )
      )
    );
  }
}
