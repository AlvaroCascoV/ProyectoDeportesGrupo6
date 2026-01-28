export interface PartidoResultado {
  idPartidoResultado: number;
  idEventoActividad: number;
  idEquipoLocal: number;
  idEquipoVisitante: number;
  puntosLocal: number;
  puntosVisitante: number;
}

export interface ResultadoVisual {
  id: number;
  /**
   * idEvento from `models/Evento.ts` (used by /eventos/:idEvento/resultados).
   */
  idEvento: number;
  /**
   * ISO date (from Evento.fechaEvento) to allow chronological sorting.
   */
  eventoFecha: string;
  /**
   * idEventoActividad from ActividadesEvento (used by PartidoResultado).
   */
  idEventoActividad: number;
  /**
   * IDs de equipos (necesarios para operaciones de editar/actualizar como capitán).
   */
  idEquipoLocal: number;
  idEquipoVisitante: number;
  /**
   * idActividad from ActividadesEvento (used for filtering by activity).
   */
  idActividad: number;
  /**
   * nombreActividad from ActividadesEvento (display/filter helper).
   */
  actividadNombre: string;
  eventoNombre: string;
  equipoLocal: string;
  equipoVisitante: string;
  puntosLocal: number;
  puntosVisitante: number;
}
