/**
 * useWallet — BSC 钱包连接 Hook
 * 使用 MetaMask 原生 window.ethereum API 连接 BSC 主网
 * 无需 wagmi/RainbowKit，轻量实现
 */
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const BSC_CHAIN_ID = "0x38"; // 56 in hex
const BSC_CHAIN_CONFIG = {
  chainId: BSC_CHAIN_ID,
  chainName: "BNB Smart Chain",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: ["https://bsc-dataseed.binance.org/"],
  blockExplorerUrls: ["https://bscscan.com/"],
};

export interface WalletState {
  address: string | null;
  chainId: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  balance: string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    isConnected: false,
    isConnecting: false,
    balance: null,
  });

  const updateWalletMutation = trpc.wallet.updateAddress.useMutation();

  // Check if already connected on mount
  useEffect(() => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;

    ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
      if (accounts.length > 0) {
        ethereum.request({ method: "eth_chainId" }).then((chainId: string) => {
          setState(prev => ({
            ...prev,
            address: accounts[0],
            chainId,
            isConnected: true,
          }));
          fetchBalance(accounts[0]);
        });
      }
    });

    // Listen for account changes
    ethereum.on("accountsChanged", (accounts: string[]) => {
      if (accounts.length === 0) {
        setState({ address: null, chainId: null, isConnected: false, isConnecting: false, balance: null });
      } else {
        setState(prev => ({ ...prev, address: accounts[0] }));
        fetchBalance(accounts[0]);
      }
    });

    ethereum.on("chainChanged", (chainId: string) => {
      setState(prev => ({ ...prev, chainId }));
    });
  }, []);

  const fetchBalance = async (address: string) => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;
    try {
      const balance = await ethereum.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      });
      // Convert from wei to BNB
      const bnbBalance = (parseInt(balance, 16) / 1e18).toFixed(4);
      setState(prev => ({ ...prev, balance: bnbBalance }));
    } catch (err) {
      console.error("Failed to fetch balance:", err);
    }
  };

  const switchToBSC = async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BSC_CHAIN_ID }],
      });
    } catch (switchError: any) {
      // Chain not added yet, add it
      if (switchError.code === 4902) {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [BSC_CHAIN_CONFIG],
        });
      } else {
        throw switchError;
      }
    }
  };

  const connect = useCallback(async (walletName: string = "MetaMask") => {
    const ethereum = (window as any).ethereum;

    if (!ethereum) {
      toast.error("请先安装 MetaMask 钱包扩展", {
        description: "访问 metamask.io 下载安装",
        action: {
          label: "下载",
          onClick: () => window.open("https://metamask.io/download/", "_blank"),
        },
      });
      return false;
    }

    setState(prev => ({ ...prev, isConnecting: true }));

    try {
      // Request account access
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const address = accounts[0];

      // Switch to BSC
      await switchToBSC();

      const chainId = await ethereum.request({ method: "eth_chainId" });

      setState({
        address,
        chainId,
        isConnected: true,
        isConnecting: false,
        balance: null,
      });

      // Fetch balance
      fetchBalance(address);

      // Save to backend
      try {
        await updateWalletMutation.mutateAsync({ address, chain: "BSC" });
      } catch (err) {
        // Non-critical: user might not be logged in
        console.warn("Failed to save wallet to backend:", err);
      }

      toast.success(`${walletName} 连接成功`, {
        description: `${address.slice(0, 6)}...${address.slice(-4)} | BSC 主网`,
      });

      return true;
    } catch (err: any) {
      setState(prev => ({ ...prev, isConnecting: false }));
      if (err.code === 4001) {
        toast.error("用户拒绝了连接请求");
      } else {
        toast.error("连接失败", { description: err.message });
      }
      return false;
    }
  }, [updateWalletMutation]);

  const disconnect = useCallback(() => {
    setState({ address: null, chainId: null, isConnected: false, isConnecting: false, balance: null });
    toast.info("钱包已断开连接");
  }, []);

  const copyAddress = useCallback(() => {
    if (state.address) {
      navigator.clipboard.writeText(state.address);
      toast.success("地址已复制到剪贴板");
    }
  }, [state.address]);

  const isOnBSC = state.chainId === BSC_CHAIN_ID;

  return {
    ...state,
    isOnBSC,
    connect,
    disconnect,
    copyAddress,
    switchToBSC,
  };
}
