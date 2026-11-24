import type { Dispatch } from 'react';
import type { WorkspaceAction } from './fiscal-domain.ts';
import { currentUser } from './current-user.ts';

/**
 * v9 案例：数字孪生运营项目 · 专业类立项（第 1–7 步）。
 * 每个会话都对应组织事项里的一个节点：分身调用各处室发布的 Skill 预审 → 列出结论和依据 →
 * 本人逐条确认 → 生成成果 → 本人确认后「提交到组织事项」。内容为合成演示，金额与日期以 XX 表示。
 * 本模块自带一个很小的外部状态（会话归属、演示身份、确认进度），不进入工作台主 reducer。
 */

export type PersonaKey = 'csy' | 'fzy';
export type TwinStepKey = 's1' | 's2' | 's3' | 's5' | 's7' | 's8';

export const PERSONAS: Record<
  PersonaKey,
  { name: string; department: string; role: string }
> = {
  csy: { name: '陈思远', department: '应用推进处', role: '三级主任科员' },
  fzy: { name: '方振宇', department: '项目统筹处', role: '一级主任科员' },
};

export type TwinSkill = { dept: string; name: string; result: string };
export type TwinFinding = {
  id: string;
  level: '通过' | '需修改' | '补正' | '提示';
  text: string;
  /** 依据：组织知识库文件（宿主资料库可打开）。 */
  basis?: { label: string; file: string };
};
export type TwinOutput = { name: string; body: (kept: TwinFinding[]) => string };
export type TwinStep = {
  owner: PersonaKey;
  node: string;
  nodeTitle: string;
  title: string;
  request: string;
  plan: string[];
  skills: TwinSkill[];
  findings: TwinFinding[];
  confirmHint: string;
  outputs: TwinOutput[];
  submitNote: (kept: TwinFinding[]) => string;
};

const B = {
  xmgl: { label: '《深圳市政务信息化项目管理办法》第十二条', file: 'o-xmgl' },
  lxzy: { label: '《政务信息化项目立项材料编制指引》第三条', file: 'o-lxzy' },
  zjlz: { label: '《政务信息化项目专家论证工作规程》第九条', file: 'o-zjlz' },
  yyfy: { label: '《政务信息化运营服务费用测算标准（2026版）》', file: 'o-yyfy' },
  fjfl: { label: '《政务数据分类分级指南》', file: 'o-fjfl' },
  dbzy: { label: '《政务信息系统网络安全等级保护实施指引》', file: 'o-dbzy' },
};

const list = (kept: TwinFinding[]) =>
  kept.map((f, i) => `${i + 1}. 【${f.level}】${f.text}`).join('\n');
const changes = (kept: TwinFinding[]) =>
  kept.filter((f) => f.level !== '通过');

