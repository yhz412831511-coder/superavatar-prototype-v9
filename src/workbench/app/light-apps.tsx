'use client';
import { useSyncExternalStore } from 'react';
import { AppWindow, BellRing, Plug, Plus, Power, Sparkles } from 'lucide-react';
import {
  lightApps,
  openApp,
  setAppEnabled,
  subscribeApps,
} from './host-bridge';

/**
 * v9 轻应用：用户在工作台里通过对话（vibe coding）做出来、只属于自己的应用。
 * 应用状态保存在宿主桥里，启用后贾维斯首页会出现入口；应用界面由宿主统一渲染。
 */
export function LightAppsPage({
  onNew,
  onConnector,
}: {
  onNew: () => void;
  onConnector: () => void;
}) {
  const apps = useSyncExternalStore(subscribeApps, lightApps, lightApps);
  return (
    <section className="la-page" aria-label="轻应用">
      <header className="la-head">
        <div>
          <h1>轻应用</h1>
          <p>
            你在工作台里和贾维斯一起做出来的专属应用：把常办的事做成带界面的小工具，只属于你自己。启动后会出现在贾维斯首页，随时点开使用。
          </p>
        </div>
        <button className="la-btn" onClick={onNew}>
          <Plus size={15} />
          做一个新应用
        </button>
      </header>
      <div className="la-list">
        {apps.map((app) => (
          <article className="la-card" key={app.id}>
            <div className="la-card-top">
              <span className="la-icon">
                <BellRing size={20} />
              </span>
              <div className="la-title">
                <strong>{app.name}</strong>
                <small>
                  {app.version} · 更新于 {app.updatedAt}
                </small>
                <span className="la-connector">
                  <Plug size={12} />
                  基于 OA办公系统连接器构建 · 已连接 · 只读
                </span>
              </div>
              <span className={`la-state ${app.enabled ? 'on' : ''}`}>
                {app.enabled ? '已启动 · 首页可用' : '未启动'}
              </span>
            </div>
            <p className="la-summary">{app.summary}</p>
            <dl className="la-meta">
              <dt>
                <Plug size={13} />
                数据来源
              </dt>
              <dd>
                {app.connector}
                <button className="la-link" onClick={onConnector}>
                  查看连接器
                </button>
              </dd>
              <dt>
                <Sparkles size={13} />
                做出来自
              </dt>
              <dd>{app.builtFrom}</dd>
              <dt>
                <AppWindow size={13} />
                可见范围
              </dt>
              <dd>仅本人。提供给组织里其他人使用需经组织审核（后续）。</dd>
            </dl>
            <footer className="la-actions">
              <button className="la-btn ghost" onClick={() => openApp(app.id)}>
                打开
              </button>
              {app.enabled ? (
                <button
                  className="la-btn ghost"
                  onClick={() => setAppEnabled(app.id, false)}
                >
                  <Power size={14} />
                  停用
                </button>
              ) : (
                <button
                  className="la-btn primary"
                  onClick={() => setAppEnabled(app.id, true)}
                >
                  <Power size={14} />
                  启动
                </button>
              )}
              <small>
                {app.enabled
                  ? '已在贾维斯首页「我的轻应用」中展示。'
                  : '启动后会出现在贾维斯首页「我的轻应用」中。'}
              </small>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}
