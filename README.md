# Alias-Game-API

## Table of content

- [Overview](#overview)
- [Setup](#setup)
- [Endpoints](#endpoints)
- [Entities Relationship](#entities-relationship)
- [Game Flow (Frontend Perspective)](#game-flow-frontend-perspective)
- [Game Flow (Backend Perspective)](#game-flow-backend-perspective)
- [Game Architecture](#game-architecture)

## Overview

Alias Game is a multiplayer word-guessing game currently under development.  
The goal of the project is to recreate the classic Alias experience in a digital environment, where players must describe a target word without using a set of forbidden words.

The system includes:  
- A backend service that builds and manages a word bank.  
- Automatic generation of forbidden words for each entry (semantic, phonetic, and spelling variations).  
- Real-time multiplayer support using WebSocket events powered by Socket.IO.  
- A modular architecture designed for separation between game logic, session management, and player interactions.  

This repository represents the foundation of the game logic, including both RESTful endpoints and WebSocket event handling.  
It will later integrate with a frontend interface to deliver a complete interactive experience.

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

### Authentication

#### POST /auth/register  
Registers a new user in the system.

- **Request Body:**
  - `name` (string, min 2 characters) — required  
  - `email` (valid email format) — required, must be unique  
  - `password` (string, min 6 characters) — required  
  - `role` ("player" or "admin") — optional, defaults to "player"

- **Behavior:**
  - Creates a new user in the database with hashed password.
  - Returns the created user (excluding password hash).

- **Response:**
  - `201 Created` with `{ status: "success", user: { id, name, email, role } }`

---

#### POST /auth/login  
Authenticates a user and issues access and refresh tokens.

- **Request Body:**
  - `email` (string) — required  
  - `password` (string) — required

- **Behavior:**
  - Validates credentials.
  - Issues:
    - `accessToken` (JWT, expires in 15 minutes)
    - `refreshToken` (HTTP-only cookie, valid for 30 days)

- **Response:**
  - `200 OK` with `{ status: "success", accessToken }`  
  - Sets `refreshToken` as secure cookie

---

#### POST /auth/refresh-token  
Rotates tokens using the refresh token stored in cookies.

- **Headers/Cookies:**
  - Requires `refreshToken` cookie

- **Behavior:**
  - Validates and rotates the refresh token.
  - Issues a new `accessToken` and `refreshToken`.

- **Response:**
  - `200 OK` with `{ status: "success", accessToken }`  
  - Sets new `refreshToken` cookie

---

#### POST /auth/logout  
Logs the user out and invalidates the session.

- **Headers/Cookies:**
  - Requires valid `accessToken` and `refreshToken`

- **Behavior:**
  - Invalidates the session in the backend.
  - Clears the `refreshToken` cookie.

- **Response:**
  - `200 OK` with `{ message: "Logged out successfully" }`

### Rooms

- POST /rooms → Create new room  
- POST /rooms/:code/join → Join room and assign team  
- DELETE /rooms/:code/leave → Leave room or close if empty  
- POST /rooms/:code/start → Start game  
- PATCH /rooms/:code/status → Update room status  
- GET /rooms/:code → Get room details  
- GET /rooms → List available rooms  

### Integration with Game Flow

- REST triggers game start via gameService.createGame  
- WebSocket events handle game progress and chat  
- Redis stores room and game state  
- Sequelize persists users, rooms, words, and scores  

## Entities Relationship

User : Room → N : 1  
Word : TabooWord → 1 : N  
Word : SimilarWord → 1 : N  

## Game Flow (Frontend Perspective)

### Initial Room Load

- Fetch room data  
- Verify room status and user  
- Load game if in progress  

### WebSocket Events

- player:joined → Adds system message  
- player:left → Adds system message  
- chat:message → Appends chat message  
- team-state → Updates team composition  
- game:started → Loads initial game data  
- game:turn-updated → Updates turn info  
- game:correct-answer → Shows success message  
- game:taboo-word → Shows error message  
- game:finished → Displays results  
- room:updated → Updates room metadata  

### Game State

- roomState: lobby or in-game  
- gameData: word, turn, timer, results  
- roomData: scores and metadata  
- teams: red and blue  
- messages: chat and system logs  

### Game Actions

- Join team → emit join-team  
- Start game → POST /rooms/:code/start  
- Leave room → DELETE /rooms/:code/leave  

## Game Flow (Backend Perspective)

### Socket Initialization

- Validate token  
- Cache socket ID  
- Reject duplicates unless override  

### Core Events

- chat:message → broadcast  
- game:message → validate answer/taboo  
- join-team → update team  
- disconnect → mark inactive and update room  

### SocketEventEmitter

- gameStarted → game:started  
- gameCorrectAnswer → game:correct-answer  
- gameTurnUpdated → game:turn-updated  
- tabooWord → game:taboo-word  
- gameFinished → game:finished  
- sendMessage → chat:message  
- updateRoom → room:updated  
- teamState → team-state  
- joinRoom / leaveRoom → player:joined / player:left  

### Redis Usage

- roomCache → room state  
- gameCache → game state  
- socketCache → userId to socketId  
- TTL: 6 hours  

## Game Architecture

### Flow Overview

1. User joins room  
   - REST + socket events  
   - Redis updates  
2. Game starts  
   - REST triggers game creation  
   - Emits game:started  
3. Gameplay  
   - game:message → validate  
   - Emits correct-answer or taboo-word  
4. Turn ends  
   - Timer or correct guess  
   - Emits game:turn-updated  
5. Game ends  
   - Emits game:finished  
   - Updates Redis and DB  


### Redis Keys
- alias-game:room:code
- alias-game:game:code
- alias-game:userSocket:userId


### Room Fields
- players, teams, globalScore, games, status  


### Game Fields
- teams, currentTeam, wordToGuess, turnsPlayed, state  


### Validation & Security
- Zod schema for messages  
- cleanText for normalization  
- JWT for session  
- HTTP-only cookies for refresh tokens  
