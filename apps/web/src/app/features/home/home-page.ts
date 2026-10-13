import { Component } from '@angular/core';
import { NzTagModule } from 'ng-zorro-antd/tag';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [NzTagModule],
  template: `
    <main class="mx-auto w-full max-w-7xl">
      <header class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p class="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            PLATAFORMA DE GESTIÓN
          </p>

          <h1 class="max-w-3xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Una mejor forma de planificar tu panadería.
          </h1>

          <p class="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Estamos preparando una herramienta para calcular, planificar y comprender los costes de
            producción, con datos claros y decisiones mejor fundamentadas.
          </p>
        </div>

        <nz-tag nzColor="green">Proyecto iniciado</nz-tag>
      </header>

      <section aria-label="Áreas principales" class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article class="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <div class="mb-5 flex items-center justify-between">
            <span
              class="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-lg font-bold text-blue-800"
              aria-hidden="true"
            >
              01
            </span>

            <nz-tag nzColor="blue">Prioridad</nz-tag>
          </div>

          <h2 class="text-lg font-semibold text-slate-900">Estimaciones</h2>

          <p class="mt-2 text-sm leading-6 text-slate-600">
            Simular lotes de producción, calcular ingredientes, comparar costes y evaluar precios
            antes de fabricar.
          </p>
        </article>

        <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="mb-5 flex items-center justify-between">
            <span
              class="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-lg font-bold text-emerald-800"
              aria-hidden="true"
            >
              02
            </span>

            <nz-tag>Planificado</nz-tag>
          </div>

          <h2 class="text-lg font-semibold text-slate-900">Recetas e ingredientes</h2>

          <p class="mt-2 text-sm leading-6 text-slate-600">
            Organizar fórmulas, unidades de medida, rendimientos y precios de las materias primas.
          </p>
        </article>

        <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="mb-5 flex items-center justify-between">
            <span
              class="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-700"
              aria-hidden="true"
            >
              03
            </span>

            <nz-tag>Fundamentos</nz-tag>
          </div>

          <h2 class="text-lg font-semibold text-slate-900">Negocios independientes</h2>

          <p class="mt-2 text-sm leading-6 text-slate-600">
            Mantener los datos de cada panadería separados, con acceso controlado para sus usuarios.
          </p>
        </article>
      </section>

      <section class="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <article class="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <p class="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
            PRIMER HITO
          </p>

          <h2 class="text-xl font-bold text-slate-900">Autenticación y registro de negocios</h2>

          <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Antes de construir el módulo de estimaciones, implementaremos una base segura para
            registrar usuarios, crear negocios y garantizar que cada negocio acceda únicamente a sus
            propios datos.
          </p>

          <ol class="mt-6 space-y-4">
            <li class="flex items-start gap-3">
              <span
                class="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800"
              >
                1
              </span>

              <div>
                <p class="font-semibold text-slate-800">Registro e inicio de sesión</p>
                <p class="mt-1 text-sm text-slate-500">
                  Identidad y acceso seguro a la aplicación.
                </p>
              </div>
            </li>

            <li class="flex items-start gap-3">
              <span
                class="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800"
              >
                2
              </span>

              <div>
                <p class="font-semibold text-slate-800">Creación del negocio</p>
                <p class="mt-1 text-sm text-slate-500">
                  Registrar una panadería y asociar a su propietario.
                </p>
              </div>
            </li>

            <li class="flex items-start gap-3">
              <span
                class="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800"
              >
                3
              </span>

              <div>
                <p class="font-semibold text-slate-800">Aislamiento de datos</p>
                <p class="mt-1 text-sm text-slate-500">
                  Verificar los permisos en el backend en cada operación.
                </p>
              </div>
            </li>
          </ol>
        </article>

        <aside class="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-6">
          <div
            class="mb-4 flex size-11 items-center justify-center rounded-xl bg-white text-xl font-bold text-emerald-700 shadow-sm"
            aria-hidden="true"
          >
            P
          </div>

          <h2 class="text-lg font-bold text-slate-900">Una regla fundamental</h2>

          <p class="mt-3 text-sm leading-6 text-slate-700">
            Una estimación debe ser rápida de modificar, fácil de entender y suficientemente
            transparente para explicar de dónde sale cada resultado.
          </p>

          <div class="mt-5 border-t border-emerald-200 pt-4">
            <p class="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Nuestra prioridad
            </p>

            <p class="mt-1 text-sm font-medium text-slate-800">
              Resolver el trabajo real, no crear formularios por crear.
            </p>
          </div>
        </aside>
      </section>
    </main>
  `,
})
export class HomePage {}
