/**
 * 角色辅助函数
 * 处理前后端角色格式不一致的问题
 */

/**
 * 标准化角色值，统一转换为小写字符串进行比较
 * @param role - 用户角色（可能是数字、大写驼峰、小写下划线等格式）
 * @returns 标准化后的角色字符串（小写，无下划线）
 * 
 * @example
 * normalizeRole(1) // 'corecompany'
 * normalizeRole('CoreCompany') // 'corecompany'
 * normalizeRole('core_company') // 'corecompany'
 * normalizeRole(2) // 'supplier'
 * normalizeRole('Supplier') // 'supplier'
 */
export const normalizeRole = (role: string | number | undefined): string => {
  if (role === undefined || role === null) return '';
  
  if (typeof role === 'number') {
    // 数字映射
    switch (role) {
      case 1: return 'corecompany';
      case 2: return 'supplier';
      case 3: return 'financier';
      default: return '';
    }
  }
  
  // 字符串统一转小写，移除所有下划线
  return String(role).toLowerCase().replace(/_/g, '');
};

/**
 * 检查用户是否是指定角色
 * @param userRole - 用户的角色
 * @param checkRole - 要检查的角色
 * @returns 是否匹配
 * 
 * @example
 * isRole(1, 'CoreCompany') // true
 * isRole('core_company', 'CoreCompany') // true
 * isRole('Supplier', 'supplier') // true
 */
export const isRole = (userRole: string | number | undefined, checkRole: string): boolean => {
  return normalizeRole(userRole) === normalizeRole(checkRole);
};

/**
 * 检查用户是否属于多个角色之一
 * @param userRole - 用户的角色
 * @param checkRoles - 要检查的角色数组
 * @returns 是否匹配任一角色
 * 
 * @example
 * isAnyRole(1, ['CoreCompany', 'Supplier']) // true
 * isAnyRole('supplier', ['CoreCompany', 'Supplier']) // true
 */
export const isAnyRole = (userRole: string | number | undefined, checkRoles: string[]): boolean => {
  const normalized = normalizeRole(userRole);
  return checkRoles.some(role => normalizeRole(role) === normalized);
};

/**
 * 获取角色的显示名称（中文）
 * @param role - 用户角色
 * @returns 角色的中文名称
 * 
 * @example
 * getRoleDisplayName(1) // '核心企业'
 * getRoleDisplayName('CoreCompany') // '核心企业'
 * getRoleDisplayName('supplier') // '供应商'
 */
export const getRoleDisplayName = (role: string | number | undefined): string => {
  const normalized = normalizeRole(role);
  
  switch (normalized) {
    case 'corecompany': return '核心企业';
    case 'supplier': return '供应商';
    case 'financier': return '金融机构';
    default: return '未知角色';
  }
};

