import type { CSSProperties } from "react";
import type { QuizModule, StoredProgress, Question } from "../types";

type Props = {
  modules: QuizModule[];
  questions: Question[];
  activeModuleId: string;
  progress: StoredProgress;
  onSelect: (moduleId: string) => void;
};

export function ModuleNav({ modules, questions, activeModuleId, progress, onSelect }: Props) {
  return (
    <nav className="module-nav" aria-label="题目模块">
      <div className="nav-title">
        <span>Modules</span>
        <strong>FeedLab 面试路线</strong>
      </div>
      {modules.map((module) => {
        const moduleQuestions = questions.filter((question) => question.moduleId === module.id);
        const answered = moduleQuestions.filter((question) => progress[question.id]?.checked).length;
        const ratio = moduleQuestions.length === 0 ? 0 : Math.round((answered / moduleQuestions.length) * 100);
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
              <span>{answered}/{moduleQuestions.length}</span>
              <span>{ratio}%</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
