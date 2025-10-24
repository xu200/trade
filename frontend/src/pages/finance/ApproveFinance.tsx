import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Tag, App, message } from 'antd';
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
  const { modal } = App.useApp();
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
      console.log('📊 融资申请列表响应:', result);
      
      // financeService 返回格式：{ items: [...], total, page, pageSize }
      // 直接使用 items 数组
      const applications = result.items || [];
      console.log('📋 融资申请列表:', applications);
      setApplications(applications);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (record: any) => {
    const ethAmount = (parseFloat(record.finance_amount) / 1e18).toFixed(4);
    
    // 🔧 先检查用户是否已在链上注册
    try {
      const currentAddress = await contractService.getCurrentAccount();
      const role = await contractService.checkUserRole(currentAddress);
      
      console.log('🔍 检查金融机构角色:', { address: currentAddress, role });
      
      if (role === 0) {
        // 未注册，先注册为金融机构（role = 3）
        message.info('首次使用，正在链上注册账户...');
        console.log('📝 首次使用，需要先在链上注册为金融机构');
        
        try {
          await contractService.registerUser(3, 'Financier');
          message.success('链上注册成功！');
          console.log('✅ 金融机构链上注册成功');
        } catch (regError: any) {
          console.error('❌ 链上注册失败:', regError);
          message.error('链上注册失败: ' + regError.message);
          return;
        }
      }
    } catch (error: any) {
      console.error('❌ 检查角色失败:', error);
      message.error('检查账户状态失败');
      return;
    }
    
    modal.confirm({
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
        setProcessing(record.application_id);
        try {
          console.log('💰 开始MetaMask批准+转账流程...');
          
          // 1. 调用MetaMask签名并转账ETH给供应商
          const { txHash } = await contractService.approveFinanceApplication(
            record.application_id,
            record.finance_amount  // Wei字符串
          );
          
          console.log('✅ 交易已上链:', txHash);
          message.success(`已转账 ${ethAmount} ETH，正在同步到后端...`);
          
          // 2. 通知后端同步
          await apiService.post('/finance/sync', {
            applicationId: record.application_id,
            txHash,
            action: 'approve',
            amount: record.finance_amount
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

  const handleReject = async (record: FinanceApplication) => {
    // 🔧 先检查用户是否已在链上注册
    try {
      const currentAddress = await contractService.getCurrentAccount();
      const role = await contractService.checkUserRole(currentAddress);
      
      if (role === 0) {
        message.info('首次使用，正在链上注册账户...');
        try {
          await contractService.registerUser(3, 'Financier');
          message.success('链上注册成功！');
        } catch (regError: any) {
          message.error('链上注册失败: ' + regError.message);
          return;
        }
      }
    } catch (error: any) {
      message.error('检查账户状态失败');
      return;
    }
    
    modal.confirm({
      title: '拒绝融资申请',
      content: `确定要拒绝这笔融资申请吗？`,
      okText: '确认拒绝',
      okType: 'danger',
      onOk: async () => {
        setProcessing(record.application_id);
        try {
          await financeService.rejectFinance(record.application_id);
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
      dataIndex: 'finance_amount',
      key: 'finance_amount',
      render: (amount: string) => {
        if (!amount) return '-';
        const ethAmount = (parseFloat(amount) / 1e18).toFixed(4);
        return `${ethAmount} ETH`;
      },
    },
    {
      title: '申请人',
      dataIndex: 'applicant_address',
      key: 'applicant_address',
      render: (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '-',
    },
    {
      title: '申请日期',
      dataIndex: 'apply_time',
      key: 'apply_time',
      render: (time: string) => {
        if (!time) return '-';
        return new Date(time).toLocaleDateString('zh-CN');
      },
    },
    {
      title: '状态',
      key: 'status',
      render: (_: any, record: any) => {
        let status: string;
        if (!record.processed) {
          status = 'Pending';
        } else if (record.approved) {
          status = 'Approved';
        } else {
          status = 'Rejected';
        }
        return (
          <Tag color={STATUS_COLORS[status as keyof typeof STATUS_COLORS]}>
            {STATUS_NAMES[status as keyof typeof STATUS_NAMES]}
          </Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) =>
        !record.processed ? (
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleApprove(record)}
              loading={processing === record.application_id}
            >
              批准
            </Button>
            <Button
              danger
              size="small"
              icon={<CloseCircleOutlined />}
              onClick={() => handleReject(record)}
              loading={processing === record.application_id}
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
            rowKey="application_id"
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </Space>
    </div>
  );
}

export default ApproveFinance;

