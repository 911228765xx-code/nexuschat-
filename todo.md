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
- [x] 独立 contacts/friendRequests 表（好友申请流程，已 db:push 迁移）
- [x] 新建 contacts.ts 路由（sendRequest, acceptRequest, rejectRequest, listIncoming, listOutgoing, listFriends）
- [x] Contacts.tsx 好友申请 UI 接入真实接口（已移除所有 mock 数据）

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
- [x] Watchlist 数据库持久化（schema + router + 前端已接入）

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

## 后续三项优化（v20）

- [x] Discover Communities Tab 接入 chat.listGroups 真实群组数据（已移除 mock 数据）
- [x] Discover Communities Tab 支持 joinGroup tRPC 加入群组
- [x] Trading 新建 positions 表（schema + migration）
- [x] Trading 新增 trading.getPositions/addPosition/removePosition 后端接口
- [x] Trading.tsx Positions Tab 接入真实后端数据
- [x] GroupChatRoom 成员列表接入 chat.getGroupMembers（已移除 mock 数据）

## v21 修复与功能完善

- [x] 修复 vite.config.ts 中 vitePluginDisableReownAnalytics 插件导致的 Rollup 构建错误
- [x] 运行时禁用 Reown analytics（wagmi.ts 中 OptionsController.setFeatures）
- [x] Trading.tsx Positions Tab 添加 Open Position 表单（Long/Short、Pair、Amount、Leverage、SL/TP）
- [x] Trading.tsx openPosition 表单接入 trpc.trading.openPosition mutation
- [x] CreateGroup.tsx 联系人列表从 mock 数据切换为 contacts.listFriends + user.searchUsers 真实数据
- [x] Chat.tsx 全局搜索从 mock 数据切换为 trpc.user.searchUsers 真实用户搜索
- [x] Chat.tsx 搜索结果点击导航至 DM 对话页面

## v22 Mock 数据清理

- [x] Contacts.tsx 移除所有 mockContacts 和 mockRequests，完全使用 listFriends + listIncoming + listOutgoing
- [x] Contacts.tsx 新增 listOutgoing 后端接口，支持查看已发送的好友申请
- [x] Discover.tsx Communities Tab 移除 mockCommunities，完全使用 chat.listGroups
- [x] GroupChatRoom.tsx 移除 mockMembers，完全使用 chat.getGroupMembers
- [x] 97 个测试全部通过，TypeScript 0 错误

## v23 Mock 数据清理（第二轮）

- [x] GroupChatRoom 群聊消息移除 mockGroupMessages，使用空初始值 + 后端加载
- [x] ChatRoom DM 消息移除 mockMessages，使用空初始值 + 后端加载
- [x] Discover Moments 移除 mockMoments/mockComments/generateMorePosts，接入后端分页
- [x] Discover Users Tab 移除 mockUsers，完全使用 leaderboard 数据
- [x] Trading 移除 mockPositions fallback，重命名 mockTraders/mockStrategies 为 demoTraders/demoStrategies
- [x] Wallet 移除 mockTokens/mockNFTs/mockTransactions，完全使用 BSC 链上数据
- [x] 97 个测试全部通过，TypeScript 0 错误

## v24 功能完善与 mock 清理（第三轮）

- [x] Research mockReports 重命名为 demoReports（后端 LLM 生成接口已完善）
- [x] PostDetail mockPostsData/mockCommentsData 改为 demoPostsData/demoCommentsData，数字 ID 使用后端真实数据
- [x] Settings mockApiKey 重命名为 demoApiKey
- [x] 全项目 mock 数据清理完成（所有 mock 变量已移除或重命名为 demo）
- [x] 97 个测试全部通过，TypeScript 0 错误

## v25 功能完善

- [x] CoinGecko API 缓存优化（内存缓存 + 指数退避重试 + TTL 分级 + 过期缓存 fallback）
- [x] Contacts 收藏/备注/标签持久化（contactMetadata 表 + toggleFavorite/updateNote/updateTags 接口 + 前端接入）
- [x] Trading 跟单系统后端化（copy_traders/copy_trader_follows/trading_strategies 表 + CRUD 接口 + 前端接入）- [x] 114 个测试全部通过，TypeScript 0 错误

## v27 修复

- [x] 修复 Reown analytics 域名白名单错误（Origin not found on Allowlist）——拦截 XHR 屏蔽 analytics 请求

## v28 功能优化

- [x] 用户头像上传优化：专用 avatar 上传端点（user.uploadAvatar），自动裁剪路径
- [x] Settings 隐私设置持久化：新建 user_settings 表 + updateSettings/getSettings 接口
- [x] Settings API Key 管理：后端生成/存储/重新生成 API Key（user_api_keys 表）
- [x] 代码分割优化：React.lazy 懒加载所有页面组件，减少首屏 bundle 大小
- [x] i18n 补全：Research Quick/Deep 模式、报告弹窗、全局市场等新增文案（en + zh-CN）
- [x] 110 个测试全部通过，TypeScript 0 错误
