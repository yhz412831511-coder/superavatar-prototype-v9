import type { Dispatch } from 'react';
import type { WorkspaceAction } from './fiscal-domain';

/**
 * v9：宿主（分身、事项、消息、笔记、轻应用）交来的复杂事项，在工作台里按通用过程执行：
 * 列计划 → 检索依据 → 起草 → 自查 → 交付成果。内容为合成演示，不连接真实业务系统。
 */
type Kind = 'doc' | 'plan' | 'report' | 'minutes' | 'follow' | 'weekly' | 'general';

const kindOf = (t: string): Kind =>
  /纪要|会议|评估会|语音/.test(t)
    ? 'minutes'
    : /周报/.test(t)
      ? 'weekly'
      : /公文|通知|报送|申报|督办/.test(t)
        ? 'doc'
        : /方案/.test(t)
          ? 'plan'
          : /汇报|例会|PPT|演示/.test(t)
            ? 'report'
            : /消息|跟进|回复|聊天/.test(t)
              ? 'follow'
              : 'general';

const subjectOf = (t: string) =>
  t
    .replace(/^(帮我办这份公文|把这件事办了|根据这条笔记办|根据选中的消息|帮我|请)[:：]?/, '')
    .split(/[，。,（(\n]/)[0]
    .trim()
    .slice(0, 22) || '本次事项';

const sourcesOf = (t: string) => {
  const list: string[] = [];
  if (/^会议 /.test(t)) list.push('《局党组会议议事规则》');
  if (/公文|通知|报送|材料/.test(t)) list.push('《机关公文处理实施细则（2025年修订）》');
  if (/信息化|项目|平台|申报/.test(t)) list.push('《广东省数字政府建设总体规划（2023—2027年）》');
  if (/数据|安全|等保/.test(t)) list.push('《政务数据分类分级指南》');
  if (/党组|纪要/.test(t) && !list.includes('《局党组会议议事规则》')) list.push('《局党组会议议事规则》');
  if (!list.length) list.push('《机关公文处理实施细则（2025年修订）》');
  return list.slice(0, 2);
};

function deliverable(kind: Kind, subject: string, text: string) {
  const pending = '待核';
  switch (kind) {
    case 'doc':
      return {
        name: `${subject} · 报送材料（工作稿）`,
        body: `# ${subject} · 报送材料（工作稿）\n\n## 一、来文要求\n- 来文：${subject}\n- 报送内容：项目名称、建设内容、资金需求、绩效目标\n- 报送方式：经处室负责人审核后由办公室统一报送\n\n## 二、拟报送内容\n| 序号 | 项目名称 | 建设内容 | 资金需求（万元） | 状态 |\n| --- | --- | --- | --- | --- |\n| 1 | 城市运行一网统管平台二期 | 接入十个区事件中心、态势感知 | 1560 | ${pending}（以评估报告为准） |\n| 2 | 政务大模型知识库 | 政策法规与办事口径知识库 | 680 | ${pending}（须补充四项内容） |\n\n## 三、需要你确认\n1. 金额以评估机构正式报告为准，报送前请核对。\n2. 报送前须经处室负责人审核；外发由你本人操作。`,
      };
    case 'plan':
      return {
        name: `${subject} · 方案（工作稿）`,
        body: `# ${subject} · 方案（工作稿）\n\n## 一、背景与目标\n围绕「${subject}」，明确目标、范围和完成标准。\n\n## 二、主要内容\n1. 现状与问题\n2. 实施步骤与时间安排\n3. 风险与应对（含回退方案）\n\n## 三、分工\n| 事项 | 责任人 | 期限 |\n| --- | --- | --- |\n| 方案定稿 | 陈思远 | ${pending} |\n| 测试结论 | 刘洋 | ${pending} |\n\n## 四、待核事项\n- 测试报告结论尚未出具，相关表述保留待核。`,
      };
    case 'report':
      return {
        name: `${subject} · 汇报提纲`,
        body: `# ${subject} · 汇报提纲\n\n1. 总体进展（一句话结论）\n2. 本周完成事项\n3. 存在问题与需要协调的事项\n4. 下周计划\n5. 需要领导决策的事项\n\n> 进度数字以项目组最新回复为准，未确认的数字已标为待核。`,
      };
    case 'minutes':
      return {
        name: `${subject} · 会议纪要（整理稿）`,
        body: `# ${subject} · 会议纪要（整理稿）\n\n**依据：** 本人提供的语音转写记录，未经与会人员确认。\n\n## 一、会议议定事项\n1. 城市运行一网统管平台二期：原则同意申报，硬件改为云资源租用，申报金额调整至约 1560 万元（以评估机构正式报告为准）；接口先按已确认的六个区列报。\n2. 政务大模型知识库：原则同意，建设方案补充人工复核、全量日志、停用机制和语料授权分级四项内容后再上会。\n\n## 二、会后跟进\n| 事项 | 责任人 | 期限 |\n| --- | --- | --- |\n| 修改两个项目的申报材料 | 王建国（陈思远协助） | 12 月 5 日 |\n| 催齐四个区的数据目录确认 | 刘振华 | 11 月 30 日 |\n| 提供等保测评费测算依据 | 冯涛 | ${pending} |\n| 出具正式评估报告 | 评估机构 | 12 月 3 日 |\n\n## 三、待核\n- 金额、期限以正式会议纪要为准；印发前须经主持人审定。`,
      };
    case 'weekly':
      return {
        name: '本周周报（工作稿）',
        body: `# 本周周报（工作稿）\n\n## 本周完成\n- 二期上线方案 v0.3 发王处长审阅\n- 2027 预算测算表初稿交财务处\n\n## 进行中\n- 测试报告：刘洋顺延至 11-18\n- 供应商合同：法务审核中\n\n## 下周计划\n- 方案定稿（11-27）\n\n> 依据：事项与聊天记录；未确认内容已标待核。`,
      };
    case 'follow':
      return {
        name: `${subject} · 跟进要点`,
        body: `# ${subject} · 跟进要点\n\n| 事项 | 责任人 | 当前状态 | 下一步 |\n| --- | --- | --- | --- |\n| 测试报告 | 刘洋 | 环境未恢复，顺延 | 先要已测部分 |\n| 预算确认表 | 李娜 | 已交付 | 核对口径 |\n| 供应商合同 | 周敏 | 法务审核中 | 等审核意见 |\n\n> 需要发给对方的话，我会起草放进聊天输入框，由你发送。`,
      };
    default:
      return {
        name: `${subject} · 工作稿`,
        body: `# ${subject} · 工作稿\n\n## 要求\n${text}\n\n## 处理结果\n1. 已梳理要点与依据\n2. 已形成初稿，待你审阅\n\n## 待核\n- 未提供材料的事实保留待核，不作推测。`,
      };
  }
}

const started = new Set<string>();

export function runHandoff(
  taskId: string,
  text: string,
  dispatch: Dispatch<WorkspaceAction>,
  title?: string,
) {
  if (started.has(taskId)) return;
  started.add(taskId);
  const kind = kindOf(text);
  const cleanTitle = title?.replace(/^(根据笔记|根据消息)[:：]\s*/, '').replace(/\s*·\s*语音记录$/, '');
  const subject = cleanTitle ? cleanTitle.slice(0, 22) : subjectOf(text);
  const out = deliverable(kind, subject, text);
  const sources = sourcesOf(kind === 'minutes' ? '会议 ' + text : text);
  const steps: [number, Omit<Extract<WorkspaceAction, { type: 'handoff-step' }>, 'type' | 'taskId'>][] = [
    [
      700,
      {
        replaceIntro: true,
        title: cleanTitle || undefined,
        text: `收到，这件事需要分几步办，我先列计划：\n1. 理解要求，明确交付物和期限\n2. 检索依据：组织知识库、个人资料、相关聊天和事项\n3. 起草《${out.name}》\n4. 自查口径和待核事项，交给你审阅\n\n执行中遇到需要你判断的地方，我会停下来问你；要发出去的内容只起草，由你发送。`,
      },
    ],
    [
      1900,
      {
        text: `已检索依据：组织知识库 ${sources.length} 份（${sources.join('、')}，只读引用），个人资料 1 份，相关聊天 1 条。未授权的系统和资料没有读取。`,
      },
    ],
    [3100, { text: `已起草《${out.name}》初稿，正在自查：核对数字和期限的出处，没有依据的内容标为待核。` }],
    [
      4400,
      {
        text: `成果已形成：《${out.name}》v1，已放在本轮成果里，可以预览、批注或继续让我修改。其中标「待核」的内容需要你或责任处室确认后再使用；正式报送或外发前请你审阅，由你本人操作。`,
        artifact: out,
      },
    ],
  ];
  for (const [delay, step] of steps)
    setTimeout(() => dispatch({ type: 'handoff-step', taskId, ...step }), delay);
}
