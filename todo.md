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

## v29 AI 投研报告质量优化

- [x] 重写 Quick 模式 prompt：加入明确分析观点 + 操作建议 + 风险提示
- [x] 重写 Deep 模式 prompt：加入投研框架（基本面/技术面/链上数据/情绪面）+ 投资论点 + 进出场策略
- [x] 报告输出结构化：明确的看多/看空/中性立场 + 置信度评分 + 关键催化剂
- [x] 测试验证报告质量（BTC Deep 模式实测通过）

## v30 投研报告一键分享到社区

- [x] 后端：posts 表新增 reportId 关联字段（schema 迁移完成）
- [x] 后端：新增 research.shareToFeed 接口（创建带报告引用的帖子，自动生成摘要文案）
- [x] 后端：新增 research.getReportPublic 接口（公开查看报告详情，含作者信息）
- [x] 后端：posts.list / getById / search 返回 reportId 字段
- [x] 前端：AI 报告弹窗升级（Streamdown Markdown 渲染 + sentiment/risk 标签 + 价格摘要栏）
- [x] 前端：报告弹窗底部"分享到社区"按钮
- [x] 前端：分享确认弹窗（可编辑评论 + 预览卡片 + 发布按钮）
- [x] 前端：Discover 动态流中渲染 ReportCard 组件（渐变卡片 + 标签 + hover 查看完整报告）
- [x] 110 个测试全部通过，TypeScript 0 错误

## v31 P0 上线前必须处理

- [x] SEO: 添加 meta description、og:*、twitter:* 标签到 index.html
- [x] 添加 favicon.ico（AI 生成赛博朋克风格图标 + ICO 多尺寸转换）
- [x] 添加 robots.txt
- [x] PostDetail 页面检测 reportId 并渲染完整投研报告（Streamdown + 数据摘要栏）
- [x] WalletConnect projectId 配置优化（fetch 拦截 analytics + 优雅降级文档）
- [x] XSS 防护：安装 DOMPurify，对 posts/comments/chat/profile/shareToFeed 全部输入消毒
- [x] 110 个测试全部通过，TypeScript 0 错误

## v32 P1 上线质量提升

- [x] Bundle 体积优化：manualChunks 拆分 vendor-misc（14MB→2.6MB），shiki/mermaid/katex/socketio/radix 独立 chunk
- [x] Demo 数据清理：PostDetail.tsx 移除 demoPostsData/demoCommentsData（~220行）
- [x] Demo 数据清理：Trading.tsx 移除 demoTraders/demoStrategies/allTrades（~160行），替换为空状态 UI
- [x] Demo 数据清理：Research.tsx 移除 demoReports（~674行），替换为空状态/后端数据
- [x] 移除客户端 console.log（useSocket.ts、ComponentShowcase.tsx）
- [x] Repost 功能后端化：posts.repost + posts.quotePost tRPC 接口（含通知 + shareCount 递增）
- [x] Repost 前端接入：PostDetail.tsx + Discover.tsx 的 Repost/Quote 按钮调用后端 API
- [x] HTML lang 属性优化：I18nContext 初始化和切换时同步 document.documentElement.lang
- [x] 110 个测试全部通过，TypeScript 0 错误

## v33 P1 上线前优化（第二轮）

- [x] InviteFriends 邀请系统后端化（referrals 表 + 邀请码生成 + 邀请记录查询 + 前端接入）
- [x] Leaderboard invites/profit Tab 后端化（移除 INVITE_DATA/PROFIT_DATA 静态数组）
- [x] TaskCenter 任务进度后端化（前端 mock progress 替换为后端真实进度）
- [x] Notifications 移除 local mock fallback（纯后端通知数据）
- [x] EnhancedInput 代币价格注释说明（内联代币提及功能，非实时价格展示）
- [x] Trading priceTicker 静态 fallback 清理（替换为 0 默认值 + CoinGecko 实时加载）
- [x] 添加 PWA manifest.json
- [x] 图片 lazy loading（ChatRoom + Wallet NFT）

## v34 P2 优化

- [x] API 速率限制中间件（tRPC 接口 rate limiting，特别是 LLM 投研接口）
- [x] EnhancedInput 代币价格实时化（$TOKEN 内联卡片接入 CoinGecko 实时数据）
- [x] PnL Calendar 后端化（接入 trading_positions 表计算真实盈亏 + closePrice/realizedPnl 字段 + 月份导航）

## v35 上线前快速修复

- [x] A3: Settings LOGIN_DEVICES mock 数据替换为当前会话显示
- [x] A4: 批量为 mutation 应用 rateLimitWrite（44 个 mutation 全部覆盖）
- [x] A5: z.string() 输入添加 .max() 长度限制（所有 router 文件已补全）

## v36 数据真实化

- [x] TokenDetail 接入 CoinGecko 全部 5 个时间框架（1h/4h/1d/1w/1m）真实历史价格
- [x] Research 市场概览卡片接入真实数据（CoinGecko Global API + Alternative.me Fear & Greed Index）
- [x] Market Overview Bar 全部 6 个指标实时化：AI Score、Bullish/Total、Fear & Greed、BTC Dom、Mkt Cap、24h Avg

