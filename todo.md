# NexusChat TODO — 全面修复计划

## 工程质量修复
- [x] 删除冗余文件 server/socketService.ts
- [x] 修复 RainbowKit projectId 警告（替换为有效占位符或禁用 WalletConnect）
- [x] 修复 PostDetail 评论高频轮询（10s→30s）
- [x] GroupChatRoom 接入 Socket.IO 实时消息（替换 3s 轮询）

## 私信（DM）持久化
- [x] schema.ts messages 表已有 receiverId 字段，天然支持 DM（无需新建表）
- [x] db:push 迁移（messages 表已存在，idx_dm_messages 索引已存在）
- [x] chat.ts 添加 DM 接口（sendDM, getDMHistory, listDMConversations）
- [x] DMChat.tsx 新建私信页面，接入 getDMHistory + sendDM
- [x] Chat.tsx 接入 listDMConversations，真实 DM 会话显示在对话列表

## Contacts 页面
- [x] schema.ts userFollows 表已存在，可作为联系人关系基础
- [x] Contacts.tsx 接入 follow.getFollowing，已关注用户作为真实联系人展示
- [ ] 独立 contacts/friendRequests 表（好友申请流程，需 db:push 迁移）
- [ ] 新建 contacts.ts 路由（sendRequest, acceptRequest, rejectRequest, listRequests）
- [ ] Contacts.tsx 好友申请 UI 接入真实接口（当前仍为 mock requests）

## Research 预警
- [x] Research.tsx 接入 research.createAlert
- [x] Research.tsx 接入 research.myAlerts
- [x] Research.tsx 接入 research.getPrice（RealtimePrice 组件，2 分钟刷新）

## TokenDetail 真实数据
- [x] TokenDetail.tsx 接入 trading.getPrices
- [x] TokenDetail.tsx 接入 trading.getChart

## Discover Users Tab
- [x] Discover.tsx Users Tab 接入 user.leaderboard 替换 mockUsers

## Watchlist
- [x] Watchlist.tsx 接入 trading.getPrices 实时价格（60s 刷新）
- [ ] Watchlist 数据库持久化（跨设备同步，需 db:push 迁移）

## 测试与交付
- [x] 运行 pnpm test 确认全部通过（97 个测试全部通过）
- [x] 保存检查点 v17.0

## 三项优化（v19）
- [x] 修复 DMChat Socket.IO 路径（"/ " → window.location.origin + /api/socket.io）
- [x] DMChat 连接后注册 register_user
- [x] sendDM 服务端调用 emitToUser 推送 dm_message 给接收方
- [x] Settings.tsx handleLogout 接入 trpc.auth.logout 真正清除 session
- [x] Contacts.tsx 添加联系人改为用户搜索 + sendRequest 接入
- [x] Notifications.tsx system 类型价格预警映射为 signal Tab
