import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { WebSocketService } from '../../services/websocket.service';
import { GameService, GameDto, MoveDto } from '../../services/game.service';
import { ChessBoardComponent } from '../../components/chess-board/chess-board.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, ChessBoardComponent],
  selector: 'app-game',
  template: `
    <div class="game-page">
      <header class="header">
        <a routerLink="/lobby" class="back">← Retour au lobby</a>
        <div class="header-main">
          <h1>Partie {{ game()?.id }}</h1>
          <div class="players-row">
            <div class="player-badge white" [class.active]="isMyTurn() && isWhite()">
              <span class="player-name">{{ game()?.whiteUsername }}</span>
              <span class="player-role">Blancs</span>
              <span class="timer" [class.running]="game()?.status === 'ACTIVE' && whiteToMove()">{{ displayWhiteTime() }}</span>
            </div>
            <div class="vs-badge">VS</div>
            <div class="player-badge black" [class.active]="isMyTurn() && !isWhite()">
              <span class="player-name">{{ game()?.blackUsername }}</span>
              <span class="player-role">Noirs</span>
              <span class="timer" [class.running]="game()?.status === 'ACTIVE' && !whiteToMove()">{{ displayBlackTime() }}</span>
            </div>
          </div>
          @if (game()?.status === 'FINISHED') {
            <p class="result">{{ game()?.winnerUsername ? game()!.winnerUsername + ' a gagné' : 'Partie terminée' }}</p>
            <p class="replay-mode-hint">Utilisez les boutons ci-dessous pour rejouer les coups.</p>
          } @else if (game() && !loading()) {
            <p class="turn-hint" [class.your-turn]="isMyTurn()">{{ isMyTurn() ? 'À votre tour' : "En attente de l'adversaire" }}</p>
          }
          @if (game()?.status === 'ACTIVE') {
            <button class="resign-btn" (click)="resign()" [disabled]="resignLoading()">Abandonner la partie</button>
          }
        </div>
      </header>

      <div class="content">
        <div class="board-wrap">
          @if (game(); as g) {
            <div class="board-frame">
              <app-chess-board
                [fen]="currentFen()"
                [isWhite]="isWhite()"
                [isMyTurn]="isMyTurn()"
                [replayIndex]="replayIndex()"
                [moves]="moves()"
                (move)="onMove($event)"
                (replayChange)="onReplayChange($event)"
              />
            </div>
          } @else if (loading()) {
            <p class="muted">Chargement…</p>
          } @else {
            <p class="error">Partie introuvable.</p>
          }
        </div>

        <aside class="sidebar">
          <p class="how-to-play">Cliquez sur une pièce, puis sur la case de destination.</p>
          <h3>Coups joués</h3>
          <div class="replay-controls">
            <button class="secondary icon" (click)="setReplayIndex(0)" [disabled]="replayIndex() <= 0" title="Début">⏮</button>
            <button class="secondary icon" (click)="stepReplay(-1)" [disabled]="replayIndex() <= 0" title="Précédent">←</button>
            <span class="replay-count">{{ replayIndex() }} / {{ moves().length }}</span>
            <button class="secondary icon" (click)="stepReplay(1)" [disabled]="replayIndex() >= moves().length" title="Suivant">→</button>
            <button class="secondary icon" (click)="setReplayIndex(moves().length)" [disabled]="replayIndex() >= moves().length" title="Fin">⏭</button>
          </div>
          <ul class="move-list">
            @for (m of moves(); track m.moveNumber; let i = $index) {
              <li [class.highlight]="replayIndex() === i + 1">
                <span class="move-num">{{ m.moveNumber }}.</span>
                <span class="move-notation">{{ m.fromSquare }} → {{ m.toSquare }}</span>
                @if (m.promotion) { <span class="promo">{{ m.promotion }}</span> }
              </li>
            }
          </ul>
          @if (error()) {
            <p class="error">{{ error() }}</p>
          }
        </aside>
      </div>
    </div>
  `,
  styles: [`
    .game-page { max-width: 960px; margin: 0 auto; padding: 1.5rem 1.25rem 2rem; min-width: 0; padding-top: max(1.5rem, env(safe-area-inset-top)); }
    .header { margin-bottom: 1.5rem; }
    .back { color: var(--text-muted); font-size: 0.9rem; display: inline-block; margin-bottom: 0.75rem; transition: color 0.2s; }
    .back:hover { color: var(--accent); }
    .header-main { background: var(--bg-card); padding: 1.5rem 1.75rem; border-radius: var(--radius); border: 1px solid var(--border); box-shadow: var(--shadow); }
    .header h1 { margin: 0 0 1rem; font-size: 1.4rem; color: var(--text); }
    .players-row { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .player-badge { flex: 1; min-width: 140px; padding: 0.75rem 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--bg-dark-soft); transition: border-color 0.2s, box-shadow 0.2s; }
    .player-badge.white { border-left: 3px solid var(--square-light); }
    .player-badge.black { border-left: 3px solid #3d3d3d; }
    .player-badge.active { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent), 0 0 20px var(--accent-soft); }
    .player-name { display: block; font-weight: 600; font-size: 1rem; color: var(--text); }
    .player-role { font-size: 0.8rem; color: var(--text-muted); }
    .player-badge .timer { display: block; font-size: 0.9rem; margin-top: 0.25rem; color: var(--text-muted); }
    .player-badge .timer.running { color: var(--accent); font-weight: 600; }
    .vs-badge { font-family: 'Cinzel', serif; font-size: 0.85rem; font-weight: 600; color: var(--text-muted); padding: 0 0.5rem; }
    .result { margin: 0.75rem 0 0; font-size: 1.1rem; color: var(--accent); font-weight: 600; }
    .replay-mode-hint { margin: 0.25rem 0 0; font-size: 0.85rem; color: var(--text-muted); }
    .turn-hint { margin: 0.75rem 0 0; font-size: 0.9rem; color: var(--text-muted); }
    .turn-hint.your-turn { color: var(--accent); font-weight: 600; }
    .resign-btn { margin-top: 1rem; padding: 0.5rem 1rem; font-size: 0.85rem; background: transparent; color: var(--danger); border: 1px solid var(--danger); border-radius: var(--radius-sm); transition: background 0.2s, color 0.2s; }
    .resign-btn:hover:not(:disabled) { background: var(--danger); color: white; }
    .content { display: grid; grid-template-columns: 1fr; gap: 1.5rem; min-width: 0; }
    @media (min-width: 760px) {
      .content { grid-template-columns: auto 1fr; align-items: start; gap: 2rem; }
    }
    .board-wrap { min-width: 0; display: flex; justify-content: center; overflow: visible; }
    .board-frame { padding: 1rem; background: var(--bg-card); border-radius: var(--radius); border: 1px solid var(--border); box-shadow: var(--shadow-board); display: inline-block; overflow: visible; }
    .sidebar { min-width: 0; max-width: 320px; background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--border); box-shadow: var(--shadow); }
    .how-to-play { font-size: 0.85rem; color: var(--text-muted); margin: 0 0 1.25rem; line-height: 1.5; padding: 0.5rem 0; }
    .sidebar h3 { margin: 0 0 0.75rem; font-size: 1rem; font-weight: 600; color: var(--text); letter-spacing: 0.02em; }
    .replay-controls { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .replay-controls button.icon { padding: 0.4rem 0.6rem; min-width: 2rem; }
    .replay-count { font-size: 0.9rem; color: var(--text-muted); min-width: 3.5rem; text-align: center; font-variant-numeric: tabular-nums; }
    .move-list { list-style: none; padding: 0; margin: 0; max-height: 280px; overflow-y: auto; border-radius: var(--radius-sm); background: var(--bg-dark-soft); }
    .move-list li { padding: 0.5rem 0.75rem; font-size: 0.9rem; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; transition: background 0.15s; }
    .move-list li:last-child { border-bottom: none; }
    .move-list li.highlight { background: var(--accent-soft); color: var(--accent); font-weight: 600; }
    .move-num { color: var(--text-muted); min-width: 1.75rem; font-variant-numeric: tabular-nums; }
    .move-notation { font-family: ui-monospace, monospace; letter-spacing: 0.02em; }
    .promo { font-size: 0.8em; opacity: 0.9; }
    .muted { margin: 0.5rem 0; color: var(--text-muted); }
    .error { margin: 0.5rem 0; color: var(--danger); font-size: 0.9rem; }
  `],
})
export class GameComponent implements OnInit, OnDestroy {
  game = signal<GameDto | null>(null);
  loading = signal(true);
  moves = signal<MoveDto[]>([]);
  currentFen = signal<string>('');
  replayIndex = signal(0);
  error = signal('');
  resignLoading = signal(false);
  lastGameFetchAt = signal(0);
  tick = signal(0);
  private unsubGame: (() => void) | null = null;
  private destroy$ = new Subject<void>();
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private gameId: number | null = null;

