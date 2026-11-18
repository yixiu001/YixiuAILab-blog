---
layout: course
title: 第 7 节：接入搜索引擎
date: 2026-11-18 10:00:00
categories: [AI 实战课]
tags: [AI工具, 搜索]
course: ai-app
chapter: 7
lesson_title: 接入搜索引擎
course_title: 从零打造 AI 应用：完整实战课程
badge: AI 实战课 · 共 12 节
video: https://www.youtube.com/watch?v=kTVRMm4J5pw
cover: /images/videos/kTVRMm4J5pw.jpg
duration: 16:50
views: 4.9万
summary: 让 AI 能查最新信息。本节讲如何接入联网搜索 API，把实时结果注入回答，并处理来源引用与结果可信度问题。
---

大模型的知识有截止时间，想知道今天发生的事，就得给它接上搜索引擎。

{% note info 什么时候需要联网 %}
涉及最新资讯、实时数据、具体价格或近期事件的问题，都必须联网，否则模型会用过时信息甚至编造答案。
{% endnote %}

### 一、选择搜索 API

常见的有 Bing、Google 及相关聚合搜索服务。按免费额度、返回质量、调用限制三个维度选，入门阶段先用有免费额度的。

### 二、接入流程

{% tabs %}
{% tab 申请 Key %}
注册搜索服务商账号，创建 API Key，记下免费额度和速率限制。
{% endtab %}
{% tab 编排调用 %}
在工作流里加搜索节点，把用户问题作为查询词，拿到结果列表后再交给模型总结。
{% endtab %}
{% endtabs %}

### 三、来源引用

{% folding 怎么让回答带上可点击的来源链接 %}
在提示词里要求模型按「内容 + 来源编号」输出，并把搜索结果的 URL 列表一并传入，即可生成带引用的回答。这样也方便用户核实。
{% endfolding %}

联网能力加上后，AI 应用就真正"活"了。下一节我们玩多模态。
