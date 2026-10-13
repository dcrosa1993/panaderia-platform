
import { Component, inject } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    NzButtonModule,
  ],
  template: `
    <div class="min-h-screen bg-slate-50 text-slate-800 md:grid md:grid-cols-[258px_minmax(0,1fr)]">
      <aside class="border-b border-slate-200 bg-white p-4 md:sticky md:top-0 md:flex md:h-screen md:flex-col md:overflow-y-auto md:border-b-0 md:border-r md:p-5">
        <a routerLink="/" class="flex items-center gap-3 px-1 py-2 no-underline">
          <span class="grid size-11 place-items-center rounded-xl bg-blue-800 text-xl font-extrabold text-white">P</span>
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
            <p class="mt-1 text-xs text-emerald-700">
              Rol: {{ business.role }}
            </p>
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

          <p class="hidden px-3 pb-2 pt-5 text-[10px] font-bold tracking-widest text-slate-400 md:block">
            OPERACIÓN
          </p>

          <div class="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-400">
            <span aria-hidden="true">◫</span>
            Estimaciones
            <span class="ml-auto rounded bg-slate-100 px-2 py-1 text-[10px]">
              Próximo
            </span>
          </div>

          <div class="hidden items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-400 md:flex">
            <span aria-hidden="true">▤</span>
            Recetas e ingredientes
          </div>

          <p class="hidden px-3 pb-2 pt-5 text-[10px] font-bold tracking-widest text-slate-400 md:block">
            ADMINISTRACIÓN
          </p>

          <div class="hidden items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-400 md:flex">
            <span aria-hidden="true">◎</span>
            Usuarios y negocios
          </div>
        </nav>

        <div class="mt-5 hidden border-t border-slate-200 pt-4 md:mt-auto md:block">
          <p class="text-xs font-semibold text-slate-700">
            Versión inicial
          </p>
          <p class="mt-1 text-xs text-slate-500">
            Construcción en curso
          </p>
        </div>
      </aside>

      <div class="flex min-w-0 flex-col">
        <header class="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3 sm:px-8">
          <div class="text-xs text-slate-500">
            Panadería <span class="mx-2 text-slate-300">/</span>
            <strong class="text-slate-800">Espacio de trabajo</strong>
          </div>

          <div class="flex items-center gap-3">
            <span class="hidden text-sm font-medium text-slate-700 sm:inline">
              {{ auth.user()?.fullName ?? 'Usuario' }}
            </span>

            <button
              nz-button
              nzType="default"
              type="button"
              (click)="logout()"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        <main class="w-full flex-1 p-5 sm:p-8">
          <router-outlet />
        </main>

        <footer class="flex flex-wrap justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 text-xs text-slate-500 sm:px-8">
          <span>Panadería Gestión</span>
          <span>Planificación · Costes · Producción</span>
        </footer>
      </div>
    </div>
  `,
})
export class MainLayout {
  readonly auth = inject(AuthService);

  private readonly router = inject(Router);

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/auth/login');
  }
}
