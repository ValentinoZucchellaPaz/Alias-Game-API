# Alias-Game-API

## Table of content

- [Overview](#overview)

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

