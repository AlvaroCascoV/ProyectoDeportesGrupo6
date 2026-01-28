import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, shareReplay, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment.development';

import { PartidoResultado, ResultadoVisual } from '../../models/Resultado';
import { Equipo } from '../../models/Equipo';
import { Evento } from '../../models/Evento';
import { ActividadesEvento } from '../../models/ActividadesEvento';

@Injectable({ providedIn: 'root' })
export class ResultadosService {
  private readonly _http = inject(HttpClient);
  private readonly _url = environment.urlApi;

  private _informacionCompleta$?: Observable<ResultadoVisual[]>;

  /**
   * API: /api/Actividades/ActividadesEvento/{idEvento}
   * (incluye `nombreActividad` para las actividades de ese evento).
   */
  private getActividadesEventoPorEventoId(
    idEvento: number,
  ): Observable<ActividadesEvento[]> {
    return this._http.get<ActividadesEvento[]>(
      `${this._url}api/Actividades/ActividadesEvento/${idEvento}`,
    );
  }

  /**
   * NOTA de rendimiento:
   * - Se cachea con `shareReplay` para no refetch en navegación/volver atrás.
   * - Solo se cargan nombres de actividades para eventos que realmente tienen resultados:
   *   se obtiene el conjunto de `idEvento` desde el join
   *   `PartidoResultado -> idEventoActividad -> ActividadesEvento`,
   *   y se hace batch de `/Actividades/ActividadesEvento/{idEvento}` con `forkJoin`.
   * - Se usan `Map` para búsquedas O(1) y evitar `find()` repetidos.
   */
  getInformacionCompleta(): Observable<ResultadoVisual[]> {
    if (!this._informacionCompleta$) {
      this._informacionCompleta$ = forkJoin({
        resultados: this._http.get<PartidoResultado[]>(
          `${this._url}api/PartidoResultado`,
        ),
        equipos: this._http.get<Equipo[]>(`${this._url}api/Equipos`),
        relaciones: this._http.get<ActividadesEvento[]>(
          `${this._url}api/ActividadesEvento`,
        ),
        eventos: this._http.get<Evento[]>(`${this._url}api/Eventos`),
      }).pipe(
        switchMap(({ resultados, equipos, relaciones, eventos }) => {
          const relacionByEventoActividad = new Map<number, ActividadesEvento>(
            (relaciones ?? []).map((r) => [r.idEventoActividad, r]),
          );

          // Solo pedimos actividades de eventos que aparecen en resultados
          const eventoIds = Array.from(
            new Set(
              (resultados ?? [])
                .map(
                  (r) =>
                    relacionByEventoActividad.get(r.idEventoActividad)
                      ?.idEvento,
                )
                .filter((id): id is number => Number.isFinite(id as number)),
            ),
          );

          if (eventoIds.length === 0) {
            return of({
              resultados,
              equipos,
              relaciones,
              eventos,
              actividadesPorEvento: [] as ActividadesEvento[],
            });
          }

          return forkJoin(
            eventoIds.map((id) => this.getActividadesEventoPorEventoId(id)),
          ).pipe(
            map((arrays) => ({
              resultados,
              equipos,
              relaciones,
              eventos,
              actividadesPorEvento: arrays.flat(),
            })),
          );
        }),
        map(
          ({
            resultados,
            equipos,
            relaciones,
            eventos,
            actividadesPorEvento,
          }) => {
            const equiposById = new Map<number, Equipo>(
              (equipos ?? []).map((e) => [e.idEquipo, e]),
            );
            const relacionByEventoActividad = new Map<
              number,
              ActividadesEvento
            >((relaciones ?? []).map((r) => [r.idEventoActividad, r]));
            const eventosById = new Map<number, Evento>(
              (eventos ?? []).map((ev) => [ev.idEvento, ev]),
            );
            const actividadNombreByEventoActividad = new Map<number, string>(
              (actividadesPorEvento ?? []).map((a) => [
                a.idEventoActividad,
                a.nombreActividad,
              ]),
            );

            return (resultados ?? []).map((res): ResultadoVisual => {
              const local = equiposById.get(res.idEquipoLocal);
              const visitante = equiposById.get(res.idEquipoVisitante);
              const relacion = relacionByEventoActividad.get(
                res.idEventoActividad,
              );
              const evento = relacion
                ? eventosById.get(relacion.idEvento)
                : undefined;

              const actividadNombre =
                actividadNombreByEventoActividad.get(res.idEventoActividad) ??
                relacion?.nombreActividad ??
                'Sin Actividad';

              return {
                id: res.idPartidoResultado,
                idEvento: relacion?.idEvento ?? 0,
                eventoFecha: evento?.fechaEvento ?? '',
                idEventoActividad: res.idEventoActividad,
                idEquipoLocal: res.idEquipoLocal,
                idEquipoVisitante: res.idEquipoVisitante,
                idActividad: relacion?.idActividad ?? 0,
                actividadNombre,
                eventoNombre: evento
                  ? new Date(evento.fechaEvento).toLocaleDateString()
                  : 'Sin Fecha',
                equipoLocal: local?.nombreEquipo || 'Equipo Local',
                equipoVisitante: visitante?.nombreEquipo || 'Equipo Visitante',
                puntosLocal: res.puntosLocal,
                puntosVisitante: res.puntosVisitante,
              };
            });
          },
        ),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
    }

    return this._informacionCompleta$;
  }

  invalidateCache(): void {
    this._informacionCompleta$ = undefined;
  }
}
