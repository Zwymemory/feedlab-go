import type { AnswerRecord, Question } from "../types";

type Props = {
  question: Question;
  answer: AnswerRecord;
};

export function LearningPanel({ question, answer }: Props) {
  return (
    <aside className="learning-panel">
      <div className="panel-section">
        <span className="eyebrow">Answer</span>
        <h3>答案与解析</h3>
        {!answer.checked ? (
          <p className="muted">提交答案后，这里会显示正确答案、原因原理和面试表达建议。</p>
        ) : (
          <>
            {question.correctAnswers && (
              <p className="answer-line">
                <strong>正确答案：</strong>
                {question.correctAnswers.join("、")}
              </p>
            )}
            <p>{question.referenceAnswer}</p>
            <p className="explanation">{question.explanation}</p>
          </>
        )}
      </div>

      {answer.checked && question.whyOthersWrong && (
        <div className="panel-section">
          <span className="eyebrow">Options</span>
          <h3>其他选项为什么不对</h3>
          <ul className="compact-list">
            {Object.entries(question.whyOthersWrong).map(([option, reason]) => (
              <li key={option}>
                <strong>{option}：</strong>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {answer.checked && (
        <>
          <div className="panel-section">
            <span className="eyebrow">Key points</span>
            <h3>答题关键词</h3>
            <div className="tag-list">
              {question.keyPoints.map((point) => (
                <span key={point}>{point}</span>
              ))}
            </div>
          </div>

          <div className="panel-section">
            <span className="eyebrow">Interview</span>
            <h3>面试表达模板</h3>
            <ul className="compact-list">
              {question.interviewTips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        </>
      )}

      {question.codeRefs && (
        <div className="panel-section">
          <span className="eyebrow">Code refs</span>
          <h3>关联代码</h3>
          <ul className="code-list">
            {question.codeRefs.map((ref) => (
              <li key={ref}>{ref}</li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
