import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { AuthService } from '../../core/auth/auth.service';

import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { apiErrorMessage } from '../../core/api-error';
import { BusinessesService } from '../../core/businesses/businesses.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    NzButtonModule,
    FormsModule,
    ReactiveFormsModule,
    NzAlertModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
  ],
  template: `
    <div class="min-h-screen bg-slate-50 text-slate-800 md:grid md:grid-cols-[258px_minmax(0,1fr)]">
      <aside
        class="border-b border-slate-200 bg-white p-4 md:sticky md:top-0 md:flex md:h-screen md:flex-col md:overflow-y-auto md:border-b-0 md:border-r md:p-5"
      >
        <a routerLink="/" class="flex items-center gap-3 px-1 py-2 no-underline">
          <span
            class="grid size-11 place-items-center rounded-xl bg-blue-800 text-xl font-extrabold text-white"
            >P</span
          >
          <span>
            <strong class="block text-base text-slate-900">Panadería</strong>
            <small class="block text-xs font-bold tracking-widest text-emerald-700">GESTIÓN</small>
          </span>
        </a>

        <section class="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            NEGOCIO ACTIVO
          </p>

          <p class="mt-2 truncate text-sm font-semibold text-slate-900">
            {{ auth.activeBusiness()?.name ?? 'Sin negocio seleccionado' }}
          </p>

          @if (auth.activeBusiness(); as business) {
            <p class="mt-1 text-xs text-emerald-700">Rol: {{ business.role }}</p>
          }
        </section>

        <nav aria-label="Navegación principal" class="mt-6 flex flex-wrap gap-1 md:flex-col">
          <p class="hidden px-3 pb-2 text-[10px] font-bold tracking-widest text-slate-400 md:block">
            GENERAL
          </p>

          <a
            routerLink="/"
            routerLinkActive="bg-blue-50 font-semibold text-blue-800"
            [routerLinkActiveOptions]="{ exact: true }"
            class="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-600 no-underline transition-colors hover:bg-slate-100"
          >
            <span aria-hidden="true">⌂</span>
            Inicio
          </a>

          <p
            class="hidden px-3 pb-2 pt-5 text-[10px] font-bold tracking-widest text-slate-400 md:block"
          >
            OPERACIÓN
          </p>

          <div class="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-400">
            <span aria-hidden="true">◫</span>
            Estimaciones
            <span class="ml-auto rounded bg-slate-100 px-2 py-1 text-[10px]"> Próximo </span>
          </div>

          <a
            routerLink="/ingredients"
            routerLinkActive="bg-blue-50 font-semibold text-blue-800"
            class="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-600 no-underline transition-colors hover:bg-slate-100"
          >
            <span aria-hidden="true">▤</span>
            Ingredientes
          </a>

          <a
            routerLink="/products"
            routerLinkActive="bg-blue-50 font-semibold text-blue-800"
            class="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-600 no-underline transition-colors hover:bg-slate-100"
          >
            <span aria-hidden="true">▣</span>
            Productos
          </a>

          <a
            routerLink="/recipes"
            routerLinkActive="bg-blue-50 font-semibold text-blue-800"
            class="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-600 no-underline transition-colors hover:bg-slate-100"
          >
            <span aria-hidden="true">▤</span>
            Recetas
          </a>
          <a
            routerLink="/estimations"
            routerLinkActive="bg-blue-50 font-semibold text-blue-800"
            class="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-600 no-underline transition-colors hover:bg-slate-100"
          >
            <span aria-hidden="true">◉</span>
            Estimaciones
          </a>

          <p
            class="hidden px-3 pb-2 pt-5 text-[10px] font-bold tracking-widest text-slate-400 md:block"
          >
            ADMINISTRACIÓN
          </p>

          @if (auth.activeBusiness()?.role === 'OWNER' || auth.activeBusiness()?.role === 'ADMIN') {
            <a
              routerLink="/administration"
              routerLinkActive="bg-blue-50 font-semibold text-blue-800"
              class="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-600 no-underline transition-colors hover:bg-slate-100"
            >
              <span aria-hidden="true">♙</span>
              Miembros y accesos
            </a>
          }
        </nav>

        <div class="mt-5 hidden border-t border-slate-200 pt-4 md:mt-auto md:block">
          <p class="text-xs font-semibold text-slate-700">Versión inicial</p>
          <p class="mt-1 text-xs text-slate-500">Construcción en curso</p>
        </div>
      </aside>

      <div class="flex min-w-0 flex-col">
        <header
          class="flex min-h-16 flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3 sm:px-8"
        >
          <div class="flex min-w-0 flex-wrap items-center gap-3">
            <label for="activeBusiness" class="text-xs font-semibold text-slate-600">
              Negocio activo
            </label>

            <nz-select
              id="activeBusiness"
              class="w-56"
              [ngModel]="auth.activeBusinessId()"
              (ngModelChange)="changeBusiness($event)"
              [nzDisabled]="auth.businesses().length === 0"
              nzPlaceHolder="Selecciona un negocio"
            >
              @for (business of auth.businesses(); track business.id) {
                <nz-option [nzValue]="business.id" [nzLabel]="business.name" />
              }
            </nz-select>

            <button nz-button nzType="default" type="button" (click)="openCreateBusiness()">
              Nuevo negocio
            </button>
          </div>

          <div class="flex items-center gap-3">
            <span class="hidden text-sm font-medium text-slate-700 sm:inline">
              {{ auth.user()?.fullName ?? 'Usuario' }}
            </span>

            <button nz-button nzType="default" type="button" (click)="logout()">
              Cerrar sesión
            </button>
          </div>
        </header>

        <main class="w-full flex-1 p-5 sm:p-8">
          <router-outlet />
        </main>

        <footer
          class="flex flex-wrap justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 text-xs text-slate-500 sm:px-8"
        >
          <span>Panadería Gestión</span>
          <span>Planificación · Costes · Producción</span>
        </footer>
      </div>

      <nz-modal
        [(nzVisible)]="createBusinessVisible"
        nzTitle="Crear un negocio"
        [nzFooter]="null"
        [nzMaskClosable]="false"
        [nzClosable]="!creatingBusiness"
        (nzOnCancel)="cancelCreateBusiness()"
      >
        <ng-container *nzModalContent>
          <p class="mb-5 text-sm leading-6 text-slate-600">
            Cada negocio tendrá sus propios datos y permisos de acceso. El negocio creado quedará
            seleccionado automáticamente.
          </p>

          @if (businessError) {
            <nz-alert class="mb-4 block" nzType="error" nzShowIcon [nzMessage]="businessError" />
          }

          <form
            [formGroup]="businessForm"
            (ngSubmit)="submitNewBusiness()"
            class="space-y-5"
            novalidate
          >
            <div>
              <label for="newBusinessName" class="mb-2 block text-sm font-semibold text-slate-700">
                Nombre del negocio
              </label>

              <input
                nz-input
                id="newBusinessName"
                formControlName="name"
                maxlength="160"
                placeholder="Ej. Panadería La Espiga"
                class="w-full"
              />

              @if (businessForm.controls.name.touched && businessForm.controls.name.invalid) {
                <p class="mt-1 text-xs text-red-600">
                  Introduce un nombre de entre 2 y 160 caracteres.
                </p>
              }
            </div>

            <div class="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                nz-button
                nzType="default"
                type="button"
                [disabled]="creatingBusiness"
                (click)="cancelCreateBusiness()"
              >
                Cancelar
              </button>

              <button
                nz-button
                nzType="primary"
                type="submit"
                [nzLoading]="creatingBusiness"
                [disabled]="businessForm.invalid || creatingBusiness"
              >
                Crear negocio
              </button>
            </div>
          </form>
        </ng-container>
      </nz-modal>
    </div>
  `,
})
export class MainLayout {
  readonly auth = inject(AuthService);

