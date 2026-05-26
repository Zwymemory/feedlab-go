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
  },
  {
    id: "module-v2-collects",
    title: "V2 模块 3：帖子收藏",
    subtitle: "收藏关系、幂等、事务、collect_count",
    accent: "#b75cff",
    summary: "理解收藏系统如何复用互动关系表模式，用唯一索引保证幂等，并用事务维护帖子收藏数。"
  },
  {
    id: "module-v2-follows",
    title: "V2 模块 4：用户关注",
    subtitle: "用户关系、禁止自关、双计数事务",
    accent: "#12a594",
    summary: "理解关注系统如何建模人与人的关系，用唯一索引兜底幂等，并在事务中维护粉丝数和关注数。"
  },
  {
    id: "module-v2-comment-likes",
    title: "V2 模块 5：评论点赞",
    subtitle: "评论互动、幂等、事务、like_count",
    accent: "#ef5da8",
    summary: "理解评论点赞如何复用关系表模式，并把评论可见性、幂等和计数一致性结合起来。"
  },
  {
    id: "module-v2-public-profile",
    title: "V2 模块 6：用户公开主页",
    subtitle: "公开 VO、隐私字段、用户帖子列表",
    accent: "#4d7cfe",
    summary: "理解公开主页接口如何复用已有 users/posts 表，用 VO 隔离敏感字段，并只展示 published 内容。"
  },
  {
    id: "module-v2-review",
    title: "V2 综合复盘",
    subtitle: "事务、幂等、唯一索引、演进路线",
    accent: "#111827",
    summary: "把 V2 的互动系统串起来，练习用项目语言讲清楚一致性、可见性、分层职责和后续 Redis/RabbitMQ 演进。"
  },
  {
    id: "module-v3-post-cache",
    title: "V3 模块 1：帖子详情缓存",
    subtitle: "Redis、Cache Aside、TTL、缓存失效",
    accent: "#dc2626",
    summary: "理解为什么帖子详情适合缓存，以及如何在点赞、收藏、评论等写操作后删除旧缓存。"
  },
  {
    id: "module-v3-user-cache",
    title: "V3 模块 2：用户公开资料缓存",
    subtitle: "PublicUser、隐私边界、计数失效",
    accent: "#0f766e",
    summary: "理解用户公开主页为什么能缓存，以及关注、发帖、删帖如何影响公开资料中的计数字段。"
  },
  {
    id: "module-v3-hot-posts",
    title: "V3 模块 3：热门帖子排行榜",
    subtitle: "Redis ZSet、热度分、Top N、冷启动",
    accent: "#f97316",
    summary: "理解 Redis ZSet 如何承载热门帖子排序，以及互动行为如何刷新排行榜分数。"
  },
  {
    id: "module-v3-feed-cursor",
    title: "V3 模块 4：Feed 游标分页",
    subtitle: "cursor、created_at+id、无限滚动",
    accent: "#2563eb",
    summary: "理解信息流为什么更适合游标分页，以及 cursor 如何避免深页 offset 的性能和一致性问题。"
  },
  {
    id: "module-v3-view-count",
    title: "V3 模块 5：浏览量计数",
    subtitle: "Redis INCR、批量落库、最终一致性",
    accent: "#7c3aed",
    summary: "理解为什么浏览量不适合每次访问都写 MySQL，以及 Redis 增量计数如何降低热门帖子写压力。"
  },
  {
    id: "module-v3-comment-cache",
    title: "V3 模块 6：评论列表缓存",
    subtitle: "分页 Key、列表缓存、写后失效",
    accent: "#0891b2",
    summary: "理解评论列表为什么适合短 TTL 缓存，以及创建、删除、点赞如何触发分页列表缓存失效。"
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
  },
  {
    id: "collects-vs-likes-1",
    moduleId: "module-v2-collects",
    type: "single",
    title: "收藏和点赞的表结构为什么相似？",
    prompt: "post_collects 和 post_likes 都使用 post_id + user_id 唯一索引，最核心的原因是什么？",
    choices: [
      { id: "A", text: "它们本质都是用户和帖子之间的一条互动关系，同一用户对同一帖子只能有一条记录" },
      { id: "B", text: "因为 MySQL 不允许普通索引" },
      { id: "C", text: "因为 JWT 必须读取 post_collects" },
      { id: "D", text: "因为收藏必须软删除" }
    ],
    correctAnswers: ["A"],
    referenceAnswer: "点赞和收藏都是用户与帖子之间的关系表。唯一索引保证同一个 user_id + post_id 组合只存在一次，能防止重复收藏，也能在并发请求下由数据库兜底。",
    explanation: "这体现了关系建模能力：不同业务动作可能共享相似的数据模型，但响应字段和计数字段不同。",
    whyOthersWrong: {
      B: "MySQL 支持普通索引，唯一索引是业务约束选择。",
      C: "JWT 只负责身份，和收藏关系表没有直接依赖。",
      D: "当前取消收藏是物理删除关系记录，不使用软删除。"
    },
    keyPoints: ["关系表", "唯一索引", "防重复", "并发兜底"],
    interviewTips: ["可以说：点赞代表态度，收藏代表保存，但数据库层都是 user-post relation。"],
    codeRefs: ["backend/internal/model/post_collect.go", "backend/internal/model/post_like.go"]
  },
  {
    id: "collects-idempotent-1",
    moduleId: "module-v2-collects",
    type: "multiple",
    title: "收藏接口如何做到幂等？",
    prompt: "关于 POST /api/v1/posts/:id/collect 和 DELETE /api/v1/posts/:id/collect，哪些说法正确？",
    choices: [
      { id: "A", text: "重复收藏仍返回成功，但不重复增加 collect_count" },
      { id: "B", text: "重复取消收藏仍返回成功，但不继续减少 collect_count" },
      { id: "C", text: "收藏关系插入成功时才让 posts.collect_count +1" },
      { id: "D", text: "重复收藏必须返回 409 才叫幂等" }
    ],
    correctAnswers: ["A", "B", "C"],
    referenceAnswer: "收藏接口表达的是目标状态：我要收藏或我不再收藏。第一次收藏创建关系并增加计数；重复收藏直接返回 collected=true。取消同理，只有真的删除了关系才扣减计数。",
    explanation: "幂等设计让按钮重复点击、客户端重试和网络抖动都不会破坏 collect_count。",
    whyOthersWrong: {
      D: "幂等并不要求返回 409；当前业务语义更适合重复请求返回成功。"
    },
    keyPoints: ["目标状态", "RowsAffected", "不重复计数", "重试安全"],
    interviewTips: ["回答时强调：Service 根据 Repository 的 created/deleted 布尔值决定是否改 count。"],
    codeRefs: ["backend/internal/service/collect_service.go", "backend/internal/repository/post_collect_repository.go"]
  },
  {
    id: "collects-transaction-1",
    moduleId: "module-v2-collects",
    type: "short",
    title: "收藏为什么也需要事务？",
    prompt: "收藏成功时既写 post_collects，又更新 posts.collect_count。为什么这两个操作要放进事务？",
    referenceAnswer: "因为收藏关系和收藏数是同一业务事实的两种存储。如果 post_collects 插入成功但 collect_count 更新失败，帖子详情里的收藏数就会和真实收藏关系不一致。事务保证两者同时成功或同时回滚。",
    explanation: "collect_count 是冗余计数，提升读取效率的代价是写入时必须维护一致性。",
    keyPoints: ["跨表更新", "冗余计数", "事务原子性", "一致性"],
    interviewTips: ["可以把它和点赞、评论模块串起来讲：凡是关系表和 count 字段一起变，都要考虑事务。"],
    codeRefs: ["backend/internal/service/collect_service.go", "backend/internal/repository/post_repository.go"]
  },
  {
    id: "collects-list-1",
    moduleId: "module-v2-collects",
    type: "single",
    title: "收藏列表为什么只返回 published 帖子？",
    prompt: "GET /api/v1/users/:id/collects 只返回 published 帖子，主要是为了避免什么问题？",
    choices: [
      { id: "A", text: "避免草稿、隐藏或已删除内容通过收藏列表被公开看到" },
      { id: "B", text: "因为收藏列表不能分页" },
      { id: "C", text: "因为 GORM 不能 JOIN" },
      { id: "D", text: "因为 collect_count 必须等于 0" }
    ],
    correctAnswers: ["A"],
    referenceAnswer: "收藏列表是公开接口，所以只展示 published 帖子，避免用户过去收藏过的草稿、隐藏内容或已删除内容被别人通过列表看到。",
    explanation: "公开接口要尊重内容状态。关系存在不等于内容仍然可公开访问。",
    whyOthersWrong: {
      B: "当前接口支持 page/page_size 分页。",
      C: "GORM 支持 JOIN，当前 Repository 就用了 JOIN。",
      D: "collect_count 是帖子统计字段，不决定列表是否展示。"
    },
    keyPoints: ["公开接口", "内容状态", "published", "防止信息泄露"],
    interviewTips: ["可以补一句：如果以后做用户自己的私有收藏夹，可以另开需要登录的接口。"],
    codeRefs: ["backend/internal/repository/post_collect_repository.go"]
  },
  {
    id: "collects-flow-1",
    moduleId: "module-v2-collects",
    type: "code",
    title: "收藏请求的代码链路",
    prompt: "请按代码链路解释一次 POST /api/v1/posts/:id/collect 请求从路由到数据库发生了什么。",
    referenceAnswer: "路由先经过 JWT 中间件，把 user_id 写入 Gin Context。CollectController 解析 post id 并读取当前 user_id，然后调用 CollectService。Service 先确认帖子存在且 published，再开启事务：PostCollectRepository 使用唯一索引和 OnConflict DoNothing 插入收藏关系；如果 RowsAffected 表示新插入，就调用 PostRepository.IncrementCollectCount 让 collect_count +1。事务成功后查询当前 collect_count，返回 collected=true。",
    explanation: "这道题训练你把收藏模块和点赞模块做对比。代码结构相似，但命名、响应字段和 count 字段对应收藏业务。",
    keyPoints: ["JWT 中间件", "Controller 参数解析", "Service 校验帖子", "事务", "唯一索引", "collect_count"],
    interviewTips: ["面试时可以说：重复收藏时 RowsAffected=0，因此不会重复增加 collect_count。"],
    codeRefs: ["backend/internal/router/router.go", "backend/internal/controller/collect_controller.go", "backend/internal/service/collect_service.go", "backend/internal/repository/post_collect_repository.go"]
  },
  {
    id: "follows-relation-1",
    moduleId: "module-v2-follows",
    type: "single",
    title: "user_follows 如何表达关注关系？",
    prompt: "user_follows 表中 follower_id 和 followee_id 分别表示什么？",
    choices: [
      { id: "A", text: "follower_id 是发起关注的人，followee_id 是被关注的人" },
      { id: "B", text: "follower_id 是帖子作者，followee_id 是帖子 ID" },
      { id: "C", text: "两个字段永远相等" },
      { id: "D", text: "followee_id 用来保存 JWT token" }
    ],
    correctAnswers: ["A"],
    referenceAnswer: "follower_id 表示谁在关注别人，followee_id 表示被谁关注。比如用户 1 关注用户 2，就是 follower_id=1, followee_id=2。",
    explanation: "关注是用户到用户的有方向关系，字段命名要能表达方向，否则粉丝列表和关注列表很容易写反。",
    whyOthersWrong: {
      B: "关注关系不直接关联帖子。",
      C: "两个字段相等代表自己关注自己，当前业务会禁止。",
      D: "JWT token 不存关系表。"
    },
    keyPoints: ["有方向关系", "follower 发起方", "followee 被关注方", "粉丝/关注列表方向"],
    interviewTips: ["可以画一句：A follow B，A 是 follower，B 是 followee。"],
    codeRefs: ["backend/internal/model/user_follow.go", "backend/internal/repository/user_follow_repository.go"]
  },
  {
    id: "follows-self-1",
    moduleId: "module-v2-follows",
    type: "single",
    title: "为什么禁止自己关注自己？",
    prompt: "当前关注模块中，用户关注自己会返回 40000。最核心的原因是什么？",
    choices: [
      { id: "A", text: "自己关注自己没有业务意义，还会污染 follower_count 和 following_count" },
      { id: "B", text: "因为 MySQL 不能存相同数字" },
      { id: "C", text: "因为 JWT 无法解析自己的用户 ID" },
      { id: "D", text: "因为公开列表不能返回用户信息" }
    ],
    correctAnswers: ["A"],
    referenceAnswer: "关注表达的是人与人之间的关系，自己关注自己没有实际意义。如果允许，会让粉丝数、关注数和列表展示变得奇怪，所以 Service 层直接拦截为 bad request。",
    explanation: "这是业务规则，不是数据库限制。它应该放在 Service 层，而不是让 Controller 或 Repository 零散处理。",
    whyOthersWrong: {
      B: "MySQL 可以存相同数字，禁止自关是业务规则。",
      C: "JWT 可以解析当前用户 ID。",
      D: "公开列表返回的是 PublicUser，和自关规则不是一回事。"
    },
    keyPoints: ["业务规则", "Service 校验", "计数一致", "避免无意义关系"],
    interviewTips: ["回答时可以顺带说：唯一索引防重复，Service 防自关，两者解决的问题不同。"],
    codeRefs: ["backend/internal/service/follow_service.go"]
  },
  {
    id: "follows-transaction-1",
    moduleId: "module-v2-follows",
    type: "short",
    title: "关注为什么要维护两个计数？",
    prompt: "用户 A 关注用户 B 时，为什么既要更新 A 的 following_count，又要更新 B 的 follower_count？为什么要放在事务里？",
    referenceAnswer: "A 的 following_count 表示 A 关注了多少人，B 的 follower_count 表示 B 有多少粉丝。一次关注动作会同时改变这两个用户的统计值，也会写入 user_follows 关系表。它们描述同一个业务事实，所以必须放进事务，保证同时成功或同时回滚。",
    explanation: "关注模块比点赞/收藏多一个点：它不是只改一个目标对象的 count，而是两个用户的 count 都要变。",
    keyPoints: ["双用户计数", "关系表", "事务原子性", "一致性"],
    interviewTips: ["可以说：如果关系插入成功但只更新了一个计数，就会出现用户主页统计不一致。"],
    codeRefs: ["backend/internal/service/follow_service.go", "backend/internal/repository/user_repository.go"]
  },
  {
    id: "follows-public-user-1",
    moduleId: "module-v2-follows",
    type: "multiple",
    title: "为什么关注列表使用 PublicUser？",
    prompt: "粉丝列表和关注列表是公开接口，使用 PublicUser VO。哪些说法合理？",
    choices: [
      { id: "A", text: "公开列表不应该暴露 email、role 等内部或敏感字段" },
      { id: "B", text: "PublicUser 仍然可以展示 username、nickname、avatar_url、bio 和计数字段" },
      { id: "C", text: "公开接口就必须返回 password_hash" },
      { id: "D", text: "VO 可以把数据库模型和接口响应解耦" }
    ],
    correctAnswers: ["A", "B", "D"],
    referenceAnswer: "PublicUser 是面向公开展示的用户响应结构，保留主页展示需要的字段，去掉 email、role、password_hash 等不该公开的数据。",
    explanation: "这是 VO 的价值：同一个 User model 在不同场景下可以有不同的响应形态。",
    whyOthersWrong: {
      C: "password_hash 永远不应该返回给前端。"
    },
    keyPoints: ["公开接口", "字段最小化", "VO 解耦", "保护隐私"],
    interviewTips: ["可以和登录返回的 User VO 对比：当前用户看自己可以有 email，公开列表不需要。"],
    codeRefs: ["backend/internal/vo/user.go", "backend/internal/service/follow_service.go"]
  },
  {
    id: "follows-flow-1",
    moduleId: "module-v2-follows",
    type: "code",
    title: "关注请求的代码链路",
    prompt: "请按代码链路解释一次 POST /api/v1/users/:id/follow 请求发生了什么。",
    referenceAnswer: "路由先经过 JWT 中间件，把当前 user_id 写入 Gin Context。FollowController 解析目标用户 id，并读取当前用户 id，然后调用 FollowService。Service 先禁止自己关注自己，再校验当前用户和目标用户都存在。接着开启事务：UserFollowRepository 用唯一索引和 OnConflict DoNothing 插入关注关系；如果真的新插入，就调用 UserRepository 同时让当前用户 following_count +1、目标用户 follower_count +1。事务成功后查回目标用户粉丝数，返回 followed=true。",
    explanation: "这道题训练你讲清楚 Controller、Service、Repository、JWT 中间件、事务和幂等之间的关系。",
    keyPoints: ["JWT 中间件", "禁止自关", "双方用户存在", "唯一索引", "双计数事务", "幂等"],
    interviewTips: ["面试时可以强调：重复关注时 RowsAffected=0，所以不会重复增加两个计数。"],
    codeRefs: ["backend/internal/router/router.go", "backend/internal/controller/follow_controller.go", "backend/internal/service/follow_service.go", "backend/internal/repository/user_follow_repository.go"]
  },
  {
    id: "comment-likes-relation-1",
    moduleId: "module-v2-comment-likes",
    type: "single",
    title: "comment_likes 为什么要唯一索引？",
    prompt: "comment_likes 表使用 comment_id + user_id 唯一索引，最核心的作用是什么？",
    choices: [
      { id: "A", text: "防止同一个用户对同一条评论插入多条点赞记录" },
      { id: "B", text: "让评论自动变成一级评论" },
      { id: "C", text: "让 JWT 自动续期" },
      { id: "D", text: "让所有评论只能被一个用户点赞" }
    ],
    correctAnswers: ["A"],
    referenceAnswer: "comment_id + user_id 唯一索引保证同一用户对同一评论最多只有一条点赞关系。即使重复点击或并发请求同时到达，数据库也能兜底防止重复插入。",
    explanation: "这和帖子点赞、收藏、关注的思路一样：应用层做幂等语义，数据库唯一索引做最终约束。",
    whyOthersWrong: {
      B: "评论层级由 parent_id 决定。",
      C: "JWT 续期和评论点赞表无关。",
      D: "唯一索引限制的是同一用户和同一评论的组合，不限制不同用户点赞同一评论。"
    },
    keyPoints: ["唯一索引", "关系表", "防重复", "并发兜底"],
    interviewTips: ["可以说：如果只有先查再插，在并发下仍可能重复，唯一索引才是兜底。"],
    codeRefs: ["backend/internal/model/comment_like.go", "backend/internal/repository/comment_like_repository.go"]
  },
  {
    id: "comment-likes-transaction-1",
    moduleId: "module-v2-comment-likes",
    type: "short",
    title: "评论点赞为什么需要事务？",
    prompt: "评论点赞成功时既写 comment_likes，又更新 comments.like_count。为什么这两个操作要放进事务？",
    referenceAnswer: "评论点赞关系和评论点赞数是同一个业务事实的两种存储。如果 comment_likes 插入成功但 comments.like_count 更新失败，评论展示的点赞数就会和真实点赞关系不一致。事务保证它们同时成功或同时回滚。",
    explanation: "like_count 是冗余计数，读评论列表时很方便，但写入时必须维护一致性。",
    keyPoints: ["跨表更新", "冗余计数", "事务原子性", "失败回滚"],
    interviewTips: ["可以把它和帖子点赞类比：真正插入关系时才加 count，重复点赞不会加。"],
    codeRefs: ["backend/internal/service/comment_like_service.go", "backend/internal/repository/comment_repository.go"]
  },
  {
    id: "comment-likes-deleted-1",
    moduleId: "module-v2-comment-likes",
    type: "single",
    title: "为什么删除后的评论不能点赞？",
    prompt: "当前设计中，被软删除的评论再次点赞会返回 40400。这样做主要避免什么问题？",
    choices: [
      { id: "A", text: "避免不可见内容继续产生新的互动数据" },
      { id: "B", text: "因为软删除会删除整张 comments 表" },
      { id: "C", text: "因为 bcrypt 不能处理评论" },
      { id: "D", text: "因为公开接口必须返回 500" }
    ],
    correctAnswers: ["A"],
    referenceAnswer: "软删除后的评论已经不应该出现在前台，也不应该继续产生点赞关系和 like_count 变化。Service 先确认评论存在且 published，软删除记录会被 GORM 默认过滤，因此返回 40400。",
    explanation: "这是内容可见性和互动一致性问题：不可见内容不应该被继续互动。",
    whyOthersWrong: {
      B: "软删除只写 deleted_at，不会删除整张表。",
      C: "bcrypt 只用于密码哈希。",
      D: "资源不可见应返回 404，而不是内部错误。"
    },
    keyPoints: ["软删除", "可见性", "published", "40400"],
    interviewTips: ["可以补一句：删除一级评论会级联软删除回复，这些回复也不能继续点赞。"],
    codeRefs: ["backend/internal/service/comment_like_service.go", "backend/internal/repository/comment_repository.go"]
  },
  {
    id: "comment-likes-flow-1",
    moduleId: "module-v2-comment-likes",
    type: "code",
    title: "评论点赞请求的代码链路",
    prompt: "请按代码链路解释一次 POST /api/v1/comments/:id/like 请求发生了什么。",
    referenceAnswer: "路由先经过 JWT 中间件，把 user_id 写入 Gin Context。CommentLikeController 解析 comment id 并读取当前 user_id，然后调用 CommentLikeService。Service 先确认评论存在且 published，再开启事务：CommentLikeRepository 用唯一索引和 OnConflict DoNothing 插入点赞关系；如果 RowsAffected 表示新插入，就调用 CommentRepository.IncrementLikeCount 让 comments.like_count +1。事务成功后查询当前 like_count，返回 liked=true。",
    explanation: "这道题训练你把评论点赞和帖子点赞做类比，同时注意目标对象从 posts 换成 comments。",
    keyPoints: ["JWT 中间件", "Controller 参数解析", "Service 校验评论", "事务", "唯一索引", "comments.like_count"],
    interviewTips: ["面试时可以强调：重复点赞 RowsAffected=0，所以不会重复增加 like_count。"],
    codeRefs: ["backend/internal/router/router.go", "backend/internal/controller/comment_like_controller.go", "backend/internal/service/comment_like_service.go", "backend/internal/repository/comment_like_repository.go"]
  },
  {
    id: "public-profile-vo-1",
    moduleId: "module-v2-public-profile",
    type: "multiple",
    title: "公开主页为什么用 PublicUser？",
    prompt: "GET /api/v1/users/:id 返回 PublicUser，而不是直接返回 User model。哪些说法正确？",
    choices: [
      { id: "A", text: "可以避免把 email、role、status、password_hash 等字段暴露给访客" },
      { id: "B", text: "可以保留主页需要的 username、nickname、avatar_url、bio 和计数字段" },
      { id: "C", text: "公开接口必须返回数据库表的全部字段" },
      { id: "D", text: "VO 能把数据库模型和接口响应解耦" }
    ],
    correctAnswers: ["A", "B", "D"],
    referenceAnswer: "公开主页面向任何访客，只应该返回展示需要的字段。PublicUser 保留公开资料和计数字段，隐藏登录凭证、权限和内部状态字段。",
    explanation: "这是接口设计中的最小暴露原则：数据库模型不是 API 合同，公开接口应该用专门的 VO 控制响应边界。",
    whyOthersWrong: {
      C: "直接返回全部字段会泄露不该公开的信息，也会让前端依赖数据库结构。"
    },
    keyPoints: ["PublicUser", "字段最小化", "隐私保护", "VO 解耦"],
    interviewTips: ["可以说：当前用户看自己用 User VO，别人看主页用 PublicUser VO，场景不同响应不同。"],
    codeRefs: ["backend/internal/vo/user.go", "backend/internal/service/user_service.go"]
  },
  {
    id: "public-profile-posts-1",
    moduleId: "module-v2-public-profile",
    type: "single",
    title: "为什么只返回 published 帖子？",
    prompt: "GET /api/v1/users/:id/posts 为什么只查询 status=published 的帖子？",
    choices: [
      { id: "A", text: "草稿和已软删除内容不应该出现在公开主页" },
      { id: "B", text: "MySQL 只能查询 published 字符串" },
      { id: "C", text: "JWT 中间件会自动隐藏草稿" },
      { id: "D", text: "因为公开主页接口必须经过登录" }
    ],
    correctAnswers: ["A"],
    referenceAnswer: "公开主页是给访客看的，只应该展示用户已经发布且仍可见的内容。草稿属于作者未公开内容，软删除内容也会被 GORM 默认过滤。",
    explanation: "这是内容可见性边界：写入时允许 draft，读取公开列表时必须按业务状态过滤。",
    whyOthersWrong: {
      B: "MySQL 可以查询任何状态，过滤 published 是业务规则。",
      C: "JWT 中间件只负责鉴权，不负责内容状态过滤。",
      D: "公开主页和用户公开帖子列表不需要登录。"
    },
    keyPoints: ["published", "草稿不可见", "软删除过滤", "公开读取"],
    interviewTips: ["可以和帖子详情接口类比：公开详情也只查 published。"],
    codeRefs: ["backend/internal/repository/post_repository.go", "backend/internal/service/post_service.go"]
  },
  {
    id: "public-profile-transaction-1",
    moduleId: "module-v2-public-profile",
    type: "short",
    title: "公开主页为什么不需要事务？",
    prompt: "用户公开主页和用户帖子列表都是读接口。为什么这里不需要像点赞、关注那样开启事务？",
    referenceAnswer: "事务主要用于保证多个写操作的原子性，比如插入关系表同时更新计数字段。公开主页模块只读取 users 和 posts，不修改数据，也没有需要同时成功或回滚的跨表写入，因此不需要事务。",
    explanation: "面试官常会看你是否滥用事务。读接口一般依靠查询条件和数据库默认隔离级别即可，除非有强一致读快照等特殊需求。",
    keyPoints: ["读接口", "无跨表写入", "事务用于原子性", "避免滥用事务"],
    interviewTips: ["可以补一句：如果未来做复杂报表一致性快照，才可能考虑显式事务或隔离级别。"],
    codeRefs: ["backend/internal/service/user_service.go", "backend/internal/service/post_service.go"]
  },
  {
    id: "public-profile-flow-1",
    moduleId: "module-v2-public-profile",
    type: "code",
    title: "用户公开帖子列表的代码链路",
    prompt: "请按代码链路解释一次 GET /api/v1/users/:id/posts?page=1&page_size=10 请求发生了什么。",
    referenceAnswer: "请求进入 router 后匹配到 UserController.ListPosts。Controller 解析 path 中的 user id，并用 ShouldBindQuery 解析 page/page_size。然后调用 PostService.ListByUser。Service 先用 UserRepository.FindByID 确认用户存在，再设置默认分页参数。最后 PostRepository.ListPublishedByUser 查询该用户的 published 帖子并 Preload 作者信息，Service 组装 PostList VO，Controller 用统一响应返回。",
    explanation: "这道题训练你把 Controller、Service、Repository 的职责讲清楚：Controller 管 HTTP，Service 管业务校验，Repository 管 SQL/GORM 查询。",
    keyPoints: ["Controller 解析参数", "Service 校验用户存在", "Repository 查询 published", "分页", "VO 返回"],
    interviewTips: ["面试时可以主动强调：这个接口是公开接口，所以不走 JWT 中间件。"],
    codeRefs: ["backend/internal/router/router.go", "backend/internal/controller/user_controller.go", "backend/internal/service/post_service.go", "backend/internal/repository/post_repository.go"]
  },
  {
    id: "v2-review-pattern-1",
    moduleId: "module-v2-review",
    type: "multiple",
    title: "V2 互动模块共同模式",
    prompt: "帖子点赞、帖子收藏、用户关注、评论点赞这些模块有哪些共同设计？",
    choices: [
      { id: "A", text: "都使用关系表记录用户和目标资源之间的关系" },
      { id: "B", text: "都用唯一索引防止重复关系" },
      { id: "C", text: "都把关系写入和计数字段更新放进事务" },
      { id: "D", text: "都必须使用 RabbitMQ 才能保证正确性" }
    ],
    correctAnswers: ["A", "B", "C"],
    referenceAnswer: "这些互动模块都用关系表表达用户和资源之间的关系，用唯一索引兜底幂等，并在 Service 层事务中同时维护关系表和计数字段。",
    explanation: "V2 的重点是先用 MySQL 把业务正确性做好。RabbitMQ 更适合后续异步通知，不是 V2 正确性的必要条件。",
    whyOthersWrong: {
      D: "V2 没有接 RabbitMQ。当前正确性由 MySQL 唯一索引和事务保证。"
    },
    keyPoints: ["关系表", "唯一索引", "幂等", "事务", "计数一致性"],
    interviewTips: ["面试时可以把点赞、收藏、关注放在一起讲，体现你能抽象项目模式。"],
    codeRefs: ["backend/internal/service/like_service.go", "backend/internal/service/collect_service.go", "backend/internal/service/follow_service.go", "backend/internal/service/comment_like_service.go"]
  },
  {
    id: "v2-review-transaction-1",
    moduleId: "module-v2-review",
    type: "short",
    title: "怎么判断一个操作要不要事务？",
    prompt: "请结合 FeedLab V2 说明：什么操作需要事务，什么操作不需要事务？",
    referenceAnswer: "如果一个业务动作要同时修改多份数据，并且这些修改必须一起成功或一起失败，就需要事务。例如点赞要写 post_likes 并更新 posts.like_count，关注要写 user_follows 并更新两个用户的计数字段。只读查询如公开主页、列表、是否点赞查询不修改数据，一般不需要事务。",
    explanation: "事务边界应该跟业务动作边界一致，不是每个函数都开事务，也不是只要查询两张表就必须开事务。",
    keyPoints: ["多表写入", "原子性", "计数一致性", "只读接口不滥用事务"],
    interviewTips: ["可以主动举两个正例和两个反例：点赞/关注需要，公开主页/帖子列表不需要。"],
    codeRefs: ["backend/internal/service/like_service.go", "backend/internal/service/follow_service.go", "backend/internal/service/user_service.go"]
  },
  {
    id: "v2-review-redis-mq-1",
    moduleId: "module-v2-review",
    type: "single",
    title: "为什么 Redis 和 RabbitMQ 留到后续？",
    prompt: "FeedLab V2 仍主要依赖 MySQL，没有把互动状态缓存到 Redis，也没有发送 RabbitMQ 通知。最合理的解释是什么？",
    choices: [
      { id: "A", text: "V2 先保证业务闭环和数据一致性，Redis/RabbitMQ 属于后续性能和异步化演进" },
      { id: "B", text: "Gin 项目不能使用 Redis" },
      { id: "C", text: "GORM 会自动把所有消息发到 RabbitMQ" },
      { id: "D", text: "只要用了 MySQL，就永远不需要缓存和消息队列" }
    ],
    correctAnswers: ["A"],
    referenceAnswer: "V2 的目标是把互动关系、幂等、事务和计数维护做正确。Redis 更适合 V3 做热点缓存和排行榜，RabbitMQ 更适合 V4 做通知和异步事件。",
    explanation: "这是项目迭代节奏：先正确，再优化，再异步化。面试时这样讲会比一上来堆组件更可信。",
    whyOthersWrong: {
      B: "Gin 可以正常使用 Redis。",
      C: "GORM 不会自动发送 RabbitMQ 消息。",
      D: "MySQL 是持久化基础，但高并发读、排行榜和通知仍可能需要缓存和消息队列。"
    },
    keyPoints: ["阶段演进", "先正确", "Redis 缓存", "RabbitMQ 通知"],
    interviewTips: ["可以说：我没有为了堆技术而接组件，而是把它们放到合适版本解决合适问题。"],
    codeRefs: ["README.md", "docs/feedlab-v2-interactions-code-guide.md"]
  },
  {
    id: "v2-review-explain-1",
    moduleId: "module-v2-review",
    type: "code",
    title: "用一段话介绍 V2",
    prompt: "如果面试官让你介绍 FeedLab V2 的核心设计，你会怎么讲？",
    referenceAnswer: "FeedLab V2 主要补齐社区互动能力。我把点赞、收藏、关注、评论点赞都设计成关系表加唯一索引，保证重复请求和并发请求下不会产生重复关系。涉及关系表和计数字段的写操作都放在 Service 层事务里完成，比如点赞时同时写 post_likes 并维护 posts.like_count。Controller 只负责 HTTP 参数和统一响应，Repository 只负责 GORM 查询。公开接口使用 VO 控制返回字段，比如 PublicUser 不暴露 email 和 role。V2 先用 MySQL 保证业务正确性，Redis 缓存和 RabbitMQ 通知放到后续版本演进。",
    explanation: "这是一道表达题。重点不是逐行背代码，而是把设计动机、分层职责、一致性和演进路线讲完整。",
    keyPoints: ["互动能力", "关系表", "唯一索引", "幂等", "事务", "VO", "Redis/RabbitMQ 演进"],
    interviewTips: ["回答时控制在 60-90 秒，先讲整体，再举点赞或关注一个具体例子。"],
    codeRefs: ["docs/feedlab-v2-interactions-code-guide.md", "backend/internal/router/router.go"]
  },
  {
    id: "v3-post-cache-aside-1",
    moduleId: "module-v3-post-cache",
    type: "single",
    title: "帖子详情为什么适合 Cache Aside？",
    prompt: "FeedLab V3 给 GET /api/v1/posts/:id 加 Redis 缓存，采用 Cache Aside 模式。下面哪种说法最准确？",
    choices: [
      { id: "A", text: "先读 Redis，未命中再查 MySQL，并把结果写回 Redis" },
      { id: "B", text: "所有写请求都只写 Redis，不再写 MySQL" },
      { id: "C", text: "只要使用 GORM，Redis 会自动缓存所有查询" },
      { id: "D", text: "Cache Aside 意味着缓存永远不会过期" }
    ],
    correctAnswers: ["A"],
    referenceAnswer: "Cache Aside 的核心是业务代码先查缓存；缓存没有时再查数据库，然后把数据库结果写入缓存。MySQL 仍是最终数据源，Redis 是读优化层。",
    explanation: "帖子详情是高频读接口，很适合用 Cache Aside 降低 MySQL 压力。但缓存不能取代数据库持久化，也需要 TTL 和失效策略。",
    whyOthersWrong: {
      B: "FeedLab 仍以 MySQL 为最终数据源，写操作不能只写 Redis。",
      C: "GORM 不会自动接管 Redis 缓存，需要业务代码显式读写缓存。",
      D: "缓存必须有 TTL 或失效策略，否则容易长期返回旧数据。"
    },
    keyPoints: ["Cache Aside", "Redis 命中", "MySQL 回源", "写回缓存", "MySQL 是最终数据源"],
    interviewTips: ["可以用一句话回答：读缓存，未命中查库并回填，写操作后删除缓存。"],
    codeRefs: ["backend/internal/service/post_service.go", "backend/internal/cache/post_cache.go"]
  },
  {
    id: "v3-post-cache-key-1",
    moduleId: "module-v3-post-cache",
    type: "short",
    title: "post:detail:{post_id} 的用途和 TTL",
    prompt: "请解释 Redis Key `post:detail:{post_id}` 的用途、缓存内容和过期策略。",
    referenceAnswer: "`post:detail:{post_id}` 用来缓存某篇 published 帖子的详情响应 VO，包括作者信息和计数字段。默认 TTL 是 300 秒，可通过 config.yaml 中的 redis.post_detail_ttl_seconds 调整。TTL 能限制旧数据最长存在时间，缓存失效则回源 MySQL。",
    explanation: "面试官问 Redis Key 时，不只想听 key 名字，还想听它缓存什么、为什么过期、什么时候删除。",
    keyPoints: ["帖子详情 VO", "published 帖子", "默认 300 秒", "TTL 防止旧数据长期存在", "未命中回源 MySQL"],
    interviewTips: ["可以补一句：我缓存的是 VO，不是 GORM Model，避免缓存数据库内部结构。"],
    codeRefs: ["backend/internal/cache/post_cache.go", "backend/config.yaml", "backend/internal/config/config.go"]
  },
  {
    id: "v3-post-cache-invalidate-1",
    moduleId: "module-v3-post-cache",
    type: "multiple",
    title: "哪些操作需要删除帖子详情缓存？",
    prompt: "帖子详情中包含点赞数、收藏数、评论数和帖子可见性。下面哪些操作成功后应该删除 `post:detail:{post_id}`？",
    choices: [
      { id: "A", text: "点赞或取消点赞帖子" },
      { id: "B", text: "收藏或取消收藏帖子" },
      { id: "C", text: "发布或删除评论" },
      { id: "D", text: "删除帖子" }
    ],
    correctAnswers: ["A", "B", "C", "D"],
    referenceAnswer: "这四类操作都会影响帖子详情响应。点赞和收藏会改变计数字段，评论创建和删除会改变 comment_count，删除帖子会改变可见性，所以成功后都要删除旧详情缓存。",
    explanation: "缓存一致性的核心是识别哪些写操作会影响缓存内容。只缓存读接口不难，难点是写操作后不返回旧数据。",
    keyPoints: ["like_count", "collect_count", "comment_count", "软删除可见性", "写后删缓存"],
    interviewTips: ["回答时可以强调：删除缓存比同步更新缓存更简单可靠，下一次读取自然回源。"],
    codeRefs: ["backend/internal/service/like_service.go", "backend/internal/service/collect_service.go", "backend/internal/service/comment_service.go", "backend/internal/service/post_service.go"]
  },
  {
    id: "v3-post-cache-code-1",
    moduleId: "module-v3-post-cache",
    type: "code",
    title: "帖子详情缓存的代码链路",
    prompt: "请按代码链路解释一次 GET /api/v1/posts/:id 在 V3 中如何使用 Redis 缓存。",
    referenceAnswer: "请求进入 router 后匹配到 PostController.Detail。Controller 解析帖子 ID 后调用 PostService.Detail。Service 先调用 PostCache.Get 读取 `post:detail:{id}`，命中则直接返回缓存的 Post VO。未命中时调用 PostRepository.FindPublishedByID 查询 MySQL，并 Preload 作者信息，然后用 vo.NewPost 组装响应 VO，最后调用 PostCache.Set 写入 Redis，TTL 默认 300 秒。",
    explanation: "这道题训练你把 Controller-Service-Repository-Cache 的协作说清楚。Repository 仍只负责 MySQL，Cache 封装 Redis，Service 编排业务流程。",
    keyPoints: ["Controller 解析 ID", "Service 先查缓存", "Repository 回源 MySQL", "VO 写入 Redis", "TTL"],
    interviewTips: ["可以补一句：缓存异常不应该改变接口语义，MySQL 仍是最终数据源。"],
    codeRefs: ["backend/internal/controller/post_controller.go", "backend/internal/service/post_service.go", "backend/internal/cache/post_cache.go", "backend/internal/repository/post_repository.go"]
  },
  {
    id: "v3-user-cache-public-1",
    moduleId: "module-v3-user-cache",
    type: "single",
    title: "为什么缓存 PublicUser 而不是 User？",
    prompt: "FeedLab V3 给 GET /api/v1/users/:id 加 Redis 缓存时，为什么缓存 PublicUser VO，而不是完整 User VO？",
    choices: [
      { id: "A", text: "PublicUser 只包含公开主页需要的字段，不会缓存 email、role、status 等内部字段" },
      { id: "B", text: "Redis 不能存储带 email 的 JSON" },
      { id: "C", text: "User VO 无法被 json.Marshal 序列化" },
      { id: "D", text: "缓存完整 User 可以让公开接口返回更多字段" }
    ],
    correctAnswers: ["A"],
    referenceAnswer: "公开主页接口只应该返回公开字段，所以缓存也应该保存 PublicUser VO。这样即使缓存被复用，也不会把 email、role、status 等当前用户或内部字段泄露给公开接口。",
    explanation: "缓存层不能破坏接口边界。公开接口返回什么，缓存就应该缓存什么，而不是缓存更宽的数据库模型或内部 VO。",
    whyOthersWrong: {
      B: "Redis 可以存储任意字符串，包括带 email 字段的 JSON。",
      C: "User VO 也可以序列化，问题不是技术不能，而是边界不应该。",
      D: "公开接口不应该因为缓存而扩大返回字段。"
    },
    keyPoints: ["PublicUser VO", "隐私字段", "接口边界", "缓存不扩大权限"],
    interviewTips: ["可以说：缓存是性能优化，不应该改变 API 契约。"],
    codeRefs: ["backend/internal/vo/user.go", "backend/internal/cache/user_cache.go", "backend/internal/service/user_service.go"]
  },
  {
    id: "v3-user-cache-key-1",
    moduleId: "module-v3-user-cache",
    type: "short",
    title: "user:profile:{user_id} 的用途和 TTL",
    prompt: "请解释 Redis Key `user:profile:{user_id}` 缓存什么、默认过期时间是多少、为什么要设置 TTL。",
    referenceAnswer: "`user:profile:{user_id}` 缓存用户公开主页资料 PublicUser VO，默认 TTL 是 600 秒，可通过 config.yaml 的 redis.user_profile_ttl_seconds 调整。TTL 可以限制旧资料最长存在时间，避免缓存因为漏删而长期返回旧粉丝数、关注数或发帖数。",
    explanation: "用户公开资料虽然是公开数据，但其中有计数字段，会随着关注和发帖变化，所以需要 TTL 和写后失效。",
    keyPoints: ["PublicUser", "默认 600 秒", "可配置", "计数字段", "防止旧数据长期存在"],
    interviewTips: ["回答 Redis Key 时要包含：key 格式、value 内容、TTL、失效场景。"],
    codeRefs: ["backend/internal/cache/user_cache.go", "backend/config.yaml", "backend/internal/config/config.go"]
  },
  {
    id: "v3-user-cache-invalidate-1",
    moduleId: "module-v3-user-cache",
    type: "multiple",
    title: "哪些操作会影响用户公开资料缓存？",
    prompt: "用户公开资料中包含 follower_count、following_count、post_count。下面哪些操作成功后应该删除相关 `user:profile:{user_id}` 缓存？",
    choices: [
      { id: "A", text: "当前用户关注目标用户" },
      { id: "B", text: "当前用户取消关注目标用户" },
      { id: "C", text: "用户发布 published 帖子" },
      { id: "D", text: "用户删除 published 帖子" }
    ],
    correctAnswers: ["A", "B", "C", "D"],
    referenceAnswer: "关注和取消关注会改变当前用户的 following_count，也会改变目标用户的 follower_count，所以要删除双方缓存。发布和删除 published 帖子会改变作者 post_count，所以要删除作者缓存。",
    explanation: "缓存失效要从响应字段反推：只要写操作会改变缓存响应里的字段，就需要删除缓存。",
    keyPoints: ["follower_count", "following_count", "post_count", "双方用户缓存", "作者缓存"],
    interviewTips: ["可以主动强调：/users/me 不用这个公开缓存，因为它返回的是当前用户私有视图。"],
    codeRefs: ["backend/internal/service/follow_service.go", "backend/internal/service/post_service.go"]
  },
  {
    id: "v3-user-cache-code-1",
    moduleId: "module-v3-user-cache",
    type: "code",
    title: "用户公开资料缓存的代码链路",
    prompt: "请按代码链路解释一次 GET /api/v1/users/:id 在 V3 中如何使用 Redis 缓存。",
    referenceAnswer: "请求进入 router 后匹配到 UserController.PublicProfile。Controller 解析 user id 后调用 UserService.PublicProfile。Service 先通过 UserCache.GetPublicProfile 读取 `user:profile:{id}`，命中则直接返回 PublicUser。未命中时调用 UserRepository.FindByID 查询 MySQL，再用 vo.NewPublicUser 组装公开 VO，最后调用 UserCache.SetPublicProfile 写入 Redis，TTL 默认 600 秒。",
    explanation: "这道题训练你说明缓存层和分层架构的关系：Controller 不碰缓存，Repository 不碰 Redis，Service 编排缓存和数据库。",
    keyPoints: ["UserController", "UserService", "UserCache", "UserRepository", "PublicUser VO", "TTL"],
    interviewTips: ["可以补一句：缓存失败不改变接口语义，因为 MySQL 仍是最终数据源。"],
    codeRefs: ["backend/internal/controller/user_controller.go", "backend/internal/service/user_service.go", "backend/internal/cache/user_cache.go", "backend/internal/repository/user_repository.go"]
  },
  {
    id: "v3-hot-posts-zset-1",
    moduleId: "module-v3-hot-posts",
    type: "single",
    title: "为什么热门帖子用 Redis ZSet？",
    prompt: "FeedLab V3 使用 `rank:hot_posts` 做热门帖子排行榜。为什么 Redis ZSet 比普通 String 或 List 更适合这个场景？",
    choices: [
      { id: "A", text: "ZSet 同时保存成员和分数，并支持按分数快速取 Top N" },
      { id: "B", text: "ZSet 会自动生成帖子正文" },
      { id: "C", text: "ZSet 可以替代 MySQL 持久化所有帖子" },
      { id: "D", text: "ZSet 不需要业务代码维护分数" }
    ],
    correctAnswers: ["A"],
    referenceAnswer: "热门榜本质是 member + score 的排序问题。ZSet 可以把 post_id 作为 member，把热度分作为 score，用 ZREVRANGE/ZRevRangeWithScores 取 Top N。",
    explanation: "String 适合缓存单值，List 适合队列或按插入顺序读取，ZSet 才适合按业务分数排序。",
    whyOthersWrong: {
      B: "ZSet 只保存成员和分数，不生成帖子内容。",
      C: "MySQL 仍是帖子最终数据源，ZSet 只做排行榜索引。",
      D: "热度分需要业务代码在点赞、收藏、评论等写操作后刷新。"
    },
    keyPoints: ["ZSet", "member", "score", "Top N", "排行榜"],
    interviewTips: ["可以说：ZSet 里只放 post_id 和 score，详情仍回 MySQL 查，避免 Redis 存大对象。"],
    codeRefs: ["backend/internal/cache/hot_post_cache.go", "backend/internal/service/post_service.go"]
  },
  {
    id: "v3-hot-posts-score-1",
    moduleId: "module-v3-hot-posts",
    type: "short",
    title: "热度分公式怎么设计？",
    prompt: "FeedLab 当前热门帖子分数是 `like_count * 3 + collect_count * 5 + comment_count * 4`。请解释这个公式的含义和局限。",
    referenceAnswer: "这个公式把点赞、收藏、评论转换成一个热度分。点赞表示轻量认可，权重 3；评论互动更强，权重 4；收藏表示长期兴趣，权重 5。局限是暂时没有时间衰减和浏览量，所以老帖子可能长期占榜，后续可以加入发布时间衰减或 view_count。",
    explanation: "热度分不是绝对正确，而是业务策略。面试时重点讲清楚为什么有权重，以及后续如何演进。",
    keyPoints: ["点赞权重", "评论权重", "收藏权重", "时间衰减", "可演进"],
    interviewTips: ["可以主动说：V3 先做简单可解释的公式，后续再加时间衰减和浏览量。"],
    codeRefs: ["backend/internal/service/hot_score.go", "backend/internal/model/post.go"]
  },
  {
    id: "v3-hot-posts-refresh-1",
    moduleId: "module-v3-hot-posts",
    type: "multiple",
    title: "哪些操作会刷新热门榜？",
    prompt: "下面哪些操作成功后应该刷新或移除 `rank:hot_posts` 中的帖子？",
    choices: [
      { id: "A", text: "点赞或取消点赞帖子" },
      { id: "B", text: "收藏或取消收藏帖子" },
      { id: "C", text: "发布或删除评论" },
      { id: "D", text: "删除帖子" }
    ],
    correctAnswers: ["A", "B", "C", "D"],
    referenceAnswer: "点赞、收藏、评论会改变热度分，所以要刷新 ZSet score。删除帖子会让帖子不可见，所以要从 `rank:hot_posts` 移除。",
    explanation: "排行榜一致性和缓存一致性类似：先找出哪些写操作会影响榜单分数或可见性，再在这些写操作后更新 Redis。",
    keyPoints: ["刷新 score", "移除删除帖子", "互动计数", "可见性"],
    interviewTips: ["可以强调：排行榜里只保留 published 帖子，软删除后不能继续出现在榜单。"],
    codeRefs: ["backend/internal/service/like_service.go", "backend/internal/service/collect_service.go", "backend/internal/service/comment_service.go", "backend/internal/service/post_service.go"]
  },
  {
    id: "v3-hot-posts-code-1",
    moduleId: "module-v3-hot-posts",
    type: "code",
    title: "热门帖子接口的代码链路",
    prompt: "请按代码链路解释一次 GET /api/v1/posts/hot?limit=10 请求发生了什么。",
    referenceAnswer: "请求进入 router 后匹配到 PostController.Hot。Controller 绑定 limit 参数后调用 PostService.Hot。Service 先从 HotPostCache.Top 读取 Redis ZSet `rank:hot_posts` 的 Top N post_id 和 score，再用 PostRepository.FindPublishedByIDs 回 MySQL 查 published 帖子详情，并按 Redis 返回顺序组装 PostList。如果 ZSet 为空，则用 PostRepository.ListHotPublished 从 MySQL 兜底取一批帖子，并根据计数字段计算 hot_score 后回填 Redis。",
    explanation: "这道题训练你说明 Redis 只负责排序索引，MySQL 仍负责完整帖子数据。",
    keyPoints: ["PostController.Hot", "HotPostCache.Top", "rank:hot_posts", "FindPublishedByIDs", "MySQL 兜底", "回填 ZSet"],
    interviewTips: ["可以补一句：冷启动兜底能让本地测试和新环境部署时接口不返回空。"],
    codeRefs: ["backend/internal/controller/post_controller.go", "backend/internal/service/post_service.go", "backend/internal/cache/hot_post_cache.go", "backend/internal/repository/post_repository.go"]
  },
  {
    id: "v3-feed-cursor-why-1",
    moduleId: "module-v3-feed-cursor",
    type: "single",
    title: "Feed 为什么更适合游标分页？",
    prompt: "FeedLab 新增 GET /api/v1/feed/posts?cursor=&limit=10。相比 page/page_size，游标分页最核心的优势是什么？",
    choices: [
      { id: "A", text: "游标分页可以减少深页 offset 跳过大量记录，并降低新内容插入导致重复或漏查的概率" },
      { id: "B", text: "游标分页一定不需要数据库索引" },
      { id: "C", text: "游标分页可以自动替代 JWT 鉴权" },
      { id: "D", text: "游标分页会把所有帖子一次性返回给前端" }
    ],
    correctAnswers: ["A"],
    referenceAnswer: "Feed 信息流通常是向下无限滚动。page/page_size 在深页时 offset 越来越大，数据库要跳过更多记录；同时如果期间有新帖子插入，翻页边界容易变化。游标分页用上一页最后一条记录作为边界，下一页只查更早的数据，更适合无限滚动。",
    explanation: "游标分页不是为了替代所有分页，而是适合时间线、消息流、信息流这类连续向后加载的场景。",
    whyOthersWrong: {
      B: "游标分页仍然依赖合适的排序字段和索引设计。",
      C: "分页和鉴权是两件事，本接口是公开 Feed，不涉及 JWT。",
      D: "游标分页每次只返回 limit 条数据。"
    },
    keyPoints: ["无限滚动", "深页 offset", "稳定边界", "避免重复/漏查", "limit"],
    interviewTips: ["可以用一句话总结：page 是按页号找位置，cursor 是按上一页最后一条记录找下一段。"],
    codeRefs: ["backend/internal/service/post_service.go", "backend/internal/repository/post_repository.go"]
  },
  {
    id: "v3-feed-cursor-fields-1",
    moduleId: "module-v3-feed-cursor",
    type: "short",
    title: "cursor 为什么包含 created_at 和 id？",
    prompt: "FeedLab 的 cursor 由上一页最后一条帖子的 created_at 和 id 组成。请解释为什么不只用 created_at。",
    referenceAnswer: "帖子列表按 created_at DESC, id DESC 排序。created_at 表示时间边界，但多个帖子可能拥有相同创建时间，所以还需要 id 作为稳定的第二排序字段。下一页查询使用 created_at 更早，或 created_at 相同但 id 更小的记录，能避免边界处重复或漏查。",
    explanation: "任何游标分页都要保证排序字段能形成稳定顺序。created_at + id 是常见组合：时间负责业务顺序，id 负责唯一兜底。",
    keyPoints: ["created_at DESC", "id DESC", "相同时间", "稳定排序", "边界条件"],
    interviewTips: ["面试表达可以说：cursor 必须和 order by 字段一致，否则下一页边界会不稳定。"],
    codeRefs: ["backend/internal/service/post_service.go", "backend/internal/repository/post_repository.go"]
  },
  {
    id: "v3-feed-cursor-response-1",
    moduleId: "module-v3-feed-cursor",
    type: "multiple",
    title: "Feed 响应字段怎么理解？",
    prompt: "GET /api/v1/feed/posts 的响应 data 中包含 items、next_cursor、has_more、limit。下面哪些说法正确？",
    choices: [
      { id: "A", text: "items 是当前页帖子列表" },
      { id: "B", text: "next_cursor 由后端生成，客户端只需要原样透传" },
      { id: "C", text: "has_more 表示是否还有下一页" },
      { id: "D", text: "limit 表示本次请求实际使用的分页大小" }
    ],
    correctAnswers: ["A", "B", "C", "D"],
    referenceAnswer: "items 是当前页数据；next_cursor 是下一页游标，客户端不应该解析它；has_more 告诉前端是否继续展示加载更多；limit 是本次实际使用的条数，默认 10，最大 50。",
    explanation: "好的 API 响应会让前端不需要猜测分页状态。后端负责生成游标，前端负责保存和传回游标。",
    keyPoints: ["items", "next_cursor", "has_more", "limit", "客户端透传"],
    interviewTips: ["可以强调：cursor 是后端契约的一部分，不应该让前端依赖内部编码格式。"],
    codeRefs: ["backend/internal/vo/post.go", "backend/internal/controller/post_controller.go"]
  },
  {
    id: "v3-feed-cursor-code-1",
    moduleId: "module-v3-feed-cursor",
    type: "code",
    title: "Feed 游标分页的代码链路",
    prompt: "请按代码链路解释一次 GET /api/v1/feed/posts?limit=10&cursor=xxx 请求发生了什么。",
    referenceAnswer: "请求进入 router 后匹配到 PostController.Feed。Controller 绑定 cursor 和 limit 参数，调用 PostService.Feed。Service 设置默认 limit，解析 cursor 得到上一页最后一条的 created_at 和 id，然后多查一条数据判断是否 has_more。Repository.ListFeedPublished 根据 published 状态和游标边界查询 MySQL，按 created_at DESC, id DESC 排序。Service 最后把 posts 转成 VO，并用最后一条返回数据生成 next_cursor。",
    explanation: "这道题训练你讲清楚 Controller-Service-Repository 分层：Controller 管 HTTP，Service 管分页业务规则，Repository 管 SQL 条件。",
    keyPoints: ["PostController.Feed", "PostService.Feed", "decodeFeedCursor", "limit + 1", "ListFeedPublished", "next_cursor"],
    interviewTips: ["可以补一句：多查一条是为了判断是否还有下一页，不需要再额外 count。"],
    codeRefs: ["backend/internal/router/router.go", "backend/internal/controller/post_controller.go", "backend/internal/service/post_service.go", "backend/internal/repository/post_repository.go"]
  },
  {
    id: "v3-view-count-why-1",
    moduleId: "module-v3-view-count",
    type: "single",
    title: "为什么浏览量先写 Redis？",
    prompt: "FeedLab V3 访问帖子详情时先对 Redis Key `post:view_count:{post_id}` 做 INCR，而不是每次都直接更新 MySQL。最核心原因是什么？",
    choices: [
      { id: "A", text: "浏览量是高频写，Redis INCR 可以先承接增量，降低 MySQL 热点写压力" },
      { id: "B", text: "MySQL 不能保存整数类型" },
      { id: "C", text: "Redis 写入后一定比 MySQL 更可靠" },
      { id: "D", text: "这样就不需要 posts.view_count 字段了" }
    ],
    correctAnswers: ["A"],
    referenceAnswer: "热门帖子详情可能被频繁访问，如果每次访问都 UPDATE MySQL，会形成热点写。Redis INCR 很适合做计数增量，达到阈值后再批量写回 MySQL，能降低数据库压力。",
    explanation: "浏览量通常允许最终一致，不需要像支付余额那样强一致，所以适合 Redis 增量计数。",
    whyOthersWrong: {
      B: "MySQL 当然可以保存整数，问题是高频更新压力。",
      C: "Redis 不是最终数据源，MySQL 仍负责最终持久化。",
      D: "posts.view_count 仍然是最终落库字段。"
    },
    keyPoints: ["高频写", "Redis INCR", "热点写", "批量落库", "最终一致"],
    interviewTips: ["可以说：浏览量是典型可以降频写库的计数字段。"],
    codeRefs: ["backend/internal/cache/post_view_cache.go", "backend/internal/service/post_service.go"]
  },
  {
    id: "v3-view-count-key-1",
    moduleId: "module-v3-view-count",
    type: "short",
    title: "post:view_count:{post_id} 的用途和 TTL",
    prompt: "请解释 Redis Key `post:view_count:{post_id}` 缓存什么、默认过期时间是多少、什么时候会落库。",
    referenceAnswer: "`post:view_count:{post_id}` 保存某篇帖子尚未写回 MySQL 的浏览量增量。默认 TTL 是 86400 秒，可通过 redis.post_view_ttl_seconds 配置。每次帖子详情访问会 INCR 这个 Key；当增量达到 redis.post_view_flush_threshold，默认 100，后端会把增量批量写回 posts.view_count，并删除该 Key。",
    explanation: "回答 Redis Key 时要同时说清楚 key 格式、value 内容、TTL 和失效/落库时机。",
    keyPoints: ["post:view_count:{post_id}", "待落库增量", "默认 86400 秒", "默认阈值 100", "批量写回 MySQL"],
    interviewTips: ["可以补一句：删除帖子时也要删除这个 Key，避免软删除内容残留临时计数。"],
    codeRefs: ["backend/internal/cache/post_view_cache.go", "backend/config.yaml", "backend/internal/config/config.go"]
  },
  {
    id: "v3-view-count-consistency-1",
    moduleId: "module-v3-view-count",
    type: "multiple",
    title: "浏览量计数的一致性取舍",
    prompt: "关于 V3 浏览量计数模块，下面哪些说法正确？",
    choices: [
      { id: "A", text: "接口响应会把 MySQL 中的 view_count 和 Redis 中的增量叠加展示" },
      { id: "B", text: "达到阈值后会批量写回 MySQL" },
      { id: "C", text: "这是最终一致性设计，不适合余额、库存等强一致场景" },
      { id: "D", text: "Redis 失败时应该让帖子详情接口整体失败" }
    ],
    correctAnswers: ["A", "B", "C"],
    referenceAnswer: "FeedLab 的详情响应会叠加 Redis 增量；达到阈值后把增量批量落库。这是最终一致性设计，适合浏览量这类允许短暂误差的计数，不适合余额、库存。Redis 失败时不应该阻断详情主流程，因为 MySQL 仍是最终数据源。",
    explanation: "缓存和计数优化通常要区分主流程和旁路能力：浏览量失败不应该影响用户阅读帖子。",
    whyOthersWrong: {
      D: "Redis 只是优化层，失败时可以降级为只返回 MySQL 中的 view_count。"
    },
    keyPoints: ["叠加展示", "阈值落库", "最终一致", "降级", "不适合强一致计数"],
    interviewTips: ["面试时可以主动举反例：库存扣减不能这样随意最终一致。"],
    codeRefs: ["backend/internal/service/post_service.go", "backend/internal/repository/post_repository.go"]
  },
  {
    id: "v3-view-count-code-1",
    moduleId: "module-v3-view-count",
    type: "code",
    title: "浏览量计数的代码链路",
    prompt: "请按代码链路解释一次 GET /api/v1/posts/:id 如何更新浏览量。",
    referenceAnswer: "请求进入 PostController.Detail，Controller 解析帖子 ID 后调用 PostService.Detail。Service 先尝试读取 post:detail:{id} 帖子详情缓存，命中则复制缓存 VO，未命中则查 MySQL 并写入详情缓存。随后 Service 调用 applyViewCount，对 PostViewCache.Increment 执行 Redis INCR，响应里的 view_count 加上 Redis 返回的增量。如果增量达到阈值，Service 使用 PostViewCache.Take 取出并删除增量，再调用 PostRepository.IncrementViewCount 批量写回 MySQL，同时删除旧帖子详情缓存。",
    explanation: "这道题训练你讲清楚缓存命中路径和未命中路径都要计数，并说明为什么 Controller 和 Repository 不直接操作 Redis。",
    keyPoints: ["PostController.Detail", "PostService.Detail", "PostViewCache.Increment", "applyViewCount", "Take", "IncrementViewCount"],
    interviewTips: ["可以说：Service 层负责组合 Redis 计数和 MySQL 落库，保持 Controller 简洁。"],
    codeRefs: ["backend/internal/controller/post_controller.go", "backend/internal/service/post_service.go", "backend/internal/cache/post_view_cache.go", "backend/internal/repository/post_repository.go"]
  },
  {
    id: "v3-comment-cache-key-1",
    moduleId: "module-v3-comment-cache",
    type: "single",
    title: "评论列表缓存 Key 为什么带分页参数？",
    prompt: "FeedLab 使用 `post:comments:{post_id}:page:{page}:size:{page_size}` 缓存一级评论列表。为什么 Key 里必须带 page 和 page_size？",
    choices: [
      { id: "A", text: "因为不同分页请求返回的数据不同，不带分页参数会让不同页面互相污染" },
      { id: "B", text: "因为 Redis Key 必须至少包含四个冒号" },
      { id: "C", text: "因为 MySQL 只能查询第一页" },
      { id: "D", text: "因为 JWT 中间件要求 Key 带 page" }
    ],
    correctAnswers: ["A"],
    referenceAnswer: "评论列表是分页接口，page=1/page_size=10 和 page=2/page_size=10 返回的是不同数据。如果 Redis Key 不带分页参数，第二页可能读到第一页缓存，接口就错了。",
    explanation: "设计列表缓存 Key 时，要把影响响应内容的查询条件都放进 Key，包括分页、排序、过滤条件等。",
    whyOthersWrong: {
      B: "Redis 对 Key 的冒号数量没有要求，冒号只是人为约定的命名层级。",
      C: "MySQL 可以用 limit/offset 查询任意页。",
      D: "评论列表是公开接口，和 JWT 无关。"
    },
    keyPoints: ["分页参数", "响应内容", "缓存隔离", "Key 设计"],
    interviewTips: ["可以主动扩展：如果后续支持排序方式，也要把 sort 放进 Key。"],
    codeRefs: ["backend/internal/cache/comment_cache.go", "backend/internal/service/comment_service.go"]
  },
  {
    id: "v3-comment-cache-ttl-1",
    moduleId: "module-v3-comment-cache",
    type: "short",
    title: "评论列表缓存的 TTL 和失效",
    prompt: "请解释 `post:comments:{post_id}:page:{page}:size:{page_size}` 和 `comment:replies:{comment_id}:page:{page}:size:{page_size}` 的用途、默认 TTL，以及哪些写操作会删除它们。",
    referenceAnswer: "这两个 Key 分别缓存帖子一级评论分页列表和某条一级评论的二级回复分页列表，缓存内容是 CommentList VO，默认 TTL 是 120 秒，可通过 redis.comment_list_ttl_seconds 配置。创建评论、删除评论、评论点赞和取消点赞都会改变列表内容或 like_count，所以成功后要删除相关评论列表或回复列表缓存。",
    explanation: "列表缓存的难点不在读取，而在失效。只要写操作会影响列表里展示的字段，就应该删除对应缓存。",
    keyPoints: ["CommentList VO", "默认 120 秒", "创建评论", "删除评论", "点赞数变化", "写后失效"],
    interviewTips: ["回答时记得说：缓存失败不影响主流程，MySQL 仍是最终数据源。"],
    codeRefs: ["backend/internal/cache/comment_cache.go", "backend/config.yaml", "backend/internal/service/comment_service.go", "backend/internal/service/comment_like_service.go"]
  },
  {
    id: "v3-comment-cache-invalidate-1",
    moduleId: "module-v3-comment-cache",
    type: "multiple",
    title: "哪些操作需要删除评论列表缓存？",
    prompt: "下面哪些操作成功后需要删除一级评论列表或回复列表缓存？",
    choices: [
      { id: "A", text: "发布一级评论" },
      { id: "B", text: "发布二级回复" },
      { id: "C", text: "删除评论或回复" },
      { id: "D", text: "点赞或取消点赞某条评论" }
    ],
    correctAnswers: ["A", "B", "C", "D"],
    referenceAnswer: "发布一级评论会影响帖子一级评论列表；发布二级回复会影响对应一级评论的回复列表；删除评论或回复会影响可见内容；点赞或取消点赞会影响列表里的 like_count。因此这些操作都需要删除相关列表缓存。",
    explanation: "缓存失效要从响应字段反推：items 和 like_count 都在 CommentList 响应里，所以内容变化和点赞数变化都要失效。",
    keyPoints: ["一级评论列表", "回复列表", "可见内容", "like_count", "相关 Key"],
    interviewTips: ["可以补一句：当前用 SCAN 按前缀删同一资源的分页 Key，是 V3 的简化方案。"],
    codeRefs: ["backend/internal/service/comment_service.go", "backend/internal/service/comment_like_service.go", "backend/internal/cache/comment_cache.go"]
  },
  {
    id: "v3-comment-cache-code-1",
    moduleId: "module-v3-comment-cache",
    type: "code",
    title: "评论列表缓存的代码链路",
    prompt: "请按代码链路解释一次 GET /api/v1/posts/:id/comments?page=1&page_size=10 请求如何使用 Redis 缓存。",
    referenceAnswer: "请求进入 CommentController.ListPostComments，Controller 解析帖子 ID 和分页参数后调用 CommentService.ListPostComments。Service 先校验帖子存在且 published，然后计算默认分页参数。接着调用 CommentCache.GetPostComments 读取 `post:comments:{post_id}:page:{page}:size:{page_size}`，命中则直接返回 CommentList。未命中时调用 CommentRepository.ListPostComments 查询 MySQL，并用 vo.NewComments 组装 CommentList，最后调用 CommentCache.SetPostComments 写入 Redis，TTL 默认 120 秒。",
    explanation: "这道题训练你说明缓存和三层架构的关系：Controller 不碰 Redis，Repository 不碰 Redis，Service 负责缓存和数据库之间的编排。",
    keyPoints: ["CommentController", "CommentService", "CommentCache", "CommentRepository", "CommentList VO", "TTL"],
    interviewTips: ["可以强调：列表缓存 Key 要包含分页参数，防止不同页互相覆盖。"],
    codeRefs: ["backend/internal/controller/comment_controller.go", "backend/internal/service/comment_service.go", "backend/internal/cache/comment_cache.go", "backend/internal/repository/comment_repository.go"]
  }
];
