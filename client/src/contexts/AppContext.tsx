/**
 * AppContext — 全局状态管理
 * 统一管理聊天、联系人、通知、用户数据
 * localStorage持久化 + React Context
 */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

// ==================== Types ====================

export interface UserProfile {
  displayName: string;
  avatar: string;
  avatarImage: string | null;
  ensName: string;
  ensVerified: boolean;
  walletAddress: string;
  bio: string;
  socialLinks: { id: string; platform: string; url: string; icon: string }[];
  showWalletBalance: boolean;
  showActivityStatus: boolean;
  showNFTCollection: boolean;
}

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  address: string;
  isOnline: boolean;
  isFavorite: boolean;
  group?: string;
  note?: string;
  addedAt?: string;
}

export interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  isGroup: boolean;
  isTokenGated: boolean;
  isOnline?: boolean;
  isPinned?: boolean;
  isMuted?: boolean;
}

export interface Notification {
  id: string;
  type: "friend_request" | "mention" | "signal" | "system" | "social";
  title: string;
  message: string;
  avatar: string;
  time: string;
  read: boolean;
  actionable?: boolean;
  actionTaken?: "accepted" | "declined";
  data?: Record<string, unknown>;
}

export interface NotificationSettings {
  friendRequests: boolean;
  groupMentions: boolean;
  tradingSignals: boolean;
  systemUpdates: boolean;
  socialActivity: boolean;
  sound: boolean;
  vibration: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

// ==================== Default Data ====================

const defaultProfile: UserProfile = {
  displayName: "cryptowhale.eth",
  avatar: "🦊",
  avatarImage: null,
  ensName: "cryptowhale.eth",
  ensVerified: true,
  walletAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  bio: "Web3 builder & DeFi enthusiast. Building the future of decentralized communication.",
  socialLinks: [
    { id: "1", platform: "Twitter / X", url: "https://x.com/cryptowhale", icon: "𝕏" },
    { id: "2", platform: "GitHub", url: "https://github.com/cryptowhale", icon: "⌨️" },
  ],
  showWalletBalance: false,
  showActivityStatus: true,
  showNFTCollection: true,
};

const defaultNotificationSettings: NotificationSettings = {
  friendRequests: true,
  groupMentions: true,
  tradingSignals: true,
  systemUpdates: true,
  socialActivity: true,
  sound: true,
  vibration: true,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
};

// ==================== Context ====================

interface AppState {
  // User Profile
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;

  // Conversations
  conversations: Conversation[];
  pinConversation: (id: string) => void;
  muteConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  markConversationRead: (id: string) => void;

  // Contacts
  contacts: Contact[];
  addContact: (contact: Contact) => void;
  removeContact: (id: string) => void;
  toggleFavorite: (id: string) => void;
  updateContactNote: (id: string, note: string) => void;

  // Notifications
  notifications: Notification[];
  unreadNotificationCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  handleNotificationAction: (id: string, action: "accepted" | "declined") => void;
  clearAllNotifications: () => void;

  // Notification Settings
  notificationSettings: NotificationSettings;
  updateNotificationSettings: (updates: Partial<NotificationSettings>) => void;

  // Global
  totalUnreadMessages: number;
}

const AppContext = createContext<AppState | null>(null);

// ==================== Storage Helpers ====================

const STORAGE_PREFIX = "nexuschat_";

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + key);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore parse errors
  }
  return defaultValue;
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

// ==================== Provider ====================