export const TWIN_STEPS: Record<TwinStepKey, TwinStep> = {
  s1: {
    owner: 'csy',
    node: 'N1',
    nodeTitle: '编制立项方案',
    title: '数字孪生运营项目 · 编制立项方案',
    request:
      '按组织事项「数字孪生运营项目 · 专业类立项」的目标和上下文，编写立项方案（本子）及 6 项申报材料，并请各处室技能先预审。',
    plan: [
      '判定立项路径（备案还是专业类立项）',
      '按《立项材料编制指引》起草立项方案和 5 份附件',
      '请数据资源、数字安全、财务、项目统筹四个处室的技能分别预审',
      '把预审结论交给你逐条确认，确认后形成方案 v1',
    ],
    skills: [
      {
        dept: '项目统筹处',
        name: '立项路径判定',
        result:
          '项目性质为系统业务运营服务，金额 XX 万元，远超 20 万元备案上限 → 不适用备案，走专业类立项。',
      },
      {
        dept: '应用推进处',
        name: '立项方案编写',
        result:
          '按指引生成立项方案初稿（9 章），以及预算明细、数据资源目录、安全方案、绩效目标表、信创适配说明 5 份附件初稿。',
      },
      {
        dept: '数据资源管理处',
        name: '数据目录核验',
        result:
          '方案涉及 14 类数据资源，12 类已编目；「城市部件实时感知数据」「三维建筑模型」2 类未编目。',
      },
      {
        dept: '数字安全管理处',
        name: '安全与信创预审',
        result:
          '按第三级系统定级合理；安全方案缺少运营人员账号与权限管理；信创适配清单已列。',
      },
      {
        dept: '财务处',
        name: '预算与绩效目标预审',
        result:
          '运营人员中级档人月单价高于测算标准上限；绩效目标「提升运营效率」不可量化。',
      },
      {
        dept: '项目统筹处',
        name: '形式审查预检',
        result: '6 项材料齐全，章节结构符合指引。',
      },
    ],
    findings: [
      { id: 'a', level: '通过', text: '立项路径：走专业类立项，不适用备案。', basis: B.xmgl },
      { id: 'b', level: '需修改', text: '数据目录：为 2 类未编目数据资源提交编目申请，并在目录中标注「编目中」。', basis: B.fjfl },
      { id: 'c', level: '需修改', text: '安全方案：补充运营人员账号、权限与操作留痕管理一节。', basis: B.dbzy },
      { id: 'd', level: '需修改', text: '预算明细：中级运营人员人月单价按测算标准上限调整。', basis: B.yyfy },
      { id: 'e', level: '需修改', text: '绩效目标：把「提升运营效率」改为可量化指标（事件处置时长、模型数据更新频次等）。', basis: B.lxzy },
      { id: 'f', level: '通过', text: '形式预检：6 项材料齐全。', basis: B.lxzy },
    ],
    confirmHint: '取消勾选的结论不会写进方案。确认后我按勾选的结论修改并形成 v1。',
    outputs: [
      {
        name: '数字孪生运营项目立项方案 v1',
        body: (kept) =>
          `# 数字孪生运营项目立项方案（v1）\n\n> 立项路径：专业类立项（系统业务运营服务，金额 XX 万元，服务期 12 个月）。\n\n## 一、项目背景与必要性\n城市数字孪生平台一期已建成，需要持续的业务运营服务保障模型更新、场景运营和数据治理。\n\n## 二、运营服务内容\n1. 模型与数据运营：部件模型更新、感知数据接入质量巡检\n2. 场景运营：城市运行、应急指挥、规划审查三类场景的日常运营\n3. 用户支撑：培训、需求受理与问题处置\n\n## 三、服务方式与人员投入\n驻场与远程结合，按初级、中级、高级三档核定人月。\n\n## 四、预算（摘要）\n运营服务费 XX 万元，明细见附件 1。\n\n## 五、绩效目标（摘要）\n事件处置时长、模型数据更新频次、平台可用率等可量化指标，见附件 4。\n\n## 六、本人确认的预审结论\n${list(kept)}\n\n> 附件：预算明细、数据资源目录、安全方案、绩效目标表、信创适配说明（共 5 份）。`,
      },
      {
        name: '立项申报材料附件（5 份）',
        body: () =>
          `# 立项申报材料附件\n\n| 序号 | 材料 | 版本 | 说明 |\n| --- | --- | --- | --- |\n| 1 | 预算明细 | v1 | 人月单价已按测算标准调整 |\n| 2 | 数据资源目录 | v1 | 2 类资源编目中 |\n| 3 | 安全方案 | v1 | 已补运营人员账号与权限管理 |\n| 4 | 绩效目标表 | v1 | 6 项可量化指标 |\n| 5 | 信创适配说明 | v1 | 列明国产化适配清单 |`,
      },
    ],
    submitNote: (kept) =>
      `立项方案 v1 与 5 份附件，已按 ${changes(kept).length} 条预审意见修改。`,
  },
  s2: {
    owner: 'fzy',
    node: 'N2',
    nodeTitle: '形式审查',
    title: '数字孪生运营项目 · 立项材料形式审查',
    request:
      '对组织事项「数字孪生运营项目 · 专业类立项」N1 提交的立项材料做形式审查，查材料齐不齐，缺项出补正通知。',
    plan: [
      '读取 N1 提交的立项方案 v1 和 5 份附件',
      '按 6 项材料清单逐项核对齐套',
      '请数据资源、数字安全、财务处技能复核对应材料',
      '你确认审查结论后，生成形式审查意见表和补正通知',
    ],
    skills: [
      {
        dept: '项目统筹处',
        name: '材料齐套审查',
        result:
          '6 项材料都在；数据资源目录未附编目申请受理回执；绩效目标表 2 项指标缺基线值；信创适配说明缺国产化产品适配证明。',
      },
      {
        dept: '数据资源管理处',
        name: '数据目录核验',
        result: '2 类新增数据资源的编目申请已受理，回执尚未附入材料。',
      },
      {
        dept: '数字安全管理处',
        name: '安全与信创预审',
        result: '安全方案内容完整；信创适配说明只有清单，没有适配证明。',
      },
      {
        dept: '财务处',
        name: '预算与绩效目标预审',
        result: '人月单价符合测算标准；「事件处置时长」「模型数据更新频次」缺基线值。',
      },
    ],
    findings: [
      { id: 'a', level: '通过', text: '立项方案、预算明细、安全方案：齐全，符合要求。', basis: B.lxzy },
      { id: 'b', level: '补正', text: '数据资源目录：附 2 类新增数据资源的编目申请受理回执。', basis: B.fjfl },
      { id: 'c', level: '补正', text: '绩效目标表：为「事件处置时长」「模型数据更新频次」补充基线值及数据来源。', basis: B.lxzy },
      { id: 'd', level: '补正', text: '信创适配说明：补充国产化产品适配证明。', basis: B.dbzy },
    ],
    confirmHint: '取消勾选的补正项不会写进补正通知。确认后生成审查意见表和补正通知。',
    outputs: [
      {
        name: '形式审查意见表',
        body: (kept) =>
          `# 形式审查意见表\n\n项目：数字孪生运营项目（专业类立项）\n审查人：方振宇（项目统筹处）\n\n${list(kept)}\n\n结论：${changes(kept).length ? `需补正 ${changes(kept).length} 项，补齐后重新报送。` : '材料齐全，形式审查通过。'}`,
      },
      {
        name: '补正通知',
        body: (kept) =>
          `# 补正通知\n\n应用推进处：\n\n你处报送的「数字孪生运营项目」立项材料经形式审查，需补正以下内容：\n\n${changes(kept)
            .map((f, i) => `${i + 1}. ${f.text}`)
            .join('\n')}\n\n请补齐后重新报送。\n\n项目统筹处`,
      },
    ],
    submitNote: (kept) =>
      changes(kept).length
        ? `形式审查：需补正 ${changes(kept).length} 项，补正通知见附件。`
        : '形式审查通过。',
  },
  s3: {
    owner: 'csy',
    node: 'N3',
    nodeTitle: '补正再报',
    title: '数字孪生运营项目 · 补正再报',
    request: '按 N2 的补正通知逐条补齐材料，重新报送。',
    plan: [
      '读取 N2 的补正通知，拆成逐条补正清单',
      '收集回执、基线值和适配证明，修改对应材料',
      '请相关处室技能复查，再做一次形式预检',
      '你确认后形成补正材料和逐条响应说明',
    ],
    skills: [
      { dept: '应用推进处', name: '补正对照', result: '补正通知共 3 条，已逐条对应到材料位置。' },
      { dept: '数据资源管理处', name: '数据目录核验', result: '编目申请受理回执已取得（编号 DR-2026-XX），已附入目录。' },
      { dept: '财务处', name: '预算与绩效目标预审', result: '基线值取自 2026 年运营月报；建议注明统计口径和时间区间。' },
      { dept: '数字安全管理处', name: '安全与信创预审', result: '已附 3 份国产化产品适配证明，与清单一致。' },
      { dept: '项目统筹处', name: '形式审查预检', result: '6 项材料齐全，补正 3 项都有逐条响应。' },
    ],
    findings: [
      { id: 'a', level: '通过', text: '第 1 条：已附 2 类数据资源编目申请受理回执。', basis: B.fjfl },
      { id: 'b', level: '提示', text: '第 2 条：基线值已补，注明「2026 年 1–10 月运营月报口径」。', basis: B.lxzy },
      { id: 'c', level: '通过', text: '第 3 条：已附 3 份国产化产品适配证明。', basis: B.dbzy },
    ],
    confirmHint: '确认后生成补正材料和逐条响应说明。',
    outputs: [
      {
        name: '补正材料逐条响应说明',
        body: (kept) => `# 补正材料逐条响应说明\n\n| 补正要求 | 响应 |\n| --- | --- |\n${kept.map((f) => `| ${f.text.split('：')[0]} | ${f.text.split('：').slice(1).join('：')} |`).join('\n')}`,
      },
      {
        name: '数字孪生运营项目立项方案 v2',
        body: () => `# 数字孪生运营项目立项方案（v2）\n\n在 v1 基础上按补正通知修改：附编目回执、补绩效基线值、附信创适配证明。其余内容不变。`,
      },
    ],
    submitNote: () => '补正材料：3 条补正要求均已逐条响应，附立项方案 v2。',
  },
  s5: {
    owner: 'csy',
    node: 'N5',
    nodeTitle: '按纪要修改方案与预算',
    title: '数字孪生运营项目 · 按专题会纪要修改',
    request: '按 N4 关联的分管副局长专题会纪要，修改立项方案和预算，改完报项目统筹处。',
    plan: [
      '读取 N4 关联的专题会纪要，拆出 4 条要求',
      '请局办公室技能逐条核对方案 v2 的落实情况',
      '请财务处技能复核砍范围后的预算',
      '你确认后形成方案 v3、预算明细 v3 和纪要落实对照表',
    ],
    skills: [
      {
        dept: '局办公室',
        name: '纪要落实核对',
        result:
          '纪要 4 条要求：①删除「三维可视化大屏升级」（属建设内容）②预算按运营服务费单列，控制在 XX 万元内 ③按季度考核付费 ④补充与一网统管平台的边界说明。方案 v2 中 ① ② ④ 尚未落实，③ 已有。',
      },
      {
        dept: '财务处',
        name: '预算复核',
        result: '删除大屏升级后预算由 XX 万元降至 XX 万元，在控制额度内；高级档人月由 X 调为 Y。',
      },
    ],
    findings: [
      { id: 'a', level: '需修改', text: '纪要第 1 条：删除「三维可视化大屏升级」，相关预算同步删减。' },
      { id: 'b', level: '需修改', text: '纪要第 2 条：预算口径改为运营服务费单列，金额控制在 XX 万元内。', basis: B.yyfy },
      { id: 'c', level: '通过', text: '纪要第 3 条：已按季度考核付费，无需修改。' },
      { id: 'd', level: '需修改', text: '纪要第 4 条：新增「与一网统管平台的边界」一节。' },
    ],
    confirmHint: '确认后形成方案 v3、预算明细 v3 和纪要落实对照表。',
    outputs: [
      {
        name: '纪要落实对照表',
        body: (kept) => `# 专题会纪要落实对照表\n\n${list(kept)}`,
      },
      {
        name: '数字孪生运营项目立项方案 v3（含预算明细 v3）',
        body: () =>
          `# 数字孪生运营项目立项方案（v3）\n\n按分管副局长专题会纪要修改：删除大屏升级内容；预算按运营服务费单列，XX 万元；按季度考核付费；新增与一网统管平台的边界说明。`,
      },
    ],
    submitNote: (kept) => `按纪要修改完成：落实 ${changes(kept).length} 处修改，附方案 v3 与纪要落实对照表。`,
  },
  s7: {
    owner: 'csy',
    node: 'N7',
    nodeTitle: '专家意见回复与修改',
    title: '数字孪生运营项目 · 专家意见回复与修改',
    request: '对 N6 三位专家的论证意见逐条回复（采纳、部分采纳或不采纳并说明理由），修改方案。',
    plan: [
      '读取 N6 三位专家的意见，拆成 9 条',
      '逐条拟定回复和方案修改位置',
      '请项目统筹处技能检查回复是否合规、财务处技能复核预算',
      '你确认每条回复后，形成回复表和方案 v4',
    ],
    skills: [
      { dept: '应用推进处', name: '意见逐条拆分', result: '技术 3 条、业务 3 条、造价 3 条，共 9 条。' },
      {
        dept: '项目统筹处',
        name: '意见回复规范检查',
        result: '第 6 条拟「不采纳」，原回复没有写理由，不符合规程。已按纪要和 SLA 测算补了理由，请你确认。',
      },
      { dept: '财务处', name: '预算复核', result: '采纳造价意见后，应急响应改为按次计价，总额仍在控制数内。' },
    ],
    findings: [
      { id: 'q1', level: '通过', text: '第 1 条（平台可用率统计口径）：采纳，绩效表注明按月统计、剔除计划停机。' },
      { id: 'q2', level: '通过', text: '第 2 条（运营与建设内容混杂）：采纳，模型重建内容移出运营服务。' },
      { id: 'q3', level: '通过', text: '第 3 条（更新频次与感知设备不匹配）：部分采纳，改为「核心部件按日、一般部件按周」。' },
      { id: 'q4', level: '通过', text: '第 4 条（聚焦高频场景）：采纳，聚焦城市运行、应急指挥、规划审查 3 个场景。' },
      { id: 'q5', level: '通过', text: '第 5 条（区级协同机制）：部分采纳，增加季度联席机制，不设专职人员。' },
      { id: 'q6', level: '提示', text: '第 6 条（驻场 10 人）：不采纳。理由：专题会纪要要求预算控制在 XX 万元内；驻场 6 人加远程支撑按 SLA 测算可满足要求。', basis: B.zjlz },
      { id: 'q7', level: '通过', text: '第 7 条（人月单价档次依据）：采纳，逐项注明测算标准档次。', basis: B.yyfy },
      { id: 'q8', level: '通过', text: '第 8 条（第三方软件订阅费无询价单）：采纳，补 3 家询价单。' },
      { id: 'q9', level: '通过', text: '第 9 条（应急响应包干改按次）：采纳。' },
    ],
    confirmHint: '每条回复都需要你本人认可。第 6 条的理由是技能补上的，请重点看。',
    outputs: [
      {
        name: '专家意见逐条回复表',
        body: (kept) => `# 专家意见逐条回复表\n\n${kept.map((f) => `- ${f.text}`).join('\n')}`,
      },
      {
        name: '数字孪生运营项目立项方案 v4（修改稿）',
        body: () => `# 数字孪生运营项目立项方案（v4，修改稿）\n\n按专家意见修改：绩效口径、剥离建设内容、更新频次、聚焦 3 个场景、区级联席机制、单价档次、询价单、应急响应按次计价。`,
      },
    ],
    submitNote: (kept) => `9 条专家意见已逐条回复（本人确认 ${kept.length} 条），附方案 v4 修改稿。`,
  },
  s8: {
    owner: 'fzy',
    node: 'N8',
    nodeTitle: '复核并形成报批稿',
    title: '数字孪生运营项目 · 意见回复复核与报批稿',
    request: '复核 N7 的专家意见回复和方案 v4，通过后形成报批稿。',
    plan: [
      '读取 N6 专家意见、N7 回复表和方案 v4',
      '请项目统筹处技能逐条复核回复',
      '请财务处、局办公室技能核对预算和报批稿格式',
      '你确认复核结论后，生成复核意见和报批稿',
    ],
    skills: [
      {
        dept: '项目统筹处',
        name: '专家意见回复复核',
        result: '9 条都已回复：采纳 6、部分采纳 2、不采纳 1，不采纳的有理由；修改稿对应位置都已改。',
      },
      { dept: '财务处', name: '预算复核', result: '方案 v4 金额与预算明细一致，在专题会确定的控制额度内。' },
      { dept: '局办公室', name: '报批稿格式检查', result: '符合党组会议题材料格式；提示须附专家论证意见原件。' },
    ],
    findings: [
      { id: 'a', level: '通过', text: '专家意见回复：9 条齐全，不采纳项理由充分。', basis: B.zjlz },
      { id: 'b', level: '通过', text: '修改稿：与回复逐条对应。' },
      { id: 'c', level: '通过', text: '预算：与预算明细一致，在控制额度内。', basis: B.yyfy },
      { id: 'd', level: '提示', text: '报批稿：附专家论证意见原件（3 份）。' },
    ],
    confirmHint: '确认后生成复核意见和《立项报批稿》。',
    outputs: [
      {
        name: '专家意见回复复核意见',
        body: (kept) => `# 专家意见回复复核意见\n\n复核人：方振宇（项目统筹处）\n\n${list(kept)}\n\n结论：复核通过，形成报批稿。`,
      },
      {
        name: '数字孪生运营项目立项报批稿',
        body: () => `# 数字孪生运营项目立项报批稿\n\n提请局党组会审议：项目立项必要性、运营服务内容、预算规模（XX 万元）与资金来源。\n\n附件：立项方案 v4、预算明细、专家论证意见（3 份）、意见回复表、复核意见。`,
      },
    ],
    submitNote: () => '复核通过，附复核意见与《立项报批稿》，可提交第一次党组会。',
  },
};

