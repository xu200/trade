import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Tag, message, Modal } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import receivableService from '@/services/receivable';
import contractService from '@/services/contract';
import apiService from '@/services/api';
import type { Receivable } from '@/services/receivable';

const { Title, Text } = Typography;

function ConfirmReceivable() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [confirming, setConfirming] = useState<number | null>(null);

  useEffect(() => {
    fetchReceivables();
  }, []);

  const fetchReceivables = async () => {
    setLoading(true);
    try {
      // 获取未确认的应收账款 (status=0: 待确认)
      const result = await receivableService.getReceivables({ status: 0 });
      setReceivables(result.items);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = (record: Receivable) => {
    const ethAmount = (parseFloat(record.amount) / 1e18).toFixed(4);
    
    Modal.confirm({
      title: '⛓️ 确认应收账款 (MetaMask签名)',
      content: (
        <div>
          <p>确定要确认金额为 <strong>{ethAmount} ETH</strong> 的应收账款吗？</p>
          <p style={{ color: '#666', fontSize: '12px' }}>
            ⚠️ 此操作需要MetaMask签名，将消耗少量Gas费
          </p>
        </div>
      ),
      okText: '确认并签名',
      cancelText: '取消',
      onOk: async () => {
        setConfirming(record.receivableId);
        try {
          console.log('🔐 开始MetaMask确认流程...');
          
          // 1. 调用MetaMask签名并上链
          const { txHash } = await contractService.confirmReceivable(record.receivableId);
          
          console.log('✅ 交易已上链:', txHash);
          message.success('交易已提交，正在同步到后端...');
          
          // 2. 通知后端同步
          await apiService.post('/receivables/sync', {
            receivableId: record.receivableId,
            txHash,
            action: 'confirm'
          });
          
          message.success('应收账款确认成功！');
          fetchReceivables();
        } catch (error: any) {
          console.error('❌ 确认失败:', error);
          message.error(error.message || '确认失败');
        } finally {
          setConfirming(null);
        }
      },
    });
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'receivableId',
      key: 'receivableId',
      width: 80,
    },
    {
      title: '合同编号',
      dataIndex: 'contractNumber',
      key: 'contractNumber',
      width: 150,
      render: (num: string) => num || '-',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: string) => {
        if (!amount) return '-';
        const ethAmount = (parseFloat(amount) / 1e18).toFixed(4);
        return `${ethAmount} ETH`;
      },
    },
    {
      title: '发行方',
      dataIndex: 'issuer',
      key: 'issuer',
      render: (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '-',
    },
    {
      title: '到期日期',
      dataIndex: 'dueTime',
      key: 'dueTime',
      render: (time: string) => {
        if (!time) return '-';
        return new Date(time).toLocaleDateString('zh-CN');
      },
    },
    {
      title: '状态',
      key: 'status',
      render: (_: any, record: Receivable) => {
        const statusMap: Record<number, { color: string; text: string }> = {
          0: { color: 'warning', text: '待确认' },
          1: { color: 'processing', text: '已确认' },
          2: { color: 'blue', text: '已转让' },
          3: { color: 'success', text: '已融资' },
        };
        const config = statusMap[record.status] || { color: 'default', text: '未知' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Receivable) => (
        <Button
          type="primary"
          icon={<CheckCircleOutlined />}
          onClick={() => handleConfirm(record)}
          loading={confirming === record.receivableId}
          disabled={record.status !== 0}
        >
          {record.status === 0 ? '⛓️ MetaMask确认' : '已确认'}
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              待确认应收账款
            </Title>
            <Text type="secondary">供应商确认核心企业开具的应收账款</Text>
          </div>
          <Button onClick={() => navigate('/dashboard')}>返回</Button>
        </div>

        <Card>
          <Table
            columns={columns}
            dataSource={receivables}
            loading={loading}
            rowKey="receivableId"
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </Space>
    </div>
  );
}

export default ConfirmReceivable;

