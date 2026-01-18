import { Component, OnInit } from '@angular/core';
import { ActividadesEvento } from '../../models/ActividadesEvento';
import { MaterialesService } from '../../services/materiales/materiales.service';
import { EventosService } from '../../services/eventos/eventos.service';
import { Evento } from '../../models/Evento';
import { Material } from '../../models/Material';
import { forkJoin, mergeMap } from 'rxjs';

@Component({
  selector: 'app-materiales',
  standalone: false,
  templateUrl: './materiales.component.html',
  styleUrl: './materiales.component.css'
})
export class MaterialesComponent implements OnInit{
  public proximoEventoActividad : ActividadesEvento[] = []
  public materialesEvento: Material[] = []
  public materialesPorActividad: { [key: number]: Material[] } = {};
  constructor(private _servicioMateriales: MaterialesService, private _servicioEventos: EventosService){}

  ngOnInit(): void {
    this._servicioEventos.getProximoEvento().pipe(
      mergeMap((proximoEvento: Evento) => {
        return this._servicioEventos.getActividadesEvento(proximoEvento.idEvento);
      })
    ).subscribe({
      next: (actividades: ActividadesEvento[]) => {
        this.proximoEventoActividad = actividades;
        console.log("Actividades: ", actividades);
        
        if (actividades.length > 0) {
          const materialesRequests = actividades.map(actividad =>
            this._servicioMateriales.getMaterialesEventoActividad(actividad.idEventoActividad)
          );
          
          forkJoin(materialesRequests).subscribe({
            next: (resultados) => {
              this.materialesEvento = resultados.flat();
              this.materialesPorActividad = {};

              // Agrupa materiales por idEventoActividad
              this.materialesEvento.forEach((material) => {
                const id = material.idEventoActividad;
                if (!this.materialesPorActividad[id]) {
                  this.materialesPorActividad[id] = [];
                }
                this.materialesPorActividad[id].push(material);
              });

              console.log("Materiales agrupados: ", this.materialesPorActividad);
            },
            error: (error) => {
              console.error("Error al cargar materiales: ", error);
            }
          });
        }
      },
      error: (error) => {
        console.error("Error al cargar próximo evento: ", error);
      }
    });
  }
  formatearFecha(fecha: string): string {
    let fechaEvento = new Date(fecha);
    const dia = String(fechaEvento.getDate()).padStart(2, '0');
    const mes = String(fechaEvento.getMonth() + 1).padStart(2, '0');
    const anio = fechaEvento.getFullYear();
    const fechaFormateada = `${dia}/${mes}/${anio}`;
    return fechaFormateada;
  }

  obtenerMaterialesDeActividad(idActividad: number): Material[] {
    return this.materialesPorActividad[idActividad] ?? [];
  }

  aportarMaterial(
    idMaterial:number,
    idEventoActividad:number,
    nombreMaterial: string,
  ): void{
   //HACER EL RESTO DE LA FUNCION PARA EL BOTON DE APORTAR MATERIALES

  }
}
