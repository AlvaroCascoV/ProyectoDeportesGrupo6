import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login-page.html',
})
export class LoginPage {
  fb = inject(FormBuilder);
  hasError = signal(false);
  isPosting = signal(false);
  passwordVisible = signal(false);
  router = inject(Router);

  togglePasswordVisibility(): void {
    this.passwordVisible.update((v) => !v);
  }

  authService = inject(AuthService);

  loginForm = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });
  onSubmit() {
    if (this.isPosting()) return;
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.hasError.set(true);
      setTimeout(() => {
        this.hasError.set(false);
      }, 3000);
      return;
    }
    const { username = '', password = '' } = this.loginForm.value;
    const usernameValue = (username ?? '').trim();
    const loginUsername = usernameValue.includes('@')
      ? usernameValue
      : `${usernameValue}@tajamar365.com`;

    this.isPosting.set(true);
    this.authService
      .login(loginUsername, password!)
      .subscribe((isAuthenticated) => {
        this.isPosting.set(false);
        if (isAuthenticated) {
          this.router.navigateByUrl('/home');
          return;
        }
        this.hasError.set(true);
        setTimeout(() => {
          this.hasError.set(false);
        }, 3000);
      });
  }
}
