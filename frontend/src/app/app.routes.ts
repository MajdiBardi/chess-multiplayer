import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'lobby', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent) },
  { path: 'lobby', loadComponent: () => import('./pages/lobby/lobby.component').then(m => m.LobbyComponent), canActivate: [authGuard] },
  { path: 'game/:id', loadComponent: () => import('./pages/game/game.component').then(m => m.GameComponent), canActivate: [authGuard] },
  { path: 'debug', loadComponent: () => import('./pages/debug/debug.component').then(m => m.DebugComponent) },
  { path: '**', redirectTo: 'lobby' },
];
