import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Tag, Modal, Form, Input, message } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import receivableService from '@/services/receivable';
import contractService from '@/services/contract';
import apiService from '@/services/api';
import type { Receivable } from '@/services/receivable';
// import { STATUS_NAMES } from '@/config/constants';

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
      // 获取已确认且未融资的应收账款 (status=1)
      const result = await receivableService.getReceivables({ status: 1 });
      setReceivables(result.items);
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

    // 验证地址
    if (!ethers.isAddress(values.newOwner)) {
      message.error('无效的以太坊地址');
      return;
    }

    setTransferring(selectedReceivable.receivableId);
    try {
      console.log('🔐 开始MetaMask转让流程...');
      
      // 1. 调用MetaMask签名并上链
      const { txHash } = await contractService.transferReceivable(
        selectedReceivable.receivableId,
        values.newOwner
      );
      
      console.log('✅ 交易已上链:', txHash);
      message.success('交易已提交，正在同步到后端...');
      
      // 2. 通知后端同步
      await apiService.post('/receivables/sync', {
        receivableId: selectedReceivable.receivableId,
        txHash,
        action: 'transfer',
        newOwner: values.newOwner
      });
      
      message.success('应收账款转让成功！');
      setModalVisible(false);
      fetchReceivables();
    } catch (error: any) {
      console.error('❌ 转让失败:', error);
      message.error(error.message || '转让失败');
    } finally {
      setTransferring(null);
    }
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
      title: '当前持有人',
      dataIndex: 'currentOwner',
      key: 'currentOwner',
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
          icon={<SwapOutlined />}
          onClick={() => handleTransferClick(record)}
          disabled={record.status !== 1}
        >
          ⛓️ MetaMask转让
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
            rowKey="receivableId"
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </Space>

      <Modal
        title="⛓️ 转让应收账款 (MetaMask签名)"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleTransferSubmit}>
          <Form.Item label="应收账款信息">
            <Text>
              金额: {selectedReceivable?.amount ? (parseFloat(selectedReceivable.amount) / 1e18).toFixed(4) + ' ETH' : '-'}
            </Text>
            <br />
            <Text type="secondary">
              ID: {selectedReceivable?.receivableId}
            </Text>
          </Form.Item>
          
          <Form.Item style={{ marginBottom: '8px' }}>
            <Text type="secondary">⚠️ 此操作需要MetaMask签名，将消耗少量Gas费</Text>
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

