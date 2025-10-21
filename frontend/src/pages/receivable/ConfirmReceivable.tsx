import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Tag, message, Modal } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import receivableService from '@/services/receivable';
import type { Receivable } from '@/services/receivable';
import { STATUS_NAMES } from '@/config/constants';

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
      // 获取未确认的应收账款
      const result = await receivableService.getReceivables({ status: 'unconfirmed' });
      setReceivables(result.items);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = (record: Receivable) => {
    Modal.confirm({
      title: '确认应收账款',
      content: `确定要确认金额为 ¥${record.amount} 的应收账款吗？`,
      onOk: async () => {
        setConfirming(record.receivable_id);
        try {
          await receivableService.confirmReceivable(record.receivable_id);
          fetchReceivables();
        } catch (error: any) {
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
      dataIndex: 'receivable_id',
      key: 'receivable_id',
      width: 80,
    },
    {
      title: '合同编号',
      dataIndex: 'contract_number',
      key: 'contract_number',
      width: 120,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: string) => `¥${parseFloat(amount).toLocaleString()}`,
    },
    {
      title: '发行方',
      dataIndex: 'issuer_address',
      key: 'issuer_address',
      render: (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`,
    },
    {
      title: '到期日期',
      dataIndex: 'due_time',
      key: 'due_time',
    },
    {
      title: '状态',
      key: 'status',
      render: (record: Receivable) => {
        const statusText = record.financed ? '已融资' : record.confirmed ? '已确认' : '待确认';
        const statusColor = record.financed ? 'success' : record.confirmed ? 'processing' : 'default';
        return <Tag color={statusColor}>{statusText}</Tag>;
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
          loading={confirming === record.receivable_id}
          disabled={record.confirmed}
        >
          {record.confirmed ? '已确认' : '确认'}
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
            rowKey="receivable_id"
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </Space>
    </div>
  );
}

export default ConfirmReceivable;

