export const UserRoles = {
  PROFESOR: 'PROFESOR',
  ALUMNO: 'ALUMNO',
  ADMINISTRADOR: 'ADMINISTRADOR',
  ORGANIZADOR: 'ORGANIZADOR',
  CAPITAN: 'CAPITAN',
} as const;

export type UserRole = (typeof UserRoles)[keyof typeof UserRoles];


export const UserIdRoles = {
  PROFESOR: '1',
  ALUMNO: '2',
  ADMINISTRADOR: '3',
  ORGANIZADOR: '4',
  CAPITAN: '5',
} as const;

export type UserIdRoles = (typeof UserIdRoles)[keyof typeof UserIdRoles];
