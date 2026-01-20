export const UserRoles = {
  PROFESOR: 'PROFESOR',
  ALUMNO: 'ALUMNO',
  ADMINISTRADOR: 'ADMINISTRADOR',
  ORGANIZADOR: 'ORGANIZADOR',
  CAPITAN: 'CAPITAN',
} as const;

export type UserRole = (typeof UserRoles)[keyof typeof UserRoles];
