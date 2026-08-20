# BitChat 子功能质量审计清单

本清单区分 **已自动验证** 与 **需要已登录真实账号复测** 的范围。自动验证不能替代真实账户的社交写操作、钱包授权或移动端钱包深链验证。

| 模块 | 页面与接口 | 已核验内容 | 状态与后续验证 |
|---|---|---|---|
| 启动与路由 | `index.html`、`main.tsx`、`App.tsx`、`AppLayout.tsx` | 单一 Service Worker 注册、无强制刷新、稳定路由容器、TypeScript 与启动回归测试 | 已自动验证；需在真机冷启动复测登录后的聊天首屏 |
| 身份与密码重置 | `Login.tsx`、`ForgotPassword.tsx`、`ResetPassword.tsx`、`emailAuth.ts` | 公共页面 200、Resend 认证测试、已确认实际邮件 Delivered | 补充 request/reset 的成功与错误路径单测 |
| APK 下载 | `Download.tsx`、`apkDownload.ts`、`appVersion.ts` | 无 Range 为 `302 → /download`；Range 为 `206`、APK MIME、Content-Range 与 `PK` 文件头 | 已自动验证；Android 真机需完成 180MB 分块下载与安装 |
| 私聊与群聊 | `Chat.tsx`、`ChatRoom.tsx`、`GroupChatRoom.tsx`、`DMChat.tsx`、`chat.ts` | 启动稳定性修复、路由受保护且访客跳转登录页、既有消息窗口测试通过 | 需登录账号复测建群、发消息、图片、长历史加载与 Socket 收发 |
| 社交广场与通知 | `Discover.tsx`、`PostDetail.tsx`、`Notifications.tsx`、`posts.ts` | 编译与现有功能回归测试通过，公开路由响应正常 | 需登录账号复测发帖、评论、删除、搜索、通知未读 |
| 研究与行情 | `Research.tsx`、`TokenDetail.tsx`、`research.ts`、`trading.ts` | 公共路由 200；行情窗口改用 Vision、Binance US、Bybit 公共备用源；源可达性已验证 | 需观察真实行情刷新与报告生成失败提示 |
| 交易与跟单 | `Trading.tsx`、`calls.ts`、`copyTrading.ts`、`trading.ts` | 公共页面 200、时间窗与备用源测试通过 | 需登录账号复测开仓、平仓、跟单和积分变更 |
| 钱包 | `Wallet.tsx`、`wallet.ts`、`WalletConnectModal` | TypeScript 与钱包单测通过 | 需移动端及桌面端真实钱包授权；不能以模拟账户替代 |
| 个人资料、联系人、设置 | `Profile.tsx`、`Contacts.tsx`、`Settings.tsx`、`user.ts`、`contacts.ts`、`settings.ts` | 编译、既有 router 测试与页面路由正常 | 需登录账号复测资料保存、好友申请、隐私设置与登出 |
| 版本与推送 | `appVersion.ts`、`webPush.ts`、`UpdateBanner`、`AppUpdateDialog` | 当前版本接口返回 `1.9.2`，下载地址为本站 `/apk`；Web Push 单测通过 | 需具备授权浏览器的真实推送订阅与版本升级演练 |

## 自动化基线

当前完整 Vitest 基线为 **245 项通过**；TypeScript 无错误，生产构建完成。生产公共路由 `/`、`/download`、`/login`、`/forgot-password`、`/reset-password`、`/app/discover`、`/app/research`、`/app/trading` 的 HTTP 冒烟响应均为 200。

## 密码重置端到端补测

本地 tRPC 冒烟验证显示：对不存在邮箱的 `emailAuth.requestPasswordReset` 返回统一的成功响应“如果该邮箱已注册，验证码已发送”，不暴露账户是否存在；对无效重置 token 的 `emailAuth.resetPassword` 返回 HTTP 400 和“重置链接无效或已过期”。实际 Resend 发送身份与历史测试投递已验证为 Delivered。

> 对需要身份认证、真实钱包、原生安装或浏览器推送授权的流程，本清单明确标记为“需登录账号复测”，避免将未执行的交互误报为已通过。
