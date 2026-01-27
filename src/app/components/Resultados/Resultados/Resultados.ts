import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResultadosService } from '../../../services/resultados/Resultados.service';
import { ResultadoVisual } from '../../../models/Resultado';

@Component({
  selector: 'app-resultados',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './Resultados.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Resultados implements OnInit {
  private readonly _resultadosService = inject(ResultadosService);

  partidos = signal<ResultadoVisual[]>([]);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  partidosAgrupados = computed<Record<string, ResultadoVisual[]>>(() => {
    const todos = this.partidos();
    const grupos: Record<string, ResultadoVisual[]> = {};

    todos.forEach((p) => {
      if (!grupos[p.eventoNombre]) grupos[p.eventoNombre] = [];
      grupos[p.eventoNombre].push(p);
    });
    return grupos;
  });

  getEventosNombres = computed(() => Object.keys(this.partidosAgrupados()));
  totalPartidos = computed(() => this.partidos().length);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this._resultadosService.getInformacionCompleta().subscribe({
      next: (data) => {
        this.partidos.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Error al sincronizar datos con la API deportiva.');
        this.isLoading.set(false);
      },
    });
  }
}
