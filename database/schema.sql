-- 创建数据库
CREATE DATABASE IF NOT EXISTS supplychain_finance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE supplychain_finance;

-- 用户表
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    role ENUM('core_company', 'supplier', 'financier') NOT NULL,
    company_name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(50),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    credit_rating INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_wallet (wallet_address),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 应收账款索引表
CREATE TABLE receivables_index (
    id INT AUTO_INCREMENT PRIMARY KEY,
    receivable_id INT UNIQUE NOT NULL,
    issuer_address VARCHAR(42) NOT NULL,
    owner_address VARCHAR(42) NOT NULL,
    supplier_address VARCHAR(42) NOT NULL,
    amount DECIMAL(30, 0) NOT NULL,
    contract_number VARCHAR(100),
    description TEXT,
    create_time TIMESTAMP,
    due_time TIMESTAMP,
    confirmed BOOLEAN DEFAULT FALSE,
    financed BOOLEAN DEFAULT FALSE,
    settled BOOLEAN DEFAULT FALSE,
    tx_hash VARCHAR(66),
    block_number INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_receivable_id (receivable_id),
    INDEX idx_issuer (issuer_address),
    INDEX idx_owner (owner_address),
    INDEX idx_supplier (supplier_address),
    INDEX idx_status (confirmed, financed, settled),
    INDEX idx_contract_number (contract_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 融资申请索引表
CREATE TABLE finance_applications_index (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT UNIQUE NOT NULL,
    receivable_id INT NOT NULL,
    applicant_address VARCHAR(42) NOT NULL,
    financier_address VARCHAR(42) NOT NULL,
    finance_amount DECIMAL(30, 0) NOT NULL,
    interest_rate INT NOT NULL,
    apply_time TIMESTAMP,
    approved BOOLEAN DEFAULT FALSE,
    processed BOOLEAN DEFAULT FALSE,
    tx_hash VARCHAR(66),
    block_number INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_application_id (application_id),
    INDEX idx_receivable (receivable_id),
    INDEX idx_applicant (applicant_address),
    INDEX idx_financier (financier_address),
    INDEX idx_status (processed, approved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 交易历史表
CREATE TABLE transaction_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tx_hash VARCHAR(66) UNIQUE NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42),
    tx_type ENUM('create', 'confirm', 'transfer', 'apply_finance', 'approve_finance', 'settle') NOT NULL,
    related_id INT,
    block_number INT,
    gas_used BIGINT,
    timestamp TIMESTAMP,
    status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tx_hash (tx_hash),
    INDEX idx_from (from_address),
    INDEX idx_type (tx_type),
    INDEX idx_related (related_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 系统配置表
CREATE TABLE system_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(50) UNIQUE NOT NULL,
    config_value TEXT,
    description VARCHAR(200),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入初始配置
INSERT INTO system_config (config_key, config_value, description) VALUES
('contract_address', '', '智能合约地址'),
('network_id', '1337', '网络ID'),
('last_synced_block', '0', '最后同步的区块号');

