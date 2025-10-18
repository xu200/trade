const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FinanceAppIndex = sequelize.define('FinanceAppIndex', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  application_id: {
    type: DataTypes.INTEGER,
    unique: true,
    allowNull: false
  },
  receivable_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  applicant_address: {
    type: DataTypes.STRING(42),
    allowNull: false
  },
  financier_address: {
    type: DataTypes.STRING(42),
    allowNull: false
  },
  finance_amount: {
    type: DataTypes.DECIMAL(30, 0),
    allowNull: false
  },
  interest_rate: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  apply_time: {
    type: DataTypes.DATE
  },
  approved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  processed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  tx_hash: {
    type: DataTypes.STRING(66)
  },
  block_number: {
    type: DataTypes.INTEGER
  }
}, {
  tableName: 'finance_applications_index',
  timestamps: true,
  underscored: true
});

module.exports = FinanceAppIndex;

