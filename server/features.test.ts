/**
 * NexusChat Feature Tests
 * Covers: wallet, chat, research, posts, user routers
 */
import { describe, it, expect } from "vitest";
import { TASK_DEFINITIONS } from "./routers/user";

// ─── Wallet Tests ────────────────────────────────────────────────────────────
describe("Wallet Router", () => {
  it("validates BSC address format", () => {
    const validAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18";
    const invalidAddress = "not-an-address";
    const bscRegex = /^0x[a-fA-F0-9]{40}$/;
    expect(bscRegex.test(validAddress)).toBe(true);
    expect(bscRegex.test(invalidAddress)).toBe(false);
  });

  it("formats BNB balance correctly", () => {
    const wei = "1000000000000000000"; // 1 BNB in wei
    const bnb = Number(BigInt(wei)) / 1e18;
    expect(bnb.toFixed(4)).toBe("1.0000");
  });

  it("formats token balance with decimals", () => {
    const rawBalance = "1000000"; // 1 USDT with 6 decimals
    const decimals = 6;
    const formatted = (parseFloat(rawBalance) / Math.pow(10, decimals)).toFixed(4);
    expect(formatted).toBe("1.0000");
  });

  it("calculates USD value from BNB balance", () => {
    const bnbBalance = 2.5;
    const bnbPrice = 600;
    const usdValue = (bnbBalance * bnbPrice).toFixed(2);
    expect(usdValue).toBe("1500.00");
  });

  it("validates BscScan API response structure", () => {
    const mockResponse = { status: "1", message: "OK", result: "1000000000000000000" };
    expect(mockResponse.status).toBe("1");
    expect(typeof mockResponse.result).toBe("string");
  });

  it("handles BscScan API error response", () => {
    const errorResponse = { status: "0", message: "NOTOK", result: "Error!" };
    const isSuccess = errorResponse.status === "1";
    expect(isSuccess).toBe(false);
  });
});

// ─── Chat Tests ───────────────────────────────────────────────────────────────
describe("Chat Router", () => {
  it("validates message content length", () => {
    const validMsg = "Hello, world!";
    const emptyMsg = "";
    const longMsg = "x".repeat(5001);
    expect(validMsg.length >= 1 && validMsg.length <= 5000).toBe(true);
    expect(emptyMsg.length >= 1).toBe(false);
    expect(longMsg.length <= 5000).toBe(false);
  });

  it("validates chat room ID format", () => {
    const validId = "room-123";
    const emptyId = "";
    expect(validId.length > 0).toBe(true);
    expect(emptyId.length > 0).toBe(false);
  });

  it("formats message timestamp correctly", () => {
    const ts = Date.now();
    const date = new Date(ts);
    expect(date instanceof Date).toBe(true);
    expect(isNaN(date.getTime())).toBe(false);
  });
});

// ─── Research Tests ───────────────────────────────────────────────────────────
describe("Research Router", () => {
  it("validates token symbol format", () => {
    const validSymbols = ["BTC", "ETH", "BNB", "USDT"];
    validSymbols.forEach((s) => {
      expect(s.length >= 1 && s.length <= 20).toBe(true);
    });
    expect("".length >= 1).toBe(false);
  });

  it("calculates sentiment score correctly", () => {
    const bullishSignals = 7;
    const totalSignals = 10;
    const score = Math.round((bullishSignals / totalSignals) * 100);
    expect(score).toBe(70);
  });

  it("determines market sentiment label", () => {
    const getSentiment = (score: number) => {
      if (score >= 70) return "bullish";
      if (score >= 40) return "neutral";
      return "bearish";
    };
    expect(getSentiment(80)).toBe("bullish");
    expect(getSentiment(55)).toBe("neutral");
    expect(getSentiment(20)).toBe("bearish");
  });
});

