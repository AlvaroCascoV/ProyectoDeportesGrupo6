export interface PartidoResultado {
  idPartidoResultado: number;
  idEventoActividad: number;
  idEquipoLocal: number;
  idEquipoVisitante: number;
  puntosLocal: number;
  puntosVisitante: number;
}

export interface Equipo {
  idEquipo: number;
  idEventoActividad: number;
  nombreEquipo: string;
  minimoJugadores: number;
  idColor: number;
  idCurso: number;
}

export interface Evento {
  idEvento: number;
  fechaEvento: Date;
  idProfesor: number;
}

export interface ResultadoVisual {
  id: number;
  eventoNombre: string;
  idEvento: number;
  equipoLocal: string;
  equipoVisitante: string;
  puntosLocal: number;
  puntosVisitante: number;
}
