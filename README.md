# 情绪觉察 × 课题分离

一个帮助高敏感人群通过情绪觉察和课题分离来应对人际冲突的实用工具。

## 功能特点

✨ **情绪识别**：支持1-3个情绪标签选择或自定义
🎯 **AI课题分离**：基于阿德勒心理学，智能拆解可控/不可控因素
📊 **历史记录**：按用户独立保存，随时回顾情绪模式
🔐 **用户系统**：本地存储，数据隐私安全

## 快速部署

### 方法一：一键部署到 Vercel（推荐）

1. 点击下方按钮一键部署：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=YOUR_GITHUB_REPO_URL)

2. 等待自动构建完成
3. 获得你的专属网址（例如：`https://your-app.vercel.app`）

### 方法二：手动部署

#### 准备工作
```bash
# 1. 安装 Node.js（如果还没有）
# 访问 https://nodejs.org 下载安装

# 2. 安装依赖
npm install
```

#### 本地运行
```bash
npm run dev
# 访问 http://localhost:3000
```

#### 部署到 Vercel
```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录 Vercel
vercel login

# 3. 部署
vercel --prod
```

### 方法三：部署到 Netlify

1. 在项目根目录创建 `netlify.toml`：
```toml
[build]
  command = "npm run build"
  publish = ".next"
```

2. 访问 [Netlify](https://app.netlify.com)
3. 拖拽项目文件夹到 Netlify
4. 自动部署完成

## 技术栈

- **框架**：Next.js 14 (App Router)
- **UI库**：Framer Motion（动画）
- **AI**：Claude API（课题分离分析）
- **存储**：Browser Persistent Storage

## 使用说明

1. **注册/登录**：创建个人账号（数据仅存本地）
2. **情绪命名**：选择1-3个最贴切的情绪
3. **客观描述**：回溯触发事件（工具会检测主观描述）
4. **识别需求**：找到情绪背后的真实需求
5. **AI分析**：一键拆解可控/不可控因素
6. **行动计划**：从可控清单生成具体行动建议

## 注意事项

⚠️ **数据隐私**
- 所有数据存储在浏览器本地
- 不会上传到任何服务器
- 清除浏览器数据会丢失记录

⚠️ **AI调用**
- 需要 Claude API 可用
- 如在国内使用，需确保网络可访问 Anthropic API

## 开源协议

MIT License

## 支持

如有问题或建议，欢迎提 Issue。
