import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { LearningPanel } from "./components/LearningPanel";
import { ModuleNav } from "./components/ModuleNav";
import { ProgressScene } from "./components/ProgressScene";
import { ProgressSummary } from "./components/ProgressSummary";
import { QuizCard } from "./components/QuizCard";
import { modules, questions } from "./data/questions";
import type { AnswerRecord, Question, StoredProgress } from "./types";

const STORAGE_KEY = "feedlab-interview-progress-v1";

function emptyAnswer(): AnswerRecord {
  return { selected: [], draft: "", checked: false, correct: false };
}

function loadProgress(): StoredProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredProgress) : {};
  } catch {
    return {};
  }
}

function isChoiceCorrect(question: Question, selected: string[]): boolean {
  const expected = [...(question.correctAnswers ?? [])].sort();
  const actual = [...selected].sort();
  return expected.length === actual.length && expected.every((value, index) => value === actual[index]);
}

export default function App() {
  const fallbackModule = modules[0]!;
  const [activeModuleId, setActiveModuleId] = useState(fallbackModule.id);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [progress, setProgress] = useState<StoredProgress>(() => loadProgress());

  const activeModule = modules.find((module) => module.id === activeModuleId) ?? fallbackModule;
  const moduleQuestions = useMemo(
    () => questions.filter((question) => question.moduleId === activeModuleId),
    [activeModuleId]
  );
  const activeQuestion = (moduleQuestions[activeQuestionIndex] ?? moduleQuestions[0])!;
  const answer = progress[activeQuestion.id] ?? emptyAnswer();

  const total = moduleQuestions.length;
  const answered = moduleQuestions.filter((question) => progress[question.id]?.checked).length;
  const correct = moduleQuestions.filter((question) => progress[question.id]?.correct).length;
  const progressRatio = total === 0 ? 0 : answered / total;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  function switchModule(moduleId: string) {
    setActiveModuleId(moduleId);
    setActiveQuestionIndex(0);
  }

  function updateAnswer(questionId: string, next: Partial<AnswerRecord>) {
    setProgress((current) => ({
      ...current,
      [questionId]: {
        ...emptyAnswer(),
        ...current[questionId],
        ...next
      }
    }));
  }

  function handleSelect(questionId: string, optionId: string) {
    const question = questions.find((item) => item.id === questionId);
    if (!question) {
      return;
    }
    const current = progress[questionId] ?? emptyAnswer();
    if (question.type === "single") {
      updateAnswer(questionId, { selected: [optionId], checked: false, correct: false });
      return;
    }
    const selected = current.selected.includes(optionId)
      ? current.selected.filter((item) => item !== optionId)
      : [...current.selected, optionId];
    updateAnswer(questionId, { selected, checked: false, correct: false });
  }

  function handleCheck(questionId: string) {
    const question = questions.find((item) => item.id === questionId);
    if (!question) {
      return;
    }
    const current = progress[questionId] ?? emptyAnswer();
    const written = question.type === "short" || question.type === "code";
    updateAnswer(questionId, {
      checked: true,
      correct: written ? current.draft.trim().length > 0 : isChoiceCorrect(question, current.selected)
    });
  }

  function handleReset(questionId: string) {
    setProgress((current) => {
      const next = { ...current };
      delete next[questionId];
      return next;
    });
  }

  return (
    <main className="app-shell">
      <section className="hero-band">
        <div>
          <span className="eyebrow">FeedLab Interview Lab</span>
          <h1>把代码讲成面试答案</h1>
          <p>
            每个模块都配套题目、答案和原理解释。先答，再看解析；不是背八股，是把你写过的代码讲明白。
          </p>
        </div>
        <ProgressScene progressRatio={progressRatio} accent={activeModule.accent} />
      </section>

      <section className="workspace-grid">
        <ModuleNav
          modules={modules}
          questions={questions}
          activeModuleId={activeModuleId}
          progress={progress}
          onSelect={switchModule}
        />

        <section className="quiz-column">
          <div className="module-overview" style={{ "--accent": activeModule.accent } as CSSProperties}>
            <div>
              <span className="eyebrow">{activeModule.subtitle}</span>
              <h2>{activeModule.title}</h2>
              <p>{activeModule.summary}</p>
            </div>
            <ProgressSummary answered={answered} total={total} correct={correct} />
          </div>

          <div className="question-switcher">
            {moduleQuestions.map((question, index) => {
              const done = progress[question.id]?.checked;
              const selected = index === activeQuestionIndex;
              return (
                <button
                  key={question.id}
                  className={`${selected ? "selected" : ""} ${done ? "done" : ""}`}
                  onClick={() => setActiveQuestionIndex(index)}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>

          <QuizCard
            question={activeQuestion}
            answer={answer}
            onSelect={handleSelect}
            onDraft={(questionId, draft) => updateAnswer(questionId, { draft, checked: false, correct: false })}
            onCheck={handleCheck}
            onReset={handleReset}
          />
        </section>

        <LearningPanel question={activeQuestion} answer={answer} />
      </section>
    </main>
  );
}
