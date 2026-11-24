/**
 * 把工作台样式限定在 .sa-scope 内，避免 Tailwind 基础样式和源站全局规则影响宿主。
 *   :root / html / :host（含属性）→ .sa-scope（属性移到作用域节点上）
 *   body、html[...] body → .sa-scope
 *   body:has(...)（源站其他产品的规则）→ 删除
 *   其余选择器 → .sa-scope <选择器>
 */
const SCOPE = '.sa-scope';
function transform(sel) {
  sel = sel.trim();
  if (!sel) return [];
  if (sel.startsWith(SCOPE)) return [sel];
  if (/^body:has\(/.test(sel)) return [];
  let m = sel.match(/^(html|:root|:host)((?:\[[^\]]+\])*)(.*)$/s);
  if (m) {
    let rest = m[3];
    if (/^:(not|where|is)\(/.test(rest)) return [`${SCOPE}${m[2]}${rest}`];
    rest = rest.replace(/^\s+body\b/, '');
    return [`${SCOPE}${m[2]}${rest}`];
  }
  m = sel.match(/^body\b(.*)$/s);
  if (m) return [`${SCOPE}${m[1]}`];
  return [`${SCOPE} ${sel}`];
}
export default function scope(opts = {}) {
  const include = opts.include || (() => true);
  return {
    postcssPlugin: 'sa-scope',
    OnceExit(root) {
      const file = root.source?.input?.file || '';
      if (!include(file)) return;
      root.walkRules((rule) => {
        for (let p = rule.parent; p; p = p.parent)
          if (p.type === 'atrule' && /keyframes$/i.test(p.name)) return;
        const next = [...new Set(rule.selectors.flatMap(transform))];
        if (!next.length) rule.remove();
        else rule.selectors = next;
      });
    },
  };
}
scope.postcss = true;
