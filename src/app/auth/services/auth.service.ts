import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { AuthResponse } from '../interfaces/Auth-response';

type AuthStatus = 'authenticated' | 'not-authenticated' | 'checking';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _authStatus = signal<AuthStatus>('checking');
  private _role = signal<string | null>(null);
  private _token = signal<string | null>(null);

  private urlApi: string = environment.urlApi;
  private http = inject(HttpClient);

  authStatus = computed<AuthStatus>(() => {
    if (this._authStatus() === 'checking') return 'checking';

    if (this._role()) {
      return 'authenticated';
    }
    return 'not-authenticated';
  });

  role = computed<string | null>(() => this._role());
  token = computed<string | null>(() => this._token());

  login(username: string, password: string):Observable<Boolean> {
    return this.http
      .post<AuthResponse>(`${this.urlApi}/api/Auth/LoginEventos`, {
        username: username,
        password: password,
      })
      .pipe(
        tap((response) => {
          this._authStatus.set('authenticated');
          this._role.set(response.role);
          this._token.set(response.response);
          localStorage.setItem('token', response.response);

        }),
        map(() => true),
        catchError((error: any) => {
            this._role.set(null);
            this._token.set(null);
            this._authStatus.set('not-authenticated');
            return of(false);
        })

      );
  }
}
