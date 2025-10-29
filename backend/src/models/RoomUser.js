// src/models/RoomUser.js

export default class RoomUser {
  constructor({ id, name, team = null }) {
    this.id = id; // ID del usuario autenticado
    this.name = name; // Nombre visible en la room
    this.team = team; // "red" | "blue" | null
  }
}
