import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { EventosComponent } from './components/eventos/eventos.component';
import { PerfilComponent } from './components/perfil/perfil.component';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'eventos', component: EventosComponent },
  { path: 'perfil', component: PerfilComponent },
  {
    path: 'eventos/:idEvento/resultados',
    redirectTo: '/eventos',
    // TODO: Create ResultadosComponent and replace redirectTo with component
  },
  {
    path: 'eventos/crear',
    redirectTo: '/eventos',
    // TODO: Create CrearEventoComponent and replace redirectTo with component
  },
  { path: '**', redirectTo: '/home' },
];
