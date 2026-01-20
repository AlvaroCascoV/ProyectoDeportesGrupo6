import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Evento } from '../../models/Evento';
import { ActividadesEvento } from '../../models/ActividadesEvento';
import { EventosService } from '../../services/eventos/eventos.service';
import { EquiposSelectorComponent } from '../equipos-selector/equipos-selector.component';

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

  constructor(private _eventosService: EventosService) {}

  ngOnInit(): void {
    this._eventosService.getEventos().subscribe((eventos) => {
      this.eventos = (eventos ?? []).sort(
        (a, b) =>
          new Date(a.fechaEvento).getTime() - new Date(b.fechaEvento).getTime()
      );
    });
  }

  onEventoChange(): void {
    this.actividadesEvento = [];
    this.idEventoActividad = 0;
    this.actividadSeleccionada = null;

    if (!this.idEvento || this.idEvento === 0) return;

    this._eventosService.getActividadesEvento(this.idEvento).subscribe({
      next: (actividades) => {
        this.actividadesEvento = actividades ?? [];
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
