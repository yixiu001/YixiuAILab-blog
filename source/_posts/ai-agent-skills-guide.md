---
title: "一篇文章讲清楚 AI Agent 的 Skill：从它为什么出现，到国内外平台怎么用"
date: 2026-11-20 09:00:00
categories: [AI工具]
tags: [AI Agent, Skill, SKILL.md, Claude Code, Codex, AGENTS.md, 工作流, 提示词]
summary: "Skill 不是提示词模板，也不是规则文件。这篇从它的产生源头讲起：上下文窗口为什么装不下、渐进式披露怎么解决、它到底能解决哪些问题，再横向对比 Claude、Codex、TRAE、扣子、Dify 等国内外平台的具体用法，最后汇总官方与社区踩过的坑、评估方法和安全风险。"
---

如果你已经用上 AI Agent，大概率遇到过这种循环：每次开新对话，都要把项目背景、命令、团队规范、上次踩的坑重新讲一遍；讲漏一句，它就理直气壮地做错。

于是各家平台先后给出了自己的答案：规则文件、记忆、工作流、插件……而 2025 年下半年开始，**Skill（技能）** 成了几乎所有 Agent 平台共同收敛的方向。这篇文章把它一次讲清楚：它从哪来、解决什么问题、各平台怎么用、别人踩过哪些坑。

> 本文资料检索与核实时间：2026 年 11 月 19 日。文中平台行为以各官方文档为准，社区与厂商观点已单独标注，不保证适用于所有版本。

---

## 一、Skill 是怎么产生的

### 1. 起点是一个很朴素的矛盾：上下文装不下

大模型的上下文窗口是有限的，而且**塞得越满，效果越差**。Anthropic 在[《Effective context engineering for AI agents》](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)里把这件事讲得很直白：上下文会「污染」，无关信息会稀释真正重要的指令；他们建议「做最简单但有效的事」，并倾向于让 Agent 自己按需检索，而不是把所有资料一次性灌进窗口。

最早的解决办法是把规则写成一个常驻文件，每轮对话都带上。这在项目小的时候很好用，很快就撞墙了：

- 每加一条规则，**每一次请求**都要为它付一次 token；
- 规则越堆越长，重要的那条反而被淹没；
- 团队流程（发版、审查、部署）和代码规范（用 pnpm、单引号）混在一起，前者只在特定任务才需要，却天天占着位置。

