/*
 * Contacts — 通讯录/联系人管理页面
 * 好友申请流程（发送→等待→通过/拒绝）、分组管理
 * 按字母排序、搜索ENS/地址、好友备注
 * Cyberpunk Noir风格
 */
import { useState, useMemo } from "react";
import {
  Search, UserPlus, Star, Copy, Edit3, ArrowLeft, X, Check, MoreVertical,
  Users, FolderPlus, Clock, UserCheck, UserX, ChevronDown, ChevronRight,
  Tag, Inbox, Bell, Filter,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLocation } from "wouter";
import { useI18n } from "@/contexts/I18nContext";

/* ─── Types ─── */
interface Contact {
  id: string;
  name: string;
  avatar: string;
  address: string;
  ens?: string;
  note?: string;
  isVerified: boolean;
  isFavorite: boolean;
  lastActive: string;
  group: string;
  tags: string[];
}

type FriendRequestStatus = "pending" | "accepted" | "rejected";

interface FriendRequest {
  id: string;
  from: { name: string; avatar: string; address: string; };
  message: string;
  timestamp: string;
  status: FriendRequestStatus;
  direction: "incoming" | "outgoing";
}

interface ContactGroup {
  id: string;
  name: string;
  color: string;
  icon: string;
}

/* ─── Mock Data ─── */
const defaultGroups: ContactGroup[] = [
  { id: "defi", name: "DeFi", color: "neon-cyan", icon: "💎" },
  { id: "nft", name: "NFT", color: "neon-purple", icon: "🎨" },
  { id: "dev", name: "Developers", color: "neon-green", icon: "⚡" },
  { id: "trading", name: "Trading", color: "neon-red", icon: "📊" },
  { id: "dao", name: "DAO", color: "yellow-400", icon: "🏛️" },
];

const mockContacts: Contact[] = [
  { id: "1", name: "alice.eth", avatar: "A", address: "0x71C7...3a9b", ens: "alice.eth", note: "DeFi研究员", isVerified: true, isFavorite: true, lastActive: "Online", group: "A", tags: ["defi"] },
  { id: "2", name: "bob_trader", avatar: "B", address: "0xA3F2...8c1d", note: "量化交易员", isVerified: true, isFavorite: true, lastActive: "2h ago", group: "B", tags: ["trading"] },
  { id: "3", name: "charlie.eth", avatar: "C", address: "0xB9E4...2f7a", ens: "charlie.eth", isVerified: false, isFavorite: false, lastActive: "1d ago", group: "C", tags: [] },
  { id: "4", name: "david_nft", avatar: "D", address: "0xD5C1...9e3b", note: "NFT收藏家", isVerified: true, isFavorite: false, lastActive: "3h ago", group: "D", tags: ["nft"] },
  { id: "5", name: "emma.eth", avatar: "E", address: "0xE2F8...4d5c", ens: "emma.eth", note: "Solana开发者", isVerified: true, isFavorite: true, lastActive: "Online", group: "E", tags: ["dev"] },
  { id: "6", name: "frank_dev", avatar: "F", address: "0xF1A3...7b2e", isVerified: false, isFavorite: false, lastActive: "5h ago", group: "F", tags: ["dev"] },
  { id: "7", name: "grace.eth", avatar: "G", address: "0xG4B7...1c8f", ens: "grace.eth", note: "DAO治理专家", isVerified: true, isFavorite: false, lastActive: "12h ago", group: "G", tags: ["dao"] },
  { id: "8", name: "henry_whale", avatar: "H", address: "0xH8D2...5a3g", note: "巨鲸", isVerified: true, isFavorite: true, lastActive: "Online", group: "H", tags: ["trading", "defi"] },
  { id: "9", name: "iris.eth", avatar: "I", address: "0xI9E5...2b7h", ens: "iris.eth", isVerified: false, isFavorite: false, lastActive: "2d ago", group: "I", tags: [] },
  { id: "10", name: "jack_alpha", avatar: "J", address: "0xJ3F1...8c4i", note: "Alpha猎手", isVerified: true, isFavorite: false, lastActive: "1h ago", group: "J", tags: ["trading"] },
  { id: "11", name: "kate.eth", avatar: "K", address: "0xK7A2...3d9j", ens: "kate.eth", isVerified: true, isFavorite: false, lastActive: "4h ago", group: "K", tags: ["nft"] },
  { id: "12", name: "luna_art", avatar: "L", address: "0xL2B8...6e1k", note: "链上艺术家", isVerified: false, isFavorite: false, lastActive: "6h ago", group: "L", tags: ["nft"] },
];

