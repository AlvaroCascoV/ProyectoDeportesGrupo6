import { HttpClient, HttpHeaders } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { AuthResponse } from '../interfaces/Auth-response';

type AuthStatus = 'authenticated' | 'not-authenticated' | 'checking';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _authStatus = signal<AuthStatus>('checking');
  private _role = signal<string | null>(null);
  private _roleId = signal<number | null>(null);
  private _token = signal<string | null>(null);

  private urlApi: string = environment.urlApi;
  private http = inject(HttpClient);

  constructor() {
    // Restaurar sesión si existe (refresh de página, etc.)
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const roleIdRaw = localStorage.getItem('idRole');

    const parsedRoleId =
      roleIdRaw == null || roleIdRaw.trim() === ''
        ? null
        : Number.parseInt(roleIdRaw, 10);
    const roleId =
      parsedRoleId != null && !Number.isNaN(parsedRoleId) && parsedRoleId > 0
        ? parsedRoleId
        : null;

    if (token && role) {
      this._token.set(token);
      this._role.set(role.toUpperCase());
      this._roleId.set(roleId);
      this._authStatus.set('authenticated');
    } else {
      this._token.set(null);
      this._role.set(null);
      this._roleId.set(null);
      this._authStatus.set('not-authenticated');
    }
  }

  authStatus = computed<AuthStatus>(() => {
    if (this._authStatus() === 'checking') return 'checking';

    if (this._role()) {
      return 'authenticated';
    }
    return 'not-authenticated';
  });

  role = computed<string | null>(() => this._role());
  roleId = computed<number | null>(() => this._roleId());
  token = computed<string | null>(() => this._token());

  login(username: string, password: string): Observable<boolean> {
    return this.http
      .post<AuthResponse>(`${this.urlApi}api/Auth/LoginEventos`, {
        username: username,
        password: password,
      })
      .pipe(
        tap((response) => {
          this._authStatus.set('authenticated');
          const roleUpper = (response.role ?? '').toUpperCase();
          this._role.set(roleUpper || null);
          this._roleId.set(
            response.idrole != null && response.idrole > 0
              ? response.idrole
              : null
          );
          this._token.set(response.response);
          localStorage.setItem('token', response.response);
          if (roleUpper) localStorage.setItem('role', roleUpper);
          // Avoid persisting stale roleId across sessions if API omits it
          if (response.idrole != null) {
            localStorage.setItem('idRole', response.idrole.toString());
          } else {
            localStorage.removeItem('idRole');
          }
        }),
        switchMap(() => {
          const token = this._token();
          if (!token) return of(true);

          const headers = new HttpHeaders({
            Authorization: `bearer ${token}`,
          });

          // Guardar userID para el resto de la app (inscripción, materiales, etc.)
          return this.http
            .get<{ idUsuario: number }>(
              `${this.urlApi}api/usuariosdeportes/perfil`,
              {
                headers,
              }
            )
            .pipe(
              tap((perfil) => {
                if (perfil?.idUsuario != null) {
                  localStorage.setItem('userID', String(perfil.idUsuario));
                }
              }),
              map(() => true),
              // Si el perfil falla, el login sigue siendo correcto (token ya guardado)
              catchError(() => of(true))
            );
        }),
        catchError((error: any) => {
          this._role.set(null);
          this._roleId.set(null);
          this._token.set(null);
          this._authStatus.set('not-authenticated');
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          localStorage.removeItem('idRole');
          localStorage.removeItem('userID');
          return of(false);
        })
      );
  }

  logout(): void {
    this._role.set(null);
    this._roleId.set(null);
    this._token.set(null);
    this._authStatus.set('not-authenticated');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('idRole');
    localStorage.removeItem('userID');
  }
}
