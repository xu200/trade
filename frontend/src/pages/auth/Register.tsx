import { useState } from 'react';
import { Card, Form, Input, Select, Button, Space, Typography } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import walletService from '@/services/wallet';
import { ROLE_NAMES } from '@/config/constants';
import type { RegisterFormValues } from '@/types';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

function Register() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { register, isLoading } = useAuthStore();
  const [connecting, setConnecting] = useState(false);
  const [address, setAddress] = useState<string>('');
  const isInstalled = walletService.isMetaMaskInstalled();

  const handleConnectWallet = async () => {
    try {
      setConnecting(true);
      const walletAddress = await walletService.connect();
      setAddress(walletAddress);
      form.setFieldValue('walletAddress', walletAddress);
    } catch (error) {
      console.error('连接钱包失败:', error);
    } finally {
      setConnecting(false);
    }
  };

  const handleSubmit = async (values: RegisterFormValues) => {
    try {
      await register(values);
      setTimeout(() => navigate('/login'), 1500);
    } catch (error) {
      console.error('注册失败:', error);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
    }}>
      <Card style={{
        width: '100%',
        maxWidth: '560px',
        borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={2} style={{ margin: '0 0 8px 0' }}>
              🔗 用户注册
            </Title>
            <Paragraph type="secondary">填写信息完成注册</Paragraph>
          </div>

          <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off">
            <Form.Item
              label="钱包地址"
              name="walletAddress"
              rules={[
                { required: true, message: '请输入或连接钱包地址' },
                { pattern: /^0x[a-fA-F0-9]{40}$/, message: '请输入有效的以太坊地址' },
              ]}
              extra={
                !address && (
                  <Button
                    type="link"
                    size="small"
                    onClick={handleConnectWallet}
                    loading={connecting}
                    disabled={!isInstalled}
                    style={{ padding: 0, height: 'auto' }}
                  >
                    点击连接MetaMask钱包自动填充
                  </Button>
                )
              }
            >
              <Input prefix={<UserOutlined />} placeholder="0x..." disabled={!!address} />
            </Form.Item>

            <Form.Item
              label="用户角色"
              name="role"
              rules={[{ required: true, message: '请选择用户角色' }]}
            >
              <Select placeholder="请选择您的角色">
                <Option value="CoreCompany">{ROLE_NAMES.CoreCompany}</Option>
                <Option value="Supplier">{ROLE_NAMES.Supplier}</Option>
                <Option value="Financier">{ROLE_NAMES.Financier}</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="公司名称"
              name="companyName"
              rules={[
                { required: true, message: '请输入公司名称' },
                { min: 2, message: '公司名称至少2个字符' },
              ]}
            >
              <Input placeholder="请输入公司名称" />
            </Form.Item>

            <Form.Item label="联系人" name="contactPerson">
              <Input prefix={<PhoneOutlined />} placeholder="请输入联系人姓名" />
            </Form.Item>

            <Form.Item
              label="联系邮箱"
              name="contactEmail"
              rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
            >
              <Input prefix={<MailOutlined />} placeholder="请输入联系邮箱" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Button type="primary" htmlType="submit" loading={isLoading} block size="large">
                  注册
                </Button>

                <div style={{ textAlign: 'center' }}>
                  <Text type="secondary">已有账号？</Text>{' '}
                  <Button type="link" onClick={() => navigate('/login')}>
                    立即登录
                  </Button>
                </div>
              </Space>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
}

export default Register;
