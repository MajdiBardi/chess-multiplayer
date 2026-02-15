import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  selector: 'app-login',
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <h1>Échecs multijoueurs</h1>
        <h2>Connexion</h2>
        <form (ngSubmit)="onSubmit()" #f="ngForm">
          <div class="field">
            <label>Nom d'utilisateur</label>
            <input type="text" name="username" [(ngModel)]="username" required minlength="2" #u="ngModel" />
            @if (u.invalid && u.touched) {
              <span class="error">Minimum 2 caractères</span>
            }
          </div>
          <div class="field">
            <label>Mot de passe</label>
            <input type="password" name="password" [(ngModel)]="password" required #p="ngModel" />
            @if (p.invalid && p.touched) {
              <span class="error">Requis</span>
            }
          </div>
          @if (error) {
            <p class="error">{{ error }}</p>
          }
          <button type="submit" class="primary" [disabled]="f.invalid || loading">Se connecter</button>
        </form>
        <p class="link">Pas de compte ? <a routerLink="/register">S'inscrire</a></p>
      </div>
    </div>
  `,
  styles: [`
    .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .auth-card { background: var(--bg-card); padding: 2rem; border-radius: 12px; width: 100%; max-width: 360px; }
    .auth-card h1 { margin: 0 0 0.25rem; font-size: 1.5rem; color: var(--accent); }
    .auth-card h2 { margin: 0 0 1.5rem; font-size: 1.1rem; font-weight: 400; color: var(--text-muted); }
    .field { margin-bottom: 1rem; }
    .field label { display: block; margin-bottom: 0.35rem; font-size: 0.9rem; color: var(--text-muted); }
    .error { color: var(--danger); font-size: 0.85rem; }
    button { width: 100%; margin-top: 0.5rem; padding: 0.65rem; }
    .link { margin-top: 1rem; text-align: center; font-size: 0.9rem; color: var(--text-muted); }
  `],
})
export class LoginComponent {
  username = '';
  password = '';
  loading = false;
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit(): void {
    this.error = '';
    this.loading = true;
    this.auth.login(this.username, this.password).subscribe({
      next: () => this.router.navigate(['/lobby']),
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || (err.status === 401 ? 'Identifiants incorrects' : 'Erreur de connexion');
      },
      complete: () => { this.loading = false; },
    });
  }
}
