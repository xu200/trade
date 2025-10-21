import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Space, Typography, Badge } from 'antd';
import type { MenuProps } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  SwapOutlined,
  DollarOutlined,
  AuditOutlined,
  UserOutlined,
  LogoutOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { isRole, getRoleDisplayName } from '@/utils/roleHelper';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const [collapsed, setCollapsed] = useState(false);

  // 根据角色生成菜单
  const getMenuItems = (): MenuProps['items'] => {
    if (!user) return [];

    const baseItems: MenuProps['items'] = [
      {
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: '工作台',
      },
    ];

    // 核心企业菜单
    if (isRole(user.role, 'CoreCompany')) {
      return [
        ...baseItems,
        {
          key: 'receivable-menu',
          icon: <FileTextOutlined />,
          label: '应收账款管理',
          children: [
            {
              key: '/receivable/create',
              icon: <FileTextOutlined />,
              label: '创建应收账款',
            },
            {
              key: '/receivable/list',
              icon: <FileTextOutlined />,
              label: '我的应收账款',
            },
          ],
        },
      ];
    }

    // 供应商菜单
    if (isRole(user.role, 'Supplier')) {
      return [
        ...baseItems,
        {
          key: 'receivable-menu',
          icon: <FileTextOutlined />,
          label: '应收账款',
          children: [
            {
              key: '/receivable/confirm',
              icon: <CheckCircleOutlined />,
              label: '待确认账款',
            },
            {
              key: '/receivable/transfer',
              icon: <SwapOutlined />,
              label: '转让账款',
            },
          ],
        },
        {
          key: 'finance-menu',
          icon: <DollarOutlined />,
          label: '融资管理',
          children: [
            {
              key: '/finance/apply',
              icon: <DollarOutlined />,
              label: '申请融资',
            },
            {
              key: '/finance/my-applications',
              icon: <FileTextOutlined />,
              label: '我的申请',
            },
          ],
        },
      ];
    }

    // 金融机构菜单
    if (isRole(user.role, 'Financier')) {
      return [
        ...baseItems,
        {
          key: 'finance-menu',
          icon: <AuditOutlined />,
          label: '融资审批',
          children: [
            {
              key: '/finance/approve',
              icon: <AuditOutlined />,
              label: '待审批申请',
            },
            {
              key: '/finance/history',
              icon: <FileTextOutlined />,
              label: '审批历史',
            },
          ],
        },
      ];
    }

    return baseItems;
  };

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'profile') {
      navigate('/profile');
    }
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
      onClick: handleUserMenuClick,
    },
    {
      key: 'theme',
      icon: isDark ? <SunOutlined /> : <MoonOutlined />,
      label: isDark ? '切换到亮色' : '切换到暗色',
      onClick: toggleTheme,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: handleLogout,
    },
  ];


  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme={isDark ? 'dark' : 'light'}
      >
        <div
          style={{
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isDark ? '#fff' : '#000',
            fontSize: collapsed ? '16px' : '18px',
            fontWeight: 'bold',
            padding: '0 16px',
          }}
        >
          {collapsed ? '供应链' : '供应链金融系统'}
        </div>
        <Menu
          theme={isDark ? 'dark' : 'light'}
          mode="inline"
          selectedKeys={[location.pathname]}
          items={getMenuItems()}
          onClick={handleMenuClick}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: isDark ? '#141414' : '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <Text strong style={{ fontSize: '16px' }}>
              欢迎回来，{user?.companyName || 'A公司'}！
            </Text>
          </div>

          <Space size="large">
            <Badge count={0}>
              <Avatar style={{ backgroundColor: '#87d068' }} icon={<UserOutlined />} />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Text>{user?.companyName}</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  当前角色：{getRoleDisplayName(user?.role)}
                </Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ margin: '24px', minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;

