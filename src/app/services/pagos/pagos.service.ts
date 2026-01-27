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

  // GET - Get all pagos
  // Endpoint: GET ${url}api/Pagos (replace with your base path)
  getPagos(): Observable<Pago[]> {
    return this._http.get<Pago[]>(`${this.url}api/Pagos`);
  }

  // GET - Get pago by id
  // Endpoint: GET ${url}api/Pagos/{id}
  getPagoById(id: number): Observable<Pago> {
    return this._http.get<Pago>(`${this.url}api/Pagos/${id}`);
  }

  // GET - Get pagos by idEvento
  // Endpoint: GET ${url}api/Pagos/evento/{idEvento} (replace path/params as needed)
  getPagosByIdEvento(idEvento: number): Observable<Pago[]> {
    return this._http.get<Pago[]>(
      `${this.url}api/Pagos/PagosEvento/${idEvento}`,
    );
  }

  // GET - Get pagos and curso by idCurso
  // Response: [{ id, idEvento, fechaEvento, idEventoActividad, idActividad, actividad, idPrecioActividad, precioTotal, idPago, cantidadPagada, idCurso, curso, estado }]
  getPagosAndCursoByIdCurso(idCurso: number): Observable<PagoConCurso[]> {
    return this._http.get<PagoConCurso[]>(
      `${this.url}api/Pagos/PagosCompletoCurso/${idCurso}`,
    );
  }

  // GET - Get only pagos by idCurso
  // Endpoint: GET ${url}api/Pagos/by-curso/{idCurso} (replace path as needed)
  getPagosByIdCurso(idCurso: number): Observable<Pago[]> {
    return this._http.get<Pago[]>(`${this.url}api/Pagos/PagosCurso/${idCurso}`);
  }

  // DELETE - Delete pago by id
  // Endpoint: DELETE ${url}api/Pagos/{id}
  deletePagoById(id: number): Observable<void> {
    return this._http.delete<void>(`${this.url}api/Pagos/${id}`);
  }

  // POST - Create pago by JSON body
  // Endpoint: POST ${url}api/Pagos (body: Pago)
  postPagoByJson(pago: Pago | object): Observable<Pago> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this._http.post<Pago>(`${this.url}api/Pagos`, pago, { headers });
  }

  // POST - Create pago by (idEventoActividad, idCurso, cantidad)
  // Endpoint: POST api/pagos/pagoeventoactividad/{idEventoActividad}/{idCurso}/{cantidad}
  postPago(
    idEventoActividad: number,
    idCurso: number,
    cantidad: number,
  ): Observable<Pago> {
    return this._http.post<Pago>(
      `${this.url}api/pagos/pagoeventoactividad/${idEventoActividad}/${idCurso}/${cantidad}`,
      {},
    );
  }

  // PUT - Update pago by JSON body
  // Endpoint: PUT api/Pagos
  // Body: { "idPago": number, "idCurso": number, "idPrecioActividad": number, "cantidad": number, "estado": string }
  putPagoByJson(pago: Pago | object): Observable<Pago> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this._http.put<Pago>(`${this.url}api/Pagos`, pago, { headers });
  }
}
