import { expect } from "chai";
import { ethers } from "hardhat";

describe("SupplyChainFinance", function () {
  let contract;
  let coreCompany, supplier, financier, other;

  beforeEach(async function () {
    [coreCompany, supplier, financier, other] = await ethers.getSigners();

    const SupplyChainFinance = await ethers.getContractFactory("SupplyChainFinance");
    contract = await SupplyChainFinance.deploy();
    await contract.waitForDeployment();

    // 注册用户
    await contract.connect(coreCompany).registerUser(1, "Core Company A");
    await contract.connect(supplier).registerUser(2, "Supplier B");
    await contract.connect(financier).registerUser(3, "Bank C");
  });

  describe("用户注册", function () {
    it("应该成功注册用户", async function () {
      const role = await contract.getUserRole(coreCompany.address);
      expect(role).to.equal(1); // CORE_COMPANY
    });

    it("不应该允许重复注册", async function () {
      await expect(
        contract.connect(coreCompany).registerUser(1, "Test")
      ).to.be.revertedWith("Already registered");
    });
  });

  describe("创建应收账款", function () {
    it("应该成功创建应收账款", async function () {
      const amount = ethers.parseEther("100");
      const dueTime = Math.floor(Date.now() / 1000) + 86400 * 30;

      await contract.connect(coreCompany).createReceivable(
        supplier.address,
        amount,
        dueTime,
        "Payment for goods",
        "CONTRACT-001"
      );

      const receivable = await contract.getReceivable(1);
      expect(receivable.amount).to.equal(amount);
      expect(receivable.owner).to.equal(supplier.address);
    });

    it("只有核心企业可以创建应收账款", async function () {
      const amount = ethers.parseEther("100");
      const dueTime = Math.floor(Date.now() / 1000) + 86400 * 30;

      await expect(
        contract.connect(supplier).createReceivable(
          supplier.address,
          amount,
          dueTime,
          "Test",
          "CONTRACT-001"
        )
      ).to.be.revertedWith("Only core company");
    });
  });

  describe("确认应收账款", function () {
    beforeEach(async function () {
      const amount = ethers.parseEther("100");
      const dueTime = Math.floor(Date.now() / 1000) + 86400 * 30;

      await contract.connect(coreCompany).createReceivable(
        supplier.address,
        amount,
        dueTime,
        "Payment for goods",
        "CONTRACT-001"
      );
    });

    it("应该成功确认应收账款", async function () {
      await contract.connect(supplier).confirmReceivable(1);

      const receivable = await contract.getReceivable(1);
      expect(receivable.confirmed).to.be.true;
    });

    it("只有持有人可以确认", async function () {
      await expect(
        contract.connect(other).confirmReceivable(1)
      ).to.be.revertedWith("Not the owner");
    });

    it("不应该重复确认", async function () {
      await contract.connect(supplier).confirmReceivable(1);
      
      await expect(
        contract.connect(supplier).confirmReceivable(1)
      ).to.be.revertedWith("Already confirmed");
    });
  });

  describe("转让应收账款", function () {
    beforeEach(async function () {
      const amount = ethers.parseEther("100");
      const dueTime = Math.floor(Date.now() / 1000) + 86400 * 30;

      await contract.connect(coreCompany).createReceivable(
        supplier.address,
        amount,
        dueTime,
        "Payment for goods",
        "CONTRACT-001"
      );

      await contract.connect(supplier).confirmReceivable(1);
    });

    it("应该成功转让应收账款", async function () {
      await contract.connect(supplier).transferReceivable(1, financier.address);

      const receivable = await contract.getReceivable(1);
      expect(receivable.owner).to.equal(financier.address);
    });

    it("只有持有人可以转让", async function () {
      await expect(
        contract.connect(other).transferReceivable(1, financier.address)
      ).to.be.revertedWith("Not the owner");
    });

    it("必须先确认才能转让", async function () {
      const amount = ethers.parseEther("100");
      const dueTime = Math.floor(Date.now() / 1000) + 86400 * 30;

      await contract.connect(coreCompany).createReceivable(
        supplier.address,
        amount,
        dueTime,
        "Test",
        "CONTRACT-002"
      );

      await expect(
        contract.connect(supplier).transferReceivable(2, financier.address)
      ).to.be.revertedWith("Not confirmed yet");
    });
  });

  describe("融资申请", function () {
    beforeEach(async function () {
      const amount = ethers.parseEther("100");
      const dueTime = Math.floor(Date.now() / 1000) + 86400 * 30;

      await contract.connect(coreCompany).createReceivable(
        supplier.address,
        amount,
        dueTime,
        "Payment for goods",
        "CONTRACT-001"
      );

      await contract.connect(supplier).confirmReceivable(1);
    });

    it("应该成功申请融资", async function () {
      const financeAmount = ethers.parseEther("80");
      
      await contract.connect(supplier).applyForFinance(
        1,
        financier.address,
        financeAmount,
        500
      );

      const app = await contract.getFinanceApplication(1);
      expect(app.receivableId).to.equal(1);
      expect(app.financeAmount).to.equal(financeAmount);
    });

    it("只有持有人可以申请融资", async function () {
      const financeAmount = ethers.parseEther("80");
      
      await expect(
        contract.connect(other).applyForFinance(
          1,
          financier.address,
          financeAmount,
          500
        )
      ).to.be.revertedWith("Not the owner");
    });

    it("必须先确认才能申请融资", async function () {
      const amount = ethers.parseEther("100");
      const dueTime = Math.floor(Date.now() / 1000) + 86400 * 30;

      await contract.connect(coreCompany).createReceivable(
        supplier.address,
        amount,
        dueTime,
        "Test",
        "CONTRACT-002"
      );

      const financeAmount = ethers.parseEther("80");
      
      await expect(
        contract.connect(supplier).applyForFinance(
          2,
          financier.address,
          financeAmount,
          500
        )
      ).to.be.revertedWith("Not confirmed yet");
    });
  });

  describe("融资审批", function () {
    beforeEach(async function () {
      const amount = ethers.parseEther("100");
      const dueTime = Math.floor(Date.now() / 1000) + 86400 * 30;

      await contract.connect(coreCompany).createReceivable(
        supplier.address,
        amount,
        dueTime,
        "Payment for goods",
        "CONTRACT-001"
      );

      await contract.connect(supplier).confirmReceivable(1);

      const financeAmount = ethers.parseEther("80");
      await contract.connect(supplier).applyForFinance(
        1,
        financier.address,
        financeAmount,
        500
      );
    });

    it("应该成功审批融资", async function () {
      await contract.connect(financier).approveFinanceApplication(1, true);

      const app = await contract.getFinanceApplication(1);
      expect(app.approved).to.be.true;
      expect(app.processed).to.be.true;

      const receivable = await contract.getReceivable(1);
      expect(receivable.financed).to.be.true;
    });

    it("只有指定的金融机构可以审批", async function () {
      await expect(
        contract.connect(other).approveFinanceApplication(1, true)
      ).to.be.revertedWith("Not the assigned financier");
    });

    it("不应该重复审批", async function () {
      await contract.connect(financier).approveFinanceApplication(1, true);
      
      await expect(
        contract.connect(financier).approveFinanceApplication(1, true)
      ).to.be.revertedWith("Already processed");
    });
  });

  describe("查询功能", function () {
    beforeEach(async function () {
      const amount = ethers.parseEther("100");
      const dueTime = Math.floor(Date.now() / 1000) + 86400 * 30;

      await contract.connect(coreCompany).createReceivable(
        supplier.address,
        amount,
        dueTime,
        "Payment 1",
        "CONTRACT-001"
      );

      await contract.connect(coreCompany).createReceivable(
        supplier.address,
        amount,
        dueTime,
        "Payment 2",
        "CONTRACT-002"
      );
    });

    it("应该正确查询用户拥有的应收账款", async function () {
      const ids = await contract.getReceivablesByOwner(supplier.address);
      expect(ids.length).to.equal(2);
      expect(ids[0]).to.equal(1);
      expect(ids[1]).to.equal(2);
    });

    it("应该正确查询用户发行的应收账款", async function () {
      const ids = await contract.getReceivablesByIssuer(coreCompany.address);
      expect(ids.length).to.equal(2);
    });
  });
});

