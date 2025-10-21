import axios from 'axios';
import { message } from 'antd';
import { API_BASE_URL } from '@/config/constants';
import { getToken } from '@/utils/storage';

// 应收账款类型（严格匹配后端数据库字段）
export interface Receivable {
  id: number;
  receivable_id: number;
  issuer_address: string;
  owner_address: string;
  supplier_address: string;
  amount: string;
  contract_number: string | null;
  description: string | null;
  create_time: string | null;
  due_time: string | null;
  confirmed: boolean;
  financed: boolean;
  settled: boolean;
  tx_hash: string | null;
  block_number: number | null;
  created_at: string;
  updated_at: string;
}

class ReceivableService {
  private baseURL = API_BASE_URL;

  private getHeaders() {
    const token = getToken();
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    };
  }

  // 获取应收账款列表
  async getReceivables(params?: {
    page?: number;
    limit?: number;
    status?: 'confirmed' | 'unconfirmed' | 'financed' | 'settled';
    owner?: string;
    issuer?: string;
    search?: string;
  }): Promise<{ items: Receivable[]; total: number; page: number; pageSize: number }> {
    try {
      const response = await axios.get(`${this.baseURL}/receivables`, {
        headers: this.getHeaders(),
        params,
      });
      
      if (response.data.success) {
        return {
          items: response.data.data.items || [],
          total: response.data.data.total || 0,
          page: response.data.data.page || 1,
          pageSize: response.data.data.pageSize || 10,
        };
      }
      
      return { items: [], total: 0, page: 1, pageSize: 10 };
    } catch (error: any) {
      console.error('获取应收账款列表失败:', error);
      message.error(error.response?.data?.message || '获取应收账款列表失败');
      return { items: [], total: 0, page: 1, pageSize: 10 };
    }
  }

  // 创建应收账款（匹配后端参数）
  async createReceivable(data: {
    supplier: string;      // 供应商地址
    amount: string;        // 金额
    dueTime: string;       // 到期时间
    description?: string;  // 描述
    contractNumber: string; // 合同编号
  }): Promise<any> {
    try {
      const response = await axios.post(`${this.baseURL}/receivables`, data, {
        headers: this.getHeaders(),
      });
      
      if (response.data.success) {
        message.success('应收账款创建成功');
        return response.data.data;
      }
      
      throw new Error(response.data.message || '创建失败');
    } catch (error: any) {
      message.error(error.response?.data?.message || '创建应收账款失败');
      throw error;
    }
  }

  // 确认应收账款
  async confirmReceivable(id: number): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseURL}/receivables/${id}/confirm`,
        {},
        { headers: this.getHeaders() }
      );
      
      if (response.data.success) {
        message.success('应收账款确认成功');
        return response.data.data;
      }
      
      throw new Error(response.data.message || '确认失败');
    } catch (error: any) {
      message.error(error.response?.data?.message || '确认应收账款失败');
      throw error;
    }
  }

  // 转让应收账款（匹配后端参数：newOwner）
  async transferReceivable(id: number, newOwner: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseURL}/receivables/${id}/transfer`,
        { newOwner },  // 后端期望 newOwner，不是 newOwnerAddress
        { headers: this.getHeaders() }
      );
      
      if (response.data.success) {
        message.success('应收账款转让成功');
        return response.data.data;
      }
      
      throw new Error(response.data.message || '转让失败');
    } catch (error: any) {
      message.error(error.response?.data?.message || '转让应收账款失败');
      throw error;
    }
  }
}

export default new ReceivableService();

