import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { Evento } from '../../models/Evento';
import { ActividadesEvento } from '../../models/ActividadesEvento';
import { EventosService } from '../../services/eventos/eventos.service';
import { EquiposSelectorComponent } from '../equipos-selector/equipos-selector.component';
import { UserRoles } from '../../auth/constants/user-roles';

@Component({
  selector: 'app-equipos',
  standalone: true,
  imports: [CommonModule, FormsModule, EquiposSelectorComponent],
  templateUrl: './equipos.component.html',
  styleUrls: ['./equipos.component.css'],
})
export class EquiposComponent implements OnInit {
  public eventos: Evento[] = [];
  public idEvento: number = 0;

  public actividadesEvento: ActividadesEvento[] = [];
  public idEventoActividad: number = 0;
  public actividadSeleccionada: ActividadesEvento | null = null;

  public canCreateEquipos: boolean = false;

  private preselectIdEvento: number | null = null;
  private preselectIdEventoActividad: number | null = null;

  constructor(
    private _eventosService: EventosService,
    private _route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const role = (localStorage.getItem('role') ?? '').toUpperCase();
    this.canCreateEquipos =
      role === UserRoles.CAPITAN || role === UserRoles.ADMINISTRADOR;

    const qp = this._route.snapshot.queryParamMap;
    const idEventoQ = Number.parseInt(qp.get('idEvento') ?? '', 10);
    const idEventoActividadQ = Number.parseInt(
      qp.get('idEventoActividad') ?? '',
      10
    );
    this.preselectIdEvento =
      Number.isFinite(idEventoQ) && idEventoQ > 0 ? idEventoQ : null;
    this.preselectIdEventoActividad =
      Number.isFinite(idEventoActividadQ) && idEventoActividadQ > 0
        ? idEventoActividadQ
        : null;

    this._eventosService.getEventos().subscribe((eventos) => {
      this.eventos = (eventos ?? []).sort(
        (a, b) =>
          new Date(a.fechaEvento).getTime() - new Date(b.fechaEvento).getTime()
      );

      if (this.preselectIdEvento != null) {
        this.idEvento = this.preselectIdEvento;
        this.preselectIdEvento = null;
        this.onEventoChange(true);
      }
    });
  }

  onEventoChange(applyPreselect: boolean = false): void {
    const shouldApplyActividadPreselect =
      applyPreselect && this.preselectIdEventoActividad != null;

    this.actividadesEvento = [];
    this.idEventoActividad = 0;
    this.actividadSeleccionada = null;

    if (!this.idEvento || this.idEvento === 0) return;

    this._eventosService.getActividadesEvento(this.idEvento).subscribe({
      next: (actividades) => {
        this.actividadesEvento = actividades ?? [];

        if (shouldApplyActividadPreselect) {
          const target = this.preselectIdEventoActividad!;
          const exists = this.actividadesEvento.some(
            (a) => a.idEventoActividad === target
          );
          if (exists) {
            this.idEventoActividad = target;
            this.onActividadChange();
          }
          this.preselectIdEventoActividad = null;
        }
      },
      error: () => {
        this.actividadesEvento = [];
      },
    });
  }

  onActividadChange(): void {
    this.actividadSeleccionada =
      this.actividadesEvento.find(
        (a) => a.idEventoActividad === this.idEventoActividad
      ) ?? null;
  }

  formatearFecha(fecha: string): string {
    const fechaEvento = new Date(fecha);
    const dia = String(fechaEvento.getDate()).padStart(2, '0');
    const mes = String(fechaEvento.getMonth() + 1).padStart(2, '0');
    const anio = fechaEvento.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }
}