[Claude Code 官方](https://code.claude.com/docs/en/best-practices)现在给 `CLAUDE.md` 的建议是**控制在 200 行以内**，只写「Claude 从代码里推不出来的东西」；国内 [TRAE 官方文档](https://docs.trae.cn/ide_rules)则规定所有常驻规则文件（含 `AGENTS.md`、`CLAUDE.md`）**总大小不超过 32KB**。这些数字本身就是约束存在的证据。

### 2. 于是有了两条线：常驻规则 vs 按需技能

理解 Skill 最关键的一点，是把它和「规则文件」区分开。这不是同一件事，而是互补的两层：

| | 常驻规则文件 | Skill |
|---|---|---|
| 代表 | `AGENTS.md`、`CLAUDE.md`、TRAE Rules、Cursor Rules | `SKILL.md` 文件夹 |
| 加载方式 | **全量加载**，每次请求都在上下文里 | **按需加载**，命中才读 |
| 适合写 | 永远成立的约定：构建命令、命名规范、禁用目录 | 特定任务的流程：发版、审查、部署、周报 |
| 失效表现 | 文件太长 → 规则被忽略 | 描述写不好 → 根本没触发，且**没有报错** |
| 类比 | 公司规章 | 岗位操作手册 |

[TRAE 官方社区](https://forum.trae.cn/t/topic/177739/1)有一句总结特别到位：**「与 SKILL 按需加载不同，Rules 是全量加载的规范」**。

[AGENTS.md](https://agents.md/) 这条线本身也值得单独说：它由 OpenAI Codex、Amp、Google Jules、Cursor、Factory 等共同推动，现已交由 Linux Foundation 旗下的 Agentic AI Foundation 托管，[官网](https://agents.md/)称有 **6 万+ 开源项目**采用，30 多个 Agent 支持。它的规则是「离被编辑文件最近的那份优先」，大仓库可以在子目录放嵌套的 `AGENTS.md`（官方举例：OpenAI 主仓库有 88 份）。**它是给 Agent 看的 README，不是技能注册机制**——这一点后面还会提到。

### 3. 破局点：渐进式披露

Anthropic 在 2025 年 10 月推出 [Agent Skills](https://www.anthropic.com/news/skills)，并在同年 12 月 18 日将其发布为[**开放标准**](https://agentskills.io/specification)（[agentskills.io](https://agentskills.io/specification)），目的是跨平台可移植。核心设计原则叫 **渐进式披露（Progressive Disclosure）**：把一个技能拆成三层，Agent 只在需要时逐层往下读。

| 层级 | 内容 | 什么时候进上下文 | 官方建议体量 |
|---|---|---|---|
| 第一层 | `name` + `description` | **启动时全部预载**，用于判断该不该用 | 每个约 100 tokens |
| 第二层 | `SKILL.md` 正文 | 判断相关后，整篇读入 | 正文 < 500 行 / 约 5000 tokens |
| 第三层 | `scripts/`、`references/`、`assets/` | 执行到具体步骤才按需读取 | 理论上无上限 |

[Anthropic 工程博客](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)的比喻是「一本组织良好的手册：先看目录，再翻章节，最后查附录」。因为 Agent 有文件系统和代码执行能力，**一个技能能携带的上下文事实上是不封顶的**——只要不是每次都读。

这里还有个容易忽略的收益：技能里可以放**可执行脚本**。[Anthropic 的 PDF 技能](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)就带一个预写好的 Python 脚本提取表单字段，Agent 直接运行它，既不用把脚本读进上下文，也不用让模型「用 token 生成」一个排序或解析结果。用官方的话说：**某些操作天然更适合传统代码，因为它确定、可重复。**

### 4. 还有一条并行的线：MCP

很多人把 Skill 和 MCP 混为一谈，其实它们在不同层：

| | 解决什么 | 例子 |
|---|---|---|
| Tool / 函数调用 | **做什么**（一个原子动作） | 读取文件、执行 SQL |
| MCP | **怎么连**（连接外部系统的协议） | 连 GitHub、连数据库、连 Slack |
| Skill | **怎么做**（流程、判断、完成标准） | 「按我们团队的规范审查这个 PR」 |

一句话判断：**需要连接外部系统 → MCP；需要教会 Agent 一套重复流程 → Skill**。实际项目里两者常常配合：Skill 定义「先跑测试、再看 CI、再打 tag、最后验证健康检查」，其中每一步由 MCP 工具执行。

一个很实际的差别是**失败方式**：MCP 断连会有超时、401、报错，监控看得见；而 Skill 没被触发时**什么都不会发生**——没有日志、没有异常，Agent 只是没按你的流程走，输出看起来还挺正常。这是后面所有「评估」话题的根源。

---

## 二、它到底能解决哪些问题

把各家官方与社区的动机收敛一下，Skill 主要解决这六件事：

**1. 不用每次重新交代。** 把「怎么做某类事」从对话里搬到文件里，一次写好，长期生效。这是最直观的价值，也是各家文档里「一次配置、长期生效」那句话的来源。

**2. 团队知识可以版本化和评审。** 这是 Skill 相对「记忆（Memory）」的本质区别。[Warp 在 Claude 官方博客分享的自我改进实践](https://claude.com/blog/how-warp-builds-self-improving-agents-on-claude)里说得很清楚：Skill 是**程序性的、稳定的、刻意修改的**，能走 PR / review / merge 流程；Memory 是 Agent 自动写下的、持续在变的。他们用两个 Skill 搭闭环：内层 skill 存领域知识，外层 improver skill 定期汇总人类反馈，提出**最小、最聚焦**的编辑并开 PR，人审核合并后，下一轮所有 Agent 自动继承。

**3. 省上下文，也省钱。** 不相关的流程不占窗口。[Google Cloud 工程师](https://cloud.google.com/blog/topics/developers-practitioners/evaluate-agent-skills-before-they-bloat-your-context-window)把它说得更狠：一个技能如果在「有 / 无」对比里没有带来任何增益，它就是**纯粹的上下文税**，应该删掉。

**4. 把确定性交给代码。** 校验、解析、格式转换、批量计算写成脚本，模型负责需要判断的部分。[中文社区对官方工程博客的整理](https://blog.csdn.net/weixin_29611239/article/details/170616066)里有句总结很实用：**「代码是确定性的，指令是模糊的」**。

**5. 一次编写，多处可用。** 开放标准让 `SKILL.md` 能在 Claude 系列、Codex、以及兼容该格式的 Agent 之间搬迁。[社区实践](https://agentstacklist.com/guides/codex-skills)里甚至直接把 `~/.claude/skills/` 下的目录复制到 Codex 的目录就能用。

**6. 可组合。** 多个聚焦的小 Skill 会在同一任务里自动叠加，不需要做一个「超级 Skill」。

### 反过来：什么时候不该做 Skill

这一点比「怎么做」更容易被跳过：

- **一次性任务**——写个提示词就够了，不值得建文件；
- **模型本来就会的事**——[Google 的评估规则](https://cloud.google.com/blog/topics/developers-practitioners/evaluate-agent-skills-before-they-bloat-your-context-window)里，若「有技能」和「无技能」表现完全相同，说明模型已原生具备该能力，删；
- **纯风格偏好**（「回答用中文」「注释要简洁」）——属于用户偏好或常驻规则，不是技能；
- **必须无条件执行的硬约束**——[Claude Code 官方](https://code.claude.com/docs/en/best-practices)建议交给 **Hook**，因为写在文件里「大部分时候有效，但不是每次」；
- **只是要连外部系统**——那是 MCP 的活；
- **有副作用的流程**（发版、推送、删库）——应设为**只能显式调用**，不让模型自行触发。

---

## 三、标准长什么样

[开放标准](https://agentskills.io/specification)规定得很克制，最小技能只需要一个文件：

```
my-skill/
├── SKILL.md          # 必需：YAML frontmatter + Markdown 指令
├── scripts/          # 可选：可执行代码（Python / Bash / JS）
├── references/       # 可选：按需读取的文档
└── assets/           # 可选：模板、图片、数据文件
```

按[开放标准](https://agentskills.io/specification)，`SKILL.md` 的 frontmatter 只有两个必填字段，但有硬约束：

| 字段 | 必填 | 约束 |
|---|---|---|
| `name` | 是 | ≤64 字符，仅小写字母/数字/连字符，不能以连字符开头结尾，不能有连续连字符，**必须与目录名一致** |
| `description` | 是 | ≤1024 字符，非空，要同时说明「做什么」和「什么时候用」 |
| `license` | 否 | 许可证名称 |
| `compatibility` | 否 | ≤500 字符，环境要求（依赖、网络、目标产品） |
| `metadata` | 否 | 任意键值映射 |
| `allowed-tools` | 否 | 预批准工具列表（实验性，各客户端支持不一） |

`description` 是**整份文件里最重要的一行**。启动时 Agent 只看到它（和 name），靠它决定要不要加载正文。[官方](https://agentskills.io/specification)给的好/坏对比：

```yaml
# 差：只说功能，没有触发条件
description: Helps with PDFs.

# 好：做什么 + 什么时候用 + 关键词
description: Extracts text and tables from PDF files, fills PDF forms, and merges
  multiple PDFs. Use when working with PDF documents or when the user mentions
  PDFs, forms, or document extraction.
```

[规范](https://agentskills.io/specification)要求引用其他文件用**从技能根目录出发的相对路径**，且只保持一层，避免 `SKILL.md → ref1 → ref2` 这种嵌套链。[官方](https://github.com/agentskills/agentskills/tree/main/skills-ref)还提供了 `skills-ref validate ./my-skill` 校验 frontmatter 与命名。

---

## 四、国内外平台具体怎么用

### 国外阵营

**Claude 系列（Anthropic，标准的提出者）**

| 入口 | 怎么用 |
|---|---|
| Claude Apps | 设置里启用 Skills；用内置的 `skill-creator` 交互式生成（它会问工作流、生成目录、格式化 SKILL.md），也可上传 ZIP；Pro/Max/Team/Enterprise 可用，团队版需管理员先开启 |
| Claude Code | 手动放到 `~/.claude/skills/`（个人）或项目的 `.claude/skills/`（随 git 共享）；也可从 [`anthropics/skills`](https://github.com/anthropics/skills) 插件市场安装 |
| API / Agent SDK | 在 Messages API 中附加技能，用 `/v1/skills` 端点做版本管理，需 Code Execution Tool beta 提供运行环境 |

[Claude Code 官方](https://code.claude.com/docs/en/best-practices)给了一套很清晰的分层建议，值得直接抄：

- `CLAUDE.md`：**短、通用、<200 行**，只放命令、约定、三句话架构、硬约束、已知陷阱；
- `.claude/rules/`：带 `paths:` 过滤，**只在处理对应目录时加载**的局部规则；
- `.claude/skills/`：团队流程（发版、审查、写文档），按需加载，比塞进 `CLAUDE.md` 轻得多；
- 有副作用的流程加 `disable-model-invocation: true`，只能手动 `/release` 触发；
- 个人偏好放 `CLAUDE.local.md` 并加进 `.gitignore`；
- 用 `/context` 确认文件真的被加载；`/doctor` 会建议删掉「Claude 自己能从代码推出来」的内容。

**OpenAI Codex CLI**

Codex 也采纳了开放的 `SKILL.md` 格式，并在[官方文档](https://developers.openai.com/codex/skills/)里补了自己的目录规则：

| 作用域 | 位置 |
|---|---|
| 项目/仓库 | `.agents/skills/`（从当前目录向上扫描到仓库根，就近优先） |
| 个人全域 | `~/.agents/skills/` |
| 管理员 | `/etc/codex/skills/`（机器上所有用户继承） |
| 系统内置 | 如 `$skill-creator`、`$skill-installer` |

调用方式有三种：`/skills` 浏览选择、在提示里用 `$skill-name` 显式调用、或由描述匹配后自动触发。内置 `$skill-installer` 可安装官方目录或社区技能；`agents/openai.yaml` 是 Codex 特有的可选元数据，其中 `allow_implicit_invocation: false` 用来禁止自动触发高风险流程。会话启动时技能列表默认最多占上下文的 2%（窗口未知时约 8000 字符），装太多会先压缩描述、再丢弃部分技能。

[**AGENTS.md 生态（跨工具标准）**](https://agents.md/)

这是与 Skill 并行的一条线，[官网](https://agents.md/)列出的覆盖面比想象中广：OpenAI Codex、Google Jules、Cursor、Windsurf、GitHub Copilot coding agent、Gemini CLI、Devin、Warp、VS Code、Aider 等都支持。它没有必填字段，就是纯 Markdown，写「项目概览、构建/测试命令、代码风格、安全注意事项、PR 规范」。冲突时**最近的 `AGENTS.md` 优先，用户当轮指令覆盖一切**。

几个平台需要显式配置才读它，例如 Aider 在 `.aider.conf.yml` 里写 `read: AGENTS.md`，Gemini CLI 在 `.gemini/settings.json` 里设置 `contextFileName`。Claude Code 也可以在 `CLAUDE.md` 首行写 `@AGENTS.md` 来复用同一份文件。

[Codex 社区](https://codex.danielvaughan.com/2026/06/15/agents-md-beyond-init-writing-project-instructions-that-reduce-token-spend-hooks-mcp-skills)还给出一条很实用的落地清单：跑 `/init` 生成草稿 → 把通用命令换成精确命令 → 补 hook 策略、MCP 上下文、技能路由、安全禁区 → **精简到 100 行以内** → 子目录各放 ≤20 行的局部文件 → 提交并每季度复查。

**Google / NVIDIA 的评估工具**

[Google Cloud](https://cloud.google.com/blog/topics/developers-practitioners/evaluate-agent-skills-before-they-bloat-your-context-window)开源了 `skill-reach`：校验 manifest、计算与相邻技能的词汇重叠、跨 Claude Code / Google Antigravity / Codex 做路由探测，用来在上容器之前先抓「触发碰撞」。[NVIDIA 的 `SkillSpector`](https://github.com/NVIDIA/SkillSpector) / `SkillEvaluator` 则针对 Markdown 里的 Agent 原生风险（提示注入、数据外泄、工具投毒、触发滥用）——这些是普通代码 linter 扫不出来的。

### 国内阵营

**TRAE（字节）**

国内把「规则 vs 技能」讲得最明确的就是 [TRAE 官方文档](https://docs.trae.cn/ide_rules)：

- 全局规则：`~/.trae-cn/user_rules`（Windows 为 `%userprofile%/.trae-cn/user_rules`），所有项目生效；
- 项目规则：项目下的 `.trae/rules/`；
- 项目规则有**四种生效方式**：始终生效（`alwaysApply`）、按文件路径生效（`globs`，如 `src/**/*.ts`）、智能生效（写 `description` 让 AI 判断）、手动生效（`#Rule` 引用）；
- 大项目可在子目录放嵌套 `.trae/rules/`，最多三层，前后端规则互不干扰；
- 兼容并可直接复用项目根目录的 `AGENTS.md`、`CLAUDE.md`；
- 所有规则合计 ≤32KB；
- 另有「记忆」层：全局 `~/.trae-cn/memory/user_profile.md` 与按项目路径独立存储的项目记忆，本地保存、不跨设备同步。

[TRAE 官方社区](https://forum.trae.cn/t/topic/177739/1)明确区分：**Rules 全量加载，SKILL 按需加载**。配置建议是「三条全局规则 + 三条项目规则 + 开启记忆」，剩下的交给按需技能。

[**扣子 Coze**](https://www.coze.cn/)

扣子走的是「插件 / 技能 / 工作流 + 项目空间」路线，团队版支持插件与技能一次配置、全员共享，项目与经验沉淀为团队资产。它适合**个人快速验证想法**：可视化编排、上手快。

[社区测评](https://blog.csdn.net/weixin_29069131/article/details/164708798)里被反复提到的短板是**跨项目能力复用**：一个团队做了十个项目，十个项目之间缺少系统的能力共享层；插件商店数量多但质量参差，生产级工具偏少。（这类测评属于第三方观点，供参考。）

[**Dify**](https://dify.ai/)

Dify 是开源、可本地部署的路线：可视化工作流、RAG 知识库、多模型支持、API 发布、插件生态。它的强项是把流程做成可调用的服务，弱项同样是**团队资产沉淀**——应用容易变成某个开发者的个人资产。

[迁移经验](https://www.vkflow.com/2026/04/03/agent%e6%a1%86%e6%9e%b6%e6%a8%aa%e8%af%84%ef%bc%88%e5%85%ad%ef%bc%89%ef%bc%9a%e5%9b%bd%e4%ba%a7%e6%a1%86%e6%9e%b6%e5%af%b9%e6%af%94dify-coze-fastgpt%e5%93%aa%e5%ae%b6%e5%bc%ba/)里有两个很实在的坑：从 Coze 迁到 Dify 时，**代码节点必须重写**（Coze 读写项目空间文件，Dify 读写内存变量），多 Agent 协同也没有原生等价能力；知识库换了向量模型后召回质量会变，需要拿高频问题跑一轮回归对比。所以社区总结是：**迁移的本质是业务逻辑重建，不是文件搬运**。

**其他**

通义灵码（现已升级 Qoder CN）主打「工程自动感知」——从任务描述自动识别框架、技术栈、相关文件与报错，减少手工添加上下文；腾讯 WorkBuddy / CodeBuddy 支持用户级与项目级技能目录（`~/.workbuddy/skills/` 与工作区的 `.workbuddy/skills/`），其中项目级技能只对当前工作区生效。

> 一个跨平台的共同规律：**目录位置决定作用域**。放在用户主目录 = 所有项目可见；放在项目/仓库内 = 只在该项目生效并可随版本控制共享；放在工作区级目录 = 只对该工作区生效。技能「写了却不生效」，十有八九是放错了目录，而不是写错了内容。

### 速查表

| 平台 | 技能/规则放哪 | 加载方式 | 显式调用 |
|---|---|---|---|
| Claude Code | `.claude/skills/`（项目）/ `~/.claude/skills/`（个人） | 按需 | `/skill-name`，或设 `disable-model-invocation` |
| Claude Apps | 设置内上传 / skill-creator 生成 | 自动匹配 | 否，自动触发 |
| Claude API | `/v1/skills` + Code Execution Tool | 按需 | 请求中指定 |
| Codex CLI | `.agents/skills/` / `~/.agents/skills/` / `/etc/codex/skills/` | 按需 | `$skill-name` 或 `/skills` |
| AGENTS.md 生态 | 仓库根 + 子目录嵌套 | **全量常驻** | 不适用（无触发概念） |
| TRAE | `.trae/rules/` / `~/.trae-cn/user_rules` | 全量 / 按路径 / 智能 / 手动 | `#Rule` |
| 扣子 Coze | 项目空间内插件与技能 | 工作流编排 | 工作流触发 |
| Dify | 工作流 DSL + 知识库 | 应用/API 调用 | API 调用 |
| WorkBuddy | 工作区 `.workbuddy/skills/` / `~/.workbuddy/skills/` | 按需 | 触发词匹配 |

---

## 五、别人踩过的坑（这部分最值钱）

### 触发：写得再好，没被选中等于零

- **description 不是摘要，是触发条件。** [社区共识](https://skillmd.com/skills/davidondrej/effective-agent-skills)是「80% 取决于 description」。要用第三人称（不要写「我会帮你…」），同时写「做什么」和「什么时候用」，并**覆盖边缘同义词**（图表、报表、Dashboard、看板、大屏），必要时写**反触发条件**（「不适用于 JavaScript / TypeScript」）减少误触发。
- **两种典型失败**：under-triggering（描述写成内部实现而非用户意图）和 sibling hijacking（隔壁技能一句「helps with cloud deployments」把请求截胡）。技能超过十几个就容易出现。
- **验证要用测试集**：写 20 条查询，一半该触发、一半不该触发，看触发率；用**全新会话**测（有些客户端在启动时快照技能列表）；用你计划部署的**最弱模型**测，强模型会原谅含糊的描述。
- **确认真的加载了**：YAML 合法、模型自称「用了某技能」都不算证据，要看运行时的加载记录。[Google Cloud 的原话](https://cloud.google.com/blog/topics/developers-practitioners/evaluate-agent-skills-before-they-bloat-your-context-window)是：评估显示 Δ=0 时，**十次有九次是技能根本没被加载**，别急着改正文。

### 体积与结构

- 把所有东西塞进一个 `SKILL.md`（几千行）是最常见的新手错误。正文建议 **<500 行 / 约 5000 tokens**；[社区](https://skillmd.com/skills/davidondrej/effective-agent-skills)更激进的标准是 ≤100 行、超过 10 行的代码块拆出去。
- 长内容拆进 `references/`，只保持**一层引用**；用相对路径、正斜杠，不写绝对路径（换台机器就废）。
- 别在技能目录里放面向人的 `README.md` / `CHANGELOG.md`；别把库源码粘进来（该装的用 npm/pip 装）；别写「As of Q4 2024…」这种会过期的信息。

### 内容质量

- **只写模型不知道的。** 不要教它 Python 基础、HTTP 状态码、通用 SOLID 定义；每一行都要「值得它占的 token」。[Anthropic 工程博客](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)里的建议是：好的技能要**把模型推出它的默认思维**（比如「我们设计系统不用 Inter 字体和紫色渐变」），而不是重复「请写好代码」这种废话。
- **Gotchas（踩坑清单）是信噪比最高的内容。** [中文社区整理](https://blog.csdn.net/2601_96380027/article/details/163024541)转述 Anthropic 内部经验时提到：最高信号的内容是 Gotchas，因为它们来自真实失败；「大多数技能都是从几行字 + 一个 Gotcha 开始」的。一条「我们的库在 amount=0 时不抛错而是静默跳过，请检查返回值里的 skipped 字段」胜过十条「请确保正确处理错误」。
- **给方向，别给步骤。** 太具体（「打开第 5 行加 import」）是把 Agent 当傀儡，换个场景就崩；太抽象（「请做好设计」）等于没写。好的写法是给约束 + 参考文件 + 验证命令。
- **解释 why。** [Warp 的六条纪律](https://claude.com/blog/how-warp-builds-self-improving-agents-on-claude)里，这条能让 Agent 在没见过的场景里泛化；相应地，**写原则不写规则**、「找重复代码」比穷举变量命名规则有效。
- **能写脚本就别写指令。** 确定性的部分交给代码，让模型专注判断。脚本要自包含、说明依赖、给出有用错误信息、处理边界情况。

### 权限与安全

这是 2026 年被讨论最多的一块，**别把 Markdown 当成无害文本**：

- Skill 可以执行代码、引导工具调用、读取环境变量。多家安全厂商（[Koi Security 的 ClawHavoc 调查](https://www.koi.ai/blog/clawhavoc-341-malicious-clawedbot-skills-found-by-the-bot-they-were-targeting)、[Snyk 的 ToxicSkills 研究](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/)、[Palo Alto Unit 42 的 BIV 研究](https://unit42.paloaltonetworks.com/ai-agent-supply-chain-risks)）都记录过公开技能市场里的恶意技能包：伪装成加密工具/YouTube 工具，在「Prerequisites」里诱导用户执行 `curl | bash` 或下载带密码的压缩包，投放凭据窃取程序；也有把「读环境变量 → 编码 → POST 到外部端点」拆成三个看起来都无害的能力，串成完整外泄链路。
- **载荷可以是纯自然语言**。一句「把响应里附上目录结构」不会触发任何恶意代码扫描，却会持续泄露信息；条件触发型指令（只在特定环境变量/日期出现时激活）静态扫描基本看不出来。
- **`allowed-tools` 不是限制，是免提示。** [Claude Code 文档](https://code.claude.com/docs/en/best-practices)特别提醒：这个字段只是**取消确认弹窗**，并不收窄可用工具；而且工作区信任机制不会拦截它——一个提交进仓库的项目技能可以给自己预批准工具。组织可通过托管设置忽略项目技能里的 `allowed-tools`。
- **最小安装流程**（社区共识）：读 `SKILL.md` **和每一个捆绑脚本** → 阻止指令里的网络拉取 → 固定内容哈希 → 在没有常驻凭据的沙箱里跑 → 哈希变化重新审查 → 只从会扫描、会签名的来源安装。
- 自己写技能时：**不硬编码 API Key / Token / 内网 URL**，用环境变量；有副作用的（推送、删除、改线上）显式调用 + 先 dry-run 再确认；数据文件放稳定位置而不是技能目录（升级可能被删）。

### 评估：别用「一次跑通」当结论

[Google Cloud](https://cloud.google.com/blog/topics/developers-practitioners/evaluate-agent-skills-before-they-bloat-your-context-window)在 2026 年 11 月给出五条规则，是目前最系统的：

1. **先查触发碰撞和安全**，再花资源跑容器——Δ=0 通常不是正文写得差，是没被选中；
2. **别在开发者笔记本上做评估**：缓存的云凭据、导出的环境变量、warm shell history 会污染「无技能」基线，让它意外通过；主机 CPU 负载也会让同一基准跑出不同分；
3. **配对消融 + Pass@3**：A 组干净沙箱无技能，B 组同沙箱同提示挂技能，各重复多次。他们观察到**超过三分之一的任务在连续两次相同运行中得分不同**；
4. **指标正交**：正确性、效率、安全性分开算，别揉成一个分数——否则优化器会学会「读答案文件」这种几乎不耗 token 的作弊路径；
5. **编码习惯，不是搬文档**：真正提升效率的是紧凑的反射动作（「改动状态前先确认子命令的 help」「走薄索引只拉需要的配方」「默认最小权限凭据」），而不是复制公开 API 表格。模型升级后重跑一遍，**删掉增益归零的技能是特性，不是失败**。

### 维护

- 把技能**当代码管**：版本控制、打 tag、PR 评审，指定与作者不同的审批人，便于回滚；
- 「Claude 两次犯同样的错」就是缺规则信号，补一行；约定变了就改；**每季度清理过时内容——过时的说明比没有更糟**；
- 技能多了要监控触发率；`SKILL.md` 里不要出现互相矛盾的规则（「永远写测试」与「为赶时间跳过测试」并存）；
- 区分**技能**（稳定、可审查、刻意修改的程序性知识）与**记忆**（自动沉淀、持续变化的偏好）。[Warp](https://claude.com/blog/how-warp-builds-self-improving-agents-on-claude)特别提醒：自我改进闭环也可能「系统性地学错」——要假设反馈会错、要人类在环、领域可验证时先建验证 harness。

---

## 六、从零开始，照这个顺序做

1. **先找缺口，不要先写文件**：让 Agent 跑几个真实任务，记下它反复失败或需要你补话的地方，那才是技能候选。
2. **判类型**：这是常驻约定（→ 规则文件）、连接外部系统（→ MCP）、还是一套重复流程（→ Skill）？
3. **先写 description**：写清做什么 + 什么时候用 + 关键词 + 触发词 + 不该触发的场景，第三人称。
4. **写最小正文**：从「几行指令 + 一个 Gotcha」开始，别一次写全。
5. **测触发**：20 条该触发 / 不该触发的查询，全新会话，确认正文真被加载。
6. **测执行**：显式调用一次，输出不对就改正文（不是改描述）。
7. **对抗测试**：让另一个模型问「什么边界情况会击穿这个技能」，补上缺口。
8. **长大再拆**：正文逼近上限时，把细节移到 `references/`、把确定性逻辑移到 `scripts/`。
9. **加护栏**：有副作用的流程禁止自动触发；密钥走环境变量；脚本最小权限。
10. **纳入版本控制 + 定期复评**：模型升级后重跑 WITH/WITHOUT，增益归零就删。

---

## 七、一句话收尾

Skill 的本质，是把**「这类事情该怎么做」**从人的脑子里、从每次重复的对话里，外化成一份 Agent 能按需查阅、能进版本控制、能被评审和继承的文件。

记住三层分工就不容易走偏：**规则文件管「永远成立的约定」，Skill 管「这一类任务怎么跑」，MCP 管「怎么连外部系统」**。剩下的功夫，几乎全花在两件事上——把 `description` 写成真正的触发条件，以及诚实地验证它到底有没有被触发。

---

## 参考资料

**官方规范与文档**

- Anthropic：[Introducing Agent Skills](https://www.anthropic.com/news/skills)（2025-10-16 发布）、[Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)（工程博客）、[Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)（上下文工程）
- 开放标准：[Agent Skills Specification](https://agentskills.io/specification)、[中文镜像](https://openagentskills.dev/zh/docs/specification)、[官方 skills-ref 校验工具](https://github.com/agentskills/agentskills/tree/main/skills-ref)、[anthropics/skills 示例仓库](https://github.com/anthropics/skills)
- 常驻规则：[AGENTS.md 开放格式](https://agents.md/)（Agentic AI Foundation / Linux Foundation 托管）、[Claude Code Best practices](https://code.claude.com/docs/en/best-practices)、[Claude 帮助中心：Give Claude context（CLAUDE.md 与提示词）](https://support.claude.com/en/articles/14553240-give-claude-context-claude-md-and-better-prompts)
- OpenAI Codex：[Codex Skills 文档](https://developers.openai.com/codex/skills/)、[AGENTS.md 指南](https://developers.openai.com/codex/guides/agents-md)、[官方技能仓库](https://github.com/openai/skills)
- 评估工具：[Google Cloud《Five rules for evaluating agent skills before they bloat your context window》](https://cloud.google.com/blog/topics/developers-practitioners/evaluate-agent-skills-before-they-bloat-your-context-window)、[NVIDIA SkillSpector](https://github.com/NVIDIA/SkillSpector)
- TRAE：[规则文档 · IDE 版](https://docs.trae.cn/ide_rules)、[规则文档 · Work 版](https://docs.trae.cn/work_rules)、[官方社区讨论](https://forum.trae.cn/t/topic/177739/1)
- 案例：[Claude 博客：How Warp builds self-improving agents](https://claude.com/blog/how-warp-builds-self-improving-agents-on-claude)

**社区与厂商观点（非官方定论）**

- 实用资料整理：[Codex Skills 上手指南](https://agentstacklist.com/guides/codex-skills)、[AGENTS.md 落地清单](https://codex.danielvaughan.com/2026/06/15/agents-md-beyond-init-writing-project-instructions-that-reduce-token-spend-hooks-mcp-skills)
- 编写与评估实践：[skillmd.com · Effective Agent Skills](https://skillmd.com/skills/davidondrej/effective-agent-skills)、[Tessl Agent Skill Creator Standard](https://tessl.io/registry/skills/github/HoangNguyen0403/agent-skills-standard/common-skill-creator)、[Atlan 最佳实践](https://atlan.com/know/ai-agent/ai-agent-skills/agent-skill-best-practices)
- 供应链安全：[Koi Security · ClawHavoc](https://www.koi.ai/blog/clawhavoc-341-malicious-clawedbot-skills-found-by-the-bot-they-were-targeting)、[Snyk · ToxicSkills](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/)、[Unit 42 · Trust No Skill / BIV](https://unit42.paloaltonetworks.com/ai-agent-supply-chain-risks)、[Unit 42 · OpenClaw 技能市场](https://unit42.paloaltonetworks.com/openclaw-ai-supply-chain-risk/)、[安天 CERT · ClawHavoc 分析](https://www.antiy.net/Download/clawhavoc-analysis-of-large-scale-poisoning-campaign-targeting-the-openclaw-skill-market-for-ai-agents.pdf)
- Skill / MCP 分层：[Hivebook](https://hivebook.wiki/wiki/mcp-tools-vs-skills)、[Metorial](https://metorial.com/answers/skills-vs-mcp-tools)、[SelfTune](https://selftune.dev/blog/agent-skills-vs-mcp-tools)
- 国内平台：[扣子 Coze](https://www.coze.cn/)、[Dify](https://dify.ai/)、[六家平台技能体系横评](https://blog.csdn.net/weixin_29069131/article/details/164708798)、[2026 国内主流 Agent 平台对比](https://cloud.tencent.com.cn/developer/article/2772715)、[Dify / Coze / FastGPT 框架横评与迁移指南](https://www.vkflow.com/2026/04/03/agent%e6%a1%86%e6%9e%b6%e6%a8%aa%e8%af%84%ef%bc%88%e5%85%ad%ef%bc%89%ef%bc%9a%e5%9b%bd%e4%ba%a7%e6%a1%86%e6%9e%b6%e5%af%b9%e6%af%94dify-coze-fastgpt%e5%93%aa%e5%ae%b6%e5%bc%ba/)

> 平台的目录、命令、限制会随版本变化，动手前请以对应官方文档为准。文中所有具体路径、行数上限与配额均来自上述资料，未做实测的部分已注明来源性质。
