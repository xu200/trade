/**
 * 字段映射工具类
 * 统一处理数据库字段 <-> API字段的转换
 */

class FieldMapper {
  /**
   * 应收账款: 数据库 -> API
   * @param {Object} dbRow - 数据库记录
   * @returns {Object} API格式数据
   */
  static mapReceivableToAPI(dbRow) {
    if (!dbRow) return null;
    
    // 计算状态: 0-待确认, 1-已确认, 2-已转让, 3-已融资
    let status = 0;
    if (dbRow.financed) {
      status = 3;
    } else if (dbRow.settled) {
      status = 2; // 已结算（可选）
    } else if (dbRow.confirmed) {
      status = 1;
    }
    
    return {
      id: dbRow.id,
      receivableId: dbRow.receivable_id,
      issuer: dbRow.issuer_address,
      currentOwner: dbRow.owner_address,
      supplier: dbRow.supplier_address,
      amount: dbRow.amount,
      dueTime: dbRow.due_time,
      createTime: dbRow.create_time,
      description: dbRow.description,
      contractNumber: dbRow.contract_number,
      isConfirmed: dbRow.confirmed,
      isFinanced: dbRow.financed,
      isSettled: dbRow.settled,
      status: status,
      txHash: dbRow.tx_hash,
      blockNumber: dbRow.block_number,
      createdAt: dbRow.createdAt || dbRow.created_at,
      updatedAt: dbRow.updatedAt || dbRow.updated_at,
      // 保留原始字段用于调试
      _raw: {
        confirmed: dbRow.confirmed,
        financed: dbRow.financed,
        settled: dbRow.settled
      }
    };
  }
  
  /**
   * 融资申请: 数据库 -> API
   * @param {Object} dbRow - 数据库记录
   * @returns {Object} API格式数据
   */
  static mapFinanceAppToAPI(dbRow) {
    if (!dbRow) return null;
    
    // 计算状态
    let status = 'pending';
    if (dbRow.processed) {
      status = dbRow.approved ? 'approved' : 'rejected';
    }
    
    return {
      id: dbRow.id,
      applicationId: dbRow.application_id,
      receivableId: dbRow.receivable_id,
      applicant: dbRow.applicant_address,
      financier: dbRow.financier_address,
      financeAmount: dbRow.finance_amount,
      interestRate: dbRow.interest_rate,
      applyTime: dbRow.apply_time,
      status: status,
      processed: dbRow.processed,
      approved: dbRow.approved,
      txHash: dbRow.tx_hash,
      blockNumber: dbRow.block_number,
      createdAt: dbRow.createdAt || dbRow.created_at,
      updatedAt: dbRow.updatedAt || dbRow.updated_at,
      _raw: {
        processed: dbRow.processed,
        approved: dbRow.approved
      }
    };
  }
  
  /**
   * 用户信息: 数据库 -> API
   * @param {Object} dbRow - 数据库记录
   * @returns {Object} API格式数据
   */
  static mapUserToAPI(dbRow) {
    if (!dbRow) return null;
    
    return {
      id: dbRow.id,
      walletAddress: dbRow.wallet_address,
      role: this.mapRoleToAPI(dbRow.role),
      companyName: dbRow.company_name,
      contactPerson: dbRow.contact_person,
      contactPhone: dbRow.contact_phone,
      contactEmail: dbRow.contact_email,
      creditRating: dbRow.credit_rating,
      createdAt: dbRow.createdAt || dbRow.created_at,
      updatedAt: dbRow.updatedAt || dbRow.updated_at
    };
  }
  
  /**
   * 角色映射: 数据库 -> API
   * @param {number|string} dbRole - 数据库角色值
   * @returns {string} API角色字符串
   */
  static mapRoleToAPI(dbRole) {
    const roleMap = {
      1: 'CoreCompany',
      2: 'Supplier',
      3: 'Financier',
      'core_company': 'CoreCompany',
      'supplier': 'Supplier',
      'financier': 'Financier'
    };
    return roleMap[dbRole] || dbRole;
  }
  
  /**
   * 角色映射: API -> 数据库
   * @param {string} apiRole - API角色字符串
   * @returns {number} 数据库角色值
   */
  static mapRoleToDB(apiRole) {
    const roleMap = {
      'CoreCompany': 1,
      'Supplier': 2,
      'Financier': 3
    };
    return roleMap[apiRole] || apiRole;
  }
  
  /**
   * 状态映射: API字符串 -> 数据库字段
   * @param {string} statusStr - 状态字符串
   * @returns {Object} 数据库查询条件
   */
  static mapStatusToDBQuery(statusStr) {
    const statusMap = {
      'pending': { confirmed: false },
      'confirmed': { confirmed: true, financed: false },
      'financed': { financed: true },
      'settled': { settled: true }
    };
    return statusMap[statusStr] || {};
  }
  
  /**
   * 批量映射应收账款
   * @param {Array} rows - 数据库记录数组
   * @returns {Array} API格式数据数组
   */
  static mapReceivablesToAPI(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.map(row => this.mapReceivableToAPI(row)).filter(Boolean);
  }
  
  /**
   * 批量映射融资申请
   * @param {Array} rows - 数据库记录数组
   * @returns {Array} API格式数据数组
   */
  static mapFinanceAppsToAPI(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.map(row => this.mapFinanceAppToAPI(row)).filter(Boolean);
  }
}

module.exports = FieldMapper;

