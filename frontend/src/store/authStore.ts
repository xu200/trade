import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { message } from 'antd';
import apiService from '@/services/api';
import walletService from '@/services/wallet';
import { saveToken, saveUser, clearAuth } from '@/utils/storage';
import type { UserInfo, RegisterFormValues } from '@/types';

interface AuthState {
  user: UserInfo | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  login: (address: string) => Promise<void>;
  register: (data: RegisterFormValues) => Promise<void>;
  logout: () => void;
  setUser: (user: UserInfo | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (address: string) => {
        set({ isLoading: true });
        try {
          // 简化登录流程：直接使用地址和签名
          const timestamp = Date.now().toString();
          const { message: messageText, signature } = await walletService.generateLoginSignature(address, timestamp);
          
          const response = await apiService.login({
            address,
            signature,
            message: messageText,
          });
          
          saveToken(response.token);
          saveUser(response.userInfo);
          
          set({
            token: response.token,
            user: response.userInfo,
            isAuthenticated: true,
            isLoading: false,
          });
          
          message.success('登录成功');
        } catch (error: any) {
          set({ isLoading: false });
          if (error.response?.status === 404) {
            message.warning('该地址未注册，请先注册');
          }
          throw error;
        }
      },

      register: async (data: RegisterFormValues) => {
        set({ isLoading: true });
        try {
          await apiService.register(data);
          set({ isLoading: false });
          message.success('注册成功，请登录');
        } catch (error: any) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        clearAuth();
        set({ user: null, token: null, isAuthenticated: false });
        message.success('已退出登录');
      },

      setUser: (user: UserInfo | null) => {
        set({ user });
        if (user) saveUser(user);
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

