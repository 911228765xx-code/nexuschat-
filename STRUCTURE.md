# Island Farm Architecture

## 页面层

`client/src/pages/IslandFarm.tsx` 负责游戏页面布局、服务端数据查询、行为按钮、抽屉和状态提示。`client/src/components/island/GameCanvas.tsx` 负责把已验证的农田状态传递给 Babylon 画布，并将点击事件回调到页面层。

## 游戏层

`client/src/game/island/IslandWorld.ts` 是独立的 Babylon 世界，管理正交相机、海面、岛屿底板、地块网格、建筑、宠物标记与点击拾取。它不访问 React、tRPC 或数据库，且提供 `update(state)` 与 `dispose()`。

## 服务层

`server/routers/islandFarm.ts` 使用受登录保护的过程返回岛屿快照，并处理 `plant`、`harvest`、`upgradeWorkshop` 与 `petCare`。所有时间与收益由服务端结算。数据库表只保存玩家岛屿、地块、库存和宠物进度；资产市场和 BIT 支付不进入首期结算。

## 数据边界

BIT 余额沿用已有 `users.nnBalance` 字段，仅只读显示。IT 增长通过现有 `itTransactions` 账本记录，游戏调用会写入可追溯的 `type=island_farm` 流水。前端不得自行修改余额或成熟时间。
