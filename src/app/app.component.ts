import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MenuComponent } from './components/menu/menu.component';
import { FullCalendarModule } from '@fullcalendar/angular';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: true,
  imports: [RouterModule, MenuComponent, FullCalendarModule],
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'ProyectoDeportesGrupo6';
}
