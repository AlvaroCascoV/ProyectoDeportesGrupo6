import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * RoleId guard:
 * - Reads `allowedRoleIds` from route `data`
 * - Compares it with `localStorage.idRole`
 *
 * Usage example:
 * {
 *   path: 'organizador',
 *   component: PanelOrganizadorComponent,
 *   canActivate: [roleIdGuard],
 *   data: { allowedRoleIds: [3, 4] }
 * }
 */
export const roleIdGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Defensive: if user is not authenticated, redirect to login
  if (authService.authStatus() !== 'authenticated') {
    return router.createUrlTree(['/auth/login']);
  }

  const allowedRoleIds =
    (route.data?.['allowedRoleIds'] as number[] | undefined) ?? [];
  if (allowedRoleIds.length === 0) return true;

  const idRoleRaw = localStorage.getItem('idRole');
  const idRole = Number(idRoleRaw ?? '0');
  if (!Number.isFinite(idRole)) {
    return router.createUrlTree(['/home']);
  }

  return allowedRoleIds.includes(idRole)
    ? true
    : router.createUrlTree(['/home']);
};
