type Props = {
  answered: number;
  total: number;
  correct: number;
};

export function ProgressSummary({ answered, total, correct }: Props) {
  const completion = total === 0 ? 0 : Math.round((answered / total) * 100);
  const accuracy = answered === 0 ? 0 : Math.round((correct / answered) * 100);

  return (
    <section className="progress-summary">
      <div>
        <span>{completion}%</span>
        <small>完成度</small>
      </div>
      <div>
        <span>{accuracy}%</span>
        <small>正确率</small>
      </div>
      <div>
        <span>{answered}/{total}</span>
        <small>已答题</small>
      </div>
    </section>
  );
}
