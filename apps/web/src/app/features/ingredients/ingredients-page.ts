import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzMessageService } from 'ng-zorro-antd/message';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../core/api-error';
import { IngredientsService } from '../../core/ingredients/ingredients.service';
import { Ingredient, IngredientPriceHistoryItem } from '../../core/models/ingredient.models';
import { MeasurementDimension, MeasurementUnit } from '../../core/models/measurement-unit.models';
import { MeasurementUnitsService } from '../../core/measurement-units/measurement-units.service';

@Component({
  selector: 'app-ingredients-page',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
    NzTableModule,
    NzTagModule,
  ],
  template: `
    <main class="mx-auto w-full max-w-7xl space-y-6">
      <header class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p class="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
            CATÁLOGO DEL NEGOCIO
          </p>

          <h1 class="text-3xl font-bold tracking-tight text-slate-900">Ingredientes</h1>

          <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Gestiona las materias primas, sus unidades y el historial de precios de compra para
            calcular costes de producción.
          </p>

          <p class="mt-2 text-xs text-slate-500">
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
          [disabled]="!auth.activeBusinessId() || loadingUnits()"
          (click)="openCreateModal()"
        >
          + Agregar ingrediente
        </button>
      </header>

      @if (pageError()) {
        <nz-alert nzType="error" nzShowIcon [nzMessage]="pageError()!" />
      }

      @if (unitsError()) {
        <nz-alert nzType="error" nzShowIcon [nzMessage]="unitsError()!" />
      }

      <section class="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div
          class="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <div>
            <h2 class="font-semibold text-slate-900">Materias primas registradas</h2>
            <p class="mt-1 text-xs text-slate-500">
              {{ filteredIngredients().length }} ingrediente(s)
            </p>
          </div>

          <div class="w-full sm:max-w-xs">
            <input
              nz-input
              type="search"
              aria-label="Buscar ingredientes"
              placeholder="Buscar por nombre..."
              [value]="searchTerm()"
              (input)="setSearch($event)"
            />
          </div>
        </div>

        <nz-table
          #ingredientTable
          [nzData]="filteredIngredients()"
          [nzLoading]="loading()"
          [nzPageSize]="10"
          [nzShowPagination]="true"
          [nzNoResult]="
            searchTerm()
              ? 'No hay resultados para la búsqueda.'
              : 'Todavía no hay ingredientes registrados.'
          "
        >
          <thead>
            <tr>
              <th>Ingrediente</th>
              <th>Unidad base</th>
              <th>Precio de compra</th>
              <th>Coste por unidad base</th>
              <th>Estado</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>

          <tbody>
            @for (ingredient of ingredientTable.data; track ingredient.id) {
              <tr>
                <td>
                  <div class="font-semibold text-slate-900">
                    {{ ingredient.name }}
                  </div>
                  @if (ingredient.description) {
                    <p class="mt-1 max-w-xs text-xs text-slate-500">
                      {{ ingredient.description }}
                    </p>
                  }
                </td>

                <td>
                  <span
                    class="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"
                  >
                    {{ ingredient.baseUnit.symbol }}
                  </span>
                  <p class="mt-1 text-xs text-slate-500">
                    {{ ingredient.baseUnit.name }}
                  </p>
                </td>

                <td>
                  @if (ingredient.latestPrice; as price) {
                    <p class="font-semibold text-slate-900">
                      {{ formatMoney(price.totalPrice) }} CUP
                    </p>
                    <p class="mt-1 text-xs text-slate-500">
                      {{ price.purchaseQuantity }}
                      {{ price.purchaseUnit.symbol }}
                    </p>
                    <p class="mt-1 text-xs text-slate-400">
                      {{ price.effectiveFrom | date: 'shortDate' }}
                    </p>
                  } @else {
                    <nz-tag nzColor="orange">Sin precio</nz-tag>
                  }
                </td>

                <td>
                  @if (ingredient.latestPrice; as price) {
                    <p class="font-semibold text-emerald-800">
                      {{ formatMoney(price.costPerBaseUnit) }} CUP
                    </p>
                    <p class="mt-1 text-xs text-slate-500">por {{ ingredient.baseUnit.symbol }}</p>
                  } @else {
                    <span class="text-sm text-slate-400">—</span>
                  }
                </td>

                <td>
                  <nz-tag [nzColor]="ingredient.isActive ? 'green' : 'default'">
                    {{ ingredient.isActive ? 'Activo' : 'Inactivo' }}
                  </nz-tag>
                </td>

                <td class="text-right">
                  <button
                    nz-button
                    nzType="default"
                    nzSize="small"
                    type="button"
                    (click)="openPriceModal(ingredient)"
                  >
                    Actualizar precio
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </nz-table>
      </section>
    </main>

    <!-- Modal de creación -->
    <nz-modal
      [nzVisible]="createVisible()"
      nzTitle="Agregar ingrediente"
      [nzWidth]="600"
      [nzFooter]="null"
      [nzMaskClosable]="false"
      [nzClosable]="!savingCreate()"
      (nzOnCancel)="closeCreateModal()"
    >
      <ng-container *nzModalContent>
        <p class="mb-5 text-sm leading-6 text-slate-600">
          Define la unidad en la que se calcularán las cantidades y registra el precio de compra de
          una presentación comercial.
        </p>

        @if (createError()) {
          <nz-alert class="mb-4 block" nzType="error" nzShowIcon [nzMessage]="createError()!" />
        }

        <form [formGroup]="createForm" (ngSubmit)="submitCreate()" class="space-y-4" novalidate>
          <div>
            <label for="ingredientName" class="mb-2 block text-sm font-semibold text-slate-700">
              Nombre
            </label>
            <input
              nz-input
              id="ingredientName"
              formControlName="name"
              maxlength="160"
              placeholder="Ej. Harina de trigo"
            />
            @if (createForm.controls.name.touched && createForm.controls.name.invalid) {
              <p class="mt-1 text-xs text-red-600">
                El nombre debe tener entre 2 y 160 caracteres.
              </p>
            }
          </div>

          <div>
            <label
              for="ingredientDescription"
              class="mb-2 block text-sm font-semibold text-slate-700"
            >
              Descripción (opcional)
            </label>
            <textarea
              nz-input
              id="ingredientDescription"
              formControlName="description"
              maxlength="500"
              rows="2"
              placeholder="Marca, tipo de harina u otras características"
            ></textarea>
          </div>

          <div>
            <label for="ingredientBaseUnit" class="mb-2 block text-sm font-semibold text-slate-700">
              Unidad base para los cálculos
            </label>
            <nz-select
              id="ingredientBaseUnit"
              class="w-full"
              formControlName="baseUnitId"
              nzPlaceHolder="Selecciona una unidad"
            >
              @for (unit of units(); track unit.id) {
                <nz-option [nzValue]="unit.id" [nzLabel]="unit.name + ' (' + unit.symbol + ')'" />
              }
            </nz-select>
          </div>

          <div class="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <h3 class="mb-3 text-sm font-semibold text-slate-900">Precio de compra inicial</h3>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  for="purchaseQuantity"
                  class="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Cantidad comprada
                </label>
                <input
                  nz-input
                  id="purchaseQuantity"
                  type="text"
                  inputmode="decimal"
                  min="0.000001"
                  step="any"
                  formControlName="purchaseQuantity"
                  placeholder="Ej. 25"
                />
              </div>

              <div>
                <label for="purchaseUnit" class="mb-2 block text-sm font-semibold text-slate-700">
                  Unidad de compra
                </label>
                <nz-select
                  id="purchaseUnit"
                  class="w-full"
                  formControlName="purchaseUnitId"
                  nzPlaceHolder="Selecciona una unidad"
                >
                  @for (unit of purchaseUnits(); track unit.id) {
                    <nz-option
                      [nzValue]="unit.id"
                      [nzLabel]="unit.name + ' (' + unit.symbol + ')'"
                    />
                  }
                </nz-select>
              </div>

              <div class="sm:col-span-2">
                <label for="purchasePrice" class="mb-2 block text-sm font-semibold text-slate-700">
                  Precio total de compra (CUP)
                </label>
                <input
                  nz-input
                  id="purchasePrice"
                  type="text"
                  inputmode="decimal"
                  min="0.0001"
                  step="any"
                  formControlName="totalPrice"
                  placeholder="Ej. 1200"
                />
                <p class="mt-1 text-xs text-slate-500">
                  Se guardará como precio inicial del ingrediente.
                </p>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              nz-button
              type="button"
              [disabled]="savingCreate()"
              (click)="closeCreateModal()"
            >
              Cancelar
            </button>

            <button
              nz-button
              nzType="primary"
              type="submit"
              [nzLoading]="savingCreate()"
              [disabled]="createForm.invalid || savingCreate()"
            >
              Guardar ingrediente
            </button>
          </div>
        </form>
      </ng-container>
    </nz-modal>

    <!-- Modal para registrar un precio nuevo y consultar el historial -->
    <nz-modal
      [nzVisible]="priceVisible()"
      nzTitle="Precios de compra"
      [nzWidth]="620"
      [nzFooter]="null"
      [nzMaskClosable]="false"
      [nzClosable]="!savingPrice()"
      (nzOnCancel)="closePriceModal()"
    >
      <ng-container *nzModalContent>
        @if (selectedIngredient(); as ingredient) {
          <div class="mb-5 rounded-xl bg-slate-50 p-4">
            <p class="font-semibold text-slate-900">{{ ingredient.name }}</p>
            <p class="mt-1 text-xs text-slate-500">
              Coste calculado por {{ ingredient.baseUnit.symbol }}. Cada precio nuevo quedará
              registrado en el historial.
            </p>
          </div>

          @if (priceError()) {
            <nz-alert class="mb-4 block" nzType="error" nzShowIcon [nzMessage]="priceError()!" />
          }

          <form [formGroup]="priceForm" (ngSubmit)="submitPrice()" class="space-y-4" novalidate>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  for="newPurchaseQuantity"
                  class="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Cantidad comprada
                </label>
                <input
                  nz-input
                  id="newPurchaseQuantity"
                  type="text"
                  inputmode="decimal"
                  min="0.000001"
                  step="any"
                  formControlName="purchaseQuantity"
                />
              </div>

              <div>
                <label
                  for="newPurchaseUnit"
                  class="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Unidad de compra
                </label>
                <nz-select id="newPurchaseUnit" class="w-full" formControlName="purchaseUnitId">
                  @for (unit of pricePurchaseUnits(); track unit.id) {
                    <nz-option
                      [nzValue]="unit.id"
                      [nzLabel]="unit.name + ' (' + unit.symbol + ')'"
                    />
                  }
                </nz-select>
              </div>

              <div class="sm:col-span-2">
                <label
                  for="newPurchasePrice"
                  class="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Nuevo precio total (CUP)
                </label>
                <input
                  nz-input
                  id="newPurchasePrice"
                  type="text"
                  inputmode="decimal"
                  min="0.0001"
                  step="any"
                  formControlName="totalPrice"
                  placeholder="Introduce el precio actual"
                />
              </div>
            </div>

            <div class="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                nz-button
                type="button"
                [disabled]="savingPrice()"
                (click)="closePriceModal()"
              >
                Cerrar
              </button>

              <button
                nz-button
                nzType="primary"
                type="submit"
                [nzLoading]="savingPrice()"
                [disabled]="priceForm.invalid || savingPrice()"
              >
                Registrar nuevo precio
              </button>
            </div>
          </form>

          <div class="mt-6 border-t border-slate-100 pt-5">
            <h3 class="mb-3 font-semibold text-slate-900">Historial de precios</h3>

            @if (historyLoading()) {
              <p class="text-sm text-slate-500">Cargando historial...</p>
            } @else if (priceHistory().length === 0) {
              <p class="text-sm text-slate-500">Todavía no hay precios registrados.</p>
            } @else {
              <div class="space-y-2">
                @for (price of priceHistory(); track price.id) {
                  <div
                    class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 p-3"
                  >
                    <div>
                      <p class="text-sm font-semibold text-slate-800">
                        {{ formatMoney(price.totalPrice) }} CUP
                      </p>
                      <p class="mt-1 text-xs text-slate-500">
                        {{ price.purchaseQuantity }}
                        {{ price.purchaseUnit.symbol }}
                        · {{ price.effectiveFrom | date: 'shortDate' }}
                      </p>
                    </div>

                    <p class="text-sm font-semibold text-emerald-800">
                      {{ formatMoney(price.costPerBaseUnit) }}
                      CUP/{{ ingredient.baseUnit.symbol }}
                    </p>
                  </div>
                }
              </div>
            }
          </div>
        }
      </ng-container>
    </nz-modal>
  `,
})
export class IngredientsPage {
  readonly auth = inject(AuthService);

