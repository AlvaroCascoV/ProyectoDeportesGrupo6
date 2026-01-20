import { Component, OnInit } from '@angular/core';
import { ActividadesEvento } from '../../models/ActividadesEvento';
import { MaterialesService } from '../../services/materiales/materiales.service';
import { EventosService } from '../../services/eventos/eventos.service';
import { Evento } from '../../models/Evento';
import { Material } from '../../models/Material';
import { forkJoin, mergeMap } from 'rxjs';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-materiales',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './materiales.component.html',
  styleUrl: './materiales.component.css'
})
export class MaterialesComponent implements OnInit{
  public proximoEvento: Evento | null = null;
  public proximoEventoActividad : ActividadesEvento[] = []
  public materialesEvento: Material[] = []
  public materialesPorActividad: { [key: number]: Material[] } = {};
  public materialNombre: string = "";
  public modalSolicitarMaterial: boolean = false;
  public idEventoActividadModal!:number;
  constructor(private _servicioMateriales: MaterialesService, private _servicioEventos: EventosService){}

  ngOnInit(): void {
    this._servicioEventos.getProximoEvento().subscribe({
      next: (proximoEvento) => {
        this.proximoEvento = proximoEvento ?? null;

        if (!proximoEvento) {
          console.warn('No hay próximo evento disponible');
          return;
        }

        this._servicioEventos.getActividadesEvento(proximoEvento.idEvento).subscribe({
          next: (actividades: ActividadesEvento[]) => {
            this.proximoEventoActividad = actividades;
            console.log('Actividades: ', actividades);

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

                  console.log('Materiales agrupados: ', this.materialesPorActividad);
                },
                error: (error) => {
                  console.error('Error al cargar materiales: ', error);
                }
              });
            } else {
              console.warn('El próximo evento no tiene actividades');
            }
          },
          error: (error) => {
            console.error('Error al cargar actividades del evento: ', error);
          }
        });
      },
      error: (error) => {
        console.error('Error al cargar próximo evento: ', error);
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

  solicitarMaterial(idEventoActividad:number): void{
    let material = new Material
    (
      0, 
      idEventoActividad, 
      parseInt(localStorage.getItem("userID") || "0"),
      this.materialNombre,
      true,
      new Date().toISOString()
    )
    console.log("EventoActividad: "+idEventoActividad)
    console.log("Material: "+JSON.stringify(material))
    this._servicioMateriales.solicitarMaterial(material).subscribe({
      next: (response) => {
        console.log(response)
        Swal.fire({
          title: '¡Material solicitado!',
          text: 'Tu solicitud de material ha sido registrada correctamente.',
          icon: 'success',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#1976d2'
        });
        this._servicioMateriales.getMaterialesEventoActividad(idEventoActividad).subscribe({
          next: (materiales) => {
            this.materialesPorActividad[idEventoActividad] = materiales;
          },
          error: (error) => {
            console.error("Error al actualizar materiales: ", error);
          }
        });
        
        this.cerrarModalSolicitar();
        this.materialNombre = '';
      },
      error: (error) => {
        console.error(error)
        if (error.status === 400) {
          Swal.fire({
            title: 'Error en la solicitud',
            text: 'No se pudo procesar tu solicitud. Verifica los datos ingresados.',
            icon: 'error',
            confirmButtonText: 'Aceptar',
            confirmButtonColor: '#d32f2f'
          });
        } else {
          Swal.fire({
            title: 'Error',
            text: 'Ha ocurrido un error inesperado. Por favor, intenta nuevamente.',
            icon: 'error',
            confirmButtonText: 'Aceptar',
            confirmButtonColor: '#d32f2f'
          });
        }
      }
    })
  }

  abrirModalSolicitar(idEventoActividad: number){
    this.modalSolicitarMaterial = true;
    this.idEventoActividadModal = idEventoActividad;
  }
  cerrarModalSolicitar(){
    this.modalSolicitarMaterial = false;
  }

  aportarMaterial(
    idMaterial:number,
    idEventoActividad:number,
    nombreMaterial: string,
  ): void{
   //HACER EL RESTO DE LA FUNCION PARA EL BOTON DE APORTAR MATERIALES

  }
}
