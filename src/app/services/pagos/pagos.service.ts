import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { Pago } from '../../models/Pago';
import { PagoConCurso } from '../../models/PagoConCurso';

@Injectable({
  providedIn: 'root',
})
export class PagosService {
  private url = environment.urlApi;

  constructor(private _http: HttpClient) {}

  // Same header pattern as EventosService.insertEvento / insertarActividadesEvento
  private headerAuth(): HttpHeaders {
    return new HttpHeaders().set(
      'Authorization',
      `Bearer ${localStorage.getItem('token')}`,
    );
  }

  // Same header pattern as CapitanActividadesService.createCapitanActividad (Auth + Content-Type for JSON body)
  private headerAuthJson(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    });
  }

  // GET - Get all pagos
  getPagos(): Observable<Pago[]> {
    return this._http.get<Pago[]>(`${this.url}api/Pagos`);
  }

  // GET - Get pago by id
  getPagoById(id: number): Observable<Pago> {
    return this._http.get<Pago>(`${this.url}api/Pagos/${id}`);
  }

  // GET - Get pagos by idEvento
  getPagosByIdEvento(idEvento: number): Observable<Pago[]> {
    return this._http.get<Pago[]>(
      `${this.url}api/Pagos/PagosEvento/${idEvento}`,
    );
  }

  // GET - Get pagos and curso by idCurso
  getPagosAndCursoByIdCurso(idCurso: number): Observable<PagoConCurso[]> {
    return this._http.get<PagoConCurso[]>(
      `${this.url}api/Pagos/PagosCompletoCurso/${idCurso}`,
    );
  }

  // GET - Get only pagos by idCurso
  getPagosByIdCurso(idCurso: number): Observable<Pago[]> {
    return this._http.get<Pago[]>(`${this.url}api/Pagos/PagosCurso/${idCurso}`);
  }

  // DELETE - Delete pago by id (same pattern as EventosService.deleteEvento)
  deletePagoById(id: number): Observable<void> {
    const header = this.headerAuth();
    return this._http.delete<void>(`${this.url}api/Pagos/${id}`, {
      headers: header,
    });
  }

  // POST - Create pago by JSON body (same pattern as InscripcionesService.update / CapitanActividadesService create)
  postPagoByJson(pago: Pago | object): Observable<Pago> {
    const headers = this.headerAuthJson();
    return this._http.post<Pago>(`${this.url}api/Pagos`, pago, { headers });
  }

  // POST - Create pago by ids (same pattern as EventosService.insertarActividadesEvento: headerAuth + null body)
  postPago(
    idEventoActividad: number,
    idCurso: number,
    cantidad: number,
  ): Observable<Pago> {
    const header = this.headerAuth();
    const url = `${this.url}api/pagos/pagoeventoactividad/${idEventoActividad}/${idCurso}/${cantidad}`;
    return this._http.post<Pago>(url, null, { headers: header });
  }

  // PUT - Update pago by JSON body (same pattern as InscripcionesService.updateInscripcion)
  putPagoByJson(pago: Pago | object): Observable<Pago> {
    const headers = this.headerAuthJson();
    return this._http.put<Pago>(`${this.url}api/Pagos/update`, pago, {
      headers,
    });
  }
}