  private readonly fb = inject(FormBuilder);
  private readonly ingredientsApi = inject(IngredientsService);
  private readonly unitsApi = inject(MeasurementUnitsService);
  private readonly message = inject(NzMessageService);

  readonly ingredients = signal<Ingredient[]>([]);
  readonly units = signal<MeasurementUnit[]>([]);
  readonly loading = signal(false);
  readonly loadingUnits = signal(true);
  readonly pageError = signal<string | null>(null);
  readonly unitsError = signal<string | null>(null);
  readonly searchTerm = signal('');

  readonly createVisible = signal(false);
  readonly savingCreate = signal(false);
  readonly createError = signal<string | null>(null);

  readonly priceVisible = signal(false);
  readonly savingPrice = signal(false);
  readonly priceError = signal<string | null>(null);
  readonly selectedIngredient = signal<Ingredient | null>(null);
  readonly priceHistory = signal<IngredientPriceHistoryItem[]>([]);
  readonly historyLoading = signal(false);

  readonly selectedBaseDimension = signal<MeasurementDimension | null>(null);

  readonly filteredIngredients = computed(() => {
    const term = this.searchTerm().trim().toLocaleLowerCase();

    if (!term) {
      return this.ingredients();
    }

    return this.ingredients().filter((ingredient) =>
      [
        ingredient.name,
        ingredient.description ?? '',
        ingredient.baseUnit.name,
        ingredient.baseUnit.symbol,
      ].some((value) => value.toLocaleLowerCase().includes(term)),
    );
  });

