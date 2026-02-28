# NexusChat TODO — 全面修复计划

## 工程质量修复
- [x] 删除冗余文件 server/socketService.ts
- [x] 修复 RainbowKit projectId 警告（替换为有效占位符或禁用 WalletConnect）
- [x] 修复 PostDetail 评论高频轮询（10s→30s）
- [x] GroupChatRoom 接入 Socket.IO 实时消息

## 私信（DM）持久化
- [ ] schema.ts 添加 directMessages 表
- [ ] 执行 db:push 迁移
- [ ] chat.ts 添加 DM 接口（sendDM, getDMHistory, listDMConversations）
- [ ] ChatRoom.tsx 接入真实 DM 数据

## Contacts 页面
- [ ] schema.ts 添加 contacts/friendRequests 表
- [ ] 执行 db:push 迁移
- [ ] 新建 contacts.ts 路由（sendRequest, acceptRequest, rejectRequest, listContacts, listRequests）
- [ ] routers.ts 注册 contacts 路由
- [ ] Contacts.tsx 接入真实数据

## Research 预警
- [x] Research.tsx 接入 research.createAlert
- [x] Research.tsx 接入 research.myAlerts
- [ ] Research.tsx 接入 research.getPrice（实时价格）

## TokenDetail 真实数据
- [x] TokenDetail.tsx 接入 trading.getPrices
- [x] TokenDetail.tsx 接入 trading.getChart

## Discover Users Tab
- [x] Discover.tsx Users Tab 接入 user.leaderboard 替换 mockUsers

## Watchlist 持久化
- [ ] schema.ts 添加 watchlist 表
- [ ] 执行 db:push 迁移
- [ ] 新建 watchlist.ts 路由（addToWatchlist, removeFromWatchlist, getWatchlist, updateAlert）
- [ ] routers.ts 注册 watchlist 路由
- [ ] Watchlist.tsx 接入真实数据

## 测试与交付
- [x] 运行 pnpm test 确认全部通过（97 个测试全部通过）
- [ ] 保存检查点