const mockRequests: FriendRequest[] = [
  { id: "r1", from: { name: "whale_0x.eth", avatar: "🐋", address: "0xM4C9...7d2f" }, message: "Hi! I saw your DeFi analysis, would love to connect.", timestamp: "10m ago", status: "pending", direction: "incoming" },
  { id: "r2", from: { name: "nft_king.eth", avatar: "👑", address: "0xN7B3...5e8g" }, message: "Fellow NFT collector here. Let's chat!", timestamp: "2h ago", status: "pending", direction: "incoming" },
  { id: "r3", from: { name: "alpha_seeker", avatar: "🔍", address: "0xP2D6...9f1h" }, message: "Can we share alpha?", timestamp: "5h ago", status: "pending", direction: "incoming" },
  { id: "r4", from: { name: "dao_builder.eth", avatar: "🏗️", address: "0xQ8E1...3a4i" }, message: "Interested in DAO governance collaboration", timestamp: "1d ago", status: "accepted", direction: "incoming" },
  { id: "r5", from: { name: "crypto_sage", avatar: "🧙", address: "0xR5F7...6b2j" }, message: "Let's connect!", timestamp: "3h ago", status: "pending", direction: "outgoing" },
  { id: "r6", from: { name: "defi_wizard", avatar: "🧪", address: "0xS1G4...8c5k" }, message: "Want to discuss yield strategies", timestamp: "6h ago", status: "pending", direction: "outgoing" },
];

