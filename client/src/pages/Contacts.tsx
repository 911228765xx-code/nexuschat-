/*
 * Contacts — 通讯录/联系人管理页面
 * 按字母排序、搜索ENS/地址、好友备注、分组管理
 * Cyberpunk Noir风格
 */
import { useState } from "react";
import { Search, UserPlus, Star, Copy, Edit3, ArrowLeft, X, Check, MoreVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLocation } from "wouter";
import { useI18n } from "@/contexts/I18nContext";

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
}

const mockContacts: Contact[] = [
  { id: "1", name: "alice.eth", avatar: "A", address: "0x71C7...3a9b", ens: "alice.eth", note: "DeFi研究员", isVerified: true, isFavorite: true, lastActive: "Online", group: "A" },
  { id: "2", name: "bob_trader", avatar: "B", address: "0xA3F2...8c1d", note: "量化交易员", isVerified: true, isFavorite: true, lastActive: "2h ago", group: "B" },
  { id: "3", name: "charlie.eth", avatar: "C", address: "0xB9E4...2f7a", ens: "charlie.eth", isVerified: false, isFavorite: false, lastActive: "1d ago", group: "C" },
  { id: "4", name: "david_nft", avatar: "D", address: "0xD5C1...9e3b", note: "NFT收藏家", isVerified: true, isFavorite: false, lastActive: "3h ago", group: "D" },
  { id: "5", name: "emma.eth", avatar: "E", address: "0xE2F8...4d5c", ens: "emma.eth", note: "Solana开发者", isVerified: true, isFavorite: true, lastActive: "Online", group: "E" },
  { id: "6", name: "frank_dev", avatar: "F", address: "0xF1A3...7b2e", isVerified: false, isFavorite: false, lastActive: "5h ago", group: "F" },
  { id: "7", name: "grace.eth", avatar: "G", address: "0xG4B7...1c8f", ens: "grace.eth", note: "DAO治理专家", isVerified: true, isFavorite: false, lastActive: "12h ago", group: "G" },
  { id: "8", name: "henry_whale", avatar: "H", address: "0xH8D2...5a3g", note: "巨鲸", isVerified: true, isFavorite: true, lastActive: "Online", group: "H" },
  { id: "9", name: "iris.eth", avatar: "I", address: "0xI9E5...2b7h", ens: "iris.eth", isVerified: false, isFavorite: false, lastActive: "2d ago", group: "I" },
  { id: "10", name: "jack_alpha", avatar: "J", address: "0xJ3F1...8c4i", note: "Alpha猎手", isVerified: true, isFavorite: false, lastActive: "1h ago", group: "J" },
  { id: "11", name: "kate.eth", avatar: "K", address: "0xK7A2...3d9j", ens: "kate.eth", isVerified: true, isFavorite: false, lastActive: "4h ago", group: "K" },
  { id: "12", name: "luna_art", avatar: "L", address: "0xL2B8...6e1k", note: "链上艺术家", isVerified: false, isFavorite: false, lastActive: "6h ago", group: "L" },
];

export default function Contacts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState(mockContacts);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addAddress, setAddAddress] = useState("");
  const [addNote, setAddNote] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState("");
  const [, navigate] = useLocation();
  const { t } = useI18n();

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.ens && c.ens.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.note && c.note.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
  };

  const saveNote = (id: string) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, note: editNoteText } : c))
    );
    setEditingNote(null);
    toast("Note saved");
  };

  const handleAddContact = () => {
    if (!addAddress.trim()) return;
    const newContact: Contact = {
      id: Date.now().toString(),
      name: addAddress.includes(".eth") ? addAddress : `${addAddress.slice(0, 6)}...${addAddress.slice(-4)}`,
      avatar: addAddress[0]?.toUpperCase() || "?",
      address: addAddress.includes(".eth") ? "0x" + Math.random().toString(16).slice(2, 6) + "..." + Math.random().toString(16).slice(2, 6) : addAddress,
      ens: addAddress.includes(".eth") ? addAddress : undefined,
      note: addNote || undefined,
      isVerified: false,
      isFavorite: false,
      lastActive: "Just added",
      group: (addAddress[0] || "?").toUpperCase(),
    };
    setContacts((prev) => [...prev, newContact]);
    setAddAddress("");
    setAddNote("");
    setShowAddModal(false);
    toast("Contact added! ✅");
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
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Favorites Section */}
        {!searchQuery && favoriteContacts.length > 0 && (
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

        {/* Total count */}
        <div className="px-4 py-6 text-center">
          <span className="text-[11px] text-muted-foreground">
            {contacts.length} {t("contacts.total") || "contacts"}
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
            onClick={() => { setSelectedContact(null); setEditingNote(null); }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-card border-t border-border/30 rounded-t-3xl overflow-hidden"
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
                    onClick={() => toast("Transfer coming soon")}
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

      {/* ─── Add Contact Modal ─── */}
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
                  <label className="text-[11px] text-muted-foreground font-medium mb-1 block">{t("contacts.noteLabel") || "Note (optional)"}</label>
                  <input
                    value={addNote}
                    onChange={(e) => setAddNote(e.target.value)}
                    placeholder="e.g. DeFi researcher"
                    className="w-full h-10 px-3 rounded-xl bg-secondary/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-all"
                  />
                </div>
              </div>

              <button
                onClick={handleAddContact}
                disabled={!addAddress.trim()}
                className={`w-full h-11 rounded-xl font-medium text-sm transition-all ${
                  addAddress.trim()
                    ? "bg-gradient-to-r from-neon-cyan to-neon-purple text-background hover:opacity-90"
                    : "bg-secondary/40 text-muted-foreground cursor-not-allowed"
                }`}
              >
                {t("contacts.add") || "Add Contact"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
