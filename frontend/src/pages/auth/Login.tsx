import { useState } from 'react';
import { Card, Button, Typography, Space, Spin } from 'antd';
import { WalletOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import walletService from '@/services/wallet';

const { Title, Paragraph, Text } = Typography;

function Login() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [connecting, setConnecting] = useState(false);
  const isInstalled = walletService.isMetaMaskInstalled();

  const handleLogin = async () => {
    try {
      setConnecting(true);
      const address = await walletService.connect();
      await login(address);
      navigate('/dashboard');
    } catch (error: any) {
      console.error('登录失败:', error);
      if (error.response?.status === 404) {
        setTimeout(() => navigate('/register'), 1500);
      }
    } finally {
      setConnecting(false);
    }
  };

  const loading = connecting || isLoading;

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
        maxWidth: '480px',
        borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              🔗 区块链供应链金融系统
            </Title>
            <Paragraph type="secondary" style={{ marginTop: '8px' }}>
              使用MetaMask钱包登录
            </Paragraph>
          </div>

          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Button
              type="primary"
              size="large"
              icon={loading ? <Spin size="small" /> : <WalletOutlined />}
              onClick={handleLogin}
              loading={loading}
              disabled={!isInstalled}
              style={{ width: '100%', height: '48px', fontSize: '16px' }}
            >
              {loading ? '连接中...' : '连接MetaMask登录'}
            </Button>

            {!isInstalled && (
              <Text type="danger">
                请先安装{' '}
                <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">
                  MetaMask
                </a>{' '}
                钱包插件
              </Text>
            )}
          </Space>

          <div>
            <Text type="secondary">还没有账号？</Text>{' '}
            <Button type="link" onClick={() => navigate('/register')}>
              立即注册
            </Button>
          </div>

          <Card size="small" style={{ background: '#f5f5f5', border: 'none', textAlign: 'left' }}>
            <Space direction="vertical" size="small">
              <Text strong>登录说明：</Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>1. 点击"连接MetaMask登录"按钮</Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>2. 在MetaMask中选择要连接的账户</Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>3. 签名确认登录消息</Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>4. 登录成功后进入系统</Text>
            </Space>
          </Card>
        </Space>
      </Card>
    </div>
  );
}

export default Login;
