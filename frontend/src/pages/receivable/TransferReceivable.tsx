import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Tag, Modal, Form, Input, message } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import receivableService from '@/services/receivable';
import type { Receivable } from '@/services/receivable';
import { STATUS_NAMES } from '@/config/constants';

const { Title, Text } = Typography;

function TransferReceivable() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [transferring, setTransferring] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchReceivables();
  }, []);

  const fetchReceivables = async () => {
    setLoading(true);
    try {
      const result = await receivableService.getReceivables({
        status: 'confirmed',
      });
      setReceivables(result.items.filter(r => !r.financed));
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTransferClick = (record: Receivable) => {
    setSelectedReceivable(record);
    setModalVisible(true);
    form.resetFields();
  };

  const handleTransferSubmit = async (values: any) => {
    if (!selectedReceivable) return;

    setTransferring(selectedReceivable.receivable_id);
    try {
      await receivableService.transferReceivable(
        selectedReceivable.receivable_id,
        values.newOwner
      );
      setModalVisible(false);
      fetchReceivables();
    } catch (error: any) {
      // 错误已在 service 中处理
      console.error(error);
    } finally {
      setTransferring(null);
    }
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
      title: '当前持有人',
      dataIndex: 'owner_address',
      key: 'owner_address',
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
          icon={<SwapOutlined />}
          onClick={() => handleTransferClick(record)}
          disabled={record.financed}
        >
          转让
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
              转让应收账款
            </Title>
            <Text type="secondary">将已确认的应收账款转让给其他用户</Text>
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

      <Modal
        title="转让应收账款"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleTransferSubmit}>
          <Form.Item label="应收账款信息">
            <Text>金额: ¥{selectedReceivable?.amount}</Text>
            <br />
            <Text type="secondary">
              ID: {selectedReceivable?.receivable_id}
            </Text>
          </Form.Item>

          <Form.Item
            label="新持有人地址"
            name="newOwner"
            rules={[
              { required: true, message: '请输入新持有人钱包地址' },
              { pattern: /^0x[a-fA-F0-9]{40}$/, message: '请输入有效的以太坊地址' },
            ]}
          >
            <Input placeholder="0x..." />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={!!transferring}>
                确认转让
              </Button>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default TransferReceivable;

