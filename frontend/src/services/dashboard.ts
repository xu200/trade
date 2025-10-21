import axios from 'axios';
import { API_BASE_URL } from '@/config/constants';
import { getToken } from '@/utils/storage';

export interface DashboardStats {
  totalReceivables: number;
  pendingReceivables: number;
  confirmedReceivables: number;
  financeApplications: number;
}

class DashboardService {
  private baseURL = API_BASE_URL;

  private getHeaders() {
    const token = getToken();
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    };
  }

  // 获取统计数据
  async getStats(): Promise<DashboardStats> {
    try {
      const response = await axios.get(`${this.baseURL}/dashboard/stats`, {
        headers: this.getHeaders(),
      });
      
      if (response.data.success) {
        return response.data.data;
      }
      
      return {
        totalReceivables: 0,
        pendingReceivables: 0,
        confirmedReceivables: 0,
        financeApplications: 0,
      };
    } catch (error: any) {
      console.error('获取统计数据失败:', error);
      return {
        totalReceivables: 0,
        pendingReceivables: 0,
        confirmedReceivables: 0,
        financeApplications: 0,
      };
    }
  }
}

export default new DashboardService();

