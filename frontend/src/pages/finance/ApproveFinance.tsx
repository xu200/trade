import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Tag, Modal, message } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import financeService from '@/services/finance';
import contractService from '@/services/contract';
import apiService from '@/services/api';
import type { FinanceApplication } from '@/services/finance';

const { Title, Text } = Typography;

const STATUS_COLORS = {
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'error',
};

const STATUS_NAMES = {
  Pending: '待审批',
  Approved: '已批准',
  Rejected: '已拒绝',
};

function ApproveFinance() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState<FinanceApplication[]>([]);
  const [processing, setProcessing] = useState<number | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const result = await financeService.getApplications();
      setApplications(result.data);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (record: FinanceApplication) => {
    const ethAmount = (parseFloat(record.applyAmount) / 1e18).toFixed(4);
    
    Modal.confirm({
      title: '💰 批准融资申请 (MetaMask转账ETH)',
      content: (
        <div>
          <p>确定要批准这笔融资申请吗？</p>
          <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
            转账金额: {ethAmount} ETH
          </p>
          <p style={{ color: '#666', fontSize: '12px' }}>
            ⚠️ 批准后将通过MetaMask转账 <strong>{ethAmount} ETH</strong> 给供应商
          </p>
          <p style={{ color: '#666', fontSize: '12px' }}>
            💡 您将成为该应收账款的新持有人，到期时可获得本金+利息
          </p>
        </div>
      ),
      okText: '确认批准并转账',
      cancelText: '取消',
      onOk: async () => {
        setProcessing(record.applicationId);
        try {
          console.log('💰 开始MetaMask批准+转账流程...');
          
          // 1. 调用MetaMask签名并转账ETH给供应商
          const { txHash } = await contractService.approveFinanceApplication(
            record.applicationId,
            record.applyAmount  // Wei字符串
          );
          
          console.log('✅ 交易已上链:', txHash);
          message.success(`已转账 ${ethAmount} ETH，正在同步到后端...`);
          
          // 2. 通知后端同步
          await apiService.post('/finance/sync', {
            applicationId: record.applicationId,
            txHash,
            action: 'approve',
            amount: record.applyAmount
          });
          
          message.success('融资批准成功！');
          fetchApplications();
        } catch (error: any) {
          console.error('❌ 批准失败:', error);
          message.error(error.message || '批准失败');
        } finally {
          setProcessing(null);
        }
      },
    });
  };

  const handleReject = (record: FinanceApplication) => {
    Modal.confirm({
      title: '拒绝融资申请',
      content: `确定要拒绝这笔融资申请吗？`,
      okText: '确认拒绝',
      okType: 'danger',
      onOk: async () => {
        setProcessing(record.applicationId);
        try {
          await financeService.rejectFinance(record.applicationId);
          fetchApplications();
        } catch (error: any) {
          message.error(error.message || '拒绝失败');
        } finally {
          setProcessing(null);
        }
      },
    });
  };

  const columns = [
    {
      title: '申请ID',
      dataIndex: 'applicationId',
      key: 'applicationId',
      width: 100,
    },
    {
      title: '应收账款ID',
      dataIndex: 'receivableId',
      key: 'receivableId',
      width: 120,
    },
    {
      title: '申请金额',
      dataIndex: 'applyAmount',
      key: 'applyAmount',
      render: (amount: string) => `¥${parseFloat(amount).toLocaleString()}`,
    },
    {
      title: '申请人',
      dataIndex: 'applicantAddress',
      key: 'applicantAddress',
      render: (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`,
    },
    {
      title: '申请日期',
      dataIndex: 'applyDate',
      key: 'applyDate',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status as keyof typeof STATUS_COLORS]}>
          {STATUS_NAMES[status as keyof typeof STATUS_NAMES]}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: FinanceApplication) =>
        record.status === 'Pending' ? (
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleApprove(record)}
              loading={processing === record.applicationId}
            >
              批准
            </Button>
            <Button
              danger
              size="small"
              icon={<CloseCircleOutlined />}
              onClick={() => handleReject(record)}
              loading={processing === record.applicationId}
            >
              拒绝
            </Button>
          </Space>
        ) : (
          <Text type="secondary">已处理</Text>
        ),
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              融资审批
            </Title>
            <Text type="secondary">审批供应商的融资申请</Text>
          </div>
          <Button onClick={() => navigate('/dashboard')}>返回</Button>
        </div>

        <Card>
          <Table
            columns={columns}
            dataSource={applications}
            loading={loading}
            rowKey="applicationId"
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </Space>
    </div>
  );
}

export default ApproveFinance;

