import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { EventosComponent } from './components/eventos/eventos.component';
import { PerfilComponent } from './components/perfil/perfil.component';
import { AulasComponent } from './components/aulas/aulas.component';
import { MaterialesComponent } from './components/materiales/materiales.component';
import { EquiposComponent } from './components/equipos/equipos.component';
import { authGuard } from './auth/guards/auth.guard';
import { PanelOrganizadorComponent } from './components/panel-organizador/panel-organizador.component';
import { roleIdGuard } from './auth/guards/role-id.guard';

export const routes: Routes = [
  { path: 'auth', loadChildren: () => import('./auth/auth.routes') },
  {
    path: '',
    canActivateChild: [authGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent },
      { path: 'eventos', component: EventosComponent },
      { path: 'equipos', component: EquiposComponent },
      { path: 'perfil', component: PerfilComponent },
      {
        path: 'organizador',
        component: PanelOrganizadorComponent,
        canActivate: [roleIdGuard],
        data: { allowedRoleIds: [3, 4] },
      },
      { path: 'materiales', component: MaterialesComponent },
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
      { path: 'aulas', component: AulasComponent },
      { path: '**', redirectTo: 'home' },
    ],
  },
];
