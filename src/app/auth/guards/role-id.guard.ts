import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * RoleId guard:
 * - Reads `allowedRoleIds` from route `data`
 * - Compares it with `AuthService.roleId()`
 *
 * Security note:
 * - This guard is intended to RESTRICT access.
 * - If `allowedRoleIds` is missing/empty, we fail closed (deny) to avoid
 *   accidental unrestricted access due to misconfiguration.
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
  const token = authService.token();
  if (authService.authStatus() !== 'authenticated' || !token) {
    return router.createUrlTree(['/auth/login']);
  }

  const allowedRoleIds =
    (route.data?.['allowedRoleIds'] as number[] | undefined) ?? [];
  if (allowedRoleIds.length === 0) {
    console.error(
      '[roleIdGuard] Misconfiguration: route data "allowedRoleIds" is missing/empty.'
    );
    return router.createUrlTree(['/home']);
  }

  const roleId = authService.roleId();
  if (roleId == null || roleId <= 0) {
    return router.createUrlTree(['/home']);
  }

  return allowedRoleIds.includes(roleId)
    ? true
    : router.createUrlTree(['/home']);
};
