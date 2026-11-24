/**
 * 宿主（v8 外壳）与移植工作台之间的桥。
 * 工作台只挂载一次；宿主切换一级页面时只切换可见性，因此会话状态、草稿和计时不会丢失。
 */
export type WorkbenchStatus = { confirm: number; running: number };
type Handlers = {
  openHome: () => void;
  openSearch: () => void;
  /** 由宿主（分身、事项、消息、笔记）发起的复杂事项：在工作台新建会话并打开，返回会话 ID。 */
  createSession: (text: string, title?: string) => string;
  openSession: (id: string) => void;
  /** v9 案例：在工作台开组织事项节点对应的会话。 */
  startTwin: (step: string, ctx: { matterId: string; matterTitle: string; items: string[] }) => string;
  /** v9 案例：切换演示身份（陈思远 / 方振宇）。 */
  setUser: (key: string) => void;
};

const listeners = new Set<(s: WorkbenchStatus) => void>();
let handlers: Partial<Handlers> = {};
let status: WorkbenchStatus = { confirm: 0, running: 0 };
let active = false;
let resetCb: (() => void) | undefined;

export const SCOPE_ID = 'sa-workbench';
export const PORTAL_ID = 'sa-portal';
/** 全局「设置」页里承载工作台个人设置的容器（宿主提供）。 */
export const SETTINGS_ID = 'sa-settings';

export function scopeElements(): HTMLElement[] {
  if (typeof document === 'undefined') return [];
  return [SCOPE_ID, PORTAL_ID, SETTINGS_ID]
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => Boolean(el));
}
export function portalContainer(): HTMLElement | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.getElementById(PORTAL_ID) ?? undefined;
}
export const isWorkbenchActive = () => active;
export function registerHandlers(next: Partial<Handlers>) {
  handlers = next;
  return () => {
    if (handlers === next) handlers = {};
  };
}
export function emitStatus(next: WorkbenchStatus) {
  if (next.confirm === status.confirm && next.running === status.running) return;
  status = next;
  listeners.forEach((cb) => cb(status));
}
export function onReset(cb: () => void) {
  resetCb = cb;
}
/** 只重置工作台样例，不刷新整个宿主页面。 */
export function resetWorkbench() {
  resetCb?.();
}

function setActive(next: boolean) {
  active = next;
  for (const id of [SCOPE_ID, PORTAL_ID]) {
    const el = document.getElementById(id);
    if (el) el.hidden = !next && !(id === PORTAL_ID && settingsVisible);
  }
}

/* ---------- 全局设置：工作台个人设置以 portal 渲染进宿主「设置」页 ---------- */
let settingsVisible = false;
const settingsListeners = new Set<() => void>();
export const isSettingsVisible = () => settingsVisible;
export function subscribeSettings(cb: () => void) {
  settingsListeners.add(cb);
  return () => settingsListeners.delete(cb);
}
function setSettings(next: boolean) {
  settingsVisible = next;
  const el = document.getElementById(SETTINGS_ID);
  if (el) el.hidden = !next;
  const portal = document.getElementById(PORTAL_ID);
  if (portal) portal.hidden = !next && !active;
  settingsListeners.forEach((cb) => cb());
}

/* ---------- 轻应用：用户在工作台里做出来、只属于自己的应用 ---------- */
export type LightApp = {
  id: string;
  name: string;
  summary: string;
  connector: string;
  builtFrom: string;
  version: string;
  updatedAt: string;
  enabled: boolean;
};
let apps: LightApp[] = [
  {
    id: 'app-key-docs',
    name: '关键公文提醒',
    summary:
      '按你的规则盯住 OA 里的关键公文：特急、加急件，领导批示件，以及 3 个工作日内到期的来文，集中提醒并标出剩余时限。',
    connector: 'OA办公系统连接器 · 只读 · 按本人权限读取公文收文、批示和办理时限',
    builtFrom: '工作台会话「做一个关键公文提醒小工具」 · 3 轮修改',
    version: 'v3',
    updatedAt: '11-21 17:40',
    enabled: false,
  },
];
const appListeners = new Set<() => void>();
export const lightApps = () => apps;
export function subscribeApps(cb: () => void) {
  appListeners.add(cb);
  return () => appListeners.delete(cb);
}
export function setAppEnabled(id: string, enabled: boolean) {
  apps = apps.map((a) => (a.id === id ? { ...a, enabled } : a));
  appListeners.forEach((cb) => cb());
}
/** 打开轻应用：应用界面由宿主渲染（首页和工作台共用同一个窗口）。 */
export function openApp(id: string) {
  window.dispatchEvent(new CustomEvent('sa-open-app', { detail: id }));
}

export const hostApi = {
  show: () => setActive(true),
  hide: () => setActive(false),
  isActive: () => active,
  openHome: () => handlers.openHome?.(),
  openSearch: () => handlers.openSearch?.(),
  reset: () => resetWorkbench(),
  createSession: (text: string, title?: string) =>
    handlers.createSession?.(text, title) ?? '',
  openSession: (id: string) => handlers.openSession?.(id),
  startTwin: (
    step: string,
    ctx: { matterId: string; matterTitle: string; items: string[] },
  ) => handlers.startTwin?.(step, ctx) ?? '',
  setUser: (key: string) => handlers.setUser?.(key),
  showSettings: () => setSettings(true),
  hideSettings: () => setSettings(false),
  apps: () => apps,
  setAppEnabled,
  subscribeApps(cb: (a: LightApp[]) => void) {
    const fn = () => cb(apps);
    appListeners.add(fn);
    fn();
    return () => appListeners.delete(fn);
  },
  status: () => status,
  subscribe(cb: (s: WorkbenchStatus) => void) {
    listeners.add(cb);
    cb(status);
    return () => listeners.delete(cb);
  },
};
declare global {
  interface Window {
    SAWorkbench?: typeof hostApi;
  }
}
