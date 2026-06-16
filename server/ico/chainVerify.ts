/**
 * 认购付款·链上自动核验(无需 admin、无需第三方服务,直接打 BSC JSON-RPC)。
 * 给一个 txHash,核实它确实是「一笔 USDT(BEP20)转到我们收款地址」的成功交易,并返回到账金额。
 * 金额一律以链上为准 → 用户无法虚报;一个 txHash 全局唯一(DB) → 无法复用。
 */
import { USDT_DEPOSIT_ADDRESS } from "../token";

const RPC_URL = process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org";
// BSC 上的 USDT(Binance-Peg BSC-USD),18 位小数。如收款币种不同,设环境变量覆盖。
const USDT_CONTRACT = (process.env.ICO_USDT_CONTRACT || "0x55d398326f99059fF775485246999027B3197955").toLowerCase();
const USDT_DECIMALS = Number(process.env.ICO_USDT_DECIMALS || 18);
const MIN_CONFIRMATIONS = Number(process.env.ICO_MIN_CONFIRMATIONS || 6);
// keccak256("Transfer(address,address,uint256)")
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

async function rpc<T = any>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const j = await res.json();
  if (j.error) throw new Error(`RPC ${method}: ${j.error?.message ?? "error"}`);
  return j.result as T;
}

function topicToAddress(topic: string): string {
  return ("0x" + topic.slice(-40)).toLowerCase();
}

export interface VerifyResult {
  ok: boolean;       // 核验通过(是给我们的合法 USDT 转账且已足够确认)
  pending?: boolean; // 交易还没上链/确认数不够,稍后重试
  amount?: number;   // 到账 USDT
  from?: string;     // 付款地址(留作风控/对账)
  reason?: string;   // 失败原因
}

/** 核验一笔 USDT 付款。to 缺省=系统收款地址。 */
export async function verifyUsdtPayment(txHash: string, expectTo: string = USDT_DEPOSIT_ADDRESS): Promise<VerifyResult> {
  if (!expectTo) return { ok: false, reason: "未配置收款地址" };
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) return { ok: false, reason: "交易哈希格式不对" };
  let receipt: any, head: string;
  try {
    [receipt, head] = await Promise.all([
      rpc("eth_getTransactionReceipt", [txHash]),
      rpc<string>("eth_blockNumber", []),
    ]);
  } catch (e) {
    return { ok: false, pending: true, reason: "链上查询暂不可用,稍后重试" }; // RPC 抖动当待定,不误判失败
  }
  if (!receipt) return { ok: false, pending: true, reason: "交易尚未上链,请稍候" };
  if (receipt.status !== "0x1") return { ok: false, reason: "该交易失败(链上 status≠1)" };
  const conf = Number(BigInt(head) - BigInt(receipt.blockNumber));
  if (conf < MIN_CONFIRMATIONS) return { ok: false, pending: true, reason: `确认中(${conf}/${MIN_CONFIRMATIONS})` };
  const toLc = expectTo.toLowerCase();
  for (const log of receipt.logs ?? []) {
    if (String(log.address).toLowerCase() !== USDT_CONTRACT) continue;
    if (!log.topics || log.topics[0] !== TRANSFER_TOPIC || log.topics.length < 3) continue;
    if (topicToAddress(log.topics[2]) !== toLc) continue; // to = 我们收款地址
    const raw = BigInt(log.data); // uint256 金额
    const div = BigInt("1" + "0".repeat(Math.max(0, USDT_DECIMALS - 6))); // 10^(decimals-6),不用 BigInt 字面量/幂(兼容低 target)
    const amount = Number(raw / div) / 1e6; // 保 6 位小数精度
    if (amount <= 0) continue;
    return { ok: true, amount, from: topicToAddress(log.topics[1]) };
  }
  return { ok: false, reason: "该交易里没有转给收款地址的 USDT" };
}