## v37 最终优化

- [x] Research.tsx 清理死代码 generatePriceHistory（已无调用，filteredReports 始终为空数组）
- [x] TokenDetail.tsx 移除 generatePriceData + 静态标签常量（priceHistory 全部改为 EMPTY_PRICE，CoinGecko 实时数据为主源）
- [x] 服务端 console.log 全部替换为 pino 结构化日志（db.ts、index.ts、priceAlertChecker.ts、socket.ts、coinGeckoCache.ts）
- [x] 新增 server/utils/logger.ts（pino 配置，JSON 格式 + ISO 时间戳）
- [x] 147 个测试全部通过，0 TS 错误

## v38 Web3 真实钱包连接完善

- [ ] 安装 wagmi + viem 依赖并配置 WalletConnect ProjectID
- [ ] 重写 WalletContext 使用 wagmi hooks（useAccount, useConnect, useDisconnect）
- [ ] 更新 WalletConnectModal 支持 MetaMask 直连 + WalletConnect 二维码扫描
- [ ] 更新钱包页面移除硬编码演示地址，使用真实连接地址
- [ ] 导航栏"连接钱包"按钮状态同步（已连接显示地址缩写+断开选项）

## v39 钱包数据同步修复

- [x] 修复连接真实钱包后前端数据不更新（tRPC 查询未用新地址重新请求）
- [x] 统一个人主页和钱包页使用同一个钱包地址
- [x] 确保断开钱包后数据清空

## v40 手机端白屏修复

- [x] 诊断手机端白屏原因（构建错误/运行时错误/移动端兼容性）
- [x] 修复 Profile 页 WalletConnect 订阅失败错误
- [x] 确保移动端正常渲染

## v41 WalletConnect 白名单 + 移动端适配优化

- [x] WalletConnect Cloud 域名白名单配置（nexuschat-fyl7bqev.manus.space, nexuschat.best）
- [x] 检查钱包页移动端布局（375px）
- [x] 检查聊天页移动端布局（375px）
- [x] 检查首页移动端布局（375px）
- [x] 检查个人主页移动端布局（375px）
- [x] 修复移动端溢出/遮挡/字体/间距问题
## v42 PWA安装引导 - 让用户方便下载App
- [ ] 创建 usePWAInstall Hook（监听 beforeinstallprompt 事件，支持 Android Chrome 原生安装）
- [ ] 创建 PWAInstallBanner 组件（底部横幅，Android Chrome 显示"添加到主屏幕"）
- [ ] 创建 iOS 安装引导弹窗（Safari 用户显示"分享 → 添加到主屏幕"步骤说明）
- [ ] 在首页 Hero 区域添加"下载 App"按钮，点击触发安装流程
- [ ] 在 AppLayout 底部添加 PWA 安装横幅（仅未安装时显示）
- [ ] 添加 Service Worker（sw.js）实现离线缓存和快速启动
- [ ] 国际化：添加 PWA 安装相关文案到 I18nContext

## v43 下载页面优化
- [x] 生成 Android/iOS 下载二维码图片并上传 CDN
- [x] 创建 /download 专属下载页面（双平台入口、二维码、安装说明、App 截图）
- [x] 首页导航栏添加"下载"链接
- [x] 首页 Hero 区域"下载 App"按钮跳转到 /download 页面
- [x] 注册 /download 路由到 App.tsx

## v44 已登录用户自动跳转社交页
- [x] 首页检测已登录状态，自动跳转到 /app/chat
- [x] 跳转前显示短暂加载动画，避免闪烁
- [x] 未登录用户仍显示落地页

## v45 PWA图标和启动屏优化
- [x] 生成NexusChat品牌图标（192x192, 512x512, maskable）
- [x] 生成favicon.ico（32x32, 16x16）
- [x] 上传图标到CDN
- [x] 更新manifest.json（icons, theme_color, background_color, screenshots）
- [x] 更新首页loading splash screen使用品牌图标

## v46 首次加载性能优化
- [ ] 排查首次加载慢和需要刷新才能显示的根本原因
- [ ] 修复 Service Worker 缓存策略（避免首次加载阻塞）
- [ ] 优化 JS 包体积和加载顺序
- [ ] 确保生产环境首次访问无需刷新即可正常显示

## v47 移动端钱包连接优化
- [ ] 检测移动端环境，WalletConnect 改为深度链接（直接跳转钱包 App）
- [ ] 移动端显示热门钱包列表（Trust/MetaMask/OKX/imToken/TokenPocket/Coinbase）带深度链接
- [ ] 桌面端保留二维码扫描模式
- [ ] 连接失败时显示明确错误提示和替代方案
- [ ] 添加更多热门钱包图标（OKX、imToken、TokenPocket、Bitget）

