import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MenuComponent } from './components/menu/menu.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: true,
  imports: [RouterModule, MenuComponent],
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'ProyectoDeportesGrupo6';
}
