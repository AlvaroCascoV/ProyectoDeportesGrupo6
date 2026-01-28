import { Component, computed, inject } from '@angular/core';
import { ResultadosService } from '../../services/resultados/resultados.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-ranking',
  imports: [],
  templateUrl: './Ranking.html',
})
export class Ranking {
  private readonly _resService = inject(ResultadosService);

  resultados = toSignal(this._resService.getInformacionCompleta(), {
    initialValue: [],
  });

  clasificacion = computed(() => {
    const mapaPuntos = new Map<string, number>();

    this.resultados().forEach((p) => {
      const puntosL = mapaPuntos.get(p.equipoLocal) || 0;
      mapaPuntos.set(p.equipoLocal, puntosL + p.puntosLocal);

      const puntosV = mapaPuntos.get(p.equipoVisitante) || 0;
      mapaPuntos.set(p.equipoVisitante, puntosV + p.puntosVisitante);
    });

    return Array.from(mapaPuntos.entries())
      .map(([nombre, puntos]) => ({ nombre, puntos }))
      .sort((a, b) => b.puntos - a.puntos);
  });
}
