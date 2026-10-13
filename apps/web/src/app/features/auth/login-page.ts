
import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../core/api-error';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NzAlertModule,
    NzButtonModule,
    NzInputModule,
  ],
  template: `
    <main class="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-9">
        <a routerLink="/auth/login" class="mb-8 flex items-center gap-3 no-underline">
          <span class="grid size-11 place-items-center rounded-xl bg-blue-800 text-xl font-extrabold text-white">P</span>
          <span>
            <strong class="block text-lg text-slate-900">Panadería</strong>
            <small class="block text-xs font-bold tracking-widest text-emerald-700">GESTIÓN</small>
          </span>
        </a>

        <p class="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-700">
          BIENVENIDO
        </p>

        <h1 class="text-2xl font-bold tracking-tight text-slate-900">
          Inicia sesión
        </h1>

        <p class="mt-2 mb-7 text-sm leading-6 text-slate-600">
          Accede al espacio de trabajo de tu panadería.
        </p>

        @if (errorMessage) {
          <nz-alert
            class="mb-5 block"
            nzType="error"
            nzShowIcon
            [nzMessage]="errorMessage"
          ></nz-alert>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5" novalidate>
          <div>
            <label for="email" class="mb-2 block text-sm font-semibold text-slate-700">
              Correo electrónico
            </label>

            <input
              nz-input
              id="email"
              type="email"
              formControlName="email"
              autocomplete="username"
              placeholder="nombre@ejemplo.com"
              class="w-full"
            />

            @if (form.controls.email.touched && form.controls.email.invalid) {
              <p class="mt-1 text-xs text-red-600">
                Introduce un correo electrónico válido.
              </p>
            }
          </div>

          <div>
            <label for="password" class="mb-2 block text-sm font-semibold text-slate-700">
              Contraseña
            </label>

            <input
              nz-input
              id="password"
              type="password"
              formControlName="password"
              autocomplete="current-password"
              placeholder="Tu contraseña"
              class="w-full"
            />

            @if (form.controls.password.touched && form.controls.password.invalid) {
              <p class="mt-1 text-xs text-red-600">
                Introduce tu contraseña.
              </p>
            }
          </div>

          <button
            nz-button
            nzType="primary"
            type="submit"
            class="w-full"
            [nzLoading]="submitting"
            [disabled]="submitting"
          >
            Iniciar sesión
          </button>
        </form>

        <p class="mt-7 text-center text-sm text-slate-600">
          ¿Todavía no tienes una cuenta?
          <a
            routerLink="/auth/register"
            class="font-semibold text-blue-800 hover:text-emerald-700"
          >
            Regístrate
          </a>
        </p>
      </section>
    </main>
  `,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.maxLength(128)]],
  });

  submitting = false;
  errorMessage: string | null = null;

  submit(): void {
    if (this.form.invalid || this.submitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = null;
    this.submitting = true;

    this.auth
      .login(this.form.getRawValue())
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: () => {
          const returnUrl = this.router.parseUrl(
            this.router.url,
          ).queryParams['returnUrl'];

          const safeUrl =
            typeof returnUrl === 'string' &&
            returnUrl.startsWith('/') &&
            !returnUrl.startsWith('//')
              ? returnUrl
              : '/';

          void this.router.navigateByUrl(safeUrl);
        },
        error: (error: unknown) => {
          this.errorMessage = apiErrorMessage(error);
        },
      });
  }
}
