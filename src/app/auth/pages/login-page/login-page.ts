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
  router = inject(Router);

  authService = inject(AuthService);

  loginForm = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });
  onSubmit() {
    if (this.isPosting()) return;
    if (this.loginForm.invalid) {
      this.hasError.set(true);
      setTimeout(() => {
        this.hasError.set(false);
      }, 3000);
      return;
    }
    const { username = '', password = '' } = this.loginForm.value;

    this.isPosting.set(true);
    this.authService
      .login(username!, password!)
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
