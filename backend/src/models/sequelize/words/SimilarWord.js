import { DataTypes, Model } from "sequelize";
import sequelize from "../../../config/db.js";

/**
 * Modelo Sequelize para SimilarWord
 * Palabras similares (API Datamuse)
 */
class SimilarWord extends Model {}

SimilarWord.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    similarWord: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("soundalike", "associated", "adjective", "spelling"),
      allowNull: false,
    },
    similarity: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0,
        max: 1,
      },
    },
  },
  {
    sequelize,
    modelName: "SimilarWord",
    tableName: "similar_words",
    timestamps: false,
  }
);

export default SimilarWord;