  /** true = joueur courant a les blancs (invitant), false = a les noirs (invité). */
  isWhite = computed(() => {
    const g = this.game();
    const me = this.auth.currentUsername() ?? '';
    if (!g?.whiteUsername) return true;
    return g.whiteUsername.toLowerCase() === me.toLowerCase();
  });

  whiteToMove = computed(() => this.moves().length % 2 === 0);

  isMyTurn = computed(() => {
    const m = this.moves();
    const idx = this.replayIndex();
    if (idx !== m.length) return false;
    return this.isWhite() === this.whiteToMove();
  });

  displayWhiteTime = computed(() => this.formatTime(this.displayWhiteSeconds()));
  displayBlackTime = computed(() => this.formatTime(this.displayBlackSeconds()));

  private displayWhiteSeconds(): number {
    this.tick();
    const g = this.game();
    if (!g || g.status !== 'ACTIVE') return g?.whiteRemainingSeconds ?? 600;
    const base = g.whiteRemainingSeconds ?? 600;
    if (!this.whiteToMove()) return base;
    const elapsed = Math.floor(Date.now() / 1000) - Math.floor(this.lastGameFetchAt() / 1000);
    return Math.max(0, base - elapsed);
  }

  private displayBlackSeconds(): number {
    this.tick();
    const g = this.game();
    if (!g || g.status !== 'ACTIVE') return g?.blackRemainingSeconds ?? 600;
    const base = g.blackRemainingSeconds ?? 600;
    if (this.whiteToMove()) return base;
    const elapsed = Math.floor(Date.now() / 1000) - Math.floor(this.lastGameFetchAt() / 1000);
    return Math.max(0, base - elapsed);
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.max(0, Math.floor(seconds % 60));
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  constructor(
    private route: ActivatedRoute,
    public auth: AuthService,
    private ws: WebSocketService,
    private gameService: GameService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.gameId = id || null;
    if (!id) {
      this.loading.set(false);
      return;
    }
    this.ws.connect();
    this.gameService.getGame(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (g) => {
        this.setGameState(g);
        this.loading.set(false);
        this.ensureSubscribed(id);
        this.ws.isConnected$.pipe(takeUntil(this.destroy$)).subscribe((connected) => {
          if (!connected) {
            this.unsubGame?.();
            this.unsubGame = null;
          } else {
            this.ensureSubscribed(id);
          }
        });
      },
      error: () => {
        this.loading.set(false);
      },
    });
    this.ws.errors$.pipe(takeUntil(this.destroy$)).subscribe((e) => {
      if (e.gameId === id) this.error.set(e.message);
    });
    this.timerInterval = setInterval(() => this.tick.update((t) => t + 1), 1000);
    this.syncInterval = setInterval(() => this.syncMovesFromServer(id), 1500);
    setTimeout(() => this.syncMovesFromServer(id), 800);
  }

