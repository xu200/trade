import { Card, Descriptions, Button, Space, Tag, Alert } from 'antd';
import { useAuthStore } from '@/store/authStore';
import { normalizeRole, getRoleDisplayName } from '@/utils/roleHelper';

function DebugInfo() {
  const { user, token, isAuthenticated } = useAuthStore();

  const clearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  const checkLocalStorage = () => {
    const authStorage = localStorage.getItem('auth-storage');
    const jwtToken = localStorage.getItem('scf_jwt_token');
    const userInfo = localStorage.getItem('scf_user_info');
    
    console.log('=== LocalStorage 数据 ===');
    console.log('auth-storage:', authStorage);
    console.log('scf_jwt_token:', jwtToken);
    console.log('scf_user_info:', userInfo);
    
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      console.log('解析后的用户数据:', parsed.state?.user);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          message="调试信息页面"
          description="这个页面用于调试用户角色和认证信息。如果发现角色显示不正确，请先尝试清除缓存。"
          type="info"
          showIcon
        />

        <Card title="当前用户信息">
          <Descriptions bordered column={1}>
            <Descriptions.Item label="是否已登录">
              <Tag color={isAuthenticated ? 'success' : 'error'}>
                {isAuthenticated ? '是' : '否'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="钱包地址">
              {user?.walletAddress || '未设置'}
            </Descriptions.Item>
            <Descriptions.Item label="角色（原始值）">
              <Tag color="blue">{String(user?.role || '未设置')}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="角色（标准化后）">
              <Tag color="green">{normalizeRole(user?.role)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="角色（显示名称）">
              <Tag color="purple">{getRoleDisplayName(user?.role)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="公司名称">
              {user?.companyName || '未设置'}
            </Descriptions.Item>
            <Descriptions.Item label="联系人">
              {user?.contactPerson || '未设置'}
            </Descriptions.Item>
            <Descriptions.Item label="联系邮箱">
              {user?.contactEmail || '未设置'}
            </Descriptions.Item>
            <Descriptions.Item label="JWT Token">
              {token ? `${token.substring(0, 20)}...` : '未设置'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="角色测试">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <strong>当前角色匹配测试：</strong>
            </div>
            <div>
              是否为核心企业: {String(normalizeRole(user?.role) === 'corecompany')}
            </div>
            <div>
              是否为供应商: {String(normalizeRole(user?.role) === 'supplier')}
            </div>
            <div>
              是否为金融机构: {String(normalizeRole(user?.role) === 'financier')}
            </div>
          </Space>
        </Card>

        <Card title="LocalStorage 数据">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <strong>auth-storage:</strong>
              <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
                {localStorage.getItem('auth-storage') || '无数据'}
              </pre>
            </div>
          </Space>
        </Card>

        <Card title="操作">
          <Space wrap>
            <Button type="primary" onClick={checkLocalStorage}>
              检查 LocalStorage（查看控制台）
            </Button>
            <Button danger onClick={clearCache}>
              清除所有缓存并刷新
            </Button>
            <Button onClick={() => window.location.href = '/login'}>
              返回登录页
            </Button>
          </Space>
        </Card>

        <Card title="预期的数据格式">
          <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px' }}>
{`{
  "state": {
    "user": {
      "walletAddress": "0x...",
      "role": "CoreCompany",  // 或 "Supplier" 或 "Financier"
      "companyName": "公司名称",
      "contactPerson": "联系人",
      "contactEmail": "邮箱"
    },
    "token": "jwt-token...",
    "isAuthenticated": true
  }
}`}
          </pre>
        </Card>
      </Space>
    </div>
  );
}

export default DebugInfo;