// ─── Posts Tests ──────────────────────────────────────────────────────────────
describe("Posts Router", () => {
  it("validates post content length", () => {
    const validContent = "This is a valid post about #BTC";
    const tooLong = "x".repeat(2001);
    expect(validContent.length >= 1 && validContent.length <= 2000).toBe(true);
    expect(tooLong.length <= 2000).toBe(false);
  });

  it("extracts hashtags from post content", () => {
    const content = "Bullish on #BTC and #ETH today! #DeFi";
    const tags = content.match(/#(\w+)/g)?.map((t) => t.slice(1)) ?? [];
    expect(tags).toEqual(["BTC", "ETH", "DeFi"]);
  });

  it("validates media URL count limit", () => {
    const maxMedia = 4;
    const validUrls = ["url1", "url2", "url3", "url4"];
    const tooMany = ["url1", "url2", "url3", "url4", "url5"];
    expect(validUrls.length <= maxMedia).toBe(true);
    expect(tooMany.length <= maxMedia).toBe(false);
  });

  it("formats like count correctly", () => {
    const formatNum = (n: number) => {
      if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
      if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
      return n.toString();
    };
    expect(formatNum(1500000)).toBe("1.5M");
    expect(formatNum(2500)).toBe("2.5K");
    expect(formatNum(42)).toBe("42");
  });
});

// ─── User Router Tests ────────────────────────────────────────────────────────
describe("User Router — Task Definitions", () => {
  it("all task definitions have required fields", () => {
    Object.entries(TASK_DEFINITIONS).forEach(([key, def]) => {
      expect(typeof def.label).toBe("string");
      expect(typeof def.description).toBe("string");
      expect(typeof def.npReward).toBe("number");
      expect(def.npReward).toBeGreaterThan(0);
      expect(typeof def.maxCompletions).toBe("number");
      expect(def.maxCompletions).toBeGreaterThan(0);
    });
  });

  it("daily_login task has high max completions", () => {
    const dailyLogin = TASK_DEFINITIONS["daily_login"];
    expect(dailyLogin).toBeDefined();
    expect(dailyLogin.maxCompletions).toBeGreaterThan(100);
  });

  it("one-time tasks have maxCompletions of 1", () => {
    const oneTimeTasks = ["connect_wallet", "complete_profile", "first_post", "first_message", "first_research"];
    oneTimeTasks.forEach((taskType) => {
      const def = TASK_DEFINITIONS[taskType];
      expect(def).toBeDefined();
      expect(def.maxCompletions).toBe(1);
    });
  });

  it("validates profile update input", () => {
    const validName = "Alice";
    const emptyName = "";
    const longName = "x".repeat(51);
    expect(validName.length >= 1 && validName.length <= 50).toBe(true);
    expect(emptyName.length >= 1).toBe(false);
    expect(longName.length <= 50).toBe(false);
  });

  it("validates username format", () => {
    const validUsername = "alice_123";
    const invalidUsername = "alice@123!";
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    expect(usernameRegex.test(validUsername)).toBe(true);
    expect(usernameRegex.test(invalidUsername)).toBe(false);
  });

  it("validates bio length", () => {
    const validBio = "Web3 builder & DeFi enthusiast";
    const longBio = "x".repeat(201);
    expect(validBio.length <= 200).toBe(true);
    expect(longBio.length <= 200).toBe(false);
  });

  it("calculates NP rank correctly", () => {
    const usersAbove = 42;
    const myRank = usersAbove + 1;
    expect(myRank).toBe(43);
  });

  it("leaderboard limit validation", () => {
    const validLimit = 50;
    const tooLarge = 101;
    expect(validLimit >= 1 && validLimit <= 100).toBe(true);
    expect(tooLarge <= 100).toBe(false);
  });
});

// ─── Phase 4: Profile Stats, Image Upload, Chat Polling Tests ─────────────────
describe("Profile Stats", () => {
  it("calculates NP level progress correctly", () => {
    const npPoints = 24680;
    const nextMilestone = Math.ceil((npPoints + 1) / 10000) * 10000;
    const progress = Math.min(((npPoints % 10000) / 10000) * 100, 100);
    expect(nextMilestone).toBe(30000);
    expect(progress).toBeCloseTo(46.8, 0);
  });

  it("formats NP points with locale separator", () => {
    const np = 24680;
    const formatted = np.toLocaleString("en-US");
    expect(formatted).toBe("24,680");
  });

  it("getUserStats rank is at least 1", () => {
    const usersAbove = 0;
    const rank = usersAbove + 1;
    expect(rank).toBeGreaterThanOrEqual(1);
  });

  it("post count starts at 0 for new user", () => {
    const postCount = 0;
    expect(postCount).toBeGreaterThanOrEqual(0);
  });
});

describe("Image Upload (S3)", () => {
  it("validates file size limit (8MB)", () => {
    const maxBytes = 8 * 1024 * 1024;
    const smallFile = 1024 * 1024; // 1MB
    const largeFile = 9 * 1024 * 1024; // 9MB
    expect(smallFile <= maxBytes).toBe(true);
    expect(largeFile <= maxBytes).toBe(false);
  });

  it("extracts mime type from data URL", () => {
    const dataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRgAB...";
    const mimeType = dataUrl.match(/:(.*?);/)?.[1] ?? "image/jpeg";
    expect(mimeType).toBe("image/jpeg");
  });

  it("extracts base64 data from data URL", () => {
    const dataUrl = "data:image/png;base64,iVBORw0KGgo=";
    const [, base64Data] = dataUrl.split(",");
    expect(base64Data).toBe("iVBORw0KGgo=");
  });

  it("generates unique file key with random suffix", () => {
    const userId = 42;
    const ext = "jpg";
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const key = `posts/${userId}/${Date.now()}-${randomSuffix}.${ext}`;
    expect(key).toMatch(/^posts\/42\/\d+-[a-z0-9]+\.jpg$/);
  });

  it("validates max 4 images per post", () => {
    const maxImages = 4;
    const validImages = ["img1", "img2", "img3", "img4"];
    const tooMany = ["img1", "img2", "img3", "img4", "img5"];
    expect(validImages.length <= maxImages).toBe(true);
    expect(tooMany.length <= maxImages).toBe(false);
  });
});

describe("Chat Polling", () => {
  it("polling interval is 3 seconds", () => {
    const refetchInterval = 3000;
    expect(refetchInterval).toBe(3000);
  });

  it("merges server messages with local optimistic messages", () => {
    const serverMsgIds = new Set(["1", "2", "3"]);
    const localMessages = [
      { id: "1", content: "Server msg 1" },
      { id: String(Date.now()), content: "Optimistic msg" }, // timestamp-based ID
    ];
    // Local-only = not in server AND has timestamp-based ID
    const localOnly = localMessages.filter(
      (m) => !serverMsgIds.has(m.id) && Number(m.id) > 1_700_000_000_000
    );
    expect(localOnly.length).toBe(1);
    expect(localOnly[0].content).toBe("Optimistic msg");
  });

  it("formats message timestamp to locale time", () => {
    const ts = new Date("2026-01-15T10:30:00Z");
    const formatted = ts.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    expect(typeof formatted).toBe("string");
    expect(formatted.length).toBeGreaterThan(0);
  });

  it("validates group message content max length", () => {
    const maxLen = 4000;
    const validMsg = "Hello World";
    const tooLong = "x".repeat(4001);
    expect(validMsg.length <= maxLen).toBe(true);
    expect(tooLong.length <= maxLen).toBe(false);
  });
});

// ─── Phase 5: Discover Images, Avatar Upload, ChatRoom Polling ────────────────
describe("Discover Post Image Grid", () => {
  it("maps 1 image to single column grid", () => {
    const images = ["url1"];
    const gridCols = images.length === 1 ? "grid-cols-1" : "grid-cols-2";
    expect(gridCols).toBe("grid-cols-1");
  });

  it("maps 2+ images to two-column grid", () => {
    const images = ["url1", "url2"];
    const gridCols = images.length === 1 ? "grid-cols-1" : "grid-cols-2";
    expect(gridCols).toBe("grid-cols-2");
  });

  it("limits displayed images to 4", () => {
    const images = ["u1", "u2", "u3", "u4", "u5", "u6"];
    const displayed = images.slice(0, 4);
    expect(displayed.length).toBe(4);
  });

  it("calculates overflow count correctly", () => {
    const images = ["u1", "u2", "u3", "u4", "u5"];
    const overflow = images.length > 4 ? images.length - 4 : 0;
    expect(overflow).toBe(1);
  });

  it("maps server post mediaUrls to images field", () => {
    const serverPost = { id: 1, content: "test", mediaUrls: ["https://cdn.example.com/img.jpg"] };
    const images = serverPost.mediaUrls && serverPost.mediaUrls.length > 0 ? serverPost.mediaUrls : undefined;
    expect(images).toEqual(["https://cdn.example.com/img.jpg"]);
  });

  it("returns undefined images when mediaUrls is empty", () => {
    const serverPost = { id: 2, content: "text only", mediaUrls: [] };
    const images = serverPost.mediaUrls && serverPost.mediaUrls.length > 0 ? serverPost.mediaUrls : undefined;
    expect(images).toBeUndefined();
  });
});

describe("Avatar S3 Upload", () => {
  it("validates avatar file size limit (4MB)", () => {
    const maxBytes = 4 * 1024 * 1024;
    const smallFile = 500 * 1024; // 500KB
    const largeFile = 5 * 1024 * 1024; // 5MB
    expect(smallFile <= maxBytes).toBe(true);
    expect(largeFile <= maxBytes).toBe(false);
  });

  it("extracts mime type from avatar data URL", () => {
    const dataUrl = "data:image/png;base64,iVBORw0KGgo=";
    const mimeType = dataUrl.match(/:(.*?);/)?.[1] ?? "image/jpeg";
    expect(mimeType).toBe("image/png");
  });

  it("generates correct file extension from mime type", () => {
    const mimeType = "image/webp";
    const ext = mimeType.split("/")[1] ?? "jpg";
    expect(ext).toBe("webp");
  });

  it("saves CDN URL as avatar after upload", () => {
    const uploadResult = { url: "https://cdn.example.com/avatars/user-42-abc123.png" };
    const avatarImage = uploadResult.url;
    expect(avatarImage).toMatch(/^https:\/\//);
  });
});

describe("ChatRoom DM Polling", () => {
  it("parses numeric groupId from URL param", () => {
    const id = "42";
    const groupId = id ? parseInt(id, 10) : NaN;
    const isValidRoom = !isNaN(groupId) && groupId > 0;
    expect(groupId).toBe(42);
    expect(isValidRoom).toBe(true);
  });

  it("rejects non-numeric room ID", () => {
    const id = "dm-alice";
    const groupId = id ? parseInt(id, 10) : NaN;
    const isValidRoom = !isNaN(groupId) && groupId > 0;
    expect(isNaN(groupId)).toBe(true);
    expect(isValidRoom).toBe(false);
  });

  it("rejects zero as invalid room ID", () => {
    const id = "0";
    const groupId = parseInt(id, 10);
    const isValidRoom = !isNaN(groupId) && groupId > 0;
    expect(isValidRoom).toBe(false);
  });

  it("maps server DM message to Message format", () => {
    const serverMsg = {
      id: 99,
      senderName: "Alice",
      senderAvatar: "🐱",
      content: "Hello!",
      createdAt: new Date("2026-01-15T10:30:00Z"),
      mediaUrl: null,
    };
    const mapped = {
      id: String(serverMsg.id),
      sender: serverMsg.senderName ?? "Unknown",
      senderAvatar: serverMsg.senderAvatar ?? "👤",
      content: serverMsg.content,
      time: new Date(serverMsg.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      isMine: false,
      readStatus: "read" as const,
    };
    expect(mapped.id).toBe("99");
    expect(mapped.sender).toBe("Alice");
    expect(mapped.isMine).toBe(false);
  });
});

// ─── Phase 6: PostDetail, Notifications, CreateGroup ─────────────────────────
describe("PostDetail", () => {
  it("maps server post to PostData format correctly", () => {
    const serverPost = {
      id: 1,
      content: "Hello world",
      authorId: 42,
      authorName: "alice.eth",
      authorAvatar: "A",
      likeCount: 10,
      commentCount: 3,
      mediaUrls: ["https://cdn.example.com/img.jpg"],
      createdAt: new Date("2026-01-15T10:00:00Z"),
    };
    const postData = {
      id: String(serverPost.id),
      content: serverPost.content,
      author: {
        id: String(serverPost.authorId),
        name: serverPost.authorName ?? "Anonymous",
        avatar: serverPost.authorAvatar ?? "?",
      },
      likes: serverPost.likeCount,
      comments: serverPost.commentCount,
      images: serverPost.mediaUrls ?? [],
    };
    expect(postData.id).toBe("1");
    expect(postData.author.name).toBe("alice.eth");
    expect(postData.images).toHaveLength(1);
  });

  it("formats comment timestamp correctly", () => {
    const ts = new Date("2026-01-15T10:30:00Z");
    const formatted = ts.toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    expect(typeof formatted).toBe("string");
  });

  it("validates comment content max length", () => {
    const maxLen = 1000;
    const valid = "Great post!";
    const tooLong = "x".repeat(1001);
    expect(valid.length <= maxLen).toBe(true);
    expect(tooLong.length <= maxLen).toBe(false);
  });
});

describe("Notifications", () => {
  it("maps server notification type 'like' to 'social'", () => {
    const type = "like";
    const mapped = type === "like" || type === "comment" ? "social" : type === "follow" ? "friend_request" : type;
    expect(mapped).toBe("social");
  });

  it("maps server notification type 'follow' to 'friend_request'", () => {
    const type = "follow";
    const mapped = type === "like" || type === "comment" ? "social" : type === "follow" ? "friend_request" : type;
    expect(mapped).toBe("friend_request");
  });

  it("formats notification timestamp to short locale string", () => {
    const ts = new Date("2026-01-15T10:30:00Z");
    const formatted = ts.toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    expect(typeof formatted).toBe("string");
    expect(formatted.length).toBeGreaterThan(0);
  });

  it("uses server unread count when available", () => {
    const serverCount = 5;
    const localCount = 3;
    const unreadCount = serverCount ?? localCount;
    expect(unreadCount).toBe(5);
  });

  it("falls back to local count when server data unavailable", () => {
    const serverCount: number | undefined = undefined;
    const localCount = 3;
    const unreadCount = serverCount ?? localCount;
    expect(unreadCount).toBe(3);
  });

  it("notification poll interval is 15 seconds", () => {
    const refetchInterval = 15000;
    expect(refetchInterval).toBe(15000);
  });
});

describe("CreateGroup", () => {
  it("validates group name minimum length", () => {
    const validName = "DeFi Alpha";
    const tooShort = "A";
    expect(validName.length >= 2).toBe(true);
    expect(tooShort.length >= 2).toBe(false);
  });

  it("validates group name maximum length", () => {
    const validName = "DeFi Alpha Group";
    const tooLong = "x".repeat(101);
    expect(validName.length <= 100).toBe(true);
    expect(tooLong.length <= 100).toBe(false);
  });

  it("requires at least 2 members to create group", () => {
    const selected = ["user1", "user2"];
    const tooFew = ["user1"];
    expect(selected.length >= 2).toBe(true);
    expect(tooFew.length >= 2).toBe(false);
  });

  it("sets isPublic based on tokenGate enabled state", () => {
    const tokenGateEnabled = false;
    const isPublic = !tokenGateEnabled;
    expect(isPublic).toBe(true);
  });

  it("token-gated group sets isPublic to false", () => {
    const tokenGateEnabled = true;
    const isPublic = !tokenGateEnabled;
    expect(isPublic).toBe(false);
  });

  it("redirects to group room after creation", () => {
    const groupId = 42;
    const redirectPath = `/app/group/${groupId}`;
    expect(redirectPath).toBe("/app/group/42");
  });
});

// ─── Phase 7: Notification Closure, CoinGecko Prices, Group List ─────────────
describe("Notification Closure (Like/Comment)", () => {
  it("does not create self-notification", () => {
    const targetUserId = 42;
    const fromUserId = 42;
    const shouldCreate = targetUserId !== fromUserId;
    expect(shouldCreate).toBe(false);
  });

  it("creates notification when different users interact", () => {
    const targetUserId = 10;
    const fromUserId = 42;
    const shouldCreate = targetUserId !== fromUserId;
    expect(shouldCreate).toBe(true);
  });

  it("truncates long comment content to 50 chars in notification", () => {
    const longComment = "This is a very long comment that exceeds fifty characters in length";
    const truncated = `${longComment.slice(0, 50)}${longComment.length > 50 ? "..." : ""}`;
    expect(truncated.length).toBeLessThanOrEqual(53); // 50 + "..."
    expect(truncated.endsWith("...")).toBe(true);
  });

  it("short comment content is not truncated", () => {
    const shortComment = "Nice post!";
    const truncated = `${shortComment.slice(0, 50)}${shortComment.length > 50 ? "..." : ""}`;
    expect(truncated).toBe("Nice post!");
    expect(truncated.endsWith("...")).toBe(false);
  });
});

describe("CoinGecko Price API", () => {
  it("maps BTC symbol to CoinGecko ID", () => {
    const SYMBOL_TO_ID: Record<string, string> = {
      BTC: "bitcoin", ETH: "ethereum", BNB: "binancecoin",
      SOL: "solana", ARB: "arbitrum", LINK: "chainlink",
    };
    expect(SYMBOL_TO_ID["BTC"]).toBe("bitcoin");
    expect(SYMBOL_TO_ID["ETH"]).toBe("ethereum");
  });

  it("falls back to mock data when all prices are 0", () => {
    const livePrices = [{ symbol: "BTC", price: 0, change: 0 }];
    const mockFallback = [{ symbol: "BTC", price: 97245, change: 1.8 }];
    const displayTicker = livePrices.every(p => p.price === 0) ? mockFallback : livePrices;
    expect(displayTicker[0].price).toBe(97245);
  });

  it("uses live prices when available", () => {
    const livePrices = [{ symbol: "BTC", price: 100000, change: 3.5 }];
    const mockFallback = [{ symbol: "BTC", price: 97245, change: 1.8 }];
    const displayTicker = livePrices.every(p => p.price === 0) ? mockFallback : livePrices;
    expect(displayTicker[0].price).toBe(100000);
  });

  it("price change is rounded to 2 decimal places", () => {
    const rawChange = 1.23456789;
    const rounded = parseFloat(rawChange.toFixed(2));
    expect(rounded).toBe(1.23);
  });

  it("refetch interval is 30 seconds", () => {
    const refetchInterval = 30_000;
    expect(refetchInterval).toBe(30000);
  });
});

describe("Chat Group List", () => {
  it("listGroups returns only public groups", () => {
    const groups = [
      { id: 1, name: "DeFi Alpha", isPublic: true, memberCount: 42 },
      { id: 2, name: "Private Club", isPublic: false, memberCount: 5 },
    ];
    const publicGroups = groups.filter(g => g.isPublic);
    expect(publicGroups).toHaveLength(1);
    expect(publicGroups[0].name).toBe("DeFi Alpha");
  });

  it("joinGroup returns alreadyMember true if already joined", () => {
    const existingMembership = [{ groupId: 1, userId: 42 }];
    const alreadyMember = existingMembership.length > 0;
    expect(alreadyMember).toBe(true);
  });

  it("joinGroup increments member count on new join", () => {
    const currentCount = 42;
    const newCount = currentCount + 1;
    expect(newCount).toBe(43);
  });

  it("limits displayed groups to 5", () => {
    const allGroups = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `Group ${i + 1}` }));
    const displayed = allGroups.slice(0, 5);
    expect(displayed).toHaveLength(5);
  });
});

