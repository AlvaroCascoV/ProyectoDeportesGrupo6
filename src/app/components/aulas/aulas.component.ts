import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AulasService } from '../../services/aulas/aulas.service';
import { Aula } from '../../models/Aula';
import { AlumnoCurso } from '../../models/AlumnoCurso';

/**
 * Componente para gestionar y mostrar la lista de aulas (cursos activos).
 * Permite ver los detalles de cada curso y los alumnos inscritos.
 */
@Component({
  selector: 'app-aulas',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './aulas.component.html',
  styleUrl: './aulas.component.css',
})
export class AulasComponent implements OnInit {
  public cursos: Aula[] = [];
  public cargandoCursos = false;
  public alumnosPorCurso: AlumnoCurso[] = [];
  public cargandoAlumnos = false;
  public mostrarModalDetalles = false;
  public cursoSeleccionado!: Aula;

  constructor(private _servicioAulas: AulasService) {}

  /**
   * Carga automáticamente la lista de cursos activos desde la API.
   */
  ngOnInit(): void {
    this.cargandoCursos = true;
    this._servicioAulas.getCursosActivos().subscribe({
      next: (response) => {
        this.cursos = response;
        this.cargandoCursos = false;
      },
      error: () => {
        this.cargandoCursos = false;
      },
    });
  }

  /**
   * Obtiene la lista de alumnos inscritos en un curso específico por su id.
   */
  getAlumnosPorCurso(idCurso: number): void {
    this.cargandoAlumnos = true;
    this._servicioAulas.getAlumnosPorCurso(idCurso).subscribe({
      next: (response) => {
        this.alumnosPorCurso = response;
        this.cargandoAlumnos = false;
      },
      error: () => {
        this.cargandoAlumnos = false;
      },
    });
  }

  /**
   * Abre el modal de detalles del curso seleccionado.
   * Limpia la lista de alumnos anterior y carga los nuevos datos.
   */
  abrirModalDetalles(curso: Aula): void {
    this.cursoSeleccionado = curso;
    this.alumnosPorCurso = [];
    this.getAlumnosPorCurso(curso.idCurso);
    this.mostrarModalDetalles = true;
  }

  /**
   * Cierra el modal de detalles y limpia los datos relacionados.
   * Resetea los flags y la lista de alumnos para el próximo uso.
   */
  cerrarModalDetalles(): void {
    this.mostrarModalDetalles = false;
    this.cargandoAlumnos = false;
    this.alumnosPorCurso = [];
  }
}
