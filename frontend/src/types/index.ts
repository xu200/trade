import type { UserRole as UserRoleType } from '@/config/constants';

// 重新导出 UserRole 类型
export type UserRole = UserRoleType;

// 用户信息
export interface UserInfo {
  walletAddress: string;
  role: UserRole;
  companyName: string;
  contactPerson?: string;
  contactEmail?: string;
}

// 注册请求
export interface RegisterFormValues {
  walletAddress: string;
  role: UserRole;
  companyName: string;
  contactPerson?: string;
  contactEmail?: string;
}

// API 响应
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

// 登录响应
export interface LoginResponse {
  token: string;
  userInfo: UserInfo;
}
