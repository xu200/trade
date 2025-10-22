import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Tag, Modal, Form, Input, InputNumber, message } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import receivableService from '@/services/receivable';
import type { Receivable } from '@/services/receivable';
import financeService from '@/services/finance';
import { STATUS_NAMES } from '@/config/constants';

const { Title, Text } = Typography;

function ApplyFinance() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [applying, setApplying] = useState<number | null>(null);
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
        status: 1,  // ✅ 已确认状态
      });
      // 只显示未融资的 (status < 3)
      setReceivables(result.items.filter((r: Receivable) => r.status === 1));
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyClick = (record: Receivable) => {
    setSelectedReceivable(record);
    setModalVisible(true);
    form.resetFields();
    form.setFieldsValue({
      applyAmount: record.amount,
    });
  };

  const handleApplySubmit = async (values: any) => {
    if (!selectedReceivable) return;

    setApplying(selectedReceivable.receivableId);
    try {
      // 转换金额为Wei
      const financeAmountInWei = ethers.parseEther(values.financeAmount.toString()).toString();
      
      // 转换利率（例如10% -> 1000）
      const interestRateInt = Math.round(values.interestRate * 100);

      console.log('📤 申请融资参数:', {
        receivableId: selectedReceivable.receivableId,
        financier: values.financier,
        financeAmount: values.financeAmount + ' ETH -> ' + financeAmountInWei + ' Wei',
        interestRate: values.interestRate + '% -> ' + interestRateInt
      });

      await financeService.applyForFinance({
        receivableId: selectedReceivable.receivableId,
        financier: values.financier,  // ✅ 金融机构地址
        financeAmount: financeAmountInWei,  // ✅ Wei字符串
        interestRate: interestRateInt,  // ✅ 整数（1000 = 10%）
      });
      
      message.success('融资申请提交成功！');
      setModalVisible(false);
      fetchReceivables();
    } catch (error: any) {
      console.error('❌ 申请失败:', error);
    } finally {
      setApplying(null);
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
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: string) => `¥${parseFloat(amount).toLocaleString()}`,
    },
    {
      title: '发行方',
      dataIndex: 'issuerAddress',
      key: 'issuerAddress',
      render: (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`,
    },
    {
      title: '到期日期',
      dataIndex: 'dueDate',
      key: 'dueDate',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color="success">{STATUS_NAMES[status as keyof typeof STATUS_NAMES]}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Receivable) => (
        <Button
          type="primary"
          icon={<DollarOutlined />}
          onClick={() => handleApplyClick(record)}
        >
          申请融资
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
              申请融资
            </Title>
            <Text type="secondary">选择已确认的应收账款申请融资</Text>
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
        title="申请融资"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleApplySubmit}>
          <Form.Item label="应收账款信息">
            <Text>金额: {selectedReceivable?.amount ? (parseFloat(selectedReceivable.amount) / 1e18).toFixed(4) + ' ETH' : '-'}</Text>
            <br />
            <Text type="secondary">ID: {selectedReceivable?.receivableId}</Text>
            <br />
            <Text type="secondary">
              到期日期: {selectedReceivable?.dueTime ? new Date(selectedReceivable.dueTime).toLocaleDateString('zh-CN') : '-'}
            </Text>
          </Form.Item>

          <Form.Item
            label="金融机构地址"
            name="financier"
            rules={[
              { required: true, message: '请输入金融机构钱包地址' },
              { pattern: /^0x[a-fA-F0-9]{40}$/, message: '请输入有效的以太坊地址' },
            ]}
          >
            <Input placeholder="0x..." />
          </Form.Item>

          <Form.Item
            label="申请金额 (ETH)"
            name="financeAmount"
            rules={[
              { required: true, message: '请输入申请金额' },
              { pattern: /^\d+(\.\d+)?$/, message: '请输入有效的数字' },
            ]}
            extra="不能超过应收账款金额"
          >
            <Input suffix="ETH" placeholder="例如: 4.5" />
          </Form.Item>

          <Form.Item
            label="利率 (%)"
            name="interestRate"
            rules={[
              { required: true, message: '请输入利率' },
            ]}
            extra="例如: 10 表示 10%"
          >
            <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} placeholder="例如: 10" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={!!applying}>
                提交申请
              </Button>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default ApplyFinance;

