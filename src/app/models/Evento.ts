import { Actividad } from "./Actividad";

export class Evento {
    constructor(
        public idEvento: number,
        public fechaEvento: string,
        public idProfesor: number,
        public listaActividades: Actividad[] = []
    ) {}
}