## v48 忘记密码 + 新用户 Onboarding 引导
- [x] schema.ts 添加 passwordResetTokens 表（token, userId, expiresAt, usedAt）
- [x] db:push 迁移
- [x] emailAuth 路由添加 requestPasswordReset 接口（生成 token + 发送重置邮件）
- [x] emailAuth 路由添加 resetPassword 接口（验证 token + 更新密码）
- [x] 前端 ForgotPassword.tsx 页面（输入邮筱 → 发送重置链接）
- [x] 前端 ResetPassword.tsx 页面（输入新密码 → 完成重置）
- [x] Login.tsx 添加"忘记密码？"链接
- [x] 注册 /forgot-password 和 /reset-password 路由
- [x] Onboarding.tsx 确认对新用户（首次登录）正确触发
- [x] 运行测试，TypeScript 0 错误

## v49 Resend 邮件服务 + 移动端钱包深度链接
- [x] 安装 resend npm 包
- [x] 添加 RESEND_API_KEY secret
- [x] 创建 server/_core/email.ts（sendPasswordResetEmail 封装）
- [x] emailAuth.requestPasswordReset 接入 Resend 发送真实邮件
- [x] 忘记密码页面优化：有 Resend 时显示"邮件已发送"，无 Resend 时降级显示链接
- [x] 移动端检测工具函数（isMobile, isIOS, isAndroid）
- [x] 重写 WalletConnectModal：移动端显示热门钱包深度链接列表（Trust/MetaMask/OKX/imToken/TokenPocket/Coinbase）
- [x] 桌面端保留二维码扫描 + window.ethereum 检测
- [x] 添加热门钱包图标（SVG/PNG CDN）
- [x] 连接失败时显示明确错误提示
- [x] 运行测试，TypeScript 0 错误

## v50 社交聊天全面改进
- [x] 后端：chat.uploadChatImage 接口（接收 base64/buffer → S3 → 返回 URL）
- [x] 后端：chat.deleteMessage 接口（软删除，仅发送者可删）
- [x] 后端：chat.getUserInfo 接口（根据 userId 获取用户信息，替代 leaderboard 查找）
- [x] 数据库：messageReactions 表（messageId, userId, emoji）
- [x] 前端 ChatRoom：图片选择后上传到 S3，发送 mediaUrl 而非 base64
- [x] 前端 ChatRoom：删除消息接入后端 deleteMessage
- [x] 前端 ChatRoom：打字指示器接入真实 Socket（sendTyping + onTyping）
- [x] 前端 DMChat：对方用户信息改用 getUserInfo 接口
- [x] 运行测试，TypeScript 0 错误

## v50 视频问题修复（优先级最高）
- [x] 修复 ChatRoom 黑屏：AppContext mock DM 会话（id="1","3","5","7"）点击后路由到 /app/chat/:id，但该路由对应 ChatRoom（群聊），应路由到 /app/dm/:userId
- [x] 修复 GroupChatRoom 群名称和成员数接入真实数据（getGroupInfo + getGroupMembers）
- [x] 前端 ChatRoom 图片上传接 S3、删除持久化、打字指示器真实 Socket
- [x] DMChat 对方用户信息改用 getUserInfo（替代 leaderboard 查找）

## v51 消息列表黑屏修复
- [x] 重写 PullToRefresh 组件：移除 framer-motion drag，改用原生 Touch 事件
- [x] 重写 SwipeBack 组件：移除 framer-motion drag，改用原生 Touch 事件
- [x] 重写 SwipeMessage 组件：移除 framer-motion drag，改用原生 Touch 事件
- [x] 运行测试，TypeScript 0 错误

## v52 发送消息重复修复
- [x] 诊断群聊/私信发送消息出现两条的根本原因（乐观更新 + Socket 广播双重添加）
- [x] 修复 ChatRoom 重复消息（pending 标记 + 服务端广播时替换而非追加）
- [x] 修复 GroupChatRoom 重复消息（同上）
- [x] DMChat 不受影响（使用 tRPC invalidate 机制，无 Socket 广播）
- [x] 运行测试，158/158 通过，TypeScript 0 错误

## v53 消息历史分页加载
- [x] 检查后端 getMessages/getDMHistory 的 before cursor 分页参数（已支持）
- [x] GroupChatRoom：消息列表顶部添加"加载更多"按鈕，接入 before cursor 分页
- [x] ChatRoom：同上
- [x] DMChat：同上（getDMHistory 接口）
- [x] 加载时保持滚动位置不跳动（scrollHeight 差居锁定）
- [x] 无更多消息时自动隐藏按鈕
- [x] 运行测试，158/158 通过，TypeScript 0 错误

- [x] Bot自动回复：用户在群内发消息后，Bot延迟5-30秒用LLM生成上下文相关回复
- [x] 消息时间格式优化：今天显示时间、昨天显示"昨天"、更早显示"周几"或日期
- [x] 新用户登录后自动加入4个样板群并标记未读角标

- [x] 表情反应持久化：reactions写入数据库，刷新后保留
- [x] 群组邀请链接：生成分享链接，外部用户点击直接加入
- [x] 群文件共享：上传/下载群内文件（PDF、文档等）
- [x] 消息已读回执：显示"已读N人"
- [x] 群管理后台：踢人、禁言、转让群主等真实操作落库
- [ ] 语音消息：录音发送，Whisper转文字
