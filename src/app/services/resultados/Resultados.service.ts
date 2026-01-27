import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import {
  PartidoResultado,
  Equipo,
  Evento,
  ResultadoVisual,
} from '../../models/Resultado';

// Interfaz intermedia para ActividadesEvento
interface ActividadEvento {
  idEventoActividad: number;
  idEvento: number;
  idActividad: number;
}

@Injectable({ providedIn: 'root' })
export class ResultadosService {
  private readonly _http = inject(HttpClient);
  private readonly _url = 'https://apideportestajamar.azurewebsites.net/api';

  getInformacionCompleta(): Observable<ResultadoVisual[]> {
    return forkJoin({
      resultados: this._http.get<PartidoResultado[]>(
        `${this._url}/PartidoResultado`,
      ),
      equipos: this._http.get<Equipo[]>(`${this._url}/Equipos`),
      relaciones: this._http.get<ActividadEvento[]>(
        `${this._url}/ActividadesEvento`,
      ),
      eventos: this._http.get<Evento[]>(`${this._url}/Eventos`),
    }).pipe(
      map(({ resultados, equipos, relaciones, eventos }) => {
        return resultados.map((res) => {
          const local = equipos.find((e) => e.idEquipo === res.idEquipoLocal);
          const visitante = equipos.find(
            (e) => e.idEquipo === res.idEquipoVisitante,
          );

          const relacion = relaciones.find(
            (r) => r.idEventoActividad === res.idEventoActividad,
          );

          const evento = eventos.find(
            (ev) => ev.idEvento === relacion?.idEvento,
          );

          return {
            id: res.idPartidoResultado,
            idEvento: res.idEventoActividad,
            eventoNombre: evento
              ? new Date(evento.fechaEvento).toLocaleDateString()
              : 'Sin Fecha',
            equipoLocal: local?.nombreEquipo || 'Equipo Local',
            equipoVisitante: visitante?.nombreEquipo || 'Equipo Visitante',
            puntosLocal: res.puntosLocal,
            puntosVisitante: res.puntosVisitante,
          };
        });
      }),
    );
  }
}