/* ─── Component ─── */
export default function Contacts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState(mockContacts);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addAddress, setAddAddress] = useState("");
  const [addNote, setAddNote] = useState("");
  const [addMessage, setAddMessage] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState("");
  const [, navigate] = useLocation();
  const { t } = useI18n();

  // Friend requests state
  const [requests, setRequests] = useState(mockRequests);
  const [showRequests, setShowRequests] = useState(false);
  const [requestTab, setRequestTab] = useState<"incoming" | "outgoing">("incoming");

  // Group management state
  const [groups, setGroups] = useState(defaultGroups);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [activeGroupFilter, setActiveGroupFilter] = useState<string | null>(null);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupIcon, setNewGroupIcon] = useState("📁");
  const [assigningGroupTo, setAssigningGroupTo] = useState<string | null>(null);

  const pendingIncoming = requests.filter((r) => r.status === "pending" && r.direction === "incoming");
  const pendingOutgoing = requests.filter((r) => r.status === "pending" && r.direction === "outgoing");

  const filteredContacts = useMemo(() => {
    let list = contacts;
    if (activeGroupFilter) {
      list = list.filter((c) => c.tags.includes(activeGroupFilter));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q) ||
          (c.ens && c.ens.toLowerCase().includes(q)) ||
          (c.note && c.note.toLowerCase().includes(q))
      );
    }
    return list;
  }, [contacts, searchQuery, activeGroupFilter]);

  // Group by first letter
  const grouped = filteredContacts.reduce<Record<string, Contact[]>>((acc, contact) => {
    const letter = contact.group;
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(contact);
    return acc;
  }, {});

  const sortedLetters = Object.keys(grouped).sort();
  const favoriteContacts = contacts.filter((c) => c.isFavorite);

  const toggleFavorite = (id: string) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isFavorite: !c.isFavorite } : c))
    );
    if (selectedContact?.id === id) {
      setSelectedContact((prev) => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
    }
  };

  const saveNote = (id: string) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, note: editNoteText } : c))
    );
    setEditingNote(null);
    toast(t("contacts.noteSaved") || "Note saved");
  };

  const handleAddContact = () => {
    if (!addAddress.trim()) return;
    // Create as a friend request (outgoing)
    const newRequest: FriendRequest = {
      id: `r-${Date.now()}`,
      from: {
        name: addAddress.includes(".eth") ? addAddress : `${addAddress.slice(0, 6)}...${addAddress.slice(-4)}`,
        avatar: (addAddress[0] || "?").toUpperCase(),
        address: addAddress.includes(".eth") ? "0x" + Math.random().toString(16).slice(2, 6) + "..." + Math.random().toString(16).slice(2, 6) : addAddress,
      },
      message: addMessage || "Let's connect!",
      timestamp: t("discover.justNow") || "Just now",
      status: "pending",
      direction: "outgoing",
    };
    setRequests((prev) => [newRequest, ...prev]);
    setAddAddress("");
    setAddNote("");
    setAddMessage("");
    setShowAddModal(false);
    toast(t("contacts.requestSent") || "Friend request sent! 📤");
  };

  const acceptRequest = (id: string) => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "accepted" as FriendRequestStatus } : r))
    );
    // Add to contacts
    const newContact: Contact = {
      id: `c-${Date.now()}`,
      name: req.from.name,
      avatar: req.from.avatar,
      address: req.from.address,
      ens: req.from.name.includes(".eth") ? req.from.name : undefined,
      isVerified: false,
      isFavorite: false,
      lastActive: "Just added",
      group: (req.from.name[0] || "?").toUpperCase(),
      tags: [],
    };
    setContacts((prev) => [...prev, newContact]);
    toast(t("contacts.requestAccepted") || `${req.from.name} is now your contact! 🎉`);
  };

  const rejectRequest = (id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "rejected" as FriendRequestStatus } : r))
    );
    toast(t("contacts.requestRejected") || "Request declined");
  };

  const toggleContactTag = (contactId: string, tagId: string) => {
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contactId
          ? { ...c, tags: c.tags.includes(tagId) ? c.tags.filter((t) => t !== tagId) : [...c.tags, tagId] }
          : c
      )
    );
  };

  const addNewGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup: ContactGroup = {
      id: `g-${Date.now()}`,
      name: newGroupName,
      color: "neon-cyan",
      icon: newGroupIcon,
    };
    setGroups((prev) => [...prev, newGroup]);
    setNewGroupName("");
    setNewGroupIcon("📁");
    setShowNewGroupModal(false);
    toast(t("contacts.groupCreated") || "Group created! 📂");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="glass sticky top-0 z-10 px-4 pt-[env(safe-area-inset-top)] border-b border-border/30">
        <div className="flex items-center gap-3 h-14">
          <button onClick={() => navigate("/app/chat")} className="p-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-semibold font-display flex-1">{t("contacts.title") || "Contacts"}</h1>

          {/* Friend Requests Badge */}
          <button
            onClick={() => setShowRequests(true)}
            className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
          >
            <Inbox size={20} />
            {pendingIncoming.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-neon-red text-[9px] text-white flex items-center justify-center font-bold min-w-[18px] px-1">
                {pendingIncoming.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="p-2 rounded-xl text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
          >
            <UserPlus size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="relative pb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-[calc(50%+6px)] text-muted-foreground" />
          <input
            type="text"
            placeholder={t("contacts.search") || "Search ENS, address, or note..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-xl bg-secondary/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-all"
          />
        </div>

        {/* Group filter chips */}
        <div className="flex gap-1.5 pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveGroupFilter(null)}
            className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
              !activeGroupFilter
                ? "bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30"
                : "bg-secondary/30 text-muted-foreground border border-border/20"
            }`}
          >
            {t("contacts.allGroups") || "All"}
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setActiveGroupFilter(activeGroupFilter === g.id ? null : g.id)}
              className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 ${
                activeGroupFilter === g.id
                  ? `bg-${g.color}/15 text-${g.color} border border-${g.color}/30`
                  : "bg-secondary/30 text-muted-foreground border border-border/20"
              }`}
            >
              <span className="text-[10px]">{g.icon}</span>
              {g.name}
              <span className="text-[9px] opacity-60">
                {contacts.filter((c) => c.tags.includes(g.id)).length}
              </span>
            </button>
          ))}
          <button
            onClick={() => setShowNewGroupModal(true)}
            className="shrink-0 px-2 py-1 rounded-lg text-[11px] text-muted-foreground border border-dashed border-border/30 hover:border-neon-cyan/30 hover:text-neon-cyan transition-all"
          >
            <FolderPlus size={12} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Favorites Section */}
        {!searchQuery && !activeGroupFilter && favoriteContacts.length > 0 && (
          <div className="px-4 py-3">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              ★ {t("contacts.favorites") || "Favorites"}
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {favoriteContacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedContact(c)}
                  className="flex flex-col items-center gap-1.5 shrink-0 w-16"
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12 ring-2 ring-neon-cyan/30">
                      <AvatarFallback className="bg-neon-cyan/10 text-neon-cyan font-display text-base">{c.avatar}</AvatarFallback>
                    </Avatar>
                    {c.lastActive === "Online" && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-neon-green border-2 border-background" />
                    )}
                  </div>
                  <span className="text-[10px] text-foreground truncate w-full text-center">{c.name.split(".")[0]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Alphabetical Contact List */}
        <div className="relative">
          {sortedLetters.map((letter) => (
            <div key={letter}>
              <div className="sticky top-0 z-[5] px-4 py-1.5 bg-background/80 backdrop-blur-sm">
                <span className="text-[11px] font-bold text-neon-cyan font-mono">{letter}</span>
              </div>
              {grouped[letter].map((contact) => (
                <motion.button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors text-left"
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="relative">
                    <Avatar className="w-11 h-11 shrink-0">
                      <AvatarFallback className="bg-secondary text-sm font-display">{contact.avatar}</AvatarFallback>
                    </Avatar>
                    {contact.lastActive === "Online" && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-neon-green border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">{contact.name}</span>
                      {contact.isVerified && <Star size={11} className="text-neon-cyan fill-neon-cyan shrink-0" />}
                      {contact.isFavorite && <Star size={11} className="text-yellow-400 fill-yellow-400 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground font-mono">{contact.address}</span>
                      {contact.note && (
                        <span className="text-[10px] text-neon-purple/70">· {contact.note}</span>
                      )}
                    </div>
                    {/* Tag pills */}
                    {contact.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {contact.tags.map((tagId) => {
                          const grp = groups.find((g) => g.id === tagId);
                          return grp ? (
                            <span key={tagId} className="text-[8px] px-1.5 py-0.5 rounded-full bg-secondary/40 text-muted-foreground">
                              {grp.icon} {grp.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{contact.lastActive}</span>
                </motion.button>
              ))}
            </div>
          ))}

          {/* Alphabet sidebar */}
          <div className="fixed right-1 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 z-20">
            {sortedLetters.map((letter) => (
              <button
                key={letter}
                className="w-4 h-4 flex items-center justify-center text-[8px] text-muted-foreground hover:text-neon-cyan font-mono"
              >
                {letter}
              </button>
            ))}
          </div>
        </div>

        {/* Empty state for filtered */}
        {filteredContacts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users size={32} className="text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">{t("contacts.noResults") || "No contacts found"}</p>
          </div>
        )}

        {/* Total count */}
        <div className="px-4 py-6 text-center">
          <span className="text-[11px] text-muted-foreground">
            {filteredContacts.length} {t("contacts.total") || "contacts"}
            {activeGroupFilter && ` · ${groups.find((g) => g.id === activeGroupFilter)?.name || ""}`}
          </span>
        </div>
      </div>

      {/* ─── Contact Detail Sheet ─── */}
      <AnimatePresence>
        {selectedContact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
            onClick={() => { setSelectedContact(null); setEditingNote(null); setAssigningGroupTo(null); }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-card border-t border-border/30 rounded-t-3xl overflow-hidden max-h-[85vh] overflow-y-auto"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              <div className="px-5 pb-6 space-y-5">
                {/* Profile header */}
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="bg-neon-cyan/10 text-neon-cyan text-2xl font-display">{selectedContact.avatar}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-lg font-bold font-display">{selectedContact.name}</h3>
                      {selectedContact.isVerified && <Star size={14} className="text-neon-cyan fill-neon-cyan" />}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground font-mono">{selectedContact.address}</span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(selectedContact.address); toast("Address copied"); }}
                        className="text-muted-foreground hover:text-neon-cyan"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                    {selectedContact.ens && (
                      <span className="text-[11px] text-neon-purple font-mono">{selectedContact.ens}</span>
                    )}
                  </div>
                </div>

                {/* Note */}
                <div className="p-3 rounded-xl bg-secondary/30 border border-border/20">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-muted-foreground font-medium">{t("contacts.note") || "Note"}</span>
                    {editingNote !== selectedContact.id ? (
                      <button
                        onClick={() => { setEditingNote(selectedContact.id); setEditNoteText(selectedContact.note || ""); }}
                        className="text-muted-foreground hover:text-neon-cyan"
                      >
                        <Edit3 size={12} />
                      </button>
                    ) : (
                      <button
                        onClick={() => saveNote(selectedContact.id)}
                        className="text-neon-green hover:opacity-80"
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                  {editingNote === selectedContact.id ? (
                    <input
                      autoFocus
                      value={editNoteText}
                      onChange={(e) => setEditNoteText(e.target.value)}
                      placeholder="Add a note..."
                      className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                      onKeyDown={(e) => { if (e.key === "Enter") saveNote(selectedContact.id); }}
                    />
                  ) : (
                    <p className="text-sm text-foreground">{selectedContact.note || "No note"}</p>
                  )}
                </div>

                {/* Group tags */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                      <Tag size={11} /> {t("contacts.groups") || "Groups"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {groups.map((g) => {
                      const isActive = selectedContact.tags.includes(g.id);
                      return (
                        <button
                          key={g.id}
                          onClick={() => toggleContactTag(selectedContact.id, g.id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1 ${
                            isActive
                              ? "bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30"
                              : "bg-secondary/30 text-muted-foreground border border-border/20 hover:border-neon-cyan/20"
                          }`}
                        >
                          <span>{g.icon}</span>
                          {g.name}
                          {isActive && <Check size={10} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => { navigate(`/app/chat/${selectedContact.id}`); setSelectedContact(null); }}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 hover:bg-neon-cyan/15 transition-colors"
                  >
                    <span className="text-neon-cyan text-lg">💬</span>
                    <span className="text-[10px] text-neon-cyan font-medium">{t("contacts.sendMsg") || "Message"}</span>
                  </button>
                  <button
                    onClick={() => toggleFavorite(selectedContact.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-colors ${
                      selectedContact.isFavorite
                        ? "bg-yellow-400/10 border-yellow-400/20"
                        : "bg-secondary/30 border-border/20 hover:bg-secondary/50"
                    }`}
                  >
                    <Star size={18} className={selectedContact.isFavorite ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"} />
                    <span className="text-[10px] font-medium text-muted-foreground">{selectedContact.isFavorite ? (t("contacts.unfav") || "Unfavorite") : (t("contacts.fav") || "Favorite")}</span>
                  </button>
                  <button
                    onClick={() => {
                      const amount = prompt(`${t("contacts.transferTo") || "Transfer ETH to"} ${selectedContact.name}:`);
                      if (amount) toast.success(`${t("contacts.transferSent") || "Sent"} ${amount} ETH → ${selectedContact.name}`);
                    }}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-neon-purple/10 border border-neon-purple/20 hover:bg-neon-purple/15 transition-colors"
                  >
                    <span className="text-neon-purple text-lg">💸</span>
                    <span className="text-[10px] text-neon-purple font-medium">{t("contacts.transfer") || "Transfer"}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Friend Requests Sheet ─── */}
      <AnimatePresence>
        {showRequests && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setShowRequests(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-card border-t border-border/30 rounded-t-3xl overflow-hidden max-h-[80vh]"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              <div className="px-5 pb-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold font-display flex items-center gap-2">
                    <Bell size={18} className="text-neon-cyan" />
                    {t("contacts.friendRequests") || "Friend Requests"}
                  </h3>
                  <button onClick={() => setShowRequests(false)} className="text-muted-foreground hover:text-foreground">
                    <X size={18} />
                  </button>
                </div>

                {/* Tabs: Incoming / Outgoing */}
                <div className="flex gap-0 mb-4 border-b border-border/20">
                  <button
                    onClick={() => setRequestTab("incoming")}
                    className={`flex-1 py-2 text-sm font-medium border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                      requestTab === "incoming"
                        ? "border-neon-cyan text-foreground"
                        : "border-transparent text-muted-foreground"
                    }`}
                  >
                    <Inbox size={14} />
                    {t("contacts.received") || "Received"}
                    {pendingIncoming.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-neon-red/15 text-neon-red text-[9px] font-bold">{pendingIncoming.length}</span>
                    )}
                  </button>
                  <button
                    onClick={() => setRequestTab("outgoing")}
                    className={`flex-1 py-2 text-sm font-medium border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                      requestTab === "outgoing"
                        ? "border-neon-cyan text-foreground"
                        : "border-transparent text-muted-foreground"
                    }`}
                  >
                    <Clock size={14} />
                    {t("contacts.sent") || "Sent"}
                    {pendingOutgoing.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-secondary/60 text-muted-foreground text-[9px] font-bold">{pendingOutgoing.length}</span>
                    )}
                  </button>
                </div>

                {/* Request list */}
                <div className="space-y-3 overflow-y-auto max-h-[50vh]">
                  {(requestTab === "incoming"
                    ? requests.filter((r) => r.direction === "incoming")
                    : requests.filter((r) => r.direction === "outgoing")
                  ).map((req) => (
                    <motion.div
                      key={req.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        req.status === "pending"
                          ? "bg-card/50 border-border/20"
                          : req.status === "accepted"
                          ? "bg-neon-green/5 border-neon-green/15"
                          : "bg-secondary/20 border-border/10 opacity-60"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10 shrink-0">
                          <AvatarFallback className="bg-secondary text-sm">{req.from.avatar}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold truncate">{req.from.name}</span>
                            <span className="text-[9px] text-muted-foreground font-mono">{req.from.address}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">"{req.message}"</p>
                          <span className="text-[9px] text-muted-foreground mt-1 block">{req.timestamp}</span>
                        </div>

                        {/* Status / Actions */}
                        {req.status === "pending" && req.direction === "incoming" && (
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => acceptRequest(req.id)}
                              className="p-2 rounded-xl bg-neon-green/15 text-neon-green border border-neon-green/20 hover:bg-neon-green/25 transition-colors"
                            >
                              <UserCheck size={16} />
                            </button>
                            <button
                              onClick={() => rejectRequest(req.id)}
                              className="p-2 rounded-xl bg-secondary/30 text-muted-foreground border border-border/20 hover:bg-secondary/50 transition-colors"
                            >
                              <UserX size={16} />
                            </button>
                          </div>
                        )}
                        {req.status === "pending" && req.direction === "outgoing" && (
                          <span className="shrink-0 px-2.5 py-1 rounded-lg bg-secondary/30 text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock size={10} />
                            {t("contacts.waiting") || "Waiting"}
                          </span>
                        )}
                        {req.status === "accepted" && (
                          <span className="shrink-0 px-2.5 py-1 rounded-lg bg-neon-green/10 text-[10px] text-neon-green flex items-center gap-1">
                            <Check size={10} />
                            {t("contacts.accepted") || "Accepted"}
                          </span>
                        )}
                        {req.status === "rejected" && (
                          <span className="shrink-0 px-2.5 py-1 rounded-lg bg-secondary/20 text-[10px] text-muted-foreground flex items-center gap-1">
                            <X size={10} />
                            {t("contacts.declined") || "Declined"}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {/* Empty state */}
                  {(requestTab === "incoming"
                    ? requests.filter((r) => r.direction === "incoming")
                    : requests.filter((r) => r.direction === "outgoing")
                  ).length === 0 && (
                    <div className="text-center py-8">
                      <Inbox size={28} className="text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">{t("contacts.noRequests") || "No requests"}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Add Contact / Send Request Modal ─── */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-6"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-card border border-border/30 rounded-2xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold font-display">{t("contacts.addContact") || "Add Contact"}</h3>
                <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium mb-1 block">{t("contacts.addressLabel") || "Wallet Address or ENS"}</label>
                  <input
                    autoFocus
                    value={addAddress}
                    onChange={(e) => setAddAddress(e.target.value)}
                    placeholder="0x... or name.eth"
                    className="w-full h-10 px-3 rounded-xl bg-secondary/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium mb-1 block">{t("contacts.requestMessage") || "Message (optional)"}</label>
                  <input
                    value={addMessage}
                    onChange={(e) => setAddMessage(e.target.value)}
                    placeholder={t("contacts.requestPlaceholder") || "Say hi! Tell them why you want to connect..."}
                    className="w-full h-10 px-3 rounded-xl bg-secondary/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-all"
                  />
                </div>
              </div>

              <button
                onClick={handleAddContact}
                disabled={!addAddress.trim()}
                className={`w-full h-11 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                  addAddress.trim()
                    ? "bg-gradient-to-r from-neon-cyan to-neon-purple text-background hover:opacity-90"
                    : "bg-secondary/40 text-muted-foreground cursor-not-allowed"
                }`}
              >
                <UserPlus size={16} />
                {t("contacts.sendRequest") || "Send Friend Request"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── New Group Modal ─── */}
      <AnimatePresence>
        {showNewGroupModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-6"
            onClick={() => setShowNewGroupModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs bg-card border border-border/30 rounded-2xl p-5 space-y-4"
            >
              <h3 className="text-base font-bold font-display">{t("contacts.newGroup") || "New Group"}</h3>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium mb-1 block">{t("contacts.groupIcon") || "Icon"}</label>
                  <div className="flex gap-2 flex-wrap">
                    {["📁", "💎", "🎨", "⚡", "📊", "🏛️", "🔥", "🌐", "🎯", "🛡️", "🧪", "🎮"].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => setNewGroupIcon(emoji)}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-base transition-all ${
                          newGroupIcon === emoji
                            ? "bg-neon-cyan/15 border border-neon-cyan/30 scale-110"
                            : "bg-secondary/30 border border-border/20 hover:bg-secondary/50"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium mb-1 block">{t("contacts.groupName") || "Name"}</label>
                  <input
                    autoFocus
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder={t("contacts.groupNamePlaceholder") || "e.g. Whale Friends"}
                    className="w-full h-10 px-3 rounded-xl bg-secondary/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-all"
                    onKeyDown={(e) => { if (e.key === "Enter") addNewGroup(); }}
                  />
                </div>
              </div>

              <button
                onClick={addNewGroup}
                disabled={!newGroupName.trim()}
                className={`w-full h-10 rounded-xl font-medium text-sm transition-all ${
                  newGroupName.trim()
                    ? "bg-neon-cyan text-background hover:opacity-90"
                    : "bg-secondary/40 text-muted-foreground cursor-not-allowed"
                }`}
              >
                {t("contacts.createGroup") || "Create Group"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
