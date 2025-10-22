import { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Space, Tag, Spin, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '@/config/constants';
import { getToken } from '@/utils/storage';
import { useAuthStore } from '@/store/authStore';
import { isRole } from '@/utils/roleHelper';
import type { Receivable } from '@/services/receivable';

function ReceivableDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [receivable, setReceivable] = useState<Receivable | null>(null);

  useEffect(() => {
    if (id) {
      fetchDetail();
    }
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const response = await axios.get(`${API_BASE_URL}/receivables/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.data.success) {
        setReceivable(response.data.data);
      }
    } catch (error: any) {
      message.error('获取详情失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (record: Receivable) => {
    const statusMap: Record<number, { color: string; text: string }> = {
      0: { color: 'warning', text: '待确认' },
      1: { color: 'processing', text: '已确认' },
      2: { color: 'blue', text: '已转让' },
      3: { color: 'success', text: '已融资' },
    };
    const config = statusMap[record.status] || { color: 'default', text: '未知' };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!receivable) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <p>应收账款不存在</p>
          <Button onClick={() => navigate('/receivable/list')}>返回列表</Button>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
        >
          返回
        </Button>

        <Card title="应收账款详情">
          <Descriptions bordered column={2}>
            <Descriptions.Item label="应收账款ID">
              {receivable.receivableId || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="合同编号">
              {receivable.contractNumber || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="金额">
              {receivable.amount ? `¥${parseFloat(receivable.amount).toLocaleString()}` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {getStatusTag(receivable)}
            </Descriptions.Item>
            <Descriptions.Item label="发行方地址">
              {receivable.issuer || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="当前持有人">
              {receivable.currentOwner || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="到期日期">
              {receivable.dueTime || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="描述" span={2}>
              {receivable.description || '无'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="操作">
          <Space wrap>
            {/* 供应商才能确认账款，并且必须是自己持有的 */}
            {receivable.status === 0 && 
             user && 
             receivable.currentOwner &&
             isRole(user.role, 'Supplier') && 
             receivable.currentOwner.toLowerCase() === user.walletAddress.toLowerCase() && (
              <Button type="primary" onClick={() => navigate('/receivable/confirm')}>
                确认账款
              </Button>
            )}
            
            {/* 供应商可以转让和申请融资，必须是已确认且未融资 */}
            {receivable.status === 1 && 
             user &&
             receivable.currentOwner &&
             isRole(user.role, 'Supplier') &&
             receivable.currentOwner.toLowerCase() === user.walletAddress.toLowerCase() && (
              <>
                <Button onClick={() => navigate('/receivable/transfer')}>
                  转让账款
                </Button>
                <Button type="primary" onClick={() => navigate('/finance/apply')}>
                  申请融资
                </Button>
              </>
            )}
            
            {/* 核心企业只能查看，不能操作 */}
            {user && isRole(user.role, 'CoreCompany') && (
              <Button type="default" disabled>
                核心企业仅可查看详情
              </Button>
            )}
            
            {/* 未登录或其他情况 */}
            {!user && (
              <Button type="default" disabled>
                请先登录
              </Button>
            )}
          </Space>
        </Card>
      </Space>
    </div>
  );
}

export default ReceivableDetail;