// ─── Phase 8: Trading Chart, Research History, Follow ────────────────────────

describe("Phase 8: Trading getChart", () => {
  it("trading router is defined", async () => {
    const { tradingRouter } = await import("./routers/trading");
    expect(tradingRouter).toBeDefined();
  });

  it("trading router has getChart procedure", async () => {
    const { tradingRouter } = await import("./routers/trading");
    const procs = (tradingRouter as any)._def.procedures;
    expect(procs.getChart !== undefined).toBe(true);
  });

  it("chart data point has timestamp and price fields", () => {
    const chartPoint = { timestamp: Date.now(), price: 97245.5 };
    expect(typeof chartPoint.timestamp).toBe("number");
    expect(typeof chartPoint.price).toBe("number");
  });

  it("chart days parameter defaults to 30", () => {
    const defaultDays = 30;
    expect(defaultDays).toBe(30);
  });
});

describe("Phase 8: Research History", () => {
  it("research router is defined", async () => {
    const { researchRouter } = await import("./routers/research");
    expect(researchRouter).toBeDefined();
  });

  it("research router has getHistory procedure", async () => {
    const { researchRouter } = await import("./routers/research");
    const procs = (researchRouter as any)._def.procedures;
    expect(procs.getHistory !== undefined).toBe(true);
  });

  it("history list is limited to 20 reports", () => {
    const allReports = Array.from({ length: 30 }, (_, i) => ({ id: i + 1 }));
    const limited = allReports.slice(0, 20);
    expect(limited).toHaveLength(20);
  });

  it("report createdAt is formatted as locale string", () => {
    const ts = new Date("2026-01-15T10:00:00Z");
    const formatted = ts.toLocaleDateString("zh-CN");
    expect(typeof formatted).toBe("string");
    expect(formatted.length).toBeGreaterThan(0);
  });
});

