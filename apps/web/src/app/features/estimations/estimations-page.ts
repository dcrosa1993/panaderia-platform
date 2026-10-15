import { ChangeDetectorRef, Component, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { apiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { EstimationsService } from '../../core/estimations/estimations.service';
import { ProductsService } from '../../core/products/products.service';
import { RecipesService } from '../../core/recipes/recipes.service';

import type {
  CreateEstimationRequest,
  Estimation,
  EstimationMode,
} from '../../core/models/estimation.models';
import type { MeasurementUnit } from '../../core/models/measurement-unit.models';
import type { Product } from '../../core/models/product.models';
import type { RecipeVersion } from '../../core/models/recipe.models';

@Component({
  selector: 'app-estimations-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="mx-auto max-w-7xl space-y-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            Planificación de producción
          </p>
          <h1 class="mt-2 text-3xl font-bold tracking-tight text-slate-900">Estimaciones</h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Calcula cantidades de ingredientes y costes a partir de una receta publicada y de los
            precios registrados para el negocio activo.
          </p>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p class="text-xs font-medium text-slate-500">Negocio activo</p>
          <p class="mt-1 max-w-60 truncate text-sm font-semibold text-slate-900">
            {{ auth.activeBusiness()?.name ?? 'Sin negocio seleccionado' }}
          </p>
        </div>
      </header>

      @if (pageError) {
        <div
          role="alert"
          class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {{ pageError }}
        </div>
      }

      @if (successMessage) {
        <div
          role="status"
          class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {{ successMessage }}
        </div>
      }

      @if (!activeBusinessId) {
        <div class="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <h2 class="font-semibold text-slate-900">Selecciona un negocio</h2>
          <p class="mt-2 text-sm text-slate-600">
            Elige un negocio en la barra superior para consultar sus estimaciones.
          </p>
        </div>
      } @else {
        <div class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <!-- Formulario de creación -->
          <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="text-lg font-bold text-slate-900">Nueva estimación</h2>
                <p class="mt-1 text-sm text-slate-500">
                  Selecciona un producto y una versión publicada.
                </p>
              </div>
              <span class="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">
                Ingredientes
              </span>
            </div>

            @if (loadingProducts) {
              <p class="mt-5 text-sm text-slate-500">Cargando productos…</p>
            } @else if (products.length === 0) {
              <div class="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                No hay productos activos en este negocio. Crea un producto antes de preparar una
                estimación.
              </div>
            } @else {
              <form class="mt-5 space-y-5" (ngSubmit)="createEstimation()">
                <div>
                  <label
                    for="estimateProduct"
                    class="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Producto
                  </label>
                  <select
                    id="estimateProduct"
                    name="productId"
                    class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    [ngModel]="selectedProductId"
                    (ngModelChange)="onProductChange($event)"
                    required
                  >
                    <option value="" disabled>Selecciona un producto</option>
                    @for (product of products; track product.id) {
                      <option [value]="product.id">{{ product.name }}</option>
                    }
                  </select>

                  @if (selectedProduct) {
                    <p class="mt-2 text-xs text-slate-500">
                      Unidad de producción:
                      {{ selectedProduct.productionUnit.name }}
                      @if (
                        selectedProduct.targetFinishedWeight !== null &&
                        selectedProduct.targetWeightUnit
                      ) {
                        · Peso terminado:
                        {{ selectedProduct.targetFinishedWeight }}
                        {{ selectedProduct.targetWeightUnit.symbol }}
                      }
                    </p>
                  }
                </div>

                <div>
                  <label
                    for="estimateRecipe"
                    class="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Receta publicada
                  </label>
                  <select
                    id="estimateRecipe"
                    name="recipeVersionId"
                    class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    [(ngModel)]="selectedRecipeVersionId"
                    [disabled]="loadingVersions || publishedVersions.length === 0"
                    required
                  >
                    <option value="" disabled>
                      @if (loadingVersions) {
                        Cargando recetas…
                      } @else {
                        Selecciona una receta
                      }
                    </option>
                    @for (version of publishedVersions; track version.id) {
                      <option [value]="version.id">
                        Versión {{ version.versionNumber }} · Pérdida
                        {{ formatNumber(version.expectedBakeLossPercent) }}%
                      </option>
                    }
                  </select>

                  @if (!loadingVersions && selectedProductId && publishedVersions.length === 0) {
                    <p class="mt-2 text-xs text-amber-700">
                      Este producto no tiene una receta publicada. Publica una versión desde la
                      sección Recetas para poder estimarlo.
                    </p>
                  }
                </div>

                <fieldset class="space-y-3">
                  <legend class="mb-2 text-sm font-semibold text-slate-700">
                    ¿Qué deseas estimar?
                  </legend>

                  <label
                    class="flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-colors"
                    [class.border-blue-500]="mode === 'PRODUCT_COUNT'"
                    [class.bg-blue-50]="mode === 'PRODUCT_COUNT'"
                    [class.border-slate-200]="mode !== 'PRODUCT_COUNT'"
                  >
                    <input
                      type="radio"
                      name="mode"
                      class="mt-1 accent-blue-700"
                      value="PRODUCT_COUNT"
                      [(ngModel)]="mode"
                    />
                    <span>
                      <span class="block text-sm font-semibold text-slate-900">
                        Por cantidad de piezas
                      </span>
                      <span class="mt-1 block text-xs leading-5 text-slate-600">
                        Calcula los ingredientes necesarios para una cantidad de unidades con peso
                        terminado conocido.
                      </span>
                    </span>
                  </label>

                  <label
                    class="flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-colors"
                    [class.border-blue-500]="mode === 'FLOUR_QUANTITY'"
                    [class.bg-blue-50]="mode === 'FLOUR_QUANTITY'"
                    [class.border-slate-200]="mode !== 'FLOUR_QUANTITY'"
                  >
                    <input
                      type="radio"
                      name="mode"
                      class="mt-1 accent-blue-700"
                      value="FLOUR_QUANTITY"
                      [(ngModel)]="mode"
                    />
                    <span>
                      <span class="block text-sm font-semibold text-slate-900">
                        Por cantidad de harina
                      </span>
                      <span class="mt-1 block text-xs leading-5 text-slate-600">
                        Calcula las cantidades de la fórmula y el rendimiento previsto a partir de
                        la harina disponible.
                      </span>
                    </span>
                  </label>
                </fieldset>

                @if (mode === 'PRODUCT_COUNT') {
                  <div>
                    <label
                      for="estimateQuantity"
                      class="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Cantidad de piezas
                    </label>
                    <input
                      id="estimateQuantity"
                      name="quantity"
                      type="number"
                      min="1"
                      max="2147483647"
                      step="1"
                      required
                      class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      [(ngModel)]="quantity"
                    />

                    @if (
                      selectedProduct &&
                      (selectedProduct.productionUnit.dimension !== 'COUNT' ||
                        selectedProduct.targetFinishedWeight === null ||
                        selectedProduct.targetWeightUnit === null)
                    ) {
                      <p class="mt-2 text-xs text-amber-700">
                        Este producto necesita una unidad de producción de conteo y un peso
                        terminado para usar esta modalidad.
                      </p>
                    }
                  </div>
                } @else {
                  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        for="flourQuantity"
                        class="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Cantidad de harina
                      </label>
                      <input
                        id="flourQuantity"
                        name="flourQuantity"
                        type="number"
                        min="0.00000001"
                        step="any"
                        required
                        class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        [(ngModel)]="flourQuantity"
                      />
                    </div>

                    <div>
                      <label
                        for="flourUnit"
                        class="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Unidad de harina
                      </label>
                      <select
                        id="flourUnit"
                        name="flourUnitId"
                        class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        [(ngModel)]="flourUnitId"
                        required
                      >
                        <option value="" disabled>Selecciona una unidad</option>
                        @for (unit of massUnits; track unit.id) {
                          <option [value]="unit.id">{{ unit.name }} ({{ unit.symbol }})</option>
                        }
                      </select>
                    </div>
                  </div>

                  @if (massUnits.length === 0) {
                    <p class="text-xs text-amber-700">
                      No se han podido cargar las unidades de masa.
                    </p>
                  }
                }

                <div class="rounded-xl bg-slate-50 p-3.5 text-xs leading-5 text-slate-600">
                  El cálculo utiliza la pérdida de horneado y los porcentajes de la receta
                  publicada. Los costes se calculan con los precios registrados al guardar la
                  estimación.
                </div>

                <button
                  type="submit"
                  class="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
                  [disabled]="!canCreate"
                >
                  @if (saving) {
                    Guardando estimación…
                  } @else {
                    Calcular y guardar estimación
                  }
                </button>
              </form>
            }
          </section>

          <!-- Historial -->
          <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="text-lg font-bold text-slate-900">Historial</h2>
                <p class="mt-1 text-sm text-slate-500">Estimaciones guardadas de este negocio.</p>
              </div>
              <button
                type="button"
                class="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                [disabled]="loadingEstimations"
                (click)="reloadEstimations()"
              >
                Actualizar
              </button>
            </div>

            @if (loadingEstimations) {
              <p class="mt-6 text-sm text-slate-500">Cargando historial…</p>
            } @else if (estimations.length === 0) {
              <div class="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center">
                <p class="text-sm font-semibold text-slate-800">Todavía no hay estimaciones</p>
                <p class="mt-2 text-sm text-slate-500">
                  Cuando guardes el primer cálculo, aparecerá aquí.
                </p>
              </div>
            } @else {
              <div class="mt-5 divide-y divide-slate-100">
                @for (estimation of estimations; track estimation.id) {
                  <button
                    type="button"
                    class="flex w-full items-start justify-between gap-4 rounded-lg px-3 py-4 text-left transition hover:bg-slate-50"
                    [class.bg-blue-50]="selectedEstimation?.id === estimation.id"
                    (click)="viewEstimation(estimation)"
                  >
                    <span class="min-w-0">
                      <span class="block truncate text-sm font-semibold text-slate-900">
                        {{ estimation.productNameSnapshot }}
                      </span>
                      <span class="mt-1 block text-xs text-slate-500">
                        @if (estimation.mode === 'PRODUCT_COUNT') {
                          {{ formatNumber(estimation.plannedProductCount) }} piezas
                        } @else {
                          {{ formatNumber(estimation.flourQuantity) }}
                          {{ estimation.flourUnitSymbol ?? estimation.flourUnitCode }}
                          de harina
                        }
                        · Receta v{{ estimation.recipeVersionNumber }}
                      </span>
                      <span class="mt-1 block text-xs text-slate-400">
                        {{ formatDate(estimation.createdAt) }}
                      </span>
                    </span>

                    <span class="shrink-0 text-right">
                      @if (estimation.estimatedIngredientCost !== null) {
                        <span class="block text-sm font-bold text-slate-900">
                          {{ formatNumber(estimation.estimatedIngredientCost) }}
                        </span>
                        <span class="block text-[10px] text-slate-500">
                          coste de ingredientes
                        </span>
                      } @else {
                        <span class="block text-xs font-semibold text-amber-700">
                          Coste incompleto
                        </span>
                      }
                    </span>
                  </button>
                }
              </div>
            }
          </section>
        </div>

        <!-- Detalle de la estimación -->
        @if (selectedEstimation) {
          <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-200 px-5 py-5 sm:px-6">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p class="text-xs font-bold uppercase tracking-widest text-emerald-700">
                    Resultado guardado
                  </p>
                  <h2 class="mt-1 text-xl font-bold text-slate-900">
                    {{ selectedEstimation.productNameSnapshot }}
                  </h2>
                  <p class="mt-1 text-sm text-slate-500">
                    Receta v{{ selectedEstimation.recipeVersionNumber }}
                    · Pérdida de horneado:
                    {{ formatNumber(selectedEstimation.expectedBakeLossPercent) }}%
                  </p>
                </div>

                <span
                  class="rounded-full px-3 py-1.5 text-xs font-semibold"
                  [class.bg-emerald-50]="selectedEstimation.costingComplete"
                  [class.text-emerald-800]="selectedEstimation.costingComplete"
                  [class.bg-amber-50]="!selectedEstimation.costingComplete"
                  [class.text-amber-800]="!selectedEstimation.costingComplete"
                >
                  {{ selectedEstimation.costingComplete ? 'Costes completos' : 'Faltan precios' }}
                </span>
              </div>
            </div>

            <div
              class="grid grid-cols-2 gap-4 border-b border-slate-100 p-5 sm:grid-cols-4 sm:px-6"
            >
              <div>
                <p class="text-xs text-slate-500">Harina</p>
                <p class="mt-1 text-lg font-bold text-slate-900">
                  {{ formatMassKilograms(selectedEstimation.flourMassGrams) }}
                  <span class="text-xs font-medium text-slate-500">kg</span>
                </p>
              </div>
              <div>
                <p class="text-xs text-slate-500">Masa cruda</p>
                <p class="mt-1 text-lg font-bold text-slate-900">
                  {{ formatMassKilograms(selectedEstimation.rawDoughMassGrams) }}
                  <span class="text-xs font-medium text-slate-500">kg</span>
                </p>
              </div>
              <div>
                <p class="text-xs text-slate-500">Peso terminado previsto</p>
                <p class="mt-1 text-lg font-bold text-slate-900">
                  {{ formatMassKilograms(selectedEstimation.expectedFinishedMassGrams) }}
                  <span class="text-xs font-medium text-slate-500">kg</span>
                </p>
              </div>
              <div>
                <p class="text-xs text-slate-500">Coste conocido de ingredientes</p>
                <p class="mt-1 text-lg font-bold text-slate-900">
                  {{ formatNumber(selectedEstimation.knownIngredientCostSubtotal, 4) }}
                </p>
                <p class="mt-1 text-[10px] text-slate-500">
                  Sin moneda ni costes indirectos añadidos
                </p>
              </div>
            </div>

            @if (!selectedEstimation.costingComplete) {
              <div
                class="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900 sm:px-6"
              >
                No se pudo determinar el coste total porque faltan precios para:
                {{ selectedEstimation.missingPriceIngredientNames.join(', ') }}. El subtotal
                mostrado incluye únicamente los ingredientes con precio.
              </div>
            }

            @if (
              selectedEstimation.mode === 'FLOUR_QUANTITY' &&
              selectedEstimation.theoreticalProductCount !== null
            ) {
              <div class="border-b border-slate-100 px-5 py-4 sm:px-6">
                <p class="text-sm text-slate-700">
                  Rendimiento teórico:
                  <strong>
                    {{ formatNumber(selectedEstimation.theoreticalProductCount, 3) }} piezas
                  </strong>
                  · Piezas completas previstas:
                  <strong>{{ formatNumber(selectedEstimation.wholeProductCount, 0) }}</strong>
                </p>
              </div>
            }

            @if (selectedEstimation.ingredients?.length) {
              <div class="p-5 sm:p-6">
                <h3 class="mb-4 font-semibold text-slate-900">Desglose de ingredientes</h3>

                <div class="overflow-x-auto">
                  <table class="w-full min-w-[780px] border-collapse text-left text-sm">
                    <thead>
                      <tr
                        class="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"
                      >
                        <th class="px-3 py-3 font-semibold">Ingrediente</th>
                        <th class="px-3 py-3 text-right font-semibold">%</th>
                        <th class="px-3 py-3 text-right font-semibold">Masa (g)</th>
                        <th class="px-3 py-3 text-right font-semibold">Volumen (ml)</th>
                        <th class="px-3 py-3 text-right font-semibold">Cantidad base</th>
                        <th class="px-3 py-3 text-right font-semibold">Coste</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (ingredient of selectedEstimation.ingredients; track ingredient.id) {
                        <tr class="border-b border-slate-100 last:border-0">
                          <td class="px-3 py-3">
                            <span class="font-medium text-slate-900">
                              {{ ingredient.nameSnapshot }}
                            </span>
                            @if (ingredient.isFlourBase) {
                              <span
                                class="ml-2 rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-800"
                              >
                                Base
                              </span>
                            }
                          </td>
                          <td class="px-3 py-3 text-right tabular-nums">
                            {{ formatNumber(ingredient.bakerPercentage, 4) }}%
                          </td>
                          <td class="px-3 py-3 text-right tabular-nums">
                            {{ formatNumber(ingredient.ingredientMassGrams, 4) }}
                          </td>
                          <td class="px-3 py-3 text-right tabular-nums">
                            {{
                              ingredient.ingredientVolumeMl === null
                                ? '—'
                                : formatNumber(ingredient.ingredientVolumeMl, 4)
                            }}
                          </td>
                          <td class="px-3 py-3 text-right tabular-nums">
                            {{ formatNumber(ingredient.quantityInBaseUnit, 4) }}
                            {{ ingredient.baseUnitSymbol }}
                          </td>
                          <td class="px-3 py-3 text-right font-medium tabular-nums">
                            {{
                              ingredient.estimatedCost === null
                                ? 'Sin precio'
                                : formatNumber(ingredient.estimatedCost, 4)
                            }}
                          </td>
                        </tr>
                      }
                    </tbody>
                    <tfoot>
                      <tr class="border-t-2 border-slate-200 bg-slate-50">
                        <td colspan="5" class="px-3 py-3 text-right font-semibold text-slate-700">
                          Coste conocido de ingredientes
                        </td>
                        <td class="px-3 py-3 text-right font-bold text-slate-900 tabular-nums">
                          {{ formatNumber(selectedEstimation.knownIngredientCostSubtotal, 4) }}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            } @else {
              <p class="p-6 text-sm text-slate-500">
                No se han cargado los detalles de esta estimación.
              </p>
            }
          </section>
        }
      }
    </section>
  `,
})
export class EstimationsPage {
  readonly auth = inject(AuthService);

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly estimationsService = inject(EstimationsService);
  private readonly productsService = inject(ProductsService);
  private readonly recipesService = inject(RecipesService);

  activeBusinessId: string | null = null;

  products: Product[] = [];
  publishedVersions: RecipeVersion[] = [];
  massUnits: MeasurementUnit[] = [];
  estimations: Estimation[] = [];
  selectedEstimation: Estimation | null = null;

  selectedProductId = '';
  selectedRecipeVersionId = '';
  flourUnitId = '';

  mode: EstimationMode = 'PRODUCT_COUNT';
  quantity = 1000;
  flourQuantity = 25;

  loadingProducts = false;
  loadingVersions = false;
  loadingEstimations = false;
  saving = false;

  pageError: string | null = null;
  successMessage: string | null = null;

  private lastBusinessId: string | null | undefined = undefined;

  constructor() {
    effect(() => {
      const businessId = this.auth.activeBusinessId();

      if (businessId === this.lastBusinessId) {
        return;
      }

      this.lastBusinessId = businessId;
      this.activeBusinessId = businessId;
      this.resetForBusinessChange();

      if (businessId) {
        this.loadBusinessData(businessId);
      } else {
        this.cdr.markForCheck();
      }
    });
  }

  get selectedProduct(): Product | null {
    return this.products.find((product) => product.id === this.selectedProductId) ?? null;
  }

  get canCreate(): boolean {
    if (
      !this.activeBusinessId ||
      this.saving ||
      this.loadingVersions ||
      !this.selectedProductId ||
      !this.selectedRecipeVersionId
    ) {
      return false;
    }

    if (this.mode === 'PRODUCT_COUNT') {
      const product = this.selectedProduct;

      return (
        Number.isInteger(Number(this.quantity)) &&
        Number(this.quantity) >= 1 &&
        Number(this.quantity) <= 2147483647 &&
        product?.productionUnit.dimension === 'COUNT' &&
        product.targetFinishedWeight !== null &&
        product.targetWeightUnit?.dimension === 'MASS'
      );
    }

    return (
      Number.isFinite(Number(this.flourQuantity)) &&
      Number(this.flourQuantity) > 0 &&
      !!this.flourUnitId &&
      this.massUnits.some((unit) => unit.id === this.flourUnitId)
    );
  }

  private resetForBusinessChange(): void {
    this.products = [];
    this.publishedVersions = [];
    this.massUnits = [];
    this.estimations = [];
    this.selectedEstimation = null;

    this.selectedProductId = '';
    this.selectedRecipeVersionId = '';
    this.flourUnitId = '';

    this.pageError = null;
    this.successMessage = null;

    this.loadingProducts = false;
    this.loadingVersions = false;
    this.loadingEstimations = false;
    this.saving = false;
  }

  private loadBusinessData(businessId: string): void {
    this.loadProducts(businessId);
    this.loadMassUnits();
    this.loadEstimations(businessId);
  }

  private loadProducts(businessId: string): void {
    this.loadingProducts = true;

    this.productsService
      .getAll(businessId)
      .pipe(
        finalize(() => {
          this.loadingProducts = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          this.products = response.products.filter((product) => product.isActive);

          if (this.products.length > 0) {
            this.selectedProductId = this.products[0].id;
            this.loadRecipeVersions(businessId, this.selectedProductId);
          }
        },
        error: (error: unknown) => {
          this.pageError = apiErrorMessage(error);
        },
      });
  }

  private loadMassUnits(): void {
    this.estimationsService.getMassUnits().subscribe({
      next: (units) => {
        this.massUnits = units.filter((unit) => unit.dimension === 'MASS');

        if (this.massUnits.length > 0) {
          const kilogram = this.massUnits.find((unit) => unit.code === 'kg');
          this.flourUnitId = (kilogram ?? this.massUnits[0]).id;
        }

        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        this.pageError = apiErrorMessage(error);
        this.cdr.markForCheck();
      },
    });
  }

  private loadEstimations(businessId: string): void {
    this.loadingEstimations = true;

    this.estimationsService
      .getAll(businessId)
      .pipe(
        finalize(() => {
          this.loadingEstimations = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (estimations) => {
          this.estimations = estimations;
        },
        error: (error: unknown) => {
          this.pageError = apiErrorMessage(error);
        },
      });
  }

  onProductChange(productId: string): void {
    this.selectedProductId = productId;
    this.selectedRecipeVersionId = '';
    this.publishedVersions = [];
    this.selectedEstimation = null;
    this.pageError = null;
    this.successMessage = null;

    if (this.activeBusinessId && productId) {
      this.loadRecipeVersions(this.activeBusinessId, productId);
    }
  }

  private loadRecipeVersions(businessId: string, productId: string): void {
    this.loadingVersions = true;
    this.selectedRecipeVersionId = '';
    this.publishedVersions = [];

    this.recipesService
      .getVersions(businessId, productId)
      .pipe(
        finalize(() => {
          this.loadingVersions = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          this.publishedVersions = response.versions
            .filter((version) => version.status === 'PUBLISHED')
            .sort((a, b) => b.versionNumber - a.versionNumber);

          if (this.publishedVersions.length > 0) {
            this.selectedRecipeVersionId = this.publishedVersions[0].id;
          }
        },
        error: (error: unknown) => {
          this.pageError = apiErrorMessage(error);
        },
      });
  }

  createEstimation(): void {
    if (!this.canCreate || !this.activeBusinessId) {
      return;
    }

    const request: CreateEstimationRequest = {
      productId: this.selectedProductId,
      recipeVersionId: this.selectedRecipeVersionId,
      mode: this.mode,
    };

    if (this.mode === 'PRODUCT_COUNT') {
      request.quantity = Number(this.quantity);
    } else {
      request.flourQuantity = Number(this.flourQuantity);
      request.flourUnitId = this.flourUnitId;
    }

    this.saving = true;
    this.pageError = null;
    this.successMessage = null;

    this.estimationsService
      .create(this.activeBusinessId, request)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (estimation) => {
          this.selectedEstimation = estimation;
          this.estimations = [
            estimation,
            ...this.estimations.filter((item) => item.id !== estimation.id),
          ];
          this.successMessage = 'La estimación se calculó y guardó correctamente.';
          this.cdr.markForCheck();
        },
        error: (error: unknown) => {
          this.pageError = apiErrorMessage(error);
        },
      });
  }

  viewEstimation(estimation: Estimation): void {
    if (!this.activeBusinessId) {
      return;
    }

    this.pageError = null;
    this.successMessage = null;

    this.estimationsService.getOne(this.activeBusinessId, estimation.id).subscribe({
      next: (detail) => {
        this.selectedEstimation = detail;
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        this.pageError = apiErrorMessage(error);
        this.cdr.markForCheck();
      },
    });
  }

  reloadEstimations(): void {
    if (!this.activeBusinessId) {
      return;
    }

    this.selectedEstimation = null;
    this.loadEstimations(this.activeBusinessId);
  }

  formatMassKilograms(value: string | number): string {
    return this.formatNumber(Number(value) / 1000, 4);
  }

  formatNumber(value: string | number | null | undefined, maximumFractionDigits = 2): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
      return '—';
    }

    return new Intl.NumberFormat('es-ES', {
      maximumFractionDigits,
      minimumFractionDigits: 0,
    }).format(number);
  }

  formatDate(value: string): string {
    const date = new Date(value);

    if (!Number.isFinite(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }
}
