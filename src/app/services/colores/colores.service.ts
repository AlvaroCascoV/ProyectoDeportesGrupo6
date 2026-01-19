import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { Color } from '../../models/Color';

@Injectable({
  providedIn: 'root',
})
export class ColoresService {
  private url = environment.urlApi;

  constructor(private _http: HttpClient) {}

  getColores(): Observable<Color[]> {
    return this._http.get<Color[]>(`${this.url}api/Colores`, {
      headers: this.getOptionalAuthHeaders(),
    });
  }

  private getOptionalAuthHeaders(): HttpHeaders | undefined {
    const token = localStorage.getItem('token');
    if (!token) return undefined;
    return new HttpHeaders({
      Authorization: `bearer ${token}`,
    });
  }
}

