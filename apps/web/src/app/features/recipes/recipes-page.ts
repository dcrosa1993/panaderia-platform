import { Component, computed, effect, inject, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { concatMap, finalize, of } from 'rxjs';

import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzMessageService } from 'ng-zorro-antd/message';

import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../core/api-error';
import { ProductsService } from '../../core/products/products.service';
import { IngredientsService } from '../../core/ingredients/ingredients.service';
import { RecipesService } from '../../core/recipes/recipes.service';

import type { Product } from '../../core/models/product.models';
import type { Ingredient } from '../../core/models/ingredient.models';
import type {
  RecipeIngredientLine,
  RecipeVersion,
  RecipeVersionStatus,
} from '../../core/models/recipe.models';

import { RouterLink } from '@angular/router';

type IngredientRowForm = FormGroup<{
  ingredientId: FormControl<string>;
  bakerPercentage: FormControl<string>;
  isFlourBase: FormControl<boolean>;
  sortOrder: FormControl<number>;
}>;

const PERCENTAGE_PATTERN = /^(?:\d{1,5})(?:[.,]\d{1,4})?$/;
const LOSS_PATTERN = /^(?:\d{1,2}(?:[.,]\d{1,4})?|100(?:[.,]0{1,4})?)$/;

@Component({
  selector: 'app-recipes-page',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
    NzTagModule,
    NzTableModule,
    RouterLink,
  ],
  template: `
    <main class="mx-auto w-full min-w-0 max-w-7xl space-y-5 sm:space-y-6">
      <!-- Encabezado -->
      <header class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div class="min-w-0">
          <p class="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
            FÓRMULAS DE PRODUCCIÓN
          </p>

          <h1 class="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Recetas</h1>

          <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Define porcentajes panaderos, identifica las harinas base y conserva el historial de las
            fórmulas publicadas.
          </p>

          <p class="mt-2 break-words text-xs text-slate-500">
            Negocio activo:
            <strong class="font-semibold text-slate-700">
              {{ auth.activeBusiness()?.name ?? 'Sin negocio seleccionado' }}
            </strong>
          </p>
        </div>

        <button
          nz-button
          nzType="primary"
          type="button"
          class="app-btn app-btn-primary min-h-11 w-full shrink-0 sm:w-auto"
          [disabled]="!selectedProduct()"
          (click)="openDraftModal()"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
             <path
               d="M12 5v14M5 12h14"
               stroke="currentColor"
               stroke-width="1.8"
               stroke-linecap="round"
             />
          </svg>
          Nueva versión
        </button>
      </header>

      <!-- Errores y carga -->
      @if (pageError()) {
        <nz-alert nzType="error" nzShowIcon [nzMessage]="pageError()!" />
      }

      @if (productsLoading() || ingredientsLoading()) {
        <div class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <span
            class="size-4 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-blue-700"
            aria-hidden="true"
          ></span>
          <p class="text-sm text-slate-600">Cargando productos e ingredientes...</p>
        </div>
      }

      <!-- Selector de producto -->
      <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <label for="recipeProduct" class="mb-2 block text-sm font-semibold text-slate-700">
          Producto
        </label>

        <nz-select
          id="recipeProduct"
          class="w-full sm:max-w-xl"
          [ngModel]="selectedProductId()"
          (ngModelChange)="selectProduct($event)"
          nzPlaceHolder="Selecciona un producto"
          nzAllowClear
        >
          @for (product of products(); track product.id) {
            <nz-option [nzValue]="product.id" [nzLabel]="product.name" />
          }
        </nz-select>

        @if (products().length === 0 && !productsLoading()) {
          <p class="mt-3 text-sm leading-6 text-slate-500">
            Todavía no hay productos activos.
            <a routerLink="/products" class="font-semibold text-blue-800 hover:underline">
              Crear un producto
            </a>
          </p>
        }

        @if (ingredients().length === 0 && !ingredientsLoading()) {
          <nz-alert
            class="mt-4 block"
            nzType="warning"
            nzShowIcon
            nzMessage="No hay ingredientes activos con unidad base de masa."
            nzDescription="Registra primero tus ingredientes en el catálogo."
          />
        }
      </section>

      <!-- Versiones de la receta -->
      @if (selectedProduct()) {
        <section
          class="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div class="border-b border-slate-100 p-4 sm:p-5">
            <h2 class="font-semibold text-slate-900">Versiones de la receta</h2>
            <p class="mt-1 break-words text-xs text-slate-500">
              Producto: {{ selectedProduct()?.name }}
            </p>
          </div>

          @if (versionsLoading()) {
            <p class="p-5 text-sm text-slate-500">Cargando versiones...</p>
          } @else if (versions().length === 0) {
            <div class="p-6 text-center sm:p-8">
              <h3 class="font-semibold text-slate-800">Este producto todavía no tiene recetas</h3>

              <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Crea una versión en borrador para comenzar a definir su fórmula.
              </p>

              <button
                nz-button
                nzType="primary"
                class="app-btn app-btn-primary mt-4 min-h-11 w-full sm:w-auto"
                type="button"
                (click)="openDraftModal()"
              >
                Crear primera receta
              </button>
            </div>
          } @else {
            <nz-table
              #versionTable
              [nzData]="versions()"
              [nzPageSize]="5"
              [nzShowPagination]="versions().length > 5"
              nzNoResult="No hay versiones."
            >
              <thead>
                <tr>
                  <th class="min-w-[120px]">Versión</th>
                  <th class="hidden sm:table-cell">Estado</th>
                  <th class="hidden md:table-cell">Pérdida prevista</th>
                  <th class="hidden lg:table-cell">Fecha de publicación</th>
                  <th class="w-[125px] text-right">Acciones</th>
                </tr>
              </thead>

              <tbody>
                @for (version of versionTable.data; track version.id) {
                  <tr>
                    <td>
                      <div class="font-semibold text-slate-900">v{{ version.versionNumber }}</div>

                      @if (selectedVersion()?.id === version.id) {
                        <span class="mt-1 inline-block text-xs font-medium text-blue-700">
                          Seleccionada
                        </span>
                      }

                      <!-- Datos resumidos para móvil -->
                      <div class="mt-2 flex flex-wrap items-center gap-2 sm:hidden">
                        <nz-tag [nzColor]="statusColor(version.status)">
                          {{ statusLabel(version.status) }}
                        </nz-tag>

                        <span class="text-xs text-slate-600">
                          Pérdida: {{ version.expectedBakeLossPercent }} %
                        </span>

                        @if (version.publishedAt) {
                          <span class="text-xs text-slate-500">
                            {{ version.publishedAt | date: 'shortDate' }}
                          </span>
                        }
                      </div>
                    </td>

                    <td class="hidden sm:table-cell">
                      <nz-tag [nzColor]="statusColor(version.status)">
                        {{ statusLabel(version.status) }}
                      </nz-tag>
                    </td>

                    <td class="hidden md:table-cell">{{ version.expectedBakeLossPercent }} %</td>

                    <td class="hidden lg:table-cell">
                      {{ version.publishedAt ? (version.publishedAt | date: 'shortDate') : '—' }}
                    </td>

                    <td class="text-right">
                      <button
                        nz-button
                        nzType="default"
                        nzSize="small"
                        type="button"
                        class="app-btn app-btn-secondary w-full sm:w-auto"
                        (click)="openVersion(version)"
                      >
                        Ver / editar
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </nz-table>
          }
        </section>
      }

      <!-- Editor de receta -->
      @if (selectedVersion(); as version) {
        <section
          class="min-w-0 space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:space-y-6 sm:p-6"
        >
          <header class="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0">
              <p class="text-xs font-bold uppercase tracking-wider text-emerald-700">
                {{ canEditVersion() ? 'EDITANDO BORRADOR' : 'CONSULTA DE VERSIÓN' }}
              </p>

              <h2 class="mt-1 break-words text-xl font-bold text-slate-900 sm:text-2xl">
                {{ selectedProduct()?.name }} · Versión {{ version.versionNumber }}
              </h2>

              <p class="mt-2 text-sm leading-6 text-slate-500">
                {{
                  canEditVersion()
                    ? 'Puedes modificar la fórmula antes de publicarla.'
                    : 'Esta versión no se puede modificar. Crea otro borrador si necesitas cambiarla.'
                }}
              </p>
            </div>

            <nz-tag class="self-start" [nzColor]="statusColor(version.status)">
              {{ statusLabel(version.status) }}
            </nz-tag>
          </header>

          @if (editorError()) {
            <nz-alert nzType="error" nzShowIcon [nzMessage]="editorError()!" />
          }

          @if (hasInactiveIngredients(version)) {
            <nz-alert
              nzType="warning"
              nzShowIcon
              nzMessage="Esta receta contiene un ingrediente inactivo."
              nzDescription="Antes de publicar una nueva versión, sustitúyelo por un ingrediente activo."
            />
          }

          <form [formGroup]="recipeForm" (ngSubmit)="saveDraft()" class="space-y-6" novalidate>
            <!-- Parámetros de elaboración -->
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div class="min-w-0">
                <label for="bakeLoss" class="mb-2 block text-sm font-semibold text-slate-700">
                  Pérdida prevista de horneado y enfriamiento (%)
                </label>

                <input
                  nz-input
                  id="bakeLoss"
                  type="text"
                  inputmode="decimal"
                  formControlName="expectedBakeLossPercent"
                  [readOnly]="!canEditVersion()"
                  placeholder="Introduce la pérdida medida"
                  class="min-h-11 w-full"
                />

                @if (
                  recipeForm.controls.expectedBakeLossPercent.touched &&
                  recipeForm.controls.expectedBakeLossPercent.invalid
                ) {
                  <p class="mt-2 text-xs leading-5 text-red-600">
                    Introduce una pérdida entre 0 y menos de 100 %, con hasta 4 decimales.
                  </p>
                }

                <p class="mt-2 text-xs leading-5 text-slate-500">
                  No se asigna una pérdida predeterminada. Utiliza una medición o un supuesto
                  explícito.
                </p>
              </div>

              <div class="min-w-0">
                <label for="recipeNotes" class="mb-2 block text-sm font-semibold text-slate-700">
                  Notas de elaboración
                </label>

                <textarea
                  nz-input
                  id="recipeNotes"
                  formControlName="notes"
                  [readOnly]="!canEditVersion()"
                  maxlength="1000"
                  rows="3"
                  placeholder="Procedimiento, amasado, fermentación..."
                  class="w-full"
                ></textarea>
              </div>
            </div>

            <!-- Fórmula -->
            <section class="min-w-0 overflow-hidden rounded-xl border border-slate-200">
              <div
                class="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div class="min-w-0">
                  <h3 class="font-semibold text-slate-900">Fórmula</h3>
                  <p class="mt-1 text-xs leading-5 text-slate-500">
                    Los porcentajes se calculan respecto al total de harinas base.
                  </p>
                </div>

                <button
                  nz-button
                  nzType="default"
                  type="button"
                  class="app-btn app-btn-secondary min-h-11 w-full shrink-0 sm:w-auto"
                  [disabled]="!canEditVersion() || ingredientRows.length >= 200"
                  (click)="addIngredient()"
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 5v14M5 12h14"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                    />
                  </svg>
                  Ingrediente
                </button>
              </div>

              <div formArrayName="ingredients" class="divide-y divide-slate-100">
                @for (row of ingredientRows.controls; track row; let i = $index) {
                  <div
                    [formGroupName]="i"
                    class="grid min-w-0 grid-cols-1 items-start gap-4 p-4 sm:p-5 lg:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(130px,1fr)_minmax(150px,1fr)_auto]"
                  >
                    <!-- Ingrediente -->
                    <div class="min-w-0">
                      <label
                        [for]="'recipeIngredient-' + i"
                        class="mb-2 block text-xs font-semibold text-slate-600"
                      >
                        Ingrediente {{ i + 1 }}
                      </label>

                      <nz-select
                        [id]="'recipeIngredient-' + i"
                        class="w-full"
                        formControlName="ingredientId"
                        nzPlaceHolder="Selecciona un ingrediente"
                        [nzDisabled]="!canEditVersion()"
                      >
                        @for (ingredient of ingredients(); track ingredient.id) {
                          <nz-option
                            [nzValue]="ingredient.id"
                            [nzLabel]="ingredient.name + ' (' + ingredient.baseUnit.symbol + ')'"
                          />
                        }
                      </nz-select>

                      @if (row.controls.ingredientId.touched && row.controls.ingredientId.invalid) {
                        <p class="mt-2 text-xs text-red-600">Selecciona un ingrediente.</p>
                      }
                    </div>

                    <!-- Porcentaje panadero -->
                    <div class="min-w-0">
                      <label
                        [for]="'bakerPercentage-' + i"
                        class="mb-2 block text-xs font-semibold text-slate-600"
                      >
                        Porcentaje panadero (%)
                      </label>

                      <input
                        nz-input
                        [id]="'bakerPercentage-' + i"
                        type="text"
                        inputmode="decimal"
                        formControlName="bakerPercentage"
                        [readOnly]="!canEditVersion()"
                        placeholder="100"
                        class="min-h-11 w-full"
                      />

                      @if (
                        row.controls.bakerPercentage.touched && row.controls.bakerPercentage.invalid
                      ) {
                        <p class="mt-2 text-xs text-red-600">Introduce un porcentaje válido.</p>
                      }

                      @if (ingredientAmountText(i); as amount) {
                        <p class="mt-2 text-xs font-medium leading-5 text-emerald-800">
                          Cantidad por producto: {{ amount }}
                        </p>
                      }
                    </div>

                    <!-- Harina base -->
                    <div class="min-w-0">
                      <span class="mb-2 block text-xs font-semibold text-slate-600">
                        Harina base
                      </span>

                      <label
                        class="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          formControlName="isFlourBase"
                          [disabled]="!canEditVersion()"
                          class="size-5 shrink-0 accent-emerald-700"
                        />

                        <span>Incluir en el 100 %</span>
                      </label>
                    </div>

                    <!-- Eliminar ingrediente -->
                    <div class="flex min-w-0 items-end xl:pt-6">
                      <button
                        nz-button
                        nzType="default"
                        type="button"
                        class="app-btn app-btn-danger min-h-11 w-full sm:w-auto xl:w-auto"
                        [disabled]="!canEditVersion()"
                        (click)="removeIngredient(i)"
                      >
                        Quitar ingrediente
                      </button>
                    </div>
                  </div>
                }
              </div>

              @if (canEditVersion() && ingredientRows.length === 0) {
                <div class="p-6 text-center">
                  <p class="text-sm text-slate-500">
                    Añade al menos un ingrediente para empezar la fórmula.
                  </p>

                  <button
                    nz-button
                    nzType="default"
                    type="button"
                    class="app-btn app-btn-secondary mt-3 min-h-11 w-full sm:w-auto"
                    (click)="addIngredient()"
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                     <path
                       d="M12 5v14M5 12h14"
                       stroke="currentColor"
                       stroke-width="1.8"
                       stroke-linecap="round"
                     />
                    </svg>
                    Añadir ingrediente
                  </button>
                </div>
              }
            </section>
          </form>

          <!-- Resumen de cálculos -->
          <section class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div class="rounded-xl border border-slate-200 p-4">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Total de la fórmula
              </p>

              <p class="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                {{ formatNumber(formulaTotals().total) }} %
              </p>
            </div>

            <div class="rounded-xl border border-slate-200 p-4">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Harinas base
              </p>

              <p class="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                {{ formatNumber(formulaTotals().flour) }} %
              </p>

              @if (isFlourTotalValid()) {
                <p class="mt-2 text-xs leading-5 text-emerald-700">
                  Base correctamente normalizada
                </p>
              } @else {
                <p class="mt-2 text-xs leading-5 text-amber-700">
                  Debe sumar exactamente 100 % para publicar
                </p>
              }
            </div>

            <div
              class="rounded-xl border border-blue-100 bg-blue-50/50 p-4 sm:col-span-2 xl:col-span-1"
            >
              <p class="text-xs font-semibold uppercase tracking-wide text-blue-800">
                Masa teórica por 1 kg de harina
              </p>

              <p class="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                {{ massForOneKgFlour() === null ? '—' : formatNumber(massForOneKgFlour()!) + ' g' }}
              </p>

              <p class="mt-2 text-xs leading-5 text-slate-500">
                Basada en los porcentajes introducidos.
              </p>
            </div>
          </section>

          <!-- Referencia de peso terminado -->
          @if (estimatedRawDoughGrams() !== null) {
            <section class="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 sm:p-5">
              <h3 class="font-semibold text-slate-900">
                Referencia para el peso terminado objetivo
              </h3>

              <p class="mt-2 text-sm leading-6 text-slate-700">
                Para obtener {{ selectedProduct()?.targetFinishedWeight }}
                {{ selectedProduct()?.targetWeightUnit?.symbol }} terminados, con una pérdida
                prevista de {{ recipeForm.controls.expectedBakeLossPercent.value }} %, la masa cruda
                estimada sería <strong>{{ formatNumber(estimatedRawDoughGrams()!) }} g</strong>.
              </p>

              <p class="mt-2 text-sm leading-6 text-slate-700">
                @if (flourForTargetGrams() !== null) {
                  La harina total estimada sería
                  <strong>{{ formatNumber(flourForTargetGrams()!) }} g por unidad</strong>.
                } @else {
                  Define una fórmula válida con harinas base que sumen 100 % para calcular la harina
                  por unidad.
                }
              </p>
            </section>
          }

          <!-- Acciones de la versión -->
          @if (canEditVersion()) {
            <div
              class="flex flex-col gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:flex-wrap sm:justify-end"
            >
              <button
                nz-button
                nzType="default"
                type="button"
                class="app-btn app-btn-secondary min-h-11 w-full sm:w-auto"
                [disabled]="saving()"
                (click)="discardEditorChanges()"
              >
                Recargar borrador
              </button>

              <button
                nz-button
                nzType="default"
                type="button"
                class="app-btn app-btn-secondary min-h-11 w-full sm:w-auto"
                [disabled]="saving() || recipeForm.invalid || ingredientRows.length === 0"
                [nzLoading]="saving()"
                (click)="saveDraft()"
              >
                Guardar borrador
              </button>

              <button
                nz-button
                nzType="primary"
                type="button"
                class="app-btn app-btn-primary min-h-11 w-full sm:w-auto"
                [disabled]="saving() || !canPublishFormula()"
                [nzLoading]="saving()"
                (click)="saveDraft(true)"
              >
                Guardar y publicar
              </button>
            </div>
          }
        </section>
      }

      <!-- Modal para crear un borrador -->
      <nz-modal
        [nzVisible]="createDraftVisible()"
        nzTitle="Nueva versión de receta"
        [nzWidth]="'min(560px, calc(100vw - 24px))'"
        [nzFooter]="null"
        [nzMaskClosable]="false"
        [nzClosable]="!creatingDraft()"
        (nzOnCancel)="closeDraftModal()"
      >
        <ng-container *nzModalContent>
          <p class="mb-5 text-sm leading-6 text-slate-600">
            La versión nueva empieza como borrador. Podrás añadir los ingredientes, modificar la
            fórmula y publicarla cuando esté validada.
          </p>

          @if (draftError()) {
            <nz-alert class="mb-4 block" nzType="error" nzShowIcon [nzMessage]="draftError()!" />
          }

          <form [formGroup]="draftForm" (ngSubmit)="createDraft()" class="space-y-5" novalidate>
            <div>
              <label for="newRecipeLoss" class="mb-2 block text-sm font-semibold text-slate-700">
                Pérdida prevista de horneado y enfriamiento (%)
              </label>

              <input
                nz-input
                id="newRecipeLoss"
                type="text"
                inputmode="decimal"
                formControlName="expectedBakeLossPercent"
                placeholder="Introduce un valor medido"
                class="min-h-11 w-full"
              />

              <p class="mt-2 text-xs leading-5 text-slate-500">
                No se introduce una pérdida predeterminada.
              </p>
            </div>

            <div>
              <label for="newRecipeNotes" class="mb-2 block text-sm font-semibold text-slate-700">
                Notas (opcional)
              </label>

              <textarea
                nz-input
                id="newRecipeNotes"
                formControlName="notes"
                rows="3"
                maxlength="1000"
                placeholder="Observaciones para esta versión"
                class="w-full"
              ></textarea>
            </div>

            <div
              class="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"
            >
              <button
                nz-button
                type="button"
                class="app-btn app-btn-secondary min-h-11 w-full sm:w-auto"
                [disabled]="creatingDraft()"
                (click)="closeDraftModal()"
              >
                Cancelar
              </button>

              <button
                nz-button
                nzType="primary"
                type="submit"
                class="app-btn app-btn-primary min-h-11 w-full sm:w-auto"
                [nzLoading]="creatingDraft()"
                [disabled]="draftForm.invalid || creatingDraft()"
              >
                Crear borrador
              </button>
            </div>
          </form>
        </ng-container>
      </nz-modal>
    </main>
  `,
})
export class RecipesPage {
  readonly auth = inject(AuthService);

