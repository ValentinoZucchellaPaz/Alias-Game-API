// src/models/Room.js
import RoomUser from "./RoomUser.js";

export default class Room {
  constructor({ code, hostId }) {
    this.code = code;
    this.hostId = hostId;
    this.users = []; // Array de RoomUser
    this.status = "waiting"; // "waiting" | "in-game" | "finished"
    this.teams = { red: [], blue: [] };
    this.globalScore = { red: 0, blue: 0 };
    // array of objects like [{ red: int, blue: int }]
    this.games = [];
  }

  addUser({ id, name }) {
    const exists = this.users.find((u) => u.id === id);
    if (!exists) {
      const newUser = new RoomUser({ id, name });
      this.users.push(newUser);
    }
  }

  assignTeam(userId, team) {
    this.removeFromTeams(userId);
    if (team === "red") this.teams.red.push(userId);
    if (team === "blue") this.teams.blue.push(userId);

    const user = this.users.find((u) => u.id === userId);
    if (user) user.team = team;
  }

  removeFromTeams(userId) {
    this.teams.red = this.teams.red.filter((id) => id !== userId);
    this.teams.blue = this.teams.blue.filter((id) => id !== userId);

    const user = this.users.find((u) => u.id === userId);
    if (user) user.team = null;
  }

  getTeamOf(userId) {
    const user = this.users.find((u) => u.id === userId);
    return user?.team || null;
  }

  removeUser(userId) {
    this.users = this.users.filter((u) => u.id !== userId);
    this.removeFromTeams(userId);
    this.sockets.delete(userId);
  }

  broadcast(message) {
    const payload = JSON.stringify(message);
    for (const socket of this.sockets.values()) {
      socket.send(payload);
    }
  }
}
