import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EventosService } from '../../services/eventos/eventos.service';
import { InscripcionesService } from '../../services/inscripciones/inscripciones.service';
import { ActivatedRoute } from '@angular/router';
import { Actividad } from '../../models/Actividad';
import { ActividadesEvento } from '../../models/ActividadesEvento';
import Swal from 'sweetalert2';

interface ActividadOption { id: number; nombre: string }

@Component({
  selector: 'app-inscripcion',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './inscripcion.component.html',
  styleUrls: ['./inscripcion.component.css']
})
export class InscripcionComponent implements OnInit{
  public idEventoActividad!: number;
  public quieroSerCapitan: boolean = false;
  public actividadesEvento!: ActividadesEvento[];
  @Input() idEvento!: number;

  constructor(private _servicioEventos: EventosService, 
    private _servicioInscripciones: InscripcionesService,
    private _route: ActivatedRoute ){}
  
  ngOnInit(): void {
    console.log(this.idEvento)
    this._servicioEventos.getActividadesEvento(this.idEvento).subscribe(response => {
        this.actividadesEvento = response
      })    
  }

  inscribirUsuario(): void {
    let idUsuario = localStorage.getItem("userID");
    if(idUsuario!=null){
      let inscripcion = {
        "idInscripcion": 0,
        "idUsuario": parseInt(idUsuario),
        "idEventoActividad": this.idEventoActividad,
        "quiereSerCapitan": this.quieroSerCapitan,
        "fechaInscripcion": new Date()
      }
      this._servicioInscripciones.createInscripcion(inscripcion).subscribe({
        next: (response) => {
          console.log(response)
        },
        error: (error) => {
          if (error.status === 400) {
            Swal.fire({
              title: 'Error',
              text: 'Ya estás inscrito en este evento.',
              icon: 'error',
              confirmButtonText: 'Aceptar',
              confirmButtonColor: '#d33'
            });
          }
        }
      })
    }
    
  }

}
