# Alias-Game-API

## Table of content

- [Overview](#overview)
- [Setup](#setup)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
- [WebSocket Events](#websocket-events)
- [Entities Relationship](#entities-relationship)

## Overview

Alias Game is a multiplayer word-guessing game currently under development.  
The goal of the project is to recreate the classic *Alias* experience in a digital environment, where players must describe a target word without using a set of forbidden words.

The system includes:
- A backend service that builds and manages a word bank.
- Automatic generation of forbidden words for each entry (semantic, phonetic, and spelling variations).
- Real-time multiplayer support using WebSocket events powered by Socket.IO.
- A modular architecture designed for separation between game logic, session management, and player interactions.

This repository represents the foundation of the game logic, including both RESTful endpoints and WebSocket event handling.  
It will later integrate with a frontend interface to deliver a complete interactive experience.


## Setup

To run the project locally, follow these steps:

1. Open two terminal windows.
2. In the first terminal, navigate to the `backend` folder:
   ``` bash
   cd backend
   npm install
   npm run dev
   ```

3. In the second terminal, navigate to the `frontend` folder:
4. ```bash
   cd frontend
   npm install
   npm run dev
   ```

Both servers will start in development mode.
Make sure the backend is running before interacting with the frontend.

## Authentication

The API uses token-based authentication to manage user sessions.  
Users must register and log in to access protected endpoints.

### Available endpoints

- POST /register  
  Creates a new user account.  
  Requires the following fields in the request body:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securePassword123",
    "role": "player"
  }
  ```
  
- POST /login  
  Authenticates the user and returns an access token in the response body.  
  A refresh token is stored in an HTTP-only cookie with the following properties:
  - httpOnly: true  
  - secure: true (in production)  
  - sameSite: "strict"  
  - maxAge: 30 days

  #### Login request format

  Send a POST request to /login with the following JSON body:
  ```json
  {
    "email": "user@example.com",
    "password": "yourPassword123"
  }
  ```

  #### Login response

  On success, the server returns:
  - An accessToken in the response body (valid for 15 minutes).
  - A refreshToken stored in an HTTP-only cookie.

  Example response:
  ```json
  {
    "status": "success",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
  }
  ```

- POST /refresh-token  
  Renews the access token using a valid refresh token.  
  The refresh token is extracted from the cookie and validated.  
  A new access token is returned in the response body, and a new refresh token is set as a cookie.

- POST /logout  
  Invalidates the current session.  
  Requires both token extraction and session validation.

### Token handling

- Access tokens are returned in the response body and are valid for 15 minutes.  
  The backend does not store access tokens.

- Refresh tokens are stored securely in HTTP-only cookies and are valid for 7 days.  
  However, they are stored in Redis with a TTL of 1 day for session management.  
  Redis key format: alias-game:token:{userId}  
  Redis value: the refresh token string

- The extractTokens middleware parses both tokens and attaches them to the request object.  
- The refreshToken controller validates and rotates the refresh token, issuing a new pair.  
- Middleware functions (extractTokens, getSession) are used to validate and manage token flow.

Note: All protected routes require valid tokens to be included in the request.
## Endpoints

### Auth

- `POST /register`  
  Creates a new user account.

- `POST /login`  
  Authenticates the user and returns access and refresh tokens.

- `POST /refresh-token`  
  Renews the access token using a valid refresh token.

- `POST /logout`  
  Invalidates the current session.

### Rooms

- `POST /`  
  Creates a new game room.  
  Requires authentication.

- `POST /:code/join`  
  Joins an existing room by code.  
  Requires authentication.

- `DELETE /:code/leave`  
  Leaves the specified room.  
  Requires authentication.

- `PATCH /:code/status`  
  Updates the status of a room (e.g., from "waiting" to "in-game").  
  Requires authentication.

- `GET /:code`  
  Retrieves room details by code.  
  Public endpoint.


## WebSocket Events

The game logic is handled via WebSocket events using [Socket.IO](https://socket.io/).  
Clients must establish a socket connection after authentication to participate in real-time gameplay.

### Example events

- `connect`  
  Triggered when a client connects to the server.

- `room:join`  
  Join a specific room by code.

- `game:start`  
  Starts a new game round.

- `game:guess`  
  Submit a guess for the current word.

- `game:skip`  
  Skip the current word.

- `game:end`  
  Ends the current round and broadcasts results.

> Note: All socket events are namespaced and require a valid session.


# Entities Relationships

User : Room -> N : 1
Word : TabooWord -> 1 : N
Word : SimilarWord -> 1 : N
............................