  private readonly fb = inject(FormBuilder);
  private readonly productsApi = inject(ProductsService);
  private readonly ingredientsApi = inject(IngredientsService);
  private readonly recipesApi = inject(RecipesService);
  private readonly message = inject(NzMessageService);

  readonly products = signal<Product[]>([]);
  readonly ingredients = signal<Ingredient[]>([]);
  readonly versions = signal<RecipeVersion[]>([]);

  readonly selectedProductId = signal<string | null>(null);
  readonly selectedVersion = signal<RecipeVersion | null>(null);

  readonly productsLoading = signal(false);
  readonly ingredientsLoading = signal(false);
  readonly versionsLoading = signal(false);
  readonly saving = signal(false);
  readonly creatingDraft = signal(false);

  readonly pageError = signal<string | null>(null);
  readonly editorError = signal<string | null>(null);
  readonly draftError = signal<string | null>(null);

  readonly createDraftVisible = signal(false);

  readonly selectedProduct = computed(
    () => this.products().find((product) => product.id === this.selectedProductId()) ?? null,
  );

  readonly canEditVersion = computed(() => this.selectedVersion()?.status === 'DRAFT');

  readonly formulaTotals = signal({
    total: 0,
    flour: 0,
  });

  readonly draftForm = this.fb.nonNullable.group({
    expectedBakeLossPercent: ['', [Validators.required, Validators.pattern(LOSS_PATTERN)]],
    notes: ['', [Validators.maxLength(1000)]],
  });

