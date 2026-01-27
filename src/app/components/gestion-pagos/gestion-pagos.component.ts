import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PagoConCurso } from '../../models/PagoConCurso';
import { PagosService } from '../../services/pagos/pagos.service';
import { AulasService } from '../../services/aulas/aulas.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-gestion-pagos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gestion-pagos.component.html',
  styleUrl: './gestion-pagos.component.css',
})
export class GestionPagosComponent {
  public mostrarModalPagos = false;
  public pagos: PagoConCurso[] = [];
  public cargandoPagos = false;

  constructor(
    private _servicioPagos: PagosService,
    private _servicioAulas: AulasService,
  ) {}

  abrirModalPagos(): void {
    this.mostrarModalPagos = true;
    this.cargarPagos();
  }

  cerrarModalPagos(): void {
    this.mostrarModalPagos = false;
    this.pagos = [];
  }

  cargarPagos(): void {
    this.cargandoPagos = true;
    this.pagos = [];

    this._servicioAulas.getCursosActivos().subscribe({
      next: (cursos) => {
        if (!cursos?.length) {
          this.pagos = [];
          this.cargandoPagos = false;
          return;
        }
        const requests = cursos.map((c) =>
          this._servicioPagos.getPagosAndCursoByIdCurso(c.idCurso),
        );
        forkJoin(requests).subscribe({
          next: (arrays) => {
            this.pagos = arrays.flat();
            this.cargandoPagos = false;
          },
          error: () => {
            this.pagos = [];
            this.cargandoPagos = false;
          },
        });
      },
      error: () => {
        this.pagos = [];
        this.cargandoPagos = false;
      },
    });
  }

  getEstadoClass(estado: string): string {
    const e = (estado || '').toUpperCase();
    if (e === 'PAGADO') return 'bg-green-100 text-green-800';
    if (e === 'PENDIENTE') return 'bg-amber-100 text-amber-800';
    if (e === 'ANULADO' || e === 'CANCELADO') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  }
}
