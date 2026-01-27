import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PagoConCurso } from '../../models/PagoConCurso';
import { PagosService } from '../../services/pagos/pagos.service';
import { AulasService } from '../../services/aulas/aulas.service';
import { EventosService } from '../../services/eventos/eventos.service';
import { PrecioActividadService } from '../../services/precio-actividad/precio-actividad.service';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { Evento } from '../../models/Evento';
import { ActividadesEvento } from '../../models/ActividadesEvento';
import { Aula } from '../../models/Aula';

@Component({
  selector: 'app-gestion-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-pagos.component.html',
  styleUrl: './gestion-pagos.component.css',
})
export class GestionPagosComponent {
  public mostrarModalPagos = false;
  public pagos: PagoConCurso[] = [];
  public cargandoPagos = false;

  public mostrarModalCrear = false;
  public mostrarModalEditar = false;
  public eventos: Evento[] = [];
  public cursos: Aula[] = [];
  public actividadesEvento: ActividadesEvento[] = [];
  public preciosActividad: {
    idEventoActividad: number;
    precioTotal: number;
  }[] = [];
  public crearForm = {
    idEvento: 0,
    idEventoActividad: 0,
    idCurso: 0,
    cantidad: 0,
  };
  public pagoEditando: PagoConCurso | null = null;
  public editarForm = { cantidad: 0, estado: '' };
  public guardando = false;
  public actualizandoEstado: Set<number> = new Set();

  constructor(
    private _servicioPagos: PagosService,
    private _servicioAulas: AulasService,
    private _servicioEventos: EventosService,
    private _servicioPrecioActividad: PrecioActividadService,
  ) {}

  abrirModalPagos(): void {
    this.mostrarModalPagos = true;
    this.cargarPagos();
  }

  cerrarModalPagos(): void {
    this.mostrarModalPagos = false;
    this.mostrarModalCrear = false;
    this.mostrarModalEditar = false;
    this.pagos = [];
  }

