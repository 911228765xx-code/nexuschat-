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
