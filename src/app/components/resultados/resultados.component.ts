import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import Swal from 'sweetalert2';
import { AuthService } from '../../auth/services/auth.service';
import { CapitanActividadesService } from '../../services/capitan-actividades/capitan-actividades.service';
import { EventosService } from '../../services/eventos/eventos.service';
import { EquiposService } from '../../services/equipos/equipos.service';
import { ResultadosService } from '../../services/resultados/resultados.service';
import { PartidoResultadoService } from '../../services/resultados/partido-resultado.service';
import { ResultadoVisual } from '../../models/Resultado';
import { ActividadesEvento } from '../../models/ActividadesEvento';
import { Equipo } from '../../models/Equipo';
import { Evento } from '../../models/Evento';

@Component({
  selector: 'app-resultados',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './resultados.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultadosComponent implements OnInit, OnDestroy {
  private readonly _resultadosService = inject(ResultadosService);
  private readonly _partidoResultadoService = inject(PartidoResultadoService);
  private readonly _authService = inject(AuthService);
  private readonly _capitanService = inject(CapitanActividadesService);
  private readonly _eventosService = inject(EventosService);
  private readonly _equiposService = inject(EquiposService);
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _subs = new Subscription();

  partidos = signal<ResultadoVisual[]>([]);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  // Gestión de capitán
  isCapitan = signal<boolean>(false);
  editing = signal<ResultadoVisual | null>(null);
  editPuntosLocal = signal<number>(0);
  editPuntosVisitante = signal<number>(0);
  isSaving = signal<boolean>(false);

  // Crear (capitán)
  creating = signal<boolean>(false);
  createEventoId = signal<number | null>(null);
  createEventosAll = signal<Evento[]>([]);
  createActividades = signal<ActividadesEvento[]>([]);
  createIdEventoActividad = signal<number | null>(null);
  createEquipos = signal<Equipo[]>([]);
  createIdEquipoLocal = signal<number | null>(null);
  createIdEquipoVisitante = signal<number | null>(null);
  createPuntosLocal = signal<number>(0);
  createPuntosVisitante = signal<number>(0);

  createEventosOptions = computed(() => {
    const eventos = this.createEventosAll() ?? [];
    return [...eventos].sort(
      (a, b) =>
        new Date(a.fechaEvento).getTime() - new Date(b.fechaEvento).getTime(),
    );
  });

  // Filters
  selectedEventoId = signal<number | null>(null);
  selectedActividadId = signal<number | null>(null);

  private readonly _partidosFiltrados = computed<ResultadoVisual[]>(() => {
    const idEvento = this.selectedEventoId();
    const idActividad = this.selectedActividadId();
    const all = this.partidos();
    return all.filter((p) => {
      if (idEvento != null && p.idEvento !== idEvento) return false;
      if (idActividad != null && p.idActividad !== idActividad) return false;
      return true;
    });
  });

  eventosDisponibles = computed(() => {
    const nombrePorEvento = new Map<number, string>();
    const fechaPorEvento = new Map<number, string>();

    this.partidos().forEach((p) => {
      if (!nombrePorEvento.has(p.idEvento)) {
        nombrePorEvento.set(p.idEvento, p.eventoNombre);
        fechaPorEvento.set(p.idEvento, p.eventoFecha);
      }
    });

    return Array.from(nombrePorEvento.entries())
      .map(([idEvento, eventoNombre]) => ({
        idEvento,
        eventoNombre,
        eventoFecha: fechaPorEvento.get(idEvento) ?? '',
      }))
      .sort((a, b) => {
        const da = a.eventoFecha
          ? new Date(a.eventoFecha).getTime()
          : Number.POSITIVE_INFINITY;
        const db = b.eventoFecha
          ? new Date(b.eventoFecha).getTime()
          : Number.POSITIVE_INFINITY;
        return da - db;
      });
  });

  selectedEventoLabel = computed<string>(() => {
    const idEvento = this.selectedEventoId();
    if (idEvento == null) return '';
    return (
      this.eventosDisponibles().find((e) => e.idEvento === idEvento)
        ?.eventoNombre ?? ''
    );
  });

  actividadesDisponibles = computed(() => {
    const idEvento = this.selectedEventoId();
    const map = new Map<number, string>();
    this.partidos().forEach((p) => {
      if (idEvento != null && p.idEvento !== idEvento) return;
      if (!map.has(p.idActividad)) map.set(p.idActividad, p.actividadNombre);
    });
    return Array.from(map.entries())
      .map(([idActividad, actividadNombre]) => ({
        idActividad,
        actividadNombre,
      }))
      .sort((a, b) => a.idActividad - b.idActividad);
  });

  selectedActividadLabel = computed<string>(() => {
    const idActividad = this.selectedActividadId();
    if (idActividad == null) return '';
    return (
      this.actividadesDisponibles().find((a) => a.idActividad === idActividad)
        ?.actividadNombre ?? ''
    );
  });

  gruposEventos = computed<
    {
      idEvento: number;
      eventoNombre: string;
      eventoFecha: string;
      partidos: ResultadoVisual[];
    }[]
  >(() => {
    const todos = this._partidosFiltrados();
    const map = new Map<
      number,
      {
        idEvento: number;
        eventoNombre: string;
        eventoFecha: string;
        partidos: ResultadoVisual[];
      }
    >();

    todos.forEach((p) => {
      const existing = map.get(p.idEvento);
      if (!existing) {
        map.set(p.idEvento, {
          idEvento: p.idEvento,
          eventoNombre: p.eventoNombre,
          eventoFecha: p.eventoFecha,
          partidos: [p],
        });
        return;
      }
      existing.partidos.push(p);
      // Keep the earliest known date if any inconsistent data arrives
      if (!existing.eventoFecha && p.eventoFecha)
        existing.eventoFecha = p.eventoFecha;
    });

    return Array.from(map.values()).sort((a, b) => {
      const da = a.eventoFecha
        ? new Date(a.eventoFecha).getTime()
        : Number.POSITIVE_INFINITY;
      const db = b.eventoFecha
        ? new Date(b.eventoFecha).getTime()
        : Number.POSITIVE_INFINITY;
      return da - db;
    });
  });
  totalPartidos = computed(() => this._partidosFiltrados().length);

  ngOnInit(): void {
    // React to /eventos/:idEvento/resultados navigation
    this._subs.add(
      this._route.paramMap.subscribe((pm) => {
        const raw = pm.get('idEvento');
        if (!raw) {
          this.selectedEventoId.set(null);
          return;
        }
        const parsed = Number(raw);
        const nextEventoId = Number.isFinite(parsed) ? parsed : null;
        this.selectedEventoId.set(nextEventoId);
        // When event is preset/changed, reset activity filter so it can't be invalid.
        this.selectedActividadId.set(null);
      }),
    );

    // Determinar si el usuario es capitán (el servidor sigue validando permisos).
    const userIdRaw = localStorage.getItem('userID');
    const userId = userIdRaw ? Number.parseInt(userIdRaw, 10) : NaN;
    if (Number.isFinite(userId) && userId > 0) {
      this._subs.add(
        this._capitanService.getCapitanByUsuario(userId).subscribe({
          next: (capitan) => this.isCapitan.set(!!capitan),
          error: () => this.isCapitan.set(false),
        }),
      );
    } else {
      this.isCapitan.set(false);
    }

    this.loadData();
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.error.set(null); // Limpiar error previo al iniciar nueva carga
    this._resultadosService.getInformacionCompleta().subscribe({
      next: (data) => {
        this.partidos.set(data);
        this.error.set(null); // Limpiar error en caso de éxito
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Error al sincronizar datos con la API deportiva.');
        this.isLoading.set(false);
      },
    });
  }

  canManageResultados(): boolean {
    return (
      this._authService.authStatus() === 'authenticated' && this.isCapitan()
    );
  }

  openCreate(): void {
    this.creating.set(true);
    this.error.set(null);
    this.isSaving.set(false);

    // Cargar TODOS los eventos para crear (no solo los que ya tienen resultados)
    this._eventosService.getEventos().subscribe({
      next: (eventos) => this.createEventosAll.set(eventos ?? []),
      error: () => {
        this.createEventosAll.set([]);
        this.error.set('No se pudieron cargar los eventos.');
      },
    });

    const presetEventoId = this.selectedEventoId();
    this.createEventoId.set(presetEventoId);
    this.createActividades.set([]);
    this.createIdEventoActividad.set(null);
    this.createEquipos.set([]);
    this.createIdEquipoLocal.set(null);
    this.createIdEquipoVisitante.set(null);
    this.createPuntosLocal.set(0);
    this.createPuntosVisitante.set(0);

    if (presetEventoId != null) {
      this.loadCreateActividades(presetEventoId);
    }
  }

  closeCreate(): void {
    this.creating.set(false);
    this.isSaving.set(false);
  }

  loadCreateActividades(idEvento: number): void {
    this.createActividades.set([]);
    this.createIdEventoActividad.set(null);
    this.createEquipos.set([]);
    this.createIdEquipoLocal.set(null);
    this.createIdEquipoVisitante.set(null);

    this._eventosService.getActividadesEvento(idEvento).subscribe({
      next: (acts) => this.createActividades.set(acts ?? []),
      error: () =>
        this.error.set('No se pudieron cargar las actividades del evento.'),
    });
  }

  onCreateEventoChange(raw: unknown): void {
    // `ngModelChange` puede emitir number | null
    const parsed =
      raw == null || raw === ''
        ? NaN
        : typeof raw === 'number'
          ? raw
          : Number(raw);
    const idEvento = Number.isFinite(parsed) && parsed > 0 ? parsed : null;

    this.createEventoId.set(idEvento);
    // Asegurar que solo se muestren actividades del evento seleccionado
    if (idEvento != null) {
      this.loadCreateActividades(idEvento);
    } else {
      this.createActividades.set([]);
      this.createIdEventoActividad.set(null);
      this.createEquipos.set([]);
      this.createIdEquipoLocal.set(null);
      this.createIdEquipoVisitante.set(null);
    }
  }

  onCreateIdEventoActividadChange(raw: unknown): void {
    const parsed =
      raw == null || raw === ''
        ? NaN
        : typeof raw === 'number'
          ? raw
          : Number(raw);
    const idEventoActividad =
      Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    this.createIdEventoActividad.set(idEventoActividad);
    this.createEquipos.set([]);
    this.createIdEquipoLocal.set(null);
    this.createIdEquipoVisitante.set(null);

    const idEvento = this.createEventoId();
    const act = this.createActividades().find(
      (a) => a.idEventoActividad === idEventoActividad,
    );
    if (
      idEvento != null &&
      act?.idActividad != null &&
      idEventoActividad != null
    ) {
      this._equiposService
        .getEquiposActividadEvento(act.idActividad, idEvento)
        .subscribe({
          next: (equipos) => this.createEquipos.set(equipos ?? []),
          error: () =>
            this.error.set(
              'No se pudieron cargar los equipos para esta actividad.',
            ),
        });
    }
  }

  submitCreate(): void {
    const idEventoActividad = this.createIdEventoActividad();
    const idEquipoLocal = this.createIdEquipoLocal();
    const idEquipoVisitante = this.createIdEquipoVisitante();
    if (!idEventoActividad || !idEquipoLocal || !idEquipoVisitante) {
      this.error.set('Selecciona actividad y ambos equipos.');
      return;
    }
    if (idEquipoLocal === idEquipoVisitante) {
      this.error.set('El equipo local y visitante no pueden ser el mismo.');
      return;
    }

    this.isSaving.set(true);
    this._partidoResultadoService
      .create({
        idPartidoResultado: 0,
        idEventoActividad,
        idEquipoLocal,
        idEquipoVisitante,
        puntosLocal: this.createPuntosLocal(),
        puntosVisitante: this.createPuntosVisitante(),
      })
      .subscribe({
        next: () => {
          this._resultadosService.invalidateCache();
          this.closeCreate();
          this.loadData();
        },
        error: () => {
          this.error.set(
            'No se pudo crear el resultado (requiere rol capitán).',
          );
          this.isSaving.set(false);
        },
      });
  }

  openEdit(partido: ResultadoVisual): void {
    this.editing.set(partido);
    this.editPuntosLocal.set(partido.puntosLocal);
    this.editPuntosVisitante.set(partido.puntosVisitante);
  }

  closeEdit(): void {
    this.editing.set(null);
    this.isSaving.set(false);
  }

  saveEdit(): void {
    const partido = this.editing();
    if (!partido) return;

    this.isSaving.set(true);
    this._partidoResultadoService
      .update({
        idPartidoResultado: partido.id,
        idEventoActividad: partido.idEventoActividad,
        idEquipoLocal: partido.idEquipoLocal,
        idEquipoVisitante: partido.idEquipoVisitante,
        puntosLocal: this.editPuntosLocal(),
        puntosVisitante: this.editPuntosVisitante(),
      })
      .subscribe({
        next: () => {
          this._resultadosService.invalidateCache();
          this.closeEdit();
          this.loadData();
        },
        error: () => {
          this.error.set(
            'No se pudo actualizar el resultado (requiere rol capitán).',
          );
          this.isSaving.set(false);
        },
      });
  }

  async deleteResultado(partido: ResultadoVisual): Promise<void> {
    const result = await Swal.fire({
      title: '¿Eliminar resultado?',
      html: `¿Eliminar el resultado #<strong>${partido.id}</strong>?`,
      icon: 'question',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      cancelButtonColor: '#595d60',
      confirmButtonText: 'Sí, eliminar',
      confirmButtonColor: '#d33',
    });
    if (!result.isConfirmed) return;
    this.isSaving.set(true);
    this._partidoResultadoService.delete(partido.id).subscribe({
      next: () => {
        this._resultadosService.invalidateCache();
        this.isSaving.set(false);
        this.loadData();
      },
      error: () => {
        this.error.set(
          'No se pudo eliminar el resultado (requiere rol capitán).',
        );
        this.isSaving.set(false);
      },
    });
  }

  onEventoChange(raw: string): void {
    if (!raw) {
      this.selectedEventoId.set(null);
      this.selectedActividadId.set(null);
      // If we came from /eventos/:idEvento/resultados, clear the param route
      // so it doesn't "lock" the page to that event from the URL.
      if (this._route.snapshot.paramMap.get('idEvento')) {
        void this._router.navigate(['/resultados']);
      }
      return;
    }
    const normalized = raw.trim();
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      this.selectedEventoId.set(parsed);
    } else {
      // Allow selecting by event label (typed into the searchable input).
      const match = this.eventosDisponibles().find(
        (e) => e.eventoNombre === normalized,
      );
      this.selectedEventoId.set(match?.idEvento ?? null);
    }
    this.selectedActividadId.set(null);
  }

  onActividadChange(raw: string): void {
    if (!raw) {
      this.selectedActividadId.set(null);
      return;
    }
    const normalized = raw.trim();
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      this.selectedActividadId.set(parsed);
    } else {
      const match = this.actividadesDisponibles().find(
        (a) => a.actividadNombre === normalized,
      );
      this.selectedActividadId.set(match?.idActividad ?? null);
    }
  }
}
