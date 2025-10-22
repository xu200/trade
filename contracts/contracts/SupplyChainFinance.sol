// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SupplyChainFinance {
    // 用户角色枚举
    enum UserRole {
        NONE,
        CORE_COMPANY,
        SUPPLIER,
        FINANCIER
    }

    // 应收账款结构体
    struct Receivable {
        uint256 id;
        address issuer;
        address owner;
        address supplier;
        uint256 amount;
        uint256 createTime;
        uint256 dueTime;
        bool confirmed;
        bool financed;
        bool settled;
        string description;
        string contractNumber;
    }

    // 融资申请结构体
    struct FinanceApplication {
        uint256 receivableId;
        address applicant;
        address financier;
        uint256 applyTime;
        uint256 financeAmount;
        uint256 interestRate;
        bool approved;
        bool processed;
    }

    // 状态变量
    mapping(address => UserRole) public userRoles;
    mapping(address => string) public userNames;
    // 应收账款计数器
    uint256 public receivableCounter;
    // 应收账款映射
    mapping(uint256 => Receivable) public receivables;
    // 融资申请计数器
    uint256 public financeApplicationCounter;
    // 融资申请映射
    mapping(uint256 => FinanceApplication) public financeApplications;
    // 应收账款到融资申请的映射
    mapping(uint256 => uint256[]) public receivableToApplications;

    // 事件
    event UserRegistered(address indexed user, UserRole role, string name);
    event ReceivableCreated(uint256 indexed id, address indexed issuer, address indexed supplier, uint256 amount);
    event ReceivableConfirmed(uint256 indexed id, address indexed confirmer);
    event ReceivableTransferred(uint256 indexed id, address indexed from, address indexed to);
    event FinanceApplicationSubmitted(uint256 indexed appId, uint256 indexed receivableId, address indexed applicant, address financier);
    event FinanceApproved(uint256 indexed appId, uint256 indexed receivableId);
    event FinanceRejected(uint256 indexed appId, uint256 indexed receivableId);
    event ReceivableSettled(uint256 indexed id, address indexed finalOwner);

    // 修饰符
    modifier onlyCoreCompany() {
        require(userRoles[msg.sender] == UserRole.CORE_COMPANY, "Only core company");
        _;
    }

    modifier onlySupplier() {
        require(userRoles[msg.sender] == UserRole.SUPPLIER, "Only supplier");
        _;
    }

    modifier onlyFinancier() {
        require(userRoles[msg.sender] == UserRole.FINANCIER, "Only financier");
        _;
    }

    // 注册用户
    function registerUser(UserRole _role, string memory _name) external {
        require(userRoles[msg.sender] == UserRole.NONE, "Already registered");
        require(_role != UserRole.NONE, "Invalid role");
        
        userRoles[msg.sender] = _role;
        userNames[msg.sender] = _name;
        
        emit UserRegistered(msg.sender, _role, _name);
    }

    // 获取用户角色
    function getUserRole(address _user) external view returns (UserRole) {
        return userRoles[_user];
    }

    // 创建应收账款 (核心企业锁定ETH)
    function createReceivable(
        address _supplier,
        uint256 _amount,
        uint256 _dueTime,
        string memory _description,
        string memory _contractNumber
    ) external payable onlyCoreCompany returns (uint256) {
        require(_supplier != address(0), "Invalid supplier address");
        require(_amount > 0, "Amount must be positive");
        require(msg.value == _amount, "Must lock exact amount");  // ⭐ 核心企业必须锁定ETH
        require(_dueTime > block.timestamp, "Due time must be in future");
        
        receivableCounter++;
        uint256 newId = receivableCounter;
        
        receivables[newId] = Receivable({
            id: newId,
            issuer: msg.sender,
            owner: _supplier,
            supplier: _supplier,
            amount: msg.value,  // 使用实际转入的ETH
            createTime: block.timestamp,
            dueTime: _dueTime,
            confirmed: false,
            financed: false,
            settled: false,
            description: _description,
            contractNumber: _contractNumber
        });
        
        emit ReceivableCreated(newId, msg.sender, _supplier, msg.value);
        
        return newId;
    }

    // 确认应收账款
    function confirmReceivable(uint256 _id) external {
        Receivable storage rec = receivables[_id];
        
        require(rec.id != 0, "Receivable does not exist");
        require(rec.owner == msg.sender, "Not the owner");
        require(!rec.confirmed, "Already confirmed");
        
        rec.confirmed = true;
        
        emit ReceivableConfirmed(_id, msg.sender);
    }

    // 转让应收账款
    function transferReceivable(uint256 _id, address _newOwner) external {
        Receivable storage rec = receivables[_id];
        
        require(rec.id != 0, "Receivable does not exist");
        require(rec.owner == msg.sender, "Not the owner");
        require(rec.confirmed, "Not confirmed yet");
        require(!rec.settled, "Already settled");
        require(_newOwner != address(0), "Invalid new owner");
        
        address oldOwner = rec.owner;
        rec.owner = _newOwner;
        
        emit ReceivableTransferred(_id, oldOwner, _newOwner);
    }

    // 申请融资
    function applyForFinance(
        uint256 _receivableId,
        address _financier,
        uint256 _financeAmount,
        uint256 _interestRate
    ) external returns (uint256) {
        Receivable storage rec = receivables[_receivableId];
        
        require(rec.id != 0, "Receivable does not exist");
        require(rec.owner == msg.sender, "Not the owner");
        require(rec.confirmed, "Not confirmed yet");
        require(!rec.financed, "Already financed");
        require(userRoles[_financier] == UserRole.FINANCIER, "Invalid financier");
        require(_financeAmount <= rec.amount, "Amount exceeds receivable");
        
        financeApplicationCounter++;
        uint256 appId = financeApplicationCounter;
        
        financeApplications[appId] = FinanceApplication({
            receivableId: _receivableId,
            applicant: msg.sender,
            financier: _financier,
            applyTime: block.timestamp,
            financeAmount: _financeAmount,
            interestRate: _interestRate,
            approved: false,
            processed: false
        });
        
        receivableToApplications[_receivableId].push(appId);
        
        emit FinanceApplicationSubmitted(appId, _receivableId, msg.sender, _financier);
        
        return appId;
    }

    // 审批融资申请 (金融机构批准时转账ETH给供应商)
    function approveFinanceApplication(uint256 _appId, bool _approve) external payable {
        FinanceApplication storage app = financeApplications[_appId];
        
        require(app.financier == msg.sender, "Not the assigned financier");
        require(!app.processed, "Already processed");
        
        if (_approve) {
            require(msg.value == app.financeAmount, "Incorrect ETH amount");  // ⭐ 必须转账融资金额
            
            Receivable storage rec = receivables[app.receivableId];
            
            // 转账ETH给供应商(申请人)
            payable(app.applicant).transfer(msg.value);
            
            // 更新状态
            app.approved = true;
            app.processed = true;
            rec.financed = true;
            rec.owner = msg.sender;  // ⭐ 金融机构成为新持有人
            
            emit FinanceApproved(_appId, app.receivableId);
        } else {
            app.approved = false;
            app.processed = true;
            
            emit FinanceRejected(_appId, app.receivableId);
        }
    }

    // 结算应收账款 (核心企业支付本金+利息给金融机构/供应商)
    function settleReceivable(uint256 _id) external payable onlyCoreCompany {
        Receivable storage rec = receivables[_id];
        
        require(rec.id != 0, "Receivable does not exist");
        require(rec.issuer == msg.sender, "Not the issuer");
        require(rec.confirmed, "Not confirmed yet");
        require(!rec.settled, "Already settled");
        require(block.timestamp >= rec.dueTime, "Not due yet");
        
        uint256 paymentAmount = rec.amount;  // 默认支付原始金额
        
        // 如果已融资，计算利息
        if (rec.financed) {
            // 查找对应的融资申请
            uint256[] memory appIds = receivableToApplications[_id];
            for (uint256 i = 0; i < appIds.length; i++) {
                FinanceApplication storage app = financeApplications[appIds[i]];
                if (app.approved && app.processed) {
                    // 计算利息
                    uint256 timeElapsed = block.timestamp - app.applyTime;
                    uint256 daysElapsed = timeElapsed / 1 days;
                    
                    // 利息 = 融资金额 * 年化利率 * 天数 / 365 / 10000
                    // interestRate 是基点 (1% = 100, 10% = 1000)
                    uint256 interest = (app.financeAmount * app.interestRate * daysElapsed) / (365 * 10000);
                    paymentAmount = rec.amount + interest;  // ⭐ 本金 + 利息
                    break;
                }
            }
            
            require(msg.value == paymentAmount, "Incorrect payment amount");
        } else {
            require(msg.value == rec.amount, "Incorrect payment amount");
        }
        
        // 转账给当前持有人 (金融机构或供应商)
        payable(rec.owner).transfer(msg.value);
        
        rec.settled = true;
        
        emit ReceivableSettled(_id, rec.owner);
    }

    // 获取应收账款详情
    function getReceivable(uint256 _id) external view returns (Receivable memory) {
        return receivables[_id];
    }

    // 获取用户拥有的应收账款列表
    function getReceivablesByOwner(address _owner) external view returns (uint256[] memory) {
        uint256[] memory result = new uint256[](receivableCounter);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= receivableCounter; i++) {
            if (receivables[i].owner == _owner) {
                result[count] = i;
                count++;
            }
        }
        
        uint256[] memory finalResult = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            finalResult[i] = result[i];
        }
        
        return finalResult;
    }

    // 获取用户发行的应收账款列表
    function getReceivablesByIssuer(address _issuer) external view returns (uint256[] memory) {
        uint256[] memory result = new uint256[](receivableCounter);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= receivableCounter; i++) {
            if (receivables[i].issuer == _issuer) {
                result[count] = i;
                count++;
            }
        }
        
        uint256[] memory finalResult = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            finalResult[i] = result[i];
        }
        
        return finalResult;
    }

    // 获取融资申请详情
    function getFinanceApplication(uint256 _appId) external view returns (FinanceApplication memory) {
        return financeApplications[_appId];
    }

    // 获取应收账款的所有融资申请
    function getApplicationsByReceivable(uint256 _receivableId) external view returns (uint256[] memory) {
        return receivableToApplications[_receivableId];
    }
}

