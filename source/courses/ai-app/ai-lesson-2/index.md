---
layout: course
title: 第 2 节：大模型 API 申请与费用控制
date: 2026-11-10 10:00:00
categories: [AI 实战课]
tags: [AI工具, 入门]
course: ai-app
chapter: 2
lesson_title: 大模型 API 申请与费用控制
course_title: 从零打造 AI 应用：完整实战课程
badge: AI 实战课 · 共 12 节
video: https://www.youtube.com/watch?v=2XJUSpqGRWE
cover: /images/videos/2XJUSpqGRWE.jpg
duration: 15:08
views: 6.1万
progress: 17%
summary: 本节讲解如何申请主流大模型平台的 API Key，理解按 token 计费的逻辑，并设置额度告警避免意外扣费。
---

这一节我们把「钥匙」准备好——申请一个可用的大模型 API Key，同时搞清楚钱是怎么花掉的。

{% note warning 关于免费额度 %}
多数平台对新用户提供免费 token 额度，但规则和有效期差异很大，申请后先记下到期时间。
{% endnote %}

### 一、申请 API Key

注册后进入控制台的「API Keys」页面，创建新密钥并**立即复制保存**——大部分平台只在创建时完整显示一次。

### 二、理解计费

费用按输入、输出 token 分别计算，输出通常更贵。养成两个习惯：给 Key 设置月度额度上限，以及开启用量告警。

{% folding 如何估算一节课的成本？ %}
按每节课约 8000 token 输入、2000 token 输出估算，用平台单价相乘即可。多数入门场景下，一节实操课的成本不到 1 元。
{% endfolding %}

下一节我们把这个 Key 配置进 Cherry Studio，开始真正的实操。