  /** Poll server for new moves so the other player sees them without playing or refreshing. */
  private syncMovesFromServer(id: number): void {
    const g = this.game();
    if (!g || g.status !== 'ACTIVE') return;
    this.gameService.getGame(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (server) => {
        const serverMoves = server.moves?.length ?? 0;
        const localMoves = this.moves().length;
        if (serverMoves > localMoves) {
          this.setGameState(server);
        }
        if (server.status === 'FINISHED') {
          this.game.set(server);
        }
      },
    });
  }

  private setGameState(g: GameDto): void {
    this.game.set(g);
    this.moves.set(g.moves || []);
    this.replayIndex.set((g.moves || []).length);
    this.updateFenFromMoves();
    this.lastGameFetchAt.set(Date.now());
  }

  /** Subscribe to game topic so we receive opponent moves. Resubscribes on reconnect. */
  private ensureSubscribed(id: number): void {
    if (!this.ws.isConnected()) return;
    this.unsubGame?.();
    this.unsubGame = this.ws.subscribeGame(id, (data) => {
      if (data.type === 'MOVE' && data.move) this.onRemoteMove(this.normalizeMove(data.move));
      else if (data.type === 'GAME_OVER') this.onGameOver(data.winnerUsername ?? '');
    });
  }

  private normalizeMove(m: unknown): MoveDto {
    const o = m as Record<string, unknown>;
    return {
      moveNumber: Number(o['moveNumber']) || 0,
      fromSquare: String(o['fromSquare'] ?? ''),
      toSquare: String(o['toSquare'] ?? ''),
      piece: String(o['piece'] ?? 'P'),
      promotion: o['promotion'] != null ? String(o['promotion']) : undefined,
    };
  }

  ngOnDestroy(): void {
    this.unsubGame?.();
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.destroy$.next();
    this.destroy$.complete();
  }

  onGameOver(winnerUsername: string): void {
    this.game.update((g) => (g ? { ...g, status: 'FINISHED', winnerUsername } : g));
    this.error.set('');
  }

  onRemoteMove(move: MoveDto): void {
    if (!move.fromSquare || !move.toSquare) return;
    this.moves.update((list) => {
      const exists = list.some(
        (m) => m.moveNumber === move.moveNumber && m.fromSquare === move.fromSquare && m.toSquare === move.toSquare
      );
      if (exists) return list;
      const next = [...list, move].sort((a, b) => a.moveNumber - b.moveNumber);
      return next;
    });
    this.replayIndex.set(this.moves().length);
    this.updateFenFromMoves();
    this.error.set('');
    if (this.gameId) {
      this.gameService.getGame(this.gameId).pipe(takeUntil(this.destroy$)).subscribe({
        next: (g) => {
          this.game.set(g);
          this.lastGameFetchAt.set(Date.now());
        },
      });
    }
  }

  resign(): void {
    const id = this.gameId ?? this.game()?.id;
    if (!id) return;
    this.resignLoading.set(true);
    this.gameService.resign(id).subscribe({
      next: () => {
        const g = this.game();
        const other = g?.whiteUsername === this.auth.currentUsername() ? g?.blackUsername : g?.whiteUsername;
        this.game.update((game) => (game ? { ...game, status: 'FINISHED', winnerUsername: other ?? '' } : game));
        this.resignLoading.set(false);
      },
      error: () => this.resignLoading.set(false),
    });
  }

  onMove(e: { from: string; to: string; piece?: string; promotion?: string }): void {
    const g = this.game();
    if (!g) return;
    this.error.set('');
    const moveNumber = this.moves().length + 1;
    const optimisticMove: MoveDto = {
      moveNumber,
      fromSquare: e.from,
      toSquare: e.to,
      piece: e.piece || 'P',
      promotion: e.promotion,
    };
    this.moves.update((list) => [...list, optimisticMove]);
    this.updateFenFromMoves();
    this.replayIndex.set(this.moves().length);
    this.ws.sendMove(g.id, this.moves().length - 1, e.from, e.to, e.piece, e.promotion);
  }

  onReplayChange(index: number): void {
    this.replayIndex.set(index);
  }

  setReplayIndex(index: number): void {
    this.replayIndex.set(index);
    this.updateFenFromMoves();
  }

  stepReplay(delta: number): void {
    const idx = Math.max(0, Math.min(this.moves().length, this.replayIndex() + delta));
    this.setReplayIndex(idx);
  }

  private updateFenFromMoves(): void {
    const moves = this.moves();
    const idx = this.replayIndex();
    const sub = moves.slice(0, idx);
    const fen = this.buildFenFromMoves(sub);
    this.currentFen.set(fen);
  }

  private buildFenFromMoves(moves: MoveDto[]): string {
    let fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    for (const m of moves) {
      fen = this.applyMoveToFen(fen, m.fromSquare, m.toSquare, m.promotion);
    }
    return fen;
  }

  private applyMoveToFen(fen: string, from: string, to: string, promotion?: string): string {
    const parts = fen.split(' ');
    let board = parts[0];
    const toMove = parts[1] || 'w';
    const grid: string[][] = [];
    let row: string[] = [];
    for (const c of board) {
      if (c === '/') {
        grid.push(row);
        row = [];
      } else if (/\d/.test(c)) {
        for (let i = 0; i < +c; i++) row.push('.');
      } else {
        row.push(c);
      }
    }
    if (row.length) grid.push(row);
    const fromFile = from.charCodeAt(0) - 97;
    const fromRank = 8 - +from[1];
    const toFile = to.charCodeAt(0) - 97;
    const toRank = 8 - +to[1];
    let piece = grid[fromRank][fromFile];
    if (promotion && piece.toLowerCase() === 'p') {
      piece = toMove === 'w' ? promotion.toUpperCase() : promotion.toLowerCase();
    }
    grid[fromRank][fromFile] = '.';
    grid[toRank][toFile] = piece;
    const newBoard = grid.map((r) => {
      let s = '';
      let empty = 0;
      for (const c of r) {
        if (c === '.') empty++;
        else {
          if (empty) { s += empty; empty = 0; }
          s += c;
        }
      }
      if (empty) s += empty;
      return s;
    }).join('/');
    const next = toMove === 'w' ? 'b' : 'w';
    return newBoard + ' ' + next + ' ' + (parts[2] || 'KQkq') + ' ' + (parts[3] || '-') + ' 0 1';
  }
}
