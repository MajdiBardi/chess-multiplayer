import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { WebSocketService } from '../../services/websocket.service';
import { GameService, GameDto } from '../../services/game.service';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap, startWith } from 'rxjs/operators';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-lobby',
  template: `
    <div class="lobby-page">
      <div class="lobby-side lobby-side-left" role="presentation"></div>
      <div class="lobby-center">
    <div class="lobby">
      <header class="header">
        <div class="logo">
          <span class="logo-icon">♔</span>
          <h1>Échecs multijoueurs</h1>
        </div>
        <div class="user">
          <span class="username">{{ auth.currentUsername() }}</span>
          <button class="logout" (click)="logout()">Déconnexion</button>
        </div>
      </header>

      <main class="main">
        <section class="card card-players">
          <h2><span class="card-icon">●</span> Joueurs en ligne</h2>
          <ng-container *ngIf="!wsConnected; else usersBlock">
            <p class="muted">Connexion en cours…</p>
          </ng-container>
          <ng-template #usersBlock>
            <ul class="user-list">
              <li *ngFor="let u of lobbyUsers">
                <span class="user-name">{{ u }}</span>
                <button *ngIf="isOtherUser(u)" class="btn-invite" (click)="invite(u)" [disabled]="inviting === u">Inviter</button>
              </li>
            </ul>
            <p class="muted empty" *ngIf="lobbyUsers.length === 0">Aucun autre joueur connecté.</p>
          </ng-template>
        </section>

        <section class="card card-invite" [class.has-invite]="pendingInviteFrom">
          <h2><span class="card-icon">●</span> Invitation reçue</h2>
          <ng-container *ngIf="pendingInviteFrom; else noInvite">
            <p class="invite-text"><strong>{{ pendingInviteFrom }}</strong> vous invite à jouer.</p>
            <div class="actions">
              <button class="btn-accept" (click)="acceptInvite()">Accepter</button>
              <button class="btn-decline" (click)="declineInvite()">Refuser</button>
            </div>
          </ng-container>
          <ng-template #noInvite>
            <p class="muted">Aucune invitation en attente.</p>
          </ng-template>
        </section>

        <section class="card card-active">
          <h2><span class="card-icon">●</span> Parties en cours</h2>
          <ul class="game-list">
            <li *ngFor="let g of activeGames" (click)="openGame(g.id)">
              <span>{{ g.whiteUsername }} vs {{ g.blackUsername }}</span>
              <span class="link">Ouvrir →</span>
            </li>
          </ul>
          <p class="muted empty" *ngIf="activeGames.length === 0">Aucune partie en cours.</p>
        </section>

        <section class="card card-history">
          <h2><span class="card-icon">●</span> Historique des parties</h2>
          <p class="card-hint">Cliquez pour revoir une partie et rejouer les coups.</p>
          <div class="history-scroll">
            <ul class="game-list">
              <li *ngFor="let g of gameHistory" (click)="openGame(g.id)">
                <span class="game-info">{{ g.whiteUsername }} vs {{ g.blackUsername }}<span class="game-result" *ngIf="g.winnerUsername"> — {{ g.winnerUsername }} a gagné</span></span>
                <span class="link">Revoir →</span>
              </li>
            </ul>
            <p class="muted empty" *ngIf="gameHistory.length === 0">Aucune partie terminée.</p>
          </div>
        </section>
      </main>
    </div>
      </div>
      <div class="lobby-side lobby-side-right" role="presentation"></div>
    </div>
  `,
  styles: [`
    .lobby-page {
      display: grid;
      grid-template-columns: 1fr minmax(320px, 700px) 1fr;
      min-height: 100vh;
      background: linear-gradient(165deg, #0f1419 0%, #1a2332 35%, #15202b 70%, #0d1117 100%);
    }
    .lobby-side {
      min-height: 100vh;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      position: relative;
    }
    .lobby-side::after {
      content: '';
      position: absolute; inset: 0;
      background: linear-gradient(to bottom, rgba(15, 20, 25, 0.85) 0%, rgba(13, 17, 23, 0.92) 100%);
    }
    .lobby-side-left {
      background-image: url('https://images.pexels.com/photos/957312/chess-checkmated-chess-pieces-black-white-957312.jpeg?auto=compress&cs=tinysrgb&w=800');
    }
    .lobby-side-right {
      background-image: url('https://images.pexels.com/photos/4038397/pexels-photo-4038397.jpeg?auto=compress&cs=tinysrgb&w=800');
    }
    .lobby-center { min-width: 0; overflow: auto; }
    @media (max-width: 1024px) {
      .lobby-page { grid-template-columns: 1fr; }
      .lobby-side { display: none; }
    }
    .lobby {
      max-width: 700px; margin: 0 auto; padding: 2rem 1.5rem 3rem;
      padding-top: max(2rem, env(safe-area-inset-top));
      min-height: 100vh;
      background: linear-gradient(165deg, #0f1419 0%, #1a2332 35%, #15202b 70%, #0d1117 100%);
    }
    .header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 2.5rem; flex-wrap: wrap; gap: 1.25rem;
      padding: 1rem 1.25rem; background: rgba(22, 30, 40, 0.6); border-radius: 14px;
      border: 1px solid rgba(99, 179, 237, 0.12);
    }
    .logo { display: flex; align-items: center; gap: 0.75rem; }
    .logo-icon { font-size: 1.75rem; opacity: 0.95; filter: drop-shadow(0 0 8px rgba(99, 179, 237, 0.3)); }
    .header h1 { margin: 0; font-size: 1.4rem; font-family: 'Cinzel', serif; font-weight: 600; letter-spacing: 0.04em; color: #e6edf3; }
    .user { display: flex; align-items: center; gap: 1rem; }
    .username { font-weight: 600; color: #c9d1d9; font-size: 0.95rem; }
    .logout {
      padding: 0.45rem 1rem; font-size: 0.88rem; border-radius: 8px;
      background: rgba(99, 179, 237, 0.12); color: #79c0ff; border: 1px solid rgba(99, 179, 237, 0.25);
      transition: background 0.2s, border-color 0.2s;
    }
    .logout:hover { background: rgba(99, 179, 237, 0.2); border-color: rgba(99, 179, 237, 0.4); }
    .main { display: flex; flex-direction: column; gap: 1.5rem; }
    .card {
      background: linear-gradient(145deg, rgba(22, 30, 40, 0.85) 0%, rgba(28, 38, 52, 0.9) 100%);
      padding: 1.5rem 1.75rem; border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
    }
    .card-players { border-left: 3px solid #3fb950; }
    .card-invite { border-left: 3px solid #d29922; }
    .card-invite.has-invite { border-left-color: #d29922; box-shadow: 0 0 0 1px rgba(210, 153, 34, 0.35), 0 8px 32px rgba(0, 0, 0, 0.3); }
    .card-active { border-left: 3px solid #58a6ff; }
    .card-history { border-left: 3px solid #a371f7; }
    .card h2 { margin: 0 0 1rem; font-size: 1rem; font-weight: 600; color: #e6edf3; letter-spacing: 0.02em; display: flex; align-items: center; gap: 0.5rem; }
    .card-icon { font-size: 0.5rem; vertical-align: middle; }
    .card-players .card-icon { color: #3fb950; }
    .card-invite .card-icon { color: #d29922; }
    .card-active .card-icon { color: #58a6ff; }
    .card-history .card-icon { color: #a371f7; }
    .user-list { list-style: none; padding: 0; margin: 0; }
    .user-list li { display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); gap: 0.75rem; }
    .user-list li:last-child { border-bottom: none; }
    .user-name { font-weight: 500; color: #c9d1d9; }
    .btn-invite {
      padding: 0.45rem 1rem; font-size: 0.9rem; font-weight: 600; border-radius: 8px; border: none; cursor: pointer;
      background: linear-gradient(180deg, #3fb950 0%, #2ea043 100%); color: #fff;
      box-shadow: 0 2px 8px rgba(63, 185, 80, 0.35);
      transition: filter 0.2s, box-shadow 0.2s;
    }
    .btn-invite:hover:not(:disabled) { filter: brightness(1.1); box-shadow: 0 4px 12px rgba(63, 185, 80, 0.4); }
    .btn-invite:disabled { opacity: 0.6; cursor: not-allowed; }
    .invite-text { margin: 0 0 1rem; color: #c9d1d9; }
    .btn-accept {
      padding: 0.5rem 1.1rem; font-size: 0.9rem; font-weight: 600; border-radius: 8px; border: none; cursor: pointer;
      background: linear-gradient(180deg, #3fb950 0%, #2ea043 100%); color: #fff;
      box-shadow: 0 2px 8px rgba(63, 185, 80, 0.35);
    }
    .btn-accept:hover { filter: brightness(1.1); }
    .btn-decline {
      padding: 0.5rem 1.1rem; font-size: 0.9rem; border-radius: 8px; cursor: pointer;
      background: transparent; color: #8b949e; border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .btn-decline:hover { background: rgba(255, 255, 255, 0.06); color: #c9d1d9; }
    .actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
    .game-list { list-style: none; padding: 0; margin: 0; }
    .game-list li {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.65rem 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      cursor: pointer; gap: 0.5rem; transition: background 0.15s; flex-wrap: wrap;
    }
    .game-list li:last-child { border-bottom: none; }
    .game-list li:hover { background: rgba(99, 179, 237, 0.08); }
    .game-info { flex: 1; min-width: 0; color: #c9d1d9; }
    .game-result { font-size: 0.9rem; color: #8b949e; }
    .link { color: #79c0ff; font-size: 0.9rem; font-weight: 600; flex-shrink: 0; }
    .link:hover { text-decoration: underline; }
    .card-hint { font-size: 0.85rem; color: #8b949e; margin: 0 0 0.75rem; line-height: 1.45; }
    .muted { color: #8b949e; margin: 0; }
    .muted.empty { padding: 0.75rem 0; }
    .history-scroll {
      max-height: 280px; overflow-y: auto; overflow-x: hidden; border-radius: 10px;
      background: rgba(13, 17, 23, 0.6); border: 1px solid rgba(255, 255, 255, 0.06);
      padding: 0.25rem 0;
    }
    .history-scroll .game-list li { padding-left: 1rem; padding-right: 1rem; }
    .history-scroll .muted.empty { padding: 1rem 1rem; }
  `],
})
export class LobbyComponent implements OnInit, OnDestroy {
  wsConnected = false;
  lobbyUsers: string[] = [];
  pendingInviteFrom: string | null = null;
  inviting: string | null = null;
  activeGames: GameDto[] = [];
  gameHistory: GameDto[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    public auth: AuthService,
    private ws: WebSocketService,
    private gameService: GameService,
    private router: Router,
  ) {}