/* ---------------- 外部状态 ---------------- */
export type TwinPhase = 'running' | 'review' | 'confirmed' | 'confirming' | 'submitted';
export type TwinRun = {
  step: TwinStepKey;
  owner: PersonaKey;
  phase: TwinPhase;
  kept: string[];
  matterId: string;
  matterTitle: string;
  submittedAt?: string;
};
type TwinState = {
  persona: PersonaKey;
  runs: Record<string, TwinRun>;
  invite: Record<PersonaKey, 'direct' | 'accept'>;
};
let state: TwinState = {
  persona: 'csy',
  runs: {},
  invite: { csy: 'direct', fzy: 'direct' },
};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((cb) => cb());
export const twinState = () => state;
export function subscribeTwin(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function patch(next: Partial<TwinState>) {
  state = { ...state, ...next };
  emit();
}
function patchRun(id: string, next: Partial<TwinRun>) {
  patch({ runs: { ...state.runs, [id]: { ...state.runs[id], ...next } } });
}

/** 切换演示身份：工作台显示的当前用户和可见会话随之切换。 */
export function setPersona(key: PersonaKey) {
  Object.assign(currentUser, PERSONAS[key]);
  patch({ persona: key });
}
/** 会话是否属于当前演示身份。原有案例会话都属于陈思远。 */
export const visibleToPersona = (taskId: string) =>
  (state.runs[taskId]?.owner || 'csy') === state.persona;
export const currentPersona = () => state.persona;
export const invitePref = () => state.invite[state.persona];
export function setInvitePref(v: 'direct' | 'accept') {
  patch({ invite: { ...state.invite, [state.persona]: v } });
  window.dispatchEvent(
    new CustomEvent('sa-invite-pref', { detail: { persona: state.persona, value: v } }),
  );
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const hhmm = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** 在工作台里开一个案例会话：按脚本列计划、调用处室技能、汇总预审结论，停在本人确认。 */
export async function runTwin(
  taskId: string,
  step: TwinStepKey,
  ctx: { matterId: string; matterTitle: string; items: string[] },
  dispatch: Dispatch<WorkspaceAction>,
) {
  const d = TWIN_STEPS[step];
  patch({
    runs: {
      ...state.runs,
      [taskId]: {
        step,
        owner: d.owner,
        phase: 'running',
        kept: d.findings.map((f) => f.id),
        matterId: ctx.matterId,
        matterTitle: ctx.matterTitle,
      },
    },
  });
  dispatch({ type: 'folder', name: '数字孪生运营项目', taskId });
  const say = (text: string, extra: Partial<Extract<WorkspaceAction, { type: 'handoff-step' }>> = {}) =>
    dispatch({ type: 'handoff-step', taskId, text, ...extra });
  await pause(500);
  say(
    `这是组织事项「${ctx.matterTitle}」里你负责的节点 **${d.node} ${d.nodeTitle}**。我先列计划：\n${d.plan
      .map((p, i) => `${i + 1}. ${p}`)
      .join('\n')}\n\n各处室技能只做预审，结论由你逐条确认；成果由你本人提交到组织事项。`,
    { replaceIntro: true, title: d.title },
  );
  await pause(900);
  say(
    `已读取组织事项的上下文 ${ctx.items.length} 项（按你的权限）：\n${ctx.items
      .map((x) => `- ${x}`)
      .join('\n')}`,
  );
  for (const s of d.skills) {
    await pause(1100);
    say(`调用 **${s.dept} · ${s.name}** 技能（提供方：${s.dept}）\n\n> ${s.result}`);
  }
  await pause(1000);
  const counts = ['通过', '需修改', '补正', '提示']
    .map((l) => [l, d.findings.filter((f) => f.level === l).length] as const)
    .filter(([, n]) => n)
    .map(([l, n]) => `${l} ${n} 条`)
    .join('、');
  say(
    `预审完成，共 ${d.findings.length} 条结论（${counts}）。\n\n| # | 结论 | 内容 | 依据 |\n| --- | --- | --- | --- |\n${d.findings
      .map((f, i) => `| ${i + 1} | ${f.level} | ${f.text} | ${f.basis?.label || '—'} |`)
      .join('\n')}\n\n请在下方逐条确认。${d.confirmHint}`,
  );
  patchRun(taskId, { phase: 'review' });
}

export function toggleKept(taskId: string, id: string) {
  const r = state.runs[taskId];
  if (!r || r.phase !== 'review') return;
  patchRun(taskId, {
    kept: r.kept.includes(id) ? r.kept.filter((x) => x !== id) : [...r.kept, id],
  });
}

export const keptFindings = (r: TwinRun) =>
  TWIN_STEPS[r.step].findings.filter((f) => r.kept.includes(f.id));

export async function confirmTwin(taskId: string, dispatch: Dispatch<WorkspaceAction>) {
  const r = state.runs[taskId];
  if (!r || r.phase !== 'review') return;
  const d = TWIN_STEPS[r.step];
  const kept = keptFindings(r);
  patchRun(taskId, { phase: 'confirmed' });
  dispatch({
    type: 'handoff-step',
    taskId,
    role: 'user',
    text: `确认预审结论（认可 ${kept.length}/${d.findings.length} 条）`,
  });
  await pause(600);
  d.outputs.forEach((o, i) =>
    dispatch({
      type: 'handoff-step',
      taskId,
      text:
        i === 0
          ? `已按你确认的 ${kept.length} 条结论生成成果：\n${d.outputs.map((x) => `- 《${x.name}》`).join('\n')}\n\n可以在本轮成果里预览。确认无误后，由你本人提交到组织事项的 ${d.node} 节点。`
          : `《${o.name}》已生成。`,
      artifact: { name: o.name, body: o.body(kept) },
    }),
  );
}

export const askSubmit = (taskId: string) => patchRun(taskId, { phase: 'confirming' });
export const cancelSubmit = (taskId: string) => patchRun(taskId, { phase: 'confirmed' });

/** 本人确认提交：把成果交给宿主（组织事项），由宿主记录提交并通知发起人。 */
export function submitTwin(taskId: string, dispatch: Dispatch<WorkspaceAction>) {
  const r = state.runs[taskId];
  if (!r || r.phase !== 'confirming') return;
  const d = TWIN_STEPS[r.step];
  const kept = keptFindings(r);
  const at = hhmm();
  patchRun(taskId, { phase: 'submitted', submittedAt: at });
  dispatch({
    type: 'handoff-step',
    taskId,
    text: `已由你本人提交到组织事项「${r.matterTitle}」· ${d.node} ${d.nodeTitle}（${at}）。组织事项的全部成员都能在事项空间里看到这次提交。`,
  });
  window.dispatchEvent(
    new CustomEvent('sa-twin-submit', {
      detail: {
        matterId: r.matterId,
        step: r.step,
        node: d.node,
        persona: r.owner,
        wbId: taskId,
        note: d.submitNote(kept),
        files: d.outputs.map((o) => ({ name: o.name, body: o.body(kept) })),
      },
    }),
  );
}
