import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

const API = '/api';

export interface AuthResponse {
  token: string;
  username: string;
  userId: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'chess_token';
  private userKey = 'chess_user';

  private token = signal<string | null>(this.getStoredToken());
  private userId = signal<number | null>(this.getStoredUserId());
  private username = signal<string | null>(this.getStoredUsername());

  isLoggedIn = computed(() => !!this.token());
  currentUsername = computed(() => this.username());
  currentUserId = computed(() => this.userId());

  constructor(private http: HttpClient, private router: Router) {}

  getToken(): string | null {
    return this.token();
  }

  register(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API}/auth/register`, { username, password }).pipe(
      tap((res) => this.setSession(res))
    );
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API}/auth/login`, { username, password }).pipe(
      tap((res) => this.setSession(res))
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.token.set(null);
    this.userId.set(null);
    this.username.set(null);
    this.router.navigate(['/login']);
  }

  private setSession(res: AuthResponse): void {
    localStorage.setItem(this.tokenKey, res.token);
    localStorage.setItem(this.userKey, JSON.stringify({ username: res.username, userId: res.userId }));
    this.token.set(res.token);
    this.username.set(res.username);
    this.userId.set(res.userId);
  }

  private getStoredToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private getStoredUsername(): string | null {
    const raw = localStorage.getItem(this.userKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw).username ?? null;
    } catch {
      return null;
    }
  }

  private getStoredUserId(): number | null {
    const raw = localStorage.getItem(this.userKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw).userId ?? null;
    } catch {
      return null;
    }
  }
}