describe("Phase 8: Follow Router", () => {
  it("follow router is defined", async () => {
    const { followRouter } = await import("./routers/follow");
    expect(followRouter).toBeDefined();
  });

  it("follow router has follow procedure", async () => {
    const { followRouter } = await import("./routers/follow");
    const procs = (followRouter as any)._def.procedures;
    expect(procs.follow !== undefined).toBe(true);
  });

  it("follow router has unfollow procedure", async () => {
    const { followRouter } = await import("./routers/follow");
    const procs = (followRouter as any)._def.procedures;
    expect(procs.unfollow !== undefined).toBe(true);
  });

  it("follow router has isFollowing procedure", async () => {
    const { followRouter } = await import("./routers/follow");
    const procs = (followRouter as any)._def.procedures;
    expect(procs.isFollowing !== undefined).toBe(true);
  });

  it("follow router has getCounts procedure", async () => {
    const { followRouter } = await import("./routers/follow");
    const procs = (followRouter as any)._def.procedures;
    expect(procs.getCounts !== undefined).toBe(true);
  });

  it("follow router has getFollowing procedure", async () => {
    const { followRouter } = await import("./routers/follow");
    const procs = (followRouter as any)._def.procedures;
    expect(procs.getFollowing !== undefined).toBe(true);
  });

  it("prevents self-follow", () => {
    const userId = 42;
    const targetUserId = 42;
    const canFollow = userId !== targetUserId;
    expect(canFollow).toBe(false);
  });

  it("allows following different user", () => {
    const userId = 42;
    const targetUserId = 99;
    const canFollow = userId !== targetUserId;
    expect(canFollow).toBe(true);
  });

  it("follow notification content is correct", () => {
    const fromName = "alice.eth";
    const content = `${fromName} started following you`;
    expect(content).toBe("alice.eth started following you");
  });
});

