import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.token();
  const status = authService.authStatus();

  if (status === 'authenticated' && !!token) {
    return true;
  }

  return router.createUrlTree(['/auth/login']);
};
