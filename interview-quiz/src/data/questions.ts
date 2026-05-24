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
    summary: "理解接口文档不是摆设：它定义 API 契约，Swagger UI 还能直接调试接口。"
  },
  {
    id: "module-v2-likes",
    title: "V2 模块 1：帖子点赞",
    subtitle: "唯一索引、幂等、事务、计数维护",
    accent: "#d9902f",
    summary: "理解互动系统的第一块拼图：用数据库唯一索引兜底幂等，用事务维护点赞关系和 like_count。"
  },
  {
    id: "module-v2-comments",
    title: "V2 模块 2：评论系统",
    subtitle: "两层评论、软删除、事务、comment_count",
    accent: "#2f9f8f",
    summary: "理解评论系统如何用 parent_id 表达层级，用软删除保留内容记录，并用事务维护帖子评论数。"
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
    prompt: "FeedLab V1 提供 /swagger/doc.json 和可交互的 /swagger/index.html，最核心的工程价值是什么？",
    choices: [
      { id: "A", text: "让接口速度变快" },
      { id: "B", text: "把 API 的路径、请求体、响应结构和鉴权方式变成可共享的契约" },
      { id: "C", text: "替代数据库事务" },
      { id: "D", text: "自动防止 SQL 注入" }
    ],
    correctAnswers: ["B"],
    referenceAnswer: "Swagger/OpenAPI 的核心价值是描述 API 契约，让前端、测试、后端和面试展示都基于同一份接口定义；Swagger UI 还能基于这份契约直接发请求验证接口。",
    explanation: "接口文档不是为了好看，而是减少沟通成本和联调成本。OpenAPI 负责标准描述，Swagger UI 负责把描述变成可交互的调试页面。",
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
    referenceAnswer: "/swagger/doc.json 是机器可读的 OpenAPI 3.0 文档，可以被 Postman、Apifox 或 Swagger UI 导入。/swagger/index.html 是 Swagger UI 页面，读取 doc.json 后渲染接口，并提供 Try it out 直接测试接口。",
    explanation: "一个是标准数据，一个是交互界面。把两者拆开，可以让文档既能被工具消费，也能被人在浏览器里调试。",
    keyPoints: ["doc.json 机器可读", "Swagger UI 可交互", "Try it out", "同一份接口契约"],
    interviewTips: ["如果被问为什么不只写 README，可以说 README 不是标准 API schema，工具无法稳定解析。"],
    codeRefs: ["backend/internal/swagger/swagger.go"]
  },
  {
    id: "swagger-lightweight-1",
    moduleId: "module-4-swagger",
    type: "multiple",
    title: "为什么当前 V1 采用 CDN Swagger UI？",
    prompt: "关于 FeedLab V1 当前 Swagger/OpenAPI 实现，哪些说法合理？",
    choices: [
      { id: "A", text: "不依赖 swag CLI，降低本地和 VPS 环境要求" },
      { id: "B", text: "仍然提供标准 OpenAPI JSON，便于导入接口工具" },
      { id: "C", text: "它会自动替你生成数据库表" },
      { id: "D", text: "CDN 方式减少仓库静态文件体积，但生产环境无法访问 CDN 时应改成本地静态资源" }
    ],
    correctAnswers: ["A", "B", "D"],
    referenceAnswer: "V1 使用手写 OpenAPI JSON + CDN Swagger UI：后端不新增 Go 依赖，页面又能支持 Try it out。缺点是页面依赖外网 CDN，生产环境如果网络不可控，应把 Swagger UI 静态资源 vendoring 到项目中。",
    explanation: "这是阶段性取舍。V1 重点是跑通闭环和展示能力，不必一开始把工具链复杂度拉满。",
    whyOthersWrong: {
      C: "数据库表由 GORM AutoMigrate 创建，和 OpenAPI 文档无关。"
    },
    keyPoints: ["轻量部署", "标准 JSON", "工具可导入", "后续可演进"],
    interviewTips: ["可以补一句：V1 用 CDN 快速落地；真正上线时，我会考虑把 Swagger UI 静态文件放到本地，避免 CDN 不可用。"],
    codeRefs: ["backend/internal/swagger/swagger.go"]
  },
  {
    id: "swagger-bearer-1",
    moduleId: "module-4-swagger",
    type: "single",
    title: "为什么 Swagger 文档需要 BearerAuth？",
    prompt: "在 OpenAPI components.securitySchemes 中定义 BearerAuth，主要是为了解决什么？",
    choices: [
      { id: "A", text: "让 Swagger UI 知道哪些接口需要 JWT，并在请求时带上 Authorization Header" },
      { id: "B", text: "让 MySQL 自动校验用户密码" },
      { id: "C", text: "让 Redis 自动缓存帖子详情" },
      { id: "D", text: "让所有接口都不需要登录" }
    ],
    correctAnswers: ["A"],
    referenceAnswer: "BearerAuth 描述 JWT Bearer 鉴权方式。Swagger UI 看到 security 配置后，会显示 Authorize 按钮，并在需要鉴权的接口请求中带上 Authorization: Bearer <token>。",
    explanation: "OpenAPI 不只描述 URL 和请求体，也描述鉴权方式。这样接口调试页面才能正确模拟真实客户端请求。",
    whyOthersWrong: {
      B: "密码校验发生在登录 Service 中，不由 Swagger 决定。",
      C: "Redis 缓存策略和 OpenAPI 鉴权声明无关。",
      D: "BearerAuth 是为了标记需要登录的接口，不是取消登录。"
    },
    keyPoints: ["securitySchemes", "Bearer token", "Authorize 按钮", "Authorization Header"],
    interviewTips: ["回答时可以联系用户模块：登录拿到 access_token，再在 Swagger UI Authorize 中填入 token。"],
    codeRefs: ["backend/internal/swagger/swagger.go", "backend/internal/middleware/auth.go"]
  },
  {
    id: "likes-unique-index-1",
    moduleId: "module-v2-likes",
    type: "single",
    title: "post_likes 为什么要唯一索引？",
    prompt: "FeedLab V2 的 post_likes 表给 post_id + user_id 建唯一索引，最核心的作用是什么？",
    choices: [
      { id: "A", text: "防止同一个用户对同一篇帖子插入多条点赞记录" },
      { id: "B", text: "让 JWT 自动刷新" },
      { id: "C", text: "让 Redis 自动缓存点赞状态" },
      { id: "D", text: "让所有用户只能点赞一篇帖子" }
    ],
    correctAnswers: ["A"],
    referenceAnswer: "post_id + user_id 唯一索引用来保证同一个用户对同一篇帖子最多只有一条点赞关系。即使并发请求同时到达，数据库也能兜底防止重复插入。",
    explanation: "幂等不能只靠代码里的先查再插。高并发下两个请求可能同时判断不存在，所以必须用数据库唯一约束做最终保护。",
    whyOthersWrong: {
      B: "JWT 刷新和点赞关系表无关。",
      C: "V2 点赞模块暂不使用 Redis 点赞状态缓存。",
      D: "唯一索引限制的是同一 user_id + post_id 组合，不限制用户点赞多篇帖子。"
    },
    keyPoints: ["唯一索引", "并发兜底", "防止重复点赞", "幂等基础"],
    interviewTips: ["可以说：应用层幂等负责语义，数据库唯一索引负责最终一致性兜底。"],
    codeRefs: ["backend/internal/model/post_like.go", "backend/internal/repository/post_like_repository.go"]
  },
  {
    id: "likes-idempotent-1",
    moduleId: "module-v2-likes",
    type: "multiple",
    title: "点赞接口如何做到幂等？",
    prompt: "关于 POST /api/v1/posts/:id/like 的幂等设计，哪些说法是正确的？",
    choices: [
      { id: "A", text: "第一次点赞插入 post_likes 并让 posts.like_count +1" },
      { id: "B", text: "重复点赞仍返回成功，但不重复增加 like_count" },
      { id: "C", text: "重复点赞应该返回 409，强制前端自己处理" },
      { id: "D", text: "数据库唯一索引和 OnConflict DoNothing 可以帮助识别是否真正插入" }
    ],
    correctAnswers: ["A", "B", "D"],
    referenceAnswer: "点赞接口按幂等语义设计：用户想表达的是“我已点赞”。如果原来没点赞，就插入并加计数；如果已经点赞，就直接返回 liked=true，不重复增加计数。",
    explanation: "幂等让客户端重试更安全。网络抖动、按钮重复点击、Postman 重复执行都不会破坏计数。",
    whyOthersWrong: {
      C: "重复点赞不是业务冲突，而是同一目标状态的重复请求，因此当前模块返回成功。"
    },
    keyPoints: ["目标状态", "重复请求安全", "RowsAffected", "不重复计数"],
    interviewTips: ["可以举例：用户连续点两次点赞按钮，后端最终状态仍然是一条点赞记录，like_count 只加一次。"],
    codeRefs: ["backend/internal/service/like_service.go", "backend/internal/repository/post_like_repository.go"]
  },
  {
    id: "likes-transaction-1",
    moduleId: "module-v2-likes",
    type: "short",
    title: "点赞为什么需要事务？",
    prompt: "点赞成功时既要写 post_likes，又要更新 posts.like_count。为什么这两个操作要放在一个事务里？",
    referenceAnswer: "因为点赞关系和帖子点赞数是同一个业务事实的两种存储形式。如果 post_likes 插入成功但 like_count 更新失败，列表展示的点赞数就会和真实关系不一致。事务保证两者同时成功或同时失败。",
    explanation: "like_count 是冗余计数，读起来快，但写入时必须维护一致性。事务解决的是跨表写入的原子性问题。",
    keyPoints: ["跨表更新", "冗余计数", "原子性", "失败回滚"],
    interviewTips: ["回答时强调：真正插入成功才加计数，重复点赞不进入加计数逻辑。"],
    codeRefs: ["backend/internal/service/like_service.go", "backend/internal/repository/post_repository.go"]
  },
  {
    id: "likes-unlike-1",
    moduleId: "module-v2-likes",
    type: "single",
    title: "重复取消点赞应该怎么处理？",
    prompt: "用户已经取消点赞后，再次调用 DELETE /api/v1/posts/:id/like，当前设计应该怎么返回？",
    choices: [
      { id: "A", text: "返回成功，liked=false，并且不继续减少 like_count" },
      { id: "B", text: "一定返回 500" },
      { id: "C", text: "继续把 like_count 减 1" },
      { id: "D", text: "自动删除帖子" }
    ],
    correctAnswers: ["A"],
    referenceAnswer: "取消点赞也是幂等操作。用户表达的是“我不再点赞”。如果原来有点赞关系，就删除并扣计数；如果原来没有，仍返回 liked=false，不再扣计数。",
    explanation: "幂等取消让客户端重试更安全，也避免 like_count 被重复扣成负数。",
    whyOthersWrong: {
      B: "重复取消是可预期请求，不应该当内部错误。",
      C: "重复扣减会导致计数不一致。",
      D: "取消点赞只影响点赞关系，不影响帖子本身。"
    },
    keyPoints: ["DELETE 幂等", "RowsAffected", "不重复扣计数", "like_count 不小于 0"],
    interviewTips: ["可以补一句：Repository 删除返回 RowsAffected，Service 只有真的删除了关系才扣计数。"],
    codeRefs: ["backend/internal/service/like_service.go", "backend/internal/repository/post_like_repository.go"]
  },
  {
    id: "likes-flow-1",
    moduleId: "module-v2-likes",
    type: "code",
    title: "点赞请求的代码链路",
    prompt: "请按代码链路解释一次 POST /api/v1/posts/:id/like 请求从路由到数据库发生了什么。",
    referenceAnswer: "路由先经过 JWT 中间件，解析 Authorization 并把 user_id 写入 Gin Context。LikeController 解析帖子 id，读取当前 user_id，然后调用 LikeService。Service 先确认帖子存在且 published，再开启事务：PostLikeRepository 用唯一索引和 OnConflict DoNothing 插入点赞关系，如果 RowsAffected 表示新插入，就调用 PostRepository.IncrementLikeCount 让 like_count +1。事务成功后再查询当前 like_count，返回 liked=true。",
    explanation: "这道题训练你把 Controller、Service、Repository 和事务串起来讲。重点不是背函数名，而是说清每层负责什么。",
    keyPoints: ["JWT 中间件", "Controller 取 id 和 user_id", "Service 校验 published", "事务", "唯一索引", "like_count"],
    interviewTips: ["面试时可以主动说：重复点赞时插入 RowsAffected=0，所以不会重复加 like_count。"],
    codeRefs: ["backend/internal/router/router.go", "backend/internal/controller/like_controller.go", "backend/internal/service/like_service.go", "backend/internal/repository/post_like_repository.go"]
  },
  {
    id: "comments-parent-1",
    moduleId: "module-v2-comments",
    type: "single",
    title: "parent_id 如何表达评论层级？",
    prompt: "FeedLab V2 评论表中 parent_id 的设计含义是什么？",
    choices: [
      { id: "A", text: "parent_id=0 表示一级评论，parent_id>0 表示回复某条一级评论" },
      { id: "B", text: "parent_id 永远等于 post_id" },
      { id: "C", text: "parent_id 用来保存 JWT 用户 ID" },
      { id: "D", text: "parent_id 只用于物理删除评论" }
    ],
    correctAnswers: ["A"],
    referenceAnswer: "parent_id=0 表示这条评论直接挂在帖子下面，是一级评论；parent_id>0 表示这条评论是某个一级评论的二级回复。Service 会校验被回复的 parent comment 必须属于同一篇帖子，并且它本身必须是一级评论，从而限制只支持两层评论。",
    explanation: "这是内容社区里常见的轻量层级建模。V2 不做无限嵌套，能让列表接口、计数和删除逻辑都更清晰。",
    whyOthersWrong: {
      B: "评论所属帖子由 post_id 表达，parent_id 表达评论之间的父子关系。",
      C: "当前登录用户来自 JWT 中间件写入的上下文，不存在 parent_id 里。",
      D: "parent_id 主要用于层级关系和级联软删除，不是物理删除标记。"
    },
    keyPoints: ["一级评论 parent_id=0", "二级回复 parent_id>0", "限制两层", "校验同一帖子"],
    interviewTips: ["可以补一句：无限嵌套会让查询、分页和删除复杂很多，所以 V2 先用两层结构跑通社区评论闭环。"],
    codeRefs: ["backend/internal/model/comment.go", "backend/internal/service/comment_service.go"]
  },
  {
    id: "comments-transaction-1",
    moduleId: "module-v2-comments",
    type: "short",
    title: "发布评论为什么需要事务？",
    prompt: "发布评论时既要插入 comments，又要更新 posts.comment_count。为什么这两个操作必须放在事务里？",
    referenceAnswer: "因为评论记录和帖子评论数描述的是同一个业务事实。如果 comments 插入成功但 comment_count 增加失败，帖子详情展示的评论数就会和真实评论列表不一致。事务保证插入评论和更新计数同时成功，任何一步失败都回滚。",
    explanation: "comment_count 是冗余计数，读帖子详情时很方便，但写入时要承担维护一致性的责任。凡是多个表围绕一个业务动作一起变化，都应该优先考虑事务。",
    keyPoints: ["跨表更新", "冗余计数", "原子性", "失败回滚", "数据一致性"],
    interviewTips: ["回答时可以类比点赞模块：关系表和 count 字段要么一起变，要么都不变。"],
    codeRefs: ["backend/internal/service/comment_service.go", "backend/internal/repository/post_repository.go"]
  },
  {
    id: "comments-delete-1",
    moduleId: "module-v2-comments",
    type: "multiple",
    title: "删除一级评论时应该发生什么？",
    prompt: "关于 DELETE /api/v1/comments/:id 删除一级评论，哪些行为符合当前设计？",
    choices: [
      { id: "A", text: "软删除这条一级评论，保留 deleted_at 记录" },
      { id: "B", text: "级联软删除它下面所有未删除的二级回复" },
      { id: "C", text: "按实际软删除数量扣减 posts.comment_count" },
      { id: "D", text: "任何登录用户都能删除别人的评论" }
    ],
    correctAnswers: ["A", "B", "C"],
    referenceAnswer: "删除一级评论时，会软删除一级评论本身和它下面未删除的回复，deleted_count 返回实际删除数量，并用这个数量扣减帖子 comment_count。权限上只有评论作者或 admin 能删除。",
    explanation: "级联软删除能保证前台不再看到已经被删除的讨论串，同时保留数据用于审计、排错或后续后台能力。",
    whyOthersWrong: {
      D: "删除是写操作，必须做权限控制；当前只允许作者或 admin。"
    },
    keyPoints: ["软删除", "级联回复", "deleted_count", "comment_count 扣减", "作者或 admin"],
    interviewTips: ["可以主动说：删除回复时只删回复自己；删除一级评论时才会级联处理它下面的回复。"],
    codeRefs: ["backend/internal/service/comment_service.go", "backend/internal/repository/comment_repository.go"]
  },
  {
    id: "comments-reply-to-user-1",
    moduleId: "module-v2-comments",
    type: "single",
    title: "reply_to_user_id 为什么由后端设置？",
    prompt: "发布回复时，reply_to_user_id 不让前端传，而是后端根据 parent comment 自动设置。核心原因是什么？",
    choices: [
      { id: "A", text: "后端能从被回复评论中得到真实作者，避免前端伪造回复对象" },
      { id: "B", text: "因为 JSON 不能传 user_id" },
      { id: "C", text: "因为 GORM 不支持 uint64 字段" },
      { id: "D", text: "因为 reply_to_user_id 必须等于当前登录用户 ID" }
    ],
    correctAnswers: ["A"],
    referenceAnswer: "回复谁应该由被回复评论决定，而不是由前端随便提交。Service 查出 parent comment 后，用 parent.UserID 设置 reply_to_user_id，这样后续做通知、展示“回复某人”时更可信。",
    explanation: "这是后端可信数据边界。前端负责表达用户动作，后端负责根据数据库事实补全关键关系字段。",
    whyOthersWrong: {
      B: "JSON 可以传数字字段。",
      C: "GORM 支持 uint64。",
      D: "reply_to_user_id 表示被回复的人，current user_id 表示发起回复的人，两者通常不同。"
    },
    keyPoints: ["后端可信", "避免伪造", "被回复评论作者", "通知扩展"],
    interviewTips: ["可以说：V4 接 RabbitMQ 通知时，reply_to_user_id 就可以作为通知接收者依据。"],
    codeRefs: ["backend/internal/service/comment_service.go", "backend/internal/model/comment.go"]
  },
  {
    id: "comments-flow-1",
    moduleId: "module-v2-comments",
    type: "code",
    title: "发布回复的代码链路",
    prompt: "请按代码链路解释一次 POST /api/v1/posts/:id/comments 且 parent_id>0 的请求发生了什么。",
    referenceAnswer: "路由先经过 JWT 中间件，拿到当前 user_id。CommentController 解析 post id、绑定请求体，然后调用 CommentService.Create。Service 先裁剪 content 并确认帖子存在且 published；如果 parent_id>0，就查询 parent comment，校验它属于同一篇帖子、是一级评论并且状态 published，然后把 reply_to_user_id 设置为 parent.UserID。接着开启事务：插入 comments 记录，并调用 PostRepository.IncrementCommentCount 让帖子 comment_count +1。事务成功后再查回新评论，组装 VO 返回。",
    explanation: "这道题把路由、中间件、Controller、Service、Repository、事务和 VO 都串起来了，是评论模块最适合练习的整体链路题。",
    keyPoints: ["JWT 中间件", "Controller 参数解析", "Service 业务校验", "两层评论限制", "事务", "VO 返回"],
    interviewTips: ["回答时不要只说“插入数据库”，要讲清楚 parent comment 校验和 comment_count 维护，这是面试官真正想听的设计点。"],
    codeRefs: ["backend/internal/router/router.go", "backend/internal/controller/comment_controller.go", "backend/internal/service/comment_service.go", "backend/internal/repository/comment_repository.go"]
  },
  {
    id: "comments-redis-mq-1",
    moduleId: "module-v2-comments",
    type: "short",
    title: "为什么评论模块暂不接 Redis 和 RabbitMQ？",
    prompt: "V2 评论模块已经能发布、查询和删除，为什么当前仍然不引入 Redis 缓存和 RabbitMQ 通知？",
    referenceAnswer: "V2 的目标是先把互动业务的关系、权限、事务和计数一致性跑通。评论列表缓存属于读性能优化，适合 V3 在访问量上来后再做；评论通知是异步消息场景，适合 V4 统一接 RabbitMQ。提前引入会增加学习和排错复杂度，反而遮住本模块最核心的业务设计。",
    explanation: "这是工程分阶段能力。先保证正确性，再做性能和异步化，能让项目演进路径更清楚。",
    keyPoints: ["先正确再优化", "Redis 属于缓存优化", "RabbitMQ 属于异步通知", "降低 V2 复杂度"],
    interviewTips: ["可以补一句：README 里明确写了当前不产生 Redis Key，也不投递 MQ，说明这是有意识的阶段性取舍。"],
    codeRefs: ["README.md", "backend/internal/service/comment_service.go"]
  }
];