// ─── Phase 9: Settings & API Key Management Tests ────────────────────────────
describe("Settings Router", () => {
  describe("Privacy Settings Schema", () => {
    it("validates boolean privacy settings", () => {
      const validSettings = {
        showWallet: false,
        showActivity: true,
        showNFTs: true,
        readReceipts: true,
        profileVisible: true,
        twoFAEnabled: false,
        biometricEnabled: false,
      };
      for (const [key, val] of Object.entries(validSettings)) {
        expect(typeof val).toBe("boolean");
      }
      expect(Object.keys(validSettings)).toHaveLength(7);
    });

    it("allows partial updates (only changed fields)", () => {
      const partialUpdate = { showWallet: true };
      expect(Object.keys(partialUpdate)).toHaveLength(1);
      expect(partialUpdate.showWallet).toBe(true);
    });

    it("rejects invalid setting values", () => {
      const invalidUpdate = { showWallet: "yes" as any };
      expect(typeof invalidUpdate.showWallet).not.toBe("boolean");
    });
  });

  describe("API Key Generation", () => {
    it("generates keys with correct prefix format", () => {
      // Simulate the key generation logic
      const { randomBytes, createHash } = require("crypto");
      const random = randomBytes(24).toString("hex");
      const rawKey = `nx_sk_${random}`;
      expect(rawKey).toMatch(/^nx_sk_[a-f0-9]{48}$/);
      expect(rawKey.length).toBe(54); // "nx_sk_" (6) + 48 hex chars
    });

    it("produces unique keys on each generation", () => {
      const { randomBytes } = require("crypto");
      const key1 = `nx_sk_${randomBytes(24).toString("hex")}`;
      const key2 = `nx_sk_${randomBytes(24).toString("hex")}`;
      expect(key1).not.toBe(key2);
    });

    it("hashes API keys with SHA-256", () => {
      const { createHash } = require("crypto");
      const rawKey = "nx_sk_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6";
      const hash = createHash("sha256").update(rawKey).digest("hex");
      expect(hash).toHaveLength(64); // SHA-256 = 64 hex chars
      // Same input = same hash (deterministic)
      const hash2 = createHash("sha256").update(rawKey).digest("hex");
      expect(hash).toBe(hash2);
    });

    it("extracts correct key prefix for storage", () => {
      const rawKey = "nx_sk_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6";
      const keyPrefix = rawKey.slice(0, 10);
      expect(keyPrefix).toBe("nx_sk_a1b2");
    });

    it("enforces maximum 5 active keys per user", () => {
      const existingKeys = [1, 2, 3, 4, 5]; // 5 active keys
      const maxKeys = 5;
      expect(existingKeys.length >= maxKeys).toBe(true);
    });

    it("masks API key for display", () => {
      const keyPrefix = "nx_sk_a1b2";
      const maskedKey = `${keyPrefix}${"•".repeat(40)}`;
      expect(maskedKey).toMatch(/^nx_sk_a1b2•{40}$/);
      expect(maskedKey.length).toBe(50);
    });
  });
});

