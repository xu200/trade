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
  async getApplications(params?: any): Promise<{ data: FinanceApplication[]; total: number }> {
    try {
      const response = await axios.get(`${this.baseURL}/finance/applications`, {
        headers: this.getHeaders(),
        params,
      });
      return response.data.data || { data: [], total: 0 };
    } catch (error) {
      console.error('获取融资申请列表失败:', error);
      return { data: [], total: 0 };
    }
  }

  // 申请融资
  async applyForFinance(data: {
    receivableId: number;
    financierAddress: string;
    applyAmount: string;
    terms?: string;
  }): Promise<any> {
    const response = await axios.post(`${this.baseURL}/finance/apply`, data, {
      headers: this.getHeaders(),
    });
    message.success('融资申请提交成功');
    return response.data.data;
  }

  // 批准融资
  async approveFinance(id: number): Promise<any> {
    const response = await axios.post(`${this.baseURL}/finance/${id}/approve`, {}, {
      headers: this.getHeaders(),
    });
    message.success('融资申请已批准');
    return response.data.data;
  }

  // 拒绝融资
  async rejectFinance(id: number): Promise<any> {
    const response = await axios.post(`${this.baseURL}/finance/${id}/reject`, {}, {
      headers: this.getHeaders(),
    });
    message.success('融资申请已拒绝');
    return response.data.data;
  }
}

export default new FinanceService();

