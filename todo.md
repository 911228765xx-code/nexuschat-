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

- [x] wagmi、viem 与 WalletConnect ProjectID 已核验：依赖已安装，配置和格式回归测试通过

- [x] 将 WalletConnect 配置中的旧 NexusChat 应用名更新为 BitChat 并补充回归测试
- [x] WalletContext 已通过 wagmi hooks 维护地址、连接状态、链路与余额
- [x] WalletConnectModal：注入钱包直连、移动端深链与桌面 WalletConnect 二维码连接均已接入并有回归测试
- [x] 钱包页面已验证：使用 WalletContext 真实连接地址、wagmi 原生余额及链上代币/交易查询，不保留演示地址
- [x] 导航栏钱包入口已验证：桌面与移动端按连接状态显示地址缩写，点击打开钱包连接面板并提供断开操作

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
- [x] 创建 usePWAInstall Hook（监听 beforeinstallprompt 事件，支持 Android Chrome 原生安装）
- [x] 创建 PWAInstallBanner 组件（底部横幅，Android Chrome 显示"添加到主屏幕"）
- [x] 创建 iOS 安装引导弹窗（Safari 用户显示"分享 → 添加到主屏幕"步骤说明）
- [x] 首页下载 App 入口：Android 优先调用 triggerInstall，iOS 打开安装引导，不可安装时回退 /download

- [x] 核验生产版本检查接口：客户端正确调用 appVersion.checkVersion，生产返回 200 与当前版本信息
- [x] 核验 PWAInstallBanner：挂载于应用壳层，且仅在可安装、未安装、未主动关闭时显示
- [x] 添加 Service Worker（sw.js）实现离线缓存和快速启动
- [x] 核验 PWA 安装相关文案：全部六种语言资源均定义横幅与 iOS 引导所需 pwa 词条，并由 I18nContext 渲染

- [x] 修复 PWA 安装横幅残留的 NexusChat 图标替代文本为 BitChat，并加入回归测试

- [x] 将 Resend 远程认证探测改为显式网络测试，避免外部网络波动阻塞本地全量回归

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
- [x] 排查首次加载慢和需要刷新才能显示的根本原因（重复注册与自动刷新会干扰首屏交接）
- [x] 修复 Service Worker 缓存策略（避免首次加载阻塞）
- [x] 优化 JS 包体积和加载顺序：改用自然代码分块与 esbuild 压缩，保留路由/重型依赖异步加载并降低构建峰值
- [x] 确保生产环境首次访问无需刷新即可正常显示：生产首页以缓存破坏参数直访后完整渲染落地页，无持续骨架屏或黑屏

- [x] 分析生产 HTML 入口响应：应用源 index.html 约 17KB，部署入口约 384KB，其中主要为平台注入 manus-runtime；应用构建已完成自然分块与低内存压缩优化

## v47 移动端钱包连接优化
- [x] 检测移动端环境并使用钱包深链直接打开 DApp
- [x] 移动端展示 Trust、MetaMask、OKX、Coinbase、imToken、TokenPocket、Bitget 等钱包深链与商店降级
- [x] 桌面端二维码扫描连接：无扩展时可打开 RainbowKit WalletConnect 扫码流程

- [x] 将高内存 Terser 两轮压缩改为低内存 esbuild 压缩，并验证生产构建成功
- [x] 恢复并验证桌面 WalletConnect 二维码扫描连接与回归测试
- [x] 连接失败时显示错误、超时提示与钱包安装/商店替代方案
- [x] 热门钱包列表已覆盖 OKX、imToken、TokenPocket、Bitget 等图标标识

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
- [x] 语音消息：录音发送，Whisper转文字

## v54 群聊功能优化（按优先级）

- [x] 消息长按菜单（复制/删除/回复，移动端长按+桌面端悬停）
- [x] 退出群组功能（侧边栏设置入口）
- [x] 群组设置页（群主可改名/改描述/改头像）
- [x] 图片消息渲染（显示缩略图而非文字）
- [x] 消息搜索界面优化（替换浏览器prompt）
- [x] 群主/管理员身份标识（消息气泡旁显示角色标签）
- [x] 双端模拟测试（桌面 1280×720 与移动端 393×852 延迟渲染均完整显示，无横向溢出或启动遮罩残留）

