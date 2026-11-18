---
title: Hello World
summary: 文章页代码排版样式集中预览：行内代码、多语言语法高亮、固定行号、长行横向滚动、纯文本块与 diff 对比。
---

这篇用来集中预览文章页里所有和「代码」有关的排版样式：行内代码、多语言语法高亮、行号列、长行横向滚动、无语言标记的纯文本块，以及 diff 对比。你可以顺手试试每个代码块右上角的「复制」按钮。

## 行内代码

在终端里执行 `npm install` 安装依赖，站点配置写在 `_config.yml`，本地预览用 `hexo s --debug`。行内代码用浅灰粉底 + 小圆角，和正文区分开但不抢注意力；变量 `page.title`、`site.posts.length` 这类写法也走同一套样式。

## Bash / 终端命令

多行命令、注释和 `$` 提示符，用来看基础配色与行号对齐：

```bash
# 安装依赖并生成静态文件
$ npm install
$ npx hexo clean
$ npx hexo generate

# 本地预览（默认 4000 端口）
$ npx hexo server -p 4000
```

## JavaScript

关键字、字符串、数字、注释、模板字符串、箭头函数与异步代码，基本能把高亮配色都过一遍：

```js
// 读取课程数据，生成课程中心索引
const fs = require('fs');
const yaml = require('js-yaml');

async function buildIndex(source = 'source/_data/courses.yml') {
  const raw = await fs.promises.readFile(source, 'utf8');
  const courses = yaml.load(raw);

  return courses
    .filter(course => course.chapters && course.chapters.length > 0)
    .map(({ id, title, chapters }) => ({
      id,
      title,
      lessons: chapters.reduce((sum, g) => sum + g.items.length, 0),
      link: `/courses/${id}/`
    }));
}

buildIndex()
  .then(list => console.log(`共 ${list.length} 门课程，已生成索引`))
  .catch(err => console.error('生成失败：', err));
```

## Python

类、装饰器、类型标注、f-string 与属性：

```python
from dataclasses import dataclass
from pathlib import Path

@dataclass
class Lesson:
    title: str
    video_id: str | None = None

    @property
    def embed_url(self) -> str:
        return f"https://www.youtube.com/embed/{self.video_id}"

lessons = [Lesson("环境搭建", "h9PJK64By4E"), Lesson("模型接入")]
for i, lesson in enumerate(lessons, start=1):
    print(f"{i:02d}. {lesson.title} -> {lesson.embed_url}")
```

## YAML / 配置文件

```yaml
# 站点基础配置
title: 一休AI实验室
subtitle: 体系化课程
permalink: posts/:title/
theme: yixiu

highlight:
  line_number: true
  auto_detect: false
  wrap: true
  hljs: false
```

## JSON

```json
{
  "name": "yixiu-lab",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "hexo generate",
    "dev": "hexo server"
  },
  "tags": ["课程", "工具导航", "视频讲义"]
}
```

## CSS

```css
:root {
  --accent: #FF4D4F;
  --radius: 14px;
}

.post-body pre {
  background: #0D1424;
  border-radius: var(--radius);
  padding: 20px 22px;
  overflow-x: auto;
  color: #C8D3EE;
}
```

## diff 增删改

```diff
- theme: landscape
+ theme: yixiu
- permalink: :year/:month/:day/:title/
+ permalink: posts/:title/
  syntax_highlighter: highlight.js
```

## 无语言标记的纯文本块

没有写语言名时不高亮，只保留等宽字体与深色底，适合放目录树、日志或输出：

```
.
├── _config.yml
├── source/
│   ├── _data/
│   │   ├── courses.yml
│   │   └── resources.yml
│   └── _posts/
└── themes/yixiu/
    ├── layout/
    └── source/css/style.css
```

## 长行横向滚动

下面这行故意写得很长，用来检查代码块是否只横向滚动、行号列是否固定不动：

```js
const channels = ['https://www.youtube.com/@YixiuAILab', 'https://github.com/', 'https://huggingface.co/spaces', 'https://vibecode.fans/', 'https://yixiu521.com/', 'https://openai.com/']; console.log('共 ' + channels.length + ' 个常用入口');
```

> 小结：代码块统一用深色卡 + 顶部语言条，行号列在横向滚动时保持固定；行内代码用浅色底。这样长代码、短片段和正文混排时，层级是一致的。
