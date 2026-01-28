import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

import { PartidoResultado } from '../../models/Resultado';

@Injectable({ providedIn: 'root' })
export class PartidoResultadoService {
  private readonly _http = inject(HttpClient);
  private readonly _url = environment.urlApi;

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No hay token de autenticación.');
    }
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  create(body: PartidoResultado): Observable<PartidoResultado> {
    return this._http.post<PartidoResultado>(
      `${this._url}api/PartidoResultado/create`,
      body,
      { headers: this.authHeaders() },
    );
  }

  update(body: PartidoResultado): Observable<PartidoResultado> {
    return this._http.put<PartidoResultado>(
      `${this._url}api/PartidoResultado/update`,
      body,
      { headers: this.authHeaders() },
    );
  }

  delete(idPartidoResultado: number): Observable<void> {
    return this._http.delete<void>(`${this._url}api/PartidoResultado/${idPartidoResultado}`, {
      headers: this.authHeaders(),
    });
  }
}