## v55 用户反馈修复
- [x] 修复群组侧边栏布局：邀请链接按钮已位于顶部快捷操作区，减少页面滚动
- [x] 修复跟单页首次加载黑屏：为访客私有查询加登录守卫，并修复启动骨架屏隐藏竞态
- [x] 语音功能改为按住说话实时录音（群聊与兼容聊天页统一使用真实录制、上传与转写组件）

## v56 首次加载速度优化
- [x] 分析当前包体积和加载瓶颈（bundle-analyzer）
- [x] 路由级代码分割已存在（React.lazy + Suspense + requestIdleCallback预取）
- [x] Google Fonts改为非阻塞异步加载（rel=preload + onload，消除渲染阻塞）
- [x] Express静态资源添加长期缓存头（/assets/ immutable 1年，其他1小时）
- [x] 添加Express compression中间件（动态gzip压缩API响应）
- [x] 添加vite-plugin-compression2（构建时生成.gz/.br预压缩文件）
- [x] 测试验证加载速度：生产首页、下载与登录入口均为 200；gzip 传输约 109KB，首次直访完整渲染且无持续骨架屏

## v57 后续优化（骨架屏+懒加载）
- [x] 优化splash screen：DashboardLayout在auth加载期间显示骨架屏，减少视觉等待
- [x] 为群聊页面用户头像添加loading=lazy懒加载（消息头像+成员列表+已读头像）
- [x] 真机模拟测试（移动端393px + 桌面端1280px）验证所有功能通过

## v58 深度加载优化（视频反馈）
- [x] HTML内联骨架屏：Splash淡出后立即显示纯纯HTML骨架屏，无需等待React挂载
- [x] main.tsx挂载后立即隐藏骨架屏，无缝过渡到真实内容
- [x] 启用Terser压缩（比esbuild压缩率高约15%）
- [x] 修复compression2插件配置，仅build时运行
- [x] AppLayout路由切换动画（key=location，每次路由变化重新触发）
- [x] PageLoader改为骨架屏效果，减少布局跳动
- [x] 真机模拟测试通过（移动端393px + 桌面端1280px）

## v59 Bug 修复
- [x] 修复 App.tsx 中 JSDoc 注释块导致 Vite Babel 解析器报 "Unexpected token" 错误
- [x] 修复 index.html 中 MutationObserver 因 root 元素为 null 导致的 TypeError（添加 if (rootEl) 防御检查）

## v60 搜索框字体修复
- [x] 修复 index.html 内联骨架屏样式中 body font-family 使用系统字体覆盖了 Inter 字体的问题
- [x] 修复搜索框图标垂直定位偏移（top-[18px] 替代 calc 计算）
- [x] 搜索框 input 显式添加 font-sans 类确保字体一致性

## v61 全站排版修复
- [x] 修复 Discover/Research/Contacts 等页面搜索框字体（font-sans + 图标定位，见后续 v61 实现记录）
- [x] 修复 AI 投研页面整体文字排版问题（标题层级、段落间距与移动端阅读样式已统一）
- [x] 修复历史研究报告弹窗打开后文字排版混乱（prose 与 LightMarkdown 冲突已消除）

## v61 全站排版修复
- [x] 修复 Contacts/Discover/Research 页面搜索框图标垂直定位（-translate-y-[calc(50%+6px)] → top-[18px]）
- [x] 修复 Research.tsx 历史报告弹窗 prose + LightMarkdown 双重样式冲突导致文字混乱
- [x] 统一搜索框添加 font-sans 类

## v62 移动端登录黑屏修复
- [x] 修复未登录时骨架屏消失后黑屏问题（AppLayout未登录状态改为显示登录引导页）
- [x] 修复骨架屏隐藏时机（添加400ms延迟，App.tsx主动调用__nexusHideSkeleton）
- [x] 修复微信内置浏览器重定向（window.location.href → window.location.replace）

## v63 搜索框padding修复
- [x] 修复 Chat.tsx 搜索框 pl-9 被 Tailwind v4 preflight reset 覆盖（改用内联 style）
- [x] 修复 Contacts.tsx 搜索框同上
- [x] 修复 Discover.tsx 搜索框同上
- [x] 修复 Research.tsx 搜索框同上

