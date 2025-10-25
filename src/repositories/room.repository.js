import { Room } from "../models/sequelize/index.js";

// async getRoom(code) {
//   // get room id from redis, or db if not found
//   let roomId = await this.redis.get(`roomCode:${code}`);
//   let dbRoom = null;
//   if (!roomId) {
//     dbRoom = await Room.findOne({ where: { code } });
//     if (!dbRoom) return null;
//     roomId = dbRoom.id;
//     await this.redis.set(`roomCode:${code}`, roomId, 24 * 3600); // save new code:id mapping (24hrs)
//   }

//   // get roomData from redis, or db if not found
//   let room = await this.redis.hGetAll(roomId);
//   if (!room || Object.keys(room).length === 0) {
//     if (!dbRoom) { // if not search already, look db
//       dbRoom = await Room.findOne({ where: { id: roomId } });
//       if (!dbRoom) {
//         await this.redis.del(`roomCode:${code}`); // delete mapping for consistency
//         return null;
//       }
//     }

//     const roomData = {
//       code: dbRoom.code,
//       hostId: dbRoom.hostId,
//       players: JSON.stringify(dbRoom.players),
//       teams: JSON.stringify(dbRoom.teams),
//       globalScore: JSON.stringify(dbRoom.globalScore),
//       games: JSON.stringify(dbRoom.games),
//       status: dbRoom.status,
//       public: dbRoom.public,
//     };

//     await this.redis.hSet(roomId, roomData);
//     await this.redis.client.expire(this.redis._key(roomId), this.redis.ttl);
//     room = roomData;
//   }

//   // parse fields and return info
//   try {
//     room.players = JSON.parse(room.players);
//     room.teams = JSON.parse(room.teams);
//     room.globalScore = JSON.parse(room.globalScore);
//     room.games = JSON.parse(room.games);
//   } catch (err) {
//     console.error("⚠️ Error parsing room JSON data:", err.message);
//     return null // here I can delete and retry but there's a chance of inf loop
//   }

//   await this.redis.client.expire(this.redis._key(codeKey), 24 * 3600);
//   await this.redis.client.expire(this.redis._key(roomId), this.redis.ttl);

//   return { id: roomId, ...room };
// }
