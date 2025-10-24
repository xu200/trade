import axios from 'axios';
import { message } from 'antd';
import { API_BASE_URL } from '@/config/constants';
import { getToken } from '@/utils/storage';

// 应收账款类型（严格匹配后端Swagger API返回）
export interface Receivable {
  id: number;
  receivableId: number;
  issuer: string;
  currentOwner: string;
  amount: string;
  dueTime: string;
  description: string | null;
  contractNumber: string | null;
  isConfirmed: boolean;
  status: number; // 0-待确认, 1-已确认, 2-已转让, 3-已融资
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

  // 获取应收账款列表（匹配后端Swagger参数）
  async getReceivables(params?: {
    page?: number;
    limit?: number;
    type?: 'owned' | 'issued' | 'all'; // owned-我拥有的, issued-我发行的, all-全部
    status?: 0 | 1 | 2 | 3; // 0-待确认, 1-已确认, 2-已转让, 3-已融资
  }): Promise<{ items: Receivable[]; total: number; page: number; pageSize: number }> {
    try {
      console.log('🔄 调用后端API: GET /receivables', params);
      
      const response = await axios.get(`${this.baseURL}/receivables`, {
        headers: this.getHeaders(),
        params,
      });
      
      console.log('📦 后端原始响应:', response.data);
      
      if (response.data.success) {
        // 后端返回格式: { success: true, data: { items: [...], total, page, pageSize, totalPages } }
        const responseData = response.data.data;
        console.log('📋 response.data.data:', responseData);
        
        // 提取 items 数组
        const items = Array.isArray(responseData?.items) ? responseData.items : [];
        const total = responseData?.total || items.length;
        
        console.log('✅ 提取的 items:', items);
        console.log('✅ 总数:', total);
        
        return {
          items,
          total,
          page: responseData?.page || params?.page || 1,
          pageSize: responseData?.pageSize || params?.limit || 10,
        };
      }
      
      console.log('⚠️ 后端返回 success=false');
      return { items: [], total: 0, page: 1, pageSize: 10 };
    } catch (error: any) {
      console.error('❌ 获取应收账款列表失败:', error);
      console.error('❌ 错误详情:', error.response?.data);
      message.error(error.response?.data?.message || '获取应收账款列表失败');
      return { items: [], total: 0, page: 1, pageSize: 10 };
    }
  }

  // 创建应收账款（前端已调用MetaMask，传递txHash给后端）
  async createReceivable(data: {
    supplier: string;      // 供应商地址
    amount: string;        // 金额（Wei）
    dueTime: string;       // 到期时间（ISO字符串）
    description?: string;  // 描述
    contractNumber: string; // 合同编号
    txHash?: string;       // 交易哈希（前端调用MetaMask后获得）
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

  // 转让应收账款（核心企业转让给其他用户）
  async transferReceivable(id: number, newOwner: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseURL}/receivables/${id}/transfer`,
        { newOwner },
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

  // 供应商确认应收账款
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
}

export default new ReceivableService();

