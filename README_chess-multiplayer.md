# Échecs multijoueurs – Instructions de lancement

Projet **Angular (frontend)** + **Spring Boot (backend)**.

---

## Prérequis

- **Node.js** 18+ et **npm** (pour le frontend)
- **Java 17** et **Maven** (ou le wrapper `mvnw` fourni dans le projet pour le backend)

---

## 1. Lancer le backend (Spring Boot)

Ouvre un terminal dans le dossier du projet, puis va dans `backend` :

```bash
cd chemin\vers\chess-multiplayer\backend
```

Lance l’application avec Maven :

**Windows (PowerShell ou CMD) :**
```bash
.\mvnw.cmd spring-boot:run
```

**Linux / Mac :**
```bash
./mvnw spring-boot:run
```

Le backend tourne sur **http://localhost:8080** (API REST + WebSocket).

---

## 2. Lancer le frontend (Angular)

Ouvre un **autre** terminal, reste dans le dossier du projet puis va dans `frontend` :

```bash
cd chemin\vers\chess-multiplayer\frontend
```

Installe les dépendances (une seule fois) :

```bash
npm install
```

Démarre l’application Angular :

```bash
npm start
```

Ou :

```bash
ng serve
```

Le frontend tourne sur **http://localhost:4200**.

Ouvre un navigateur sur **http://localhost:4200** pour utiliser l’application. Les appels vers `/api` et `/ws` sont redirigés vers le backend (port 8080) via le proxy Angular.

---

## Résumé

| Étape | Où aller        | Commande                          |
|-------|-----------------|-----------------------------------|
| 1     | `backend`       | `.\mvnw.cmd spring-boot:run`      |
| 2     | `frontend`      | `npm install` puis `npm start`    |

Toujours lancer le **backend avant** le frontend, puis ouvrir **http://localhost:4200** dans le navigateur.
