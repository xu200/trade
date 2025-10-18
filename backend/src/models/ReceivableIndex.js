const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReceivableIndex = sequelize.define('ReceivableIndex', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  receivable_id: {
    type: DataTypes.INTEGER,
    unique: true,
    allowNull: false
  },
  issuer_address: {
    type: DataTypes.STRING(42),
    allowNull: false
  },
  owner_address: {
    type: DataTypes.STRING(42),
    allowNull: false
  },
  supplier_address: {
    type: DataTypes.STRING(42),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(30, 0),
    allowNull: false
  },
  contract_number: {
    type: DataTypes.STRING(100)
  },
  description: {
    type: DataTypes.TEXT
  },
  create_time: {
    type: DataTypes.DATE
  },
  due_time: {
    type: DataTypes.DATE
  },
  confirmed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  financed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  settled: {
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
  tableName: 'receivables_index',
  timestamps: true,
  underscored: true
});

module.exports = ReceivableIndex;

