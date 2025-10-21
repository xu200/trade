import { useState, useEffect } from 'react';
import { Typography, Card, Row, Col, Statistic, Space, Button, Spin } from 'antd';
import { FileTextOutlined, DollarOutlined, CheckCircleOutlined, ClockCircleOutlined, SwapOutlined, AuditOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { isRole, getRoleDisplayName } from '@/utils/roleHelper';
import dashboardService, { type DashboardStats } from '@/services/dashboard';

const { Title, Paragraph } = Typography;

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalReceivables: 0,
    pendingReceivables: 0,
    confirmedReceivables: 0,
    financeApplications: 0,
  });
  const [loading, setLoading] = useState(true);

  // 获取统计数据
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const data = await dashboardService.getStats();
        setStats(data);
      } catch (error) {
        console.error('获取统计数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // 根据角色显示不同的快捷操作
  const getQuickActions = () => {
    if (!user) return null;
    
    // 核心企业
    if (isRole(user.role, 'CoreCompany')) {
      return (
        <>
          <Button type="primary" icon={<FileTextOutlined />} onClick={() => navigate('/receivable/create')}>
            创建应收账款
          </Button>
        </>
      );
    }
    
    // 供应商
    if (isRole(user.role, 'Supplier')) {
      return (
        <>
          <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => navigate('/receivable/confirm')}>
            确认应收账款
          </Button>
          <Button icon={<SwapOutlined />} onClick={() => navigate('/receivable/transfer')}>
            转让应收账款
          </Button>
          <Button icon={<DollarOutlined />} onClick={() => navigate('/finance/apply')}>
            申请融资
          </Button>
        </>
      );
    }
    
    // 金融机构
    if (isRole(user.role, 'Financier')) {
      return (
        <>
          <Button type="primary" icon={<AuditOutlined />} onClick={() => navigate('/finance/approve')}>
            融资审批
          </Button>
        </>
      );
    }
    
    return null;
  };

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 欢迎信息 */}
        <Card>
          <Title level={3} style={{ margin: 0 }}>
            欢迎回来，{user?.companyName}！
          </Title>
          <Paragraph type="secondary" style={{ margin: '8px 0 0 0' }}>
            当前角色：{getRoleDisplayName(user?.role)}
          </Paragraph>
        </Card>

        {/* 统计卡片 */}
        <Spin spinning={loading}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="应收账款总数"
                  value={stats.totalReceivables}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                  suffix="笔"
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title={isRole(user?.role, 'Financier') ? '待审批申请' : '待确认账款'}
                  value={stats.pendingReceivables}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#faad14' }}
                  suffix="笔"
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title={isRole(user?.role, 'Financier') ? '已批准申请' : '已确认账款'}
                  value={stats.confirmedReceivables}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                  suffix="笔"
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="融资申请"
                  value={stats.financeApplications}
                  prefix={<DollarOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                  suffix="笔"
                />
              </Card>
            </Col>
          </Row>
        </Spin>

        {/* 快捷操作 - 根据角色显示 */}
        <Card title="快捷操作">
          <Space wrap>
            {getQuickActions()}
          </Space>
        </Card>

        {/* 业务流程说明 */}
        <Card title="业务流程">
          <Paragraph>
            <strong>完整业务流程：</strong>
          </Paragraph>
          <ol style={{ paddingLeft: '20px' }}>
            <li>✅ 注册用户（核心企业、供应商、金融机构）</li>
            <li>✅ 核心企业创建应收账款 → 指定供应商</li>
            <li>✅ 供应商确认应收账款（<strong>必须</strong>）</li>
            <li>✅ 供应商申请融资</li>
            <li>✅ 金融机构审批融资</li>
            <li>⚪ [可选] 供应商转让应收账款给其他供应商</li>
          </ol>
        </Card>

        {/* 系统信息 */}
        <Card title="系统状态">
          <Paragraph>
            ✅ 角色权限控制已完成<br />
            ✅ 三种角色菜单已区分<br />
            ✅ 前端字段映射已修复<br />
            ✅ MetaMask 签名登录已完成<br />
            ⏳ 后端代签名架构（无需前端 MetaMask 交易）
          </Paragraph>
        </Card>
      </Space>
    </div>
  );
}

export default Dashboard;
