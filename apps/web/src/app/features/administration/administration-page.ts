import { ChangeDetectorRef, Component, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { apiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { BusinessMembersService } from '../../core/businesses/business-members.service';
import type {
  AssignableBusinessMemberRole,
  BusinessMember,
  BusinessMemberRole,
} from '../../core/models/business-member.models';

@Component({
  selector: 'app-administration-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="mx-auto max-w-7xl space-y-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            Administración del negocio
          </p>
          <h1 class="mt-2 text-3xl font-bold tracking-tight text-slate-900">Miembros y accesos</h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Administra quién puede entrar a la panadería y qué operaciones puede realizar cada
            usuario.
          </p>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p class="text-xs font-medium text-slate-500">Negocio activo</p>
          <p class="mt-1 max-w-60 truncate text-sm font-semibold text-slate-900">
            {{ auth.activeBusiness()?.name ?? 'Sin negocio seleccionado' }}
          </p>
          @if (auth.activeBusiness(); as business) {
            <p class="mt-1 text-xs text-emerald-700">Tu rol: {{ roleLabel(business.role) }}</p>
          }
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
        <section class="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <h2 class="font-semibold text-slate-900">Selecciona un negocio</h2>
          <p class="mt-2 text-sm text-slate-600">
            Elige un negocio en la barra superior para administrar sus miembros.
          </p>
        </section>
      } @else if (!canManageMembers) {
        <section class="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 class="font-semibold text-amber-900">No tienes permisos de administración</h2>
          <p class="mt-2 text-sm leading-6 text-amber-800">
            La gestión de miembros está disponible para propietarios y administradores del negocio.
            Puedes seguir utilizando las demás funciones que permite tu rol actual.
          </p>
        </section>
      } @else {
        <div class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <!-- Incorporación de usuarios -->
          <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <h2 class="text-lg font-bold text-slate-900">Incorporar usuario</h2>
              <p class="mt-1 text-sm leading-6 text-slate-500">
                La persona debe tener previamente una cuenta en la plataforma.
              </p>
            </div>

            <form class="mt-5 space-y-5" (ngSubmit)="addMember()">
              <div>
                <label for="memberEmail" class="mb-2 block text-sm font-semibold text-slate-700">
                  Correo electrónico
                </label>
                <input
                  id="memberEmail"
                  name="memberEmail"
                  type="email"
                  autocomplete="off"
                  maxlength="254"
                  required
                  [(ngModel)]="newEmail"
                  placeholder="usuario@ejemplo.com"
                  class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              @if (isOwner) {
                <div>
                  <label for="memberRole" class="mb-2 block text-sm font-semibold text-slate-700">
                    Rol inicial
                  </label>
                  <select
                    id="memberRole"
                    name="memberRole"
                    [(ngModel)]="newRole"
                    class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="MEMBER">Miembro</option>
                    <option value="ADMIN">Administrador</option>
                  </select>

                  <p class="mt-2 text-xs leading-5 text-slate-500">
                    El propietario puede incorporar miembros y administradores.
                  </p>
                </div>
              } @else {
                <div class="rounded-lg bg-slate-50 p-3.5">
                  <p class="text-sm font-semibold text-slate-800">Rol: Miembro</p>
                  <p class="mt-1 text-xs leading-5 text-slate-500">
                    Como administrador, puedes incorporar miembros normales. Solo el propietario
                    puede conceder el rol de administrador.
                  </p>
                </div>
              }

              <button
                type="submit"
                class="flex w-full items-center justify-center rounded-lg bg-blue-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
                [disabled]="creatingMember || !newEmail.trim()"
              >
                {{ creatingMember ? 'Incorporando usuario…' : 'Incorporar al negocio' }}
              </button>
            </form>

            <div class="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 class="text-sm font-semibold text-slate-800">Cómo funciona el acceso</h3>
              <p class="mt-2 text-xs leading-5 text-slate-600">
                Añadir un miembro no crea otra cuenta ni le concede acceso a otras panaderías. Solo
                se incorpora a este negocio.
              </p>
            </div>
          </section>

          <!-- Lista de miembros -->
          <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 class="text-lg font-bold text-slate-900">Usuarios del negocio</h2>
                <p class="mt-1 text-sm text-slate-500">
                  {{ members.length }}
                  {{ members.length === 1 ? 'miembro' : 'miembros' }}
                  con acceso
                </p>
              </div>

              <button
                type="button"
                class="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                [disabled]="loadingMembers"
                (click)="reloadMembers()"
              >
                {{ loadingMembers ? 'Actualizando…' : 'Actualizar' }}
              </button>
            </div>

            @if (loadingMembers && members.length === 0) {
              <p class="mt-6 text-sm text-slate-500">Cargando miembros…</p>
            } @else if (members.length === 0) {
              <div class="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center">
                <p class="text-sm font-semibold text-slate-800">No se encontraron miembros</p>
                <p class="mt-2 text-sm text-slate-500">
                  Actualiza la lista o incorpora un usuario registrado.
                </p>
              </div>
            } @else {
              <div class="mt-5 space-y-3">
                @for (member of members; track member.id) {
                  <article class="rounded-xl border border-slate-200 p-4">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <div class="min-w-0">
                        <h3 class="truncate text-sm font-semibold text-slate-900">
                          {{ member.fullName }}
                        </h3>
                        <p class="mt-1 break-all text-sm text-slate-500">
                          {{ member.email }}
                        </p>
                        <p class="mt-2 text-xs text-slate-400">
                          Acceso desde {{ member.joinedAt | date: 'mediumDate' }}
                        </p>
                      </div>

                      <span
                        class="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold"
                        [class.bg-blue-50]="member.role === 'OWNER'"
                        [class.text-blue-800]="member.role === 'OWNER'"
                        [class.bg-violet-50]="member.role === 'ADMIN'"
                        [class.text-violet-800]="member.role === 'ADMIN'"
                        [class.bg-slate-100]="member.role === 'MEMBER'"
                        [class.text-slate-700]="member.role === 'MEMBER'"
                      >
                        {{ roleLabel(member.role) }}
                      </span>
                    </div>

                    @if (canEditRole(member)) {
                      <div
                        class="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4"
                      >
                        <div class="min-w-40 flex-1">
                          <label
                            [for]="'role-' + member.id"
                            class="mb-1.5 block text-xs font-semibold text-slate-600"
                          >
                            Cambiar rol
                          </label>
                          <select
                            [id]="'role-' + member.id"
                            [name]="'role-' + member.id"
                            [(ngModel)]="roleDrafts[member.id]"
                            class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                          >
                            <option value="MEMBER">Miembro</option>
                            <option value="ADMIN">Administrador</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          class="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-800 transition hover:bg-blue-50 disabled:opacity-50"
                          [disabled]="
                            roleSavingId === member.id || roleDrafts[member.id] === member.role
                          "
                          (click)="saveRole(member)"
                        >
                          {{ roleSavingId === member.id ? 'Guardando…' : 'Guardar rol' }}
                        </button>
                      </div>
                    }

                    @if (canRemove(member)) {
                      <div class="mt-3 border-t border-slate-100 pt-3">
                        @if (confirmingRemovalId === member.id) {
                          <div class="rounded-lg border border-red-200 bg-red-50 p-3">
                            <p class="text-sm font-semibold text-red-900">
                              ¿Retirar el acceso de {{ member.fullName }}?
                            </p>
                            <p class="mt-1 text-xs leading-5 text-red-800">
                              La cuenta seguirá existiendo, pero perderá el acceso a los datos de
                              este negocio.
                            </p>
                            <div class="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                class="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                                [disabled]="removingMemberId === member.id"
                                (click)="removeMember(member)"
                              >
                                {{
                                  removingMemberId === member.id
                                    ? 'Retirando acceso…'
                                    : 'Confirmar retirada'
                                }}
                              </button>
                              <button
                                type="button"
                                class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                [disabled]="removingMemberId === member.id"
                                (click)="cancelRemoval()"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        } @else {
                          <button
                            type="button"
                            class="rounded-lg px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                            (click)="requestRemoval(member)"
                          >
                            Retirar acceso
                          </button>
                        }
                      </div>
                    } @else if (member.role === 'OWNER') {
                      <p
                        class="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500"
                      >
                        La propiedad del negocio no se puede modificar desde la gestión ordinaria de
                        miembros.
                      </p>
                    }

                    @if (canTransferOwnership(member)) {
                      <div class="mt-3 border-t border-slate-100 pt-3">
                        @if (confirmingTransferId === member.id) {
                          <div class="rounded-xl border border-amber-300 bg-amber-50 p-4">
                            <h4 class="text-sm font-bold text-amber-950">
                              Confirmar transferencia de propiedad
                            </h4>

                            <p class="mt-2 text-sm leading-6 text-amber-900">
                              {{ member.fullName }} pasará a ser propietario de este negocio. Tu rol
                              cambiará de Propietario a Administrador. Esta operación no se puede
                              deshacer desde la gestión ordinaria.
                            </p>

                            <div class="mt-4 flex flex-wrap gap-2">
                              <button
                                type="button"
                                class="rounded-lg bg-amber-800 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-900 disabled:opacity-50"
                                [disabled]="transferringOwnershipId === member.id"
                                (click)="transferOwnership(member)"
                              >
                                {{
                                  transferringOwnershipId === member.id
                                    ? 'Transfiriendo propiedad…'
                                    : 'Confirmar transferencia'
                                }}
                              </button>

                              <button
                                type="button"
                                class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                [disabled]="transferringOwnershipId === member.id"
                                (click)="cancelOwnershipTransfer()"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        } @else {
                          <button
                            type="button"
                            class="rounded-lg px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-50"
                            (click)="requestOwnershipTransfer(member)"
                          >
                            Transferir propiedad
                          </button>
                        }
                      </div>
                    }
                  </article>
                }
              </div>
            }
          </section>
        </div>
      }
    </section>
  `,
})
export class AdministrationPage {
  readonly auth = inject(AuthService);

  private readonly membersService = inject(BusinessMembersService);
  private readonly cdr = inject(ChangeDetectorRef);

  activeBusinessId: string | null = null;
  currentRole: string | null = null;

  members: BusinessMember[] = [];
  roleDrafts: Record<string, AssignableBusinessMemberRole> = {};

  newEmail = '';
  newRole: AssignableBusinessMemberRole = 'MEMBER';

  loadingMembers = false;
  creatingMember = false;
  roleSavingId: string | null = null;
  removingMemberId: string | null = null;
  confirmingRemovalId: string | null = null;

  pageError: string | null = null;
  successMessage: string | null = null;

  confirmingTransferId: string | null = null;
  transferringOwnershipId: string | null = null;

  private lastBusinessId: string | null | undefined = undefined;

  constructor() {
    effect(() => {
      const businessId = this.auth.activeBusinessId();
      const role = this.auth.activeBusiness()?.role ?? null;

      this.currentRole = role;

      // Un cambio de rol no debe reiniciar toda la página.
      // Solo reiniciamos el estado cuando cambia el negocio activo.
      if (businessId === this.lastBusinessId) {
        this.cdr.markForCheck();
        return;
      }

      this.lastBusinessId = businessId;
      this.activeBusinessId = businessId;

      this.resetPageState();

      if (this.isManagerRole(role) && businessId) {
        this.loadMembers(businessId);
      } else {
        this.cdr.markForCheck();
      }
    });
  }

  get canManageMembers(): boolean {
    return this.isManagerRole(this.currentRole);
  }

  get isOwner(): boolean {
    return this.currentRole === 'OWNER';
  }

  private isManagerRole(role: string | null): boolean {
    return role === 'OWNER' || role === 'ADMIN';
  }

  roleLabel(role: string): string {
    switch (role) {
      case 'OWNER':
        return 'Propietario';
      case 'ADMIN':
        return 'Administrador';
      case 'MEMBER':
        return 'Miembro';
      default:
        return role;
    }
  }

  canEditRole(member: BusinessMember): boolean {
    return this.isOwner && member.role !== 'OWNER';
  }

  canRemove(member: BusinessMember): boolean {
    if (member.role === 'OWNER') {
      return false;
    }

    if (this.isOwner) {
      return true;
    }

    return this.currentRole === 'ADMIN' && member.role === 'MEMBER';
  }

  canTransferOwnership(member: BusinessMember): boolean {
    return this.isOwner && member.role !== 'OWNER' && member.userId !== this.auth.user()?.id;
  }

  requestOwnershipTransfer(member: BusinessMember): void {
    if (!this.canTransferOwnership(member)) {
      return;
    }

    this.pageError = null;
    this.successMessage = null;
    this.confirmingRemovalId = null;
    this.confirmingTransferId = member.id;
  }

  cancelOwnershipTransfer(): void {
    if (this.transferringOwnershipId !== null) {
      return;
    }

    this.confirmingTransferId = null;
  }

  transferOwnership(member: BusinessMember): void {
    const businessId = this.activeBusinessId;

    if (
      !businessId ||
      !this.canTransferOwnership(member) ||
      this.confirmingTransferId !== member.id ||
      this.transferringOwnershipId !== null
    ) {
      return;
    }

    this.pageError = null;
    this.successMessage = null;
    this.transferringOwnershipId = member.id;

    this.membersService
      .transferOwnership(businessId, member.id)
      .pipe(
        finalize(() => {
          this.transferringOwnershipId = null;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          // Actualizar inmediatamente los roles del listado.
          this.members = this.members.map((item) => {
            if (item.id === response.newOwner.id) {
              return {
                ...item,
                ...response.newOwner,
                role: 'OWNER',
              };
            }

            if (item.userId === response.previousOwner.userId) {
              return {
                ...item,
                role: 'ADMIN',
              };
            }

            return item;
          });

          // El usuario que ejecuta la operación era el propietario anterior.
          if (response.previousOwner.userId === this.auth.user()?.id) {
            this.auth.updateBusinessRole(businessId, 'ADMIN');
          }

          this.confirmingTransferId = null;

          this.successMessage =
            `La propiedad de "${this.auth.activeBusiness()?.name ?? 'el negocio'}" ` +
            `se transfirió a ${response.newOwner.fullName}. ` +
            'Tu rol ahora es Administrador.';

          // Actualizar el listado desde el servidor para reflejar el estado definitivo.
          this.membersService.getMembers(businessId).subscribe({
            next: (result) => {
              this.members = result.members;
              this.roleDrafts = {};

              for (const item of result.members) {
                this.roleDrafts[item.id] = item.role === 'ADMIN' ? 'ADMIN' : 'MEMBER';
              }

              this.cdr.markForCheck();
            },
            error: () => {
              // La transferencia ya fue confirmada por el servidor.
              // El listado se puede actualizar manualmente después.
              this.cdr.markForCheck();
            },
          });

          this.cdr.markForCheck();
        },
        error: (error: unknown) => {
          this.pageError = apiErrorMessage(error);
        },
      });
  }

  private resetPageState(): void {
    this.members = [];
    this.roleDrafts = {};
    this.newEmail = '';
    this.newRole = 'MEMBER';

    this.loadingMembers = false;
    this.creatingMember = false;
    this.roleSavingId = null;
    this.removingMemberId = null;
    this.confirmingRemovalId = null;

    this.pageError = null;
    this.successMessage = null;
    this.confirmingTransferId = null;
    this.transferringOwnershipId = null;
  }

  private loadMembers(businessId: string): void {
    this.loadingMembers = true;

    this.membersService
      .getMembers(businessId)
      .pipe(
        finalize(() => {
          this.loadingMembers = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          this.members = response.members;
          this.roleDrafts = {};

          for (const member of this.members) {
            this.roleDrafts[member.id] = member.role === 'ADMIN' ? 'ADMIN' : 'MEMBER';
          }
        },
        error: (error: unknown) => {
          this.pageError = apiErrorMessage(error);
        },
      });
  }

  reloadMembers(): void {
    if (!this.activeBusinessId || !this.canManageMembers) {
      return;
    }

    this.pageError = null;
    this.successMessage = null;
    this.loadMembers(this.activeBusinessId);
  }

  addMember(): void {
    if (!this.activeBusinessId || !this.canManageMembers || this.creatingMember) {
      return;
    }

    const email = this.newEmail.trim().toLowerCase();

    if (!email) {
      this.pageError = 'Introduce el correo electrónico del usuario.';
      return;
    }

    const role: AssignableBusinessMemberRole = this.isOwner ? this.newRole : 'MEMBER';

    this.pageError = null;
    this.successMessage = null;
    this.creatingMember = true;

    this.membersService
      .addMember(this.activeBusinessId, { email, role })
      .pipe(
        finalize(() => {
          this.creatingMember = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          this.members = [...this.members, response.member];
          this.roleDrafts = {
            ...this.roleDrafts,
            [response.member.id]: response.member.role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
          };

          this.newEmail = '';
          this.newRole = 'MEMBER';
          this.successMessage = `${response.member.fullName} se incorporó al negocio correctamente.`;
        },
        error: (error: unknown) => {
          this.pageError = apiErrorMessage(error);
        },
      });
  }

  saveRole(member: BusinessMember): void {
    if (!this.activeBusinessId || !this.canEditRole(member) || this.roleSavingId !== null) {
      return;
    }

    const role = this.roleDrafts[member.id];

    if (!role || role === member.role) {
      return;
    }

    this.pageError = null;
    this.successMessage = null;
    this.roleSavingId = member.id;

    this.membersService
      .updateRole(this.activeBusinessId, member.id, { role })
      .pipe(
        finalize(() => {
          this.roleSavingId = null;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          this.members = this.members.map((item) =>
            item.id === member.id ? response.member : item,
          );
          this.roleDrafts[member.id] = role;
          this.successMessage = `El rol de ${response.member.fullName} se actualizó correctamente.`;
        },
        error: (error: unknown) => {
          this.roleDrafts[member.id] = member.role === 'ADMIN' ? 'ADMIN' : 'MEMBER';
          this.pageError = apiErrorMessage(error);
        },
      });
  }

  requestRemoval(member: BusinessMember): void {
    if (!this.canRemove(member)) {
      return;
    }

    this.pageError = null;
    this.successMessage = null;
    this.confirmingRemovalId = member.id;
  }

  cancelRemoval(): void {
    this.confirmingRemovalId = null;
  }

  removeMember(member: BusinessMember): void {
    if (
      !this.activeBusinessId ||
      !this.canRemove(member) ||
      this.confirmingRemovalId !== member.id ||
      this.removingMemberId !== null
    ) {
      return;
    }

    this.pageError = null;
    this.successMessage = null;
    this.removingMemberId = member.id;

    this.membersService
      .removeMember(this.activeBusinessId, member.id)
      .pipe(
        finalize(() => {
          this.removingMemberId = null;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.members = this.members.filter((item) => item.id !== member.id);

          const nextDrafts = { ...this.roleDrafts };
          delete nextDrafts[member.id];
          this.roleDrafts = nextDrafts;

          this.confirmingRemovalId = null;
          this.successMessage = `Se retiró el acceso de ${member.fullName} a este negocio.`;
        },
        error: (error: unknown) => {
          this.pageError = apiErrorMessage(error);
        },
      });
  }
}
