const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  wallet_address: {
    type: DataTypes.STRING(42),
    unique: true,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('core_company', 'supplier', 'financier'),
    allowNull: false
  },
  company_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  contact_person: {
    type: DataTypes.STRING(50)
  },
  contact_phone: {
    type: DataTypes.STRING(20)
  },
  contact_email: {
    type: DataTypes.STRING(100)
  },
  credit_rating: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true
});

module.exports = User;

