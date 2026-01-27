export class Pago {
  constructor(
    public idPago: number,
    public idCurso: number,
    public idPrecioActividad: number,
    public cantidad: number,
    public estado: string,
  ) {}
}
