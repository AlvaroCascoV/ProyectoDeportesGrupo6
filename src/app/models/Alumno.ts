export class Alumno {
  constructor(
    public idUsuario: number,
    public nombre: string,
    public apellidos: string,
    public email: string,
    public estadoUsuario: true,
    public imagen: string,
    public idRole: number,
    public role: string,
    public idCurso: number,
    public curso: string,
    public idCursoUsuario: number
  ) {}
}
