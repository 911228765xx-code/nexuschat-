import re

with open('client/src/pages/Research.tsx', 'r') as f:
    content = f.read()

# AI Signal data for each token
ai_signals = {
    "BTC": '''\
    aiSignal: {
      overallScore: 82,
      signal: "strongBuy",
      confidence: 88,
      updatedAgo: "30s ago",
      technicalIndicators: [
        { name: "RSI (14)", value: "62.4", signal: "buy", score: 72 },
        { name: "MACD", value: "+1,245", signal: "buy", score: 78 },
        { name: "Bollinger", value: "Upper Band", signal: "neutral", score: 55 },
        { name: "MA Cross", value: "Golden Cross", signal: "buy", score: 85 },
        { name: "Volume", value: "Above Avg", signal: "buy", score: 80 },
        { name: "Stochastic", value: "68.2", signal: "buy", score: 70 },
        { name: "ADX", value: "32.5", signal: "buy", score: 75 },
        { name: "OBV", value: "Rising", signal: "buy", score: 82 },
      ],
      timeframes: [
        { period: "1H", signal: "buy", score: 72 },
        { period: "4H", signal: "strongBuy", score: 85 },
        { period: "1D", signal: "strongBuy", score: 88 },
        { period: "1W", signal: "buy", score: 76 },
      ],
      strategy: {
        action: "Long",
        entry: "$96,800 - $97,200",
        stopLoss: "$94,500 (-2.8%)",
        takeProfit1: "$99,500 (+2.4%)",
        takeProfit2: "$103,000 (+6.0%)",
        riskReward: "1:2.1",
        positionSize: "2-3% of portfolio",
        leverage: "3x-5x",
        timeHorizon: "3-7 days",
        reasoning: "research.btcStrategyReason",
      },
      signalHistory: [
        { date: "Feb 25", signal: "Buy", price: "$95,200", result: "win", pnl: "+3.2%" },
        { date: "Feb 20", signal: "Hold", price: "$94,800", result: "win", pnl: "+1.8%" },
        { date: "Feb 15", signal: "Buy", price: "$92,100", result: "win", pnl: "+5.6%" },
        { date: "Feb 10", signal: "Sell", price: "$98,400", result: "loss", pnl: "-1.2%" },
        { date: "Feb 5", signal: "Buy", price: "$91,500", result: "win", pnl: "+4.8%" },
      ],
      accuracy: { total: 48, wins: 35, losses: 13, winRate: 72.9, avgReturn: 3.2 },
    },''',
    "ETH": '''\
    aiSignal: {
      overallScore: 75,
      signal: "buy",
      confidence: 82,
      updatedAgo: "45s ago",
      technicalIndicators: [
        { name: "RSI (14)", value: "58.7", signal: "buy", score: 65 },
        { name: "MACD", value: "+42.3", signal: "buy", score: 72 },
        { name: "Bollinger", value: "Mid Band", signal: "neutral", score: 50 },
        { name: "MA Cross", value: "Bullish", signal: "buy", score: 78 },
        { name: "Volume", value: "Average", signal: "neutral", score: 52 },
        { name: "Stochastic", value: "55.8", signal: "neutral", score: 55 },
        { name: "ADX", value: "28.1", signal: "buy", score: 68 },
        { name: "OBV", value: "Rising", signal: "buy", score: 75 },
      ],
      timeframes: [
        { period: "1H", signal: "neutral", score: 55 },
        { period: "4H", signal: "buy", score: 72 },
        { period: "1D", signal: "buy", score: 78 },
        { period: "1W", signal: "buy", score: 74 },
      ],
      strategy: {
        action: "Long",
        entry: "$3,800 - $3,850",
        stopLoss: "$3,680 (-3.5%)",
        takeProfit1: "$3,980 (+3.6%)",
        takeProfit2: "$4,200 (+9.3%)",
        riskReward: "1:2.7",
        positionSize: "3-5% of portfolio",
        leverage: "2x-4x",
        timeHorizon: "5-14 days",
        reasoning: "research.ethStrategyReason",
      },
      signalHistory: [
        { date: "Feb 25", signal: "Buy", price: "$3,720", result: "win", pnl: "+2.8%" },
        { date: "Feb 21", signal: "Hold", price: "$3,650", result: "win", pnl: "+1.5%" },
        { date: "Feb 16", signal: "Sell", price: "$3,900", result: "win", pnl: "+2.1%" },
        { date: "Feb 11", signal: "Buy", price: "$3,580", result: "win", pnl: "+4.2%" },
        { date: "Feb 6", signal: "Buy", price: "$3,450", result: "loss", pnl: "-2.1%" },
      ],
      accuracy: { total: 42, wins: 30, losses: 12, winRate: 71.4, avgReturn: 2.8 },
    },''',
    "SOL": '''\
    aiSignal: {
      overallScore: 58,
      signal: "neutral",
      confidence: 65,
      updatedAgo: "1m ago",
      technicalIndicators: [
        { name: "RSI (14)", value: "45.2", signal: "neutral", score: 48 },
        { name: "MACD", value: "-2.8", signal: "sell", score: 38 },
        { name: "Bollinger", value: "Lower Band", signal: "buy", score: 68 },
        { name: "MA Cross", value: "Bearish", signal: "sell", score: 35 },
        { name: "Volume", value: "Below Avg", signal: "sell", score: 40 },
        { name: "Stochastic", value: "32.5", signal: "buy", score: 65 },
        { name: "ADX", value: "18.4", signal: "neutral", score: 45 },
        { name: "OBV", value: "Flat", signal: "neutral", score: 50 },
      ],
      timeframes: [
        { period: "1H", signal: "sell", score: 38 },
        { period: "4H", signal: "neutral", score: 52 },
        { period: "1D", signal: "neutral", score: 55 },
        { period: "1W", signal: "buy", score: 68 },
      ],
      strategy: {
        action: "Wait",
        entry: "$178 - $182 (if support holds)",
        stopLoss: "$170 (-5.0%)",
        takeProfit1: "$195 (+7.2%)",
        takeProfit2: "$210 (+15.5%)",
        riskReward: "1:1.4",
        positionSize: "1-2% of portfolio",
        leverage: "1x-2x",
        timeHorizon: "7-21 days",
        reasoning: "research.solStrategyReason",
      },
      signalHistory: [
        { date: "Feb 24", signal: "Sell", price: "$192", result: "win", pnl: "+2.5%" },
        { date: "Feb 19", signal: "Hold", price: "$188", result: "loss", pnl: "-1.8%" },
        { date: "Feb 14", signal: "Buy", price: "$175", result: "win", pnl: "+6.8%" },
        { date: "Feb 9", signal: "Sell", price: "$198", result: "win", pnl: "+3.2%" },
        { date: "Feb 4", signal: "Buy", price: "$165", result: "win", pnl: "+8.5%" },
      ],
      accuracy: { total: 38, wins: 25, losses: 13, winRate: 65.8, avgReturn: 2.1 },
    },''',
    "ARB": '''\
    aiSignal: {
      overallScore: 71,
      signal: "buy",
      confidence: 75,
      updatedAgo: "2m ago",
      technicalIndicators: [
        { name: "RSI (14)", value: "65.8", signal: "buy", score: 70 },
        { name: "MACD", value: "+0.08", signal: "buy", score: 68 },
        { name: "Bollinger", value: "Upper Band", signal: "neutral", score: 52 },
        { name: "MA Cross", value: "Golden Cross", signal: "buy", score: 82 },
        { name: "Volume", value: "Above Avg", signal: "buy", score: 75 },
        { name: "Stochastic", value: "72.1", signal: "neutral", score: 48 },
        { name: "ADX", value: "26.8", signal: "buy", score: 65 },
        { name: "OBV", value: "Rising", signal: "buy", score: 72 },
      ],
      timeframes: [
        { period: "1H", signal: "buy", score: 68 },
        { period: "4H", signal: "buy", score: 74 },
        { period: "1D", signal: "buy", score: 72 },
        { period: "1W", signal: "neutral", score: 58 },
      ],
      strategy: {
        action: "Long",
        entry: "$1.80 - $1.86",
        stopLoss: "$1.68 (-8.6%)",
        takeProfit1: "$2.05 (+10.8%)",
        takeProfit2: "$2.30 (+24.3%)",
        riskReward: "1:1.3",
        positionSize: "1-2% of portfolio",
        leverage: "2x-3x",
        timeHorizon: "7-14 days",
        reasoning: "research.arbStrategyReason",
      },
      signalHistory: [
        { date: "Feb 25", signal: "Buy", price: "$1.72", result: "win", pnl: "+7.6%" },
        { date: "Feb 20", signal: "Hold", price: "$1.65", result: "win", pnl: "+3.0%" },
        { date: "Feb 15", signal: "Buy", price: "$1.55", result: "win", pnl: "+12.9%" },
        { date: "Feb 10", signal: "Sell", price: "$1.80", result: "loss", pnl: "-3.3%" },
        { date: "Feb 5", signal: "Buy", price: "$1.48", result: "win", pnl: "+10.8%" },
      ],
      accuracy: { total: 32, wins: 22, losses: 10, winRate: 68.8, avgReturn: 3.5 },
    },''',
    "LINK": '''\
    aiSignal: {
      overallScore: 73,
      signal: "buy",
      confidence: 78,
      updatedAgo: "1m ago",
      technicalIndicators: [
        { name: "RSI (14)", value: "61.2", signal: "buy", score: 68 },
        { name: "MACD", value: "+0.85", signal: "buy", score: 72 },
        { name: "Bollinger", value: "Mid Band", signal: "neutral", score: 55 },
        { name: "MA Cross", value: "Bullish", signal: "buy", score: 75 },
        { name: "Volume", value: "Above Avg", signal: "buy", score: 70 },
        { name: "Stochastic", value: "58.4", signal: "neutral", score: 55 },
        { name: "ADX", value: "24.6", signal: "neutral", score: 52 },
        { name: "OBV", value: "Rising", signal: "buy", score: 78 },
      ],
      timeframes: [
        { period: "1H", signal: "buy", score: 65 },
        { period: "4H", signal: "buy", score: 72 },
        { period: "1D", signal: "buy", score: 75 },
        { period: "1W", signal: "neutral", score: 58 },
      ],
      strategy: {
        action: "Long",
        entry: "$22.00 - $22.50",
        stopLoss: "$20.80 (-6.5%)",
        takeProfit1: "$24.50 (+9.1%)",
        takeProfit2: "$27.00 (+20.2%)",
        riskReward: "1:1.4",
        positionSize: "2-3% of portfolio",
        leverage: "2x-3x",
        timeHorizon: "7-21 days",
        reasoning: "research.linkStrategyReason",
      },
      signalHistory: [
        { date: "Feb 24", signal: "Buy", price: "$20.80", result: "win", pnl: "+5.8%" },
        { date: "Feb 19", signal: "Hold", price: "$21.50", result: "win", pnl: "+2.2%" },
        { date: "Feb 14", signal: "Buy", price: "$19.20", result: "win", pnl: "+8.5%" },
        { date: "Feb 9", signal: "Sell", price: "$23.10", result: "loss", pnl: "-2.6%" },
        { date: "Feb 4", signal: "Buy", price: "$18.50", result: "win", pnl: "+12.2%" },
      ],
      accuracy: { total: 36, wins: 26, losses: 10, winRate: 72.2, avgReturn: 3.1 },
    },''',
    "AVAX": '''\
    aiSignal: {
      overallScore: 52,
      signal: "neutral",
      confidence: 60,
      updatedAgo: "2m ago",
      technicalIndicators: [
        { name: "RSI (14)", value: "42.8", signal: "neutral", score: 45 },
        { name: "MACD", value: "-1.2", signal: "sell", score: 35 },
        { name: "Bollinger", value: "Lower Band", signal: "buy", score: 65 },
        { name: "MA Cross", value: "Neutral", signal: "neutral", score: 50 },
        { name: "Volume", value: "Below Avg", signal: "sell", score: 38 },
        { name: "Stochastic", value: "28.5", signal: "buy", score: 68 },
        { name: "ADX", value: "15.2", signal: "neutral", score: 42 },
        { name: "OBV", value: "Declining", signal: "sell", score: 32 },
      ],
      timeframes: [
        { period: "1H", signal: "sell", score: 35 },
        { period: "4H", signal: "neutral", score: 48 },
        { period: "1D", signal: "neutral", score: 52 },
        { period: "1W", signal: "buy", score: 62 },
      ],
      strategy: {
        action: "Wait",
        entry: "$38.00 - $39.50 (if reversal confirmed)",
        stopLoss: "$36.00 (-7.5%)",
        takeProfit1: "$44.00 (+13.0%)",
        takeProfit2: "$48.00 (+23.3%)",
        riskReward: "1:1.7",
        positionSize: "1% of portfolio",
        leverage: "1x-2x",
        timeHorizon: "14-30 days",
        reasoning: "research.avaxStrategyReason",
      },
      signalHistory: [
        { date: "Feb 23", signal: "Sell", price: "$42.50", result: "win", pnl: "+5.2%" },
        { date: "Feb 18", signal: "Hold", price: "$40.80", result: "loss", pnl: "-3.1%" },
        { date: "Feb 13", signal: "Buy", price: "$36.20", result: "win", pnl: "+8.8%" },
        { date: "Feb 8", signal: "Sell", price: "$44.00", result: "win", pnl: "+4.5%" },
        { date: "Feb 3", signal: "Buy", price: "$35.00", result: "win", pnl: "+11.4%" },
      ],
      accuracy: { total: 30, wins: 19, losses: 11, winRate: 63.3, avgReturn: 2.4 },
    },''',
    "RENDER": '''\
    aiSignal: {
      overallScore: 78,
      signal: "buy",
      confidence: 82,
      updatedAgo: "1m ago",
      technicalIndicators: [
        { name: "RSI (14)", value: "67.5", signal: "buy", score: 72 },
        { name: "MACD", value: "+0.42", signal: "buy", score: 75 },
        { name: "Bollinger", value: "Upper Band", signal: "neutral", score: 50 },
        { name: "MA Cross", value: "Golden Cross", signal: "buy", score: 85 },
        { name: "Volume", value: "High", signal: "buy", score: 82 },
        { name: "Stochastic", value: "74.2", signal: "neutral", score: 48 },
        { name: "ADX", value: "35.8", signal: "buy", score: 80 },
        { name: "OBV", value: "Strong Rise", signal: "buy", score: 85 },
      ],
      timeframes: [
        { period: "1H", signal: "buy", score: 72 },
        { period: "4H", signal: "strongBuy", score: 82 },
        { period: "1D", signal: "buy", score: 78 },
        { period: "1W", signal: "strongBuy", score: 85 },
      ],
      strategy: {
        action: "Long",
        entry: "$11.20 - $11.60",
        stopLoss: "$10.20 (-9.5%)",
        takeProfit1: "$13.50 (+19.8%)",
        takeProfit2: "$15.00 (+33.0%)",
        riskReward: "1:2.1",
        positionSize: "2-3% of portfolio",
        leverage: "2x-3x",
        timeHorizon: "7-21 days",
        reasoning: "research.renderStrategyReason",
      },
      signalHistory: [
        { date: "Feb 25", signal: "Buy", price: "$10.50", result: "win", pnl: "+8.6%" },
        { date: "Feb 20", signal: "Hold", price: "$9.80", result: "win", pnl: "+5.1%" },
        { date: "Feb 15", signal: "Buy", price: "$8.50", result: "win", pnl: "+18.8%" },
        { date: "Feb 10", signal: "Hold", price: "$9.20", result: "win", pnl: "+3.3%" },
        { date: "Feb 5", signal: "Buy", price: "$7.80", result: "win", pnl: "+25.6%" },
      ],
      accuracy: { total: 28, wins: 21, losses: 7, winRate: 75.0, avgReturn: 4.8 },
    },''',
    "PEPE": '''\
    aiSignal: {
      overallScore: 35,
      signal: "sell",
      confidence: 72,
      updatedAgo: "30s ago",
      technicalIndicators: [
        { name: "RSI (14)", value: "28.5", signal: "sell", score: 25 },
        { name: "MACD", value: "-0.00002", signal: "sell", score: 22 },
        { name: "Bollinger", value: "Below Lower", signal: "buy", score: 72 },
        { name: "MA Cross", value: "Death Cross", signal: "sell", score: 18 },
        { name: "Volume", value: "Spike Down", signal: "sell", score: 20 },
        { name: "Stochastic", value: "15.2", signal: "buy", score: 75 },
        { name: "ADX", value: "42.5", signal: "sell", score: 28 },
        { name: "OBV", value: "Sharp Drop", signal: "sell", score: 15 },
      ],
      timeframes: [
        { period: "1H", signal: "strongSell", score: 18 },
        { period: "4H", signal: "sell", score: 28 },
        { period: "1D", signal: "sell", score: 32 },
        { period: "1W", signal: "neutral", score: 45 },
      ],
      strategy: {
        action: "Short / Avoid",
        entry: "Wait for $0.0000085+ (dead cat bounce)",
        stopLoss: "$0.0000095 (+11.8%)",
        takeProfit1: "$0.0000065 (-23.5%)",
        takeProfit2: "$0.0000050 (-41.2%)",
        riskReward: "1:2.0",
        positionSize: "0.5-1% of portfolio",
        leverage: "1x (spot short)",
        timeHorizon: "1-7 days",
        reasoning: "research.pepeStrategyReason",
      },
      signalHistory: [
        { date: "Feb 25", signal: "Sell", price: "$0.0000092", result: "win", pnl: "+8.7%" },
        { date: "Feb 20", signal: "Sell", price: "$0.0000105", result: "win", pnl: "+12.4%" },
        { date: "Feb 15", signal: "Buy", price: "$0.0000088", result: "loss", pnl: "-15.9%" },
        { date: "Feb 10", signal: "Sell", price: "$0.0000120", result: "win", pnl: "+18.3%" },
        { date: "Feb 5", signal: "Buy", price: "$0.0000095", result: "loss", pnl: "-8.4%" },
      ],
      accuracy: { total: 25, wins: 14, losses: 11, winRate: 56.0, avgReturn: 1.8 },
    },''',
}

# Token order in the file
tokens = ["BTC", "ETH", "SOL", "ARB", "LINK", "AVAX", "RENDER", "PEPE"]
# socialSentiment lines (0-indexed from grep output)
social_lines = [193, 244, 295, 346, 397, 448, 499, 550]

lines = content.split('\n')
offset = 0
for i, token in enumerate(tokens):
    line_idx = social_lines[i] - 1 + offset  # convert to 0-indexed
    # Find the closing of this object (next line with just "  },")
    # Insert aiSignal data after the socialSentiment line
    insert_text = ai_signals[token]
    lines.insert(line_idx + 1, insert_text)
    offset += insert_text.count('\n') + 1

content = '\n'.join(lines)
with open('client/src/pages/Research.tsx', 'w') as f:
    f.write(content)

print(f"Done! Added aiSignal data for {len(tokens)} tokens")
print(f"File now has {len(lines)} lines")