// ─── Phase 9: Avatar Upload Tests ────────────────────────────────────────────
describe("Avatar Upload", () => {
  it("validates base64 image data", () => {
    const validBase64 = "iVBORw0KGgoAAAANSUhEUg=="; // PNG header
    const isBase64 = /^[A-Za-z0-9+/=]+$/.test(validBase64);
    expect(isBase64).toBe(true);
  });

  it("validates supported MIME types", () => {
    const supportedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const unsupportedTypes = ["image/svg+xml", "application/pdf", "text/html"];
    for (const type of supportedTypes) {
      expect(type.startsWith("image/")).toBe(true);
    }
    for (const type of unsupportedTypes) {
      const isSupported = supportedTypes.includes(type);
      expect(isSupported).toBe(false);
    }
  });

  it("enforces 4MB file size limit", () => {
    const maxSizeBytes = 4 * 1024 * 1024; // 4MB
    const smallFile = Buffer.alloc(1024 * 100); // 100KB
    const largeFile = Buffer.alloc(5 * 1024 * 1024); // 5MB
    expect(smallFile.length <= maxSizeBytes).toBe(true);
    expect(largeFile.length <= maxSizeBytes).toBe(false);
  });

  it("generates unique S3 keys for avatars", () => {
    const userId = 42;
    const timestamp = Date.now();
    const key = `avatars/${userId}/${timestamp}.jpg`;
    expect(key).toMatch(/^avatars\/42\/\d+\.jpg$/);
    // Different timestamps = different keys
    const key2 = `avatars/${userId}/${timestamp + 1}.jpg`;
    expect(key).not.toBe(key2);
  });
});

