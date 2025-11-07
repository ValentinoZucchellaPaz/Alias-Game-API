import { DataTypes, Model } from "sequelize";
import sequelize from "../../../config/db.js";

/**
 * Modelo Sequelize para TabooWord
 * Palabras prohibidas asociadas a una palabra principal
 */
class TabooWord extends Model {}

TabooWord.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tabooWord: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "TabooWord",
    tableName: "taboo_words",
    timestamps: false,
  }
);

export default TabooWord;
