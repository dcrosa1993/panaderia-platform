import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="app-shell">
      <aside class="sidebar">
        <a class="brand" routerLink="/" aria-label="Panadería, ir al inicio">
          <span class="brand-mark">P</span>

          <span class="brand-copy">
            <strong>Panadería</strong>
            <small>GESTIÓN</small>
          </span>
        </a>

        <div class="workspace-card">
          <span class="workspace-dot"></span>

          <span class="workspace-copy">
            <strong>Espacio de trabajo</strong>
            <small>Entorno local</small>
          </span>
        </div>

        <nav class="sidebar-nav" aria-label="Navegación principal">
          <span class="nav-label">GENERAL</span>

          <a
            class="nav-link"
            routerLink="/"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
          >
            <span class="nav-icon" aria-hidden="true">⌂</span>
            <span>Inicio</span>
          </a>

          <span class="nav-label nav-label-spaced">OPERACIÓN</span>

          <div class="nav-link nav-link-disabled" aria-disabled="true">
            <span class="nav-icon" aria-hidden="true">◫</span>
            <span>Estimaciones</span>
            <span class="nav-badge">Próximo</span>
          </div>

          <div class="nav-link nav-link-disabled" aria-disabled="true">
            <span class="nav-icon" aria-hidden="true">▤</span>
            <span>Recetas e ingredientes</span>
          </div>

          <span class="nav-label nav-label-spaced">ADMINISTRACIÓN</span>

          <div class="nav-link nav-link-disabled" aria-disabled="true">
            <span class="nav-icon" aria-hidden="true">◎</span>
            <span>Negocios y usuarios</span>
          </div>
        </nav>

        <div class="sidebar-bottom">
          <span class="status-dot"></span>

          <div>
            <strong>Versión inicial</strong>
            <small>Construcción en curso</small>
          </div>
        </div>
      </aside>

      <div class="main-layout">
        <header class="topbar">
          <div class="breadcrumb">
            <span>Panadería</span>
            <span class="breadcrumb-divider" aria-hidden="true">/</span>
            <strong>Inicio</strong>
          </div>

          <div class="environment-label">
            <span class="status-dot"></span>
            <span>Entorno local</span>
          </div>
        </header>

        <div class="content-region">
          <router-outlet />
        </div>

        <footer class="page-footer">
          <span>Panadería Gestión</span>
          <span>Planificación · Costes · Producción</span>
        </footer>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
    }

    .app-shell {
      display: grid;
      grid-template-columns: 258px minmax(0, 1fr);
      min-height: 100vh;
    }

    .sidebar {
      position: sticky;
      top: 0;
      display: flex;
      flex-direction: column;
      height: 100vh;
      min-height: 600px;
      padding: 22px 16px 16px;
      overflow-y: auto;
      background: #fff;
      border-right: 1px solid var(--app-border);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 4px 8px 24px;
      color: var(--app-text);
      text-decoration: none;
    }

    .brand-mark {
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      flex: 0 0 auto;
      color: #fff;
      font-size: 23px;
      font-weight: 800;
      border-radius: 13px;
      background: linear-gradient(140deg, var(--brand-blue), #3977c8);
      box-shadow: 0 5px 12px rgb(36 87 167 / 18%);
    }

    .brand-copy,
    .workspace-copy {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .brand-copy strong {
      font-size: 16px;
      letter-spacing: -0.3px;
    }

    .brand-copy small {
      margin-top: 2px;
      color: var(--app-muted);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.7px;
    }

    .workspace-card {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 27px;
      padding: 12px 10px;
      border: 1px solid var(--app-border);
      border-radius: 12px;
      background: #f9fbfd;
    }

    .workspace-dot {
      width: 9px;
      height: 9px;
      flex: 0 0 auto;
      border-radius: 50%;
      background: var(--brand-green);
      box-shadow: 0 0 0 4px #e6f5ed;
    }

    .workspace-copy {
      flex: 1;
    }

    .workspace-copy strong,
    .sidebar-bottom strong {
      font-size: 12px;
      font-weight: 650;
    }

    .workspace-copy small,
    .sidebar-bottom small {
      margin-top: 4px;
      color: var(--app-muted);
      font-size: 11px;
    }

    .sidebar-nav {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 5px;
    }

    .nav-label {
      padding: 0 12px;
      color: #8995a7;
      font-size: 10px;
      font-weight: 750;
      letter-spacing: 1.3px;
    }

    .nav-label-spaced {
      margin-top: 22px;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 11px;
      min-height: 43px;
      padding: 10px 12px;
      color: #526177;
      font-size: 13px;
      font-weight: 500;
      border-radius: 10px;
      text-decoration: none;
      transition:
        color 150ms ease,
        background-color 150ms ease;
    }

    a.nav-link:hover {
      color: var(--brand-blue);
      background: #f2f6fc;
    }

    a.nav-link.active {
      color: var(--brand-blue);
      font-weight: 700;
      background: #edf4ff;
    }

    .nav-icon {
      display: grid;
      place-items: center;
      width: 20px;
      flex: 0 0 auto;
      font-size: 19px;
    }

    .nav-link-disabled {
      color: #8a95a5;
      cursor: default;
    }

    .nav-badge {
      margin-left: auto;
      padding: 3px 6px;
      color: #66758b;
      font-size: 9px;
      border-radius: 5px;
      background: #eef1f5;
    }

    .sidebar-bottom {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 20px;
      padding: 16px 10px 4px;
      border-top: 1px solid var(--app-border);
    }

    .sidebar-bottom > div {
      display: flex;
      flex-direction: column;
    }

    .status-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      flex: 0 0 auto;
      border-radius: 50%;
      background: var(--brand-green);
    }

    .main-layout {
      display: flex;
      min-width: 0;
      flex-direction: column;
    }

    .topbar {
      display: flex;
      min-height: 68px;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 0 32px;
      background: #fff;
      border-bottom: 1px solid var(--app-border);
    }

    .breadcrumb,
    .environment-label {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
    }

    .breadcrumb {
      color: var(--app-muted);
    }

    .breadcrumb strong {
      color: #25364d;
      font-weight: 650;
    }

    .breadcrumb-divider {
      color: #b1bbc8;
    }

    .environment-label {
      color: #5d6c7e;
    }

    .content-region {
      width: 100%;
      flex: 1;
      padding: 32px;
    }

    .page-footer {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 18px 32px;
      color: #8390a2;
      font-size: 11px;
      border-top: 1px solid var(--app-border);
      background: #fff;
    }

    @media (max-width: 900px) {
      .app-shell {
        grid-template-columns: 220px minmax(0, 1fr);
      }

      .content-region {
        padding: 24px;
      }

      .topbar {
        padding: 0 24px;
      }

      .page-footer {
        padding: 18px 24px;
      }
    }

    @media (max-width: 680px) {
      .app-shell {
        display: flex;
        flex-direction: column;
      }

      .sidebar {
        position: static;
        height: auto;
        min-height: auto;
        padding: 12px 14px;
        border-right: 0;
        border-bottom: 1px solid var(--app-border);
      }

      .brand {
        padding: 3px 4px 12px;
      }

      .brand-mark {
        width: 36px;
        height: 36px;
        border-radius: 10px;
      }

      .workspace-card,
      .sidebar-bottom,
      .nav-label {
        display: none;
      }

      .sidebar-nav {
        flex-direction: row;
        flex-wrap: wrap;
        gap: 4px;
      }

      .nav-link {
        min-height: 36px;
        padding: 8px 10px;
        font-size: 12px;
      }

      .nav-icon {
        width: auto;
        font-size: 16px;
      }

      .nav-link-disabled {
        display: none;
      }

      .topbar {
        min-height: 54px;
        padding: 0 18px;
      }

      .content-region {
        padding: 24px 18px;
      }

      .page-footer {
        flex-wrap: wrap;
        padding: 16px 18px;
      }
    }
  `,
})
export class App {}