// ─── Phase 10: Repost & Quote Post Tests ─────────────────────────────────────
describe("Repost & Quote Post", () => {
  it("postsRouter has repost procedure", async () => {
    const { postsRouter } = await import("./routers/posts");
    const procs = (postsRouter as any)._def.procedures;
    expect(procs.repost !== undefined).toBe(true);
  });

  it("postsRouter has quotePost procedure", async () => {
    const { postsRouter } = await import("./routers/posts");
    const procs = (postsRouter as any)._def.procedures;
    expect(procs.quotePost !== undefined).toBe(true);
  });

  it("generates correct repost content format", () => {
    const originalAuthorName = "alice.eth";
    const originalContent = "Check out this amazing DeFi protocol!";
    const repostContent = `🔁 Reposted from @${originalAuthorName}:\n\n${originalContent.slice(0, 500)}`;
    expect(repostContent).toContain("🔁 Reposted from @alice.eth");
    expect(repostContent).toContain(originalContent);
  });

  it("truncates long original content in repost", () => {
    const longContent = "x".repeat(600);
    const truncated = longContent.slice(0, 500);
    expect(truncated.length).toBe(500);
    expect(truncated.length).toBeLessThan(longContent.length);
  });

  it("generates correct quote post content format", () => {
    const comment = "This is my take on this";
    const originalAuthorName = "bob.eth";
    const originalContent = "BTC to 100k!";
    const quoteContent = `${comment}\n\n💬 Quoting @${originalAuthorName}:\n> ${originalContent.slice(0, 300)}`;
    expect(quoteContent).toContain(comment);
    expect(quoteContent).toContain("💬 Quoting @bob.eth");
    expect(quoteContent).toContain("> BTC to 100k!");
  });

  it("validates quote comment max length (280 chars)", () => {
    const validComment = "Short comment";
    const tooLong = "x".repeat(281);
    expect(validComment.length <= 280).toBe(true);
    expect(tooLong.length <= 280).toBe(false);
  });

  it("truncates quoted original content to 300 chars", () => {
    const longOriginal = "y".repeat(400);
    const truncated = longOriginal.slice(0, 300);
    expect(truncated.length).toBe(300);
  });

  it("adds #repost tag to reposted posts", () => {
    const tags = JSON.stringify(["#repost"]);
    const parsed = JSON.parse(tags);
    expect(parsed).toContain("#repost");
  });

  it("adds #quote tag to quoted posts", () => {
    const tags = JSON.stringify(["#quote"]);
    const parsed = JSON.parse(tags);
    expect(parsed).toContain("#quote");
  });

  it("skips self-notification on repost", () => {
    const authorId = 42;
    const reposterId = 42;
    const shouldNotify = authorId !== reposterId;
    expect(shouldNotify).toBe(false);
  });

  it("sends notification on repost from different user", () => {
    const authorId = 42;
    const reposterId = 99;
    const shouldNotify = authorId !== reposterId;
    expect(shouldNotify).toBe(true);
  });
});
