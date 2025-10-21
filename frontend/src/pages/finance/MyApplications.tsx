import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Tag, Select } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '@/config/constants';
import { getToken } from '@/utils/storage';

const { Title, Text } = Typography;
const { Option } = Select;

interface FinanceApplication {
  id: number;
  application_id: number;
  receivable_id: number;
  applicant_address: string;
  financier_address: string;
  apply_amount: string;
  apply_date: string;
  status: 'pending' | 'approved' | 'rejected';
  terms?: string;
}

function MyApplications() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState<FinanceApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    fetchApplications();
  }, [page, pageSize, statusFilter]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const response = await axios.get(`${API_BASE_URL}/finance/applications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          page,
          limit: pageSize,
          status: statusFilter || undefined,
        },
      });

      if (response.data.success) {
        setApplications(response.data.data.items || []);
        setTotal(response.data.data.total || 0);
      }
    } catch (error: any) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'processing', text: '审批中' },
      approved: { color: 'success', text: '已批准' },
      rejected: { color: 'error', text: '已拒绝' },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: '申请ID',
      dataIndex: 'application_id',
      key: 'application_id',
      width: 100,
    },
    {
      title: '应收账款ID',
      dataIndex: 'receivable_id',
      key: 'receivable_id',
      width: 120,
    },
    {
      title: '申请金额',
      dataIndex: 'apply_amount',
      key: 'apply_amount',
      render: (amount: string) => `¥${parseFloat(amount).toLocaleString()}`,
    },
    {
      title: '金融机构',
      dataIndex: 'financier_address',
      key: 'financier_address',
      render: (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`,
    },
    {
      title: '申请时间',
      dataIndex: 'apply_date',
      key: 'apply_date',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: FinanceApplication) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/receivable/${record.receivable_id}`)}
        >
          查看账款
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              我的融资申请
            </Title>
            <Text type="secondary">查看您提交的融资申请记录</Text>
          </div>
          <Button type="primary" onClick={() => navigate('/finance/apply')}>
            申请融资
          </Button>
        </div>

        <Card>
          <Space style={{ marginBottom: 16 }} wrap>
            <Select
              placeholder="筛选状态"
              style={{ width: 150 }}
              allowClear
              onChange={(value) => {
                setStatusFilter(value || '');
                setPage(1);
              }}
            >
              <Option value="">全部</Option>
              <Option value="pending">审批中</Option>
              <Option value="approved">已批准</Option>
              <Option value="rejected">已拒绝</Option>
            </Select>
            <Button onClick={fetchApplications}>刷新</Button>
          </Space>

          <Table
            columns={columns}
            dataSource={applications}
            loading={loading}
            rowKey="application_id"
            pagination={{
              current: page,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
              onChange: (page, pageSize) => {
                setPage(page);
                setPageSize(pageSize);
              },
            }}
          />
        </Card>
      </Space>
    </div>
  );
}

export default MyApplications;

