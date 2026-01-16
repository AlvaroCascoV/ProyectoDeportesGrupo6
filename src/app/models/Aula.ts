export class Aula {
  constructor(
    public idCurso: number,
    public nombre: string,
    public fechaInicio: string,
    public fechaFin: string,
    public activo: boolean
  ) {}
}