  readonly recipeForm = this.fb.nonNullable.group({
    expectedBakeLossPercent: ['', [Validators.required, Validators.pattern(LOSS_PATTERN)]],
    notes: ['', [Validators.maxLength(1000)]],
    ingredients: this.fb.array<IngredientRowForm>([]),
  });

  get ingredientRows(): FormArray<IngredientRowForm> {
    return this.recipeForm.controls.ingredients;
  }

  private productRequestSequence = 0;
  private ingredientRequestSequence = 0;
  private versionRequestSequence = 0;

  constructor() {
    this.recipeForm.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.recalculateFormula());

    effect(() => {
      const businessId = this.auth.activeBusinessId();

      this.productRequestSequence++;
      this.ingredientRequestSequence++;
      this.versionRequestSequence++;

      this.products.set([]);
      this.ingredients.set([]);
      this.versions.set([]);
      this.selectedProductId.set(null);
      this.selectedVersion.set(null);
      this.clearRecipeEditor();
      this.pageError.set(null);

      if (!businessId) {
        return;
      }

      this.loadProducts(businessId);
      this.loadIngredients(businessId);
    });
  }

  selectProduct(productId: string | null): void {
    this.selectedProductId.set(productId);
    this.versions.set([]);
    this.selectedVersion.set(null);
    this.clearRecipeEditor();

    const businessId = this.auth.activeBusinessId();

    if (businessId && productId) {
      this.loadVersions(businessId, productId);
    }
  }

  openVersion(version: RecipeVersion): void {
    this.selectVersion(version);
  }

  openDraftModal(): void {
    if (!this.selectedProductId()) {
      this.pageError.set('Selecciona un producto primero.');
      return;
    }

    this.draftError.set(null);
    this.draftForm.reset({
      expectedBakeLossPercent: '',
      notes: '',
    });
    this.createDraftVisible.set(true);
  }

  closeDraftModal(): void {
    if (this.creatingDraft()) {
      return;
    }

    this.createDraftVisible.set(false);
    this.draftError.set(null);
  }

  createDraft(): void {
    if (this.draftForm.invalid || this.creatingDraft()) {
      this.draftForm.markAllAsTouched();
      return;
    }

    const businessId = this.auth.activeBusinessId();
    const productId = this.selectedProductId();

    if (!businessId || !productId) {
      this.draftError.set('Selecciona un negocio y un producto.');
      return;
    }

    const value = this.draftForm.getRawValue();
    const loss = this.parseDecimal(value.expectedBakeLossPercent);

    if (!Number.isFinite(loss) || loss < 0 || loss >= 100) {
      this.draftError.set('La pérdida prevista debe estar entre 0 y menos de 100 %.');
      return;
    }

    this.draftError.set(null);
    this.creatingDraft.set(true);

    this.recipesApi
      .createDraft(businessId, productId, {
        expectedBakeLossPercent: value.expectedBakeLossPercent.replace(',', '.'),
        notes: value.notes.trim() || null,
      })
      .pipe(finalize(() => this.creatingDraft.set(false)))
      .subscribe({
        next: (version) => {
          if (
            this.auth.activeBusinessId() !== businessId ||
            this.selectedProductId() !== productId
          ) {
            return;
          }

          this.createDraftVisible.set(false);
          this.versions.update((current) => [
            version,
            ...current.filter((item) => item.id !== version.id),
          ]);
          this.selectVersion(version);
          this.message.success(`Se creó el borrador v${version.versionNumber}.`);
        },
        error: (error: unknown) => {
          this.draftError.set(apiErrorMessage(error));
        },
      });
  }

  addIngredient(): void {
    if (!this.canEditVersion() || this.ingredientRows.length >= 200) {
      return;
    }

    this.ingredientRows.push(this.createIngredientRow());
    this.recalculateFormula();
  }

  removeIngredient(index: number): void {
    if (!this.canEditVersion()) {
      return;
    }

    this.ingredientRows.removeAt(index);

    this.ingredientRows.controls.forEach((row, sortOrder) => {
      row.controls.sortOrder.setValue(sortOrder, {
        emitEvent: false,
      });
    });

    this.recalculateFormula();
  }

  saveDraft(publishAfterSave = false): void {
    const version = this.selectedVersion();
    const businessId = this.auth.activeBusinessId();
    const productId = this.selectedProductId();

    if (!version || version.status !== 'DRAFT') {
      return;
    }

    if (this.saving()) {
      return;
    }

    if (!businessId || !productId) {
      this.editorError.set('Selecciona el negocio y el producto antes de guardar.');
      return;
    }

    if (this.recipeForm.invalid) {
      this.recipeForm.markAllAsTouched();
      this.editorError.set('Revisa los campos de la receta antes de guardarla.');
      return;
    }

    const raw = this.recipeForm.getRawValue();
    const loss = this.parseDecimal(raw.expectedBakeLossPercent);

    if (!Number.isFinite(loss) || loss < 0 || loss >= 100) {
      this.editorError.set('La pérdida prevista debe estar entre 0 y menos de 100 %.');
      return;
    }

    const lines = this.ingredientRows.controls.map((row, index) => {
      const value = row.getRawValue();

      return {
        ingredientId: value.ingredientId,
        bakerPercentage: value.bakerPercentage.replace(',', '.'),
        isFlourBase: value.isFlourBase,
        sortOrder: index,
      };
    });

    if (lines.length === 0) {
      this.editorError.set('Añade al menos un ingrediente a la fórmula.');
      return;
    }

    if (lines.some((line) => !line.ingredientId)) {
      this.editorError.set('Selecciona un ingrediente en cada línea antes de guardar.');
      return;
    }

    const ingredientIds = lines.map((line) => line.ingredientId);

    if (new Set(ingredientIds).size !== ingredientIds.length) {
      this.editorError.set(
        'Cada ingrediente solo puede aparecer una vez. Ajusta su porcentaje en una única línea.',
      );
      return;
    }

    if (
      lines.some(
        (line) =>
          !Number.isFinite(this.parseDecimal(line.bakerPercentage)) ||
          this.parseDecimal(line.bakerPercentage) <= 0,
      )
    ) {
      this.editorError.set('Todos los porcentajes deben ser mayores que cero.');
      return;
    }

    if (publishAfterSave && !this.isFlourTotalValid()) {
      this.editorError.set(
        'No se puede publicar: los ingredientes marcados como harina base deben sumar exactamente 100 %.',
      );
      return;
    }

    this.editorError.set(null);
    this.saving.set(true);

    const save$ = this.recipesApi
      .updateDraft(businessId, productId, version.id, {
        expectedBakeLossPercent: raw.expectedBakeLossPercent.replace(',', '.'),
        notes: raw.notes.trim() || null,
      })
      .pipe(
        concatMap(() =>
          this.recipesApi.replaceIngredients(businessId, productId, version.id, {
            ingredients: lines,
          }),
        ),
        concatMap((savedVersion) =>
          publishAfterSave
            ? this.recipesApi.publish(businessId, productId, savedVersion.id)
            : of(savedVersion),
        ),
        finalize(() => this.saving.set(false)),
      );

    save$.subscribe({
      next: (savedVersion) => {
        if (this.auth.activeBusinessId() !== businessId || this.selectedProductId() !== productId) {
          return;
        }

        this.message.success(
          publishAfterSave
            ? `La versión v${savedVersion.versionNumber} se guardó y publicó.`
            : `El borrador v${savedVersion.versionNumber} se guardó.`,
        );

        this.loadVersions(businessId, productId, savedVersion.id);
      },
      error: (error: unknown) => {
        this.editorError.set(apiErrorMessage(error));
      },
    });
  }

  discardEditorChanges(): void {
    const current = this.selectedVersion();

    if (current) {
      this.selectVersion(current);
      this.editorError.set(null);
    }
  }

  canPublishFormula(): boolean {
    return (
      this.canEditVersion() &&
      this.recipeForm.valid &&
      this.ingredientRows.length > 0 &&
      this.isFlourTotalValid() &&
      !this.saving()
    );
  }

  isFlourTotalValid(): boolean {
    const flour = this.formulaTotals().flour;
    return Math.round(flour * 10_000) === 1_000_000;
  }

  hasInactiveIngredients(version: RecipeVersion): boolean {
    return version.ingredients.some((line) => !line.ingredient.isActive);
  }

  statusLabel(status: RecipeVersionStatus): string {
    switch (status) {
      case 'DRAFT':
        return 'Borrador';
      case 'PUBLISHED':
        return 'Publicada';
      case 'SUPERSEDED':
        return 'Sustituida';
    }
  }

  statusColor(status: RecipeVersionStatus): string {
    switch (status) {
      case 'DRAFT':
        return 'orange';
      case 'PUBLISHED':
        return 'green';
      case 'SUPERSEDED':
        return 'default';
    }
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('es-CU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    }).format(value);
  }

  massForOneKgFlour(): number | null {
    const { total, flour } = this.formulaTotals();

    if (flour <= 0 || !this.isFlourTotalValid()) {
      return null;
    }

    return (1000 * total) / flour;
  }

  ingredientAmountText(index: number): string | null {
    const flourGrams = this.flourForTargetGrams();

    if (flourGrams === null) {
      return null;
    }

    const row = this.ingredientRows.at(index);
    const ingredientId = row.controls.ingredientId.value;
    const ingredient = this.ingredients().find((item) => item.id === ingredientId);

    if (!ingredient) {
      return null;
    }

    const percentage = this.parseDecimal(row.controls.bakerPercentage.value);

    if (!Number.isFinite(percentage) || percentage <= 0) {
      return null;
    }

    // Los porcentajes panaderos representan masa equivalente.
    const ingredientMassGrams = (flourGrams * percentage) / 100;

    const unitFactor = Number(ingredient.baseUnit.factorToBase);

    if (!Number.isFinite(unitFactor) || unitFactor <= 0) {
      return null;
    }

    let quantityInBaseUnits: number;

    if (ingredient.baseUnit.dimension === 'MASS') {
      // Ejemplo: g -> factor 1; kg -> factor 1000.
      quantityInBaseUnits = ingredientMassGrams / unitFactor;
    } else if (ingredient.baseUnit.dimension === 'VOLUME') {
      const density = Number(ingredient.densityGramsPerMl);

      if (!Number.isFinite(density) || density <= 0) {
        return null;
      }

      const milliliters = ingredientMassGrams / density;

      // Ejemplo: ml -> factor 1; l -> factor 1000.
      quantityInBaseUnits = milliliters / unitFactor;
    } else {
      return null;
    }

    return `${this.formatNumber(quantityInBaseUnits)} ${ingredient.baseUnit.symbol}`;
  }

  estimatedRawDoughGrams(): number | null {
    const product = this.selectedProduct();

    if (!product?.targetFinishedWeight || !product.targetWeightUnit) {
      return null;
    }

    const loss = this.parseDecimal(this.recipeForm.controls.expectedBakeLossPercent.value);

    if (!Number.isFinite(loss) || loss < 0 || loss >= 100) {
      return null;
    }

    const finishedGrams =
      Number(product.targetFinishedWeight) * Number(product.targetWeightUnit.factorToBase);

    if (!Number.isFinite(finishedGrams) || finishedGrams <= 0) {
      return null;
    }

    return finishedGrams / (1 - loss / 100);
  }

  flourForTargetGrams(): number | null {
    const rawDough = this.estimatedRawDoughGrams();
    const total = this.formulaTotals().total;

    if (rawDough === null || total <= 0 || !this.isFlourTotalValid()) {
      return null;
    }

    return (rawDough * 100) / total;
  }

  ingredientAmountForTargetGrams(index: number): number | null {
    const flourGrams = this.flourForTargetGrams();

    if (flourGrams === null) {
      return null;
    }

    const row = this.ingredientRows.at(index);
    const percentage = this.parseDecimal(row.controls.bakerPercentage.value);

    if (!Number.isFinite(percentage) || percentage <= 0) {
      return null;
    }

    return (flourGrams * percentage) / 100;
  }

  private selectVersion(version: RecipeVersion): void {
    this.selectedVersion.set(version);
    this.editorError.set(null);

    this.recipeForm.patchValue(
      {
        expectedBakeLossPercent: version.expectedBakeLossPercent,
        notes: version.notes ?? '',
      },
      { emitEvent: false },
    );

    this.ingredientRows.clear({ emitEvent: false });

    for (const line of version.ingredients) {
      this.ingredientRows.push(this.createIngredientRow(line), { emitEvent: false });
    }

    if (version.status === 'DRAFT' && this.ingredientRows.length === 0) {
      this.ingredientRows.push(this.createIngredientRow(), { emitEvent: false });
    }

    this.recalculateFormula();
  }

  private createIngredientRow(line?: RecipeIngredientLine): IngredientRowForm {
    return this.fb.nonNullable.group({
      ingredientId: this.fb.nonNullable.control(line?.ingredientId ?? '', Validators.required),
      bakerPercentage: this.fb.nonNullable.control(line?.bakerPercentage ?? '', [
        Validators.required,
        Validators.pattern(PERCENTAGE_PATTERN),
      ]),
      isFlourBase: this.fb.nonNullable.control(line?.isFlourBase ?? false),
      sortOrder: this.fb.nonNullable.control(line?.sortOrder ?? this.ingredientRows.length),
    });
  }

  private clearRecipeEditor(): void {
    this.recipeForm.reset(
      {
        expectedBakeLossPercent: '',
        notes: '',
      },
      { emitEvent: false },
    );

    this.ingredientRows.clear({ emitEvent: false });
    this.formulaTotals.set({ total: 0, flour: 0 });
  }

  private recalculateFormula(): void {
    const rows = this.ingredientRows.controls;

    let total = 0;
    let flour = 0;

    for (const row of rows) {
      const percentage = this.parseDecimal(row.controls.bakerPercentage.value);

      if (!Number.isFinite(percentage) || percentage <= 0) {
        continue;
      }

      total += percentage;

      if (row.controls.isFlourBase.value) {
        flour += percentage;
      }
    }

    this.formulaTotals.set({
      total: Math.round(total * 10_000) / 10_000,
      flour: Math.round(flour * 10_000) / 10_000,
    });
  }

  private loadProducts(businessId: string): void {
    const sequence = ++this.productRequestSequence;

    this.productsLoading.set(true);

    this.productsApi
      .getAll(businessId)
      .pipe(
        finalize(() => {
          if (sequence === this.productRequestSequence) {
            this.productsLoading.set(false);
          }
        }),
      )
      .subscribe({
        next: (response) => {
          if (
            sequence !== this.productRequestSequence ||
            this.auth.activeBusinessId() !== businessId
          ) {
            return;
          }

          const products = response.products.filter((product) => product.isActive);

          this.products.set(products);

          if (products.length > 0) {
            this.selectProduct(products[0].id);
          }
        },
        error: (error: unknown) => {
          if (sequence === this.productRequestSequence) {
            this.pageError.set(apiErrorMessage(error));
          }
        },
      });
  }

  private loadIngredients(businessId: string): void {
    const sequence = ++this.ingredientRequestSequence;

    this.ingredientsLoading.set(true);

    this.ingredientsApi
      .getAll(businessId)
      .pipe(
        finalize(() => {
          if (sequence === this.ingredientRequestSequence) {
            this.ingredientsLoading.set(false);
          }
        }),
      )
      .subscribe({
        next: (response) => {
          if (
            sequence !== this.ingredientRequestSequence ||
            this.auth.activeBusinessId() !== businessId
          ) {
            return;
          }

          this.ingredients.set(
            response.ingredients.filter((ingredient) => {
              if (ingredient.baseUnit.dimension === 'MASS') {
                return true;
              }

              return (
                ingredient.baseUnit.dimension === 'VOLUME' &&
                Number(ingredient.densityGramsPerMl) > 0
              );
            }),
          );
        },
        error: (error: unknown) => {
          if (sequence === this.ingredientRequestSequence) {
            this.pageError.set(apiErrorMessage(error));
          }
        },
      });
  }

  private loadVersions(businessId: string, productId: string, preferredVersionId?: string): void {
    const sequence = ++this.versionRequestSequence;

    this.versionsLoading.set(true);

    this.recipesApi
      .getVersions(businessId, productId)
      .pipe(
        finalize(() => {
          if (sequence === this.versionRequestSequence) {
            this.versionsLoading.set(false);
          }
        }),
      )
      .subscribe({
        next: (response) => {
          if (
            sequence !== this.versionRequestSequence ||
            this.auth.activeBusinessId() !== businessId ||
            this.selectedProductId() !== productId
          ) {
            return;
          }

          this.versions.set(response.versions);

          const selected =
            response.versions.find((version) => version.id === preferredVersionId) ??
            response.versions[0] ??
            null;

          if (selected) {
            this.selectVersion(selected);
          } else {
            this.selectedVersion.set(null);
            this.clearRecipeEditor();
          }
        },
        error: (error: unknown) => {
          if (sequence === this.versionRequestSequence) {
            this.pageError.set(apiErrorMessage(error));
          }
        },
      });
  }

  private parseDecimal(value: string): number {
    return Number(value.trim().replace(',', '.'));
  }
}
