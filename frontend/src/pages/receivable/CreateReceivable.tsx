import { useState } from 'react';
import { Card, Form, Input, DatePicker, Button, Space, Typography, message, App } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import receivableService from '@/services/receivable';
import contractService from '@/services/contract';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

function CreateReceivable() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { modal } = App.useApp();

  const handleSubmit = async (values: any) => {
    console.log('🚀 表单提交，接收到的值:', values);
    
    // 验证金额
    const amountNum = parseFloat(values.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      message.error('请输入有效的金额');
      return;
    }

    // 验证地址
    if (!ethers.isAddress(values.supplier)) {
      message.error('无效的供应商地址');
      return;
    }

    // 转换金额为Wei（字符串）
    const amountInWei = ethers.parseEther(values.amount.toString()).toString();
    
    // 转换日期为Unix时间戳（秒）
    const dueTimestamp = Math.floor(values.dueTime.valueOf() / 1000);

    const ethAmount = values.amount;

    console.log('💡 准备显示确认弹窗...', {
      amountInWei,
      dueTimestamp,
      ethAmount,
      supplier: values.supplier
    });

    modal.confirm({
      title: '⛓️ 创建应收账款 (MetaMask签名+锁定ETH)',
      content: (
        <div>
          <p>确定要创建这笔应收账款吗？</p>
          <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
            锁定金额: {ethAmount} ETH
          </p>
          <p style={{ color: '#666', fontSize: '12px' }}>
            ⚠️ 创建后将通过MetaMask锁定 <strong>{ethAmount} ETH</strong> 到智能合约
          </p>
          <p style={{ color: '#666', fontSize: '12px' }}>
            💡 这些ETH将在到期时支付给应收账款持有人
          </p>
          <p style={{ marginTop: '8px' }}>
            供应商: {values.supplier.slice(0, 8)}...{values.supplier.slice(-6)}
          </p>
          <p>合同编号: {values.contractNumber}</p>
        </div>
      ),
      okText: '确认创建并锁定ETH',
      cancelText: '取消',
      width: 500,
      onOk: async () => {
        console.log('✅ 用户点击了确认按钮');
        setLoading(true);
        try {
          // 0. 检查用户是否已在链上注册
          const currentAddress = await contractService.getCurrentAccount();
          const role = await contractService.checkUserRole(currentAddress);
          
          console.log('🔍 检查用户角色:', { address: currentAddress, role });
          
          if (role === 0) {
            // 用户未注册，先注册为核心企业（role = 1）
            message.info('首次使用，正在链上注册账户...');
            console.log('📝 首次使用，需要先在链上注册为核心企业');
            
            try {
              await contractService.registerUser(1, 'Core Company');
              message.success('链上注册成功！');
              console.log('✅ 链上注册成功');
            } catch (regError: any) {
              console.error('❌ 链上注册失败:', regError);
              message.error('链上注册失败: ' + regError.message);
              setLoading(false);
              return;
            }
          }
          
          console.log('⛓️ 开始MetaMask创建+锁定ETH流程...');
          console.log('📤 调用参数:', {
            supplier: values.supplier,
            amount: amountInWei,
            dueTimestamp,
            description: values.description || '',
            contractNumber: values.contractNumber
          });
          
          // 1. 调用MetaMask签名并锁定ETH
          const { txHash } = await contractService.createReceivable(
            values.supplier,
            amountInWei,  // Wei字符串
            dueTimestamp,
            values.description || '',
            values.contractNumber
          );
          
          console.log('✅ 交易已上链:', txHash);
          message.success(`已锁定 ${ethAmount} ETH，正在同步到后端...`);
          
          // 2. 通知后端同步（传递txHash，后端从链上查询数据）
          const dueTimeISO = values.dueTime.toISOString();
          await receivableService.createReceivable({
            supplier: values.supplier,
            amount: amountInWei,
            dueTime: dueTimeISO,
            description: values.description || '',
            contractNumber: values.contractNumber,
            txHash: txHash,  // ✅ 传递交易哈希
          });
          
          message.success('应收账款创建成功！');
          form.resetFields();
          setTimeout(() => navigate('/receivable/list'), 1500);
        } catch (error: any) {
          console.error('❌ 创建失败:', error);
          message.error(error.message || '创建失败');
        } finally {
          setLoading(false);
        }
      },
    });
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
            onFinishFailed={(errorInfo) => {
              console.error('❌ 表单验证失败:', errorInfo);
              message.error('请检查表单填写是否完整正确');
            }}
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
              label="金额 (ETH)"
              name="amount"
              rules={[
                { required: true, message: '请输入金额' },
                { pattern: /^\d+(\.\d+)?$/, message: '请输入有效的数字' },
              ]}
              extra="支持最多18位小数"
            >
              <Input suffix="ETH" placeholder="请输入金额" />
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

