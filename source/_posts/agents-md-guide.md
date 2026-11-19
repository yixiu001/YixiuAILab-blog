---
title: "一篇文章讲清楚 AGENTS.md：从来源、写法到与 Skill 协同工作"
date: 2026-11-21 09:00:00
categories: [AI工具]
tags: [AGENTS.md, AI Agent, Claude Code, Codex, SKILL.md, 上下文工程, 规则文件]
summary: "AGENTS.md 不是又一个配置文件，而是把「这个项目该怎么干活」从各家工具的私有格式里抽出来、放进版本控制的一次标准化。这篇从它的真实来源讲起，拆开规范本身，给出可直接复制的写法与各平台差异，再用 2026 年的实证研究和 Vercel 评测说清常见坑，最后讲清楚它和 Skill 该怎么分工、怎么配合。"
---

如果你同时用过两款以上的 AI 编程工具，大概率做过这件蠢事：把同一套构建命令、代码规范、「别碰 `dist/`」，先写进 `CLAUDE.md`，再复制一份到 `.cursor/rules/`，又给 Copilot 建一个 `.github/copilot-instructions.md`。改一条规则要同步三个地方，漏掉一个，那个工具就开始按旧规矩干活。

[AGENTS.md](https://agents.md/) 就是为解决这件事出现的。它现在被 6 万多个开源项目采用，由 Linux 基金会旗下的 Agentic AI Foundation 托管，被 Codex、Cursor、GitHub Copilot、Gemini CLI、Claude Code 等主流工具读取。但「大家都在用」不等于「用对了」：2026 年几项实证研究给出的结论相当刺眼——**自动生成、内容冗余的上下文文件不但不提升任务成功率，还会把推理成本抬高 20% 以上**。

所以这篇不讲怎么把文件写得漂亮，讲四件更实际的事：它到底从哪来、规范究竟约束了什么、怎么写才真的改变 Agent 的行为、以及它和 Skill 该怎么分工。

> 本文资料检索与核实时间：2026 年 11 月 19 日。文中平台行为、版本与默认值会随工具更新变化，动手前请以对应官方文档为准；社区与第三方整理已单独标注，不保证适用于所有版本。

---

## 一、先给结论

**一句话定义**：`AGENTS.md` 是放在仓库根目录的一份普通 Markdown，专门写给 AI 编程代理看，用来交接「这个项目怎么装、怎么构建、怎么测、哪些文件不能碰、什么算做完」。官网把它叫作[「A README for agents」](https://agents.md/)：README 写给人，AGENTS.md 写给 Agent。

**它最容易被误解的三点**：

1. **它不是协议，是约定。** 没有 schema、没有必填字段、没有 front-matter、没有运行时，只有一个文件名和一个位置。任何工具都可以读，也可以不读；没有谁被强制服从。
2. **它是常驻上下文，不是按需能力。** 每次会话、每一轮都会占着窗口，所以「写多少」比「写什么」更影响成本。这正是后面那些研究结论的根源。
3. **它是指导，不是权限。** 它能告诉 Agent「别改生成目录」，但拦不住。真正的强制要靠 formatter、静态检查、Hook、CI 和分支保护。

**和 Skill 的分工，先记住这张表**（第七节会展开）：

| | AGENTS.md | Skill | MCP / Hook / CI |
|---|---|---|---|
| 回答的问题 | 这个项目**永远成立**的事实 | 这一类任务**具体怎么跑** | 怎么连外部系统 / 怎么强制 |
| 加载时机 | 每次会话，无条件 | 触发条件命中才加载 | 按需 / 事件触发 |
| 适合放 | 构建命令、目录语义、边界、验证方式 | 发布流程、迁移步骤、评审清单、长文档 | 工具连接、不可绕过的检查 |
| 成本 | 恒定，每轮都付 | 不用不付 | — |

**本文路线**：来源与治理 → 规范本体 → 编写方法 → 各平台差异 → 踩坑与实证 → 与 Skill 协同 → 落地清单。

---

## 二、它从哪里来：一段经常被讲歪的历史

### 2.1 起点是「一个项目，N 份规则」

2024—2025 年，几乎所有 AI 编程工具都给自己的规则文件起了专属名字：

| 工具 | 私有指令文件 |
|---|---|
| Claude Code | `CLAUDE.md` |
| Cursor | `.cursorrules` / `.cursor/rules/` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Gemini CLI | `GEMINI.md` |
| Cline | `.clinerules` |
| Amp（Sourcegraph） | `AGENT.md`（单数） |
| OpenAI Codex | `AGENTS.md`（复数） |

这份对照在[腾讯新闻的一篇实践总结](https://view.inews.qq.com/a/20260506A0271500)里也被完整列过。问题不在文件多，而在**内容高度重复、无法跨工具迁移**：同事在 Cursor 里精心写的规则，换到 Claude Code 完全读不到；改一次规范要同步三四处，必然漂移。

### 2.2 能确证的时间线

关于起源，网上流传着一个很完整的故事：「2025 年 5 月 Amp 提议用 `AGENT.md` 单数并注册了 `agent.md` 域名，OpenAI 随后买下 `agents.md` 域名提议用复数，Amp 主动让步并对齐」。这个故事在[百度百科词条](https://baike.baidu.com/item/AGENTS.md/67757810)和不少中文博客里被当作史实复述。

但[一篇逐条查证的考据文章](https://dev.to/dublecc/agentsmd-inside-the-open-standard-for-briefing-coding-agents-4fag)指出：**这些细节在官网、OpenAI、Amp/Sourcegraph、Linux 基金会的一手材料里都找不到带署名日期的出处**。可独立核查的只有两件事——`ampcode.com/AGENT.md` 今天确实 302 跳转到 `agents.md`（说明发生过合并），以及确有一批带日期的一手公告。把「5 月」「买域名」当成已证实的事实写进文档，是把二手叙述硬化成了伪精确历史。这篇文章后面会一直遵守这条原则：**只把有一手来源的内容写成事实**。

能确证的，是下面四步：

**① 官网只说「协作产生」，不给日期。** [agents.md 官网](https://agents.md/)的原话是：格式「emerged from collaborative efforts across the AI software development ecosystem, including OpenAI Codex, Amp, Jules from Google, Cursor, and Factory」，并明确「now stewarded by the Agentic AI Foundation under the Linux Foundation」。规范源码今天放在中立的 [`agentsmd/agents.md` 仓库](https://github.com/agentsmd/agents.md)，并不在 `openai/` 命名空间下——这本身就是一个治理信号。

**② 2025 年 8 月 19 日，Factory 发布公告。** [《Factory joins AGENTS.md collaboration with OpenAI》](https://www.factory.ai/news/agents-md)是目前能找到的最早一手公告，写明「由 OpenAI 召集的工作组」，参与方包括 OpenAI Codex、Sourcegraph/Amp、Google（Gemini）和 Factory，目标是「用一份任何 Agent 都能读的文档，取代各家私有文件的拼盘」。它还特别提到迁移设计：已有 `.cursorrules`、`AGENT.md`、`CLAUDE.md` 的团队可以把内容迁入 `AGENTS.md` 并保持向后兼容。**这至少证实：到 2025 年 8 月，单数命名与各家私有格式向 `AGENTS.md` 收敛这件事已经完成。**

**③ 2025 年 8 月正式发布。** [OpenAI 官方公告](https://openai.com/index/agentic-ai-foundation/)写明「Since its release in August 2025」，并列出当时的采用情况：超过 60,000 个开源项目与 Agent 框架，包括 Amp、Codex、Cursor、Devin、Factory、Gemini CLI、GitHub Copilot、Jules、VS Code。

**④ 2025 年 12 月 9 日，交给中立基金会。** OpenAI 与 Anthropic、Block 共同发起 [Agentic AI Foundation（AAIF）](https://aaif.io/)，作为 Linux 基金会下的定向基金运作，创始捐赠的三个项目是 Anthropic 的 MCP、Block 的 goose、OpenAI 的 AGENTS.md；白金成员还包括 AWS、Google、Microsoft、Bloomberg、Cloudflare。[OpenAI 公告](https://openai.com/index/agentic-ai-foundation/)给了三条理由：给开发者一个可移植的方式、让格式在开放环境演进、确保没有单一公司控制方向。[Linux 基金会成立 AAIF 的报道](https://aaif.io/news/sdtimes-linux-foundation-forms-agentic-ai-foundation-to-be-new-home-for-mcp-goose-and-agents-md/)也把 AGENTS.md 定义为「给编码 Agent 提供跨仓库、跨工具链一致项目指引的通用标准」。

| 时间 | 事件 | 一手来源 |
|---|---|---|
| 2025-08 | `AGENTS.md` 发布，工作组形成 | [Factory 公告](https://www.factory.ai/news/agents-md)（8/19）、[OpenAI 公告](https://openai.com/index/agentic-ai-foundation/) |
| 2025-08 起 | 6 万+ 开源项目与框架采用 | [OpenAI 公告](https://openai.com/index/agentic-ai-foundation/)、[官网](https://agents.md/) |
| 2025-12-09 | 捐赠给 AAIF / Linux Foundation | [OpenAI 公告](https://openai.com/index/agentic-ai-foundation/)、[AAIF 报道](https://aaif.io/news/sdtimes-linux-foundation-forms-agentic-ai-foundation-to-be-new-home-for-mcp-goose-and-agents-md/) |
| 2026 年 | 实证研究、编写指南、平台原生支持陆续出现 | 见第六节 |

> 顺带一提：流传的「由 OpenAI 和 Google 共同制定」「Anthropic 最早通过 CLAUDE.md 普及概念」一类说法，在不同二手来源里互相打架。写技术文档时，把「谁先提的」和「谁在什么时候公告了什么」分开写，比复述一个漂亮故事更有用。

### 2.3 为什么「什么都没规定」反而是设计

官网反复强调：**没有必填字段，就是标准 Markdown，标题随便起**。这不是偷懒，是建立事实标准的经典打法——先只就「同一个文件名 + 同一个位置」达成共识，把采纳成本压到最低，等网络效应起来再谈结构。对比一下 Skill 就明白：[Agent Skills 规范](https://agentskills.io/specification)规定了 `SKILL.md` 的 YAML frontmatter、`name` 必须与目录同名、`description` 上限 1024 字符、`references/` / `scripts/` / `assets/` 目录约定；而 AGENTS.md 连一行 YAML 都不要求。

代价也很直接：**没有结构 = 没有校验、没有一致性保证**。所有质量责任都落在写文件的人身上，这也是第四节和第六节要花大篇幅的原因。

### 2.4 它解决什么，不解决什么

解决的是：跨工具复用一份项目知识、把指令纳入版本控制与代码评审、让新人（和 Agent）有一份可预期的交接文档。

不解决的是：模型能力不足、工具不读这个文件、规则之间互相矛盾、以及「写了就一定被执行」。AAIF 的五轮实验文章里有一句很克制的话——[AGENTS.md 是 guidance，不是 enforcement](https://aaif.io/blog/measuring-agents-md-what-five-runs-show-that-one-doesn-t)，真正的约束仍然属于 CI、分支保护和沙箱执行。

---

## 三、规范本体：到底规定了什么

### 3.1 全部硬性约定，只有三条

1. **文件名精确为 `AGENTS.md`**（大小写敏感）；
2. **放在仓库根目录**，与 `README.md` 并列；
3. **内容是标准 Markdown**，没有任何必填字段。

[官网 FAQ](https://agents.md/)明确回答：「Are there required fields? No. AGENTS.md is just standard Markdown. Use any headings you like; the agent simply parses the text you provide.」

官网建议覆盖的章节是「Popular choices」而不是要求：项目概览、构建与测试命令、代码风格、测试说明、安全注意事项，以及「任何你会告诉新同事的事」——提交信息格式、PR 规范、部署步骤、大数据集、安全坑。

### 3.2 官网 FAQ 里藏着的关键规则

逐条拆开看，比只读首页有用：

- **冲突怎么办**：[离被编辑文件最近的 `AGENTS.md` 优先；用户在对话里的显式指令覆盖一切](https://agents.md/)。
- **命令会自动跑吗**：[会——只要你把命令列出来，Agent 会尝试执行相关的程序化检查，并在收尾前修复失败](https://agents.md/)。这一条决定了「写不写验证命令」不是风格问题，而是行为问题。
- **能不能改**：能，官网把它定义为 living documentation。
- **怎么迁移**：`mv AGENT.md AGENTS.md && ln -s AGENTS.md AGENT.md`，用符号链接保持旧工具兼容。
- **Aider**：在 `.aider.conf.yml` 里写 `read: AGENTS.md`（另见 [Aider 官方 conventions 文档](https://aider.chat/docs/usage/conventions.html#always-load-conventions)）。
- **Gemini CLI**：在 `.gemini/settings.json` 里设 `{ "context": { "fileName": "AGENTS.md" } }`（另见 [Gemini CLI 配置文档](https://github.com/google-gemini/gemini-cli/blob/main/docs/get-started/configuration.md#available-settings-in-settingsjson)）。

注意后两条：它们在官网 FAQ 里是**需要手动配置**的例子，不是「所有工具自动发现」。这一点在第五节会反复出现。

### 3.3 嵌套文件：monorepo 的正解

[官网第 4 步](https://agents.md/)写明：大型 monorepo 可以在每个子包再放一份 `AGENTS.md`，Agent 会自动读取目录树里最近的那份，「closest one takes precedence」。官网还给了个直观数字：撰写时 OpenAI 主仓库里有 88 份 `AGENTS.md`。

[AAIF 的编写指南](https://aaif.io/blog/writing-an-effective-agents-md)把这件事讲得更细：根文件放全局适用信息（统一包管理器、不要提交产物、跨包改动前跑 lint），子目录只放该子项目特有信息（Python 版本、pytest 路径、迁移规则）。理由是「没必要让每个做前端的 Agent 都消费数据库迁移细则」。

但同一篇指南也立刻加了一句警告：**「适用的文件如何被发现、如何合并，在不同 Agent 实现里可能不一样」**，所以用嵌套文件的仓库应该实测自己依赖的工具，而不是假设层级行为一致。这是全文最该记住的一句平台差异提示。

### 3.4 与 README 的分工

[官网](https://agents.md/)给了三条刻意的分离理由：给 Agent 一个可预期的指令位置；让 README 保持对人简洁；提供精确的、面向 Agent 的补充信息。换句话说：

- README：项目是什么、为什么存在、怎么上手、怎么贡献、许可证；
- AGENTS.md：Agent 干活时需要的操作密度——每一条命令、每一条约定、每一个坑。

[AAIF 编写指南](https://aaif.io/blog/writing-an-effective-agents-md)进一步指出，AGENTS.md **可以指向** README 或贡献指南，但不要把它们复制一遍，否则会出现两份会悄悄互相矛盾的项目指引。

### 3.5 一份最小可用示例

官网给的样例已经足够说明「操作密度」是什么意思（节选）：

```markdown
# Sample AGENTS.md file

## Dev environment tips
- Use `pnpm dlx turbo run where <project_name>` to jump to a package instead of scanning with `ls`.
- Run `pnpm install --filter <project_name>` to add the package to your workspace.
- Check the `name` field inside each package's package.json — skip the top-level one.

## Testing instructions
- Find the CI plan in the `.github/workflows` folder.
- Run `pnpm turbo run test --filter <project_name>` to run every check for that package.
- Fix any test or type errors until the whole suite is green.
- After moving files or changing imports, run `pnpm lint --filter <project_name>`.

## PR instructions
- Title format: `[<project_name>] <Title>`
- Always run `pnpm lint` and `pnpm test` before committing.
```

想看真实项目怎么写，比看模板更有用。AAIF 指南里点名的几份都值得对照：[openai/codex](https://github.com/openai/codex/blob/main/AGENTS.md)、[microsoft/vscode](https://github.com/microsoft/vscode/blob/main/AGENTS.md)（刻意保持极短，把详细架构指向已有的 Copilot 指引）、[rails/rails](https://github.com/rails/rails/blob/main/AGENTS.md)（按组件、单文件、单行给出不同测试命令）、[ipfs/kubo](https://github.com/ipfs/kubo/blob/master/AGENTS.md)（要求用 `make build` 而不是 `go build`，因为 Makefile 提供必需的 linker flags）、[WordPress/gutenberg](https://github.com/WordPress/gutenberg/blob/trunk/AGENTS.md)（明确写下包之间的依赖方向）、[Azure/azure-sdk-for-go](https://github.com/Azure/azure-sdk-for-go/blob/main/AGENTS.md)（列出需要人工批准的动作）、[cloudflare/agents](https://github.com/cloudflare/agents/blob/main/AGENTS.md) 与 [googleworkspace/go-samples](https://github.com/googleworkspace/go-samples/blob/main/AGENTS.md)（说明仓库结构语义）。

这些例子的共同点不是「写得全」，而是**每一条都是 Agent 从代码里推断不出来的**。

---

## 四、怎么写：从空文件到一份能用的规则

### 4.1 一条判据管住所有内容

[AAIF 编写指南](https://aaif.io/blog/writing-an-effective-agents-md)给了本文最有用的一句话：

> For each instruction, ask whether knowing it would change what the agent does. If not, the information may belong somewhere else.

**「如果删掉这一行，Agent 的行为会变吗？」** 不会变，就别写。Agent 本来就能读 `package.json`、`tsconfig.json`、目录树、CI 配置，能自己判断语言、命名习惯、测试目录在哪。你复述一遍，只是在每一轮对话里重复收费。

### 4.2 四类真正该写的东西

**① Agent 无法安全推断的仓库知识。** 比如「看起来能互相依赖的两个包，架构上禁止互相引用」；「`schemas/openapi.yaml` 是 API schema 的唯一真相，`packages/client/generated/` 由它生成」。AAIF 指南里 [Gutenberg 的依赖分层](https://github.com/WordPress/gutenberg/blob/trunk/AGENTS.md) 和 [Kubo 的 `make build`](https://github.com/ipfs/kubo/blob/master/AGENTS.md) 都是典型：有经验的开发者凭常识选，也会选错。

**② 精确、可复制、带工作目录的命令。** 不是「跑测试」，而是「在 `services/api` 下迭代时跑 `pytest tests/<affected_test>.py`；收尾前跑 `pytest tests/` 和 `ruff check .`」。[官网 FAQ](https://agents.md/) 说明列出的命令会被尝试执行，所以命令写错比不写更糟。

**③ 边界与例外。** 生成文件、vendored 代码、已应用的迁移、公共 API 兼容性、需要人工批准的动作。写法要点是**指名路径 + 给出替代做法**：「不要直接编辑 `packages/client/generated/`；改 `schemas/openapi.yaml` 后在根目录跑 `pnpm generate:client`」。

**④ 什么算「做完」。** [AAIF 指南](https://aaif.io/blog/writing-an-effective-agents-md)把「Run the tests」「make sure everything works」列为弱定义，主张按改动规模分层给验证：迭代时跑相关单测，收尾前跑包级测试 + lint，只有改动触及共享包才跑全量 workspace 测试。[Rails 的 AGENTS.md](https://github.com/rails/rails/blob/main/AGENTS.md) 就是这个思路的范本。

### 4.3 「含糊」与「可用」对照

| 含糊写法 | 缺了什么 | 可用写法 |
|---|---|---|
| 跑测试 | 哪些测试、从哪跑、什么时候 | 在 `services/api` 迭代时跑相关 pytest 文件；API 改动收尾前跑 `pytest tests/` |
| 不要改生成代码 | 哪些是生成代码 | 不要编辑 `packages/client/generated/`；改 `schemas/openapi.yaml` 后跑 `pnpm generate:client` |
| 遵循现有模式 | 哪份是范本 | 新增 HTTP handler 参照 `services/api/routes/users.py`，包括校验与错误处理 |
| 遵循架构 | 哪条边界不能破 | `packages/core` 不得 import `packages/ui`；共用代码放 `packages/core` |
| 用标准构建流程 | 这里什么算标准 | 根目录跑 `make build`，不要用 `go build`；包装脚本会补必需的构建元数据 |

（对照表依据 [AAIF 编写指南](https://aaif.io/blog/writing-an-effective-agents-md) 中文化改写。）

### 4.4 五类不该写的东西

1. **仓库概览 / 技术栈复述。** Gloaguen 等人的轨迹分析发现，[仓库概览并没有帮助 Agent 更快定位相关代码](https://arxiv.org/abs/2602.11988)。`package.json` 里写着 TypeScript，就不用再写一段「本项目使用 TypeScript」。
2. **通用软件建议。** 「写干净的代码」「用有意义的变量名」「遵循最佳实践」——AAIF 指南直接判定这类指令没有告诉 Agent 本仓库的任何要求。
3. **大段复制现有文档。** 会产生两份会漂移的真相；[VS Code 的做法](https://github.com/microsoft/vscode/blob/main/AGENTS.md)是只给指针。
4. **能被工具强制的规则。** 格式交给 formatter，依赖边界交给静态分析，[AAIF 指南](https://aaif.io/blog/writing-an-effective-agents-md)的原话是 AGENTS.md 可以告诉 Agent 这些系统存在，但「不应该成为阻止非法改动的唯一手段」。
5. **密钥、凭据、私有运维细节。** 同上，明确列为不该进仓库指令文件的内容。

### 4.5 长度：几个可引用的上限

不同工具给的数字不一样，但它们指向同一件事——**常驻文件要短**：

- [Claude Code 官方文档](https://code.claude.com/docs/en/memory)：单个 CLAUDE.md **建议 200 行以内**，更长会消耗上下文并降低遵循度；导入文件并不会降低上下文成本，因为会和主文件一起加载。
- [AAIF 五轮实验](https://aaif.io/blog/measuring-agents-md-what-five-runs-show-that-one-doesn-t)汇总：Cursor 建议 500 行以内；OpenAI Codex 默认把合并后的指令链限制在 **32 KiB**（可用 `project_doc_max_bytes` 配置），超出会截断。
- 同一篇 AAIF 文章的落地建议更激进：**从 12 行开始**——包管理器、关键命令、一条生成文件边界、一句「改动保持聚焦」。
- [配置异味研究](https://arxiv.org/abs/2606.15828)把「Context Bloat」直接定义为 ≥200 行，在 100 个流行仓库里命中率 42%。

注意这些数字来自不同工具、口径也不同（行数 vs 字节数），别当成通用硬指标；它们共同说明的量级是「几十行到一两百行」，不是上千行。

### 4.6 一份可以直接复制的模板

```markdown
# AGENTS.md

> 本文件适用于整个仓库；`apps/web/` 与 `services/api/` 下各有自己的补充文件，
> 冲突时以离被修改文件最近的一份为准。用户在对话中的明确要求优先于本文件。

## 环境与命令
- 包管理器：pnpm，只在仓库根目录执行 `pnpm install`；不要在各包内单独安装。
- 本地开发：`pnpm dev`；生产构建：`pnpm build`。
- 单包检查：`pnpm --filter <pkg> test` 与 `pnpm --filter <pkg> lint`。

## 目录语义
- `schemas/openapi.yaml` 是公开 API 的唯一真相。
- `packages/client/generated/` 由 schema 生成，禁止直接编辑；改 schema 后在根目录跑 `pnpm generate:client`。
- `packages/core` 不得依赖 `packages/ui`；两侧共用代码放 `packages/core`。

## 验证（按改动范围选择）
- 迭代中：只跑受影响的测试文件。
- 收尾前：改动所在包的 `test` + `lint` 必须通过。
- 仅当改动触及 `packages/*` 共享包时，才跑全量 workspace 测试。

## 需要人工确认
- 数据库迁移、依赖新增/升级、发布、涉及凭据与权限的改动，先说明方案再执行。
- 不要提交生成产物与 `.env*` 文件。

## 参考资料入口
- 架构与贡献流程见 `README.md`、`docs/architecture.md`（按需查阅，不要整篇复制）。
- 发布流程使用 `release` Skill；数据库变更使用 `db-migration` Skill；PR 自查使用 `review` Skill。
```

最后那段「参考资料入口」不是装饰，它是第七节要讲的**索引模式**：只写「什么时候该去看什么」，不把内容搬进来。

### 4.7 monorepo 的嵌套写法

```
repo/
├── AGENTS.md              # 全局：包管理器、通用验证、人工确认边界
├── apps/
│   └── web/
│       ├── AGENTS.md      # 前端：Vitest 路径、组件约定、设计系统入口
│       └── src/
└── services/
    └── api/
        ├── AGENTS.md      # 后端：Python 3.13、pytest、迁移规则
        └── src/
```

[官网](https://agents.md/)的规则是「最近优先」，[AAIF 指南](https://aaif.io/blog/writing-an-effective-agents-md)给出的配套原则是：共享规则留在根文件，只有在**要替换**某条规则时才在子文件里重复；嵌套文件只在仓库本身有真实边界（不同语言、构建系统、验证流程、架构或归属）时才有价值。并且再次提醒：不同实现对层级的发现与合并方式可能不同，务必实测。

### 4.8 写完怎么验证

1. **自己先把文件里每条命令跑一遍**——写错的路径和失效的 flag 会被 Agent 忠实执行。
2. **给一个真实小任务做前后对比**：同一提示词，分别在有/无文件的两个克隆里跑，观察 Agent 在哪一步还要猜，把「猜错」转成一条规则。[AAIF 五轮实验](https://aaif.io/blog/measuring-agents-md-what-five-runs-show-that-one-doesn-t)的起点方法就是这个。
3. **确认文件真的被加载**：Claude Code 用 [`/context all`](https://code.claude.com/docs/en/memory) 看 Memory files；Codex 可用 `--print-instructions` 之类的手段查看合并后的上下文（见[这篇研究综述](https://codex.danielvaughan.com/2026/07/26/do-auto-generated-agents-md-files-actually-help-codex-cli-init-research-evidence-context-engineering)）。
4. **定期审计**：[Claude Code 的 `/doctor prompt-audit`](https://code.claude.com/docs/en/memory) 会检查过期、冲突、指向不存在文件的指令，覆盖 CLAUDE.md、AGENTS.md、rules、skills 等。
5. **重复跑、取中位数**：单跑一次的耗时和 token 噪声大到能得出相反结论——AAIF 那篇文章里，作者第一次单跑得出「AGENTS.md 慢 44%、贵 41%」，改成每组五次取中位数后结论直接翻转。

---

## 五、怎么用：别以为「一个文件，所有工具都一样」

这是最容易翻车的一节。**格式统一 ≠ 加载行为统一**。官网列的是「哪些工具支持这个格式」，不是「它们怎么读、读几层、读不读子目录」。

### 5.1 原生支持面

[官网](https://agents.md/)列出的生态包括：Cursor、Amp、Google Jules、VS Code、Ona、GitHub Copilot coding agent、Devin、Roo Code、Warp、OpenAI Codex、goose、Semgrep、Factory、Zed、opencode、Aider、JetBrains Junie、Kilo Code、Augment Code、Gemini CLI、Phoenix、UiPath、Windsurf 等。[OpenAI 公告](https://openai.com/index/agentic-ai-foundation/)点名的九款是 Amp、Codex、Cursor、Devin、Factory、Gemini CLI、GitHub Copilot、Jules、VS Code。

注意 Aider 和 Gemini CLI 在官网 FAQ 里是「需要配置才读」的例子（见 3.2），把它们和 Codex 一起归为「原生自动发现」是常见误读。

### 5.2 Claude Code：能读，但有条件

这是变化最快、中文资料最互相矛盾的一处。[Claude Code 官方记忆文档](https://code.claude.com/docs/en/memory)当前的说法是：**Claude Code 可以读取仓库的 `AGENTS.md` 作为项目指令，替代 CLAUDE.md**。要点：

- 从 **v2.1.277** 起提供 `Project instructions` 设置；默认在没有 `CLAUDE.md` / `CLAUDE.local.md` 时才读 `AGENTS.md`，可以同时加载两者的取值是 `claude-md-and-agents-md`。老版本、禁用内置插件、Bedrock / 关闭遥测的某些会话仍只读 CLAUDE.md。
- 最稳的兼容写法是在 `CLAUDE.md` 顶部写一行 `@AGENTS.md`，下面再补 Claude 专属指令；Claude 会先加载导入内容，再追加其余部分。
- 符号链接 `ln -s AGENTS.md CLAUDE.md` 也行，但官方文档列了两个坑：Edit / Write 工具拒绝写入符号链接；**Windows 上创建符号链接需要管理员权限或开发者模式**，且 Git 检出时可能变成一行纯文本，所以 Windows 团队应该用 `@AGENTS.md` 导入。
- 用 `/context all` 确认文件确实出现在 Memory files 下；`CLAUDE.md` 的加载规则是从当前目录向上逐级拼接（不是覆盖），子目录里的文件在读到该目录文件时才按需加载。
- `.claude/rules/` 可用 frontmatter 把规则限定到特定路径，只在工作于匹配文件时加载；[官方最佳实践文档](https://code.claude.com/docs/en/best-practices)同样建议：多步流程交给 Skill，必须强制的规则交给 Hook。
- `/doctor prompt-audit`（v2.1.283+）可以审计 CLAUDE.md、AGENTS.md、rules、skills 里的过期与冲突内容。

> 网上仍有大量「Claude Code 不读 AGENTS.md」的中文文章，那多半是 2026 年上半年之前的旧版文档镜像。以官方 `code.claude.com/docs/en/memory` 为准。

### 5.3 Codex：少数把发现算法写清楚的实现

[Codex 官方 AGENTS.md 指南](https://developers.openai.com/codex/guides/agents-md)定义了层级加载；[一篇逐条查证的考据](https://dev.to/dublecc/agentsmd-inside-the-open-standard-for-briefing-coding-agents-4fag)指出，在一众工具里只有 Codex CLI 把这件事写成了明确算法。[AAIF 的五轮实验](https://aaif.io/blog/measuring-agents-md-what-five-runs-show-that-one-doesn-t)补充了一个关键数字：Codex 默认把合并后的指令链**限制在 32 KiB**，超出截断，可通过 `project_doc_max_bytes` 调整。

社区整理还提到 Codex 会加载 `AGENTS.md` 与 `AGENTS.override.md` 的层级、按从 Git 根到工作目录的顺序合并、越近越优先（见[这份编写指南](https://agent-ready.dev/how-to-write-an-effective-agents-md)与[中文实践整理](https://blog.csdn.net/qq_43745578/article/details/162913889)）；后者同样记录了合并后 32 KiB 的默认上限与 `project_doc_max_bytes` 配置。这类实现细节**必须以官方文档实测为准**，不要照抄第三方表格。

### 5.4 Aider、Gemini CLI 与「跳板」思路

按[官网 FAQ](https://agents.md/)：Aider 在 `.aider.conf.yml` 写 `read: AGENTS.md`；Gemini CLI 在 `.gemini/settings.json` 设 `context.fileName`。也就是说，对一部分工具，正确做法是**保留一份真相 + 写一个极薄的转发层**，而不是复制整份内容。

国内工具的情况更杂。[一份社区维护的兼容矩阵](https://github.com/wildcat430524/StepsToGreat/blob/main/docs/AGENT-COMPAT.md)记录：Qoder / 通义灵码、Cursor、Zed、Cline 系等可直接读 `AGENTS.md`；TRAE 需要在设置里打开「将 AGENTS.md 包含在上下文中」之类的开关；CodeBuddy / WorkBuddy 有优先级更高的自有指令文件；Gemini CLI、Antigravity、Continue、Aider、Qwen Code 则各有原生文件名。**这是第三方整理、会随版本失效**，动手前请查各工具官方文档（例如 [TRAE 规则文档](https://docs.trae.cn/ide_rules)）。该矩阵自己也强调：唯一靠得住的验证方式是让 Agent 复述硬规则，而不是相信表格。

同一份矩阵给出的工程解法值得借鉴：**只维护一份 `AGENTS.md`，其余工具的文件全部由脚本生成成一行「请先读 AGENTS.md」的跳板**，再附带该工具特有的开关提醒。这样改规则只改一处，不可能漂移；也避开了 Windows 上符号链接需要管理员权限的麻烦。

### 5.5 平台差异速查

| 平台 | 读 AGENTS.md 的方式 | 需要留意 |
|---|---|---|
| Codex | 层级合并，从 Git 根到工作目录，越近越优先 | 合并链默认 32 KiB 上限（`project_doc_max_bytes`） |
| Claude Code | v2.1.277+，通过 `Project instructions`；有 CLAUDE.md 时默认只读它 | 用 `@AGENTS.md` 导入或 symlink；Windows 优先导入 |
| Cursor / Copilot coding agent / Jules / Devin / VS Code 等 | 官网列为支持的工具 | Copilot 支持度随 IDE / CLI / 云端 / 评审界面而不同 |
| Aider | 需在 `.aider.conf.yml` 配置 `read:` | 不是自动发现 |
| Gemini CLI | 需在 `.gemini/settings.json` 配 `context.fileName` | 不是自动发现 |
| TRAE / Qoder / CodeBuddy 等国内工具 | 部分原生、部分需开关、部分自有文件优先 | 以官方文档 + 实测为准，别信二手表 |

（依据 [agents.md 官网](https://agents.md/)、[Claude Code 文档](https://code.claude.com/docs/en/memory)、[AAIF 实验](https://aaif.io/blog/measuring-agents-md-what-five-runs-show-that-one-doesn-t) 与上述社区矩阵整理；非官方定论已标注。）

### 5.6 从旧文件迁移

[官网 FAQ](https://agents.md/)给的最短路径：

```bash
mv AGENT.md AGENTS.md && ln -s AGENTS.md AGENT.md
```

对于 `CLAUDE.md` / `.cursorrules` / `copilot-instructions.md`，[Factory 当初的公告](https://www.factory.ai/news/agents-md)就写明格式设计时考虑了迁移与向后兼容。实践上更稳的顺序是：

1. 把**各工具通用**的内容抽到根 `AGENTS.md`；
2. 各工具私有文件只留一行导入 + 该工具特有指令（Claude Code 用 `@AGENTS.md`，CodeBuddy 一类用自有跳板）；
3. 逐一用 `/context`、`--print-instructions` 或「让 Agent 复述硬规则」验证加载；
4. 确认无遗漏后再删掉重复副本，避免迁移期出现两份互相矛盾的真相。

---

## 六、踩坑：2026 年的实证研究到底说了什么

这一节是全文最该慢慢读的部分。因为「大家都写 AGENTS.md」和「写了就有用」之间，隔着一批结论并不一致的实验。

### 6.1 五份证据

**① Lulla 等：效率明显改善，正确性没变。** [《On the Impact of AGENTS.md Files on the Efficiency of AI Coding Agents》](https://arxiv.org/abs/2601.20404)（2026-01，10 个仓库、124 个 GitHub PR）在「有 / 无」两种条件下测量：有 `AGENTS.md` 时**中位运行时间低 28.64%、输出 token 少 16.58%**，任务完成表现相当。注意它测的是运行效率，不是补丁质量。[AAIF 编写指南](https://aaif.io/blog/writing-an-effective-agents-md)特意提醒不要把这两个数字读成「自动写出更好的代码」。

**② Gloaguen 等：成功率没显著提升，成本涨了两成。** [《Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?》](https://arxiv.org/abs/2602.11988)（ETH Zurich 等，2026-02，SWE-bench Lite 与自建 benchmark、四个 Agent）发现：提供上下文文件**普遍不提升任务成功率，平均推理成本增加 20% 以上**；LLM 生成的文件对成功率略有负效应，人工提交的略有正效应，但两者相对「不给文件」都不显著；**人工写的显著优于自动生成的**。轨迹分析还给出两条关键结论：Agent 确实会照着具体指令做（包括使用仓库专属工具），但**仓库概览对定位相关代码没有帮助**。一个消融实验很说明问题：把仓库里其他文档全部移除后，自动生成的上下文文件反而平均提升 2.7%——说明问题主要在**冗余**，不在文件本身。

**③ dos Santos 等：六种「配置异味」，91/100 的仓库至少中一条。** [《Configuration Smells in AGENTS.md Files》](https://arxiv.org/abs/2606.15828)（SCAM 2026）挖了 100 个流行开源仓库的 AGENTS.md / CLAUDE.md，给出可直接拿来做审查清单的六类缺陷：

| 异味 | 命中率 | 含义 |
|---|---|---|
| Lint Leakage | 62% | 把 linter / formatter / 静态分析已经强制的规则又写一遍 |
| Context Bloat | 42% | 文件长到 Agent 难以可靠遵循（该研究以 200 行为界） |
| Skill Leakage | 35% | 低频、任务专属的流程塞在常驻文件里，本该做成按需 Skill |
| Conflicting Instructions | 28% | 规则互相矛盾（该项检测精度最低，比例仅作参考） |
| Init Fossilization | 24% | `/init` 生成后从未修改过 |
| Blind References | 16% | 只给一个路径，不说明里面是什么、何时该读 |

**④ Vercel：把知识做成 Skill，反而不如直接放进 AGENTS.md。** [《AGENTS.md outperforms skills in our agent evals》](https://www.vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals)（2026-01-27）针对 Next.js 16 中不在模型训练数据里的 API 做了一套硬化评测：

| 方案 | 通过率 |
|---|---|
| 无文档（基线） | 53% |
| 装了 Skill，默认行为 | 53%（**56% 的用例里 Skill 根本没被调用**） |
| Skill + 明确指令要求使用 | 79% |
| 压缩成 8KB 的文档索引直接放进 AGENTS.md | **100%** |

更值得记的是措辞的脆弱性：「你必须调用该 Skill」会让 Agent 先读文档、锚在文档模式上而漏掉项目上下文；「先探索项目结构，再调用该 Skill」效果更好。Vercel 把 40KB 文档索引压到 8KB 仍保持 100%，并明确说：**Skill 并没有失效，它更适合垂直、动作特定、由用户显式触发的工作流**（升级版本、迁移 App Router 等）；两者是互补关系。

**⑤ AAIF 五轮实验：单仓库的小样本，但方法很值得抄。** [《Measuring AGENTS.md: What Five Runs Show That One Doesn't》](https://aaif.io/blog/measuring-agents-md-what-five-runs-show-that-one-doesn-t)（2026-07）在一个真实仓库的两份克隆上，一份加 12 行 `AGENTS.md`、一份不加，同一 Agent、同一提示、每条件跑五次取中位数：模糊任务上 wall time 降 27%、credits 降 24%、diff 小 26%；多文件任务中位数收益 9–10%，但**五次里没文件的两次出现「重新在仓库里找方向」或「擅自跑生产构建」**，有文件的五次全部避开。作者自己反复强调：一个仓库、一个 Agent、十二行文件，只是「一个方向正确的数据点」，不是通用基准。

### 6.2 这些结论互相矛盾吗？不矛盾

把它们放在一起看，其实是同一条规律的不同侧面：

- Lulla 量的是**运行效率**，Gloaguen 量的是**任务成功率**，Vercel 量的是**模型根本不知道的新知识**能否被可靠送达。三者测的不是一件事。
- Gloaguen 和 Vercel 的差异主要来自**内容性质**：前者测的上下文文件大量复述仓库里已有的信息，后者塞进去的是模型训练数据里没有、且每次任务都可能用到的版本化 API 索引。
- 共同结论只有一句，[AAIF 编写指南](https://aaif.io/blog/writing-an-effective-agents-md)概括得最准：**「只写 Agent 无法安全推断的、仓库特有的信息，并在采用前用评测验证」**。冗余信息不是中性的，它每一轮都在收费。
- 还有一条容易被忽略的：**指令会被忠实执行**。所以「跑全量测试」「检查所有相关模块」这类泛化要求会引发不必要的探索，看起来很勤快，实际是成本和注意力双重浪费。[Gloaguen 论文](https://arxiv.org/abs/2602.11988)的轨迹分析直接记录了这一点。

### 6.3 十二个具体坑（可直接当审查清单）

1. **`/init` 生成完直接提交。** 自动生成的文件大量复述可发现信息，[Gloaguen 论文](https://arxiv.org/abs/2602.11988)里它是表现最差的一组；[Init Fossilization](https://arxiv.org/abs/2606.15828) 在 24% 的仓库里出现。正确做法是把 `/init` 输出当草稿，删掉 80% 再提交。
2. **写一大段项目架构与技术栈概览。** 轨迹分析显示对定位代码无帮助。
3. **把 linter / formatter 的规则抄进来。** 六类异味里命中率最高（62%）。规则交给工具配置。
4. **只加不删，越写越长。** [社区对规则演进的挖掘](https://wpnews.pro/news/is-agents-md-useful-what-the-research-found)里提到，每次 Agent 犯错就加一条「不要……」，文件因此持续膨胀。定期做减法。
5. **规则互相矛盾**（根目录说全量测试、子目录说只跑单测却没写清优先级）。Claude Code 官方文档明确说，两条指令冲突时它可能任选一条。
6. **引用文件不说明何时读、里面有什么**（Blind References）。写引用就写清「改数据库时读 `docs/migrations.md`」。
7. **把低频流程塞进常驻文件**（Skill Leakage，35%）。发布、迁移、评审清单应该做成 Skill。
8. **把 AGENTS.md 当权限用。** 它是上下文不是强制；破坏性命令、发布、迁移要靠[Hook](https://code.claude.com/docs/en/best-practices)、CI、分支保护和沙箱。
9. **写进密钥、凭据、私有运维细节。** [AAIF 指南](https://aaif.io/blog/writing-an-effective-agents-md)明确禁止。
10. **假设所有工具用同一套发现与合并逻辑。** 嵌套文件的加载方式因实现而异，必须实测自己依赖的工具。
11. **陈旧不更新。** 指向已搬走的目录、已废弃的 API，会被 Agent 忠实执行——「stale context 不是中性的，它以更高效率稳定地产生错误」。
12. **只跑一次就下结论。** 单次运行的耗时 / token 噪声极大，AAIF 的实验第一跑就得出过完全相反的结论；至少重复多次取中位数。

### 6.4 安全与供应链

AGENTS.md 是会被 Agent 当作指令读取的文本，因此它属于「输入」而不是「配置」：克隆第三方仓库、拉取 PR、引入模板仓库时，都应该像审阅 CI 脚本和依赖一样先读一遍里面的指令文件——尤其是包含 shell 命令、外部链接、`@` 导入、以及要求联网或读取敏感路径的内容。原则很简单：**只让可信来源的指令进入常驻上下文**；真正的隔离靠权限与沙箱，不靠「我在文件里写了不要」。

（这一节是原则性建议，不是对某个具体漏洞的报道；涉及 CI / Hook 的强制手段见 [Claude Code 官方文档](https://code.claude.com/docs/en/best-practices) 与 [AAIF 指南](https://aaif.io/blog/writing-an-effective-agents-md)。）

### 6.5 自己怎么测有没有用

照搬 AAIF 与 Vercel 的方法，最小化版本：

1. 选 3–5 个**真实、可自动判定**的任务（更好的是瞄准模型训练数据里没有的、本仓库特有的约束）；
2. 同一提示词、同一提交，做「有文件 / 无文件」两组，每组重复 3–5 次；
3. 记录完成与否、耗时、token、以及 diff 是否越界；取中位数，别看单次；
4. 逐条检查文件里哪些指令**从未影响过任何一次行为**，删掉；
5. 把「Agent 猜错的那一刻」转成一条具体规则，再测一轮。

Vercel 还提醒评测本身要过关：去掉测试泄漏、改用基于可观察行为的断言、聚焦训练数据里没有的 API，否则测出来的漂亮数字没有意义（[原文](https://www.vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals)）。

---

## 七、怎么和 Skill 搭配工作

这是最值得单独讲清楚的一节。两者不是「二选一」，也不是「谁替代谁」，而是**常驻事实层**与**按需能力层**的关系。

### 7.1 分工的本质：加载时机不同

[Agent Skills 规范](https://agentskills.io/specification)把这点写得很直白：Skill 是渐进式披露——启动时只加载所有 Skill 的 `name` + `description`（约 100 token 量级），命中触发条件才加载 `SKILL.md` 正文（建议 <5000 token），`references/` / `scripts/` / `assets/` 再按需读取；规范建议 `SKILL.md` 保持在 500 行以内。

而 `AGENTS.md` 每一轮都在上下文里，**没有「要不要加载」这个决策点**。Vercel 把 100% 通过率归因于三件事：没有决策点、每一轮都可用、没有「先读文档还是先看项目」的顺序问题（[原文](https://www.vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals)）。

于是分工自然浮现：

| | 放进 AGENTS.md | 做成 Skill |
|---|---|---|
| 每次任务都要知道的事实 | ✅ 包管理器、构建/测试命令、目录语义、硬边界 | ❌ |
| 模型训练数据里没有、又高频用到的知识 | ✅ 版本化 API 索引、压缩后的文档目录 | ⚠️ 按需加载会引入触发失败 |
| 只在某一类任务才需要的多步流程 | ❌ 会变成 Skill Leakage | ✅ 发布、迁移、评审、报表 |
| 长篇参考资料 | ❌ 每轮收费 | ✅ 放 `references/`，用到才读 |
| 可执行脚本 | ❌ 纯 Markdown 约定，不带运行时 | ✅ 放 `scripts/`，把确定性交给代码 |
| 必须不可绕过的规则 | ❌ 两者都只是上下文 | ❌ → 交给 Hook / CI / 静态检查 |

### 7.2 一条判断口诀：知识缺口，还是流程缺口

[一篇对 Vercel 评测的复盘](https://tpiros.dev/blog/when-to-write-an-agent-skill)给了很好用的二分法：

- **知识缺口**：模型不知道某个事实（例如 `cookies()` 在新版本里变成异步），没有步骤可循，只是写代码那一刻需要这个事实在场 → 做成按需加载等于给确定性事件加了一次掷硬币，**放 AGENTS.md**。
- **流程缺口**：模型知道这件事是什么，但不知道你们团队规定的顺序、阈值、模板和脚本（例如报销规则、发布清单、数据库迁移步骤），一个月只用几次 → **做成 Skill**。

另一份对比资料的说法更凝练：[「AGENTS.md 是 context，Skill 是 capability」](https://top-agent-skills.com/guides/skills-vs-agents-md)——前者管「开工前先知道什么」，后者管「这类活具体怎么干」。判断信号也很朴素：**当你发现自己第三次重复解释同一个流程，就该把它做成 Skill**。

### 7.3 Vercel 的结论该怎么读

「AGENTS.md 100% vs Skill 79%」很容易被读成「Skill 没用」，但[Vercel 自己](https://www.vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals)在同一篇里就写明了边界：这套评测测的是**通用框架知识**，属于横向、几乎每个任务都要用的信息；Skill 更适合**垂直、动作特定、用户显式触发**的工作流。[tpiros 的复盘](https://tpiros.dev/blog/when-to-write-an-agent-skill)也说得很清楚：Vercel 测的是「另一件事」，多数失望来自「用其中一个去干另一个的活」。

所以正确读法是：**高频、每次都要在场的确定性知识，不要做成按需；低频、动作特定的流程，不要塞进常驻。**

### 7.4 六种具体协同模式

**① AGENTS.md 当索引 / 目录。** 用一小节列出已装 Skill 与触发场景，一行一个，并写清「何时用」；[对比资料](https://top-agent-skills.com/guides/skills-vs-agents-md)特别强调 AGENTS.md 应该「指向 Skill 而不是复制它」。第四节的模板最后一段就是这个模式。

**② 措辞用「先探索，再使用」，不要用「必须调用」。** Vercel 的评测里，两种措辞导致的通过率与行为差异很大：`You MUST invoke the skill` 让 Agent 先锚在文档上、漏掉项目上下文；`Explore project first, then invoke skill` 先建立项目心智模型，再用文档做参照（[原文](https://www.vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals)）。

**③ 一个事实只放一处。** Skill 正文里不要重复 AGENTS.md 的命令和约定，让 Skill 假设「基础信息已经在场」，只写流程本身。重复意味着两份真相必然漂移（[同一份对比资料](https://top-agent-skills.com/guides/skills-vs-agents-md)）。

**④ 把触发词前置到 `description`。** [Agent Skills 规范](https://agentskills.io/specification)要求 `description` 同时说明「做什么」和「何时用」，并包含能帮助识别任务的关键词；[社区整理](https://kipt.me/guides/agents-md-vs-skills)还提到 Codex 建议把关键用例与触发词前置，因为 Skill 列表在宿主里可能被截断、描述被缩短（这是社区经验，非规范条文）。

**⑤ 硬性规则交给 Hook / CI，不靠这两者。** [Claude Code 官方文档](https://code.claude.com/docs/en/best-practices)明确：CLAUDE.md 与 Skill 都是 context，不是 enforcement；必须每次都成立的规则要用 Hook。[AAIF 指南](https://aaif.io/blog/writing-an-effective-agents-md)同样把「能被工具可靠执行的规则」排除在 AGENTS.md 之外。

**⑥ 控制 Skill 数量。** [社区资料](https://kipt.me/guides/agents-md-vs-skills)提到 Claude Code 的 Skill 列表约占上下文窗口 1%、Codex 初始列表默认上限 2%；装太多会让描述被压缩、触发变不可靠（非官方定论，以各工具文档为准）。这和「AGENTS.md 要短」是同一个逻辑：**常驻的元数据越多，真正重要的信号越稀**。

一份[中文分层实践](https://termdock.com/zh/blog/skill-md-vs-claude-md-vs-agents-md)给的量级可以参考：AGENTS.md 控制在 100 行内、CLAUDE.md 20 行内只放工具专属内容、Skill 各自可写到几百行，因为只在需要时付费。数字不是标准，但「常驻层薄、按需层厚」的结构是对的。

### 7.5 一个前后端 monorepo 的完整拆法

```
repo/
├── AGENTS.md                       # 常驻：12–40 行，见第四节模板
├── .agents/skills/                 # 或 .claude/skills/，按工具目录约定
│   ├── release/
│   │   ├── SKILL.md                # 发布顺序、版本号规则、回滚条件
│   │   └── scripts/bump.sh
│   ├── db-migration/
│   │   ├── SKILL.md                # 迁移步骤、锁表注意、回填模式
│   │   └── references/schema.md
│   └── code-review/
│       ├── SKILL.md                # 本仓库评审清单、严重级别定义、输出格式
│       └── assets/template.md
├── apps/web/AGENTS.md              # 前端：Vitest 路径、组件约定
└── services/api/AGENTS.md          # 后端：Python 版本、pytest、迁移红线
```

`AGENTS.md` 里只写：

```markdown
## 可用能力（按需）
- 发布与版本号：改到 `CHANGELOG` 或准备打 tag 时，先读项目结构，再使用 `release` Skill。
- 数据库 schema 变更：使用 `db-migration` Skill；不要直接修改已应用的迁移文件。
- 提交前自查：使用 `code-review` Skill 输出评审清单。
```

这样每个 Skill 的正文可以很长、可以带脚本和参考资料，但**只在对应任务出现时才进上下文**。这正是 Skill 规范里[渐进式披露](https://agentskills.io/specification)的设计目的，也避免了 [Skill Leakage](https://arxiv.org/abs/2606.15828) 这类异味。

### 7.6 一条信息的归属决策流程

```
这条信息 → 每次任务都要在场吗？
  ├─ 是 → 是「事实/命令/边界」，还是「不可绕过的强制」？
  │        ├─ 事实/命令/边界 → AGENTS.md（根目录，超长才拆嵌套）
  │        └─ 强制 → Hook / formatter / 静态检查 / CI + 在 AGENTS.md 里提一句
  └─ 否 → 是「某一类任务的流程/长资料」，还是「外部系统连接」？
           ├─ 流程/长资料/脚本 → Skill（正文 + references/ + scripts/）
           └─ 外部系统连接 → MCP
```

再补一条来自实践的顺序：**先写 AGENTS.md 的短版本，等真的出现重复解释的流程，再抽 Skill**。[Agent Skills 的提出背景](https://www.anthropic.com/news/skills)与[Anthropic 工程博客](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)讲的都是渐进式披露解决上下文窗口有限的问题；[Anthropic 关于上下文工程的文章](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)则解释了为什么「塞得越满、效果越差」。反过来，[Google Cloud 的评估规则](https://cloud.google.com/blog/topics/developers-practitioners/evaluate-agent-skills-before-they-bloat-your-context-window)给了个很好用的删减标准：一个技能如果在「有 / 无」对比里没有带来增益，它就是纯粹的上下文税，应该删掉——这条标准对 AGENTS.md 里的每一行同样成立。

---

## 八、落地清单

**第 0 天（15 分钟）**
- [ ] 根目录新建 `AGENTS.md`，先写 12 行：包管理器、构建 / 测试 / lint 命令、一条生成文件边界、一句「改动保持聚焦」。
- [ ] 把每条命令自己跑一遍，确认路径与 flag 有效。
- [ ] 提交进版本控制，像代码一样走评审。

**第 1 周**
- [ ] 用真实小任务做「有 / 无」对比，重复 3–5 次；把 Agent 猜错的地方转成具体规则。
- [ ] 确认每个在用的工具都真的加载了它（`/context`、打印合并指令、或让 Agent 复述硬规则）。
- [ ] 给不原生读取的工具写一行跳板（`@AGENTS.md` / 自有指令文件 / 配置项）。

**每月**
- [ ] 按六种异味审查一遍：lint 泄漏、长度、Skill 泄漏、冲突、init 化石、盲引用。
- [ ] 删掉从未影响过行为的行；把新出现的重复流程抽成 Skill。
- [ ] 检查引用路径、命令、版本号是否还有效；`/doctor prompt-audit` 可辅助。
- [ ] 嵌套文件只在子项目规则真的不同时才加，并用自己依赖的工具实测优先级。

**团队协作**
- [ ] 只维护一份真相，其余工具文件由脚本生成跳板，避免手工同步漂移。
- [ ] 把「改 AGENTS.md」放进 PR 评审范围；它和 CI 配置一样影响所有人的 Agent。
- [ ] 破坏性操作、发布、迁移、凭据相关动作一律保留人工确认，强制靠 CI / 分支保护。

---

## 九、几个高频疑问

**Q：需要 front-matter 吗？** 不需要。[官网 FAQ](https://agents.md/)明确没有任何必填字段，标题随便起。这点和 [SKILL.md 必须有 `name` / `description`](https://agentskills.io/specification) 正好相反。

**Q：AGENTS.md 和 CLAUDE.md 要二选一吗？** 通用内容放 `AGENTS.md`，Claude 专属内容放 `CLAUDE.md` 并用 `@AGENTS.md` 导入；[官方文档](https://code.claude.com/docs/en/memory)说明这样不会读两遍。新版本也可以直接设置成同时加载。

**Q：冲突时听谁的？** [官网](https://agents.md/)：离被编辑文件最近的一份优先，用户在对话里的显式指令覆盖一切。但[AAIF 指南](https://aaif.io/blog/writing-an-effective-agents-md)提醒，各实现如何发现与合并文件并不是同一套逻辑，嵌套场景要实测。

**Q：要不要把 README 抄进来？** 不要。README 写给人，AGENTS.md 写给 Agent；需要时给链接即可，复制会产生两份会漂移的真相。

**Q：写了就一定会被执行吗？** 不会。它是上下文不是配置：[Claude Code 文档](https://code.claude.com/docs/en/memory)说得很明白，要拦住一个动作请用 Hook；[AAIF 实验](https://aaif.io/blog/measuring-agents-md-what-five-runs-show-that-one-doesn-t)也把 enforcement 归给 CI 与沙箱。

**Q：能不能放密钥、内部地址？** 不能。[AAIF 编写指南](https://aaif.io/blog/writing-an-effective-agents-md)明确列出凭据、密钥、私有运维细节都不该进仓库指令文件。

**Q：文件该用中文还是英文写？** 规范不限定语言，各家文档也没给出统一结论。以团队实际使用的工具实测为准：同一份文件里保持术语、路径、命令一致，比纠结语言更重要。

---

## 十、结语

AGENTS.md 真正的价值，不是「多了一个配置文件」，而是把「这类项目该怎么干活」从各家工具的私有格式里抽出来，变成一份可 diff、可评审、可继承、跨工具复用的仓库资产。它和 MCP、Skill 一起，构成了 2025—2026 年 Agent 基础设施收敛的三条线：**常驻事实、按需能力、外部连接**。

但它的价值是有条件的。三份论文、一次平台评测、一次基金会实验指向同一句朴素的话：**只写 Agent 推断不出来的东西，并且诚实验证它是否真的改变了行为**。写满三页「写干净的代码、遵循最佳实践」，不如写清楚一行「从 `services/api` 跑 `pytest tests/`，不要直接编辑 `packages/client/generated/`」。

记住三层分工就不容易走偏：**AGENTS.md 管「永远成立的事实」，Skill 管「这一类任务怎么跑」，Hook / CI 管「不许绕过」**。剩下的功夫，几乎全在两件事上——把每一行都写成可验证的具体指令，以及定期把没用的行删掉。

---

## 参考资料

**官方规范与治理**

- [AGENTS.md 官网（规范、FAQ、支持工具清单、示例）](https://agents.md/)
- [规范源码仓库 agentsmd/agents.md](https://github.com/agentsmd/agents.md)
- [Factory：Factory joins AGENTS.md collaboration with OpenAI（2025-08-19）](https://www.factory.ai/news/agents-md)
- [OpenAI：OpenAI co-founds the Agentic AI Foundation under the Linux Foundation（2025-12-09）](https://openai.com/index/agentic-ai-foundation/)
- [Agentic AI Foundation 官网](https://aaif.io/)
- [Linux Foundation 成立 AAIF、MCP / goose / AGENTS.md 三个创始项目](https://aaif.io/news/sdtimes-linux-foundation-forms-agentic-ai-foundation-to-be-new-home-for-mcp-goose-and-agents-md/)
- [AAIF：Writing an effective AGENTS.md（编写指南，含研究综述与范例）](https://aaif.io/blog/writing-an-effective-agents-md)
- [AAIF：Measuring AGENTS.md — What Five Runs Show That One Doesn't（五轮实验）](https://aaif.io/blog/measuring-agents-md-what-five-runs-show-that-one-doesn-t)

**平台官方文档**

- [Claude Code：How Claude remembers your project（AGENTS.md、@导入、加载顺序、200 行建议、prompt-audit）](https://code.claude.com/docs/en/memory)
- [Claude Code：Best practices（Hook / Skill 分工）](https://code.claude.com/docs/en/best-practices)
- [OpenAI Codex：Custom instructions with AGENTS.md](https://developers.openai.com/codex/guides/agents-md)
- [Aider：Always-load conventions](https://aider.chat/docs/usage/conventions.html#always-load-conventions)
- [Gemini CLI：settings.json 配置](https://github.com/google-gemini/gemini-cli/blob/main/docs/get-started/configuration.md#available-settings-in-settingsjson)
- [TRAE：规则（Rules）官方文档](https://docs.trae.cn/ide_rules)

**Skill / 上下文工程**

- [Agent Skills Specification（frontmatter、目录结构、渐进式披露）](https://agentskills.io/specification)
- [官方 skills-ref 校验工具](https://github.com/agentskills/agentskills/tree/main/skills-ref)
- [Anthropic：Introducing Agent Skills](https://www.anthropic.com/news/skills)
- [Anthropic：Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [Anthropic：Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Google Cloud：Five rules for evaluating agent skills before they bloat your context window](https://cloud.google.com/blog/topics/developers-practitioners/evaluate-agent-skills-before-they-bloat-your-context-window)

**实证研究与评测**

- [Lulla 等：On the Impact of AGENTS.md Files on the Efficiency of AI Coding Agents（arXiv:2601.20404）](https://arxiv.org/abs/2601.20404)
- [Gloaguen 等：Evaluating AGENTS.md — Are Repository-Level Context Files Helpful for Coding Agents?（arXiv:2602.11988）](https://arxiv.org/abs/2602.11988)
- [dos Santos 等：Configuration Smells in AGENTS.md Files（arXiv:2606.15828，SCAM 2026）](https://arxiv.org/abs/2606.15828)
- [Vercel：AGENTS.md outperforms skills in our agent evals（2026-01-27）](https://www.vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals)
- [Is AGENTS.md useful? What the research found（多项研究的中文可读综述，第三方）](https://wpnews.pro/news/is-agents-md-useful-what-the-research-found)

**社区整理与中文资料（非官方定论）**

- [AGENTS.md: Inside the Open Standard（对起源传说的逐条查证）](https://dev.to/dublecc/agentsmd-inside-the-open-standard-for-briefing-coding-agents-4fag)
- [AI 工具兼容性矩阵（国内工具支持情况，第三方维护、易过时）](https://github.com/wildcat430524/StepsToGreat/blob/main/docs/AGENT-COMPAT.md)
- [How to write an effective AGENTS.md（平台差异与配置方式整理）](https://agent-ready.dev/how-to-write-an-effective-agents-md)
- [Agent Skills vs AGENTS.md（分工与索引模式）](https://top-agent-skills.com/guides/skills-vs-agents-md)
- [SKILL.md vs CLAUDE.md vs AGENTS.md（中文分层实践）](https://termdock.com/zh/blog/skill-md-vs-claude-md-vs-agents-md)
- [When to write an agent skill（知识缺口 / 流程缺口）](https://tpiros.dev/blog/when-to-write-an-agent-skill)
- [AGENTS.md vs skills（Skill 列表预算与触发率，社区经验）](https://kipt.me/guides/agents-md-vs-skills)
- [Do Auto-Generated AGENTS.md Files Actually Help?（四篇研究的合并解读）](https://codex.danielvaughan.com/2026/07/26/do-auto-generated-agents-md-files-actually-help-codex-cli-init-research-evidence-context-engineering)
- [一个文件让 AI Coding 效率翻倍：AGENTS.md 实践指南（中文）](https://view.inews.qq.com/a/20260506A0271500)
- [使用 Agents.md 让 AI 写代码更可控（中文）](https://blog.csdn.net/qq_43745578/article/details/162913889)
- [AGENTS.md 深度解析：为 AI 代理而生的 README（中文）](https://www.cioage.com/article/845573.html)
- [百度百科：AGENTS.md（含未经一手证实的起源叙述，仅作对照）](https://baike.baidu.com/item/AGENTS.md/67757810)

**真实项目的 AGENTS.md 范例**

- [openai/codex](https://github.com/openai/codex/blob/main/AGENTS.md)、[microsoft/vscode](https://github.com/microsoft/vscode/blob/main/AGENTS.md)、[rails/rails](https://github.com/rails/rails/blob/main/AGENTS.md)
- [ipfs/kubo](https://github.com/ipfs/kubo/blob/master/AGENTS.md)、[WordPress/gutenberg](https://github.com/WordPress/gutenberg/blob/trunk/AGENTS.md)、[Azure/azure-sdk-for-go](https://github.com/Azure/azure-sdk-for-go/blob/main/AGENTS.md)
- [cloudflare/agents](https://github.com/cloudflare/agents/blob/main/AGENTS.md)、[googleworkspace/go-samples](https://github.com/googleworkspace/go-samples/blob/main/AGENTS.md)

> 平台的目录、命令、默认值与版本会持续变化，动手前请以对应官方文档为准。文中所有具体数字、行数上限与配额均来自上述资料；未做实测的部分已注明来源性质，社区与第三方观点不代表官方结论。

