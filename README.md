# 🕹️ Alias Game – Multiplayer Word Guessing Game

1. [Overview](#overview)
2. [Setup](#setup)
3. [Project Structure](#project-structure)
4. [Game Rules (Summary)](#game-rules-summary)
5. [Architecture Notes](#architecture-notes)
6. [Endpoints & Sockets](#endpoints--sockets)
   - [HTTP Endpoints](#http-endpoints)
   - [WebSocket Events](#websockets-events)
   - [Examples of Typical Flows](#examples-of-typical-flows)
7. [Entities Relationship](#entities-relationship)
8. [Project Summary](#project-summary)

## Overview

Alias Game is a real-time multiplayer word-guessing game. Players authenticate, create or join rooms, split into Red and Blue teams, and play rounds where teams describe and guess words under a timer.
The frontend is a React application that communicates with a backend via HTTP (Axios) and real-time synchronization using WebSockets (Socket.IO).

---

## Setup

To run the project locally:

1. Make sure you have Docker installed and running.
2. Open two terminal windows.
3. In the first terminal:
   ```bash
   - cd backend
   - docker compose up --build # if already started once no param
   ```
4. In the second terminal:
   ```bash
   - cd frontend
   - npm install
   - npm run dev
   ```

## Project structure

```bash
backend/
│
├── static/                # Static resources
│   └── json/
│
├── src/
│   ├── config/            # DB/Redis setup and boot config
│   ├── routes/            # Express route definitions
│   ├── controllers/       # Route handlers, HTTP logic
│   ├── services/          # Core business logic and operations
│   ├── models/            # Domain models and data structures
│   │   └── sequelize/
│   ├── repositories/      # Data access layer (DB and cache queries)
│   ├── middlewares/       # Request validation and socket event guards
│   │   ├── http/
│   │   └── sockets/
│   ├── schemas/           # Zod schemas for validation
│   ├── sockets/           # Socket.io event handlers and emitters
│   ├── test/              # Unit and integration tests
│   ├── utils/             # Helpers and utility functions
│   ├── app.js             # Express app setup and middleware registration
│   └── server.js          # Entry point, server and socket initialization
│
└── docker-compose.yml      # Docker setup for DB and services
```

## Game Rules (Summary)

- The game is played in turns between Red and Blue teams.
- Each turn, one player becomes the Describer, and the rest are Guessers.
- The Describer must describe a secret word without using it or any taboo words.
- Guessers type their guesses in chat — the system gives feedback for similar words.
- The Describer can skip a word, but each skip adds a cooldown penalty.
- Each turn lasts 1 minute, then it switches to the other team.
- Each correct guess gives +1 point; the team with more points wins the match and earns +1 global score.

## Architecture Notes

This project was built with a layered architecture to separate concerns and support real-time features efficiently.

- **HTTP + WebSocket Integration:** combines REST for room lifecycle and authentication with real-time synchronization through Socket.IO.
- **Redis Game State:** all active games live entirely in Redis, allowing fast lookups and ephemeral data handling.
- **PostgreSQL Persistence:** stores users, rooms, words and historical results through Sequelize ORM.
- **Zod + OpenAPI:** used for data validation and automatic API documentation.
- **Dockerized Setup:** enables isolated environments for the database and backend services.

This design balances _performance_ (fast, in-memory operations via Redis) with _consistency_ (persistent data in SQL) — key to supporting real-time multiplayer behavior without data loss.

## Endpoints & Sockets

The API uses REST endpoints for authentication and room lifecycle actions (create, join, leave, start game).
For real-time events uses web sockets (Socket.io).
Even though these are separate protocols, we used both together to provide a full user experience.

> For more detailed info about endpoints and socket events visit [our swagger docs](https://valentinozucchellapaz.github.io/Alias-Game-API/)

### HTTP endpoints

expressed as relative to the backend base url: http://localhost:3000/api.

POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/refresh-token
GET /rooms
POST /rooms
GET /rooms/:roomCode
POST /rooms/:roomCode/join
POST /rooms/:roomCode/start
DELETE /rooms/:roomCode/leave

### Websockets events

Most of the events **sent from the server to the client** are received in the [Room Page](frontend/src/pages/RoomPage.jsx) in the client. While all of them are emmited with the [SocketEventEmitter](backend/src/sockets/SocketEventEmmiter.js) in the server.

The events **sent from the client to the server** are sent in different parts of the client, but all are received in the [socketRegister](backend/src/sockets/registerRoomSocket.js) file.

#### Client side - connection

Client connects with the `socket.io-client` library and passing an access token handshake.

```javascript
const newSocket = io("http://localhost:3000", {
  autoConnect: true,
  auth: { token, override: true }, // override closes other socket connections under the same user
});
```

- The server will emmit "connect", "connect_error" on this action
- We recommend reviewing our [code example](frontend/src/context/SocketContext.jsx)

#### 📨 Client → Server Events

Events the client sends to the server.

- `chat:message`
  Sends a chat message to the server (code, user, text).
  The server broadcasts it to all players as chat:message.

- `game:message`
  Sends a in-game message (code, user, text).
  The server checks is its a guess, a description or a normal message, makes validations and emits one of:
  `game:correct-answer`, `game:taboo-word`, `game:similar-word`, or `chat:message`.

- `game:skip-word`
  Requests to skip the current word (userId, roomCode).
  The server responds by emitting a `game:new-word` event.

- `join-team`
  Requests to join a specific team (roomCode, team, userId).
  The server emits `team-state` event with the teams.

#### 📡 Server → Client Events

Events the server sends to the client.

All events are sent with a fixed payload and handle in the client [here](frontend/src/pages/RoomPage.jsx)

```javascript
{
    type, // room:event-name
    status, // "success" | "error" | "info" | "system" | http-code
    data, // {} depending on the response
    message, // string
    timestamp: new Date().toISOString(),
}
```

- `player:joined` / `player:left`
  Notifies when a player joins or leaves the room.
  data: { userId, userName, roomCode }

- `chat:message`
  Chat message broadcast from any player.
  data: { user, text } user: { id, name, role } (jwt payload)

- `team-state`
  Updated state of all teams.
  data: { teams } teams: { red : [userIds], blue: [userIds] }

- `game:started` / `game:finished`
  Indicates the start or end of a game, including state or results.
  data: { game, results } results: { red : int, blue: int } and [Game class](#game)

- `game:turn-updated`
  Notifies when the current turn changes.
  data: { game } and [Game class](#game)

- `game:correct-answer`
  Indicates a player guessed correctly and returns the new word (updated game).
  data: { user, text, game } user: { id, name, role } (jwt payload) and game = [Game class](#game)

- `game:taboo-word`
  Warns that a taboo word was used (user, word, text).
  data: { user, word, text } user: { id, name, role } (jwt payload) and word and text are string

- `game:new-word`
  Sends a new word to guess.(game.wordToGuess with similarWords and tabooWords).
  data: { game } || {} the status of the payload is either "info" or "error" and game = [Game class](#game)

- `game:similar-word`
  Notifies when a similar word is detected (similarWord, similarity, type).
  data: { user, similarWord } user: { id, name, role } (jwt payload) and similarWord: { similarWord, similarity, type }

- `rateLimitWarning`
  Warns the client that it exceeded the message rate limit.

- `room:updated` / `room:close`
  Updates room information or indicates that the room was closed
  data: { room } and [Room](#room)

- `error` and `errorMessage`
  Internal server error message.

---

#### Examples of typical flows

1. User logs in

- HTTP: POST /auth/login -> receive accessToken
- Socket: SocketProvider picks up token and establishes socket connection with auth: { token }
- UI: navigate to home; Home fetches rooms via GET /rooms

2. Joining a room

- From Home: POST /rooms/:code/join (HTTP) -> updates Room status, joins session socket to that room and navigate to RoomPage (/room/:code)
- RoomPage initial HTTP GET /rooms/:roomCode to load room state
- Socket: client socket instances subscribes to socket events for the room (recieves all events broadcasted to that room)
- User clicks "Join Red" -> RoomPage emits join-team { roomCode, team: "red", userId }
- Backend updates teams and emits team-state to all participants
- Client receives team-state and updates UI; also receives a player:joined system message for more UI feedback

3. Starting and playing a game

- Room player issues POST /rooms/:roomCode/start -> backend responds with game state
- Backend also emits game:started to room via socket
- Client receives game info, UI switches to game view, starts Timer shows current turn describer team and word to the describer.
- During turns, backend emits game:turn-updated and game:correct-answer events to sync current word, timer, scores
- When game ends, backend emits game:finished; Client shows GameResults and returns to lobby view

---

## Entities Relationship

Brief summary of main domain entities and how they relate:

### [User](backend/src/models/sequelize/User.js)

- fields: id, name, email
- relationships: belongs to Room (as a player); assigned to team

### [Room](backend/src/models/sequelize/Room.js)

- fields: code (identifier), status (lobby | in-game | finished), players[], teams{}, chat[], games, globalScore
- Player contains id and active flag, Teams is a red/blue object which contains userIds, Games is a {red: int, blue: int} array containing prev games results
- relationships: contains Players (User id)

### [Game](backend/src/models/Game.js)

Only store in Redis

fields

- `roomCode`: unique code identifying the room.
- `teams`: contains red and blue teams with player lists, current describer index, and score.
- `currentTeam`: which team is currently playing.
- `currentDescriber`: user ID of the active describer.
- `wordToGuess`: object with { wordId, word, taboo[], similar[] }.
- `words`: words separated into { used[], unused[] }.
- `maxTurns`: number of total turns for the match.
- `turnsPlayed`: number of turns already completed.
- `state`: "waiting" | "playing" | "finished".
- `cooldown`: skip limiter { lastSkipTime, describerId, count }.

Key constraints

- A user must be part of room.players and active to access room page (RoomPage initial fetch enforces this).
- Rooms may be closed or finished and frontend handles redirects on room:close events.
- Game state exists only in redis when the game is going, when ended results are uploaded to Room; RoomPage toggles between "lobby" and "in-game" in the UI based on that.

---

## Project Summary

Alias Game was designed as a full-stack, real-time multiplayer experience focused on fast communication and team interaction.  
Building it involved challenges like synchronizing game state across multiple clients, managing socket events efficiently, and ensuring data consistency between Redis (ephemeral) and PostgreSQL (persistent) storage.

It reflects an architecture aimed at **scalability**, **clear modular design**, and **developer experience** — from backend organization to frontend responsiveness.
