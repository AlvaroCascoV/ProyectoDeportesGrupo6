import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MenuComponent } from './components/menu/menu.component';
import { FullCalendarModule } from '@fullcalendar/angular';
import { AuthService } from './auth/services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: true,
  imports: [RouterModule, MenuComponent, FullCalendarModule],
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'ProyectoDeportesGrupo6';
  authService = inject(AuthService);
}
