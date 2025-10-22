import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Tag, Input, Select } from 'antd';
import { EyeOutlined, CheckCircleOutlined, SwapOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import receivableService, { type Receivable } from '@/services/receivable';
import { useAuthStore } from '@/store/authStore';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

function ReceivableList() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<number | string>('');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchReceivables();
  }, [page, pageSize, statusFilter]);

  const fetchReceivables = async () => {
    setLoading(true);
    try {
      const result = await receivableService.getReceivables({
        page,
        limit: pageSize,
        status: (typeof statusFilter === 'number' ? statusFilter : undefined) as 0 | 1 | 2 | 3 | undefined,
      });
      setReceivables(result.items);
      setTotal(result.total);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchReceivables();
  };

  const getStatusTag = (record: Receivable) => {
    const statusMap: Record<number, { color: string; text: string }> = {
      0: { color: 'warning', text: '待确认' },
      1: { color: 'processing', text: '已确认' },
      2: { color: 'blue', text: '已转让' },
      3: { color: 'success', text: '已融资' },
    };
    const config = statusMap[record.status] || { color: 'default', text: '未知' };
    return <Tag color={config.color}>{config.text}</Tag>;
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
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: string) => `¥${parseFloat(amount).toLocaleString()}`,
    },
    {
      title: '发行方',
      dataIndex: 'issuer',
      key: 'issuer',
      render: (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`,
    },
    {
      title: '持有人',
      dataIndex: 'currentOwner',
      key: 'currentOwner',
      render: (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`,
    },
    {
      title: '到期日期',
      dataIndex: 'dueTime',
      key: 'dueTime',
    },
    {
      title: '状态',
      key: 'status',
      render: (_: any, record: Receivable) => getStatusTag(record),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: Receivable) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/receivable/${record.receivableId}`)}
          >
            详情
          </Button>
          {/* 只有供应商且是持有人才能确认和转让 */}
          {record.status === 0 && 
           user && 
           user.role && 
           user.role.toLowerCase().replace(/_/g, '') === 'supplier' &&
           user.walletAddress &&
           record.currentOwner &&
           record.currentOwner.toLowerCase() === user.walletAddress.toLowerCase() && (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => navigate('/receivable/confirm')}
            >
              确认
            </Button>
          )}
          {record.status === 1 && 
           user && 
           user.role && 
           user.role.toLowerCase().replace(/_/g, '') === 'supplier' &&
           user.walletAddress &&
           record.currentOwner &&
           record.currentOwner.toLowerCase() === user.walletAddress.toLowerCase() && (
            <Button
              type="link"
              size="small"
              icon={<SwapOutlined />}
              onClick={() => navigate('/receivable/transfer')}
            >
              转让
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              我的应收账款
            </Title>
            <Text type="secondary">查看和管理您的应收账款</Text>
          </div>
        </div>

        <Card>
          <Space style={{ marginBottom: 16 }} wrap>
            <Search
              placeholder="搜索合同编号或描述"
              allowClear
              style={{ width: 300 }}
              onSearch={handleSearch}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Select
              placeholder="筛选状态"
              style={{ width: 150 }}
              allowClear
              onChange={(value) => {
                setStatusFilter(value || '');
                setPage(1);
              }}
            >
              <Option value="">全部</Option>
              <Option value={0}>待确认</Option>
              <Option value={1}>已确认</Option>
              <Option value={2}>已转让</Option>
              <Option value={3}>已融资</Option>
            </Select>
            <Button onClick={fetchReceivables}>刷新</Button>
          </Space>

          <Table
            columns={columns}
            dataSource={receivables}
            loading={loading}
            rowKey="receivable_id"
            pagination={{
              current: page,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
              onChange: (page, pageSize) => {
                setPage(page);
                setPageSize(pageSize);
              },
            }}
          />
        </Card>
      </Space>
    </div>
  );
}

export default ReceivableList;