  private pollInvitation(): void {
    this.gameService.getPendingInvitation().subscribe((inv) => {
      if (inv?.fromUsername) this.pendingInviteFrom = inv.fromUsername;
      else if (inv === null) this.pendingInviteFrom = null;
    });
  }

  ngOnInit(): void {
    this.ws.connect();
    this.ws.isConnected$.pipe(takeUntil(this.destroy$)).subscribe((c) => (this.wsConnected = c));
    this.ws.lobbyUsers$.pipe(takeUntil(this.destroy$)).subscribe((u) => (this.lobbyUsers = u));
    this.ws.invitations$.pipe(takeUntil(this.destroy$)).subscribe((msg) => {
      if (msg.type === 'INVITATION') {
        this.pendingInviteFrom = msg.fromUsername;
      } else if (msg.type === 'ACCEPTED' && msg.gameId) {
        this.pendingInviteFrom = null;
        this.inviting = null;
        this.router.navigate(['/game', msg.gameId]);
      } else if (msg.type === 'DECLINED') {
        this.inviting = null;
      }
    });
    this.pollInvitation();
    interval(2000)
      .pipe(
        startWith(0),
        takeUntil(this.destroy$),
        switchMap(() => this.gameService.getPendingInvitation()),
      )
      .subscribe((inv) => {
        if (inv?.fromUsername) this.pendingInviteFrom = inv.fromUsername;
      });
    this.loadActiveGames();
    this.loadGameHistory();
  }

  loadGameHistory(): void {
    this.gameService.getGameHistory().subscribe({
      next: (list) => (this.gameHistory = list),
      error: () => (this.gameHistory = []),
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadActiveGames(): void {
    this.gameService.getActiveGames().subscribe({
      next: (list) => (this.activeGames = list),
      error: () => (this.activeGames = []),
    });
  }

  invite(username: string): void {
    this.inviting = username;
    this.ws.invite(username);
  }

  acceptInvite(): void {
    if (!this.pendingInviteFrom) return;
    this.ws.acceptInvitation(this.pendingInviteFrom);
  }

  declineInvite(): void {
    if (this.pendingInviteFrom) {
      this.ws.declineInvitation(this.pendingInviteFrom);
      this.pendingInviteFrom = null;
    }
  }

  openGame(id: number): void {
    this.router.navigate(['/game', id]);
  }

  /** Show Inviter only for other users (compare case-insensitively with stored username). */
  isOtherUser(username: string): boolean {
    const me = this.auth.currentUsername();
    return !!username && (!me || username.toLowerCase() !== me.toLowerCase());
  }

  logout(): void {
    this.ws.disconnect();
    this.auth.logout();
  }
}