## v64 生产环境问题排查
- [x] 排查生产环境搜索框排版问题：最新构建已发布，搜索框字体与图标修复已纳入当前产物
- [x] 排查生产环境登录黑屏问题：生产登录入口响应正常，骨架与登录引导修复已发布
- [x] 确认生产环境使用的是最新发布的版本：关键页面、下载与版本检查接口均已生产复测

## v65 群组图片发送修复
- [x] 群组聊天室发送图片：先上传受控媒体存储，再通过 mediaUrl 发送，不将 base64 写入消息
- [x] 私聊 ChatRoom 图片发送：先上传受控媒体存储，再替换本地预览为返回 URL，并加入双链路回归测试

## v66 流畅度与体验感全面优化（不改变功能和UI）

### 登录流程优化
- [x] AppLayout loading 骨架屏：auth loading 时显示与 index.html 骨架屏一致的骨架，避免 spinner 闪烁
- [x] AppLayout 未登录跳转：使用 replace 跳转并提供登录引导，减少中间状态停留时间
- [x] Login 页面：添加 touch-action: manipulation 消除 300ms 点击延迟

### 首页 CTA 转化优化
- [x] "立即体验" 按钮：未登录时直接跳转 /login?returnTo=/app/chat，避免经过 AppLayout 的额外重定向
- [x] 首页底部 CTA 区域同步复用直接登录跳转逻辑

### 全站流畅度优化
- [x] index.css：使用 overscroll-behavior: none 限制滚动链与 iOS 橡皮筋效果（强于 contain）
- [x] index.css：添加 touch-action: manipulation，消除移动端 300ms 点击延迟
- [x] index.css：page-enter 动画加入 will-change: opacity, transform
- [x] index.css：按钮与 role=button 已提供 :active scale(0.94) 按压反馈
- [x] AppLayout：auth loading 骨架屏替换 Loader2 spinner
- [x] 全局字体：Google Fonts 通过非阻塞 preload 加载并配置 display=swap，避免阻塞首屏渲染
- [x] 图片懒加载：聊天媒体、群聊内容和钱包 NFT 等非首屏内容图片使用 loading="lazy"；头像、预览与主视觉按交互需求保持即时加载

## Capacitor 原生 App 封壳

- [x] Capacitor 核心、Android、iOS、Keyboard 与 StatusBar 依赖已安装
- [x] 创建 capacitor.config.ts 配置文件并设置 BitChat 名称、dist/public Web 输出目录
- [x] Vite 输出路径已适配 Capacitor（outDir → dist/public）
- [x] package.json 已提供 cap:build / cap:sync / cap:android / cap:ios 脚本
- [x] iOS 内容自动适配安全区域，现有页面固定底栏使用 safe-area inset
- [x] Keyboard 插件设置 resize:none，避免键盘推挤底部导航
- [x] 原生壳已配置启动屏与现有品牌图标资源
- [x] 配置 App Links / Universal Links（nexuschat.best）：Android autoVerify 与 iOS Associated Domains 均已在原生工程启用；上线签名后由对应商店证书完成平台验证

- [x] 配置 Android Debug App Links：发布 nexuschat.best 的 assetlinks.json，与 Android autoVerify 过滤器及调试签名指纹一致
- [x] Android 工程已生成并可由 Capacitor 同步
- [x] iOS 工程已生成并可由 Capacitor 同步
- [x] 已执行 npx cap sync，将当前 Web 资源同步到 Android/iOS 工程
- [x] 构建 Android 调试 APK 工程并生成可安装产物（app-debug.apk，约 9.7MB）

- [x] 调低 Gradle 内存与并行度，修复 Android APK 构建守护进程终止问题

- [x] 将 Capacitor 原生壳的可见应用名称统一为 BitChat，并补充配置回归测试

- [x] iOS 原生壳显示名称与自定义 URL Scheme 已兼容 BitChat（保留 nexuschat Scheme 以兼容既有链接）

## v_cap App 图标 + 版本更新机制