  readonly purchaseUnits = computed(() => {
    const dimension = this.selectedBaseDimension();

    return this.units().filter((unit) => dimension !== null && unit.dimension === dimension);
  });

  readonly pricePurchaseUnits = computed(() => {
    const dimension = this.selectedIngredient()?.baseUnit.dimension ?? null;

    return this.units().filter((unit) => dimension !== null && unit.dimension === dimension);
  });

  readonly createForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(160)]],
    description: ['', [Validators.maxLength(500)]],
    baseUnitId: ['', [Validators.required]],
    purchaseQuantity: [
      '25',
      [
        Validators.required,
        Validators.pattern(/^\d{1,12}(?:\.\d{1,6})?$/),
        Validators.min(0.000001),
      ],
    ],
    purchaseUnitId: ['', [Validators.required]],
    totalPrice: [
      '',
      [Validators.required, Validators.pattern(/^\d{1,14}(?:\.\d{1,4})?$/), Validators.min(0.0001)],
    ],
  });

  readonly priceForm = this.fb.nonNullable.group({
    purchaseQuantity: [
      '25',
      [
        Validators.required,
        Validators.pattern(/^\d{1,12}(?:\.\d{1,6})?$/),
        Validators.min(0.000001),
      ],
    ],
    purchaseUnitId: ['', [Validators.required]],
    totalPrice: [
      '',
      [Validators.required, Validators.pattern(/^\d{1,14}(?:\.\d{1,4})?$/), Validators.min(0.0001)],
    ],
  });

  private requestSequence = 0;

  constructor() {
    effect(() => {
      const businessId = this.auth.activeBusinessId();

      if (!businessId) {
        this.requestSequence++;
        this.ingredients.set([]);
        this.loading.set(false);
        return;
      }

      this.loadIngredients(businessId);
    });

    this.createForm.controls.baseUnitId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((unitId) => this.adjustPurchaseUnit(unitId));

    this.unitsApi.getAll().subscribe({
      next: (units: any) => {
        this.units.set(units);
        this.loadingUnits.set(false);

        const baseUnit =
          units.find((unit: any) => unit.code === 'g') ?? units.find((unit: any) => unit.isBase);

        const purchaseUnit = units.find((unit: any) => unit.code === 'kg') ?? baseUnit;

        if (baseUnit) {
          this.selectedBaseDimension.set(baseUnit.dimension);

          this.createForm.patchValue({
            baseUnitId: baseUnit.id,
            purchaseUnitId:
              purchaseUnit?.dimension === baseUnit.dimension ? purchaseUnit.id : baseUnit.id,
          });
        }
      },
      error: (error: unknown) => {
        this.loadingUnits.set(false);
        this.unitsError.set(apiErrorMessage(error));
      },
    });
  }

  setSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  formatMoney(value: string): string {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
      return '—';
    }

    return new Intl.NumberFormat('es-CU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  }

  openCreateModal(): void {
    if (!this.auth.activeBusinessId() || this.units().length === 0) {
      this.pageError.set(
        'Selecciona un negocio y comprueba que las unidades de medida estén disponibles.',
      );
      return;
    }

    const baseUnit =
      this.units().find((unit) => unit.code === 'g') ?? this.units().find((unit) => unit.isBase);

    const purchaseUnit = this.units().find((unit) => unit.code === 'kg') ?? baseUnit;

    if (!baseUnit || !purchaseUnit) {
      this.pageError.set('No hay unidades de medida disponibles.');
      return;
    }

    this.createError.set(null);
    this.createForm.reset({
      name: '',
      description: '',
      baseUnitId: baseUnit.id,
      purchaseQuantity: '25',
      purchaseUnitId: purchaseUnit.dimension === baseUnit.dimension ? purchaseUnit.id : baseUnit.id,
      totalPrice: '',
    });

    this.selectedBaseDimension.set(baseUnit.dimension);
    this.createVisible.set(true);
  }

  closeCreateModal(): void {
    if (!this.savingCreate()) {
      this.createVisible.set(false);
      this.createError.set(null);
    }
  }

  submitCreate(): void {
    if (this.createForm.invalid || this.savingCreate()) {
      this.createForm.markAllAsTouched();
      return;
    }

    const businessId = this.auth.activeBusinessId();

    if (!businessId) {
      this.createError.set('No hay un negocio activo.');
      return;
    }

    const value = this.createForm.getRawValue();

    this.createError.set(null);
    this.savingCreate.set(true);

    this.ingredientsApi
      .create(businessId, {
        name: value.name.trim(),
        description: value.description.trim() || undefined,
        baseUnitId: value.baseUnitId,
        initialPrice: {
          purchaseQuantity: value.purchaseQuantity,
          purchaseUnitId: value.purchaseUnitId,
          totalPrice: value.totalPrice,
        },
      })
      .pipe(finalize(() => this.savingCreate.set(false)))
      .subscribe({
        next: (ingredient) => {
          if (this.auth.activeBusinessId() === businessId) {
            this.ingredients.update((current) =>
              [...current, ingredient].sort((a, b) => a.name.localeCompare(b.name)),
            );
          }

          this.createVisible.set(false);
          this.message.success(`Ingrediente "${ingredient.name}" creado correctamente.`);
        },
        error: (error: unknown) => {
          this.createError.set(apiErrorMessage(error));
        },
      });
  }

  openPriceModal(ingredient: Ingredient): void {
    const latest = ingredient.latestPrice;

    this.selectedIngredient.set(ingredient);
    this.priceError.set(null);
    this.priceHistory.set([]);
    this.priceVisible.set(true);

    this.priceForm.reset({
      purchaseQuantity: latest?.purchaseQuantity ?? '25',
      purchaseUnitId: latest?.purchaseUnit.id ?? ingredient.baseUnit.id,
      totalPrice: '',
    });

    this.loadPriceHistory(ingredient.id);
  }

  closePriceModal(): void {
    if (!this.savingPrice()) {
      this.priceVisible.set(false);
      this.selectedIngredient.set(null);
      this.priceHistory.set([]);
      this.priceError.set(null);
    }
  }

  submitPrice(): void {
    if (this.priceForm.invalid || this.savingPrice()) {
      this.priceForm.markAllAsTouched();
      return;
    }

    const businessId = this.auth.activeBusinessId();
    const ingredient = this.selectedIngredient();

    if (!businessId || !ingredient) {
      this.priceError.set('No se pudo identificar el negocio o ingrediente.');
      return;
    }

    this.priceError.set(null);
    this.savingPrice.set(true);

    this.ingredientsApi
      .addPrice(businessId, ingredient.id, this.priceForm.getRawValue())
      .pipe(finalize(() => this.savingPrice.set(false)))
      .subscribe({
        next: (updatedIngredient) => {
          if (this.auth.activeBusinessId() === businessId) {
            this.ingredients.update((current) =>
              current.map((item) => (item.id === updatedIngredient.id ? updatedIngredient : item)),
            );
          }

          this.selectedIngredient.set(updatedIngredient);
          this.priceForm.controls.totalPrice.reset('');
          this.message.success('Nuevo precio registrado.');

          this.loadPriceHistory(updatedIngredient.id);
        },
        error: (error: unknown) => {
          this.priceError.set(apiErrorMessage(error));
        },
      });
  }

  private loadIngredients(businessId: string): void {
    const sequence = ++this.requestSequence;

    this.loading.set(true);
    this.pageError.set(null);

    this.ingredientsApi
      .getAll(businessId)
      .pipe(
        finalize(() => {
          if (sequence === this.requestSequence) {
            this.loading.set(false);
          }
        }),
      )
      .subscribe({
        next: (response) => {
          if (sequence === this.requestSequence && this.auth.activeBusinessId() === businessId) {
            this.ingredients.set(response.ingredients);
          }
        },
        error: (error: unknown) => {
          if (sequence === this.requestSequence) {
            this.ingredients.set([]);
            this.pageError.set(apiErrorMessage(error));
          }
        },
      });
  }

  private loadPriceHistory(ingredientId: string): void {
    const businessId = this.auth.activeBusinessId();

    if (!businessId) {
      return;
    }

    this.historyLoading.set(true);

    this.ingredientsApi
      .getPriceHistory(businessId, ingredientId)
      .pipe(finalize(() => this.historyLoading.set(false)))
      .subscribe({
        next: (response) => {
          if (this.selectedIngredient()?.id === ingredientId) {
            this.priceHistory.set(response.prices);
          }
        },
        error: (error: unknown) => {
          if (this.selectedIngredient()?.id === ingredientId) {
            this.priceError.set(apiErrorMessage(error));
          }
        },
      });
  }

  private adjustPurchaseUnit(unitId: string): void {
    const selectedUnit = this.units().find((unit) => unit.id === unitId);

    if (!selectedUnit) {
      return;
    }

    this.selectedBaseDimension.set(selectedUnit.dimension);

    const currentPurchaseUnit = this.units().find(
      (unit) => unit.id === this.createForm.controls.purchaseUnitId.value,
    );

    if (!currentPurchaseUnit || currentPurchaseUnit.dimension !== selectedUnit.dimension) {
      this.createForm.controls.purchaseUnitId.setValue(selectedUnit.id);
    }
  }
}
