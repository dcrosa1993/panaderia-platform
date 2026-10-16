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
  imports: [ReactiveFormsModule, RouterLink, NzAlertModule, NzButtonModule, NzInputModule],
  template: `
    <main
      class="flex min-h-dvh items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 px-4 py-6 sm:py-10"
    >
      <section
        class="my-auto w-full max-w-md min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/50 sm:p-8 md:p-9"
        aria-labelledby="login-title"
      >
        <!-- Identidad de la aplicación -->
        <a
          routerLink="/auth/login"
          aria-label="Panadería Gestión, inicio de sesión"
          class="mb-6 flex items-center gap-3 no-underline sm:mb-8"
        >
          <span
            class="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-800 text-xl font-extrabold text-white"
            aria-hidden="true"
          >
            P
          </span>

          <span>
            <strong class="block text-lg leading-tight text-slate-900"> Panadería </strong>
            <small class="mt-1 block text-xs font-bold tracking-widest text-emerald-700">
              GESTIÓN
            </small>
          </span>
        </a>
        <!-- Título -->
        <p class="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-700">Bienvenido</p>
        <h1 id="login-title" class="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Inicia sesión
        </h1>
        <p class="mb-6 mt-2 text-sm leading-6 text-slate-600 sm:mb-7">
          Accede al espacio de trabajo de tu panadería.
        </p>
        <!-- Error de autenticación -->
        @if (errorMessage) {
          <nz-alert
            class="mb-5 block"
            nzType="error"
            nzShowIcon
            [nzMessage]="errorMessage"
          ></nz-alert>
        }
        <!-- Formulario -->
        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4 sm:space-y-5" novalidate>
          <div class="min-w-0">
            <label for="email" class="mb-2 block text-sm font-semibold text-slate-700">
              Correo electrónico
            </label>
            <input
              nz-input
              id="email"
              type="email"
              formControlName="email"
              autocomplete="username"
              autocapitalize="none"
              spellcheck="false"
              inputmode="email"
              enterkeyhint="next"
              maxlength="254"
              placeholder="nombre@ejemplo.com"
              class="min-h-11 w-full"
            />
            @if (form.controls.email.touched && form.controls.email.invalid) {
              <p class="mt-2 text-xs leading-5 text-red-600">
                Introduce un correo electrónico válido.
              </p>
            }
          </div>
          <div class="min-w-0">
            <label for="password" class="mb-2 block text-sm font-semibold text-slate-700">
              Contraseña
            </label>
            <input
              nz-input
              id="password"
              type="password"
              formControlName="password"
              autocomplete="current-password"
              autocapitalize="off"
              enterkeyhint="go"
              maxlength="128"
              placeholder="Tu contraseña"
              class="min-h-11 w-full"
            />
            @if (form.controls.password.touched && form.controls.password.invalid) {
              <p class="mt-2 text-xs leading-5 text-red-600">Introduce tu contraseña.</p>
            }
          </div>
          <button
            nz-button
            nzType="primary"
            type="submit"
            class="!mt-6 min-h-11 w-full font-semibold sm:!mt-7"
            [nzLoading]="submitting"
            [disabled]="submitting"
          >
            Iniciar sesión
          </button>
        </form>
        <!-- Registro -->
        <div class="mt-6 border-t border-slate-100 pt-5 sm:mt-7 sm:pt-6">
          <p class="text-center text-sm leading-6 text-slate-600">
            ¿Todavía no tienes una cuenta?
            <a
              routerLink="/auth/register"
              class="ml-1 inline-block font-semibold text-blue-800 underline-offset-4 hover:text-emerald-700 hover:underline"
            >
              Regístrate
            </a>
          </p>
        </div>
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
          const returnUrl = this.router.parseUrl(this.router.url).queryParams['returnUrl'];

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
