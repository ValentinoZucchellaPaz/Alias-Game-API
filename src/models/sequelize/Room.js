import { DataTypes, Model } from "sequelize";
import sequelize from "../../config/db.js";

/**
 * Modelo Sequelize ESM para Room
 * (estructura igual a ./src/models/sequalize/User.js)
 */
class Room extends Model {}

Room.init(
  {
    id: {
      type: DataTypes.UUID, // universally unique identifier
      defaultValue: DataTypes.UUIDV4, // auto-generate UUID
      primaryKey: true,
    },
    code: {
      // room code
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    hostId: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    // array of obj {id: userId, active: boolean} -- keep track of all joined players
    players: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    status: {
      type: DataTypes.ENUM("waiting", "in-game", "finished"),
      allowNull: false,
      defaultValue: "waiting",
    },
    // teams: { red: [userId], blue: [] }
    teams: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { red: [], blue: [] },
    },
    globalScore: {
      type: DataTypes.JSON, // {red: int, blue: int}
      allowNull: false,
      defaultValue: { red: 0, blue: 0 },
    },
    games: {
      // array of objects like [{ red: int, blue: int }]
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    public: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: "Room",
    tableName: "rooms",
    timestamps: true, // adds createdAt and updatedAt
    paranoid: true, // adds deletedAt for soft deletes
  }
);

export default Room;