  private readonly router = inject(Router);

  private readonly fb = inject(FormBuilder);
  private readonly businessesService = inject(BusinessesService);
  private readonly message = inject(NzMessageService);

  createBusinessVisible = false;
  creatingBusiness = false;
  businessError: string | null = null;

  readonly businessForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(160)]],
  });

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/auth/login');
  }

  openCreateBusiness(): void {
    this.businessError = null;
    this.businessForm.reset({ name: '' });
    this.createBusinessVisible = true;
  }

  cancelCreateBusiness(): void {
    if (this.creatingBusiness) {
      return;
    }

    this.createBusinessVisible = false;
    this.businessError = null;
    this.businessForm.reset({ name: '' });
  }

  changeBusiness(businessId: string): void {
    const changed = this.auth.selectBusiness(businessId);

    if (!changed) {
      this.message.error('No tienes acceso al negocio seleccionado.');
    }
  }

  submitNewBusiness(): void {
    if (this.businessForm.invalid || this.creatingBusiness) {
      this.businessForm.markAllAsTouched();
      return;
    }

    const name = this.businessForm.getRawValue().name.trim();

    if (name.length < 2) {
      this.businessForm.controls.name.setValue(name);
      this.businessForm.controls.name.markAsTouched();
      this.businessError = 'El nombre debe tener al menos 2 caracteres.';
      return;
    }

    this.businessError = null;
    this.creatingBusiness = true;

    this.businessesService
      .create(name)
      .pipe(
        finalize(() => {
          this.creatingBusiness = false;
        }),
      )
      .subscribe({
        next: (business) => {
          this.createBusinessVisible = false;
          this.businessForm.reset({ name: '' });
          this.message.success(`"${business.name}" se creó correctamente y ahora está activo.`);
        },
        error: (error: unknown) => {
          this.businessError = apiErrorMessage(error);
        },
      });
  }
}
