'use client';
import { useContext, useEffect, useReducer, type ReactNode } from 'react';
import { initialWorkspace, workspaceReducer } from './fiscal-domain';
import { PARTY_PROJECT } from './party-domain';
import { retiredHistoryIds } from './story-history';
import { WorkspaceContext as Context } from './workspace-context';
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workspaceReducer, undefined, () =>
    initialWorkspace(),
  );
  useEffect(() => {
    if (state.memory.tasks.some((t) => retiredHistoryIds.includes(t.id))) {
      dispatch({ type: 'remove-duplicate-history' });
    }
    // Group conversations already open when this update is loaded, without resetting work.
    for (const task of state.memory.tasks) {
      if (
        (task.id === 'party-history' || state.party[task.id]) &&
        !state.folderTasks[task.id]
      ) {
        dispatch({ type: 'folder', name: PARTY_PROJECT, taskId: task.id });
      }
    }
  }, [state.memory.tasks, state.party, state.folderTasks]);
  // v9：样例授权在源中固定为 2026-09-08 起 30 天，而会话时钟取真实时间；
  // 过期后自动化新运行和动态流程会因“源系统连接及授权有效”失败。加载时顺延样例授权有效期，
  // 不改变授权的启用、读写和身份校验规则。
  useEffect(() => {
    const until = Date.now() + 30 * 86400000;
    for (const [system, auth] of Object.entries(state.auth))
      if (auth.expires < until)
        dispatch({
          type: 'auth',
          system: system as keyof typeof state.auth,
          patch: { expires: until },
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible')
        dispatch({ type: 'tick', now: Date.now() });
    };
    const timer = setInterval(tick, 30000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  useEffect(() => {
    const timers = Object.values(state.party)
      .filter(
        (flow) =>
          !flow.stopped &&
          ['collecting', 'sending', 'minutes-sending'].includes(flow.stage),
      )
      .map((flow) =>
        setTimeout(
          () =>
            dispatch({
              type: 'party',
              action: {
                type:
                  flow.stage === 'collecting'
                    ? 'collect-finish'
                    : flow.stage === 'minutes-sending'
                      ? 'minutes-finish'
                      : 'send-finish',
                taskId: flow.id,
                revision: flow.revision,
              },
            }),
          850,
        ),
      );
    return () => timers.forEach(clearTimeout);
  }, [state.party]);
  return (
    <Context.Provider value={{ state, dispatch }}>{children}</Context.Provider>
  );
}
export function useWorkspace() {
  const s = useContext(Context);
  if (!s) throw Error('WorkspaceProvider required');
  return s;
}
