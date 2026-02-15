import { Component, Input, Output, EventEmitter, signal, computed, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MoveDto } from '../../services/game.service';

const PIECE_SYMBOLS: Record<string, string> = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-chess-board',
  template: `
    <div class="board" [class.flipped]="!isWhite">
      <div class="board-inner">
        <ng-container *ngFor="let ri of rows; let rIndex = index">
          <ng-container *ngFor="let col of cols; let cIndex = index">
            <button
              type="button"
              class="cell"
              [class.light]="(ri + col) % 2 === 0"
              [class.dark]="(ri + col) % 2 !== 0"
              [class.selected]="selected() === squareId(ri, col)"
              [class.highlight]="highlightSquares().includes(squareId(ri, col))"
              (click)="onCellClick(squareId(ri, col))"
            >
              <span class="piece" *ngIf="pieceAt(squareId(ri, col))" [class.piece-white]="pieceSide(squareId(ri, col)) === 'white'" [class.piece-black]="pieceSide(squareId(ri, col)) === 'black'">{{ pieceAt(squareId(ri, col)) }}</span>
            </button>
          </ng-container>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    .board { display: inline-block; border-radius: 8px; overflow: visible; }
    .board.flipped .board-inner { transform: rotate(180deg); }
    .board-inner { display: grid; grid-template-columns: repeat(8, 1fr); grid-template-rows: repeat(8, 1fr); width: min(85vw, 420px); height: min(85vw, 420px); border: 2px solid rgba(0,0,0,0.2); border-radius: 6px; overflow: visible; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06); }
    .cell { width: 100%; height: 100%; min-height: 0; border: none; padding: 0; display: flex; align-items: center; justify-content: center;
      font-size: clamp(1.6rem, 5vw, 2.6rem); cursor: pointer; transition: background 0.15s, outline 0.15s, transform 0.1s; box-sizing: border-box; }
    .cell:hover:not(.selected) { transform: scale(1.02); }
    .cell.light { background: var(--square-light); }
    .cell.dark { background: var(--square-dark); }
    .cell.light:hover:not(.selected):not(.highlight) { background: var(--square-light-hover); }
    .cell.dark:hover:not(.selected):not(.highlight) { background: var(--square-dark-hover); }
    .cell.selected { outline: 3px solid var(--accent); outline-offset: -2px; z-index: 1; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1); }
    .cell.highlight { background: rgba(212, 175, 55, 0.5) !important; }
    .piece { user-select: none; pointer-events: none; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.25)); }
    .piece.piece-white { color: #f5f0e8; text-shadow: 0 1px 2px rgba(0,0,0,0.35), 0 0 1px rgba(0,0,0,0.2); }
    .piece.piece-black { color: #2a2a2a; text-shadow: 0 1px 1px rgba(255,255,255,0.4), 0 0 1px rgba(255,255,255,0.2); }
  `],
})
export class ChessBoardComponent implements OnChanges {
  @Input() fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  @Input() isWhite = true;
  @Input() isMyTurn = true;
  @Input() replayIndex = 0;
  @Input() moves: MoveDto[] = [];

  @Output() move = new EventEmitter<{ from: string; to: string; piece?: string; promotion?: string }>();
  @Output() replayChange = new EventEmitter<number>();

  selected = signal<string | null>(null);
  private grid = signal<string[][]>(this.fenToGrid(this.fen));

  // rows and cols exposed as getters so templates can iterate without calling boolean signals
  get rows(): number[] { return this.isWhite ? [0,1,2,3,4,5,6,7] : [7,6,5,4,3,2,1,0]; }
  get cols(): number[] { return this.isWhite ? [0,1,2,3,4,5,6,7] : [7,6,5,4,3,2,1,0]; }

  highlightSquares = computed(() => {
    const s = this.selected();
    if (!s) return [];
    return [s];
  });

  squareId(rankIndex: number, fileIndex: number): string {
    const r = this.isWhite ? 8 - rankIndex - 1 : rankIndex;
    const c = this.isWhite ? fileIndex : 7 - fileIndex;
    const file = String.fromCharCode(97 + c);
    const rank = 8 - r;
    return file + rank;
  }

  pieceAt(sq: string): string {
    const c = this.pieceCharAt(sq);
    return c ? (PIECE_SYMBOLS[c] ?? c) : '';
  }

  pieceCharAt(sq: string): string {
    const grid = this.grid();
    const file = sq.charCodeAt(0) - 97;
    const rank = 8 - +sq[1];
    if (rank < 0 || rank > 7 || file < 0 || file > 7) return '';
    const c = grid[rank]?.[file];
    return c && c !== '.' ? c : '';
  }

  /** White = uppercase in FEN, black = lowercase */
  pieceSide(sq: string): 'white' | 'black' | null {
    const c = this.pieceCharAt(sq);
    if (!c) return null;
    return /[KQRBNP]/.test(c) ? 'white' : 'black';
  }

  onCellClick(sq: string): void {
    if (!this.isMyTurn) return;
    const from = this.selected();
    if (!from) {
      const grid = this.grid();
      const file = sq.charCodeAt(0) - 97;
      const rank = 8 - +sq[1];
      const piece = grid[rank]?.[file];
      if (piece && (this.isWhite ? /[KQRBNP]/.test(piece) : /[kqrbnp]/.test(piece))) {
        this.selected.set(sq);
      }
      return;
    }
    if (from === sq) {
      this.selected.set(null);
      return;
    }
    const piece = this.pieceCharAt(from);
    this.move.emit({ from, to: sq, piece: piece || 'P' });
    this.selected.set(null);
  }

  private fenToGrid(fen: string): string[][] {
    const board = fen.split(' ')[0] || '';
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
    return grid;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fen']) {
      this.grid.set(this.fenToGrid(this.fen));
    }
  }
}
