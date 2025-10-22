import { Card, Descriptions, Typography, Space, Tag, Row, Col, Statistic } from 'antd';
import { UserOutlined, WalletOutlined, TeamOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import { getRoleDisplayName } from '@/utils/roleHelper';

const { Title } = Typography;

function Profile() {
  const { user } = useAuthStore();

  if (!user) {
    return (
      <Card>
        <p>未登录</p>
      </Card>
    );
  }

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            个人信息
          </Title>
        </div>

        {/* 基本信息卡片 */}
        <Card title="基本信息" extra={<Tag color="blue">{getRoleDisplayName(user.role)}</Tag>}>
          <Descriptions column={1} bordered>
            <Descriptions.Item label={<><UserOutlined /> 公司名称</>}>
              {user.companyName}
            </Descriptions.Item>
            <Descriptions.Item label={<><WalletOutlined /> 钱包地址</>}>
              {user.walletAddress}
            </Descriptions.Item>
            <Descriptions.Item label={<><TeamOutlined /> 联系人</>}>
              {user.contactPerson || '未设置'}
            </Descriptions.Item>
            <Descriptions.Item label="联系邮箱">
              {user.contactEmail || '未设置'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 账户统计（未来可以从后端获取） */}
        <Card title="账户统计">
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="累计应收账款"
                value={0}
                suffix="笔"
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="融资申请"
                value={0}
                suffix="笔"
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="账户余额"
                value={0}
                prefix="¥"
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
          </Row>
        </Card>
      </Space>
    </div>
  );
}

export default Profile;

