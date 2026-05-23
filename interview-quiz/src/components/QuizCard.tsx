import type { AnswerRecord, Question } from "../types";

type Props = {
  question: Question;
  answer: AnswerRecord;
  onSelect: (questionId: string, optionId: string) => void;
  onDraft: (questionId: string, draft: string) => void;
  onCheck: (questionId: string) => void;
  onReset: (questionId: string) => void;
};

export function QuizCard({ question, answer, onSelect, onDraft, onCheck, onReset }: Props) {
  const isWritten = question.type === "short" || question.type === "code";
  const canSubmit = isWritten ? answer.draft.trim().length > 0 : answer.selected.length > 0;

  return (
    <article className="quiz-card">
      <div className="question-meta">
        <span>{question.type === "single" ? "单选题" : question.type === "multiple" ? "多选题" : question.type === "code" ? "代码理解" : "简答题"}</span>
        <span>{question.id}</span>
      </div>

      <h2>{question.title}</h2>
      <p className="prompt">{question.prompt}</p>

      {question.choices && (
        <div className="choice-list">
          {question.choices.map((choice) => {
            const selected = answer.selected.includes(choice.id);
            const correct = question.correctAnswers?.includes(choice.id);
            const showState = answer.checked;
            return (
              <button
                key={choice.id}
                className={`choice ${selected ? "selected" : ""} ${showState && correct ? "correct" : ""} ${showState && selected && !correct ? "wrong" : ""}`}
                onClick={() => onSelect(question.id, choice.id)}
                disabled={answer.checked}
              >
                <span className="choice-id">{choice.id}</span>
                <span>{choice.text}</span>
              </button>
            );
          })}
        </div>
      )}

      {isWritten && (
        <textarea
          className="answer-input"
          value={answer.draft}
          onChange={(event) => onDraft(question.id, event.target.value)}
          placeholder="先写下你的回答，再看参考答案。面试表达是练出来的。"
        />
      )}

      <div className="card-actions">
        <button className="primary-action" disabled={!canSubmit} onClick={() => onCheck(question.id)}>
          {answer.checked ? "再次查看解析" : isWritten ? "查看参考答案" : "提交答案"}
        </button>
        <button className="ghost-action" onClick={() => onReset(question.id)}>
          重做本题
        </button>
      </div>

      {answer.checked && (
        <div className={`result-banner ${answer.correct ? "pass" : "review"}`}>
          <strong>{answer.correct ? "回答正确" : isWritten ? "参考答案已展开" : "还差一点"}</strong>
          <span>
            {isWritten
              ? "对照关键词检查自己的表达是否完整。"
              : `正确答案：${question.correctAnswers?.join("、")}`}
          </span>
        </div>
      )}
    </article>
  );
}
