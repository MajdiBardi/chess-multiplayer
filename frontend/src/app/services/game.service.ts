import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

const API = '/api';

export interface MoveDto {
  moveNumber: number;
  fromSquare: string;
  toSquare: string;
  piece: string;
  promotion?: string;
}

export interface GameDto {
  id: number;
  whiteUsername: string;
  blackUsername: string;
  status: string;
  winnerUsername?: string;
  moves: MoveDto[];
  fen: string;
  whiteRemainingSeconds?: number;
  blackRemainingSeconds?: number;
  turnStartedAtEpochMs?: number;
}

@Injectable({ providedIn: 'root' })
export class GameService {
  constructor(private http: HttpClient) {}

  getActiveGames(): Observable<GameDto[]> {
    return this.http.get<GameDto[]>(`${API}/games/active`);
  }

  getGameHistory(): Observable<GameDto[]> {
    return this.http.get<GameDto[]>(`${API}/games/history`);
  }

  getGame(id: number): Observable<GameDto> {
    return this.http.get<GameDto>(`${API}/games/${id}`);
  }

  resign(id: number): Observable<void> {
    return this.http.post<void>(`${API}/games/${id}/resign`, {});
  }

  /** Poll for pending invitation (fallback when WebSocket does not deliver). 200 + {} = no invitation. */
  getPendingInvitation(): Observable<{ fromUsername?: string } | null> {
    return this.http
      .get<{ fromUsername?: string }>(`${API}/invitations/pending`)
      .pipe(catchError(() => of(null)));
  }
}