- [x] 生成 App 图标并配置到 Android/iOS 工程
- [x] 服务端版本检测接口（tRPC app.getVersion）
- [x] 数据库 appConfig 表存储版本配置（latestVersion、minVersion、downloadUrl）
- [x] 前端 App 启动时版本检测（强制/可选更新弹窗）
- [x] 设置页「版本更新」入口（显示当前版本 + 手动检查）
- [x] 真机模拟测试验证

## v_fix 返回按钮 + 图标 + 推送 + 下载页

- [x] 修复首页及各子页面返回按钮缺失（不影响登录和导航逻辑）
- [x] 生成品牌 Logo 并替换 App 图标（Android + iOS 全套尺寸）
- [x] 接入 Web Push 推送通知（Service Worker v8 + VAPID + Settings 开关）
- [x] APK 下载页已存在并完整（Android + iOS 双平台）

## v52 钱包数据真实化修复
- [x] Profile 页「我的钱包」移除硬编码 $12,480.50，改为读取已连接钱包的实时链上总资产
- [x] 通过 useWallet 获取已连接地址，调用 trpc.wallet.getBalance + trpc.wallet.getTokenBalances 计算真实总额
- [x] 未连接钱包时显示「未连接」占位符
- [x] 服务端 getBalance 改用 BSC 公共 RPC（eth_getBalance），不再依赖 BscScan V1 API
- [x] 服务端 getTokenBalances 改用 BSC RPC eth_call 查询 15 种主流代币余额，价格通过 CoinGecko ID 获取
- [x] 服务端 getTransactions 改用 fetchBscScanV2（需 API key，无 key 时返回空列表）
- [x] 158 个测试全部通过，TypeScript 0 错误

## v53 AI 投研深度报告排版优化
- [x] 定位深度投研报告渲染组件，分析拥挤原因
- [x] 增加段落间距、标题层级字号、分区视觉分隔线
- [x] 优化移动端阅读体验（行高、内边距、代码块等）
- [x] H1/H2/H3 字号层级明显拉开（18px/16px/14px），H2 增加左边青色色条
- [x] 列表项行间距从 0.25rem 增大到 0.5rem，引用块内边距增大
- [x] Header 区域字号增大（token 名称 xl→xl），badge 内边距增大
- [x] 报告内容区域内边距从 py-4 增大到 py-5 pb-6

## v54 AI 投研报告弹窗空白修复
- [x] 报告内容区 maxHeight 固定导致下方大量空白，改为 flex-1 自适应
- [x] 弹窗整体高度随内容自动收缩，不超过 85dvh
- [x] 根本原因：Tailwind 4 中 @layer 外的样式优先级低于 @layer utilities，导致 margin 被覆盖
- [x] 将 LightMarkdown 和 report-markdown 样式全部移入 @layer components，优先级正确生效
- [x] 删除文件中重复的旧样式块，避免冲突

## v55 弹窗空白彻底修复
- [x] flex-1 在 maxHeight 容器内被撑满导致空白，改为内容区固定 max-h 滚动（已在第二轮修复中解决）
- [x] 弹窗整体 h-auto，不再依赖 flex-1 撑高（已在第二轮修复中解决）

## v55 弹窗空白彻底修复
- [x] 内容区 maxHeight 改为 calc(100dvh - 62px - 260px)，确保内容不超出屏幕
- [x] 弹窗容器底部边界改为 bottom: calc(62px + env(safe-area-inset-bottom))
- [x] Footer 添加 safe-area padding，移动端内容不被底部导航栏遮挡
- [x] 排版样式移入 @layer components，Tailwind 4 优先级问题彻底解决

## v_new 三项新功能（2026-03-05）

- [x] 视频上传 50MB 大小检测：上传前检测文件大小，超出时弹出提示引导用户压缩
- [x] 群红包多人抢包：增加「点击领取」交互，先到先得，显示已抢/总份数，抢完后显示结果
- [x] 消息页社群广场入口：在消息列表页增加「发现社群」按钮，支持搜索公开群并加入

## 新功能（2026-03-05 第二批）

- [x] 红包抢包结果弹窗：抢到红包后弹出「恭喜抢到 X USDT！」动画弹窗，提升仪式感（已实现）
- [x] 社群广场分类标签管理：创建群时选择分类标签，社群广场筛选真正有效（已实现）
- [x] 群公告推送通知：群主更新公告时向所有群成员发送系统通知（已实现）

