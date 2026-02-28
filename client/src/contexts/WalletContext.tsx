import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAccount, useDisconnect, useBalance } from "wagmi";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface WalletContextType {
  address: string | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | undefined;
  balance: string | undefined;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType>({
  address: undefined,
  isConnected: false,
  isConnecting: false,
  chainId: undefined,
  balance: undefined,
  disconnect: () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const { address, isConnected, isConnecting, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balanceData } = useBalance({ address });
  const [prevAddress, setPrevAddress] = useState<string | undefined>(undefined);

  const updateWallet = trpc.wallet.updateAddress.useMutation({
    onSuccess: () => {
      toast.success("钱包已绑定到账户");
    },
    onError: (err) => {
      console.error("Failed to update wallet:", err);
    },
  });

  // When wallet connects, sync address to backend
  useEffect(() => {
    if (address && address !== prevAddress && isConnected) {
      setPrevAddress(address);
      updateWallet.mutate({ address, chain: "BSC" });
    }
    if (!isConnected && prevAddress) {
      setPrevAddress(undefined);
    }
  }, [address, isConnected]);

  const balance = balanceData
    ? `${parseFloat(balanceData.formatted).toFixed(4)} ${balanceData.symbol}`
    : undefined;

  return (
    <WalletContext.Provider
      value={{ address, isConnected, isConnecting, chainId, balance, disconnect }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
