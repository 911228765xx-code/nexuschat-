/**
 * IMPORTANT: This file MUST NOT import trpc or any non-Web3 packages that
 * would create a dependency from vendor-web3 → vendor (causing sync loading
 * of the 4.5MB Web3 bundle on every page load = white screen on mobile).
 * Use fetch directly instead of trpc to keep the dependency graph one-directional.
 */
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAccount, useDisconnect, useBalance } from "wagmi";
import { toast } from "sonner";

/** Call tRPC wallet.updateAddress via raw fetch to avoid importing trpc client */
async function updateWalletAddress(address: string, chain: string) {
  try {
    await fetch("/api/trpc/wallet.updateAddress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ json: { address, chain } }),
    });
  } catch (err) {
    console.error("Failed to update wallet:", err);
  }
}

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

  // When wallet connects, sync address to backend
  useEffect(() => {
    if (address && address !== prevAddress && isConnected) {
      setPrevAddress(address);
      updateWalletAddress(address, "BSC").then(() => {
        toast.success("钱包已绑定到账户");
      }).catch(console.error);
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
