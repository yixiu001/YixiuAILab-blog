---
layout: course
title: 第 3 节：Cherry Studio 本地部署与模型接入
date: 2026-11-15 10:00:00
updated: 2026-11-15
categories: [AI 实战课]
tags: [AI工具, 效率]
course: ai-app
chapter: 3
lesson_title: Cherry Studio 本地部署与模型接入
course_title: 从零打造 AI 应用：完整实战课程
badge: AI 实战课 · 共 12 节
video: https://www.youtube.com/watch?v=h9PJK64By4E
cover: /images/videos/h9PJK64By4E.jpg
duration: 18:24
views: 8.2万
progress: 25%
students: 12,846 人在学
rating: 4.9 (328)
teacher: 一休 · 主讲
summary: 本节课带你从零完成 Cherry Studio 的安装与配置，重点讲解如何接入第三方大模型 API、管理多个模型服务商，以及常见连接失败的排查方法。学完后你能把 Cherry Studio 变成自己的统一 AI 工作台。
downloads:
  - { type: PDF, name: 第3节 · Cherry Studio 配置图文讲义.pdf, size: 2.4 MB, url: /downloads/ }
  - { type: JSON, name: 模型配置文件模板.json, size: 3 KB, url: /downloads/ }
---

Cherry Studio 是一款支持多模型的桌面客户端，能把不同的大模型服务商统一管理在一个界面里。这节课我们先完成本地安装，再配置第一个模型接口。

{% note info 开始之前 %}
请提前准备好一个模型 API Key（OpenAI 或任意兼容接口）。没有的话可以先跳过 API 配置，跟着课程用免费模型体验。
{% endnote %}

### 一、下载与安装

打开官网下载对应系统的安装包，Windows 用户直接双击 `.exe` 完成安装。首次启动后，界面左侧是会话列表，右侧是设置入口。

{% gallery /images/cherry-1.png|图 1 · 初次启动界面 /images/cherry-2.png|图 2 · 模型设置面板 %}

### 二、配置模型接口

进入「设置 → 模型服务」，选择服务商类型后填入 API Key 和接口地址。不同系统的入口略有差别，按你的系统查看：

{% tabs %}
{% tab Windows %}
点击左下角齿轮图标进入设置，在「模型服务」中点击**添加**，选择 OpenAI Compatible，填入接口地址和密钥后点击「检查连通性」，显示成功后保存。
{% endtab %}
{% tab macOS %}
点击菜单栏 Cherry Studio → Preferences，切换到 Model 标签页，其余步骤与 Windows 一致。注意 macOS 首次启动需要在「安全性与隐私」里允许运行。
{% endtab %}
{% tab Linux %}
解压 AppImage 后赋予执行权限再运行。配置界面与 Windows 相同，若遇到无法启动，检查是否缺少 `libwebkit2gtk` 依赖。
{% endtab %}
{% endtabs %}

### 三、常见问题

{% folding 接口返回 401 / 鉴权失败怎么办？ %}
先确认 API Key 是否复制完整（注意末尾多余空格），再检查接口的 Base URL 是否需要带 `/v1` 后缀。多数兼容接口要求完整的版本路径。
{% endfolding %}

{% folding 能连通但没有模型列表 %}
在模型服务设置里手动点击「获取模型列表」，如果接口不提供列表接口，需要手动填写模型 ID（如 `gpt-4o-mini`）。
{% endfolding %}

{% folding streaming 输出卡顿 %}
在设置中关闭「流式输出」测试，若恢复正常说明是接口流式响应格式不标准，建议更换兼容接口。
{% endfolding %}

配置完成后，回到主界面新建一个会话，选中刚加的模型发一条消息测试。能正常回复，说明你的统一 AI 工作台已经搭好了——下一节我们在此基础上搭建第一个可用的 AI 助手。
