# 🕹️ Alias Game – Multiplayer Word Guessing Game

## Overview

Alias Game is a real-time multiplayer word-guessing game. Players authenticate, join a lobby, create or join rooms, split into Red and Blue teams, and play rounds where teams describe and guess words under a timer. The frontend is a React application that communicates with a backend via HTTP (Axios) and real-time synchronization using Socket.IO (WebSockets). Core frontend responsibilities include authentication flows, room lifecycle (create / join / leave), team assignment, chat, and in-game state updates.

---

## Setup

To run the project locally:

1. Make sure you have Docker installed and running.  
2. Open two terminal windows.  
3. In the first terminal:
   ```bash
   - cd backend  
   - docker compose up --build  
   - npm install  
   - npm run dev
   ```
5. In the second terminal:
   ```bash
   - cd frontend  
   - npm install  
   - npm run dev
   ```

## Endpoints

Overview: The frontend uses REST endpoints for authentication, session/token management, and room lifecycle actions. All HTTP calls include credentials and usually use a Bearer token (when present). Endpoints below are expressed as routes relative to the backend base (http://localhost:4000 or http://localhost:4000/api).

POST /auth/register
- Purpose: register a new user
- Request body: { email, name, password }
- Response: 201 Created (or validation/error payload)

POST /auth/login
- Purpose: login a user and receive an access token
- Request body: { email, password }
- Response: { accessToken } on success

POST /auth/logout
- Purpose: log out, invalidate session or clear refresh cookie
- Request body: none
- Response: 200 OK
- Frontend behavior: calls endpoint then clears token and user from context and navigates to /login

POST /auth/refresh-token
- Purpose: obtain a new access token using refresh cookie
- Request body: none
- Response: { accessToken }
- Frontend behavior: refreshAccessToken invoked by Axios interceptor on 401s; updates token and user in context and retries the original request

GET /rooms
- Purpose: fetch list of active rooms (lobby listing)
- Request: no body; with credentials
- Response: array of room summaries: [ { code, players, status, ... } ]
- Frontend usage: Home page fetchRooms to populate RoomList

POST /rooms
- Purpose: create a new room
- Request body: none (future: optional settings)
- Response: { code } (201 Created)
- Frontend behavior: on success navigate to /room/:code

GET /rooms/:roomCode
- Purpose: fetch full room details
- Request: none; with credentials
- Response: { players, teams, chat, game, status, globalScore, ... }
- Frontend behavior: RoomPage initial fetch validates player presence & room state; sets teams, messages, and gameData

POST /rooms/:roomCode/join
- Purpose: join a room (HTTP join endpoint)
- Request body: none; with credentials
- Response: 200 OK
- Frontend behavior: navigates to /room/:roomCode on success

POST /rooms/:roomCode/start
- Purpose: start the game in the room
- Request body: none
- Response: { game } or 200 OK with game state
- Frontend behavior: sets roomState to in-game and stores returned gameData

DELETE /rooms/:roomCode/leave
- Purpose: leave the room
- Request body: none
- Response: 200 OK
- Frontend behavior: navigates back to lobby (/)

---

## Entities Relationship

Brief summary of main domain entities and how they relate:

User
- fields: id, name, email
- relationships: belongs to Room (as a player); assigned to Team

Room
- fields: code (identifier), status (lobby | in-game | finished), players[], teams, chat[], game, globalScore
- relationships: contains Players (Users), contains Teams, contains Game

Team
- names: red, blue
- fields: list of user ids
- relationships: assigned to a Room, holds players

Game
- fields: current turn, words (list), timer, results, results per team, taboo words, active player/turn info
- relationships: attached to a Room; updates room state when started/ended and emits events that update Game and Room UI

ChatMessage (in room.chat)
- fields: user (id/name), text, type (system | user), status, timestamp
- stored in Room.chat and updated live via WebSocket events

Relationship diagram (textual)
User
  └─ belongs to → Team
Team
  └─ part of → Room
Room
  └─ contains → Game
Room
  └─ contains → ChatMessage[]

Key constraints inferred from frontend
- A user must be part of room.players and active to access room page (RoomPage initial fetch enforces this).
- Rooms may be closed or finished and frontend handles redirects on room:close events.
- Game state exists in room.game when a game is active; RoomPage toggles between "lobby" and "in-game" in the UI based on that.

---

## Websockets interaction

The application uses Socket.IO for real-time events. Socket connection lifecycle, event names, payload expectations, and emit patterns are described below. The SocketProvider creates a socket with token-based auth and exposes socket instance via context. The frontend registers a set of listeners in RoomPage to keep UI in sync.

Connection establishment
- URL: http://localhost:4000 (SocketProvider uses io("http://localhost:4000"))
- Options: autoConnect: true, auth: { token, override: true }
- Socket lifecycle handled in SocketProvider: connects on token presence, disconnects when token is removed.
- Global handlers: connect, disconnect, connect_error, room:close (room close triggers navigation to /home).

Important client-side emitted events
- join-team
  - Emitted by RoomPage when a user clicks to join a team
  - Payload: { roomCode, team: "red" | "blue", userId }
  - Expected backend reaction: update team assignment and emit team-state to room participants

- (Potential additional emits inferred)
  - chat:message (frontend may emit new chat messages; ChatPanel component is wired with socket prop)
    - Payload: { roomCode, text, type? } (inferred)
  - game action events (e.g., answer submission, skip, mark correct)
    - Payloads and event names depend on backend contract

Server-to-client events handled by frontend (RoomPage registers a generic handler)
- player:joined
  - Payload: { message, status, timestamp, maybe user } 
  - Frontend reaction: append system message to chat/messages list

- player:left
  - Payload: similar to player:joined
  - Frontend reaction: append system message to chat/messages list

- chat:message
  - Payload: { user, text, type, status, timestamp }
  - Frontend reaction: append message to messages array (rendered by ChatPanel)

- team-state
  - Payload: { teams: { red: [userIds], blue: [userIds] } }
  - Frontend reaction: update TeamList component data (teams state) to reflect current members

- game:started
  - Payload: { game } (full game state)
  - Frontend reaction: set roomState to "in-game", set gameData, append system message

- game:turn-updated
  - Payload: { game } (updated game state, current turn info)
  - Frontend reaction: set gameData, set roomState "in-game", append message

- game:correct-answer
  - Payload: { user, game, message, status, timestamp }
  - Frontend reaction: update gameData, append message showing who scored / update scores

- game:taboo-word
  - Payload: { message } (system error notifying taboo word used)
  - Frontend reaction: surface error to UI (RoomPage sets error state)

- game:finished
  - Payload: { results }
  - Frontend reaction: update gameData.results, set roomState back to "lobby", append end-of-game message

- room:updated
  - Payload: { roomInfo } (metadata updates such as globalScore)
  - Frontend reaction: merge roomData with new roomInfo (update GlobalResults panel)

- room:close
  - Payload: { roomCode, userName }
  - Frontend reaction: navigate to /home; show notification in logs

Client-side listener pattern (RoomPage)
- RoomPage attaches a generic handler that inspects { type, status, data, message, timestamp } and branches on type.
- Events are subscribed to via eventNames.forEach((event) => socket.on(event, handleSocketEvent));
- On unmount or socket change, listeners are removed with socket.off(event, handleSocketEvent).

Timing and UI synchronization notes
- Timer component is controlled by game state; when a turn changes the backend emits game:turn-updated with new timer info and frontend Timer resets via resetKey prop.
- On critical server messages (for example: connect_error or auth rejection), SocketProvider may log and the AuthContext can perform logout.
- Many socket events include both system messages and structured data; the RoomPage keeps a messages array mixing system and user messages to present chat-like history.

Failure and reconnection behavior
- SocketProvider sets isConnected flag on connect and clears it on disconnect.
- Home page shows "Connecting to server..." when not connected.
- Socket errors (connect_error) are logged; the code includes a commented-out logout() call which could be used to force re-auth when auth failure occurs on socket connection.

Examples of typical flows

1) User logs in
- HTTP: POST /auth/login -> receive accessToken -> AuthContext sets token and user
- Socket: SocketProvider picks up token and establishes socket connection with auth: { token }
- UI: navigate to home; Home fetches rooms via GET /rooms