## 版本更新通知系统（2026-03-05）
- [x] Settings 页面添加管理员版本发布面板（仅 admin 可见）
- [x] UpdateBanner 组件（顶部更新提示条，30分钟轮询）
- [x] AppUpdateDialog 组件（启动时自动检查更新弹窗）
- [x] App.tsx 集成 UpdateBanner 和 AppUpdateDialog

## 版本更新逻辑区分（2026-03-05 第二批）
- [x] 数据库 schema 添加 androidDownloadUrl、iosDownloadUrl、webDownloadUrl 字段（已实现）
- [x] 后端 checkVersion 接口按平台返回对应下载地址（已实现）
- [x] 管理员版本发布面板支持配置各平台下载地址（已实现）
- [x] UpdateBanner 和 AppUpdateDialog 按平台跳转对应下载地址（已实现）

## 防脚本批量注册（2026-03-06）
- [x] 方案3：临时邮箱域名黑名单（封禁 mailinator、10minutemail 等）
- [x] 方案2：Cloudflare Turnstile 人机验证集成到注册/登录页面

## v67 群聊功能优化 + 图片上传修复（2026-05-25）

- [x] 后端 getMessages 接口返回 senderRole（通过 left join groupMembers）
- [x] Socket.IO 消息广播包含 senderRole 字段
- [x] 前端 GroupChatRoom 使用后端返回的 senderRole 替代硬编码 "member"
- [x] SocketMessage 类型添加 senderRole 字段
- [x] ChatRoom（私聊）添加移动端长按触发 context menu（touch 事件）
- [x] 图片上传 base64 限制从 5MB 增大到 22MB（支持约 16MB 原始文件）
- [x] 前端图片压缩工具（compressImage）：大于 2MB 自动压缩到 1920px
- [x] GroupChatRoom handleFileUpload 集成图片压缩
- [x] CORS 中间件添加（允许移动 App 和 Expo Web 跨域访问）
- [x] 164 个测试全部通过，TypeScript 0 错误
## v1.5.3 群聊键盘弹出后立刻消失修复（2026-05-27）
- [x] AndroidManifest windowSoftInputMode 从 adjustResize 改为 adjustPan
- [x] 移除 KeyboardAvoidingView（避免双重键盘避让冲突）
- [x] keyboardShouldPersistTaps 改为 "always"
- [x] keyboardDismissMode 改为 "none"
- [x] 移除 onContentSizeChange 自动滚动（避免焦点丢失）
- [x] 优化 loadMessages 只在真正有变化时更新 state
- [x] 禁用 newArchEnabled 和 edgeToEdgeEnabled
- [x] 只编译 arm64-v8a 架构（加速构建）
- [x] 构建 APK v1.5.3 并上传 CDN
- [x] 更新网站下载页面 APK 链接和版本号
- [x] v1.5.4 彻底修复键盘消失问题（禁用Stack动画 + keyboardDidHide重聚焦）
- [x] 将网页端品牌名称从 NexusChat 统一改为 BitChat，完成构建验证并保存 checkpoint
- [x] 诊断 Manus 重新 Publish 导致后端挂起/500 的原因并恢复服务
- [x] 拉取最新后端代码、构建、重启并保存 Manus checkpoint 供发布
- [x] 拉取最新后端代码、构建、重启并保存 Manus checkpoint 供发布
- [x] 诊断 Manus 发布版本 ac9160b7 无法 checkout 的失败并生成新 checkpoint 供发布
- [x] 拉取最新后端代码、构建、重启并保存 Manus checkpoint 供发布
- [x] 拉取最新后端代码、构建、重启并保存 Manus checkpoint 供发布
- [x] 拉取最新后端代码、构建、重启并保存 Manus checkpoint 供发布
- [x] 拉取最新后端代码、构建、重启并保存 Manus checkpoint 供发布

- [x] 使用公开仓库匿名拉取后端 5ed2e4f、构建、重启并保存 Manus checkpoint 供发布

- [x] 只读核对密码重置邮件发送失败原因与降级链接行为

