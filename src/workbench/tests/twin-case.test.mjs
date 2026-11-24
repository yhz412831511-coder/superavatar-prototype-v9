// v9 案例：数字孪生运营项目 · 组织事项节点会话（第 1–7 步）的脚本与演示身份。
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TWIN_STEPS,
  setPersona,
  visibleToPersona,
  invitePref,
  setInvitePref,
  toggleKept,
  keptFindings,
  twinState,
} from '../app/twin-case.ts';
import { currentUser } from '../app/current-user.ts';

globalThis.window ??= { dispatchEvent() {} };
globalThis.CustomEvent ??= class { constructor(type, init) { this.type = type; this.detail = init?.detail; } };

test('每个节点会话都由对应身份办理，先调处室技能预审，再由本人确认', () => {
  const owners = Object.fromEntries(Object.values(TWIN_STEPS).map((s) => [s.node, s.owner]));
  assert.deepEqual(owners, { N1: 'csy', N2: 'fzy', N3: 'csy', N5: 'csy', N7: 'csy', N8: 'fzy' });
  for (const s of Object.values(TWIN_STEPS)) {
    assert.ok(s.skills.length >= 2, `${s.node} 至少调用两个处室技能`);
    assert.ok(s.skills.every((k) => /处|局办公室/.test(k.dept)), `${s.node} 技能标明提供方处室`);
    assert.ok(s.findings.length && s.outputs.length);
    assert.doesNotMatch(s.title + s.request, /任务|待办/);
  }
});

test('形式审查的补正通知只写入本人认可的补正项', () => {
  const s2 = TWIN_STEPS.s2;
  const all = s2.findings;
  const notice = s2.outputs.find((o) => o.name === '补正通知').body(all.filter((f) => f.id !== 'd'));
  assert.match(notice, /编目申请受理回执/);
  assert.doesNotMatch(notice, /适配证明/);
  assert.match(s2.submitNote(all), /需补正 3 项/);
});

test('第 7 步：不采纳的回复必须附理由，并标出依据', () => {
  const q6 = TWIN_STEPS.s7.findings.find((f) => f.id === 'q6');
  assert.match(q6.text, /不采纳。理由：/);
  assert.equal(q6.basis.file, 'o-zjlz');
});

test('切换演示身份：工作台当前用户和可见会话随之切换，邀请偏好按身份保存', () => {
  setPersona('fzy');
  assert.equal(currentUser.name, '方振宇');
  assert.equal(currentUser.department, '项目统筹处');
  assert.equal(visibleToPersona('party-history'), false, '原有会话属于陈思远');
  setInvitePref('accept');
  assert.equal(invitePref(), 'accept');
  setPersona('csy');
  assert.equal(currentUser.department, '应用推进处');
  assert.equal(visibleToPersona('party-history'), true);
  assert.equal(invitePref(), 'direct');
});

test('取消勾选的预审结论不进入成果；没有会话时不报错', () => {
  toggleKept('none', 'a');
  assert.equal(twinState().runs.none, undefined);
  const fake = { step: 's1', kept: ['a', 'f'] };
  assert.deepEqual(keptFindings(fake).map((f) => f.id), ['a', 'f']);
});
