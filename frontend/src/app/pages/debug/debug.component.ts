import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

const API = '/api';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-debug',
  template: `
    <div style="max-width:800px;margin:1rem auto;padding:1rem;">
      <h2>Debug: Auth token & API test</h2>
      <p><strong>Token (localStorage 'chess_token'):</strong></p>
      <pre style="word-break:break-all;background:#111;padding:0.75rem;border-radius:6px;color:#efe">{{ tokenMasked }}</pre>

      <div style="margin-top:1rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
        <button (click)="testHistory()" class="primary">Test /api/games/history</button>
        <button (click)="testActive()" class="primary">Test /api/games/active</button>
        <button (click)="clearToken()" class="secondary">Clear token</button>
      </div>

      <div *ngIf="lastResult" style="margin-top:1rem;padding:0.75rem;border-radius:6px;background:#0b1220;color:#cfe">
        <p><strong>Request:</strong> {{ lastResult.url }}</p>
        <p><strong>Status:</strong> {{ lastResult.status }}</p>
        <p><strong>Response body (truncated):</strong></p>
        <pre style="max-height:300px;overflow:auto;white-space:pre-wrap">{{ lastResult.body }}</pre>
        <p *ngIf="lastResult.headers"><strong>Response headers:</strong></p>
        <pre *ngIf="lastResult.headers" style="white-space:pre-wrap">{{ lastResult.headers }}</pre>
      </div>
    </div>
  `,
})
export class DebugComponent {
  token: string | null = null;
  lastResult: { url: string; status: number; body: string; headers?: string } | null = null;

  constructor(private http: HttpClient) {
    this.readToken();
  }

  get tokenMasked() {
    if (!this.token) return '<none>';
    return this.token.length > 20 ? this.token.slice(0, 10) + '…' + this.token.slice(-10) : this.token;
  }

  readToken() {
    this.token = localStorage.getItem('chess_token');
  }

  clearToken() {
    localStorage.removeItem('chess_token');
    this.readToken();
    this.lastResult = { url: 'local', status: 0, body: 'token cleared' };
  }

  testHistory() {
    const url = `${API}/games/history`;
    this.lastResult = { url, status: 0, body: 'loading...' };
    this.http.get(url, { observe: 'response', responseType: 'text' as 'json' }).subscribe({
      next: (res: any) => {
        const body = typeof res.body === 'string' ? res.body : JSON.stringify(res.body, null, 2);
        this.lastResult = { url, status: res.status, body: body.slice(0, 2000), headers: JSON.stringify(this.headersToObj(res.headers)) };
      },
      error: (err) => {
        const body = err?.error ? (typeof err.error === 'string' ? err.error : JSON.stringify(err.error)) : err.message;
        this.lastResult = { url, status: err.status ?? 0, body: String(body).slice(0, 2000), headers: err?.headers ? JSON.stringify(this.headersToObj(err.headers)) : undefined };
      }
    });
  }

  testActive() {
    const url = `${API}/games/active`;
    this.lastResult = { url, status: 0, body: 'loading...' };
    this.http.get(url, { observe: 'response', responseType: 'text' as 'json' }).subscribe({
      next: (res: any) => {
        const body = typeof res.body === 'string' ? res.body : JSON.stringify(res.body, null, 2);
        this.lastResult = { url, status: res.status, body: body.slice(0, 2000), headers: JSON.stringify(this.headersToObj(res.headers)) };
      },
      error: (err) => {
        const body = err?.error ? (typeof err.error === 'string' ? err.error : JSON.stringify(err.error)) : err.message;
        this.lastResult = { url, status: err.status ?? 0, body: String(body).slice(0, 2000), headers: err?.headers ? JSON.stringify(this.headersToObj(err.headers)) : undefined };
      }
    });
  }

  private headersToObj(headers: any) {
    try {
      const obj: any = {};
      headers.keys?.()?.forEach((k: string) => (obj[k] = headers.getAll(k)));
      return obj;
    } catch {
      return null;
    }
  }
}
