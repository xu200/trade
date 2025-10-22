import { BrowserProvider } from "ethers";
import type { Eip1193Provider } from "ethers";
import { message } from "antd";
import { SIGN_MESSAGE_TEMPLATE } from "@/config/constants";

declare global {
  interface Window {
    ethereum?: Eip1193Provider & {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    };
  }
}

class WalletService {
  private provider: BrowserProvider | null = null;

  isMetaMaskInstalled(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof window.ethereum !== "undefined" &&
      window.ethereum.isMetaMask === true
    );
  }

  private async getProvider(): Promise<BrowserProvider> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error("请先安装MetaMask钱包插件");
    }
    if (!this.provider) {
      this.provider = new BrowserProvider(window.ethereum!);
    }
    return this.provider;
  }

  async connect(): Promise<string> {
    try {
      if (!this.isMetaMaskInstalled()) {
        message.error("请先安装MetaMask钱包插件");
        window.open("https://metamask.io/download/", "_blank");
        throw new Error("MetaMask未安装");
      }

      const accounts = await window.ethereum!.request({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("未能获取钱包地址");
      }

      message.success("钱包连接成功");
      return accounts[0];
    } catch (error: any) {
      console.error("连接钱包失败:", error);
      if (error.code === 4001) {
        message.error("用户拒绝了连接请求");
      } else {
        message.error(error.message || "连接钱包失败");
      }
      throw error;
    }
  }

  async signMessage(address: string, messageText: string): Promise<string> {
    try {
      const provider = await this.getProvider();
      const signer = await provider.getSigner(address);
      const signature = await signer.signMessage(messageText);
      return signature;
    } catch (error: any) {
      console.error("签名失败:", error);
      if (error.code === 4001 || error.code === "ACTION_REJECTED") {
        message.error("用户拒绝了签名请求");
      } else {
        message.error(error.message || "签名失败");
      }
      throw error;
    }
  }

  async generateLoginSignature(
    address: string,
    nonce: string
  ): Promise<{
    message: string;
    signature: string;
  }> {
    const messageText = SIGN_MESSAGE_TEMPLATE + nonce;
    const signature = await this.signMessage(address, messageText);

    return { message: messageText, signature };
  }
}

export default new WalletService();
