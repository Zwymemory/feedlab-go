import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { QuizModule, StoredProgress, Question } from "../types";

type Props = {
  modules: QuizModule[];
  questions: Question[];
  activeModuleId: string;
  progress: StoredProgress;
  onSelect: (moduleId: string) => void;
};

type ModuleGroup = {
  id: string;
  title: string;
  description: string;
  modules: QuizModule[];
};

function groupIdForModule(module: QuizModule): string {
  if (module.id.startsWith("module-v3")) {
    return "v3";
  }
  if (module.id.startsWith("module-v2")) {
    return "v2";
  }
  return "v1";
}

function groupModules(modules: QuizModule[]): ModuleGroup[] {
  const groups: ModuleGroup[] = [
    { id: "v1", title: "V1 基础闭环", description: "配置、认证、帖子、Swagger", modules: [] },
    { id: "v2", title: "V2 互动系统", description: "点赞、评论、收藏、关注", modules: [] },
    { id: "v3", title: "V3 Redis 与 Feed", description: "缓存、排行、限流、观测", modules: [] }
  ];
  for (const module of modules) {
    const group = groups.find((item) => item.id === groupIdForModule(module));
    group?.modules.push(module);
  }
  return groups.filter((group) => group.modules.length > 0);
}

export function ModuleNav({ modules, questions, activeModuleId, progress, onSelect }: Props) {
  const groups = useMemo(() => groupModules(modules), [modules]);
  const activeGroupId = groupIdForModule(modules.find((module) => module.id === activeModuleId) ?? modules[0]!);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => ({ [activeGroupId]: true }));

  useEffect(() => {
    setOpenGroups((current) => ({ ...current, [activeGroupId]: true }));
  }, [activeGroupId]);

  function toggleGroup(groupId: string) {
    setOpenGroups((current) => ({ ...current, [groupId]: !current[groupId] }));
  }

  return (
    <nav className="module-nav" aria-label="题目模块">
      <div className="nav-title">
        <span>Modules</span>
        <strong>FeedLab 面试路线</strong>
      </div>
      {groups.map((group) => {
        const groupQuestions = questions.filter((question) =>
          group.modules.some((module) => module.id === question.moduleId)
        );
        const answered = groupQuestions.filter((question) => progress[question.id]?.checked).length;
        const ratio = groupQuestions.length === 0 ? 0 : Math.round((answered / groupQuestions.length) * 100);
        const open = openGroups[group.id] ?? false;

        return (
          <section className="module-group" key={group.id}>
            <button className="module-group-toggle" onClick={() => toggleGroup(group.id)} aria-expanded={open}>
              <span>
                <strong>{group.title}</strong>
                <small>{group.description}</small>
              </span>
              <span className="module-group-meta">
                {answered}/{groupQuestions.length}
                <span>{ratio}%</span>
              </span>
              <span className="module-group-icon" aria-hidden="true">
                {open ? "-" : "+"}
              </span>
            </button>

            {open && (
              <div className="module-group-list">
                {group.modules.map((module) => {
                  const moduleQuestions = questions.filter((question) => question.moduleId === module.id);
                  const moduleAnswered = moduleQuestions.filter((question) => progress[question.id]?.checked).length;
                  const moduleRatio =
                    moduleQuestions.length === 0 ? 0 : Math.round((moduleAnswered / moduleQuestions.length) * 100);
                  const active = module.id === activeModuleId;

                  return (
                    <button
                      className={`module-button ${active ? "active" : ""}`}
                      key={module.id}
                      onClick={() => onSelect(module.id)}
                      style={{ "--accent": module.accent } as CSSProperties}
                    >
                      <span className="module-kicker">{module.subtitle}</span>
                      <span className="module-name">{module.title}</span>
                      <span className="module-progress">
                        <span>{moduleAnswered}/{moduleQuestions.length}</span>
                        <span>{moduleRatio}%</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </nav>
  );
}
