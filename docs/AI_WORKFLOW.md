# AI 协作入口 / Codex & Lovable Task Routing

本文件是**轻量索引**，不复制完整 PRD。执行任何任务先读 [AGENTS.md](../AGENTS.md)（尤其 Lovable/Git 同步限制），再读对应 GitHub Issue 中的验收标准与**精确文件路径**，仅打开相关代码。默认用中文简短汇报。

## 设计资料的位置（不要猜测本地路径）
- **PRD V1.1**：Google Docs，原 PRD V1.0 末尾**第 12 章**为 2026-11-14 的单件数字身份设计增补：https://docs.google.com/document/d/12vTxACpqeEc4nGEQOgG9FRqHNiUeUjBavurYbKZ1ewY/edit
- **双前端与统一后端架构**：Google Docs：https://docs.google.com/document/d/10RaBK4LTTAZn-T8scTNxhehX0D11PoYTia1kcFQJNXY/edit
- **商业模式与业务运营**：Google Docs：https://docs.google.com/document/d/14xR0cm3b-z_HpTkEPRUjqpJQNNZ2C9G4NAt_KoAhpBk/edit
- **GitHub 任务入口**：https://github.com/blockai2021/brightline-product-guide/issues
- **Lovable 项目**：https://lovable.dev/projects/4812f772-7c71-5ddd-8106-387e5238d766

**重要**：本仓库尚不存在 `docs/prd.md`、`docs/architecture.md`。若执行工具无法访问 Google Docs，只依据 Issue 内的具体需求与验收条件开展工作；对未读取的原文标记“未直接核对”，不要编造文档内容或遍历其他文件寻找“同名文档”。

## 源码路径速查（main 分支已核对）
| 目标 | 文件 |
| --- | --- |
| 单件身份、验证、发布模型 | `src/features/connect/domain.ts` |
| 浏览器 Demo 状态、旧版本迁移 | `src/features/connect/store.tsx` |
| 演示产品、批次与单件数据 | `src/features/connect/seed.ts` |
| 管理后台产品与 Transparency UI | `src/features/connect/admin.tsx` |
| 消费者产品页、保修和语言 | `src/features/connect/consumer.tsx` |
| 后台菜单、产品页路由 | `src/routes/admin.products.tsx`, `src/routes/admin.transparency.tsx` |
| 旧 Content 入口重定向 | `src/routes/admin.content.tsx` |
| 单件 GS1 URI 路由 | `src/routes/01.$gtin.21.$serial.tsx` |
| 后台及消费者翻译 | `src/features/connect/translations.ts` |
| 共用 UI | `src/features/connect/ui.tsx` |
| 单件身份规则测试 | `src/test/connect-identity.test.ts` |
| 路由测试 | `src/test/app-routing.test.tsx` |
| 依赖与测试命令 | `package.json` |

## 减少上下文与 Token 的执行规则
1. **Issue First**：一次只完成指定 Issue；先读本索引与 `AGENTS.md`，再读 issue 列出的 2–5 个相关文件；对大型 `admin.tsx`（约 59KB）/ `translations.ts`（约 39KB）优先按组件名/关键词定位并读取局部。
2. **Don't repeat PRD**：不要把完整 Google Docs 或整个仓库复制进聊天；只摘取当前 Issue 直接涉及的要求，必要时查看指定章节。
3. **Small diffs**：优先复用已有组件、样式、数据函数；不重写页面、不全局重命名、不大范围自动格式化；明确禁止改动无关的页面或品牌视觉。
4. **No collision**：Codex 负责领域模型、测试、API、二维码生成；Lovable 负责页面交互和视觉。两个工具不得并行改 `admin.tsx`、`consumer.tsx` 等同一文件，先完成业务 PR 再让 Lovable 接入。
5. **Git safety**：Codex 在独立分支提交 PR，不直接推 main；Lovable 同步约束见 `AGENTS.md`；严禁 force-push/重写已推历史；生成文件与 Lovable 管理的数据库迁移不能擅改。
6. **Verification**：只运行与变更相关的验证，最终在需要时运行 TypeScript/Vitest/build；报告实际执行结果及未测项目，不把“本地模拟”写成“已部署/官方验真”。
7. **Compact output**：输出不超过：变更文件、实现点、测试结果、风险/待办四项。无需长篇复述背景和完整源代码。

## 产品约束
同一 ProductModel（SKU / GTIN）共享基本信息、多语言内容；每件 ProductUnit 拥有独立序列号，与 GTIN 组成唯一 GS1 Digital Link URI（`/01/{GTIN}/21/{Serial}`）。Amazon Transparency 官方码是可选独立关联：品牌二维码不能自称 Amazon 官方验真。现阶段仍为浏览器 localStorage Demo，不能宣称跨设备数据库、真正防伪或法定 DPP 已上线。
