import { computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, Observable } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzMessageService } from 'ng-zorro-antd/message';

import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../core/api-error';
import { ProductsService } from '../../core/products/products.service';
import { MeasurementUnitsService } from '../../core/measurement-units/measurement-units.service';
import type { Product } from '../../core/models/product.models';
import type { MeasurementUnit } from '../../core/models/measurement-unit.models';
import type { CreateProductRequest, UpdateProductRequest } from '../../core/models/product.models';

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [
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
    <main class="mx-auto w-full min-w-0 max-w-7xl space-y-5 sm:space-y-6">
      <!-- Encabezado -->
      <header class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div class="min-w-0">
          <p class="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
            CATÁLOGO DEL NEGOCIO
          </p>

          <h1 class="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Productos</h1>

          <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Define qué productos fabrica cada panadería, su unidad de producción y el peso terminado
            objetivo cuando corresponda.
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
          [disabled]="!auth.activeBusinessId() || loadingUnits()"
          (click)="openCreateModal()"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
          Agregar producto
        </button>
      </header>

      <!-- Errores -->
      @if (pageError()) {
        <nz-alert nzType="error" nzShowIcon [nzMessage]="pageError()!" />
      }

      @if (unitsError()) {
        <nz-alert nzType="error" nzShowIcon [nzMessage]="unitsError()!" />
      }

      <!-- Catálogo -->
      <section
        class="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div
          class="grid gap-4 border-b border-slate-100 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] lg:items-center"
        >
          <div class="min-w-0">
            <h2 class="font-semibold text-slate-900">Catálogo de productos</h2>

            <p class="mt-1 text-xs text-slate-500">{{ filteredProducts().length }} producto(s)</p>
          </div>

          <input
            nz-input
            type="search"
            aria-label="Buscar productos"
            placeholder="Buscar por nombre..."
            class="min-h-11 w-full"
            [value]="searchTerm()"
            (input)="setSearch($event)"
          />
        </div>

        <nz-table
          #productTable
          [nzData]="filteredProducts()"
          [nzLoading]="loading()"
          [nzPageSize]="10"
          [nzShowPagination]="true"
          nzNoResult="Todavía no hay productos registrados."
        >
          <thead>
            <tr>
              <th class="min-w-[155px]">Producto</th>
              <th class="hidden lg:table-cell">Unidad de producción</th>
              <th class="hidden lg:table-cell">Peso terminado objetivo</th>
              <th class="hidden lg:table-cell">Estado</th>
              <th class="w-[125px] text-right lg:w-[210px]">Acciones</th>
            </tr>
          </thead>

          <tbody>
            @for (product of productTable.data; track product.id) {
              <tr>
                <!-- Producto y resumen adaptado a móviles -->
                <td class="min-w-[155px]">
                  <div class="min-w-0">
                    <p class="break-words font-semibold text-slate-900">
                      {{ product.name }}
                    </p>

                    @if (product.description) {
                      <p class="mt-1 max-w-xs break-words text-xs leading-5 text-slate-500">
                        {{ product.description }}
                      </p>
                    }

                    <!-- En móvil agrupamos los datos que aparecen en columnas en escritorio -->
                    <div class="mt-3 flex flex-wrap items-center gap-2 lg:hidden">
                      <span
                        class="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"
                      >
                        {{ product.productionUnit.symbol }}
                      </span>

                      @if (product.targetFinishedWeight && product.targetWeightUnit) {
                        <span
                          class="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800"
                        >
                          {{ product.targetFinishedWeight }}
                          {{ product.targetWeightUnit.symbol }}
                        </span>
                      } @else {
                        <span class="text-xs text-slate-500"> Sin peso objetivo </span>
                      }

                      <nz-tag [nzColor]="product.isActive ? 'green' : 'default'">
                        {{ product.isActive ? 'Activo' : 'Inactivo' }}
                      </nz-tag>
                    </div>
                  </div>
                </td>

                <!-- Unidad de producción: escritorio -->
                <td class="hidden lg:table-cell">
                  <span
                    class="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"
                  >
                    {{ product.productionUnit.symbol }}
                  </span>

                  <p class="mt-1 text-xs text-slate-500">
                    {{ product.productionUnit.name }}
                  </p>
                </td>

                <!-- Peso terminado: escritorio -->
                <td class="hidden lg:table-cell">
                  @if (product.targetFinishedWeight && product.targetWeightUnit) {
                    <span class="font-semibold text-slate-900">
                      {{ product.targetFinishedWeight }}
                      {{ product.targetWeightUnit.symbol }}
                    </span>
                  } @else {
                    <span class="text-sm text-slate-400"> No definido </span>
                  }
                </td>

                <!-- Estado: escritorio -->
                <td class="hidden lg:table-cell">
                  <nz-tag [nzColor]="product.isActive ? 'green' : 'default'">
                    {{ product.isActive ? 'Activo' : 'Inactivo' }}
                  </nz-tag>
                </td>

                <!-- Acciones -->
                <td class="text-right">
                  <div class="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:justify-end">
                    <button
                      nz-button
                      nzType="default"
                      nzSize="small"
                      type="button"
                      class="app-btn app-btn-secondary app-btn-icon"
                      aria-label="Editar producto"
                      title="Editar producto"
                      (click)="openEditModal(product)"
                    >
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="m15 5 4 4M4 20l4.5-1 10.9-10.9a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z"
                          stroke="currentColor"
                          stroke-width="1.7"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </button>

                    <button
                      nz-button
                      nzType="default"
                      nzSize="small"
                      type="button"
                      class="app-btn app-btn-icon"
                      [attr.aria-label]="product.isActive ? 'Desactivar producto' : 'Activar producto'"
                      [attr.title]="product.isActive ? 'Desactivar producto' : 'Activar producto'"
                      [class.app-btn-danger]="product.isActive"
                      [class.app-btn-secondary]="!product.isActive"
                      [disabled]="isChangingState(product.id)"
                      [nzLoading]="isChangingState(product.id)"
                      (click)="toggleActive(product)"
                    >
                      @if (product.isActive) {
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path
                            d="M4 8h16l-1.2 11H5.2L4 8Zm3 0 1-4h8l1 4m-5 4v3"
                            stroke="currentColor"
                            stroke-width="1.7"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      } @else {
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path
                            d="M4 12a8 8 0 1 0 2.3-5.7L4 8.5M4 4v4.5h4.5m3.5-1v5l3 2"
                            stroke="currentColor"
                            stroke-width="1.7"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      }
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </nz-table>
      </section>
    </main>

    <!-- Modal para crear o editar productos -->
    <nz-modal
      [nzVisible]="editorVisible()"
      [nzTitle]="editingProduct() ? 'Editar producto' : 'Agregar producto'"
      [nzWidth]="'min(600px, calc(100vw - 24px))'"
      [nzFooter]="null"
      [nzMaskClosable]="false"
      [nzClosable]="!saving()"
      (nzOnCancel)="closeEditor()"
    >
      <ng-container *nzModalContent>
        <p class="mb-5 text-sm leading-6 text-slate-600">
          Registra la información básica que necesitaremos para asociar recetas y calcular las
          estimaciones de producción.
        </p>

        @if (editorError()) {
          <nz-alert class="mb-4 block" nzType="error" nzShowIcon [nzMessage]="editorError()!" />
        }

        <form [formGroup]="form" (ngSubmit)="saveProduct()" class="space-y-5" novalidate>
          <!-- Nombre -->
          <div>
            <label for="productName" class="mb-2 block text-sm font-semibold text-slate-700">
              Nombre del producto
            </label>

            <input
              nz-input
              id="productName"
              formControlName="name"
              maxlength="160"
              placeholder="Ej. Pan de 35 gramos"
              class="min-h-11 w-full"
            />

            @if (form.controls.name.touched && form.controls.name.invalid) {
              <p class="mt-2 text-xs leading-5 text-red-600">
                El nombre debe tener entre 2 y 160 caracteres.
              </p>
            }
          </div>

          <!-- Descripción -->
          <div>
            <label for="productDescription" class="mb-2 block text-sm font-semibold text-slate-700">
              Descripción (opcional)
            </label>

            <textarea
              nz-input
              id="productDescription"
              formControlName="description"
              maxlength="500"
              rows="3"
              placeholder="Características del producto"
              class="w-full"
            ></textarea>
          </div>

          <!-- Unidad de producción -->
          <div>
            <label for="productionUnit" class="mb-2 block text-sm font-semibold text-slate-700">
              Unidad de producción
            </label>

            <nz-select
              id="productionUnit"
              class="w-full"
              formControlName="productionUnitId"
              nzPlaceHolder="Selecciona una unidad"
            >
              @for (unit of productionUnits(); track unit.id) {
                <nz-option [nzValue]="unit.id" [nzLabel]="unit.name + ' (' + unit.symbol + ')'" />
              }
            </nz-select>

            <p class="mt-2 text-xs leading-5 text-slate-500">
              Por ejemplo, unidades o kilogramos, según cómo se mida la producción.
            </p>
          </div>

          <!-- Peso terminado -->
          @if (showTargetWeight()) {
            <section class="rounded-xl border border-blue-100 bg-blue-50/50 p-4 sm:p-5">
              <h3 class="text-sm font-semibold text-slate-900">Peso terminado objetivo</h3>

              <p class="mb-4 mt-2 text-xs leading-5 text-slate-600">
                Es el peso esperado del producto después del horneado y enfriamiento, no el peso de
                la masa cruda.
              </p>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label for="targetWeight" class="mb-2 block text-sm font-semibold text-slate-700">
                    Peso (opcional)
                  </label>

                  <input
                    nz-input
                    id="targetWeight"
                    type="text"
                    inputmode="decimal"
                    formControlName="targetFinishedWeight"
                    placeholder="Ej. 35"
                    class="min-h-11 w-full"
                  />

                  @if (
                    form.controls.targetFinishedWeight.touched &&
                    form.controls.targetFinishedWeight.invalid
                  ) {
                    <p class="mt-2 text-xs leading-5 text-red-600">
                      Introduce un peso positivo con hasta 6 decimales.
                    </p>
                  }
                </div>

                <div>
                  <label
                    for="targetWeightUnit"
                    class="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Unidad del peso
                  </label>

                  <nz-select
                    id="targetWeightUnit"
                    class="w-full"
                    formControlName="targetWeightUnitId"
                    nzPlaceHolder="Selecciona una unidad"
                  >
                    @for (unit of weightUnits(); track unit.id) {
                      <nz-option
                        [nzValue]="unit.id"
                        [nzLabel]="unit.name + ' (' + unit.symbol + ')'"
                      />
                    }
                  </nz-select>
                </div>
              </div>

              <p class="mt-3 text-xs leading-5 text-slate-500">
                Puedes dejar ambos campos vacíos si aún no conoces el peso objetivo.
              </p>
            </section>
          }

          <!-- Botones -->
          <div
            class="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"
          >
            <button
              nz-button
              type="button"
              class="app-btn app-btn-secondary min-h-11 w-full sm:w-auto"
              [disabled]="saving()"
              (click)="closeEditor()"
            >
              Cancelar
            </button>

            <button
              nz-button
              nzType="primary"
              type="submit"
              class="app-btn app-btn-primary min-h-11 w-full sm:w-auto"
              [nzLoading]="saving()"
              [disabled]="form.invalid || saving()"
            >
              {{ editingProduct() ? 'Guardar cambios' : 'Crear producto' }}
            </button>
          </div>
        </form>
      </ng-container>
    </nz-modal>
  `,
})
export class ProductsPage {
  readonly auth = inject(AuthService);

  private readonly fb = inject(FormBuilder);
  private readonly productsApi = inject(ProductsService);
  private readonly unitsApi = inject(MeasurementUnitsService);
  private readonly message = inject(NzMessageService);

  readonly products = signal<Product[]>([]);
  readonly units = signal<MeasurementUnit[]>([]);

  readonly loading = signal(false);
  readonly loadingUnits = signal(true);
  readonly pageError = signal<string | null>(null);
  readonly unitsError = signal<string | null>(null);
  readonly searchTerm = signal('');

  readonly editorVisible = signal(false);
  readonly saving = signal(false);
  readonly editorError = signal<string | null>(null);
  readonly editingProduct = signal<Product | null>(null);
  readonly savingStateIds = signal<string[]>([]);

  readonly selectedProductionUnit = signal<MeasurementUnit | null>(null);

  readonly filteredProducts = computed(() => {
    const term = this.searchTerm().trim().toLocaleLowerCase();

    if (!term) {
      return this.products();
    }

    return this.products().filter((product) =>
      [
        product.name,
        product.description ?? '',
        product.productionUnit.name,
        product.productionUnit.symbol,
      ].some((value) => value.toLocaleLowerCase().includes(term)),
    );
  });

  readonly productionUnits = computed(() =>
    this.units().filter((unit) => unit.dimension === 'COUNT' || unit.dimension === 'MASS'),
  );

  readonly weightUnits = computed(() => this.units().filter((unit) => unit.dimension === 'MASS'));

  readonly showTargetWeight = computed(() => this.selectedProductionUnit()?.dimension === 'COUNT');

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(160)]],
    description: ['', [Validators.maxLength(500)]],
    productionUnitId: ['', [Validators.required]],
    targetFinishedWeight: [
      '',
      [Validators.pattern(/^\d{1,12}(?:\.\d{1,6})?$/), Validators.min(0.000001)],
    ],
    targetWeightUnitId: [''],
  });

  private requestSequence = 0;

  constructor() {
    this.form.controls.productionUnitId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((unitId) => this.onProductionUnitChanged(unitId));

    effect(() => {
      const businessId = this.auth.activeBusinessId();

      if (!businessId) {
        this.requestSequence++;
        this.products.set([]);
        this.loading.set(false);
        this.pageError.set(null);
        return;
      }

      this.loadProducts(businessId);
    });

    this.unitsApi.getAll().subscribe({
      next: (units) => {
        this.units.set(units);
        this.loadingUnits.set(false);

        const defaultUnit =
          units.find((unit) => unit.code === 'unit') ??
          units.find((unit) => unit.dimension === 'COUNT') ??
          units.find((unit) => unit.dimension === 'MASS');

        if (defaultUnit) {
          this.form.controls.productionUnitId.setValue(defaultUnit.id);
        } else {
          this.unitsError.set('No hay unidades válidas para la producción. Comprueba el catálogo.');
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

  isChangingState(productId: string): boolean {
    return this.savingStateIds().includes(productId);
  }

  openCreateModal(): void {
    const defaultUnit =
      this.units().find((unit) => unit.code === 'unit') ?? this.productionUnits()[0];

    if (!this.auth.activeBusinessId() || !defaultUnit) {
      this.pageError.set(
        'Selecciona un negocio y comprueba que las unidades de medida estén disponibles.',
      );
      return;
    }

    this.editingProduct.set(null);
    this.editorError.set(null);

    this.form.reset({
      name: '',
      description: '',
      productionUnitId: defaultUnit.id,
      targetFinishedWeight: '',
      targetWeightUnitId: '',
    });

    this.editorVisible.set(true);
  }

  openEditModal(product: Product): void {
    this.editingProduct.set(product);
    this.editorError.set(null);

    this.form.reset({
      name: product.name,
      description: product.description ?? '',
      productionUnitId: product.productionUnit.id,
      targetFinishedWeight: product.targetFinishedWeight ?? '',
      targetWeightUnitId: product.targetWeightUnit?.id ?? '',
    });

    this.editorVisible.set(true);
  }

  closeEditor(): void {
    if (this.saving()) {
      return;
    }

    this.editorVisible.set(false);
    this.editorError.set(null);
    this.editingProduct.set(null);
  }

  saveProduct(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const businessId = this.auth.activeBusinessId();

    if (!businessId) {
      this.editorError.set('No hay un negocio activo.');
      return;
    }

    const value = this.form.getRawValue();
    const targetWeight = value.targetFinishedWeight.trim();
    const targetWeightUnitId = value.targetWeightUnitId;
    const hasWeight = targetWeight.length > 0;
    const hasWeightUnit = targetWeightUnitId.length > 0;

    if (hasWeight !== hasWeightUnit) {
      this.editorError.set(
        'Para definir el peso objetivo debes indicar tanto el peso como su unidad. Si no lo conoces, deja ambos campos vacíos.',
      );
      return;
    }

    if (hasWeight && Number(targetWeight) <= 0) {
      this.editorError.set('El peso objetivo debe ser mayor que cero.');
      return;
    }

    const editing = this.editingProduct();
    const common = {
      name: value.name.trim(),
      description: value.description.trim() || null,
      productionUnitId: value.productionUnitId,
    };

    let request$: Observable<Product>;

    if (editing) {
      const request: UpdateProductRequest = {
        ...common,
        targetFinishedWeight: hasWeight ? targetWeight : null,
        targetWeightUnitId: hasWeight ? targetWeightUnitId : null,
      };

      request$ = this.productsApi.update(businessId, editing.id, request);
    } else {
      const request: CreateProductRequest = {
        ...common,
        ...(hasWeight
          ? {
              targetFinishedWeight: targetWeight,
              targetWeightUnitId,
            }
          : {}),
      };

      request$ = this.productsApi.create(businessId, request);
    }

    this.editorError.set(null);
    this.saving.set(true);

    request$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (product) => {
        if (this.auth.activeBusinessId() !== businessId) {
          this.closeEditor();
          return;
        }

        this.products.update((current) => {
          const exists = current.some((item) => item.id === product.id);

          const updated = exists
            ? current.map((item) => (item.id === product.id ? product : item))
            : [...current, product];

          return updated.sort((a, b) => a.name.localeCompare(b.name));
        });

        this.closeEditor();

        this.message.success(
          editing ? 'Producto actualizado correctamente.' : 'Producto creado correctamente.',
        );
      },
      error: (error: unknown) => {
        this.editorError.set(apiErrorMessage(error));
      },
    });
  }

  toggleActive(product: Product): void {
    const businessId = this.auth.activeBusinessId();

    if (!businessId || this.isChangingState(product.id)) {
      return;
    }

    this.savingStateIds.update((ids) => [...ids, product.id]);

    this.productsApi
      .update(businessId, product.id, {
        isActive: !product.isActive,
      })
      .pipe(
        finalize(() => {
          this.savingStateIds.update((ids) => ids.filter((id) => id !== product.id));
        }),
      )
      .subscribe({
        next: (updated) => {
          if (this.auth.activeBusinessId() === businessId) {
            this.products.update((current) =>
              current.map((item) => (item.id === updated.id ? updated : item)),
            );
          }

          this.message.success(updated.isActive ? 'Producto activado.' : 'Producto desactivado.');
        },
        error: (error: unknown) => {
          this.message.error(apiErrorMessage(error));
        },
      });
  }

  private loadProducts(businessId: string): void {
    const sequence = ++this.requestSequence;

    this.loading.set(true);
    this.pageError.set(null);

    this.productsApi
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
            this.products.set(response.products);
          }
        },
        error: (error: unknown) => {
          if (sequence === this.requestSequence) {
            this.products.set([]);
            this.pageError.set(apiErrorMessage(error));
          }
        },
      });
  }

  private onProductionUnitChanged(unitId: string): void {
    const unit = this.units().find((item) => item.id === unitId) ?? null;

    this.selectedProductionUnit.set(unit);

    if (unit && unit.dimension !== 'COUNT') {
      this.form.patchValue(
        {
          targetFinishedWeight: '',
          targetWeightUnitId: '',
        },
        { emitEvent: false },
      );
    }
  }
}