2) Joining a room
- From Home: POST /rooms/:code/join (HTTP) -> navigate to /room/:code
- RoomPage initial HTTP GET /rooms/:roomCode to load room state
- Socket: RoomPage subscribes to socket events for the room
- User clicks "Join Red" -> RoomPage emits join-team { roomCode, team: "red", userId }
- Backend updates teams and emits team-state to all participants
- Frontend receives team-state and updates TeamList; chat receives a player:joined system message

3) Starting and playing a game
- Room host issues POST /rooms/:roomCode/start -> backend responds with game state
- Backend also emits game:started to room via socket
- Frontend receives game:started, sets gameData, sets roomState "in-game", UI switches to game view and starts Timer
- During turns, backend emits game:turn-updated and game:correct-answer events to sync current word, timer, scores
- When game ends, backend emits game:finished; frontend shows GameResults and returns to lobby view

---

## Notes and Implementation Hints (focused on communication)

- Keep contract stable: The frontend expects certain event names and payload shapes (type/data/message pattern). Any backend change to event names or payload keys must be mirrored in the frontend handlers (RoomPage's switch on type).
- Use authoritative state from server: game and team state should be considered authoritative — frontend only renders what server provides and relies on events like team-state and game:turn-updated to maintain UI consistency.
- Error flows: handle 401 via axios response interceptor and refresh-token endpoint. If refresh fails, clear auth and redirect to /login.
- Socket auth: token is sent in socket auth payload. Backend should validate token on connection and reject (connect_error) or emit an auth failure event that triggers client logout.
- Keep messages normalized: chat messages and system messages are mixed in the same messages array; include consistent fields (user?, text, type, timestamp, status) so UI rendering is straightforward.

---