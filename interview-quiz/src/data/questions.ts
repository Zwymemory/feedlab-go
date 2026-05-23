import type { Question, QuizModule } from "../types";

export const modules: QuizModule[] = [
  {
    id: "module-1-foundation",
    title: "模块 1：基础设施",
    subtitle: "配置、连接、统一响应、健康检查",
    accent: "#2f7dff",
    summary: "理解项目为什么先打地基：配置隔离环境，统一响应约束接口，健康检查验证依赖。"
  },
  {
    id: "module-2-auth",
    title: "模块 2：用户认证",
    subtitle: "users 表、bcrypt、JWT、中间件",
    accent: "#00a878",
    summary: "理解账号体系如何保护密码、签发登录态，并通过中间件把鉴权逻辑集中管理。"
  },
  {
    id: "module-3-posts",
    title: "模块 3：帖子模块",
    subtitle: "posts 表、事务、软删除、分页、权限",
    accent: "#e05a47",
    summary: "理解内容社区核心闭环：发布、展示、详情、删除，以及跨表计数一致性。"
  },
  {
    id: "module-4-swagger",
    title: "模块 4：Swagger 文档",
    subtitle: "OpenAPI、接口契约、文档展示",
    accent: "#8a63d2",
    summary: "理解接口文档不是摆设：它定义 API 契约，帮助联调、测试、展示和后续维护。"
  }
];