export function AppProvider({ children }: { children: ReactNode }) {
  // Profile
  const [profile, setProfile] = useState<UserProfile>(() =>
    loadFromStorage("profile", defaultProfile)
  );

  // Conversations
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    loadFromStorage("conversations", [
      { id: "1", name: "vitalik.eth", avatar: "V", lastMessage: "ETH 2.0 staking yield looks great 🚀", time: "now", unread: 3, isGroup: false, isTokenGated: false, isOnline: true },
      { id: "2", name: "BAYC Holders 🐵", avatar: "🐵", lastMessage: "Alice: New roadmap is out!", time: "5m", unread: 12, isGroup: true, isTokenGated: true },
      { id: "3", name: "0xDeFi...3a9b", avatar: "D", lastMessage: "/research SOL report generated", time: "15m", unread: 0, isGroup: false, isTokenGated: false, isOnline: true },
      { id: "4", name: "NexusChat Official", avatar: "N", lastMessage: "Admin: v0.2.0 released!", time: "1h", unread: 5, isGroup: true, isTokenGated: false },
      { id: "5", name: "satoshi.btc", avatar: "S", lastMessage: "BTC on-chain data shows whale accumulation", time: "2h", unread: 0, isGroup: false, isTokenGated: false, isOnline: false },
      { id: "6", name: "DeFi Alpha 🔒", avatar: "🔑", lastMessage: "Bob: This new LP has 200%+ APY", time: "3h", unread: 0, isGroup: true, isTokenGated: true },
      { id: "7", name: "punk6529.eth", avatar: "P", lastMessage: "NFT market is recovering, watch Blur data", time: "1d", unread: 0, isGroup: false, isTokenGated: false, isOnline: false },
    ])
  );

  // Contacts
  const [contacts, setContacts] = useState<Contact[]>(() =>
    loadFromStorage("contacts", [
      { id: "1", name: "vitalik.eth", avatar: "V", address: "0x71C7...3a9b", isOnline: true, isFavorite: true, group: "DeFi" },
      { id: "2", name: "satoshi.btc", avatar: "S", address: "0x8F2a...7c1d", isOnline: false, isFavorite: true, group: "DeFi" },
      { id: "3", name: "punk6529.eth", avatar: "P", address: "0x3D4e...9f2a", isOnline: true, isFavorite: false, group: "NFT" },
      { id: "4", name: "alice.eth", avatar: "A", address: "0x5B6c...1e3f", isOnline: true, isFavorite: false, group: "DeFi" },
      { id: "5", name: "bob_dao.eth", avatar: "B", address: "0x9A1b...4d5e", isOnline: false, isFavorite: false, group: "DAO" },
      { id: "6", name: "whale_hunter.eth", avatar: "🐋", address: "0x2C3d...6f7g", isOnline: true, isFavorite: false, group: "Trading" },
      { id: "7", name: "defi_alpha.eth", avatar: "🔑", address: "0x7E8f...0a1b", isOnline: false, isFavorite: false, group: "DeFi" },
      { id: "8", name: "nft_collector.eth", avatar: "🎨", address: "0x4D5e...2c3d", isOnline: true, isFavorite: false, group: "NFT" },
    ])
  );

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    loadFromStorage("notifications", [
      { id: "1", type: "friend_request" as const, title: "whale_hunter.eth", message: "wants to add you as a contact", avatar: "🐋", time: "2m", read: false, actionable: true },
      { id: "2", type: "mention" as const, title: "BAYC Holders 🐵", message: "@you in group chat: Check out this alpha!", avatar: "🐵", time: "15m", read: false },
      { id: "3", type: "signal" as const, title: "Trading Signal", message: "New buy signal detected — AI Score 8.5/10", avatar: "📊", time: "32m", read: false, data: { token: "ETH", change: "+5.2%", score: "8.5/10" } },
      { id: "4", type: "social" as const, title: "vitalik.eth", message: "liked your post about Ethereum upgrade", avatar: "V", time: "1h", read: false },
      { id: "5", type: "social" as const, title: "punk6529.eth", message: "commented on your NFT collection post", avatar: "P", time: "2h", read: true },
      { id: "6", type: "signal" as const, title: "Trading Signal", message: "Strong buy signal — AI Score 9.1/10", avatar: "📊", time: "3h", read: true, data: { token: "SOL", change: "+12.8%", score: "9.1/10" } },
      { id: "7", type: "system" as const, title: "NexusChat", message: "v2.0 update available! New features: AI Research sharing, notification center", avatar: "N", time: "5h", read: true },
      { id: "8", type: "friend_request" as const, title: "defi_alpha.eth", message: "wants to add you as a contact", avatar: "🔑", time: "8h", read: true, actionable: true },
      { id: "9", type: "mention" as const, title: "DeFi Alpha Club 🔒", message: "@you: New yield farming opportunity on Arbitrum", avatar: "🔑", time: "12h", read: true },
      { id: "10", type: "system" as const, title: "NexusChat", message: "Security reminder: Enable 2FA for enhanced protection", avatar: "🔒", time: "1d", read: true },
    ])
  );

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() =>
    loadFromStorage("notificationSettings", defaultNotificationSettings)
  );

  // Persist on change
  useEffect(() => { saveToStorage("profile", profile); }, [profile]);
  useEffect(() => { saveToStorage("conversations", conversations); }, [conversations]);
  useEffect(() => { saveToStorage("contacts", contacts); }, [contacts]);
  useEffect(() => { saveToStorage("notifications", notifications); }, [notifications]);
  useEffect(() => { saveToStorage("notificationSettings", notificationSettings); }, [notificationSettings]);

  // Profile actions
  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  }, []);

  // Conversation actions
  const pinConversation = useCallback((id: string) => {
    setConversations(prev => prev.map(c =>
      c.id === id ? { ...c, isPinned: !c.isPinned } : c
    ));
  }, []);

  const muteConversation = useCallback((id: string) => {
    setConversations(prev => prev.map(c =>
      c.id === id ? { ...c, isMuted: !c.isMuted } : c
    ));
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
  }, []);

  const markConversationRead = useCallback((id: string) => {
    setConversations(prev => prev.map(c =>
      c.id === id ? { ...c, unread: 0 } : c
    ));
  }, []);

  // Contact actions
  const addContact = useCallback((contact: Contact) => {
    setContacts(prev => [...prev, contact]);
  }, []);

  const removeContact = useCallback((id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setContacts(prev => prev.map(c =>
      c.id === id ? { ...c, isFavorite: !c.isFavorite } : c
    ));
  }, []);

  const updateContactNote = useCallback((id: string, note: string) => {
    setContacts(prev => prev.map(c =>
      c.id === id ? { ...c, note } : c
    ));
  }, []);

  // Notification actions
  const unreadNotificationCount = notifications.filter(n => !n.read).length;

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n =>
      n.id === id ? { ...n, read: true } : n
    ));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const handleNotificationAction = useCallback((id: string, action: "accepted" | "declined") => {
    setNotifications(prev => prev.map(n =>
      n.id === id ? { ...n, actionTaken: action, read: true } : n
    ));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Notification Settings
  const updateNotificationSettings = useCallback((updates: Partial<NotificationSettings>) => {
    setNotificationSettings(prev => ({ ...prev, ...updates }));
  }, []);

  // Computed
  const totalUnreadMessages = conversations.reduce((sum, c) => sum + c.unread, 0);

  const value: AppState = {
    profile,
    updateProfile,
    conversations,
    pinConversation,
    muteConversation,
    deleteConversation,
    markConversationRead,
    contacts,
    addContact,
    removeContact,
    toggleFavorite,
    updateContactNote,
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    handleNotificationAction,
    clearAllNotifications,
    notificationSettings,
    updateNotificationSettings,
    totalUnreadMessages,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
