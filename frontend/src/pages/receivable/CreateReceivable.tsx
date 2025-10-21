import { useState } from 'react';
import { Card, Form, Input, DatePicker, Button, Space, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import receivableService from '@/services/receivable';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

function CreateReceivable() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await receivableService.createReceivable({
        supplier: values.supplier,  // 匹配后端字段
        amount: values.amount,
        dueTime: values.dueTime.format('YYYY-MM-DD'),  // 匹配后端字段
        description: values.description,
        contractNumber: values.contractNumber,  // 必填字段
      });
      form.resetFields();
      message.success('应收账款创建成功');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (error: any) {
      // 错误已在 service 中处理
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Button onClick={() => navigate('/dashboard')}>← 返回</Button>
        </div>

        <Card>
          <Title level={3}>创建应收账款</Title>
          <Text type="secondary">填写应收账款信息（仅核心企业可创建）</Text>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            style={{ marginTop: '24px' }}
          >
            <Form.Item
              label="合同编号"
              name="contractNumber"
              rules={[
                { required: true, message: '请输入合同编号' },
                { min: 3, message: '合同编号至少3个字符' },
              ]}
            >
              <Input placeholder="例如：HT-2025-001" />
            </Form.Item>

            <Form.Item
              label="供应商地址"
              name="supplier"
              rules={[
                { required: true, message: '请输入供应商钱包地址' },
                { pattern: /^0x[a-fA-F0-9]{40}$/, message: '请输入有效的以太坊地址' },
              ]}
            >
              <Input placeholder="0x..." />
            </Form.Item>

            <Form.Item
              label="金额"
              name="amount"
              rules={[
                { required: true, message: '请输入金额' },
                { pattern: /^\d+(\.\d+)?$/, message: '请输入有效的数字' },
              ]}
            >
              <Input prefix="¥" placeholder="请输入金额" />
            </Form.Item>

            <Form.Item
              label="到期日期"
              name="dueTime"
              rules={[{ required: true, message: '请选择到期日期' }]}
            >
              <DatePicker
                style={{ width: '100%' }}
                disabledDate={(current) => current && current < dayjs().endOf('day')}
              />
            </Form.Item>

            <Form.Item label="描述" name="description">
              <TextArea rows={4} placeholder="请输入应收账款描述（可选）" />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={loading}>
                  创建应收账款
                </Button>
                <Button onClick={() => navigate('/dashboard')}>取消</Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </Space>
    </div>
  );
}

export default CreateReceivable;