export const questions: Question[] = [
  {
    id: "foundation-config-1",
    moduleId: "module-1-foundation",
    type: "single",
    title: "为什么要使用 config.yaml？",
    prompt: "在 FeedLab 中，把 MySQL、Redis、JWT、服务端口放到 config.yaml，而不是直接写在 Go 代码里，最核心的原因是什么？",
    choices: [
      { id: "A", text: "这样 Go 编译速度会更快" },
      { id: "B", text: "把环境差异和业务代码解耦，方便本地、测试、VPS 使用不同配置" },
      { id: "C", text: "GORM 必须从 YAML 读取数据库配置" },
      { id: "D", text: "Gin 路由必须依赖 config.yaml 才能启动" }
    ],
    correctAnswers: ["B"],
    referenceAnswer: "config.yaml 的价值是把环境变量和业务逻辑拆开。代码只关心如何读取配置，具体数据库地址、端口、JWT 密钥可以随环境变化。",
    explanation: "面试官问这个问题时，考的是工程化意识。配置外置能减少硬编码，降低部署环境变化时改代码的风险。",
    whyOthersWrong: {
      A: "配置文件不会显著影响 Go 编译速度。",
      C: "GORM 只需要 DSN 字符串，不要求 YAML。",
      D: "Gin 可以完全不使用配置文件，端口写死也能启动。"
    },
    keyPoints: ["环境隔离", "避免硬编码", "部署更灵活", "敏感配置后续可用环境变量覆盖"],
    interviewTips: ["可以补一句：VPS 部署时只改配置，不需要重新改业务代码。"],
    codeRefs: ["backend/config.yaml", "backend/internal/config/config.go"]
  },
  {
    id: "foundation-health-1",
    moduleId: "module-1-foundation",
    type: "short",
    title: "/healthz 为什么检查 MySQL 和 Redis？",
    prompt: "请用自己的话解释：为什么健康检查不只返回 API alive，还要检查 MySQL 和 Redis？",
    referenceAnswer: "因为 API 进程活着不代表业务可用。FeedLab 的注册、登录、帖子等核心接口依赖 MySQL，后续缓存和计数依赖 Redis。/healthz 同时检查依赖，可以更早暴露服务不可用原因。",
    explanation: "这是可观测性问题。健康检查要回答的是“系统能不能对外提供完整能力”，不是“进程有没有启动”。",
    keyPoints: ["进程存活不等于业务可用", "MySQL 是核心数据依赖", "Redis 是缓存/计数依赖", "便于部署和排障"],
    interviewTips: ["可以说：如果部署到 Docker Compose 或 VPS，健康检查能帮助快速定位是 API、数据库还是缓存出问题。"],
    codeRefs: ["backend/internal/service/health_service.go", "backend/internal/controller/health_controller.go"]
  },
  {
    id: "foundation-response-1",
    moduleId: "module-1-foundation",
    type: "single",
    title: "统一响应格式解决了什么？",
    prompt: "FeedLab 所有接口都返回 { code, message, data }，这主要解决哪类问题？",
    choices: [
      { id: "A", text: "让所有 HTTP 状态码都变成 200" },
      { id: "B", text: "让前端和测试工具用一致方式处理成功、失败和业务数据" },
      { id: "C", text: "让 MySQL 自动生成表结构" },
      { id: "D", text: "让 JWT 失效时间自动延长" }
    ],
    correctAnswers: ["B"],
    referenceAnswer: "统一响应格式让接口返回更稳定，前端和 Postman 不用为每个接口写不同解析逻辑。HTTP 状态码表达协议层状态，code 表达业务错误。",
    explanation: "统一响应是 API 契约的一部分，能提升可维护性，也方便写自动化测试。",
    whyOthersWrong: {
      A: "FeedLab 仍然使用 201、400、401、403、404、500 等 HTTP 状态码。",
      C: "表结构由 GORM AutoMigrate 负责。",
      D: "JWT 过期由签发逻辑控制。"
    },
    keyPoints: ["稳定 API 契约", "前端处理一致", "HTTP 状态码和业务 code 分工", "便于测试"],
    interviewTips: ["回答时不要说“统一响应就是所有都返回 200”，这是面试里常见坑。"],
    codeRefs: ["backend/internal/response/response.go"]
  },
  {
    id: "auth-bcrypt-1",
    moduleId: "module-2-auth",
    type: "single",
    title: "bcrypt 为什么适合存密码？",
    prompt: "用户注册时使用 bcrypt 存储密码，下面哪种说法最准确？",
    choices: [
      { id: "A", text: "bcrypt 是加密算法，可以解密出原密码" },
      { id: "B", text: "bcrypt 是慢哈希算法，适合抵抗暴力破解，登录时比较哈希而不是解密" },
      { id: "C", text: "bcrypt 只是 Base64 编码，主要为了缩短字符串" },
      { id: "D", text: "bcrypt 只适合 JWT，不适合密码" }
    ],
    correctAnswers: ["B"],
    referenceAnswer: "bcrypt 是带盐的慢哈希算法，不是可逆加密。注册时保存哈希，登录时用用户输入的密码和哈希做比较。",
    explanation: "面试官常问“为什么不用 MD5”。重点是 bcrypt 有成本因子和盐，能提高暴力破解成本。",
    whyOthersWrong: {
      A: "密码哈希不可逆，不能解密。",
      C: "Base64 是编码，不是安全密码存储方案。",
      D: "JWT 使用签名，和 bcrypt 解决的问题不同。"
    },
    keyPoints: ["不可逆哈希", "自动加盐", "成本因子", "CompareHashAndPassword"],
    interviewTips: ["可以补一句：生产中还要配合密码强度限制和登录限流。"],
    codeRefs: ["backend/pkg/password/password.go", "backend/internal/service/auth_service.go"]
  },
  {
    id: "auth-jwt-flow-1",
    moduleId: "module-2-auth",
    type: "code",
    title: "JWT 中间件链路",
    prompt: "请解释一次 GET /api/v1/users/me 请求从 Authorization Header 到获取当前 user_id 的流程。",
    referenceAnswer: "请求先进入 Gin 路由组的 JWT 中间件。中间件读取 Authorization Header，校验 Bearer 格式，解析并验证 JWT 签名、issuer、过期时间，然后把 user_id 和 role 写入 Gin Context。UserController.Me 再从 Context 读取 user_id，调用 UserService 查询当前用户并返回 VO。",
    explanation: "这个题考的是你是否理解中间件的价值：鉴权逻辑集中在入口，Controller 不需要重复解析 Token。",
    keyPoints: ["Authorization: Bearer", "Parse JWT", "验证签名和过期时间", "写入 Gin Context", "Controller 读取 user_id"],
    interviewTips: ["回答时按请求链路说，不要只说“JWT 是无状态的”。链路表达会更像你真的写过。"],
    codeRefs: ["backend/internal/middleware/auth.go", "backend/internal/controller/user_controller.go", "backend/pkg/jwt/manager.go"]
  },
  {
    id: "auth-layering-1",
    moduleId: "module-2-auth",
    type: "multiple",
    title: "Controller-Service-Repository 分工",
    prompt: "以下哪些分工符合 FeedLab 当前分层设计？",
    choices: [
      { id: "A", text: "Controller 负责 HTTP 参数绑定和统一响应" },
      { id: "B", text: "Service 负责注册、登录、权限等业务规则" },
      { id: "C", text: "Repository 负责 GORM 查询和写入" },
      { id: "D", text: "Model 负责解析 JWT 并返回 HTTP 响应" }
    ],
    correctAnswers: ["A", "B", "C"],
    referenceAnswer: "Controller、Service、Repository 分别处理接口层、业务层、数据访问层。Model 只描述数据结构，不应该负责 HTTP 或 JWT 解析。",
    explanation: "分层不是为了炫技，而是为了让每层变化互不污染：接口变更、业务规则变更、数据库查询变更可以分开维护。",
    whyOthersWrong: {
      D: "Model 不应该依赖 Gin 或 JWT，否则数据结构会和接口层耦合。"
    },
    keyPoints: ["Controller 处理 HTTP", "Service 处理业务", "Repository 处理 DB", "Model 保持纯数据结构"],
    interviewTips: ["可以用注册接口举例：Controller bind JSON，Service hash 密码，Repository Create user。"],
    codeRefs: ["backend/internal/controller/auth_controller.go", "backend/internal/service/auth_service.go", "backend/internal/repository/user_repository.go"]
  },
  {
    id: "posts-transaction-1",
    moduleId: "module-3-posts",
    type: "single",
    title: "发布帖子为什么要事务？",
    prompt: "发布帖子时创建 posts 记录，同时更新 users.post_count。为什么要放进一个事务？",
    choices: [
      { id: "A", text: "事务可以让 SQL 语句看起来更短" },
      { id: "B", text: "保证帖子创建和用户发帖数更新同时成功或同时失败，避免数据不一致" },
      { id: "C", text: "事务可以自动生成 JWT" },
      { id: "D", text: "事务会让所有查询都走 Redis" }
    ],
    correctAnswers: ["B"],
    referenceAnswer: "发布帖子涉及 posts 和 users 两张表。如果 posts 创建成功但 post_count 更新失败，用户主页统计就会错误。事务保证两个更新具备原子性。",
    explanation: "面试官问事务，本质是在问你是否能识别跨表一致性问题。这里的核心词是原子性。",
    whyOthersWrong: {
      A: "事务和 SQL 长短无关。",
      C: "JWT 属于认证模块，和数据库事务无关。",
      D: "Redis 缓存策略不由 MySQL 事务决定。"
    },
    keyPoints: ["跨表更新", "原子性", "失败回滚", "post_count 一致性"],
    interviewTips: ["可以主动提：删除帖子也需要事务，因为软删除 posts 后还要维护 users.post_count。"],
    codeRefs: ["backend/internal/service/post_service.go", "backend/internal/repository/user_repository.go"]
  },
  {
    id: "posts-soft-delete-1",
    moduleId: "module-3-posts",
    type: "short",
    title: "软删除和物理删除的区别",
    prompt: "FeedLab 删除帖子使用 GORM 软删除。请解释它和物理删除的区别，以及为什么内容社区更适合软删除。",
    referenceAnswer: "物理删除会直接从数据库移除记录；软删除通常只写 deleted_at，让业务查询默认过滤这条记录。内容社区适合软删除，因为后续可能需要审核、恢复、追踪举报、统计历史数据。",
    explanation: "软删除不是永远不删除，而是把“用户不可见”和“数据库不存在”区分开。它适合需要审计和恢复的业务。",
    keyPoints: ["deleted_at", "默认查询过滤", "可恢复", "可审计", "适合内容审核"],
    interviewTips: ["如果被追问缺点，可以说：软删除会增加存储和查询过滤成本，需要定期归档或清理。"],
    codeRefs: ["backend/internal/model/post.go", "backend/internal/repository/post_repository.go"]
  },
  {
    id: "posts-published-1",
    moduleId: "module-3-posts",
    type: "single",
    title: "为什么公开列表只查 published？",
    prompt: "帖子列表和详情只返回 status = published 的帖子，主要目的是什么？",
    choices: [
      { id: "A", text: "避免草稿、隐藏内容或未来审核未通过内容被公开访问" },
      { id: "B", text: "因为 GORM 不能查询 draft" },
      { id: "C", text: "因为 published 查询一定比 id 查询快" },
      { id: "D", text: "因为 JWT 只能识别 published" }
    ],
    correctAnswers: ["A"],
    referenceAnswer: "公开接口只展示 published，是为了把内容生命周期状态和访问权限分开。草稿、隐藏、审核中的内容不应该出现在公共列表和详情里。",
    explanation: "这是内容系统常见设计：状态字段控制内容是否公开，后续后台审核也会依赖它。",
    whyOthersWrong: {
      B: "GORM 能查询任何状态。",
      C: "性能取决于索引和查询条件，不是 published 天然更快。",
      D: "JWT 负责用户身份，不负责帖子状态。"
    },
    keyPoints: ["内容生命周期", "草稿隔离", "审核扩展", "公共接口安全"],
    interviewTips: ["可以补一句：作者自己的草稿列表是另一个接口，不应该混进公开列表。"],
    codeRefs: ["backend/internal/repository/post_repository.go"]
  },
  {
    id: "posts-preload-1",
    moduleId: "module-3-posts",
    type: "short",
    title: "Preload(\"User\") 的作用是什么？",
    prompt: "帖子列表和详情中使用 GORM Preload(\"User\")，它解决了什么问题？可能有什么注意点？",
    referenceAnswer: "Preload(\"User\") 会在查询帖子后把关联的作者用户信息也加载出来，方便 VO 返回 author 字段。注意点是关联加载会增加 SQL 查询和数据量，列表页要控制分页和返回字段，避免 N+1 或过度加载。",
    explanation: "Preload 是 ORM 关联查询能力。它让代码更直观，但也要关注 SQL 数量和数据体积。",
    keyPoints: ["加载作者信息", "组装 VO", "避免手写关联查询", "注意查询成本"],
    interviewTips: ["如果面试官追问 N+1，可以说 GORM Preload 通常会用额外查询批量加载关联，不是每条都查一次，但仍要看实际 SQL。"],
    codeRefs: ["backend/internal/repository/post_repository.go", "backend/internal/vo/post.go"]
  },
  {
    id: "posts-permission-1",
    moduleId: "module-3-posts",
    type: "code",
    title: "删除帖子如何做权限校验？",
    prompt: "阅读 PostService.Delete，解释它如何保证只有作者或 admin 能删除帖子。",
    referenceAnswer: "Delete 先根据 id 查帖子，拿到 post.UserID。然后比较 post.UserID 和当前登录用户 ID；如果不同，并且 currentRole 不是 admin，就返回 ErrForbidden。只有校验通过后，才进入事务执行软删除和 post_count 维护。",
    explanation: "权限校验应该发生在执行写操作之前。这里还体现了 Service 层负责业务规则，而不是 Repository 层决定谁能删。",
    keyPoints: ["先查帖子", "比较作者 ID", "允许 admin", "失败返回 403", "通过后再进入事务"],
    interviewTips: ["可以主动说：Controller 只从 JWT context 拿 user_id/role，真正的业务权限判断放 Service。"],
    codeRefs: ["backend/internal/service/post_service.go", "backend/internal/controller/post_controller.go"]
  },
  {
    id: "posts-count-1",
    moduleId: "module-3-posts",
    type: "multiple",
    title: "users.post_count 为什么后端维护？",
    prompt: "关于 users.post_count 的设计，哪些说法是合理的？",
    choices: [
      { id: "A", text: "它能让用户主页读取发帖数更快，不必每次 COUNT posts" },
      { id: "B", text: "它必须和发布/删除帖子放在事务里维护一致性" },
      { id: "C", text: "它应该完全由前端计算并提交给后端" },
      { id: "D", text: "它后续可以作为用户主页、排行榜或推荐特征的一部分" }
    ],
    correctAnswers: ["A", "B", "D"],
    referenceAnswer: "post_count 是冗余计数字段，目的是提升读取效率。因为它是冗余数据，所以写入时更要用事务保证和 posts 表一致。",
    explanation: "计数字段是典型的读性能换写复杂度。后端维护能保证可信，前端提交不可信也不一致。",
    whyOthersWrong: {
      C: "前端数据不可信，也无法处理并发和事务一致性。"
    },
    keyPoints: ["冗余计数", "读性能", "事务一致性", "后端可信"],
    interviewTips: ["可以补一句：高并发点赞数这类计数未来可能会引入 Redis，但 V1 的发帖数先用 MySQL 事务。"],
    codeRefs: ["backend/internal/repository/user_repository.go", "backend/internal/service/post_service.go"]
  },
  {
    id: "swagger-contract-1",
    moduleId: "module-4-swagger",
    type: "single",
    title: "Swagger 文档的核心价值是什么？",
    prompt: "FeedLab V1 提供 /swagger/doc.json 和 /swagger/index.html，最核心的工程价值是什么？",
    choices: [
      { id: "A", text: "让接口速度变快" },
      { id: "B", text: "把 API 的路径、请求体、响应结构和鉴权方式变成可共享的契约" },
      { id: "C", text: "替代数据库事务" },
      { id: "D", text: "自动防止 SQL 注入" }
    ],
    correctAnswers: ["B"],
    referenceAnswer: "Swagger/OpenAPI 的核心价值是描述 API 契约，让前端、测试、后端和面试展示都基于同一份接口定义。",
    explanation: "接口文档不是为了好看，而是减少沟通成本和联调成本。它明确哪些接口存在、需要什么参数、可能返回什么响应。",
    whyOthersWrong: {
      A: "文档不会提升接口运行速度。",
      C: "事务解决数据一致性，Swagger 解决接口描述。",
      D: "SQL 注入防护依赖参数化查询、ORM 和输入校验。"
    },
    keyPoints: ["API 契约", "联调效率", "测试导入", "面试展示"],
    interviewTips: ["可以说：README 讲设计，Swagger 讲接口调用，两者互补。"],
    codeRefs: ["backend/internal/swagger/swagger.go", "backend/internal/router/router.go"]
  },
  {
    id: "swagger-openapi-1",
    moduleId: "module-4-swagger",
    type: "short",
    title: "OpenAPI JSON 和页面有什么区别？",
    prompt: "请解释 /swagger/doc.json 和 /swagger/index.html 的职责区别。",
    referenceAnswer: "/swagger/doc.json 是机器可读的 OpenAPI 3.0 文档，可以被 Postman、Apifox 或 Swagger UI 导入。/swagger/index.html 是人可读的浏览页面，方便直接在浏览器查看接口列表和响应结构。",
    explanation: "一个偏标准数据格式，一个偏展示层。把两者拆开，可以让文档既能被工具消费，也能被人阅读。",
    keyPoints: ["doc.json 机器可读", "index.html 人可读", "同一份接口契约", "方便导入和展示"],
    interviewTips: ["如果被问为什么不只写 README，可以说 README 不是标准 API schema，工具无法稳定解析。"],
    codeRefs: ["backend/internal/swagger/swagger.go"]
  },
  {
    id: "swagger-lightweight-1",
    moduleId: "module-4-swagger",
    type: "multiple",
    title: "为什么当前 V1 采用轻量内置文档？",
    prompt: "关于 FeedLab V1 当前 Swagger/OpenAPI 实现，哪些说法合理？",
    choices: [
      { id: "A", text: "不依赖 swag CLI，降低本地和 VPS 环境要求" },
      { id: "B", text: "仍然提供标准 OpenAPI JSON，便于导入接口工具" },
      { id: "C", text: "它会自动替你生成数据库表" },
      { id: "D", text: "后续如果接口很多，可以再切换到 swag 注释生成流程" }
    ],
    correctAnswers: ["A", "B", "D"],
    referenceAnswer: "轻量内置文档适合 V1：无需额外 CLI，部署简单，同时保留 OpenAPI JSON 的标准化能力。后续接口增多后，可以再引入 swag CLI 自动生成。",
    explanation: "这是阶段性取舍。V1 重点是跑通闭环和展示能力，不必一开始把工具链复杂度拉满。",
    whyOthersWrong: {
      C: "数据库表由 GORM AutoMigrate 创建，和 OpenAPI 文档无关。"
    },
    keyPoints: ["轻量部署", "标准 JSON", "工具可导入", "后续可演进"],
    interviewTips: ["可以补一句：如果团队要求统一 Swagger UI，可以把 doc.json 接到官方 Swagger UI。"],
    codeRefs: ["backend/internal/swagger/swagger.go"]
  }
];
