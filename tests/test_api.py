#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
区块链供应链金融系统 - API 自动化测试脚本
"""

import requests
import json
import time
from datetime import datetime, timedelta

# 配置
BASE_URL = "http://localhost:5000/api"
HEADERS = {"Content-Type": "application/json"}

# 测试用户数据
CORE_COMPANY = {
    "address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "role": "core_company",
    "companyName": "核心企业A",
    "contactPerson": "张三",
    "contactEmail": "zhangsan@example.com"
}

SUPPLIER = {
    "address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "role": "supplier",
    "companyName": "供应商B",
    "contactPerson": "李四",
    "contactEmail": "lisi@example.com"
}

FINANCIER = {
    "address": "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    "role": "financier",
    "companyName": "金融机构C",
    "contactPerson": "王五",
    "contactEmail": "wangwu@example.com"
}

class Colors:
    """终端颜色"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_success(message):
    print(f"{Colors.GREEN}✓ {message}{Colors.END}")

def print_error(message):
    print(f"{Colors.RED}✗ {message}{Colors.END}")

def print_info(message):
    print(f"{Colors.BLUE}ℹ {message}{Colors.END}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠ {message}{Colors.END}")

def test_health_check():
    """测试健康检查"""
    print_info("测试: 健康检查")
    try:
        response = requests.get(f"{BASE_URL.replace('/api', '')}/health")
        if response.status_code == 200:
            print_success("健康检查通过")
            return True
        else:
            print_error(f"健康检查失败: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"健康检查异常: {str(e)}")
        return False

def test_register(user_data):
    """测试用户注册"""
    print_info(f"测试: 注册用户 - {user_data['companyName']}")
    try:
        response = requests.post(
            f"{BASE_URL}/auth/register",
            json=user_data,
            headers=HEADERS
        )
        
        if response.status_code in [200, 201]:
            print_success(f"用户注册成功: {user_data['companyName']}")
            return True
        elif response.status_code == 400:
            data = response.json()
            if "已注册" in data.get('message', ''):
                print_warning(f"用户已存在: {user_data['companyName']}")
                return True
            else:
                print_error(f"注册失败: {data.get('message')}")
                return False
        else:
            print_error(f"注册失败: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"注册异常: {str(e)}")
        return False

def test_login(address):
    """测试用户登录（模拟签名）"""
    print_info(f"测试: 用户登录 - {address}")
    try:
        # 模拟签名数据
        message = f"登录到供应链金融系统\n地址: {address}\n时间: {datetime.now().isoformat()}"
        signature = "0x" + "0" * 130  # 模拟签名
        
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={
                "address": address,
                "signature": signature,
                "message": message
            },
            headers=HEADERS
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                token = data['data']['token']
                print_success(f"登录成功，获得Token")
                return token
            else:
                print_error(f"登录失败: {data.get('message')}")
                return None
        else:
            print_error(f"登录失败: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print_error(f"登录异常: {str(e)}")
        return None

def test_create_receivable(token):
    """测试创建应收账款"""
    print_info("测试: 创建应收账款")
    try:
        due_time = (datetime.now() + timedelta(days=30)).isoformat()
        
        response = requests.post(
            f"{BASE_URL}/receivables",
            json={
                "supplier": SUPPLIER['address'],
                "amount": "100",
                "dueTime": due_time,
                "description": "测试应收账款",
                "contractNumber": f"TEST-{int(time.time())}"
            },
            headers={**HEADERS, "Authorization": f"Bearer {token}"}
        )
        
        if response.status_code in [200, 201]:
            data = response.json()
            if data.get('success'):
                receivable_id = data['data']['receivableId']
                print_success(f"应收账款创建成功，ID: {receivable_id}")
                return receivable_id
            else:
                print_error(f"创建失败: {data.get('message')}")
                return None
        else:
            print_error(f"创建失败: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print_error(f"创建异常: {str(e)}")
        return None

def test_get_receivables(token):
    """测试获取应收账款列表"""
    print_info("测试: 获取应收账款列表")
    try:
        response = requests.get(
            f"{BASE_URL}/receivables",
            headers={**HEADERS, "Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                total = data['data']['total']
                print_success(f"获取列表成功，共 {total} 条记录")
                return True
            else:
                print_error(f"获取失败: {data.get('message')}")
                return False
        else:
            print_error(f"获取失败: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"获取异常: {str(e)}")
        return False

def test_confirm_receivable(token, receivable_id):
    """测试确认应收账款"""
    print_info(f"测试: 确认应收账款 - ID: {receivable_id}")
    try:
        response = requests.post(
            f"{BASE_URL}/receivables/{receivable_id}/confirm",
            headers={**HEADERS, "Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print_success("应收账款确认成功")
                return True
            else:
                print_error(f"确认失败: {data.get('message')}")
                return False
        else:
            print_error(f"确认失败: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"确认异常: {str(e)}")
        return False

def test_apply_finance(token, receivable_id):
    """测试申请融资"""
    print_info(f"测试: 申请融资 - 应收账款ID: {receivable_id}")
    try:
        response = requests.post(
            f"{BASE_URL}/finance/apply",
            json={
                "receivableId": receivable_id,
                "financier": FINANCIER['address'],
                "financeAmount": "80",
                "interestRate": 500
            },
            headers={**HEADERS, "Authorization": f"Bearer {token}"}
        )
        
        if response.status_code in [200, 201]:
            data = response.json()
            if data.get('success'):
                app_id = data['data']['applicationId']
                print_success(f"融资申请成功，申请ID: {app_id}")
                return app_id
            else:
                print_error(f"申请失败: {data.get('message')}")
                return None
        else:
            print_error(f"申请失败: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print_error(f"申请异常: {str(e)}")
        return None

def test_get_finance_applications(token):
    """测试获取融资申请列表"""
    print_info("测试: 获取融资申请列表")
    try:
        response = requests.get(
            f"{BASE_URL}/finance/applications",
            headers={**HEADERS, "Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                total = data['data']['total']
                print_success(f"获取列表成功，共 {total} 条申请")
                return True
            else:
                print_error(f"获取失败: {data.get('message')}")
                return False
        else:
            print_error(f"获取失败: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"获取异常: {str(e)}")
        return False

def run_all_tests():
    """运行所有测试"""
    print("\n" + "="*60)
    print("区块链供应链金融系统 - API 自动化测试")
    print("="*60 + "\n")
    
    results = {
        "total": 0,
        "passed": 0,
        "failed": 0
    }
    
    # 1. 健康检查
    results["total"] += 1
    if test_health_check():
        results["passed"] += 1
    else:
        results["failed"] += 1
        print_warning("后端服务未启动，跳过后续测试")
        print_summary(results)
        return
    
    print()
    
    # 2. 用户注册测试
    print_info("=== 用户注册测试 ===")
    for user in [CORE_COMPANY, SUPPLIER, FINANCIER]:
        results["total"] += 1
        if test_register(user):
            results["passed"] += 1
        else:
            results["failed"] += 1
    
    print()
    
    # 3. 用户登录测试
    print_info("=== 用户登录测试 ===")
    print_warning("注意: 登录测试需要真实的签名，当前使用模拟数据会失败")
    
    # 由于需要真实签名，这里只做演示
    results["total"] += 1
    core_token = test_login(CORE_COMPANY['address'])
    if core_token:
        results["passed"] += 1
    else:
        results["failed"] += 1
        print_warning("无法获取Token，跳过需要认证的测试")
        print_summary(results)
        return
    
    print()
    
    # 4. 应收账款测试
    print_info("=== 应收账款测试 ===")
    
    # 创建应收账款
    results["total"] += 1
    receivable_id = test_create_receivable(core_token)
    if receivable_id:
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    # 获取列表
    results["total"] += 1
    if test_get_receivables(core_token):
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    print()
    
    # 5. 测试总结
    print_summary(results)

def print_summary(results):
    """打印测试总结"""
    print("\n" + "="*60)
    print("测试总结")
    print("="*60)
    print(f"总测试数: {results['total']}")
    print(f"{Colors.GREEN}通过: {results['passed']}{Colors.END}")
    print(f"{Colors.RED}失败: {results['failed']}{Colors.END}")
    
    if results['failed'] == 0:
        print(f"\n{Colors.GREEN}✓ 所有测试通过！{Colors.END}")
    else:
        print(f"\n{Colors.YELLOW}⚠ 部分测试失败{Colors.END}")
    
    print("="*60 + "\n")

if __name__ == "__main__":
    try:
        run_all_tests()
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}测试被用户中断{Colors.END}")
    except Exception as e:
        print_error(f"测试执行异常: {str(e)}")

