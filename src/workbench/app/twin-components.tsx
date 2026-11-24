'use client';
import { useSyncExternalStore } from 'react';
import { useWorkspace } from './workspace-store';
import {
  TWIN_STEPS,
  askSubmit,
  cancelSubmit,
  confirmTwin,
  submitTwin,
  subscribeTwin,
  toggleKept,
  twinState,
} from './twin-case';
import './twin.css';

const tone: Record<string, string> = {
  通过: 'twin-ok',
  需修改: 'twin-warn',
  补正: 'twin-warn',
  提示: 'twin-info',
};

/** v9 案例：预审结论逐条确认 → 生成成果 → 本人确认提交到组织事项。挂在会话最后一条消息下。 */
export function TwinAttachment({
  taskId,
  messageId,
}: {
  taskId: string;
  messageId: string;
}) {
  const { state, dispatch } = useWorkspace();
  const twin = useSyncExternalStore(subscribeTwin, twinState, twinState);
  const run = twin.runs[taskId];
  const task = state.memory.tasks.find((t) => t.id === taskId);
  if (!run || run.phase === 'running' || task?.messages.at(-1)?.id !== messageId)
    return null;
  const d = TWIN_STEPS[run.step];
  const goHost = (target: string) =>
    window.dispatchEvent(new CustomEvent('sa-go', { detail: target }));
  return (
    <div className="twin-card" aria-label="预审结论与提交">
      <div className="twin-card-head">
        <b>
          组织事项 · {d.node} {d.nodeTitle}
        </b>
        <small>{run.matterTitle}</small>
      </div>
      {run.phase === 'review' && (
        <>
          <ul className="twin-findings">
            {d.findings.map((f, i) => (
              <li key={f.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={run.kept.includes(f.id)}
                    onChange={() => toggleKept(taskId, f.id)}
                  />
                  <span className={`twin-level ${tone[f.level]}`}>{f.level}</span>
                  <span className="twin-text">
                    {i + 1}. {f.text}
                  </span>
                </label>
                {f.basis && (
                  <button
                    className="twin-basis"
                    onClick={() => goHost('file:' + f.basis!.file)}
                    title="在资料库打开依据"
                  >
                    依据：{f.basis.label} ↗
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="party-actions">
            <button
              className="party-button primary"
              onClick={() => confirmTwin(taskId, dispatch)}
            >
              确认预审结论，生成成果（{run.kept.length}/{d.findings.length}）
            </button>
          </div>
        </>
      )}
      {run.phase === 'confirmed' && (
        <div className="party-actions">
          <button
            className="party-button primary"
            onClick={() => askSubmit(taskId)}
          >
            提交到组织事项 · {d.node}
          </button>
          <span className="twin-muted">提交前请先预览本轮成果。</span>
        </div>
      )}
      {run.phase === 'confirming' && (
        <div className="twin-confirm" role="alert">
          <p>
            将以你本人的身份，把 {d.outputs.length} 份成果提交到「{d.node}{' '}
            {d.nodeTitle}」。提交后组织事项的全部成员都能看到；参与方的提交由发起人采纳或退回。确认提交？
          </p>
          <div className="party-actions">
            <button
              className="party-button primary"
              onClick={() => submitTwin(taskId, dispatch)}
            >
              确认提交
            </button>
            <button className="party-button" onClick={() => cancelSubmit(taskId)}>
              暂不提交
            </button>
          </div>
        </div>
      )}
      {run.phase === 'submitted' && (
        <div className="party-actions">
          <span className="twin-done">✓ 已提交（{run.submittedAt}）</span>
          <button
            className="party-button"
            onClick={() => goHost('task:' + run.matterId)}
          >
            回到组织事项查看
          </button>
        </div>
      )}
    </div>
  );
}