  cargarPagos(): void {
    this.cargandoPagos = true;
    // No vaciar pagos aquí: se mantiene la lista actual hasta que lleguen los nuevos datos,
    // evitando el parpadeo "No hay pagos para mostrar" durante un refresh (p. ej. tras crear uno).
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
            this.pagos = arrays.flat().sort((a, b) => a.idPago - b.idPago);
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

  abrirModalCrear(): void {
    this.mostrarModalCrear = true;
    this.crearForm = {
      idEvento: 0,
      idEventoActividad: 0,
      idCurso: 0,
      cantidad: 0,
    };
    this.actividadesEvento = [];
    this.preciosActividad = [];
    forkJoin({
      eventos: this._servicioEventos.getEventos(),
      cursos: this._servicioAulas.getCursosActivos(),
      precios: this._servicioPrecioActividad.getPreciosActividad(),
    }).subscribe({
      next: (r) => {
        this.eventos = r.eventos ?? [];
        this.cursos = r.cursos ?? [];
        const precios = r.precios ?? [];
        this.preciosActividad = precios.map((p) => ({
          idEventoActividad: p.idEventoActividad,
          precioTotal: p.precioTotal,
        }));
      },
      error: () => {
        this.eventos = [];
        this.cursos = [];
        this.preciosActividad = [];
      },
    });
  }

  cerrarModalCrear(): void {
    if (this.guardando) return;
    this.guardando = false;
    this.mostrarModalCrear = false;
  }

  onEventoChangeCrear(): void {
    this.crearForm.idEventoActividad = 0;
    this.crearForm.cantidad = 0;
    if (!this.crearForm.idEvento) {
      this.actividadesEvento = [];
      return;
    }
    this._servicioEventos
      .getActividadesEvento(this.crearForm.idEvento)
      .subscribe({
        next: (list) => {
          this.actividadesEvento = list ?? [];
        },
        error: () => {
          this.actividadesEvento = [];
        },
      });
  }

  onActividadChangeCrear(): void {
    const id = this.crearForm.idEventoActividad;
    if (!id) {
      this.crearForm.cantidad = 0;
      return;
    }
    const precio = this.preciosActividad.find(
      (p) => p.idEventoActividad === id,
    );
    this.crearForm.cantidad = precio ? precio.precioTotal : 0;
  }

  crearPago(): void {
    if (
      !this.crearForm.idEventoActividad ||
      !this.crearForm.idCurso ||
      this.crearForm.cantidad < 0
    ) {
      Swal.fire({
        title: 'Datos incompletos',
        text: 'Selecciona actividad, curso e indica una cantidad válida.',
        icon: 'warning',
        confirmButtonText: 'Aceptar',
      });
      return;
    }
    this.guardando = true;
    this._servicioPagos
      .postPago(
        this.crearForm.idEventoActividad,
        this.crearForm.idCurso,
        this.crearForm.cantidad,
      )
      .subscribe({
        next: () => {
          this.guardando = false;
          this.cerrarModalCrear();
          this.cargarPagos();
          Swal.fire({
            title: 'Pago creado',
            text: 'El pago se ha registrado correctamente.',
            icon: 'success',
            confirmButtonText: 'Aceptar',
          });
        },
        error: (err) => {
          this.guardando = false;
          Swal.fire({
            title: 'Error',
            text: err?.error?.message || 'No se pudo crear el pago.',
            icon: 'error',
            confirmButtonText: 'Aceptar',
          });
        },
      });
  }

  abrirModalEditar(pago: PagoConCurso): void {
    this.pagoEditando = pago;
    const estadoActual =
      (pago.estado || '').trim().toUpperCase() || 'PENDIENTE';
    const estadoValido =
      estadoActual === 'PAGADO' ? 'PAGADO' : 'PENDIENTE';
    this.editarForm = {
      cantidad: pago.cantidadPagada,
      estado: estadoValido,
    };
    this.mostrarModalEditar = true;
  }

  cerrarModalEditar(): void {
    if (this.guardando) return;
    this.guardando = false;
    this.mostrarModalEditar = false;
    this.pagoEditando = null;
  }

  guardarEdicion(): void {
    if (!this.pagoEditando) return;
    this.guardando = true;
    const body = {
      idPago: this.pagoEditando.idPago,
      idCurso: this.pagoEditando.idCurso,
      idPrecioActividad: this.pagoEditando.idPrecioActividad,
      cantidad: this.editarForm.cantidad,
      estado: this.editarForm.estado,
    };
    this._servicioPagos.putPagoByJson(body).subscribe({
      next: () => {
        this.guardando = false;
        this.pagoEditando!.cantidadPagada = this.editarForm.cantidad;
        this.pagoEditando!.estado = this.editarForm.estado;
        this.cerrarModalEditar();
        Swal.fire({
          title: 'Pago actualizado',
          text: 'Los datos del pago se han guardado correctamente.',
          icon: 'success',
          confirmButtonText: 'Aceptar',
        });
      },
      error: (err) => {
        this.guardando = false;
        Swal.fire({
          title: 'Error',
          text: err?.error?.message || 'No se pudo actualizar el pago.',
          icon: 'error',
          confirmButtonText: 'Aceptar',
        });
      },
    });
  }

  togglePagado(pago: PagoConCurso): void {
    const estado = (pago.estado || '').toUpperCase();
    const nuevoEstado = estado === 'PAGADO' ? 'PENDIENTE' : 'PAGADO';
    this.actualizandoEstado.add(pago.idPago);
    const body = {
      idPago: pago.idPago,
      idCurso: pago.idCurso,
      idPrecioActividad: pago.idPrecioActividad,
      cantidad: pago.cantidadPagada,
      estado: nuevoEstado,
    };
    this._servicioPagos.putPagoByJson(body).subscribe({
      next: () => {
        pago.estado = nuevoEstado;
        this.actualizandoEstado.delete(pago.idPago);
      },
      error: (err) => {
        this.actualizandoEstado.delete(pago.idPago);
        Swal.fire({
          title: 'Error',
          text: err?.error?.message || 'No se pudo cambiar el estado.',
          icon: 'error',
          confirmButtonText: 'Aceptar',
        });
      },
    });
  }

  estaActualizando(pago: PagoConCurso): boolean {
    return this.actualizandoEstado.has(pago.idPago);
  }

  eliminarPago(pago: PagoConCurso): void {
    Swal.fire({
      title: '¿Eliminar pago?',
      text: `Se eliminará el pago #${pago.idPago} (${pago.actividad} – ${pago.curso}).`,
      icon: 'warning',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Eliminar',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (result.isConfirmed) {
        this._servicioPagos.deletePagoById(pago.idPago).subscribe({
          next: () => {
            this.pagos = this.pagos.filter((p) => p.idPago !== pago.idPago);
            Swal.fire({
              title: 'Pago eliminado',
              text: 'El pago se ha eliminado correctamente.',
              icon: 'success',
              confirmButtonText: 'Aceptar',
            });
          },
          error: (err) => {
            Swal.fire({
              title: 'Error',
              text: err?.error?.message || 'No se pudo eliminar el pago.',
              icon: 'error',
              confirmButtonText: 'Aceptar',
            });
          },
        });
      }
    });
  }

  getEstadoClass(estado: string): string {
    const e = (estado || '').toUpperCase();
    if (e === 'PAGADO') return 'bg-green-100 text-green-800';
    if (e === 'PENDIENTE') return 'bg-amber-100 text-amber-800';
    return 'bg-gray-100 text-gray-800';
  }
}
