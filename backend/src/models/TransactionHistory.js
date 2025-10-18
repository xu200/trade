const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TransactionHistory = sequelize.define('TransactionHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tx_hash: {
    type: DataTypes.STRING(66),
    unique: true,
    allowNull: false
  },
  from_address: {
    type: DataTypes.STRING(42),
    allowNull: false
  },
  to_address: {
    type: DataTypes.STRING(42)
  },
  tx_type: {
    type: DataTypes.ENUM('create', 'confirm', 'transfer', 'apply_finance', 'approve_finance', 'settle'),
    allowNull: false
  },
  related_id: {
    type: DataTypes.INTEGER
  },
  block_number: {
    type: DataTypes.INTEGER
  },
  gas_used: {
    type: DataTypes.BIGINT
  },
  timestamp: {
    type: DataTypes.DATE
  },
  status: {
    type: DataTypes.ENUM('pending', 'success', 'failed'),
    defaultValue: 'pending'
  },
  error_message: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'transaction_history',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = TransactionHistory;

