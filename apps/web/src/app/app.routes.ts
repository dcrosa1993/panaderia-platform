import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { HomePage } from './features/home/home-page';
import { LoginPage } from './features/auth/login-page';
import { RegisterPage } from './features/auth/register-page';
import { MainLayout } from './features/layout/main-layout';
import { IngredientsPage } from './features/ingredients/ingredients-page';
import { ProductsPage } from './features/products/products-page';
import { RecipesPage } from './features/recipes/recipes-page';

export const routes: Routes = [
  {
    path: 'auth',
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'login',
      },
      {
        path: 'login',
        component: LoginPage,
        canActivate: [guestGuard],
        title: 'Iniciar sesión | Panadería',
      },
      {
        path: 'register',
        component: RegisterPage,
        canActivate: [guestGuard],
        title: 'Registro | Panadería',
      },
    ],
  },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        component: HomePage,
        title: 'Inicio | Panadería',
      },
      {
        path: 'ingredients',
        component: IngredientsPage,
        title: 'Ingredientes | Panadería',
      },
      {
        path: 'products',
        component: ProductsPage,
        title: 'Productos | Panadería',
      },
      {
        path: 'recipes',
        component: RecipesPage,
        title: 'Recetas | Panadería',
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
