# FeedLab Interview Quiz

这是 FeedLab 的面试题练习项目。它使用 `Vite + React + TypeScript + Three.js`，用于按模块练习项目相关面试题。

## 为什么放在当前仓库

- 面试题和 FeedLab 后端代码强相关，放在同一个仓库方便每完成一个模块就同步更新题库。
- 题目可以直接引用后端文件路径，例如 `backend/internal/service/post_service.go`。
- README、后端代码、Postman、面试题可以一起提交到 GitHub，形成完整项目展示材料。

## 启动方式

当前 Codex shell 里还没有识别到 `npm`。请先确认本机终端或 IDE 终端能运行：

```bash
npm -v
node -v
```

然后启动：

```bash
cd /Users/zwy/Documents/Build_My_Vps-Go/interview-quiz
npm install
npm run dev
```

浏览器打开：

```text
http://localhost:5173
```

## 当前题库模块

- 模块 1：基础设施，覆盖配置、MySQL/Redis 连接、统一响应、健康检查。
- 模块 2：用户认证，覆盖 bcrypt、JWT、中间件、分层架构。
- 模块 3：帖子模块，覆盖事务、软删除、分页、权限校验、VO 组装。

## 答题方式

- 选择题：选择后点击“提交答案”，页面会显示正确答案、原因原理和其他选项为什么错。
- 简答题：先输入自己的回答，再点击“查看参考答案”，页面会显示参考答案、关键词和面试表达模板。
- 代码理解题：会提示关联代码路径，训练你按真实调用链解释实现。

## 后续更新规则

之后每完成一个 FeedLab 后端模块，都同步更新：

- `src/data/questions.ts`：新增模块题目、答案、解析。
- 根目录 `README.md`：补充面试题项目入口和模块说明。
- GitHub 仓库：提交并推送题库更新。
