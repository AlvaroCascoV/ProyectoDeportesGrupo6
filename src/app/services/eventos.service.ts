import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Evento } from '../models/Evento';
import { ActividadesEvento } from '../models/ActividadesEvento';
import { Actividad } from '../models/Actividad';

@Injectable({
  providedIn: 'root'
})
export class EventosService {
  private url = environment.urlApi;
  
  constructor(private _http : HttpClient) { }

  getActividadesPorEvento(): Observable<any>{
    return forkJoin({
      eventos: this._http.get<Evento[]>(this.url + 'api/Eventos'),
      relaciones: this._http.get<ActividadesEvento[]>(this.url + 'api/ActividadesEvento'),
      actividades: this._http.get<Actividad[]>(this.url + 'api/Actividades')
    }).pipe(
      map(({ eventos, relaciones, actividades }: { eventos: Evento[], relaciones: ActividadesEvento[], actividades: Actividad[] }) => {
        return eventos.map((evento: Evento) => {
          // buscamos qué ids de actividades pertenecen a este evento en la tabla intermedia
          const idsRelacionados = relaciones
            .filter((rel: ActividadesEvento) => rel.idEvento === evento.idEvento)//nos quedamos con las relaciones que coinciden con el evento
            .map((rel: ActividadesEvento) => rel.idActividad); //guardamos solo el id de la actividad

          // buscamos los nombres de las actividades y las
          // guardamos como objetos completos
          const actividadesDelEvento = actividades.filter((act: Actividad) => 
            idsRelacionados.includes(act.idActividad)
          );

          // devolvemos el evento con su la propiedad 'listaActividades'
          return {
            ...evento, //esto copia todas las propiedades originales en el nuevo objeto
            listaActividades: actividadesDelEvento
            //esto devuelve por ejemplo
            //{
            // idEvento: 1,
            // fecha: 10/10/2026,
            // idProfesor: 1,
            // listaActividades: {
            //            idActividad: 1
            //            nombre: Futbol,
            //            minimojugadores: 7
            //          } 
            //}
          };
        });
      })
    );
  }
}
