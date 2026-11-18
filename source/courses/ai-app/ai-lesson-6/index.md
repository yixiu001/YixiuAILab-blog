---
layout: course
title: 第 6 节：工作流自动化
date: 2026-11-17 10:00:00
categories: [AI 实战课]
tags: [AI工具, 自动化]
course: ai-app
chapter: 6
lesson_title: 工作流自动化
course_title: 从零打造 AI 应用：完整实战课程
badge: AI 实战课 · 共 12 节
video: https://www.youtube.com/watch?v=h9PJK64By4E
cover: /images/videos/h9PJK64By4E.jpg
duration: 19:22
views: 5.2万
summary: 把重复的任务交给自动化工作流。本节用可视化编排工具串起"触发—处理—输出"的完整链路，做一个每天自动整理资讯的例子。
---

单次对话能解决问题，但重复的活儿应该让流程自动跑。这节我们做一个自动整理资讯的工作流。

{% note info 工作流的三个部分 %}
触发（什么时候跑）+ 处理（做什么）+ 输出（结果发到哪）。理解这三块，任何自动化工具都能快速上手。
{% endnote %}

### 一、设计流程

我们的目标：每天定时抓取一批资讯 → 让 AI 摘要和分类 → 推送到指定渠道。先在纸上画出每个节点。

### 二、节点配置

{% tabs %}
{% tab 触发节点 %}
设为每天定时触发，或用 RSS 更新作为触发条件。注意时区设置，避免时间对不上。
{% endtab %}
{% tab 处理节点 %}
调用大模型对抓取内容做摘要，提示词里明确输出格式（标题、摘要、分类），方便后续解析。
{% endtab %}
{% tab 输出节点 %}
把结果发送到邮件、Telegram 或写入表格，按你的实际场景选择。
{% endtab %}
{% endtabs %}

### 三、调试与容错

{% folding 工作流跑一半失败了怎么排查 %}
点开失败节点看输入输出，多数是上游字段格式变化或 API 限流。给关键节点加上错误分支和重试，能大幅提升稳定性。
{% endfolding %}

下一节我们给工作流接上实时搜索能力。
