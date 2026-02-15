# Échecs multijoueurs — Full Stack

Prototype fonctionnel d’un jeu d’échecs multijoueurs en temps réel.

**Stack :** Angular 17 • Spring Boot 3 • WebSockets (STOMP over SockJS) • H2 (persistance)

---

## Prérequis

- **Java 17**
- **Node.js 18+** et **npm**
- **Maven 3.8+** (ou wrapper fourni)

---

## Lancer le projet

### 1. Backend (Spring Boot)

```bash
cd backend
./mvnw spring-boot:run
```

Sous Windows :

```bash
cd backend
mvnw.cmd spring-boot:run
```

Le serveur démarre sur **http://localhost:8080**.

- API REST : `http://localhost:8080/api`
- WebSocket : `http://localhost:8080/ws`
- Console H2 (optionnel) : `http://localhost:8080/h2-console` (JDBC URL : `jdbc:h2:file:./data/chessdb`)

### 2. Frontend (Angular)

```bash
cd frontend
npm install
npm start
```

L’application est servie sur **http://localhost:4200** avec proxy vers le backend (API + WebSocket).

---

## Fonctionnalités

### Niveau 1 — Base
- **Authentification** : création de compte et connexion (JWT)
- **Liste des joueurs connectés** en temps réel
- **Invitation** d’un joueur en ligne
- **Notification d’invitation** avec **accepter** / **refuser**

### Niveau 2 — Fonctionnel
- **Création de partie** lorsque l’invitation est acceptée
- **Plateau 8×8** avec pièces
- **Synchronisation des coups en temps réel** via WebSockets
- **Persistance** : chaque coup est enregistré en base (historique)
- **Reprise de partie** : en revenant sur l’app et en rouvrant une partie en cours, l’état est rechargé depuis la base

### Niveau 3 — Bonus
- **Relecture d’une partie** : boutons Début / ← / → / Fin pour rejouer les coups séquentiellement
- **Validation simple des mouvements** : vérification de la pièce, de la couleur et des cases (sans règles avancées type échec/pat)
- **Panneau latéral** listant les coups joués

### Extras
- **Abandon** : bouton « Abandonner la partie » (l'adversaire est déclaré gagnant).
- **Minuteur 10 min par joueur** : temps qui défile à son tour ; à 0, le joueur perd (vérification serveur chaque seconde).

---

## Structure du projet

```
chess-multiplayer/
├── backend/          # Spring Boot
│   ├── src/main/java/com/chess/
│   │   ├── config/     # Security, WebSocket, CORS
│   │   ├── controller/ # REST (auth, games)
│   │   ├── dto/
│   │   ├── entity/     # User, Game, GameMove
│   │   ├── repository/
│   │   ├── security/   # JWT
│   │   ├── service/    # Auth, Game, ChessBoard (FEN + validation)
│   │   └── websocket/  # Lobby, invitations, moves
│   └── pom.xml
├── frontend/         # Angular 17
│   ├── src/app/
│   │   ├── components/ # chess-board
│   │   ├── guards/
│   │   ├── pages/      # login, register, lobby, game
│   │   └── services/   # auth, websocket, game
│   ├── proxy.conf.json # Proxy /api et /ws vers localhost:8080
│   └── package.json
└── README.md
```

---

## Test rapide

1. Lancer le backend puis le frontend.
2. Créer deux comptes (ou deux navigateurs / fenêtres privées).
3. Se connecter avec les deux utilisateurs.
4. Depuis le premier : inviter le second.
5. Depuis le second : accepter l’invitation → la partie s’ouvre.
6. Jouer des coups : ils sont visibles en temps réel et enregistrés.
7. Quitter la partie et revenir au lobby : la partie apparaît dans « Parties en cours » ; cliquer pour **reprendre**.
8. Utiliser le panneau « Coups joués » et les boutons de relecture pour **rejouer** la partie.
9. **Abandon** : cliquer sur « Abandonner la partie » pour abandonner (l’adversaire gagne).
10. **Minuteur** : chaque joueur dispose de 10 minutes ; le temps défile à son tour ; à 0, il perd.

---

**let's run it**