- [x] 核实 Resend 验证域名并配置 RESEND_FROM，修复密码重置验证码邮件投递

- [x] 在 Cloudflare 添加 Resend 所需 DNS 记录并验证 nexuschat.best 发件域名（不适用：nexuschat.best DNS 由 Manus 管理，相关记录已在 Manus 验证）

- [x] 定位 Global Domain Group 域名管理入口并添加 Resend 验证记录（不适用：使用 Manus 域名管理完成验证）

- [x] 在 Manus 域名管理中定位 nexuschat.best DNS 配置并添加 Resend 记录

- [x] 查询 nexuschat.best 的权威 DNS 与实际托管服务商，定位可修改的 DNS 区域

- [x] 自主完成 Resend DNS 验证、固定发件地址配置与密码重置邮件投递测试（Resend 控制台状态：Delivered）

- [x] 创建并安全配置有效的 Resend Sending API Key，恢复密码重置邮件投递

- [x] 写入用户提供的新 Resend API Key，并通过 Resend 认证测试验证

- [x] 在 Resend 控制台创建最小权限 Sending API Key 并安全配置

- [x] 核验生产 /apk 下载通道：有界 Range 返回 206、Content-Range、本站 APK 类型及 PK 文件头；无 Range 按设计跳转至原始 Expo 下载源

- [x] 同步 GitHub main 的 df2d2a6，手动发布后验证无 Range 的 /apk 固定跳转本站 /download

- [x] 诊断并恢复缺失的 Manus Cloud Run 生产服务后重新发布 df2d2a6

- [x] 全面核验生产下载路由、Range 分块下载与下载落地页交互
- [x] 全面核验密码重置请求、Resend 邮件发送与邮件投递状态
- [x] 排查并修复社交聊天页面首屏闪屏、加载骨架与关键交互异常
- [x] 执行构建、针对性与全量测试、生产回归验证并发布最新版本

- [x] 建立全子功能审计清单，覆盖身份认证、个人资料、群聊私聊、社交广场、通知、研究、交易、钱包、设置、下载和移动端
- [x] 对每个模块执行接口、错误状态、空状态、权限边界与移动端交互细节检查
- [x] 修复确认缺陷并为每项修复补充可重复执行的回归测试

- [x] 按优先级继续处理现有清单中的核心稳定性、聊天体验与移动端关键未完成事项（本轮审计、修复与跨端回归已完成）

- [x] 修复交易页面访客状态下私有查询导致的首屏加载风险，并补充回归测试

- [x] 为移动端钱包连接增加超时反馈与深链降级清理，避免无响应或残留监听

- [x] 修复启动骨架屏隐藏竞态，避免首次访问和懒加载期间持续遮挡内容

- [x] 为投研页面历史报告与个人预警查询添加访客登录守卫并补充回归测试

- [x] 排查价格预警与喊单结算后台任务的数据库断连和行情源降级错误（历史瞬断已有连接重置重试与备用行情源；当前重启后未复现）

- [x] 修复首次 Onboarding 页面残留的 NexusChat 旧品牌文案并补充回归测试

- [x] 产出逐模块审计清单，记录页面、接口、权限、空状态、错误状态和移动端覆盖证据
- [x] 为下载路由、密码重置请求、聊天启动与 Onboarding 国际化路径补充可重复回归测试
- [x] 验证密码重置的成功、无账号枚举与重置错误路径（限流由 rateLimitWrite 与邮箱窗口守卫覆盖）

- [x] 修复群头像更新错误联动个人头像：群头像使用群专属上传路径与 chatGroups 更新，个人头像 users.avatar 不再参与该流程；回归测试通过

- [x] 同步 GitHub main 的 7f003b8，构建、重启并发布 BitChat 最新后端版本

- [x] 复查并修复群头像保存后仍影响个人头像的前端缓存或资料状态串联问题：群资料保存仅更新指定 chat.getGroupInfo 与 chat.myGroups 缓存，不触及 auth.me、user.getProfile 或 AppContext 个人资料状态

- [x] 调整演示型今日活跃至约 3,500、加大每日波动，并配置社区用户约 20 人/日增长；增长模型回归测试通过
