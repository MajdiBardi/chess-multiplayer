import { Injectable, OnDestroy } from '@angular/core';
import { AuthService } from './auth.service';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject, BehaviorSubject } from 'rxjs';

const WS_URL = '/ws';

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private client: Client | null = null;
  private connected = new BehaviorSubject<boolean>(false);
  private lobbyUsers = new BehaviorSubject<string[]>([]);
  private invitations = new Subject<{ fromUsername: string; type: string; gameId?: number; whiteUsername?: string; blackUsername?: string }>();
  private gameMoves = new Subject<{ gameId: number; type: string; move?: unknown }>();
  private errors = new Subject<{ message: string; gameId?: number }>();

  isConnected$ = this.connected.asObservable();

  isConnected(): boolean {
    return this.connected.value;
  }

  lobbyUsers$ = this.lobbyUsers.asObservable();
  invitations$ = this.invitations.asObservable();
  gameMoves$ = this.gameMoves.asObservable();
  errors$ = this.errors.asObservable();

  constructor(private auth: AuthService) {}

  connect(): void {
    const token = this.auth.getToken();
    if (!token) return;
    if (this.client?.active) return;

    const socket = new SockJS(WS_URL);
    this.client = new Client({
      webSocketFactory: () => socket as unknown as WebSocket,
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => {
        this.connected.next(true);
        this.subscribeLobby();
        this.sendJoinLobby();
      },
      onDisconnect: () => {
        this.connected.next(false);
        this.lobbyUsers.next([]);
      },
      onStompError: (frame) => console.error('STOMP error', frame),
    });
    this.client.activate();
  }

  private subscribeLobby(): void {
    if (!this.client?.connected) return;
    const pushLobbyUsers = (msg: { body: string }) => {
      const body = JSON.parse(msg.body);
      this.lobbyUsers.next(body.usernames || []);
    };
    this.client.subscribe('/topic/lobby/users', pushLobbyUsers);
    this.client.subscribe('/user/queue/lobby/users', pushLobbyUsers);
    this.client.subscribe('/user/queue/invitations', (msg) => {
      this.invitations.next(JSON.parse(msg.body));
    });
    this.client.subscribe('/user/queue/errors', (msg) => {
      this.errors.next(JSON.parse(msg.body));
    });
  }

  private sendJoinLobby(): void {
    this.send('/app/lobby/join', {});
  }

  send(dest: string, body: object): void {
    if (!this.client?.connected) return;
    this.client.publish({ destination: dest, body: JSON.stringify(body) });
  }

  invite(toUsername: string): void {
    this.send('/app/lobby/invite', { toUsername });
  }

  acceptInvitation(fromUsername: string): void {
    this.send('/app/lobby/accept', { fromUsername });
  }

  declineInvitation(fromUsername: string): void {
    this.send('/app/lobby/decline', { fromUsername });
  }

  subscribeGame(gameId: number, onMessage: (data: { type: string; move?: unknown; winnerUsername?: string }) => void): () => void {
    if (!this.client?.connected) return () => {};
    const sub = this.client.subscribe(`/topic/game/${gameId}`, (msg) => {
      const data = JSON.parse(msg.body);
      onMessage(data);
    });
    return () => sub.unsubscribe();
  }

  sendMove(gameId: number, moveNumber: number, fromSquare: string, toSquare: string, piece?: string, promotion?: string): void {
    const body: Record<string, unknown> = { moveNumber, fromSquare, toSquare };
    if (piece) body['piece'] = piece;
    if (promotion) body['promotion'] = promotion;
    this.send(`/app/game/${gameId}/move`, body);
  }

  disconnect(): void {
    this.client?.deactivate();
    this.client = null;
    this.connected.next(false);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
