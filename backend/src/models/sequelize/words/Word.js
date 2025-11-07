import { DataTypes, Model } from "sequelize";
import sequelize from "../../../config/db.js";

/**
 * Modelo Sequelize para Word
 * Representa la palabra principal del juego (tipo Taboo)
 */
class Word extends Model {}

Word.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    word: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM(
        "animals",
        "cars",
        "food",
        "literature",
        "people",
        "sports",
        "things",
        "tv",
        "web",
        "general"
      ),
      allowNull: false,
      defaultValue: "general",
    },
  },
  {
    sequelize,
    modelName: "Word",
    tableName: "words",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["word", "category"], // ✅ unicidad compuesta
      },
    ],
  }
);

export default Word;
