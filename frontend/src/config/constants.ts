// API配置
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// 用户角色类型
export type UserRole = 'CoreCompany' | 'Supplier' | 'Financier';

// 应收账款状态类型
export type ReceivableStatus = 'Created' | 'Confirmed' | 'Transferred' | 'Financed';

// 融资申请状态类型
export type FinanceStatus = 'Pending' | 'Approved' | 'Rejected';

// 角色名称映射
export const ROLE_NAMES = {
  CoreCompany: '核心企业',
  Supplier: '供应商',
  Financier: '金融机构',
} as const;

// 状态名称映射
export const STATUS_NAMES = {
  Created: '已创建',
  Confirmed: '已确认',
  Transferred: '已转让',
  Financed: '已融资',
  Pending: '待审批',
  Approved: '已批准',
  Rejected: '已拒绝',
} as const;

// JWT Token 存储键
export const JWT_TOKEN_KEY = 'scf_jwt_token';
export const USER_INFO_KEY = 'scf_user_info';

// MetaMask 签名消息模板
export const SIGN_MESSAGE_TEMPLATE = "欢迎使用供应链金融 DApp！请签名并登录。Nonce：";
