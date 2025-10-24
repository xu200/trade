import axios from 'axios';
import { message } from 'antd';
import { API_BASE_URL } from '@/config/constants';
import { getToken } from '@/utils/storage';

// 融资申请类型
export interface FinanceApplication {
  id: number;
  applicationId: number;
  receivableId: number;
  applicantAddress: string;
  financierAddress: string;
  applyAmount: string;
  applyDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  terms?: string;
  transactionHash: string;
}

class FinanceService {
  private baseURL = API_BASE_URL;

  private getHeaders() {
    const token = getToken();
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    };
  }

  // 获取融资申请列表
  async getApplications(params?: any): Promise<{ data: FinanceApplication[]; total: number; items?: any[] }> {
    try {
      const response = await axios.get(`${this.baseURL}/finance/applications`, {
        headers: this.getHeaders(),
        params,
      });
      // 后端返回格式：{ success: true, data: { items: [...], total, page, pageSize } }
      const result = response.data.data || { items: [], total: 0 };
      console.log('📊 finance.ts - 原始响应:', result);
      return result;
    } catch (error) {
      console.error('获取融资申请列表失败:', error);
      return { data: [], total: 0 };
    }
  }

  // 申请融资（匹配后端参数）
  async applyForFinance(data: {
    receivableId: number;
    financier: string;
    financeAmount: string;  // ✅ Wei字符串
    interestRate: number;   // ✅ 利率（整数，例如1000表示10%）
  }): Promise<any> {
    console.log('📤 申请融资参数:', data);
    const response = await axios.post(`${this.baseURL}/finance/apply`, data, {
      headers: this.getHeaders(),
    });
    message.success('融资申请提交成功');
    return response.data.data;
  }

  // 批准或拒绝融资（统一接口）
  async approveOrRejectFinance(id: number, approve: boolean, reason?: string): Promise<any> {
    const response = await axios.post(
      `${this.baseURL}/finance/${id}/approve`,
      {
        approve,
        reason: reason || (approve ? '审批通过' : '审批未通过'),
      },
      {
        headers: this.getHeaders(),
      }
    );
    message.success(approve ? '融资申请已批准' : '融资申请已拒绝');
    return response.data.data;
  }

  // 批准融资（快捷方法）
  async approveFinance(id: number, reason?: string): Promise<any> {
    return this.approveOrRejectFinance(id, true, reason);
  }

  // 拒绝融资（快捷方法）
  async rejectFinance(id: number, reason?: string): Promise<any> {
    return this.approveOrRejectFinance(id, false, reason);
  }
}

export default new FinanceService();

