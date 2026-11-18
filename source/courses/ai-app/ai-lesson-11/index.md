---
layout: course
title: 第 11 节：成本与安全
date: 2026-11-22 10:00:00
categories: [AI 实战课]
tags: [AI工具, 安全]
course: ai-app
chapter: 11
lesson_title: 成本与安全
course_title: 从零打造 AI 应用：完整实战课程
badge: AI 实战课 · 共 12 节
video: https://www.youtube.com/watch?v=kTVRMm4J5pw
cover: /images/videos/kTVRMm4J5pw.jpg
duration: 14:28
views: 3.5万
summary: 上线后必须面对的两件事：控制 API 成本、保护应用和用户数据。本节讲额度管理、密钥安全、内容过滤的常见做法。
---

应用上线后，成本和安全的坑才会真正出现。这节提前帮你把防线搭好。

{% note danger 最重要的一条 %}
永远不要把 API Key 暴露在前端代码或公开仓库里。一旦泄露，几分钟内就可能产生巨额账单。
{% endnote %}

### 一、成本控制

- 给每个 Key 设置硬性额度上限
- 开启用量告警，异常时第一时间收到通知
- 对用户输入做长度限制，避免超长请求

### 二、密钥安全

{% tabs %}
{% tab 后端代理 %}
所有 API 调用都经后端转发，Key 只存在服务端，前端拿不到。这是最稳妥的做法。
{% endtab %}
{% tab 环境隔离 %}
开发、测试、生产用不同的 Key，便于分别限额和追踪问题。
{% endtab %}
{% endtabs %}

### 三、内容安全

{% folding 如何防止用户滥用应用 %}
加用户鉴权、频率限制和敏感词过滤，关键操作留日志。发现滥用能快速定位并封禁。
{% endfolding %}

成本和安全的细节很多，但把上面几条做到位，已经能避开绝大多数问题。最后一节，我们做结业项目。
