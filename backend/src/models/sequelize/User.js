import { DataTypes, Model } from "sequelize";
import sequelize from "../../config/db.js";

class User extends Model {}

User.init(
  {
    id: {
      type: DataTypes.UUID, // universally unique identifier
      defaultValue: DataTypes.UUIDV4, // auto-generate UUID
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // enforce unique emails
      validate: {
        isEmail: true, // checks format
        notEmpty: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [6, 100], // enforce password length
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    role: {
      type: DataTypes.ENUM("player", "admin"),
      defaultValue: "player",
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: "User",
    tableName: "users",
    timestamps: true, // adds createdAt and updatedAt
    paranoid: true, // adds deletedAt for soft deletes
  }
);

export default User;
