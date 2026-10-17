import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="mx-auto w-full min-w-0 max-w-7xl space-y-5 sm:space-y-7">

      <!-- Bienvenida y acción principal -->
      <section
        class="overflow-hidden rounded-2xl bg-blue-950 text-white shadow-sm sm:rounded-3xl"
      >
        <div class="grid gap-5 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:p-9">
          <div class="min-w-0">
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">
              PANEL DE TRABAJO
            </p>

            <h1 class="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              @if (auth.user(); as user) {
                Hola, {{ user.fullName }}
              } @else {
                Bienvenido a Panadería Gestión
              }
            </h1>

            <p class="mt-2 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">
              Organiza tus ingredientes, controla tus recetas y calcula cuánto cuesta producir
              cada producto.
            </p>

            @if (auth.activeBusiness(); as business) {
              <div
                class="mt-4 inline-flex max-w-full items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2"
              >
                <span
                  class="size-2 shrink-0 rounded-full bg-emerald-400"
                  aria-hidden="true"
                ></span>

                <span class="text-xs text-blue-100">Negocio activo:</span>

                <span class="truncate text-sm font-semibold text-white">
                  {{ business.name }}
                </span>
              </div>
            } @else {
              <div class="mt-4 rounded-lg border border-amber-200/30 bg-amber-200/10 p-3">
                <p class="text-sm font-semibold text-amber-100">
                  Todavía no hay un negocio activo
                </p>
                <p class="mt-1 text-xs leading-5 text-blue-100">
                  Utiliza «Nuevo negocio» en la parte superior para comenzar.
                </p>
              </div>
            }
          </div>

          <div class="flex flex-col gap-2 lg:min-w-52">
            <a
              routerLink="/estimations"
              class="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-emerald-950 no-underline transition-colors hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span aria-hidden="true">＋</span>
              Nueva estimación
              <span aria-hidden="true">→</span>
            </a>

            <p class="text-center text-xs text-blue-200">
              Calcula los costes de producción
            </p>
          </div>
        </div>
      </section>

      <!-- Accesos rápidos -->
      <section aria-labelledby="quick-actions-title">
        <div class="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2
              id="quick-actions-title"
              class="text-lg font-bold text-slate-900 sm:text-xl"
            >
              Accesos rápidos
            </h2>
            <p class="mt-1 text-sm text-slate-500">
              Continúa con el trabajo de tu panadería.
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

          <!-- Estimaciones -->
          <a
            routerLink="/estimations"
            class="group flex min-w-0 items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4 no-underline transition-colors hover:border-blue-400 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:flex-col sm:gap-4 sm:p-5"
          >
            <span
              class="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-800 text-sm font-bold text-white"
              aria-hidden="true"
            >
              ES
            </span>

            <span class="min-w-0 flex-1">
              <span class="block font-semibold text-slate-900">Estimaciones</span>
              <span class="mt-1 block text-sm leading-5 text-slate-600">
                Calcula costes, cantidades y precios para un lote.
              </span>
            </span>

            <span
              class="ml-auto text-lg text-blue-800 transition-transform group-hover:translate-x-1 sm:ml-0"
              aria-hidden="true"
            >
              →
            </span>
          </a>

          <!-- Recetas -->
          <a
            routerLink="/recipes"
            class="group flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 no-underline transition-colors hover:border-emerald-300 hover:bg-emerald-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:flex-col sm:gap-4 sm:p-5"
          >
            <span
              class="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-sm font-bold text-emerald-800"
              aria-hidden="true"
            >
              RE
            </span>

            <span class="min-w-0 flex-1">
              <span class="block font-semibold text-slate-900">Recetas</span>
              <span class="mt-1 block text-sm leading-5 text-slate-600">
                Define fórmulas, porcentajes panaderos y versiones.
              </span>
            </span>

            <span
              class="ml-auto text-lg text-emerald-700 transition-transform group-hover:translate-x-1 sm:ml-0"
              aria-hidden="true"
            >
              →
            </span>
          </a>

          <!-- Ingredientes -->
          <a
            routerLink="/ingredients"
            class="group flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 no-underline transition-colors hover:border-amber-300 hover:bg-amber-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 sm:flex-col sm:gap-4 sm:p-5"
          >
            <span
              class="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-sm font-bold text-amber-800"
              aria-hidden="true"
            >
              IN
            </span>

            <span class="min-w-0 flex-1">
              <span class="block font-semibold text-slate-900">Ingredientes</span>
              <span class="mt-1 block text-sm leading-5 text-slate-600">
                Gestiona materias primas, unidades y precios.
              </span>
            </span>

            <span
              class="ml-auto text-lg text-amber-700 transition-transform group-hover:translate-x-1 sm:ml-0"
              aria-hidden="true"
            >
              →
            </span>
          </a>

          <!-- Productos -->
          <a
            routerLink="/products"
            class="group flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 no-underline transition-colors hover:border-violet-300 hover:bg-violet-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 sm:flex-col sm:gap-4 sm:p-5"
          >
            <span
              class="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-100 text-sm font-bold text-violet-800"
              aria-hidden="true"
            >
              PR
            </span>

            <span class="min-w-0 flex-1">
              <span class="block font-semibold text-slate-900">Productos</span>
              <span class="mt-1 block text-sm leading-5 text-slate-600">
                Organiza lo que fabrica tu panadería.
              </span>
            </span>

            <span
              class="ml-auto text-lg text-violet-700 transition-transform group-hover:translate-x-1 sm:ml-0"
              aria-hidden="true"
            >
              →
            </span>
          </a>
        </div>
      </section>

      <!-- Flujo de trabajo -->
      <section
        aria-labelledby="workflow-title"
        class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
      >
        <div>
          <h2 id="workflow-title" class="text-lg font-bold text-slate-900 sm:text-xl">
            Cómo empezar
          </h2>
          <p class="mt-1 text-sm leading-6 text-slate-500">
            Sigue este orden para preparar tus primeras estimaciones.
          </p>
        </div>

        <div class="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">

          <a
            routerLink="/ingredients"
            class="flex min-w-0 items-start gap-3 rounded-xl border border-slate-100 p-3 no-underline transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:p-4"
          >
            <span
              class="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-bold text-slate-700"
              aria-hidden="true"
            >
              1
            </span>

            <span class="min-w-0">
              <span class="block text-sm font-semibold text-slate-900">
                Registra los ingredientes
              </span>
              <span class="mt-1 block text-xs leading-5 text-slate-500">
                Añade las materias primas y sus precios de compra.
              </span>
              <span class="mt-2 inline-block text-xs font-semibold text-emerald-800">
                Ir a ingredientes →
              </span>
            </span>
          </a>

          <a
            routerLink="/products"
            class="flex min-w-0 items-start gap-3 rounded-xl border border-slate-100 p-3 no-underline transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:p-4"
          >
            <span
              class="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-bold text-slate-700"
              aria-hidden="true"
            >
              2
            </span>

            <span class="min-w-0">
              <span class="block text-sm font-semibold text-slate-900">
                Define productos y recetas
              </span>
              <span class="mt-1 block text-xs leading-5 text-slate-500">
                Establece fórmulas y unidades de producción.
              </span>
              <span class="mt-2 inline-block text-xs font-semibold text-emerald-800">
                Ir a productos →
              </span>
            </span>
          </a>

          <a
            routerLink="/estimations"
            class="flex min-w-0 items-start gap-3 rounded-xl border border-slate-100 p-3 no-underline transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:p-4"
          >
            <span
              class="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-bold text-slate-700"
              aria-hidden="true"
            >
              3
            </span>

            <span class="min-w-0">
              <span class="block text-sm font-semibold text-slate-900">
                Calcula una estimación
              </span>
              <span class="mt-1 block text-xs leading-5 text-slate-500">
                Calcula cantidades, costes y rentabilidad.
              </span>
              <span class="mt-2 inline-block text-xs font-semibold text-emerald-800">
                Ir a estimaciones →
              </span>
            </span>
          </a>
        </div>
      </section>

      <!-- Administración según los permisos reales -->
      @if (
        auth.activeBusiness()?.role === 'OWNER' ||
        auth.activeBusiness()?.role === 'ADMIN'
      ) {
        <a
          routerLink="/administration"
          class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 no-underline transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:p-5"
        >
          <span
            class="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700"
            aria-hidden="true"
          >
            AD
          </span>

          <span class="min-w-0 flex-1">
            <span class="block font-semibold text-slate-900">Miembros y accesos</span>
            <span class="mt-1 block text-sm leading-5 text-slate-500">
              Gestiona los permisos de las personas que trabajan en tu negocio.
            </span>
          </span>

          <span class="text-lg text-slate-500" aria-hidden="true">→</span>
        </a>
      }

      <!-- Ayuda contextual cuando falta seleccionar un negocio -->
      @if (!auth.activeBusinessId()) {
        <aside class="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 class="text-sm font-semibold text-amber-900">
            Primero, selecciona o crea un negocio
          </h2>
          <p class="mt-1 text-sm leading-5 text-amber-800">
            Utiliza el selector y el botón «Nuevo negocio» de la cabecera. Los ingredientes,
            productos, recetas y estimaciones pertenecen a un negocio concreto.
          </p>
        </aside>
      }

      <footer class="pb-2 text-center text-xs text-slate-400">
        Panadería Gestión · Planificación, costes y producción
      </footer>
    </main>
  `,
})
export class HomePage {
  readonly auth = inject(AuthService);
}
