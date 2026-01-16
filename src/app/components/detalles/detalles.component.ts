import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Evento } from '../../models/Evento';
import { ActividadesEvento } from '../../models/ActividadesEvento';
import { InscripcionComponent } from '../inscripcion/inscripcion.component';

@Component({
  selector: 'app-detalles',
  standalone: true,
  imports: [CommonModule, InscripcionComponent],
  templateUrl: './detalles.component.html',
  styleUrl: './detalles.component.css',
})
export class DetallesComponent implements OnChanges {
  @Input() evento!: Evento;
  @Input() actividadesEvento: ActividadesEvento[] = [];
  @Input() cargandoActividades: boolean = false;
  @Input() profesorActual: { id: number; nombre: string } | null = null;
  @Input() cargandoProfesor: boolean = false;
  @Input() mostrar: boolean = false;
  @Input() esFechaProxima: boolean = false;
  @Input() mostrarFormularioInmediato: boolean = false;

  @Output() cerrar = new EventEmitter<void>();

  @ViewChild(InscripcionComponent) inscripcionComponent?: InscripcionComponent;

  public mostrarFormulario: boolean = true;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mostrar'] && changes['mostrar'].currentValue) {
      if (this.mostrarFormularioInmediato) {
        this.mostrarFormulario = false;
      } else {
        this.mostrarFormulario = true;
      }
    }
    if (changes['mostrar'] && !changes['mostrar'].currentValue) {
      this.mostrarFormulario = true;
    }
  }

  cerrarModal(): void {
    this.mostrarFormulario = true;
    this.cerrar.emit();
  }

  prevenirCierre(event: Event): void {
    event.stopPropagation();
  }

  mostrarForm(): void {
    this.mostrarFormulario = false;
  }

  submitInscripcion(): void {
    if (this.inscripcionComponent) {
      this.inscripcionComponent.inscribirUsuario();
    }
  }

  formatearFecha(fecha: string): string {
    const fechaEvento = new Date(fecha);
    const dia = String(fechaEvento.getDate()).padStart(2, '0');
    const mes = String(fechaEvento.getMonth() + 1).padStart(2, '0');
    const anio = fechaEvento.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }
}
