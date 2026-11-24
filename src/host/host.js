const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pad = n => String(n).padStart(2, '0');
const now = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const NAME = '贾维斯';
/* v9：移植工作台的桥（见 src/workbench/app/host-bridge.ts） */
const WB = () => window.SAWorkbench;
let WB_STATUS = { confirm:0, running:0 };
// 工作台在宿主脚本之前挂载，这里直接订阅轻应用状态；启用/停用后刷新首页入口。
WB()?.subscribeApps(() => { if (document.getElementById('rail')?.childElementCount) render(); });
WB()?.subscribe(s => { WB_STATUS = s; if (typeof renderRail === 'function' && document.getElementById('rail').childElementCount) renderRail(); });
let UID = 100; const uid = p => p + (++UID);

/* ====================== 数据 ====================== */
const S = {
  modulePanelOpen:false,
  agentTaskPane:true, agentTaskOpen:null, agentTaskFilter:'all', homeUnread:0, homeReplying:0, homeDraftProposals:{}, homeRef:null, wsDraft:{}, draftScope:'new', transcriptPos:{}, reviewTabs:{}, reviewActive:{}, reviewNotes:{}, pendingReview:{},

  page:'home', inp:{}, dot:false, typing:false, demo:false, budgetTask:null, adminTab:'users',
  home:[],                       // 和分身的那一条连续对话（首页、小球共用）
  cur:'rp', artTab:'sess', artSel:null, plugOpen:null,
  tlist:'today', tsel:'t1',
  chat:'g-xt2', drafts:{}, bindSugs:{},
  nsel:null, nsug:null,
  folder:'kb-all', fsel:null, imTab:'chat', dept:'d-szb', person:null, contactQ:'',
  tview:'list', ctxOpen:true, bindSug:null, wsOpen:{}, setTab:'av',
  msel:{ on:false, ids:[] }, tmore:false,
  wsView:'sess', rp:'art', rpOpen:false, rpWide:false, refs:{}, stepOpen:{}, newMode:'def', memTab:'fact',
};

const WSP = [
  { id:'w-ys', name:'2027 预算' }, { id:'w-db', name:'等保迎检' }, { id:'w-2q', name:'二期上线' }, { id:'w-rp', name:'调研与写作' }, { id:'w-def', name:'默认工作区', def:1 },
];
const RULES = [
  { id:'r1', t:'金额差异超过阈值时先问我', th:'10 万', on:true, lock:false, from:'对话 · 11-04' },
  { id:'r2', t:'要对外发送内容时先问我', on:true, lock:true },
  { id:'r3', t:'要写入任何系统时先问我', on:true, lock:true },
];
const WAYS = [
  { id:'w0', t:'预算汇总先核对口径', sc:'汇总各科室预算测算时', st:'对照财务通知核对口径 → 汇总 → 差异大时先问相关科室', auto:1 },
  { id:'w1', t:'写本周周报', sc:'每周五写周报', st:'读本周事项和项目组群 → 按部门模板起草 → 交给你看' },
  { id:'w2', t:'整理群进展', sc:'项目群讨论多、要汇总时', st:'按事项归类 → 标出谁答应了什么 → 生成摘要' },
];

const PLUGINS = [
  { id:'gw', name:'公文写作', from:'集团办公室发布', ico:'文', on:true, sk:['写通知','写请示','公文格式检查'], ex:['公文审核专家'], cn:['集团 OA（P1）'] },
  { id:'ys', name:'财务预算', from:'内置', ico:'¥', on:true, sk:['预算表核对','测算表汇总'], ex:['预算核对专家'], cn:[] },
  { id:'db', name:'等保合规', from:'内置', ico:'盾', on:true, sk:['迎检材料清单'], ex:['等保合规专家'], cn:[] },
  { id:'dy', name:'调研分析', from:'内置', ico:'研', on:true, sk:['写调研报告','竞品对比表'], ex:['行业调研专家'], cn:[] },
];

const ARTS = {
  report:{ name:'办公智能体调研报告.md', type:'MD', sess:'rp', time:'11-13 16:20', kind:'report' },
  v03:{ name:'二期上线方案 v0.3.docx', type:'DOC', sess:'fa', time:'11-13 11:40', kind:'doc' },
};

const SESS = [
  { id:'db', ws:'w-db', title:'等保迎检材料清单', status:'paused', time:'今天 09:20', plugins:['等保合规'],
    req:'查一下集团今年等保测评通知对迎检材料的要求，整理成清单和分工',
    ctx:{ in:[['工作区库','2025 等保迎检材料清单.docx']], hit:[['文件','网络安全等级保护管理办法（集团版）.pdf','0.90'],['文件','2026 年度等保测评通知.pdf','0.87']] },
    steps:[
      { k:'plan', t:'定计划：找通知 → 对照去年材料 → 专家核对 → 出清单和分工', s:'done', tm:'' },
      { k:'plan', t:'在个人知识库检索测评通知', d:'找到《2026 年度等保测评通知》，12-05 测评', s:'todo', ev:[['测评通知 · 第 2 条','f-dbtz']] },
      { k:'plan', t:'对照工作区库里的 2025 年迎检材料', d:'42 项中 29 项可沿用，13 项需要新准备', s:'todo', ev:[['2025 迎检材料清单','doc-dbqd']] },
      { k:'expert', t:'专家「等保合规专家」：对照三级要求核对', d:'清单齐全；《应急演练记录》建议补部门负责人签字', s:'todo' },
      { k:'write', t:'生成迎检材料清单与分工', d:'42 项 · 按岗位建议了 4 位负责人', s:'todo', art:'db1', artName:'等保迎检材料清单与分工.xlsx', artType:'XLS', artKind:'db1' },
    ], tail:[], arts:[],
    end:{ h:'清单好了：42 项，13 项要新准备，已按岗位建议了分工。其中 4 项需要跟进，要建成事项吗？你勾选后再建。', acts:[['勾选建成事项','dbShare'],['先不建','noop']] } },
  { id:'rp', ws:'w-rp', title:'办公智能体调研报告', status:'done', time:'11-13', plugins:['调研分析'],
    req:'帮我写一份办公智能体调研报告：国内外主要产品、典型场景、政企落地难点，给部门内部参考，5000 字左右',
    steps:[
      { k:'plan', t:'定提纲：6 章（摘要、产品格局、典型场景、落地难点、建议、来源）', s:'done', tm:'16:12' },
      { k:'plan', t:'检索个人知识库：你的资料 3 份', s:'done', tm:'16:15', ev:[['资料 3 份','f-gw']] },
      { k:'expert', t:'专家「行业调研专家」：交叉核对产品对比', s:'done', tm:'16:18' },
      { k:'write', t:'写成报告', d:'约 5200 字，引用来源 17 处', s:'done', tm:'16:20', art:'report' },
    ], tail:[{ r:'ai', h:'写好了。表里的产品只作类型示例，正式引用前建议再核实一遍。' }], arts:['report'] },
  { id:'fa', ws:'w-2q', title:'二期上线方案 v0.3 修改', status:'done', time:'11-13', plugins:['公文写作'],
    req:'把王处长对方案的意见改进 v0.3',
    steps:[
      { k:'plan', t:'读取王处长 3 条意见', s:'done', tm:'11:20' },
      { k:'skill', t:'技能「公文格式检查」', s:'done', tm:'11:35' },
      { k:'write', t:'改出 v0.3', d:'2 条已改，1 条要等测试结论', s:'done', tm:'11:40', art:'v03' },
    ], tail:[], arts:['v03'] },
];

const CP = {
  ys:{ q:'2 处口径和财务通知不一致', why:'服务器维保含延续合同 34.0 万，超过你设的"差异超过 10 万要问我"',
    body:`<table><tr><th>科室</th><th>项目</th><th>填报</th><th>问题</th></tr>
      <tr><td>运维科</td><td>服务器维保</td><td>46.0 万</td><td class="fl">含 2026 年延续合同 34.0 万，通知要求只报新增</td></tr>
      <tr><td>应用科</td><td>低代码平台许可</td><td>18.5 万</td><td class="fl">应列入"软件许可"，填在了"新建项目"</td></tr></table>`,
    ev:[['财务通知 · 第 3 条','f-tz'],['运维科测算表 · 第 4 行','f-5ks']],
    opts:[['ask','先问这两个科室（我起草，你来发）',1],['raw','保留原数，起草时说明差异',0]] },
};

// 事项：d = 11 月的日（>30 表示 12 月），今天是 11-16 周一
const TASKS = [
  { id:'t1', title:'周例会汇报二期进展 10:00', d:16, list:'二期上线', p:3, src:{ t:'note', id:'n2', l:'笔记 · 11-13' } },
  { id:'t3', title:'整理硬件采购需求', d:19, list:'2027 预算', p:1, src:{ t:'note', id:'n4', l:'笔记 · 需求测算表' } },
  { id:'t4', title:'刘洋 · 测试报告', d:13, list:'二期上线', p:2, wait:'刘洋', src:{ t:'im', id:'g-xt2', l:'项目组群' }, bind:['g-xt2'] },
  { id:'t5', title:'方案给王建国看', d:19, list:'二期上线', p:3, src:{ t:'im', id:'c-wang', l:'王建国 · 单聊' } },
  { id:'t6', title:'周敏 · 供应商合同', d:20, list:'二期上线', p:1, wait:'周敏', src:{ t:'im', id:'g-xt2', l:'项目组群' } },
  { id:'t7', title:'确认收到合同盖章版', d:20, list:'二期上线', p:1, src:{ t:'note', id:'n1', l:'笔记 · 今天' } },
  { id:'t8', title:'写本周周报', d:20, list:'收件箱', p:1, rep:'每周五', src:{ t:'me', l:'手动添加' } },
  { id:'t9', title:'等保迎检材料准备', d:35, list:'等保迎检', p:2, fs:'db', src:{ t:'fs', l:'对话 · 11-15' } },
  { id:'t10', title:'整理 10 月部门月报', d:3, list:'收件箱', p:1, done:true, ctx:[['文件','10 月部门月报.docx'],['背景','王处长要求月报加一页风险']] },
];
const LISTS = ['二期上线','2027 预算','等保迎检'];

const CHATS = [
  { id:'g-xt2', g:1, n:'协同办公二期项目组', sub:'8 人', ai:1, un:2, tm:'周五', msgs:[
    { day:'11月12日 周四' },
    { me:1, t:'10:12', x:'上线方案这周要定稿：@刘洋 测试报告 13 号前给我，@李娜 预算确认表帮忙核一下，@周敏 供应商合同跟进一下' },
    { me:1, t:'10:13', card:'xt' },
    { f:'李娜', t:'16:40', file:'xls-budget' },
    { day:'11月13日 周五' },
    { id:'m-liuy', f:'刘洋', t:'17:21', x:'测试环境周四又挂了一次，报告可能要晚两天' },
    { id:'m-zm', f:'周敏', t:'17:40', x:'合同法务那边在审，下周给结果' } ] },
  { id:'c-lina', n:'李娜', sub:'财务处 · 预算专员', un:1, tm:'周五', srt:'等你回复', msgs:[
    { day:'11月13日 周五' },
    { id:'m-lina', f:'李娜', t:'14:05', x:'思远，周五前能给我应用推进处 2027 年预算测算汇总吗？我这边 25 号要汇总。' } ] },
  { id:'c-wang', n:'王建国', sub:'应用推进处 · 处长', tm:'周四', srt:'等你办', msgs:[
    { day:'11月12日 周四' }, { id:'m-wang', f:'王建国', t:'18:02', x:'方案周四前给我看一下' } ] },
  { id:'c-zw', n:'张伟', sub:'运维科', tm:'周四', msgs:[{ day:'11月12日 周四' },{ f:'张伟', t:'09:12', x:'维保测算表已经交到预算群了' }] },
  { id:'c-st', n:'孙婷', sub:'应用科', tm:'周四', msgs:[{ day:'11月12日 周四' },{ f:'孙婷', t:'10:40', x:'低代码平台的报价单我发你邮箱了' }] },
  { id:'g-ys', g:1, n:'2027 年预算编制协调群', sub:'12 人', ai:1, tm:'周四', msgs:[
    { day:'11月12日 周四' }, { f:'李娜', t:'09:30', x:'各部门 25 号前交测算，模板见群文件' } ] },
  { id:'g-szb', g:1, n:'应用推进处工作群', sub:'23 人', ai:0, tm:'周三', msgs:[
    { day:'11月11日 周三' }, { f:'王建国', t:'15:00', x:'本周五下午部门例会' } ] },
];

CHATS.forEach(c => c.msgs.forEach((m, i) => { if (!m.day && !m.system && !m.id) m.id = c.id + '-m' + i; }));
const NOTES = [
  { id:'n-pg', title:'政数局项目评估会 · 语音记录', body:'以下为语音自动转写，未经校对（时长 42 分钟，已区分说话人）。\n\n会议：2027 年度政务信息化项目评估会\n时间：11 月 24 日 14:30—15:12\u3000地点：A 座 6 楼第二会议室\n主持：林晓燕（副局长）\n参会：王建国（应用推进处）、刘振华（数据资源管理处）、冯涛（数字安全管理处）、高华（财务处）、陈思远（应用推进处，记录）、第三方评估机构 2 人\n\n[00:02] 林晓燕：今天主要过两个项目，一个是城市运行一网统管平台二期，一个是政务大模型知识库建设。每个项目先汇报十分钟，然后大家提意见，最后定能不能报市里。\n\n[00:41] 王建国：一网统管二期，申报金额 1860 万，建设期 12 个月。主要是把十个区的事件中心接进来，还有态势感知大屏，嗯，跟一期比，接口从 46 个加到 112 个。\n\n[05:12] 刘振华：数据这块我有个担心，十个区的数据目录现在只有六个区报上来了，另外四个区还没有确认共享范围。没确认之前，接口数量是不是先别写死？\n\n[07:30] 冯涛：等保这个要说清楚，二期按三级系统建，测评费要列进去。上次一期就是漏了测评费，后来又追加的。\n\n[09:05] 高华：财务这边看，1860 万里头硬件占了 640 万，有一部分服务器能不能用市政务云资源池替代？这个要评估机构给个意见，不然市里评审肯定会问。\n\n[11:48] 评估机构：我们初步意见是建设必要性充分，但硬件部分建议改为云资源租用，预计能压缩 300 万左右；接口数量建议按已确认的六个区先列，其余四个区作为二期后续扩展。\n\n[14:20] 王建国：政务大模型知识库，申报 680 万。主要是把政策法规、办事口径这些整理成知识库，给窗口和 12345 用。\n\n[17:02] 冯涛：大模型这个，输出给群众的内容必须人工复核，日志要全量留存，还要有停用机制。这几条要写进建设方案里，不然安全这关过不了。\n\n[19:35] 刘振华：语料授权也要单列，哪些是公开数据，哪些是内部资料，要分清楚，涉及个人信息的不能进训练。\n\n[23:10] 林晓燕：好，我总结一下。\n\n会议结论：\n1. 一网统管二期：原则同意申报，硬件改为云资源租用，申报金额调整到 1560 万左右（以评估机构正式报告为准）；接口先按六个区列，其余四个区待数据资源管理处确认后补充。等保测评费单列。\n2. 政务大模型知识库：原则同意，但建设方案须补充人工复核、全量日志、停用机制和语料授权分级四项内容后再上会。\n\n会后跟进：\n- 王建国：12 月 5 日前按结论修改两个项目的申报材料（陈思远协助）\n- 刘振华：11 月 30 日前催齐剩余四个区的数据目录确认\n- 冯涛：提供等保测评费测算依据\n- 评估机构：12 月 3 日前出正式评估报告\n\n（转写中「一网统管」部分出现识别为「一网通管」，已人工更正。金额以正式会议纪要为准。）', time:'今天 15:16', src:'语音转写 · 42 分钟' },
  { id:'n-twin', title:'数字孪生运营项目专题会 · 语音记录与纪要', body:'以下为语音自动转写及会后整理（时长 38 分钟）。\n\n会议：数字孪生运营项目专题会\n时间：11 月 XX 日 10:00\u3000地点：A 座 8 楼小会议室\n主持：林晓燕（分管副局长）\n汇报：应用推进处（王建国、陈思远）\n列席：项目统筹处（邵卫东、方振宇）\n\n[00:03] 林晓燕：今天定方向、砍范围、定预算口径。\n[04:20] 王建国：运营服务 12 个月，含模型与数据运营、场景运营、用户支撑，另外想把三维可视化大屏升级一起做。\n[11:05] 邵卫东：大屏升级是建设内容，放进运营服务立项不合规。\n[18:40] 林晓燕：同意，砍掉。预算按运营服务费单列，控制在 XX 万元以内。\n[25:10] 方振宇：付费方式建议按季度考核。\n[31:30] 林晓燕：再补一段和一网统管平台的边界，避免重复投入。\n\n会议纪要（会后整理）：\n1. 删除「三维可视化大屏升级」，相关预算同步删减；\n2. 预算按运营服务费单列，控制在 XX 万元以内；\n3. 服务期 12 个月，按季度考核付费；\n4. 补充与一网统管平台的边界说明。\n应用推进处按纪要修改后报项目统筹处，组织内部专家论证。', time:'11-23 11:02', src:'语音转写 · 38 分钟' },
  { id:'n1', title:'合同盖章版', body:'华信说合同盖章版周五寄到，记得确认收到。\n顺便问下周敏法务审核意见有没有改动。', time:'今天 08:12', src:'记一条' },
  { id:'n2', title:'周例会要汇报', body:'周一 10 点例会要汇报二期进展，重点讲测试和预算。王处长上次关心回退方案。', time:'11-13 16:30', src:'记一条' },
  { id:'n3', title:'项目组群 · 本周要点', body:'- 刘洋：测试环境周四又挂了，报告可能晚两天\n- 李娜交付了《2027 预算确认表》\n- 周敏：合同在法务审，下周给结果', time:'11-13 18:30', src:'来自聊天' },
  { id:'n4', title:'需求测算表', body:'需求测算表还差硬件报价，等华信。先给李娜不含硬件的一版。', time:'11-12 11:05', src:'记一条' },
];

const FILES = [
  { id:'f-tz', name:'关于 2027 年度预算编制工作的通知.pdf', type:'PDF', folder:'kb-ys', from:'上传', time:'11-04', kind:'tz', vec:'y' },
  { id:'f-kj', name:'预算核对口径说明.docx', type:'DOC', folder:'kb-ys', from:'上传', time:'11-04', kind:'doc', vec:'y' },
  { id:'f-gw', name:'集团公文格式规范（2026 版）.pdf', type:'PDF', folder:'kb-zd', from:'上传', time:'10-09', kind:'doc', vec:'y' },
  { id:'f-db', name:'网络安全等级保护管理办法（集团版）.pdf', type:'PDF', folder:'kb-zd', from:'上传', time:'03-01', kind:'doc', vec:'y' },
  { id:'f-dbtz', name:'2026 年度等保测评通知.pdf', type:'PDF', folder:'kb-zd', from:'上传', time:'11-10', kind:'dbtz', vec:'y' },
  { id:'f-cl', name:'差旅费管理办法.pdf', type:'PDF', folder:'kb-zd', from:'上传', time:'01-01', kind:'doc', vec:'n' },
  { id:'xls-budget', name:'2027 预算确认表.xlsx', type:'XLS', folder:'kb-ys', from:'从聊天保存 · 李娜', time:'11-12', kind:'budget', vec:'r' },
  { id:'f-5ks', name:'5 个科室测算表.zip', type:'XLS', folder:'w-ys', from:'上传', time:'11-14', kind:'ks5', vec:'y' },
  { id:'doc-dbqd', name:'2025 等保迎检材料清单.docx', type:'DOC', folder:'w-db', from:'上传', time:'11-11', kind:'doc', vec:'y' },
];
const KBF = [['kb-all','全部文件'],['kb-zd','制度规范'],['kb-ys','预算资料']];
/* v9：组织知识库。由组织统一发布和维护，个人只能查看、引用，不能上传、删除、改动或调整向量化。 */
const ORGF = [['org-all','全部（组织）'],['org-fg','政策法规'],['org-zd','机关制度'],['org-bz','标准规范'],['org-kj','办事口径']];
const ORG_FILES = [
  { id:'o-sjaq', name:'中华人民共和国数据安全法.pdf', type:'PDF', folder:'org-fg', pub:'局办公室（法规科）', ver:'现行有效', date:'2021-09-01', q:'第二十一条　国家建立<span class="hl">数据分类分级保护制度</span>，根据数据在经济社会发展中的重要程度，以及一旦遭到篡改、破坏、泄露或者非法获取、非法利用，对国家安全、公共利益或者个人、组织合法权益造成的危害程度，对数据实行分类分级保护。' },
  { id:'o-gdsz', name:'广东省数字政府建设总体规划（2023—2027年）.pdf', type:'PDF', folder:'org-fg', pub:'局办公室（法规科）', ver:'现行有效', date:'2023-03-15', q:'到 2025 年，<span class="hl">“数字政府2.0”建设全面完成</span>，政务服务“一网通办”、省域治理“一网统管”、政府运行“一网协同”水平全国领先。' },
  { id:'o-ggsj', name:'深圳市公共数据管理办法.pdf', type:'PDF', folder:'org-fg', pub:'局办公室（法规科）', ver:'现行有效', date:'2024-07-01', q:'公共管理和服务机构应当按照<span class="hl">“以共享为原则、不共享为例外”</span>的要求，向公共数据共享平台提供本单位公共数据。' },
  { id:'o-gwcl', name:'机关公文处理实施细则（2025年修订）.pdf', type:'PDF', folder:'org-zd', pub:'局办公室（秘书科）', ver:'v3 · 2025 修订', date:'2025-06-10', q:'上行文应当<span class="hl">一文一事</span>，由主送机关的办公厅（室）统一收文；联合行文须经各会签单位负责人签发。' },
  { id:'o-dzh', name:'局党组会议议事规则.docx', type:'DOC', folder:'org-zd', pub:'局办公室（秘书科）', ver:'v2', date:'2024-12-20', q:'党组会议议题由党组成员提出，经党组书记确定后列入议程。会议材料原则上于<span class="hl">会前 2 个工作日</span>送达参会人员。' },
  { id:'o-bm', name:'机关保密工作管理规定.pdf', type:'PDF', folder:'org-zd', pub:'保密办', ver:'v4', date:'2025-01-08', q:'涉密文件、资料<span class="hl">不得上传至非涉密信息系统</span>，不得通过互联网电子邮件、即时通讯工具传递。' },
  { id:'o-dbzy', name:'政务信息系统网络安全等级保护实施指引.pdf', type:'PDF', folder:'org-bz', pub:'数字安全管理处', ver:'v2.1', date:'2025-04-01', q:'第三级政务信息系统<span class="hl">每年至少开展一次等级测评</span>，测评结果报同级公安机关备案。' },
  { id:'o-fjfl', name:'政务数据分类分级指南.pdf', type:'PDF', folder:'org-bz', pub:'数据资源管理处', ver:'v1.3', date:'2025-09-12', q:'政务数据按影响程度分为<span class="hl">一般、重要、核心</span>三级；涉及个人信息的数据，按敏感个人信息单独标注。' },
  { id:'o-bszn', name:'政务服务事项办事指南编制规范.docx', type:'DOC', folder:'org-kj', pub:'政务服务处', ver:'v2', date:'2025-03-20', q:'办事指南应当载明<span class="hl">受理条件、申请材料、办理流程、办理时限、收费依据</span>和咨询监督渠道，不得出现“其他材料”等兜底表述。' },
  { id:'o-12345', name:'12345热线诉求分类口径（2026版）.xlsx', type:'XLS', folder:'org-kj', pub:'民生诉求服务中心', ver:'2026 版', date:'2026-01-05', q:'一级分类 12 类、二级分类 86 类；<span class="hl">同一诉求涉及多个部门时，按首要诉求归类</span>，其余部门列为协办。' },
  { id:'o-xmgl', name:'深圳市政务信息化项目管理办法.pdf', type:'PDF', folder:'org-zd', pub:'项目统筹处', ver:'2024 修订', date:'2024-05-10', q:'第十二条　<span class="hl">单项金额 20 万元以下的运维、运营类项目可实行备案管理</span>；其余项目按专业类项目立项，经形式审查、专家论证、局党组会审议后报批。' },
  { id:'o-lxzy', name:'政务信息化项目立项材料编制指引.docx', type:'DOC', folder:'org-bz', pub:'项目统筹处', ver:'2026 版', date:'2026-02-01', q:'第三条　立项申报材料包括<span class="hl">立项方案、预算明细、数据资源目录、安全方案、绩效目标表、信创适配说明</span>六项；绩效目标应当可量化，并注明基线值和数据来源。' },
  { id:'o-zjlz', name:'政务信息化项目专家论证工作规程.pdf', type:'PDF', folder:'org-zd', pub:'项目统筹处', ver:'v2', date:'2025-08-18', q:'第九条　申报单位应当对专家意见<span class="hl">逐条回复，明确采纳、部分采纳或不采纳；不采纳的应当说明理由</span>，并在修改稿中标注对应位置。' },
  { id:'o-yyfy', name:'政务信息化运营服务费用测算标准（2026版）.xlsx', type:'XLS', folder:'org-kj', pub:'财务处', ver:'2026 版', date:'2026-01-15', q:'运营服务人员按<span class="hl">初级、中级、高级三档</span>核定人月单价，不得超过对应档次上限；应急响应费用宜按次计价。' },
].map(f => ({ ...f, from:'组织发布 · ' + f.pub, time:f.date.slice(5), kind:'org', vec:'y', ro:true }));
const isOrg = folder => String(folder || '').startsWith('org-');
const KBAUTO = { 'kb-zd':true, 'kb-ys':true };

/* ====================== 工具 ====================== */
const sess = id => SESS.find(s => s.id === id);
const task = id => TASKS.find(t => t.id === id);
const chat = id => CHATS.find(c => c.id === id);
/* v9：组织通讯录（演示数据，姓名、电话均为虚构）。chat 字段指向已有单聊。 */
const ORG_UNIT = '市政务服务和数据管理局';
const DEPTS = [
  { id:'d-ld', n:'局领导', duty:'统筹全局工作' },
  { id:'d-bgs', n:'局办公室', duty:'文电、会务、督办、保密、机要' },
  { id:'d-szb', n:'应用推进处', duty:'政务信息化应用项目的立项申报、建设推进与运营' },
  { id:'d-cw', n:'财务处', duty:'部门预算、资金监管、政府采购' },
  { id:'d-fg', n:'政策法规处', duty:'规范性文件审查、行政复议与法治宣传' },
  { id:'d-zwfw', n:'政务服务处', duty:'政务服务事项标准化、一网通办' },
  { id:'d-sjzy', n:'数据资源管理处', duty:'公共数据目录、共享开放与分类分级' },
  { id:'d-aq', n:'数字安全管理处', duty:'网络安全等级保护、数据安全监管' },
  { id:'d-ms', n:'民生诉求服务中心', duty:'12345 热线受理、诉求分拨与督办' },
  { id:'d-xmtc', n:'项目统筹处', duty:'政务信息化项目立项审核、专家论证组织、报批与项目库管理' },
  { id:'d-wbzj', n:'外部专家（临时账号）', duty:'项目论证评审专家，由项目统筹处从专家库抽取，账号随项目开通', ext:1 },
];
const PEOPLE = [
  ['p-hzm','黄志明','d-ld','局长','0755-8812 0001','行政服务大厅 A 座 801'],
  ['p-lxy','林晓燕','d-ld','副局长','0755-8812 0002','行政服务大厅 A 座 803'],
  ['p-zgd','郑国栋','d-ld','副局长','0755-8812 0003','行政服务大厅 A 座 805'],
  ['p-hjp','何建平','d-bgs','办公室主任','0755-8812 0101','A 座 712'],
  ['p-syq','苏雅琴','d-bgs','办公室副主任','0755-8812 0102','A 座 713'],
  ['p-wj','吴俊','d-bgs','秘书科科长','0755-8812 0105','A 座 715'],
  ['p-lj','罗佳','d-bgs','一级主任科员（会务）','0755-8812 0108','A 座 716'],
  ['p-wjg','王建国','d-szb','处长','0755-8812 0301','B 座 502','c-wang'],
  ['p-csy','陈思远','d-szb','三级主任科员','0755-8812 0306','B 座 506',null,1],
  ['p-zw','张伟','d-szb','运维科科长','0755-8812 0310','B 座 510','c-zw'],
  ['p-st','孙婷','d-szb','应用科科长','0755-8812 0312','B 座 512','c-st'],
  ['p-ly','刘洋','d-szb','应用科 · 测试负责人','0755-8812 0315','B 座 512'],
  ['p-zm','周敏','d-szb','综合科 · 采购联络员','0755-8812 0318','B 座 508'],
  ['p-ln','李娜','d-cw','预算专员','0755-8812 0402','A 座 610','c-lina'],
  ['p-gh','高华','d-cw','财务处处长','0755-8812 0401','A 座 608'],
  ['p-yxy','杨秀英','d-fg','处长','0755-8812 0501','A 座 405'],
  ['p-dk','邓凯','d-fg','四级调研员','0755-8812 0503','A 座 406'],
  ['p-clx','陈立新','d-zwfw','处长','0755-8812 0601','行政服务大厅 1 楼'],
  ['p-xt','肖婷','d-zwfw','副处长','0755-8812 0602','行政服务大厅 1 楼'],
  ['p-hh','黄海','d-zwfw','一级主任科员','0755-8812 0605','行政服务大厅 1 楼'],
  ['p-lzh','刘振华','d-sjzy','处长','0755-8812 0701','B 座 602'],
  ['p-xj','许静','d-sjzy','副处长','0755-8812 0702','B 座 603'],
  ['p-ft','冯涛','d-aq','处长','0755-8812 0801','B 座 702'],
  ['p-zmin','曾敏','d-aq','二级主任科员','0755-8812 0805','B 座 704'],
  ['p-xwj','谢文杰','d-ms','中心主任','0755-8812 0901','热线大楼 3 楼'],
  ['p-ly2','梁宇','d-ms','受理分拨科科长','0755-8812 0903','热线大楼 3 楼'],
  ['p-swd','邵卫东','d-xmtc','处长','0755-8812 1001','B 座 402'],
  ['p-fzy','方振宇','d-xmtc','一级主任科员','0755-8812 1006','B 座 405'],
  ['p-yl','叶琳','d-xmtc','四级主任科员','0755-8812 1008','B 座 405'],
  ['p-zlq','赵立群','d-wbzj','技术评审专家 · 教授级高级工程师','临时账号','外部'],
  ['p-qh','钱慧','d-wbzj','业务评审专家 · 城市运行管理','临时账号','外部'],
  ['p-hxd','韩晓东','d-wbzj','造价评审专家 · 注册造价工程师','临时账号','外部'],
].map(([id,n,dept,title,tel,room,chatId,me]) => ({ id, n, dept, title, tel, room, chatId, me:!!me, inv:dept === 'd-wbzj' ? 'accept' : 'direct' }));
const person = id => PEOPLE.find(p => p.id === id);
const dept = id => DEPTS.find(d => d.id === id);
function contactsNav(){
  const q = (S.contactQ || '').trim();
  const rows = DEPTS.map(d => moduleRow(d.n,'▦','deptSel',d.id,!q && S.dept === d.id, PEOPLE.filter(p => p.dept === d.id).length)).join('');
  return `<label class="side-search" for="contact-search">⌕ <input id="contact-search" data-keep value="${esc(S.contactQ || '')}" placeholder="搜索姓名、处室或职务"></label>
    <div class="module-group-label">${esc(ORG_UNIT)}</div>${rows}`;
}
function pContacts(){
  const q = (S.contactQ || '').trim();
  const list = q ? PEOPLE.filter(p => (p.n + dept(p.dept).n + p.title).includes(q)) : PEOPLE.filter(p => p.dept === S.dept);
  const d = dept(S.dept);
  const p = PEOPLE.find(x => x.id === S.person) || list[0];
  const row = x => `<button class="home-row contents-row ${p && x.id === p.id ? 'on' : ''}" data-a="personSel" data-x="${x.id}">
    <span class="inbox-avatar">${esc(x.n[0])}</span><span class="home-row-text"><b>${esc(x.n)}${x.me ? ' <small>（我）</small>' : ''}</b><small>${esc(q ? dept(x.dept).n + ' · ' : '')}${esc(x.title)}</small></span></button>`;
  const card = p ? `<div class="contact-card"><div class="row"><span class="inbox-avatar contact-av">${esc(p.n[0])}</span><div class="grow"><h2>${esc(p.n)}${p.me ? ' <small>（我）</small>' : ''}</h2><small>${esc(ORG_UNIT)} · ${esc(dept(p.dept).n)}</small></div></div>
    <dl class="contact-kv"><dt>职务</dt><dd>${esc(p.title)}</dd><dt>处室</dt><dd>${esc(dept(p.dept).n)}</dd><dt>处室职责</dt><dd>${esc(dept(p.dept).duty)}</dd><dt>办公电话</dt><dd>${esc(p.tel)}</dd><dt>办公地点</dt><dd>${esc(p.room)}</dd><dt>组织事项邀请</dt><dd>${p.inv === 'accept' ? '需要本人确认（邀请发到消息）' : '允许直接邀请'}</dd></dl>
    ${p.me ? '' : `<div class="row" style="gap:8px"><button class="btn acc" data-a="personChat" data-x="${p.id}">发消息</button><button class="btn" data-a="toast" data-x="原型：拨打办公电话 ${esc(p.tel)}">办公电话</button></div>`}
    <p class="mut" style="font-size:12px;margin-top:14px">通讯录由组织人事部门统一维护，个人只能查看。演示数据，姓名与电话均为虚构。</p></div>` : '<div class="quiet-empty"><b>选择一位同事</b></div>';
  return `<div class="portfolio files-view"><header class="folio-head"><div class="row"><div class="grow"><h1>通讯录</h1><p>${q ? `搜索「${esc(q)}」 · ${list.length} 人` : `${esc(ORG_UNIT)} · ${esc(d.n)} · ${list.length} 人 · ${esc(d.duty)}`}</p></div><span class="tag">组织维护 · 只读</span></div></header>
    <div class="library-body"><section class="portfolio-index" data-sc="contact-index">${list.map(row).join('') || '<p class="quiet-empty">没有匹配的人员</p>'}</section>
    <article class="portfolio-content">${card}</article></div></div>`;
}
const note = id => NOTES.find(n => n.id === id);
const val = id => S.inp[id] || '';
const take = id => { const v = (S.inp[id] || '').trim(); S.inp[id] = ''; return v; };
const wd = d => '一二三四五六日'[((d - 16) % 7 + 7) % 7];
const dlabel = d => d == null ? '' : d < 16 ? `逾期 · 11-${pad(d)}` : d === 16 ? '今天' : d === 17 ? '明天' : `${d > 30 ? 12 : 11}-${pad(d > 30 ? d - 30 : d)} 周${wd(d)}`;
const sessStat = s => {
  if (s.status === 'wb') return '已在工作台开会话 · 点开查看进度';
  const n = s.steps.filter(x => x.s === 'done').length, cur = s.steps.find(x => x.s !== 'done');
  if (s.status === 'done') return `已完成 · 产物 ${s.arts.length} 份`;
  if (s.status === 'paused') return '已暂停 · 可继续';
  if (s.status === 'send') return '等你发送';
  if (s.status === 'link') return '等你确认是否关联产物';
  if (s.status === 'block') return '缺少资料 · 等你补充';
  if (s.status === 'wait') return cur?.wt ? '等回复：' + cur.wt : '等你确认目标是否达成';
  if (s.status === 'plan') return `计划待确认 · ${s.steps.length} 步`;
  if (s.status === 'confirm') return '等你确认：' + (CP[cur?.cp]?.q || cur?.t || '');
  return `执行中 ${n}/${s.steps.length} · ${cur ? cur.t.replace(/^.*?：/, '') : ''}`;
};
function allFiles(){
  return Object.entries(ARTS).map(([id, a]) => ({ id, name:a.name, type:a.type, folder:sess(a.sess)?.ws || 'w-def', from:'产物 · ' + (sess(a.sess)?.title || ''), time:a.time, kind:a.kind, art:1, vec:'y' })).reverse().concat(FILES, ORG_FILES);
}
const wsp = id => WSP.find(w => w.id === id);
const EVID = {
  'launch-schedule':{ n:'二期上线安排 · 11-12', q:'<span class="hl">11 月 27 日定稿，12 月 8 日上线</span>。', origin:'im:g-xt2' },
  'f-tz':{ n:'关于 2027 年度预算编制工作的通知.pdf · 第 3 条', q:'各部门测算<span class="hl">只报 2027 年新增需求，已签订的延续合同不重复列报</span>；软件类采购统一列入「软件许可」科目。' },
  'f-5ks':{ n:'5 个科室测算表.zip · 运维科 · 第 4 行', q:'服务器维保　46.0 万　备注：<span class="hl">含 2026 年延续合同 34.0 万</span>' },
  'f-dbtz':{ n:'2026 年度等保测评通知.pdf · 第 2 条', q:'测评时间为 <span class="hl">12 月 5 日</span>，各单位须在 11 月 30 日前备齐迎检材料。' },
  'doc-dbqd':{ n:'2025 等保迎检材料清单.docx', q:'共 42 项……<span class="hl">安全管理制度、机房出入记录、应急演练记录</span>……' },
  'f-gw':{ n:'个人知识库 · 3 份资料', q:'《集团公文格式规范》等 3 份资料中与「办公智能体」相关的段落。' },
  'n4':{ n:'笔记 · 需求测算表（11-12）', q:'需求测算表<span class="hl">还差硬件报价，等华信</span>。先给李娜不含硬件的一版。' },
  'way':{ n:'按以往做法 · 预算汇总先核对口径', q:'这是分身从你 2026 年 3 次预算汇总中<span class="hl">自动沉淀的做法</span>：先对照财务通知核对口径，再汇总，差异大时先问相关科室。可以在「分身记得的」→「做法」里修改或删除。' },
  'inf':{ n:'分身的推断', q:'这是根据汇总表合计 346.5 万和 2026 年实际 303.4 万<span class="hl">推算</span>出来的，不是原文写明的数字。', inf:1 },
};
const evHtml = ev => (ev || []).map(([l, k]) => `<span class="ev ${k === 'inf' ? 'inf' : ''}" data-a="evOpen" data-x="${k}">${k === 'inf' ? '推断' : '依据'} · ${esc(l.replace(/^推断：/, ''))}</span>`).join('');
const fileById = id => allFiles().find(f => f.id === id);
const extIco = t => `<span class="ext ${t}">${t}</span>`;

/* ====================== 产物渲染 ====================== */
function artBody(kind, name, id){
  const note = ARTS[id]?.notes || [];
  const content = artContent(kind,name,id);
  return content + note.map(text => `<div class="art-remark"><b>备注</b><p>${esc(text)}</p></div>`).join('');
}
function artContent(kind, name, id){
  if (kind === 'org'){
    const o = ORG_FILES.find(x => x.id === id);
    return `<div class="paper exemplar"><div class="doc-kind">组织知识库 · 只读 · 演示资料</div>
      <h2>${esc(name.replace(/\.\w+$/, ''))}</h2>
      <h3>发布：${esc(o.pub)} · ${esc(o.ver)} · 生效 ${esc(o.date)}</h3>
      <p class="doc-excerpt">${o.q}</p>
      <p class="mut" style="font-size:12px">由组织统一发布和维护。你可以查看、引用或交给分身使用；如发现内容有误，请联系发布部门更正。</p></div>`;
  }
  const excerpt = EVID[id];
  if (excerpt && ['tz','ks5','dbtz','doc'].includes(kind)){
    return `<div class="paper exemplar"><div class="doc-kind">来源摘录 · 演示资料</div>
      <h2>${esc((name || excerpt.n).replace(/\.\w+$/, ''))}</h2>
      <h3>${esc(excerpt.n.includes(' · ') ? excerpt.n.split(' · ').slice(1).join(' · ') : '适用段落')}</h3>
      <p class="doc-excerpt">${excerpt.q}</p></div>`;
  }
  const ph = n => Array.from({ length:n }, (_, i) => `<span class="ph" style="width:${[92,80,86,64,74][i % 5]}%"></span>`).join('');
  if (kind === 'report') return `<div class="paper"><h1>办公智能体调研报告</h1><blockquote>${NAME}起草 · 2026-11-13 · 依据公开资料 14 篇、你的资料 3 份；产品对比经"行业调研专家"核对</blockquote>
    <h2>一、摘要</h2><p>办公智能体是能理解工作上下文、替人完成多步骤办公工作的 AI 助手。和只回答问题的聊天助手相比，它能读文件和系统、按步骤执行，最后交付文档、表格和演示文稿。</p>
    <p>对政企客户，能否用起来关键在三件事：数据能不能留在内网、权限会不会超过本人、出了错谁负责。</p>
    <h2>二、产品格局</h2><table><tr><th>类型</th><th>特点</th><th>政企落地看什么</th></tr><tr><td>办公套件内置</td><td>嵌在文档、表格、邮件里</td><td>私有化和信创适配</td></tr><tr><td>协同平台内置</td><td>贴着聊天、审批、日程</td><td>平台本身是否已在用</td></tr><tr><td>独立办公智能体</td><td>自主规划、多步骤执行</td><td>数据安全审查</td></tr></table>
    <h2>三、典型场景</h2>${ph(3)}<h2>四、政企落地难点</h2>${ph(4)}<h2>五、建议</h2>${ph(3)}</div>`;
  if (kind === 'ys1' || kind === 'ys2'){
    const v2 = kind === 'ys2';
    const r = [['运维科','服务器维保', v2 ? '12.0' : '46.0', v2 ? 'fx' : 'fl'],['运维科','机房改造','58.0',''],['应用科', v2 ? '低代码平台许可（软件许可）' : '低代码平台许可（新建项目）','18.5', v2 ? 'fx' : 'fl'],['应用科','二期平台建设','120.0',''],['网络科','等保测评','26.0',''],['网络科','硬件更新','待华信报价',''],['数据科','数据治理','52.0',''],['综合科','软件许可','26.0','']];
    return `<table class="xls"><tr><th></th><th>科室</th><th>项目</th><th>2027 测算（万元）</th></tr>${r.map((x, i) => `<tr><th>${i + 1}</th><td>${x[0]}</td><td>${x[1]}</td><td class="${x[3]}">${x[2]}</td></tr>`).join('')}<tr><th></th><td colspan="2"><b>合计</b></td><td><b>${v2 ? '312.5' : '346.5'}</b></td></tr></table>
      <p style="text-align:center;font-size:12px;color:var(--ink3)">${v2 ? '蓝色：已按科室回复修正' : '橙色：和财务口径不一致'}</p>`;
  }
  if (kind === 'budget') return `<table class="xls"><tr><th></th><th>项目</th><th>2026 实际</th><th>2027 测算</th><th>变化</th></tr>${[['协同办公二期','86.0','120.0','+34.0'],['等保测评','24.0','26.0','+2.0'],['硬件更新','40.0','待华信报价',''],['软件许可','31.5','33.0','+1.5']].map((x, i) => `<tr><th>${i + 1}</th>${x.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
  if (kind === 'db1') return `<table class="xls"><tr><th>#</th><th>材料</th><th>状态</th><th>建议负责人</th><th>期限</th></tr>${[['安全管理制度（修订版）','需更新','周敏','11-28'],['机房出入记录（近 1 年）','沿用','刘洋','11-25'],['应急演练记录','需补签字','刘洋','11-28'],['渗透测试报告','需新做','吴凯（外部）','11-30'],['网络拓扑图','需更新','赵磊','11-26'],['资产清单','沿用','赵磊','11-26']].map((x, i) => `<tr><th>${i + 1}</th>${x.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}<tr><td colspan="5" style="color:var(--ink3)">…共 42 项</td></tr></table>`;
  if (kind === 'ppt') return `<div class="slides">${['二期上线进展 · 周例会汇报','本周完成','进行中：测试、合同','风险和应对','上线范围和时间','需要协调的事项'].map((t, i) => `<div class="slide"><b>${t}</b>${ph(2)}<i>${i + 1}</i></div>`).join('')}</div>`;
  if (kind === 'xls') return `<table class="xls"><tr><th></th><th>A</th><th>B</th><th>C</th></tr>${[1,2,3,4,5].map(i => `<tr><th>${i}</th><td>—</td><td>—</td><td>—</td></tr>`).join('')}</table>`;
  return `<div class="paper"><h3>${esc((name || '').replace(/\.\w+$/, ''))}</h3>${ph(5)}<h2> </h2>${ph(4)}<h2> </h2>${ph(3)}</div>`;
}

/* ====================== 渲染 ====================== */
function render(){
  const oldTranscript = document.querySelector('[data-flow-scroll]');
  if (oldTranscript){
    S.transcriptPos[oldTranscript.dataset.flowScroll] = {
      y:oldTranscript.scrollTop, bottom:oldTranscript.scrollHeight - oldTranscript.scrollTop - oldTranscript.clientHeight < 65
    };
  }
  const draftKey = S.cur || 'new';
  if (S.draftScope !== draftKey){
    S.wsDraft[S.draftScope] = val('ws-in');
    S.inp['ws-in'] = S.wsDraft[draftKey] || '';
    S.draftScope = draftKey;
  }
  const a = document.activeElement;
  const edgeFocus = a?.closest('.edge-rail') && a.matches('[data-a="edgeOpen"]') ? a.dataset.x : null;
  const keep = a && a.id && a.dataset.keep !== undefined ? { id:a.id, s:a.selectionStart } : null;
  const sc = {}; document.querySelectorAll('[data-sc]').forEach(e => sc[e.dataset.sc] = e.scrollTop);
  syncAgentTasks();
  renderRail();
  renderModuleNav();
  renderHeader();
  // v9：工作台由移植的超级智能体模块承接，宿主只切换其可见性；#page 在工作台页只保留小球。
  const wbOn = S.page === 'ws';
  if (WB()) WB()[wbOn ? 'show' : 'hide']();
  // v9：「设置 · 个人账户与偏好」由工作台的个人设置以 portal 渲染进 #sa-settings。
  const meOn = S.page === 'set' && S.setTab === 'me';
  if (WB()) WB()[meOn ? 'showSettings' : 'hideSettings']();
  $('#page').hidden = meOn;
  $('#page').classList.toggle('wb-overlay', wbOn);
  $('#page').innerHTML = wbOn ? dotHtml() : S.me !== 'csy' && ['notes','mem'].includes(S.page) ? personaEmpty() + dotHtml() : ({ home:pHome, tasks:pTasks, im:pIm, notes:pNotes, lib:pLib, set:pSet, mem:pMem, admin:pAdmin })[S.page]() + (S.page === 'admin' ? '' : dotHtml());
  document.querySelectorAll('[data-sc]').forEach(e => { if (sc[e.dataset.sc] != null) e.scrollTop = sc[e.dataset.sc]; });
  const transcript = document.querySelector('[data-flow-scroll]');
  if (transcript){
    const prev = S.transcriptPos[transcript.dataset.flowScroll];
    const seed = transcript.dataset.flowScroll === 'home' && !prev && S.home.length <= 2;
    transcript.scrollTop = seed ? 0 : S.scrollFlow || !prev || prev.bottom ? transcript.scrollHeight : prev.y;
    S.scrollFlow = false;
  }
  document.querySelectorAll('[data-bottom]').forEach(e => e.scrollTop = e.scrollHeight);
  if (S.page === 'im' && S.highlight){
    const original = document.getElementById('message-' + S.highlight);
    original?.classList.add('from-source');
    original?.scrollIntoView({ block:'nearest' });
    S.highlight = null;
  }
  if (edgeFocus) document.querySelector(`[data-a="edgeOpen"][data-x="${edgeFocus}"]`)?.focus({preventScroll:true});
  if (keep){ const e = document.getElementById(keep.id); if (e){ e.focus(); try { e.setSelectionRange(keep.s, keep.s); } catch(_){} } }
  renderDemo();
}

const symbol = (text, cls = '') => `<span class="symbol ${cls}" aria-hidden="true">${text}</span>`;
const mark = '<span class="agent-mark" aria-hidden="true"><i></i><i></i><i></i></span>';
const modules = {
  home:['分身','home'],ws:['工作台','work'],tasks:['事项','task'],
  im:['消息','chat'],notes:['笔记','note'],lib:['资料库','files'],
  mem:['分身记得的','home'],set:['设置','gear'],admin:['管理端','gear'],
};
const coreModules = ['home','ws','tasks','im','notes','lib'];
const sessionId = () => S.wsView === 'sess' ? S.cur : null;
function edgeIcon(kind){
  const shape = {
    home:'<circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4M5 5l2.8 2.8m8.4 8.4L19 19M5 19l2.8-2.8m8.4-8.4L19 5"/>',
    work:'<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 8.5h17m-11 0v11m3-7h5m-5 3h4"/>',
    task:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 2.7 2.7L16 9.5"/>',
    chat:'<path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l1-3.6a7.5 7.5 0 1 1 14-3.9Z"/><path d="M9 11.5h7"/>',
    note:'<path d="M6.5 4h9l3 3v13h-12zM15.5 4v3.5h3M9.5 11h6m-6 4h6"/>',
    files:'<path d="M4 8V6h6l2 2h8v11H4z"/><path d="M4 11h16"/>',
    gear:'<circle cx="12" cy="12" r="3"/><path d="M10 3v2.5l-2 .9-2-1.5-2 2 1.5 2-.9 2H2v3h2.6l.9 2-1.5 2 2 2 2-1.5 2 .9V21h4v-2.6l2-.9 2 1.5 2-2-1.5-2 .9-2H22v-3h-2.6l-.9-2 1.5-2-2-2-2 1.5-2-.9V3z" transform="translate(1 0) scale(.92 1)"/>',
    panel:'<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M9 5v14"/>',
    back:'<path d="m10 5-6 7 6 7M4 12h16"/>',
  }[kind];
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shape || ''}</svg>`;
}
function edgeButton(key, badge){
  const [label,glyph] = modules[key];
  const current = S.page === key || (key === 'home' && S.page === 'mem');
  return `<button class="edge-button ${current ? 'on' : ''}" aria-label="${label}" ${current ? 'aria-current="page"' : ''}
    aria-controls="module-nav" aria-expanded="${current && S.modulePanelOpen}" data-a="edgeOpen" data-x="${key}">
    ${key === 'home' ? agentSignal(agentTaskCounts().attention ? 'attention' : '') : edgeIcon(glyph)}${badge ? `<span class="edge-count">${badge}</span>` : ''}<span class="edge-tooltip" aria-hidden="true">${label}</span></button>`;
}
function renderRail(){
  // v9：去掉顶部标志按钮，它和下面的「分身」入口都指向分身首页，保留带状态和角标的「分身」入口。
  const logo = '';
  if (S.page === 'admin'){
    $('#rail').innerHTML = logo + '<div class="edge-buttons">' + edgeButton('admin') + '</div>';
    return;
  }
  const reviews = SESS.filter(s => ['confirm','link','plan'].includes(s.status) && !s.arch).length;
  const unread = CHATS.reduce((sum,c) => sum + (c.un || 0),0);
  const badges = { home:S.homeUnread, ws:WB_STATUS.confirm || '', im:unread };
  $('#rail').innerHTML = logo + '<div class="edge-buttons">' + coreModules.map(key => edgeButton(key,badges[key])).join('') + '</div>'
    + '<div class="edge-bottom">' + edgeButton('set') + `<span class="edge-avatar ${S.me !== 'csy' ? 'persona-alt' : ''}" role="button" tabindex="0" title="${esc(PERSONA[S.me].n)} · ${esc(PERSONA[S.me].dept)} · 个人账户与偏好" data-a="go" data-x="set:me">${esc(PERSONA[S.me].n[0])}</span></div>`;
}
function moduleRow(label, glyph, action, target, selected = false, count = ''){
  return `<button class="module-row ${selected ? 'on' : ''}" data-a="${action}" data-x="${esc(target)}" ${selected ? 'aria-current="true"' : ''}>
    ${symbol(glyph)}<span class="module-row-label">${esc(label)}</span>${count ? `<small>${count}</small>` : ''}</button>`;
}
function renderModuleNav(){
  const root = $('#module-nav');
  const key = S.page;
  const open = Boolean(modules[key] && S.modulePanelOpen && key !== 'ws');
  $('#module-stage').classList.toggle('nav-open',open);
  root.hidden = !open;
  if (!open){ root.innerHTML = ''; return; }
  const label = modules[key][0];
  root.setAttribute('aria-label', label + '导航');
  const actions = ({
    ws:'<button class="btn icon-only" data-a="newWsp" aria-label="新建工作区" title="新建工作区">＋</button>',
    // v9：发起单聊改从「通讯录」进入，移除此处的＋按钮。
    notes:'<button class="btn icon-only" data-a="newNote" aria-label="新建笔记" title="新建笔记">＋</button>',
  })[key] || '';
  const [body, footer = ''] = ({
    home: homeModuleNav, ws: workModuleNav, tasks: taskModuleNav, im: imModuleNav, notes: noteModuleNav,
    lib: libraryModuleNav, mem: memoryModuleNav, set: settingsModuleNav, admin: adminModuleNav,
  })[key]();
  root.innerHTML = `<div class="module-nav-head"><b>${label}</b><span class="grow"></span>${actions}
    <button class="btn icon-only module-close" data-a="sidebarToggle" aria-label="收起模块侧栏" title="收起模块侧栏">${edgeIcon('panel')}</button></div>
    <div class="module-nav-body" data-sc="module-${key}">${body}</div>
    ${footer ? `<div class="module-nav-footer">${footer}</div>` : ''}`;
}
function homeModuleNav(){
  return [moduleRow('当前对话','▱','homeThread','',true)
    + moduleRow('查看晨报','☷','homeBrief','')
    + moduleRow('分身记得的','◉','go','mem')];
}
function workModuleNav(){
  return [`<button class="btn acc module-new" data-a="launchWork" aria-label="新会话">＋ 新会话</button>
    <label class="rail-search" for="session-search">${symbol('⌕')}<input id="session-search" data-keep placeholder="搜索会话" value="${esc(S.sessionSearch || '')}"></label>
    <div class="module-group-label">按工作区</div>
    <div class="rail-sessions-list">${sessionGroups(S.sessionSearch || '')}</div>`,
    moduleRow('插件','⊞','wsView','plugins',S.wsView === 'plugins')
    + moduleRow('轻应用','▦','wsView','apps',['apps','app'].includes(S.wsView))
    + moduleRow('自动化','◷','wsView','auto',S.wsView === 'auto','P1')];
}
function taskModuleNav(){
  const time = SMART.filter(([key]) => key !== 'done').map(([key,label,filter],index) =>
    moduleRow(label,['◷','▦','≡'][index],'tlist',key,S.tlist === key,TASKS.filter(filter).length || '')).join('');
  const lists = ['收件箱',...LISTS].map(name =>
    moduleRow(name,'▱','tlist',name,S.tlist === name,TASKS.filter(t => !t.done && t.list === name).length || '')).join('');
  const org = '<div class="module-group-label module-group-row">组织事项 <button class="btn lk" data-a="orgNew" aria-label="新建组织事项">＋</button></div>'
    + moduleRow('组织事项','◎','tlist','org',S.tlist === 'org',TASKS.filter(t => t.org && !t.done).length || '');
  return ['<div class="module-group-label">按时间</div>' + time + org + '<div class="module-group-label">按清单</div>' + lists
    + moduleRow('新建清单','＋','newList',''),moduleRow('已完成','✓','tlist','done',S.tlist === 'done',TASKS.filter(t => t.done).length || '')];
}
function libraryModuleNav(){
  return [`<div class="module-group-label module-group-row">个人知识库 <button class="btn lk" data-a="folderCreate" aria-label="新建文件夹">＋</button></div>
    ${KBF.map(([id,label]) => moduleRow(label,'▱','folder',id,S.folder === id)).join('')}
    <div class="module-group-label">工作区库</div>${WSP.map(w => moduleRow(w.name,'▧','folder',w.id,S.folder === w.id)).join('')}
    <div class="module-group-label module-group-row">组织知识库 <span class="tag">只读</span></div>
    ${ORGF.map(([id,label]) => moduleRow(label,'▤','folder',id,S.folder === id)).join('')}`];
}
function memoryModuleNav(){
  return [moduleRow('回到对话','↩','go','home') + '<div class="module-group-label">分身记得的</div>'
    + [['fact','事实与承诺',FACTS.length],['way','做法',WAYS.length],['rule','规则',RULES.length]].map(([key,label,count]) =>
      moduleRow(label,'◉','memTab',key,S.memTab === key,count)).join('')];
}
function settingsModuleNav(){
  return [[['me','个人账户与偏好','◉'],['av','分身','✳'],['brief','晨报','◷'],['priv','隐私与权限','◇']].map(([key,label,icon]) =>
    moduleRow(label,icon,'setTab',key,S.setTab === key)).join('')];
}
function adminModuleNav(){
  return [[['users','账户与组织架构','▤'],['models','模型配置','⊞']].map(([key,label,icon]) =>
    moduleRow(label,icon,'adminTab',key,S.adminTab === key)).join(''),moduleRow('返回员工端','↩','go','home')];
}

function sessionGroups(q){
  const query = q.trim().toLowerCase();
  return WSP.map(w => {
    const list = SESS.filter(s => s.ws === w.id && !s.arch && s.title.toLowerCase().includes(query))
      .sort((a,b) => Number(Boolean(b.pin)) - Number(Boolean(a.pin)));
    if (query && !list.length) return '';
    const open = S.wsOpen[w.id] !== false || query;
    return `<button class="rail-folder" data-a="wspTog" data-x="${w.id}" aria-expanded="${Boolean(open)}">${symbol(open ? '⌄' : '›')}<span>${esc(w.name)}</span></button>
      ${open ? list.map(s => `<div class="rail-session ${sessionId() === s.id ? 'selected' : ''}">
        <button data-a="go" data-x="ws:${s.id}" title="${esc(s.title)} · ${esc(sessStat(s))}">
          <span class="session-status ${esc(stTag(s)[0])}"></span><span class="rail-session-label">${esc(s.title)}</span>
        </button><button class="rail-more" data-a="sessMenu" data-x="${s.id}" aria-label="会话菜单">···</button></div>`).join('') : ''}`;
  }).join('') || '<div class="rail-empty">没有匹配的会话</div>';
}
function targetName(){
  if (S.page === 'ws') return '工作台';
  if (S.page === 'mem') return '分身记得的';
  if (S.page === 'admin') return '管理端';
  if (S.page === 'set') return '设置';
  return ({home:'分身对话',ws:'新会话',tasks:'事项',im:'消息',notes:'笔记',lib:'资料库'})[S.page];
}
function renderHeader(){
  const target = targetName() || '';
  $('#crumb').innerHTML = `<strong>${esc(target)}</strong>${ORG_MATTERS.length || S.me !== 'csy' ? `<span class="persona-chip ${S.me !== 'csy' ? 'alt' : ''}" title="原型演示功能，不属于产品规则">演示身份：${esc(PERSONA[S.me].n)} · ${esc(PERSONA[S.me].dept)}<button data-a="persona" data-x="${S.me === 'csy' ? 'fzy' : 'csy'}">切换到${esc(PERSONA[S.me === 'csy' ? 'fzy' : 'csy'].n)}</button></span>` : ''}`;
  const control = $('#header-panel');
  control.innerHTML = edgeIcon('panel');
  control.hidden = S.modulePanelOpen || S.page === 'home' || S.page === 'ws';
  $('#global-search').hidden = S.page === 'admin';
  $('#head-admin').textContent = S.page === 'admin' ? '返回员工端' : '管理端';
  $('#head-admin').dataset.x = S.page === 'admin' ? 'home' : 'admin';
}
const HOME_PROMPTS = [
  ['今天先处理什么','say','今天先处理什么'],
  ['帮我回李娜','say','帮我回李娜'],
  ['定个提醒','fillHome','提醒我'],
  ['整理例会、跟进测试','say','重新整理例会要点，再跟进测试报告。'],
];
const DEMO_DAY = '11 月 16 日 · 周一';
function homeComposer(){
  return `<div class="home-compose">
    <label class="sr-only" for="home-in">给贾维斯发消息</label>
    <textarea id="home-in" data-keep data-enter="homeSend" placeholder="给贾维斯发消息，或交代一件要办的事…">${esc(val('home-in'))}</textarea>
    <div class="home-compose-foot"><button class="btn home-attach" data-a="homeAttach" aria-label="引用资料">＋ <span>引用资料</span></button>
      ${S.homeRef ? `<span class="inline-ref">${esc(S.homeRef[1])}<button data-a="homeRefClear" aria-label="移除引用">×</button></span>` : ''}
      <span class="grow"></span><small class="home-send-hint">↵ 发送</small><button class="send" data-a="homeSend" aria-label="发送">↑</button></div>
  </div>`;
}
/* 分身任务记录交办的目标。工作台会话作为可选的办理记录关联。 */
const AGENT_TASKS = [];
const agentTask = id => AGENT_TASKS.find(job => job.id === id);
const AGENT_STATES = {
  attention:['需要你','warn'], run:['正在办','ai'], waiting:['等回复','wait'],
  queue:['待开始',''], paused:['已暂停',''], done:['已完成','ok'],
};
function createAgentTask(fields){
  const job = { id:uid('agent-job-'), phase:'run', stage:'准备资料', steps:[], sessions:[], sources:[], ...fields };
  AGENT_TASKS.push(job);
  return job;
}
function agentTaskCounts(){
  return AGENT_TASKS.reduce((counts,job) => {
    counts[job.phase] = (counts[job.phase] || 0) + 1;
    return counts;
  },{});
}
function agentPresence(){
  const counts = agentTaskCounts();
  if (S.homeReplying) return '在回复你';
  if (counts.run === 1) return '正在处理 1 件';
  if (counts.run > 1) return '正在并行处理 ' + counts.run + ' 件';
  if (counts.attention) return counts.attention + ' 件需要你处理';
  if (counts.waiting) return counts.waiting + ' 件在等回复';
  return '可以交代新的工作';
}
function linkAgentSession(job,session){
  if (!job.sessions.includes(session.id)) job.sessions.push(session.id);
}
function createWorkspaceAgentTask(session,request){
  const job = createAgentTask({ mode:'workspace', title:session.title, request });
  linkAgentSession(job,session);
  return job;
}
function syncAgentTasks(){
  for (const job of AGENT_TASKS){
    if (job.mode === 'org'){ syncOrgJob(job); continue; }
    if (job.mode === 'direct'){
      if (job.recipe === 'testing' && job.phase !== 'run'){
        const report = task('t4'), group = chat('g-xt2');
        if (report.done) {
          Object.assign(job,DIRECT_AGENTS.testing.complete());
          delete job.dynamicSource;
        } else if (job.dynamicSource && (!canReadChat(group) || group.msgs.some(m=>m.id==='m-liuy' && m.revoked))){
          delete job.dynamicSource;
          job.phase = 'attention';
          job.stage = '最新消息已不可用';
          job.result = ['请补充可以用于核对的进展。'];
          job.action = ['打开测试报告事项','task:t4'];
        } else if (job.dynamicSource && job.phase === 'attention' && report.d >= 16){
          Object.assign(job,DIRECT_AGENTS.testing.complete());
        }
      }
      continue;
    }
    const matter = job.mode === 'budget' ? task(S.budgetTask) : null;
    const session = [...job.sessions].reverse().map(sess).find(item=>item && !item.arch);
    if (job.mode === 'budget'){
      if (matter?.done){
        job.phase = 'done'; job.stage = '汇总表已发送，事项已确认完成';
        job.action = ['查看事项','task:' + matter.id];
        continue;
      }
      if (matter?.looks){
        job.phase = 'attention'; job.stage = '汇总表已发送，由你确认是否办完';
        job.action = ['查看事项','task:' + matter.id];
        continue;
      }
      if (!session){
        job.phase = 'attention';
        job.stage = matter ? '补充背景后交给贾维斯办理' : '李娜周五前需要测算汇总';
        job.action = matter ? ['打开事项','task:' + matter.id] : ['打开李娜的消息','msg:m-lina'];
        continue;
      }
    }
    if (!session) { job.phase = 'paused'; job.stage = '关联会话已归档'; job.action = null; continue; }
    const phase = ({
      plan:'attention', confirm:'attention', link:'attention', block:'attention', send:'attention',
      running:'run', wait:'waiting', done:'done', paused:'paused',
    })[session.status];
    const current = session.steps.find(st => st.s !== 'done');
    job.steps = session.steps.map(st=>({ title:st.t, complete:st.s === 'done' }));
    const needsGoal = session.status === 'wait' && session.goalAsked && !current;
    job.phase = needsGoal ? 'attention' : phase || 'queue';
    job.stage = needsGoal ? '由你确认目标是否达成' :
      session.status === 'done' ? '本轮已完成，可查看产物' :
      session.status === 'plan' ? '等待确认执行计划' :
      session.status === 'paused' ? '办理已暂停' :
      session.status === 'send' ? '草稿已准备，由你本人发送' :
      session.status === 'block' ? '缺少可用的工作区资料' : current?.t || '继续办理';
    job.action = ['打开关联会话','ws:' + session.id];
  }
}

const DIRECT_AGENTS = {
  weekly:{
    title:'整理周例会汇报要点',
    request:'把周例会要讲的进展、风险和需要协调的事提前列出来。',
    stages:['读周例会笔记','核对测试和预算进展','整理汇报要点'],
    sources:[['周例会笔记','note:n2'],['例会事项','task:t1']],
    complete(){
      const current = task('t4');
      return { phase:'done',stage:'三条要点已整理好', action:['打开例会事项','task:t1'],
        result:[
          '测试进展：' + (current.done ? '测试报告事项已完成，可带上结论。' : '测试报告仍在跟进，交付时间需核实。'),
          '预算进展：' + (chat('c-lina').replied ? '已回复财务，汇报时带上最新口径。' : '财务周五前需要测算汇总，注明硬件报价状态。'),
          '风险说明：补充回退触发条件和现场分工，回应王处长上次关注的问题。',
        ] };
    },
  },
  testing:{
    title:'跟进二期测试报告',
    request:'核对测试报告的最新进展，找出需要我决定的地方。',
    stages:['核对事项期限','查看已绑定聊天','判断是否需要跟进'],
    sources:[['测试报告事项','task:t4']],
    complete(){
      const current = task('t4');
      if (current.done) return {phase:'done',stage:'测试报告事项已完成',result:['已核对事项状态。'],action:['查看事项','task:t4']};
      const group = chat('g-xt2');
      const message = group.msgs.find(m=>m.id === 'm-liuy' && !m.revoked);
      if (!canReadChat(group) || !message){
        return {phase:'attention',stage:'缺少有权限的最新消息',result:['当前只拿到了事项期限。请补充可用于核对的进展。'],action:['打开测试报告事项','task:t4']};
      }
      if (current.d >= 16){
        return {phase:'waiting',stage:'等待刘洋确认新交付时间',result:['事项期限已更新，继续跟进绑定聊天。'],action:['打开原消息','msg:m-liuy'],dynamicSource:['刘洋的更新','msg:m-liuy']};
      }
      return {phase:'attention',stage:'刘洋预计晚两天，需确认新期限',
        result:['原消息：' + message.x,'建议先核实可交付时间，由你决定是否调整事项。'],
        action:['打开刘洋的消息','msg:m-liuy'],dynamicSource:['刘洋的更新','msg:m-liuy']};
    },
  },
};
function launchDirectAgent(kind,{ quiet = false, renew = false } = {}){
  const definition = DIRECT_AGENTS[kind];
  if (!definition) return;
  const existing = AGENT_TASKS.findLast(job=>job.recipe===kind);
  if (existing && (!renew || existing.phase === 'run')) return existing;
  const job = createAgentTask({ title:definition.title, request:definition.request, mode:'direct', recipe:kind,
    stage:definition.stages[0], steps:definition.stages.map(title=>({ title,complete:false })), sources:definition.sources.slice() });
  const delays = kind === 'weekly' ? [2400,5800,10200] : [3600,8700,15500];
  delays.forEach((delay,index) => setTimeout(function step(){
    // v9 案例：这些差事属于陈思远；切到其他演示身份时，等切回后再更新。
    if (S.me !== 'csy') return setTimeout(step, 1000);
    job.steps[index].complete = true;
    if (index < 2) job.stage = definition.stages[index+1];
    else {
      Object.assign(job,definition.complete());
      const text = job.phase === 'done' ? '我把这件事梳理好了，你可以查看结果。'
        : job.phase === 'waiting' ? '我核对了目前的进展，有新回复再告诉你。'
        : '我核对到一处需要你判断的地方，相关内容放在「分身在办」里了。';
      S.home.push({ r:'ai',h:text,tm:now(),agentJob:job.id });
      if (S.page !== 'home' && !S.dot) S.homeUnread++;
    }
    if (S.page === 'home' || S.dot) render();
    else if (index === 2 && S.page !== 'admin') renderRail();
  },delay));
  if (!quiet) S.agentTaskPane = true;
  return job;
}
function seedAgentTasks(){
  createAgentTask({id:'budget-follow-up',title:'跟进 2027 预算汇总',mode:'budget',phase:'attention',
    request:'按财务口径完成汇总，在周五前把成果交给李娜。',sources:[['李娜的原消息','msg:m-lina']]});
  launchDirectAgent('weekly',{quiet:true});
  launchDirectAgent('testing',{quiet:true});
}
function directAgentReply(text){
  const candidates = [
    [/(整理|提炼|梳理|准备).{0,9}(例会|汇报要点)|(例会|汇报要点).{0,10}(整理|提炼|梳理|准备)/,'weekly'],
    [/(跟进|追踪|核对|查一下).{0,10}测试报告|测试报告.{0,8}(跟进|进度)/,'testing'],
  ].filter(([pattern])=>pattern.test(text)).map(([,kind])=>kind);
  if (!candidates.length) return null;
  const jobs = candidates.map(kind=>launchDirectAgent(kind,{renew:/重新|再核对/.test(text)}));
  return { h:jobs.length > 1 ? '这两件我会分别处理，你可以继续交代别的事。' :
    jobs[0].phase === 'run' ? '这件我在办，右侧可以随时看进展。' : '这件已有更新，点开就能查看。',
    agentJobs:jobs.map(job=>job.id) };
}

function agentSignal(state = ''){
  return `<span class="agent-face ${state === 'attention' ? 'attention' : ''}" aria-hidden="true"><span>✳</span></span>`;
}
function pHome(){
  const counts = agentTaskCounts();
  const active = (counts.run || 0) + (counts.attention || 0) + (counts.waiting || 0);
  return `<section class="dialog-home agent-home">
    <header class="agent-head">
      <div class="agent-identity">${agentSignal()}
        <div><h1>${NAME}</h1><span class="agent-activity-summary"><i></i>${agentPresence()}</span></div></div>
      <div class="agent-head-actions">
        <button class="btn sm" data-a="homeFind">${symbol('⌕')} 搜索对话</button>
        <button class="btn sm" data-a="go" data-x="mem">分身记得的</button>
        <button class="btn sm ${S.agentTaskPane ? 'active' : ''}" data-a="agentTasksToggle" aria-label="分身在办" aria-expanded="${S.agentTaskPane}" aria-controls="agent-tasks-panel">
          ${edgeIcon('panel')} 在办${active ? ` <span class="task-toggle-count">${active}</span>` : ''}</button>
      </div>
    </header>
    <div class="agent-home-layout ${S.agentTaskPane ? 'with-agent-tasks' : ''}">
      <section class="agent-conversation" aria-label="与贾维斯的对话">
        <div class="conversation-scroll" data-flow-scroll="home">
          <div class="transcript home-transcript"><div class="agent-date"><span>${DEMO_DAY}</span></div>
            ${S.home.map((message,index) => `<div class="agent-turn" id="home-turn-${index}" tabindex="-1">${msgHtml(message)}</div>`).join('')}
            ${S.homeReplying ? '<div class="agent-thinking" role="status"><i class="spin"></i> 贾维斯正在回复</div>' : ''}
          </div>
        </div>
        <div class="composer-tray"><div class="composer-inner">
          <div class="agent-suggestions">${(S.me === 'csy' ? HOME_PROMPTS : []).map(([label,action,text]) =>
            `<button data-a="${action}" data-x="${esc(text)}">${esc(label)}</button>`).join('')}</div>
          ${homeComposer()}
        </div></div>
      </section>
      ${S.agentTaskPane ? taskPaneHtml() : ''}
    </div>
  </section>`;
}
/* v9：轻应用（在工作台里做出来、只属于本人的应用）。状态来自工作台桥；应用界面在这里统一渲染。 */
const enabledApps = () => (WB()?.apps() || []).filter(a => a.enabled);
const KEY_DOCS = [
  { no:'深府办函〔2026〕218号', t:'关于报送2027年政务信息化项目需求的通知', from:'市政府办公厅', level:'特急', due:'今天 17:00', left:0, st:'待签收', note:'领导批示：请应用推进处牵头，今日内报送' },
  { no:'粤政数函〔2026〕96号', t:'关于开展政务数据安全专项检查的通知', from:'省政务服务和数据管理局', level:'加急', due:'11-26', left:2, st:'办理中', note:'需填报自查表，数字安全管理处会签' },
  { no:'市政数局〔2026〕143号', t:'关于第三季度政务服务好差评整改情况的督办单', from:'局办公室（督办）', level:'加急', due:'11-27', left:3, st:'办理中', note:'督办件 · 逾期将通报' },
  { no:'深财预〔2026〕57号', t:'关于做好2027年部门预算编制工作的补充通知', from:'市财政局', level:'平件', due:'11-28', left:4, st:'待阅', note:'与「2027 预算」事项相关' },
  { no:'市政数局办〔2026〕21号', t:'关于报送年度工作总结和2027年工作计划的通知', from:'局办公室', level:'平件', due:'12-05', left:9, st:'待阅', note:'' },
];
const appBadge = id => id === 'app-key-docs' ? `${KEY_DOCS.filter(d => d.left <= 3).length} 件 3 日内到期 · 1 件特急` : '点开使用';
function keyDocsHtml(){
  const f = S.kdFilter || 'all';
  const rows = KEY_DOCS.filter(d => f === 'all' || (f === 'urgent' && d.level !== '平件') || (f === 'due' && d.left <= 3));
  return `<div class="kd-tabs">${[['all','全部 ' + KEY_DOCS.length],['urgent','特急/加急'],['due','3 日内到期']].map(([k,l]) => `<button class="${f === k ? 'on' : ''}" data-a="kdFilter" data-x="${k}">${l}</button>`).join('')}</div>
    <div class="kd-list">${rows.map(d => `<div class="kd-row"><span class="kd-level ${d.level === '特急' ? 'hot' : d.level === '加急' ? 'warm' : ''}">${d.level}</span>
      <div class="grow"><b>${esc(d.t)}</b><small>${esc(d.no)} · ${esc(d.from)} · ${esc(d.st)}</small>${d.note ? `<small class="kd-note">${esc(d.note)}</small>` : ''}</div>
      <div class="kd-due ${d.left <= 1 ? 'hot' : d.left <= 3 ? 'warm' : ''}"><b>${d.left === 0 ? '今天到期' : '剩 ' + d.left + ' 天'}</b><small>时限 ${esc(d.due)}</small></div>
      <div class="kd-acts"><button class="btn sm" data-a="toast" data-x="原型：在 OA 中打开「${esc(d.no)}」">在 OA 打开</button><button class="btn sm" data-a="kdGive" data-x="${esc(d.no)}">交给贾维斯</button></div></div>`).join('')}</div>`;
}
function taskPaneHtml(){
  const counts = agentTaskCounts();
  const running = counts.run || 0;
  const attention = counts.attention || 0;
  const order = ['attention','run','waiting','queue','paused','done'];
  const visible = order.filter(key=>counts[key] && (S.agentTaskFilter !== 'open' || key !== 'done'));
  return `<aside class="agent-task-pane" id="agent-tasks-panel" aria-label="分身在办">
    <div class="agent-task-head">
      <h2>分身在办</h2><button class="btn icon-only" data-a="agentTasksToggle" aria-label="收起分身在办">×</button>
      <div class="agent-task-summary"><span><i class="task-running-dot"></i>${running} 件在办</span>
        ${attention ? `<span class="task-needs">${attention} 件需要你</span>` : ''}</div>
    </div>
    ${enabledApps().length ? `<div class="home-apps"><h3>我的轻应用</h3>${enabledApps().map(app => `<button class="home-app" data-a="appOpen" data-x="${app.id}"><span class="home-app-ico">◔</span><span class="grow"><b>${esc(app.name)}</b><small>${appBadge(app.id)}</small><em class="home-app-src">基于 OA办公系统连接器</em></span><span class="mut">↗</span></button>`).join('')}</div>` : ''}
    <div class="agent-task-filters" aria-label="在办筛选">
      ${[['all','全部'],['open','未结束']].map(([key,label])=>`<button data-a="agentTaskFilter" data-x="${key}" aria-pressed="${S.agentTaskFilter===key}">${label}</button>`).join('')}
    </div>
    <div class="agent-task-list" data-sc="agent-task-list">
      ${visible.map(phase=>`<section class="agent-task-group">
        <h3>${AGENT_STATES[phase][0]} <span>${counts[phase]}</span></h3>
        ${AGENT_TASKS.filter(j=>j.phase===phase).map(taskRowHtml).join('')}</section>`).join('')
        || '<p class="agent-task-empty">分身当前没有在办的事。</p>'}
    </div>
  </aside>`;
}
function taskRowHtml(job){
  const [label,tone] = AGENT_STATES[job.phase];
  const open = S.agentTaskOpen===job.id;
  const stepDone = job.steps.filter(step=>step.complete).length;
  const ability = job.phase === 'run' && job.steps.length;
  return `<article class="agent-task-entry ${open ? 'entry-open' : ''}" id="entry-${esc(job.id)}">
    <button class="agent-task-row" data-a="agentTaskToggle" data-x="${esc(job.id)}" aria-expanded="${open}">
      <span class="agent-task-row-title"><strong>${esc(job.title)}</strong><span aria-hidden="true">${open ? '⌃' : '›'}</span></span>
      <span class="agent-task-row-stage">${esc(job.stage)}</span>
      ${ability ? `<span class="agent-task-progress"><span class="agent-task-line"><i style="width:${Math.round(stepDone/job.steps.length*100)}%"></i></span><small>${stepDone}/${job.steps.length}</small></span>` : ''}
    </button>
    ${!open && job.phase === 'attention' && job.action ? `<button class="agent-task-quick" data-a="go" data-x="${esc(job.action[1])}">${esc(job.action[0])} ↗</button>` : ''}
    ${open ? taskDetailsHtml(job,tone,label) : ''}
  </article>`;
}
function taskDetailsHtml(job,tone,label){
  const sources = [...job.sources, ...(job.dynamicSource ? [job.dynamicSource] : [])];
  const sessions = job.sessions.map(sess).filter(Boolean);
  return `<div class="agent-task-detail">
    <div class="agent-task-detail-state"><span class="tag ${tone}">${label}</span><p>${esc(job.request)}</p></div>
    ${job.result?.length ? `<div class="agent-task-result"><b>结果</b><ul>${job.result.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></div>` : ''}
    ${job.steps.length ? `<ol class="agent-task-steps">${job.steps.map(item=>`<li class="${item.complete ? 'complete' : ''}">
      <span aria-hidden="true">${item.complete ? '✓' : '·'}</span>${esc(item.title)}</li>`).join('')}</ol>` : ''}
    ${sources.length ? `<div class="agent-task-sources"><b>来源</b>
      ${sources.map(([title,route])=>`<button class="btn lk" data-a="go" data-x="${esc(route)}">${esc(title)} ↗</button>`).join('')}</div>` : ''}
    ${sessions.length ? `<div class="agent-task-sources" data-associated-sessions><b>关联会话</b>
      ${sessions.map(s=>`<button class="btn lk" data-a="go" data-x="ws:${s.id}">${esc(wsp(s.ws).name)} · ${esc(s.title)}${s.arch ? '（已归档）' : ''} ↗</button>`).join('')}</div>` : ''}
    ${job.action && !job.action[1].startsWith('ws:') && !sources.some(([,route])=>route===job.action[1])
      ? `<button class="btn sm" data-a="go" data-x="${esc(job.action[1])}">${esc(job.action[0])}</button>` : ''}
  </div>`;
}
function homeTaskCard(id){
  const job = agentTask(id);
  if (!job) return '';
  const [label,tone] = AGENT_STATES[job.phase];
  return `<div class="agent-alert tone-${tone}"><div class="agent-alert-content"><span class="tag ${tone}">${label}</span>
    <strong>${esc(job.title)}</strong><small>${esc(job.stage)}</small></div>
    <button class="btn sm" data-a="agentTaskOpen" data-x="${esc(job.id)}">查看在办 ↗</button></div>`;
}

function seedHome(){
  S.home.push(
    { r:'ai', tm:'08:30', h:'<span class="agent-greeting">思远，早上好。</span> 我把今天的事理了一下。', brief:true },
    { r:'ai', tm:'09:45', h:'十点的周例会快到了。王处长上次问了回退方案，这次汇报可以带上。', alert:{ kind:'reminder', id:'t1' } }
  );
}
function postHomeUpdate(kind, details, h = ''){
  const message = { r:'ai', tm:now(), h, alert:{ kind, ...details } };
  S.home.push(message);
  if (S.page !== 'home' && !S.dot) S.homeUnread++;
}
function homeAlertHtml(alert){
  const {kind,id} = alert;
  if (kind === 'reminder' || kind === 'finish'){
    const t = task(id);
    const handled = t.done;
    const title = kind === 'reminder' ? '事项提醒' : handled ? '事项已完成' : '看起来办完了';
    return homeAlertCard(title, handled ? 'ok' : kind === 'reminder' ? 'ai' : 'warn',
      t.title, kind === 'reminder' ? '今天 10:00 · 二期上线' : '关联事项由你确认完成',
      handled ? '查看记录' : '查看事项','task:' + id);
  }
  if (kind === 'draft'){
    const c = chat(id);
    const sent = c.msgs.some(m => m.draftId === alert.draftId && !m.revoked);
    const active = S.drafts[id]?.id === alert.draftId;
    const title = sent ? '已由你发送' : !active ? '草稿已结束' : S.drafts[id].placed ? '草稿放好了' : '草稿可查看';
    return homeAlertCard(title, sent ? 'ok' : 'ai', '和' + c.n + '的聊天',
      active ? '可以修改，发送由你本人完成' : '', active ? '查看草稿' : '打开聊天','im:' + id);
  }
  const s = sess(id);
  if (!s) return '';
  if (kind === 'block') return homeAlertCard('需要补充资料','warn',s.title,'查看缺少的工作区资料','打开会话','ws:' + id);
  if (kind === 'done'){
    const filename = alert.art && ARTS[alert.art]?.name;
    return homeAlertCard('办完了','ok',s.title,filename || '执行已结束','打开会话','ws:' + id);
  }
  if (kind === 'goal'){
    const done = s.status === 'done';
    return homeAlertCard(done ? '目标已确认' : '待确认目标',done ? 'ok' : 'warn',s.title,'',
      done ? '查看会话' : '去执行区','ws:' + id);
  }
  const resolved = s.steps[alert.step]?.s === 'done';
  const note = kind === 'link' ? '是否将汇总表关联回事项' : '请在执行区查看依据并处理';
  return homeAlertCard(resolved ? '已确认' : '等你确认',resolved ? 'ok' : 'warn',s.title,
    resolved ? '判断已记录在执行区' : note,resolved ? '查看记录' : '去执行区','ws:' + id);
}
function homeAlertCard(status,tone,title,detail,label,target){
  return `<div class="agent-alert tone-${tone}">
    <div class="agent-alert-content"><span class="tag ${tone}">${esc(status)}</span>
      <strong>${esc(title)}</strong>${detail ? `<small>${esc(detail)}</small>` : ''}</div>
    <button class="btn sm" data-a="go" data-x="${esc(target)}">${esc(label)} ↗</button>
  </div>`;
}

function sessionBody(s){
  const done = s.steps.map((step,index) => [step,index]).filter(([step]) => step.s === 'done');
  const active = s.steps.map((step,index) => [step,index]).filter(([step]) => ['run','confirm','send','wait','link','block'].includes(step.s));
  const fold = S.stepOpen[s.id];
  const text = ({
    plan:'计划列好了。你可以先调整步骤，确认后我再执行。',
    confirm:'我核对了测算表和财务通知，有两处需要你判断。',
    send:'草稿已准备好，请在对应的聊天里亲自发送。',
    wait:'已发出询问。绑定聊天收到回复后，我会从这里继续。',
    link:'汇总表已生成，可以预览或对比版本。是否把结果关联回事项？',
    block:'当前工作区缺少可用资料，需要你补充。',
    done:s.budget ? '汇总表和回复已由你发送。可以在事项里检查并勾掉。' : '这轮工作已完成，可以打开成果或继续补充要求。',
    running:'我正在按计划执行，过程与依据会记录在这里。',
    paused:'已暂停。你可以检查计划，再接着执行。',
  })[s.status] || '可以继续补充要求。';
  const latest = s.declaredArt || (s.status === 'done' ? s.arts[0] : s.arts.at(-1));
  return `<div class="turn request"><span class="turn-person">陈</span><div><span class="turn-label">陈思远</span><p>${esc(s.req)}</p></div></div>
    <div class="turn assistant">${mark}<div class="turn-main"><span class="turn-label">贾维斯 <small>${esc(s.time)}</small></span>
      <p>${text}</p>
      ${s.goal ? `<div class="goal-summary"><b>完成标准</b> ${esc(s.goal.std || '由你判断')}</div>` : ''}
      ${s.status === 'plan' ? `<button class="btn acc" data-a="rpTab" data-x="plan">查看并确认计划</button>` : s.status === 'paused' ? `<button class="btn acc" data-a="continueSess" data-x="${s.id}">继续执行</button>` : ''}
      ${done.length ? `<div class="record-stack">
        <button class="record-fold" data-a="stepTog" data-x="${s.id}" aria-expanded="${Boolean(fold)}"><span>${symbol('≡')} 执行记录</span><small>已完成 ${done.length} 步</small><span>${fold ? '⌄' : '›'}</span></button>
        ${fold ? `<div class="record-detail">${done.map(([step,index]) => stepHtml(step,s,index)).join('')}</div>` : ''}
      </div>` : ''}
      ${active.map(([step,index]) => stepHtml(step,s,index)).join('')}
      ${latest ? artifactInline(latest) : ''}
      ${s.status === 'done' && s.budget ? `<div class="delivery-entry">${symbol('✓')} <span>已发送给李娜</span><button class="btn lk" data-a="go" data-x="im:c-lina">查看发送记录</button><button class="btn lk" data-a="go" data-x="task:${s.from.id}">回到事项</button></div>` : ''}
    </div></div>${s.tail.map(msgHtml).join('')}${S.typing ? typingHtml() : ''}`;
}
function artifactInline(id){
  const a = ARTS[id];
  return `<button class="inline-artifact" data-a="reviewArtifact" data-x="${id}">
    ${symbol('▧','artifact-mark')}<span class="grow"><b>${esc(a.name)}</b><small>产物 · ${esc(wsp(sess(a.sess).ws).name)}工作区库</small></span><span class="inline-art-cta">打开审阅 ↗</span></button>`;
}
function pWs(){
  if (S.wsView !== 'sess') return `<div class="workspace-settings">${wsMgr()}</div>`;
  const s = sess(S.cur);
  if (!s) return `<div class="launch-workspace"><div class="launch-inner">
    <div class="home-id">${mark}<span>工作台</span></div><h1>开一个工作会话</h1><p>把目标、工作区和要用的资料准备好。执行记录和成果会留在这个会话。</p>
    <div class="launch-picker"><label for="new-wsp">放进工作区</label><select id="new-wsp">
      ${WSP.map(w => `<option value="${w.id}" ${w.id === (S.newWsp || 'w-def') ? 'selected' : ''}>${esc(w.name)}</option>`).join('')}
    </select></div>${wsComp(null)}
    <div class="quick-prompt"><button data-a="wsQuick" data-x="汇总工作区里各科室的测算表">用工作区资料做汇总</button><button data-a="wsQuick" data-x="对照现有资料，整理迎检准备清单">整理迎检准备清单</button></div>
  </div></div>`;
  const tag = stTag(s);
  return `<div class="session-layout ${S.rpOpen ? 'with-dock' : ''} ${S.rpWide ? 'wide-dock' : ''}">
    <section class="session-main"><div class="section-head session-head"><div class="grow"><div class="row"><h2>${esc(s.title)}</h2><span class="tag ${tag[0]}">${tag[1]}</span></div>
      <div class="session-meta"><span>${esc(wsp(s.ws).name)}</span><span>·</span><span>${esc(modeName(s.mode))}</span>
      ${s.from ? `<button class="btn lk" data-a="go" data-x="task:${s.from.id}">来源事项 ↗</button>` : ''}</div></div>
      <div class="session-tools"><button class="btn icon-only" data-a="sessMenu" data-x="${s.id}" aria-label="会话菜单">···</button>
      <button class="btn ${S.rpOpen ? 'active' : ''}" data-a="${S.rpOpen ? 'rpClose' : 'rpOpen'}" aria-expanded="${S.rpOpen}">${symbol('◫')} 工作区面板</button></div>
    </div>
    <div class="conversation-scroll" data-flow-scroll="ws:${s.id}"><div class="transcript">${sessionBody(s)}</div></div>
    <div class="composer-tray"><div class="composer-inner">
      ${s.status === 'done' ? '<div class="follow-ups"><button data-a="fillFollow" data-x="请列出这份成果的主要依据。">核对主要依据</button><button data-a="fillFollow" data-x="请把仍需跟进的事项和材料单独列出来。">继续补充要求</button></div>' : ''}
      ${wsComp(s)}</div></div></section>
    ${S.rpOpen ? workspaceDock(s) : ''}</div>`;
}
function workspaceDock(s){
  const tabs = [['art','产物'],['plan','计划'],['ctx','上下文'],['bg','后台']];
  const body = S.rp === 'art' ? reviewDock(s) : ({plan:planPanel,ctx:ctxPanel,bg:bgPanel})[S.rp](s);
  return `<aside class="workspace-dock" aria-label="工作区面板">
    <div class="dock-head"><span class="grow">工作区面板</span><button class="btn icon-only" data-a="rpWide" aria-label="${S.rpWide ? '恢复面板宽度' : '加宽面板'}">${S.rpWide ? '↔' : '⤢'}</button><button class="btn icon-only" data-a="rpClose" aria-label="收起面板">×</button></div>
    <nav class="dock-tabs">${tabs.map(([id,label]) => `<button class="${S.rp === id ? 'on' : ''}" data-a="rpTab" data-x="${id}">${label}${id === 'ctx' ? ' ' + ctxCount(s) : ''}</button>`).join('')}</nav>
    <div class="dock-body" data-sc="dock-${s.id}-${S.rp}">${body}</div></aside>`;
}
function reviewDock(s){
  const tabs = S.reviewTabs[s.id] || [];
  const chosen = ARTS[S.reviewActive[s.id]];
  if (!chosen || !tabs.includes(S.reviewActive[s.id])) return artPanel(s);
  const id = S.reviewActive[s.id];
  const vers = s.arts.filter(k => ARTS[k].name.replace(/ v\d+(\.\w+)$/, '$1') === chosen.name.replace(/ v\d+(\.\w+)$/, '$1'));
  return `<div class="review-dock">
    <div class="review-tabs"><button class="review-root" data-a="reviewList" title="产物根目录">产物文件</button>
      ${tabs.map(k => `<div class="review-tab ${id === k ? 'on' : ''}"><button data-a="reviewArtifact" data-x="${k}" title="${esc(ARTS[k].name)}">${esc(ARTS[k].name.match(/v\d+/)?.[0] || '预览')}</button><button data-a="reviewClose" data-x="${k}" aria-label="关闭此版本">×</button></div>`).join('')}</div>
    <div class="review-title"><h3>${esc(chosen.name)}</h3><small>${esc(wsp(s.ws).name)}工作区库 · ${esc(chosen.time)}</small></div>
    <div class="review-actions">
      ${vers.length > 1 ? `<label>版本 <select data-review-ver aria-label="产物版本">${vers.map((k,i) => `<option value="${k}" ${id === k ? 'selected' : ''}>${esc(ARTS[k].name.match(/v\d+/)?.[0] || '版本 ' + (i+1))}</option>`).join('')}</select></label><button class="btn sm" data-a="artCmp" data-x="${vers[0]}" data-y="${vers.at(-1)}">对比</button>` : ''}
      <button class="btn sm" data-a="openArt" data-x="${id}">全屏</button><button class="btn sm" data-a="artExport" data-x="${id}">下载</button>
      <button class="btn sm acc" data-a="reviewFeedback" data-x="${id}">批注给贾维斯</button>
    </div>
    <div class="review-document">${artBody(chosen.kind,chosen.name,id)}</div>
    ${(S.reviewNotes[id] || []).map(note => `<div class="review-note"><small>批注 · ${esc(note.time)}</small><p>${esc(note.text)}</p></div>`).join('')}
    <div class="review-bottom"><button class="btn sm" data-a="artToChat" data-x="${id}">发到群</button><button class="btn sm" data-a="artToTask" data-x="${id}">建成事项</button><button class="btn sm" data-a="artAddTo" data-x="${id}">加到事项</button></div>
  </div>`;
}

function comp(id, ph, act, opts = {}){
  return `<div class="comp ${opts.sm ? 'sm' : ''}">${opts.top || ''}<textarea id="${id}" data-keep data-enter="${act}" placeholder="${esc(ph)}">${esc(val(id))}</textarea>
    <div class="ct">${opts.sm && !opts.tools ? '' : `<button class="plus" data-a="toast" data-x="原型：上传附件，或引用事项、资料库文件、笔记">＋</button><span class="opt" data-a="toast" data-x="原型：@ 引用事项、文件、聊天、笔记">@ 引用</span>`}${opts.extra || ''}<span class="grow"></span><button class="send" data-a="${act}" aria-label="${act === 'imSend' ? '发送消息' : '发送'}">${act === 'imSend' ? '发送' : '↑'}</button></div></div>`;
}

/* ---------- 首页 ---------- */
function msgHtml(m){
  if (m.r === 'me') return `<div class="m me"><div class="bb">${m.h}</div></div>`;
  const cards = (m.cards || []).map(c => {
    if (c.sess){ const s = sess(c.sess); return `<div class="scard" data-a="go" data-x="ws:${s.id}"><span class="orb xs ${s.status === 'running' ? 'busy' : ''}"></span><div class="grow"><b>工作台 · ${esc(s.title)}</b><small>${s.status === 'running' ? '<i class="spin" style="width:9px;height:9px;border-width:1.5px"></i> ' : ''}${esc(sessStat(s))}</small></div><span class="mut">→</span></div>`; }
    return '';
  }).join('');
  const acts = m.acts ? `<div class="acts">${m.acts.map(([l, a, x], i) => `<button class="btn sm ${i === 0 ? 'pri' : ''}" data-a="${a}" data-x="${esc(x || '')}">${l}</button>`).join('')}</div>` : '';
  return `<div class="m ai">${S.page === 'home' || S.dot ? agentSignal(m.alert && ['confirm','link','block'].includes(m.alert.kind) && sess(m.alert.id)?.steps[m.alert.step]?.s !== 'done' ? 'attention' : 'ready') : S.page === 'ws' ? mark : '<span class="orb md"></span>'}<div class="bb"><div class="w">${NAME}${m.tm ? ' · ' + m.tm : ''}</div>${m.h}${m.brief ? briefHtml() : ''}${m.alert ? homeAlertHtml(m.alert) : ''}${m.agentJob ? homeTaskCard(m.agentJob) : (m.agentJobs || []).map(homeTaskCard).join('')}${m.draftProposal ? homeDraftProposalHtml(m.draftProposal) : ''}${m.pre ? preHtml(m.pre) : ''}${cards}${m.art ? artifactInline(m.art) : ''}${acts}</div></div>`;
}
/* 预填卡片：分身预填，人确认后才生效 */
S.pre = {};
const LOPTS = () => ['收件箱', ...LISTS];
function dOpts(sel){ return [[null,'无日期'],[16,'今天'],[17,'明天'],[18,'11-18 周三'],[19,'11-19 周四'],[20,'11-20 周五'],[23,'11-23 周一'],[27,'11-27 周五']].map(([v, l]) => `<option value="${v}" ${v === sel ? 'selected' : ''}>${l}</option>`).join(''); }
function preHtml(id){
  const p = S.pre[id]; if (!p) return '';
  if (p.st === 'ok') return `<div class="scard" style="cursor:default"><span class="tag ok">已建成</span><div class="grow">${p.kind === 'note' ? '笔记' : '事项'}「${esc(p.title)}」</div><button class="btn sm" data-a="go" data-x="${p.kind === 'note' ? 'note' : 'task'}:${p.rid}">查看</button></div>`;
  if (p.st === 'no') return `<div class="scard" style="cursor:default"><span class="tag">已取消</span><div class="grow mut">没有创建任何${p.kind === 'note' ? '笔记' : '事项'}</div></div>`;
  const f = p.kind === 'note'
    ? `<div class="form"><span class="mut">标题</span><input id="pre-t-${id}" data-keep value="${esc(S.inp['pre-t-' + id] ?? p.title)}"><span class="mut">内容</span><input id="pre-b-${id}" data-keep value="${esc(val('pre-b-' + id) || p.body)}"></div>`
    : `<div class="form"><span class="mut">标题</span><input id="pre-t-${id}" data-keep value="${esc(S.inp['pre-t-' + id] ?? p.title)}"><label for="pre-desc-${id}" class="mut">描述</label><textarea id="pre-desc-${id}" rows="2">${esc(p.desc || p.ctx || "")}</textarea><span class="mut">期限</span><select id="pre-d-${id}">${dOpts(p.d)}</select><span class="mut">清单</span><select id="pre-l-${id}">${LOPTS().map(l => `<option ${l === p.list ? 'selected' : ''}>${l}</option>`).join('')}</select><span class="mut">来源</span><span>${esc(p.src.l)}</span>${p.bind ? `<span class="mut">绑定</span><label><input type="checkbox" id="pre-bd-${id}" checked style="width:auto"> 绑定「${esc(chat(p.bind).n)}」，后续消息由分身跟踪</label>` : ''}</div>`;
  return `<div class="brief" style="padding:10px 14px"><div class="row"><span class="tag ai">预填 · ${p.kind === 'note' ? '笔记' : '事项'}</span><small>改好后点确认才会创建</small></div>${f}<div class="acts" style="margin-top:0"><button class="btn sm pri" data-a="preOk" data-x="${id}">确认${p.kind === 'note' ? '保存' : '建成'}</button><button class="btn sm" data-a="preNo" data-x="${id}">取消</button></div></div>`;
}
function newPre(p){ const id = uid('p'); S.pre[id] = Object.assign({ st:'open' }, p); return id; }
/* 弹窗版预填（从消息、笔记、文件、产物里建成事项） */
function preDlg(p){
  const id = newPre(p);
  $('#mask').innerHTML = `<div class="dlg" data-stop><div class="hd"><span class="orb xs"></span><b class="grow">${p.kind === "note" ? "记到笔记" : "建成事项"}</b><small>分身已预填，改好后确认</small></div><div class="bd2">${p.ctx ? `<div class="quote">${esc(p.ctx)}</div>` : ''}<div id="pre-dlg">${preHtml(id).replace(/<div class="acts"[\s\S]*$/, '</div>')}</div></div>
    <div class="ft2"><button class="btn" data-a="preNo" data-x="${id}">取消</button><button class="btn pri" data-a="preOk" data-x="${id}">确认${p.kind === "note" ? "保存" : "建成"}</button></div></div>`;
  $('#mask').classList.add('on');
}
function addToDlg(ctx, source, items){
  S.addCtx = { items:items || [[source, ctx]] };
  dialog('加到事项', `<div class="quote">${esc(ctx)}</div>
    <label for="add-ctx-search" class="mut">搜索未完成事项</label>
    <input id="add-ctx-search" class="context-search" placeholder="输入名称或清单">
    <div id="add-ctx-items"></div>`,
    '<button class="btn" data-a="closeMask">取消</button><button class="btn pri" data-a="addToOk">确认加入</button>');
  updateContextChoices('');
  $('#add-ctx-search').focus();
}
function updateContextChoices(query){
  const text = query.trim().toLowerCase();
  const noteItem = S.addCtx?.items.find(item => item[2]?.link?.startsWith('note:'));
  $('#add-ctx-items').innerHTML = TASKS.filter(t => !t.done && `${t.title} ${t.list}`.toLowerCase().includes(text))
    .flatMap(t => [`<label class="chk"><input type="radio" name="add-ctx-target" value="${t.id}"><span class="grow">${esc(t.title)}</span><small>${esc(t.org ? '组织事项 · 上下文' : t.list)}</small></label>`,
      ...(t.org && noteItem && isOwner(t) ? t.org.nodes.filter(n => n.link && !n.linked).map(n => `<label class="chk"><input type="radio" name="add-ctx-target" value="${t.id}|${n.id}"><span class="grow">${esc(t.title)} › ${n.id} ${esc(n.t)}</span><small>关联到节点</small></label>`) : [])])
    .join('') || '<p class="mut">没有符合条件的事项</p>';
}
const typingHtml = () => S.typing ? `<div class="m ai"><span class="orb md busy"></span><div class="bb"><div class="typing" style="padding-top:10px"><span></span><span></span><span></span></div></div></div>` : '';

function briefHtml(){
  const l = chat('c-lina');
  const work = task(S.budgetTask);
  const active = work && sess(work.fs);
  const weekly = task('t1');
  const report = task('t4');
  const rows = [
    ...(!l.replied || work?.looks ? [[
      work?.looks ? '可确认办完' : active?.status === 'confirm' ? '等你确认' : work ? '已建成事项' : '等你回复',
      '2027 年预算测算汇总','李娜 · 周五前需要','warn',
      active?.status === 'confirm' ? '去执行区' : work ? '查看事项' : '打开原消息',
      active?.status === 'confirm' ? 'ws:' + active.id : work ? 'task:' + work.id : 'msg:m-lina'
    ]] : []),
    ...(!weekly.done ? [['今天 10:00','二期进展周例会','应用推进处 · 汇报测试与预算','ai','查看事项','task:t1']] : []),
    ...(!report.done && report.d < 16 ? [['已逾期','刘洋的测试报告','二期上线 · 仍在等回复','wait','查看事项','task:t4']] : []),
  ];
  return `<section class="agent-brief" aria-label="晨报">
    <div class="agent-brief-head"><span class="agent-brief-icon">${symbol('☷')}</span>
      <div class="grow"><b>今日晨报</b><small>${DEMO_DAY}</small></div><span class="p1" title="晨报定时推送属于 P1">P1 演示</span></div>
    ${rows.map(([status,title,detail,tone,label,target]) =>
      `<button class="agent-brief-row" data-a="go" data-x="${target}">
        <span class="agent-brief-summary"><strong>${esc(title)}</strong><small>${esc(detail)}</small></span>
        <span class="tag ${tone}">${esc(status)}</span><span class="agent-brief-link">${esc(label)} ↗</span></button>`).join('')
      || '<div class="agent-brief-empty">当前没有需要你处理的事项。</div>'}</section>`;
}

/* ---------- 小球 ---------- */
function ctxNow(){
  if (S.page === 'ws') return '工作台';
  if (S.page === 'tasks') return S.tsel ? '事项 · ' + task(S.tsel).title : '事项';
  if (S.page === 'im') return '和「' + chat(S.chat).n + '」的聊天';
  if (S.page === 'notes') return '笔记 · ' + (note(S.nsel)?.title || '');
  if (S.page === 'lib') return S.fsel ? '资料 · ' + fileById(S.fsel).name : '资料库';
  return '';
}
function dotHtml(){
  if (S.page === 'home') return '';
  const conf = SESS.filter(s => !s.arch && ['confirm','link','plan','block'].includes(s.status)).length;
  const signal = agentTaskCounts().attention ? 'attention' : '';
  const btn = `<button class="dot" data-a="dot" aria-label="问${NAME}">${agentSignal(signal)}${conf && !S.dot ? `<span class="bd">${conf}</span>` : ''}<span class="tip">问${NAME} · ⌘J</span></button>`;
  if (!S.dot) return btn;
  return btn + `<div class="dpop" data-stop>
    <div class="hd">${agentSignal(signal)}<div class="grow"><b>${NAME}</b><br><small>${agentPresence()}</small></div><button class="btn sm" data-a="go" data-x="home">在首页打开</button><button class="btn sm" data-a="dot">✕</button></div>
    <div class="ctx">◉ 正在看：${esc(ctxNow())}</div>
    <div class="ms" data-bottom>${S.home.length ? S.home.slice(-8).map(msgHtml).join('') : `<div class="m ai"><span class="orb md"></span><div class="bb"><div class="w">${NAME}</div>我能看到你正在看的内容。要我做什么？</div></div>`}${typingHtml()}</div>
    <div class="ft">${comp('dot-in', '关于正在看的，问我或交代我……', 'dotSend', { sm:1 })}</div></div>`;
}

/* ---------- 工作台 ---------- */
function stepHtml(st, s, idx){
  const ic = { done:'✓', run:'<i class="spin"></i>', todo:'', confirm:'!', wait:'…', send:'↗', link:'!', block:'!' }[st.s];
  const kl = { plan:'计划', conn:'连接器', expert:'专家', skill:'技能', write:'生成', wait:'等回复', im:'起草消息', deliver:'交付', link:'关联产物', block:'缺少资料', confirm:'确认点' }[st.k];
  let extra = '';
  if (st.s === 'confirm'){ const c = CP[st.cp]; extra = `<div class="cp"><div class="q">确认点 · ${c.q}</div><div class="why">为什么停下：${c.why}</div>${c.body}<div style="margin:-4px 0 8px">${evHtml(c.ev)}</div><div class="acts">${c.opts.map(([k, l, p]) => `<button class="btn ${p ? 'pri' : ''}" data-a="cp" data-x="${s.id}" data-y="${k}">${l}</button>`).join('')}<button class="btn lk" data-a="openArt" data-x="${s.budget.v1}">先看看表</button></div><label style="display:flex;gap:6px;align-items:center;margin-top:8px;font-size:12.5px"><input type="checkbox" id="cpk-${s.id}"> 以后都这样处理（记成你的规则，可在「分身记得的」里改）</label></div>`; }
  if (st.s === 'wait' || st.s === 'send'){
    const waiting = st.s === 'wait';
    extra = `<div class="cp waiting"><div class="q">${waiting ? '等回复 · ' + esc(st.wt || '') : '等你发送'}</div>
      <div class="why">${waiting ? '系统通过事项绑定的聊天接收回复。收到后继续。' : '草稿已放进对应的聊天，由你本人发送。'}</div>
      <div class="acts">${st.chats.map(id => `<button class="btn sm" data-a="go" data-x="im:${id}">去「${esc(chat(id).n)}」${st.sent.includes(id) ? ' · 已发送' : ''}</button>`).join('')}</div>
      </div>`;
  }

  if (st.s === 'link') extra = `<div class="cp"><div class="q">将汇总表关联到事项？</div>
    <p class="mut">你确认后，事项的上下文会增加这份汇总表。</p><div class="acts">
    <button class="btn pri" data-a="linkBudget" data-x="${s.id}" data-y="yes">确认关联</button>
    <button class="btn" data-a="linkBudget" data-x="${s.id}" data-y="skip">跳过</button>
    <button class="btn" data-a="openArt" data-x="${st.artRef}">预览汇总表</button></div></div>`;
  if (st.s === 'block') extra = `<div class="cp"><div class="q">缺少预算资料</div>
    <p>请先在「2027 预算」工作区库准备科室测算表，并确认财务通知已向量化。</p>
    <button class="btn" data-a="go" data-x="lib:w-ys">打开工作区库</button>
    <button class="btn" data-a="go" data-x="task:${s.from.id}">返回事项</button></div>`;
  if (st.s === 'planned') extra = '';
  if (st.k === 'expert' && st.s === 'done') extra += `<div class="nest">专家「${esc(st.t.replace(/^.*「|」.*$/g, ''))}」· 核对了 3 处关键内容，未发现问题</div>`;
  if (st.art && st.s === 'done' && ARTS[st.art]) extra += `<div><span class="achip" data-a="artSel" data-x="${st.art}">${extIco(ARTS[st.art].type)}${esc(ARTS[st.art].name)}</span></div>`;
  const rw = st.s === 'done' && s.status !== 'running' ? `<button class="rw" data-a="rewind" data-x="${s.id}" data-y="${idx}">↺ 回到这一步</button>` : '';
  return `<div class="step ${(['wait','send','link','block'].includes(st.s)) ? 'confirm' : st.s === 'planned' ? 'todo' : st.s}"><span class="ic">${ic || ''}</span><div class="sb"><div class="st"><span class="kd k-${st.k}">${kl}</span><b>${esc(st.t)}</b>${rw}${st.tm && st.s === 'done' ? `<span class="tm">${st.tm}</span>` : ''}</div>${st.d && st.s !== 'todo' && st.s !== 'planned' ? `<div class="sd">${st.d}${st.s === 'done' ? evHtml(st.ev) : ''}</div>` : st.s === 'done' && st.ev ? `<div class="sd">${evHtml(st.ev)}</div>` : ''}${extra}</div></div>`;
}
const stTag = s => ({ done:['ok','已完成'], confirm:['warn','等你确认'], wait:['wait','等回复'], paused:['','已暂停'], send:['wait','等你发送'], link:['warn','等你确认'], block:['warn','缺少资料'], running:['ai','执行中'], plan:['','计划待确认'] })[s.status] || ['ai','执行中'];
const MODES = [['def','默认'],['plan','先出计划'],['goal','按目标推进']];
const modeName = m => (MODES.find(x => x[0] === m) || MODES[0])[1];
function ctxCount(s){ const c = s && s.ctx || { in:[], hit:[] }; return c.in.length + c.hit.length + ((S.refs[s ? s.id : 'new'] || []).length); }
function ctxPanel(s){
  if (!s) return '<div class="hint">打开一个会话，这里显示分身办这件事用到的背景</div>';
  const c = s.ctx || { in:[], hit:[] };
  return `<div class="hint">分身办这件事时用到的背景。移除只影响本次，不删原文</div><div class="pl6"><b style="font-size:12px">带入的（引用、绑定、工作区库）</b><div style="margin-top:6px">${c.in.map((item, i) => `<span class="cx">${esc(item[0])} · ${esc(item[1])}${contextSource(item)}<button data-a="ctxDel" data-x="${s.id}" data-y="in:${i}">✕</button></span>`).join('') || '<span class="mut">无</span>'}</div>
    <b style="font-size:12px;display:block;margin-top:10px">检索到的（已向量化的文件、以往做法）</b><div style="margin-top:6px">${c.hit.map(([k, l, r, ref], i) => `<span class="cx">${k} · ${esc(l)} <span class="rl">${r}</span>${contextSource([k,l,ref])}<button data-a="ctxDel" data-x="${s.id}" data-y="hit:${i}">✕</button></span>`).join('') || '<span class="mut">无</span>'}</div>
    <button class="btn sm" style="margin-top:10px" data-a="refPick" data-x="${s.id}">＋ @ 引用事项、文件、聊天、笔记</button></div>`;
}
const protectsPlanStep = (s, step) => Boolean(s.budget && ['confirm','write','block'].includes(step.k));
function planPanel(s){
  if (!s) return '<div class="hint">打开一个会话，这里显示分身列出的计划，执行时逐项打勾</div>';
  const isPlan = s.status === 'plan';
  return `<div class="hint">${isPlan ? '先出计划模式：可以删改步骤，确认后才开始执行' : '分身列出的步骤，执行时逐项打勾'}</div><div class="pl6">${s.steps.map((st, k) => `<div class="r"><span class="ck ${st.s === 'done' ? 'on' : ''}" style="${st.s === 'confirm' || st.s === 'wait' ? 'border-color:var(--warn)' : ''}">${st.s === 'done' ? '✓' : ''}</span><span class="grow" style="${st.s === 'done' ? 'color:var(--ink3)' : ''}">${esc(st.t)}${['confirm','link'].includes(st.s) ? ' <span class="tag warn">等你确认</span>' : st.s === 'wait' ? ' <span class="tag wait">等回复</span>' : st.s === 'run' ? ' <i class="spin"></i>' : ''}</span>${isPlan ? `<div class="plan-controls"><button class="btn sm" data-a="planMove" data-x="${s.id}" data-y="${k}:-1" aria-label="上移第 ${k+1} 步" ${k===0 || protectsPlanStep(s,st) || protectsPlanStep(s,s.steps[k-1]) ? 'disabled' : ''}>↑</button><button class="btn sm" data-a="planMove" data-x="${s.id}" data-y="${k}:1" aria-label="下移第 ${k+1} 步" ${k===s.steps.length-1 || protectsPlanStep(s,st) || protectsPlanStep(s,s.steps[k+1]) ? 'disabled' : ''}>↓</button><button class="btn lk" data-a="planDel" data-x="${s.id}" data-y="${k}" ${protectsPlanStep(s,st) ? 'disabled title="此步骤用于生成汇总或保留确认边界"' : ''}>删除</button></div>` : ''}</div>`).join('')}
    ${isPlan ? `<div class="sub" style="margin-top:6px"><span style="color:var(--acc)">＋</span><input id="padd-${s.id}" data-keep data-enter="planAdd" placeholder="加一步，回车保存" style="border:none;outline:none;flex:1;font-size:13px;background:none" value="${esc(val('padd-' + s.id))}"></div><button class="btn pri" style="margin-top:10px;width:100%" data-a="planGo" data-x="${s.id}">确认计划，开始执行</button>` : ''}</div>`;
}
function bgPanel(){
  const ls = SESS.filter(x => ['running','confirm','send','wait','link'].includes(x.status));
  return `<div class="hint">正在执行、等你确认、等回复的会话。它们在后台继续，办完会在对话里通知你</div><div class="pl6">${ls.map(x => `<div class="r" style="cursor:pointer" data-a="go" data-x="ws:${x.id}"><span class="tag ${stTag(x)[0]}">${stTag(x)[1]}</span><span class="grow">${esc(x.title)}<br><small>${esc(wsp(x.ws || 'w-def').name)} · ${esc(sessStat(x))}</small></span></div>`).join('') || '<div class="mut">没有在后台运行的会话</div>'}</div>`;
}
function artPanel(s){
  const ids = S.artTab === 'sess' ? (s ? s.arts : []) : Object.keys(ARTS).filter(k => !s || sess(ARTS[k].sess)?.ws === s.ws).reverse();
  if (!S.artSel || !ARTS[S.artSel] || !ids.includes(S.artSel)) S.artSel = ids[ids.length - 1] || null;
  const a = S.artSel && ARTS[S.artSel];
  const base = n => String(n || '').replace(/ v\d+(\.\w+)$/, '$1');
  const vers = a ? Object.entries(ARTS).filter(([k, x]) => x.sess === a.sess && base(x.name) === base(a.name)) : [];
  const out = `<div style="padding:8px 14px 0"><div class="tabs"><span class="${S.artTab === 'sess' ? 'on' : ''}" data-a="artTab" data-x="sess">本会话 ${s ? s.arts.length : 0}</span><span class="${S.artTab === 'all' ? 'on' : ''}" data-a="artTab" data-x="all">本工作区全部</span><span class="grow"></span><small style="padding:6px 0">自动存进工作区库</small></div></div>
    <div class="al" data-sc="al">${ids.length ? ids.map(k => `<div class="ai2 ${S.artSel === k ? 'on' : ''} ${S.newArt === k ? 'new' : ''}" data-a="artSel" data-x="${k}">${extIco(ARTS[k].type)}<div class="grow"><div class="t">${esc(ARTS[k].name)}</div><small>${ARTS[k].time}</small></div></div>`).join('') : '<div class="mut" style="padding:20px 8px;text-align:center">还没有产物。办完后出现在这里</div>'}</div>
    ${a ? `<div class="pv"><div class="ph2"><b style="font-size:12.5px" class="grow">${esc(a.name)}</b>${vers.length > 1 ? `<select data-a2="verSel" style="border:1px solid var(--line);border-radius:6px;font-size:12px">${vers.map(([k, x]) => `<option value="${k}" ${k === S.artSel ? 'selected' : ''}>${(x.name.match(/ (v\d+)\./) || [, 'v1'])[1]}${k === vers[vers.length - 1][0] ? '（最新）' : ''}</option>`).join('')}</select><button class="btn sm" data-a="artCmp" data-x="${vers[0][0]}" data-y="${vers[vers.length - 1][0]}">对比</button>` : ''}</div>
      <div class="ph2" style="padding-top:0"><button class="btn sm" data-a="openArt" data-x="${S.artSel}">⤢ 全屏</button><button class="btn sm" data-a="artExport" data-x="${S.artSel}">下载</button><button class="btn sm" data-a="artToChat" data-x="${S.artSel}">发到群</button><button class="btn sm" data-a="artToTask" data-x="${S.artSel}">建成事项</button><button class="btn sm" data-a="artAddTo" data-x="${S.artSel}">加到事项</button></div>
      <div class="box">${artBody(a.kind, a.name, S.artSel)}</div><div class="note">旧版本保留 · <a href="#" data-a="go" data-x="file:${S.artSel}" style="color:var(--acc)">在工作区库查看</a></div></div>` : ''}`;
  S.newArt = null;
  return out;
}
function wsComp(s){
  const key = s ? s.id : 'new';
  const refs = S.refs[key] || [];
  const queued = s?.queue?.length || 0;
  const note = S.pendingReview[key];
  const mode = s?.mode || S.newMode || 'def';
  const sources = ctxCount(s);
  return `<div class="work-composer">
    ${queued ? `<div class="composer-queue">${symbol('◷')} 排队 ${queued} 条 · 当前步骤结束后处理</div>` : ''}
    ${refs.length || note ? `<div class="compose-refs">${refs.map(([type,label],i) => `<span class="inline-ref">${esc(type)} · ${esc(label)}<button data-a="refDel" data-x="${key}" data-y="${i}" aria-label="移除引用">×</button></span>`).join('')}
      ${note ? `<span class="inline-ref">${symbol('✎')} ${esc(ARTS[note.id].name)}<button data-a="reviewDetach" data-x="${key}" aria-label="移除批注引用">×</button></span>` : ''}</div>` : ''}
    ${!s && mode === 'goal' ? `<label class="completion-standard">完成标准<input id="goal-std" data-keep placeholder="例如：完成口径核对，列清仍待补充的材料" value="${esc(val('goal-std'))}"></label>` : ''}
    <label for="ws-in" class="sr-only">交代目标或补充要求</label>
    <textarea id="ws-in" data-keep data-enter="wsSend" placeholder="${s ? '补充要求，或继续向贾维斯交代…' : '描述目标、需要的成果，或输入 @ 引用资料…'}">${esc(val('ws-in'))}</textarea>
    <div class="work-composer-footer">
      <button class="btn sm" data-a="refPick" data-x="${key}" title="选择事项、文件、聊天、笔记">＠ 引用</button>
      <button class="btn sm" data-a="skillPick">/ 技能</button>
      <select data-a2="modeSel" data-x="${key}" aria-label="执行模式">${MODES.map(([value,label]) => `<option value="${value}" ${mode === value ? 'selected' : ''}>${label}</option>`).join('')}</select>
      <span class="grow"></span>
      ${s ? `<button class="btn lk" data-a="rpTab" data-x="ctx">上下文 ${sources} 项</button>` : ''}
      ${s && s.status === 'running' ? `<button class="btn sm" data-a="stopSess" data-x="${s.id}">■ 停止</button>` : ''}
      <button class="send" data-a="wsSend" aria-label="发送给贾维斯">↑</button>
    </div></div>`;
}

function wsMgr(){
  const v = S.wsView;
  if (v === 'plugins') return `<div class="mg"><h2>插件</h2><div class="sub2">插件 = 技能（办事方法）+ 专家（专业设定）+ 连接器（访问系统，按你本人权限、默认只读）。启用后，分身办事时按需调用。</div><div class="cards">${PLUGINS.map(p => `<div class="acard"><div class="row"><span class="ic2b">${p.ico}</span><div class="grow"><b>${p.name}</b><br><small>${p.from}</small></div><button class="sw ${p.on ? 'on' : ''}" data-a="plugTog" data-x="${p.id}"></button></div><small><b>技能</b> ${p.sk.join('、')}</small><small><b>专家</b> ${p.ex.join('、') || '—'}</small><small><b>连接器</b> ${p.cn.join('、') || '首版不接具体系统'}</small></div>`).join('')}<div class="acard" style="border-style:dashed;align-items:center;justify-content:center;color:var(--ink3)">＋ 插件市场<span class="p1">后续</span></div></div></div>`;
  if (v === 'auto') return `<div class="mg"><h2>自动化<span class="p1">P1</span></h2><div class="sub2">按时间或条件自动发起会话，办完在对话里告诉你。首版只放入口，下面是示意。</div><div class="card" style="border:1px solid var(--line);border-radius:12px;background:#fff">${[['每周五 17:00','写本周周报','工作区「默认工作区」'],['每月 1 日 09:00','汇总上月各科室加班情况','工作区「2027 预算」'],['收到「预算」相关文件时','核对口径，有问题先问我','工作区「2027 预算」']].map(([w, t, ws]) => `<div class="ln" style="display:flex;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line2);font-size:13px"><span class="tag">${w}</span><b class="grow">${t}</b><small>${ws}</small><button class="sw" disabled style="opacity:.5"></button></div>`).join('')}</div></div>`;
  if (v === 'apps') return `<div class="mg"><h2>轻应用</h2><div class="sub2">你在工作台里做出来的专属应用：把办过的事做成一个带界面的小工具，下次填几个参数就能用。可以自己用；提供给组织里的其他人，要经过组织审核（后续）。</div><div class="cards">
      <div class="acard"><div class="row"><span class="ic2b">¥</span><div class="grow"><b>预算测算汇总工具</b><br><small>来自会话「2027 预算测算汇总」</small></div><span class="tag ok">可用</span></div><small>选择各科室测算表，按财务口径核对并汇总，差异超过阈值时先问你。</small><div class="acts" style="margin-top:4px"><button class="btn sm pri" data-a="appOpen" data-x="ys">打开</button><button class="btn sm" disabled>提供给组织<span class="p1">后续</span></button></div></div>
      <div class="acard"><div class="row"><span class="ic2b">盾</span><div class="grow"><b>迎检材料核对</b><br><small>草稿 · 来自会话「等保迎检材料清单」</small></div><span class="tag">草稿</span></div><small>对照测评通知检查材料是否齐全，生成缺项清单。</small><div class="acts" style="margin-top:4px"><button class="btn sm" data-a="toast" data-x="原型：草稿应用，在会话里继续完善">继续完善</button></div></div>
      <div class="acard" style="border-style:dashed;align-items:center;justify-content:center;color:var(--ink3);cursor:pointer" data-a="toast" data-x="原型：在会话里说「把这个做成一个轻应用」，分身会生成应用">＋ 在会话里说「做成轻应用」</div></div></div>`;
  if (v === 'app') return `<div class="mg"><div class="appv"><div class="row" style="margin-bottom:4px"><button class="btn sm" data-a="wsView" data-x="apps">← 轻应用</button><span class="ic2b" style="width:28px;height:28px;border-radius:8px;background:var(--acc-bg);color:var(--acc);display:inline-flex;align-items:center;justify-content:center;font-weight:700">¥</span><h2 class="grow" style="margin:0">预算测算汇总工具</h2><button class="btn sm" data-a="go" data-x="ws:ys">在会话里修改</button><button class="btn sm" disabled>提供给组织<span class="p1">后续</span></button></div>
      <div class="sub2">陈思远的轻应用 · 按你本人权限运行 · 来自会话「2027 预算测算汇总」</div>
      <div class="acard"><div class="form" style="grid-template-columns:110px 1fr"><span class="mut">各科室测算表</span><select><option>工作区库 · 5 个科室测算表.zip</option></select><span class="mut">财务口径依据</span><select><option>关于 2027 年度预算编制工作的通知.pdf</option></select><span class="mut">差异阈值</span><input value="10 万"><span class="mut">只报新增需求</span><label><input type="checkbox" checked style="width:auto"> 剔除已签订的延续合同</label></div><div class="acts"><button class="btn pri" data-a="appRun">生成汇总表</button></div></div>
      ${S.appRan ? `<div class="acard" style="margin-top:12px"><div class="row"><b class="grow">结果 · 合计 312.5 万</b><span class="tag warn">2 处口径已按规则修正</span><button class="btn sm" data-a="toast" data-x="原型：存进工作区库">存到工作区库</button></div>${artBody('ys2')}</div>` : ''}</div></div>`;
  return '';
}
/* ---------- 事项 ---------- */
const SMART = [['today','今天', t => !t.done && t.d != null && t.d <= 16],['next','接下来 7 天', t => !t.done && t.d != null && t.d > 16 && t.d <= 23],['all','全部', t => !t.done],['done','已完成', t => t.done]];
function listFilter(){ if (S.tlist === 'org') return t => Boolean(t.org); const sm = SMART.find(x => x[0] === S.tlist); return sm ? sm[2] : (t => !t.done && t.list === S.tlist); }
function listName(){ if (S.tlist === 'org') return '组织事项'; const sm = SMART.find(x => x[0] === S.tlist); return sm ? sm[1] : S.tlist; }
const srcIco = s => !s ? '' : ({ im:'💬', note:'✎', ws:'⌘', fs:'◉', me:'' })[s.t] || '';
function tStat(t){
  if (t.done) return null;
  if (t.looks) return ['ok','看起来办完了'];
  const ss = SESS.filter(x => x.from?.id === t.id || x.id === t.fs);
  if (ss.some(x => ['confirm','link','plan','send'].includes(x.status))) return ['warn','等你确认'];
  if (ss.some(x => x.status === 'running')) return ['ai','分身在办'];
  const waiting = ss.find(s => s.status === 'wait')?.steps.find(step => step.s === 'wait');
  if (waiting?.wt) return ['wait','在等' + waiting.wt];
  if (t.wait) return ['wait','在等' + t.wait];
  return null;
}
function calHtml(){
  // 2026 年 11 月：11-01 是周日；d>30 表示 12 月
  const cells = []; for (let k = 0; k < 35; k++){ const d = k - 5; cells.push(d); }
  const items = d => { const out = []; TASKS.forEach(t => { if (t.d === d) out.push([t, null]); (t.sub || []).forEach(x => { if (x.d === d) out.push([t, x]); }); }); return out; };
  return `<div class="cal">${'一二三四五六日'.split('').map(w => `<div class="dh">周${w}</div>`).join('')}${cells.map(d => { const o = d < 1 || d > 30; const dd = o ? (d < 1 ? 31 + d : d - 30) : d; return `<div class="dc ${o ? 'o' : ''} ${d === 16 ? 't' : ''}"><span class="n">${dd}</span>${items(d).map(([t, x]) => `<span class="ce ${x ? 's' : ''} ${(x ? x.done : t.done) ? 'd' : ''} ${!t.done && d < 16 ? 'r' : ''}" data-a="tsel" data-x="${t.id}">${x ? '↳ ' + esc(x.t) : esc(t.title)}</span>`).join('')}</div>`; }).join('')}</div>`;
}
function pTasks(){
  const t = task(S.tsel);
  const items = TASKS.filter(listFilter());
  const dates = [[null,'无日期'],[16,'今天'],[17,'明天'],[18,'11-18 周三'],[19,'11-19 周四'],[20,'11-20 周五'],[23,'11-23 周一']];
  const listMenu = ['收件箱', ...LISTS];
  const sorted = items.slice().sort((a,b) => (a.d ?? Infinity) - (b.d ?? Infinity));
  const makeRow = t => {
    const state = tStat(t), sub = t.sub || [];
    return `<div class="matter-row ${t.id === S.tsel ? 'on' : ''}">
      <button class="matter-check ${t.done ? 'done' : ''}" aria-label="${t.done ? '继续办' : '勾掉事项'}" data-a="tdone" data-x="${t.id}">${t.done ? '✓' : ''}</button>
      <button class="matter-row-open" data-a="tsel" data-x="${t.id}"><span class="grow"><b>${esc(t.title)}</b>
      <small>${t.org ? `<span class="tag ai org-tag">组织</span> 发起人 ${esc(pname(t.org.owner))} · 节点 ${t.org.nodes.filter(n => nodeDone(t, n)).length}/${t.org.nodes.length}` : esc(t.list)}${sub.length ? ' · 子事项 ' + sub.filter(x=>x.done).length + '/' + sub.length : ''}</small></span>
      ${state ? `<span class="tag ${state[0]}">${state[1]}</span>` : ''}<small class="due ${t.d != null && t.d < 16 ? 'overdue' : ''}">${t.done ? '已完成' : dlabel(t.d) || '无期限'}</small></button>
      ${t.done ? `<button class="btn sm" data-a="reopen" data-x="${t.id}">继续办</button>` : ''}</div>`;
  };
  return `<div class="folio"><header class="folio-head">
    <div class="row"><div class="grow"><h1>事项</h1><p>把需要盯到办完的事、相关背景和处理记录放在一起。</p></div><button class="btn" data-a="orgNew">＋ 新建组织事项</button><button class="btn acc" data-a="focusMatter">＋ 新建事项</button></div>
  </header><div class="folio-body"><section class="matter-list">
    <div class="matter-list-head"><b>${esc(listName())}</b><small>${items.length} 项</small><span class="grow"></span>
      <span class="seg"><button class="${S.tview === 'list' ? 'on' : ''}" data-a="tview" data-x="list">列表</button><button class="${S.tview === 'cal' ? 'on' : ''}" data-a="tview" data-x="cal">日历</button></span></div>
    ${S.tlist === 'org' ? '<div class="matter-hint">组织事项由一人发起、多人按节点合作完成。点右上角「＋ 新建组织事项」从组织模板创建。</div>' : S.tlist === 'done' ? '<div class="matter-hint">这里的事项可以重新打开，继续使用原来的上下文和会话。</div>' :
      `<div class="matter-add"><input id="tadd" data-keep data-enter="tadd" placeholder="输入标题，回车建成事项" value="${esc(val('tadd'))}">
      <select id="tadd-d" aria-label="新事项期限"><option value="">期限</option>${dates.filter(([d])=>d).map(([d,label])=>`<option value="${d}">${label}</option>`).join('')}</select>
      <select id="tadd-l" aria-label="新事项清单"><option value="">清单</option>${listMenu.map(l=>`<option ${l === S.tlist ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`}
    <div class="matter-list-scroll" data-sc="matter-list">${S.tview === 'cal' ? calHtml() : sorted.map(makeRow).join('') || '<div class="quiet-empty">这里还没有事项。你可以输入标题，或在消息里选择「建成事项」。</div>'}</div>
  </section><article class="matter-detail" data-sc="matter-sheet">${t ? matterSheet(t) : '<div class="quiet-empty"><b>选择一条事项</b><br>这里显示它的背景、来源和办过的会话。</div>'}</article></div></div>`;
}
function matterSheet(t){
  if (t.org) return orgSheet(t);
  const status = tStat(t);
  const ctx = t.ctx || [], bindings = (t.bind || []).filter(id => !chat(id) || canReadChat(chat(id)));
  const sessions = SESS.filter(s => s.from?.id === t.id || s.id === t.fs);
  const link = t.src ? ({ im:t.src.mid ? 'msg:' + t.src.mid : 'im:' + t.src.id, note:'note:' + t.src.id, ws:'ws:' + t.src.id })[t.src.t] : '';
  return `<div class="matter-sheet-inner">
    <div class="sheet-meta"><span>${esc(t.list)}</span><span>·</span><span>${dlabel(t.d) || '无期限'}</span>
      ${t.done ? '<span class="tag ok">已完成</span>' : status ? `<span class="tag ${status[0]}">${status[1]}</span>` : ''}</div>
    <label class="sr-only" for="tt-${t.id}">事项标题</label><input class="sheet-title" id="tt-${t.id}" data-keep value="${esc(t.title)}">
    ${t.looks && !t.done ? '<div class="matter-resolution">汇总表和回复已发送。确认这件事是否可以办完。</div>' : ''}
    <div class="sheet-actions">${t.done ? `<button class="btn acc" data-a="reopen" data-x="${t.id}">继续办（重新打开）</button>` :
      `<button class="btn acc" data-a="taskToWs" data-x="${t.id}">带上下文交给贾维斯办</button><button class="btn" data-a="tdone" data-x="${t.id}">勾掉</button>
      ${t.looks ? `<button class="btn lk" data-a="notDone" data-x="${t.id}">还没完</button>` : ''}`}</div>
    <section class="sheet-section">
      <div class="sheet-section-head"><h3>上下文</h3><small>${ctx.length + bindings.length} 项</small></div>
      ${ctx.map((item,index) => `<div class="source-row"><span class="source-type">${esc(item[0])}</span><div class="grow">${esc(item.revoked ? '原消息已撤回' : contextAllowed(item) ? item[1] : '来源权限已变更')}${!item.revoked && contextAllowed(item) ? contextSource(item) : ''}</div>
        <button class="btn lk" data-a="tctxDel" data-x="${t.id}" data-y="${index}">移除</button></div>`).join('')}
      ${bindings.map(id => `<div class="source-row"><span class="source-type">绑定</span><div class="grow"><button class="btn lk" data-a="go" data-x="${chat(id) ? 'im:' : 'note:'}${id}">${esc(chat(id)?.n || note(id)?.title || '')}</button><small>跟进新内容</small></div><button class="btn lk" data-a="unbind" data-x="${t.id}" data-y="${id}">解绑</button></div>`).join('')}
      <div class="source-entry"><input id="cin-${t.id}" data-keep data-enter="ctxText" placeholder="粘贴或输入背景，按回车加入" value="${esc(val('cin-' + t.id))}">
        <div class="sheet-actions"><button class="btn sm" data-a="ctxFrom" data-x="msg">从聊天选</button><button class="btn sm" data-a="ctxFrom" data-x="note">从笔记选</button><button class="btn sm" data-a="ctxFrom" data-x="file">从资料库选</button><button class="btn sm" data-a="bindPick" data-x="${t.id}">绑定聊天</button></div></div>
    </section>
    ${sessions.length ? `<section class="sheet-section"><div class="sheet-section-head"><h3>关联会话</h3><small>${sessions.length} 项</small></div>
      ${sessions.map(s => `<button class="home-row" data-a="go" data-x="ws:${s.id}">${symbol('▤','list-icon')}<span class="home-row-text"><b>${esc(s.title)}</b><small>${esc(sessStat(s))}</small></span><span class="row-arrow">›</span></button>`).join('')}</section>` : ''}
    <section class="sheet-section"><div class="sheet-section-head"><h3>子事项</h3></div>
      ${(t.sub || []).map((x,k) => `<div class="source-row"><button class="matter-check ${x.done ? 'done' : ''}" data-a="subDone" data-x="${t.id}" data-y="${k}" aria-label="切换子事项状态">${x.done ? '✓' : ''}</button>
        <span class="grow">${esc(x.t)}</span><small>${dlabel(x.d)}</small><button class="btn lk" data-a="subWs" data-x="${t.id}" data-y="${k}">交给分身办</button></div>`).join('')}
      <input class="sub-entry" id="sadd-${t.id}" data-keep data-enter="subAdd" placeholder="添加子事项，回车保存" value="${esc(val('sadd-' + t.id))}"></section>
    <section class="sheet-section"><button class="fold-detail" data-a="tmore" aria-expanded="${S.tmore}"><b>详细信息</b><small>来源、期限、清单、描述</small><span>${S.tmore ? '⌃' : '⌄'}</span></button>
      ${S.tmore ? `<dl class="kv"><dt>期限</dt><dd>${dlabel(t.d) || '无'}</dd><dt>清单</dt><dd>${esc(t.list)}</dd><dt>优先级</dt><dd>${['无','低','中','高'][t.p || 0]}</dd>
      <dt>来源</dt><dd>${esc(t.src?.l || '手动添加')} ${link && (!t.src.mid || canReadChat(chat(t.src.id))) ? `<button class="btn lk" data-a="go" data-x="${link}">打开原文</button>` : ''}</dd></dl>
      <textarea id="td-${t.id}" data-keep placeholder="补充描述…">${esc(t.desc || '')}</textarea>` : ''}
    </section></div>`;
}

/* ---------- 消息 ---------- */

function imModuleNav(){
  const tabs = `<div class="im-tabs" role="tablist"><button role="tab" class="${S.imTab !== 'contacts' ? 'on' : ''}" aria-selected="${S.imTab !== 'contacts'}" data-a="imTab" data-x="chat">聊天</button><button role="tab" class="${S.imTab === 'contacts' ? 'on' : ''}" aria-selected="${S.imTab === 'contacts'}" data-a="imTab" data-x="contacts">通讯录</button></div>`;
  if (S.imTab === 'contacts') return [tabs + contactsNav()];
  return [tabs + imChatNav()[0]];
}
function imChatNav(){
  const c = chat(S.chat);
  const query = (S.chatSearch || '').trim().toLowerCase();
  return [`<label class="side-search" for="chat-search">⌕ <input id="chat-search" data-keep value="${esc(S.chatSearch || '')}" placeholder="搜索聊天或消息"></label>
    ${CHATS.filter(x => !query || x.n.toLowerCase().includes(query) || x.msgs.some(m => !m.revoked && m.x?.toLowerCase().includes(query))).map(x =>
      `<button class="inbox-row ${x.id === c.id ? 'on' : ''}" data-a="go" data-x="im:${x.id}">
        <span class="inbox-avatar ${x.g ? 'group' : ''}">${esc(x.n[0])}</span><span class="grow"><b>${esc(x.n)}</b><small>${esc(lastText(x))}</small></span>
        ${x.un ? `<span class="inbox-unread">${x.un}</span>` : ''}</button>`).join('') || '<p class="quiet-empty">没有匹配的聊天</p>'}`];
}
function pIm(){
  if (S.imTab === 'contacts') return pContacts();
  const c = chat(S.chat);
  const msgs = c.msgs.map(m => {
    if (m.day) return `<div class="day">${m.day}</div>`;
    if (m.system) return `<div class="day">${esc(m.x)}</div>`;
    if (m.revoked) return '<div class="day">陈思远撤回了一条消息</div>';
    const who = m.me ? '陈思远' : m.f;
    const av = `<span class="av sm ${m.ext ? 'ext' : ''}">${esc((m.me ? '陈' : m.f || '?')[0])}</span>`;
    let body;
    if (m.card === 'xt') body = `<div class="icard"><div class="h">事项 · 二期上线方案 · 分工</div>${[['刘洋 · 测试报告', task('t4').d < 16 ? '<span class="tag warn">逾期</span>' : `<span class="tag">${dlabel(task('t4').d)}</span>`],['李娜 · 预算确认','<span class="tag">已交付</span>'],['周敏 · 供应商合同','<span class="tag">11-20</span>']].map(([a, b]) => `<div class="r"><span class="grow">${a}</span>${b}</div>`).join('')}<div class="f"><button class="btn lk" data-a="go" data-x="tasks:二期上线">在事项中打开 →</button></div></div>`;
    else if (m.file){ const f = fileById(m.file); body = `${m.x ? `<div class="b" style="margin-bottom:4px">${esc(m.x)}</div>` : ''}<div class="file" data-a="${f.art ? 'go' : 'saveFile'}" data-x="${f.art ? 'file:' + m.file : m.file}">${extIco(f.type)}<div><div style="font-size:12.5px">${esc(f.name)}</div><small>${f.art ? '在工作区库查看' : '预览 · 保存到资料库'}</small></div></div>`; }
    else body = `<div class="b">${esc(m.x)}</div>`;
    const aiOn = canReadChat(c), ms = S.msel.on && S.msel.chat === c.id, picked = ms && S.msel.ids.includes(m.id);
    const ha = !ms && m.id && aiOn ? `<div class="ha"><button class="fs" data-a="giveFs" data-x="${m.id}">✦ 交给分身</button><button data-a="msgTask" data-x="${m.id}">建成事项</button><button data-a="msgAddTo" data-x="${m.id}">加到事项</button><button data-a="msgNote" data-x="${m.id}">记到笔记</button><button data-a="draftReply" data-x="${c.id}" data-y="${m.id}">帮我回</button><button data-a="mselOn" data-x="${m.id}">☑ 多选</button></div>` : '';
    const mk = m.me && m.drafted ? `<button class="mysrc" data-a="msgSource" data-x="${m.id}">✦ 分身起草 · 仅你可见</button>` : '';
    const undo = m.me && m.at && Date.now() - m.at < 120000 && !ms ? `<button class="btn lk small-recall" data-a="msgRecall" data-x="${m.id}">撤回</button>` : '';
    const sel = ms ? `<span class="sel ${picked ? 'on' : ''}">${picked ? '✓' : ''}</span>` : '';
    return `<div id="message-${m.id}" class="cm ${m.me ? 'me' : ''} ${ms ? 'pick' : ''} ${picked ? 'picked' : ''}" ${ms ? `tabindex="0" role="checkbox" aria-checked="${picked}" data-a="mselTog" data-x="${m.id}"` : 'tabindex="0"'}>${m.me ? '' : sel}${av}<div><div class="w">${who} ${m.t || ''}${mk}${undo}</div>${body}</div>${m.me ? sel : ''}${ha}</div>`;
  }).join('');
  const compTop = draftHtml(c);
  const rel = canReadChat(c) ? TASKS.filter(t => (t.bind || []).includes(c.id) && !t.done) : [];

  const selection = S.msel.on && S.msel.chat === c.id;
  const ctas = `<div class="thread-tools">${rel.length ? `<button class="btn" data-a="go" data-x="task:${rel[0].id}">相关事项 ${rel.length}</button>` : ''}
    <button class="btn" data-a="roomFiles">文件</button>${c.g ? `<button class="btn" data-a="groupSettings" data-x="${c.id}">群设置</button>` : ''}</div>`;
  const source = c.id === 'c-lina' && !S.budgetTask && !selection
    ? '<div class="message-intake"><span class="intake-symbol">↳</span><div class="grow"><b>预算测算汇总</b><small>从李娜的消息预填标题、期限和来源。</small></div><button class="btn acc" data-a="msgTask" data-x="m-lina">建成事项</button></div>'
    : '';
  const actions = [['mHelp','帮我回'],['mTask','建成事项'],['mAddTo','加到事项'],['mNote','记到笔记'],['mGive','交给分身']];
  const room = `<section class="inbox-thread">
    <div class="section-head thread-heading"><div class="row"><span class="inbox-avatar ${c.g ? 'group' : ''}">${esc(c.n[0])}</span><div>
      <h2>${esc(c.n)}</h2><small>${esc(c.sub)}${c.g ? (c.ai ? ' · 群 AI 已开启' : ' · AI 未开启') : ''}</small></div></div>${ctas}</div>
    <div class="ims inbox-scroll" data-bottom><div class="inbox-log">${msgs}${source}</div></div>
    <div class="icomp inbox-compose">${selection ? `<div class="msbar"><b>已选 ${S.msel.ids.length} 条</b>
      ${actions.map(([action,label],i) => `<button class="btn sm ${i === 0 ? 'pri' : ''}" data-a="${action}" ${S.msel.ids.length ? '' : 'disabled'}>${label}</button>`).join('')}<span class="grow"></span>
      <button class="btn sm" data-a="mselOff">取消</button></div>` : comp('im-' + c.id, '输入消息，回车发送', 'imSend', { sm:1, top:compTop })}</div>
  </section>`;
  return `<div class="inbox">${room}</div>`;
}
const lastText = c => { const m = [...c.msgs].reverse().find(x => !x.day && !x.revoked); return m ? (m.x || (m.file ? '[文件] ' + fileById(m.file).name : m.card ? '[事项卡片]' : '')) : ''; };

/* ---------- 笔记 ---------- */
function noteModuleNav(){
  const q = (S.noteSearch || '').trim().toLowerCase();
  const notes = NOTES.filter(n => !q || (n.title + n.body).toLowerCase().includes(q));
  const rows = notes.map(n => `<button class="home-row contents-row ${n.id === S.nsel ? 'on' : ''}" data-a="nsel" data-x="${n.id}">
    ${symbol('≡','list-icon')}<div class="home-row-text"><b>${esc(n.title || '无标题')}</b><small>${esc(n.body.split('\n')[0] || '空笔记')} · ${esc(n.time)}</small></div></button>`).join('');
  return [`<label class="side-search" for="note-search">⌕ <input id="note-search" data-keep placeholder="搜索笔记" value="${esc(S.noteSearch || '')}"></label>
    <div class="portfolio-index-label">我的笔记 <small>${notes.length} 条</small></div>
    ${rows || '<p class="quiet-empty">没有匹配的笔记</p>'}`];
}
function pNotes(){
  const n = note(S.nsel);
  return `<div class="portfolio notes-view"><header class="folio-head"><div class="row">
    <div class="grow"><h1>笔记</h1><p>记录片段和想法。需要时，把它加到事项或交给分身。</p></div><button class="btn acc" data-a="newNote">＋ 记一条</button></div></header>
    <div class="portfolio-body"><article class="portfolio-content note-reader-content" data-sc="note-reader">
    ${n ? noteSheet(n) : '<div class="quiet-empty"><b>选择一条笔记</b><br>这里显示正文和来源。笔记归你个人所有。</div>'}</article></div></div>`;
}
function noteSheet(n){
  const sug = S.nsug?.id === n.id ? S.nsug : null;
  return `<div class="portfolio-sheet"><div class="portfolio-meta"><span class="tag">我的笔记</span><span>${esc(n.src)} · ${esc(n.time)}</span></div>
    <input class="portfolio-title" id="nt-${n.id}" data-keep aria-label="笔记标题" placeholder="无标题" value="${esc(n.title)}">
    <div class="portfolio-actions"><button class="btn sm" data-a="noteWs">交给分身办</button><button class="btn sm" data-a="noteTask">建成事项</button>
    <button class="btn sm" data-a="noteAddTo">加到事项</button><button class="btn sm" data-a="noteTidy">整理 <span class="p1">P1</span></button></div>
    <textarea id="nb-${n.id}" class="portfolio-text" data-keep placeholder="记下刚才想起来的事…">${esc(n.body)}</textarea>
    ${n.refs?.length ? `<div class="note-refs"><b>来源消息</b>${n.refs.map(item => `<div class="source-row"><span class="grow">${esc(chat(item[2].chat).n)}</span>
      ${contextAllowed(item) ? contextSource(item) : '<small>来源权限已变更</small>'}</div>`).join('')}</div>` : ''}
    ${sug ? `<div class="sug"><div class="row"><b class="grow">整理版 <span class="p1">P1</span></b><button class="btn sm" data-a="nsugOff">收起</button></div>
      <p>${esc(sug.sum)}</p><p>${esc(sug.todo)} · ${dlabel(sug.d)}</p>
      <button class="btn sm" data-a="nsugAdd">预填事项</button></div>` : ''}</div>`;
}
function pLib(){
  const folder = S.folder;
  const f = fileById(S.fsel);
  const files = allFiles();
  const org = isOrg(folder);
  const title = folder.startsWith('w-') ? wsp(folder)?.name : org ? '组织知识库 · ' + ORGF.find(([id]) => id === folder)?.[1] : KBF.find(([id]) => id === folder)?.[1];
  const q = (S.fileSearch || '').trim().toLowerCase();
  const visible = files.filter(f => (folder === 'kb-all' ? f.folder.startsWith('kb-') : folder === 'org-all' ? isOrg(f.folder) : f.folder === folder) && f.name.toLowerCase().includes(q));
  return `<div class="portfolio files-view"><header class="folio-head"><div class="row">
    <div class="grow"><h1>资料库</h1><p>${org ? '组织统一发布的政策法规、机关制度、标准规范和办事口径。只读：可以查看和引用，不能上传、删除或修改。' : '归档个人资料与工作区成果，按来源和版本查找。'}</p></div>${org ? '<span class="tag">只读 · 由组织维护</span>' : '<button class="btn acc" data-a="upload">＋ 上传</button>'}</div></header>
    <div class="library-body"><section class="portfolio-index" data-sc="file-index">
      <div class="portfolio-index-label">${esc(title || '全部文件')} <small>${visible.length} 个</small></div>
      <label class="side-search" for="file-search">⌕ <input id="file-search" data-keep placeholder="搜索文件名" value="${esc(S.fileSearch || '')}"></label>
      ${folder !== 'kb-all' && !folder.startsWith('w-') && !org ? `<div class="portfolio-index-label">自动向量化<button class="sw ${KBAUTO[folder] ? 'on' : ''}" data-a="autoVec" data-x="${folder}" aria-label="切换文件夹自动向量化"></button></div>` : ''}
      ${visible.map(f => `<button class="home-row contents-row ${f.id === S.fsel ? 'on' : ''}" data-a="fsel" data-x="${f.id}">
        ${extIco(f.type)}<span class="home-row-text"><b>${esc(f.name)}</b><small>${esc(f.from)}</small></span>
        <span class="vec ${VEC[f.vec || 'n'][0]}">${VEC[f.vec || 'n'][1]}</span></button>`).join('') || '<p class="quiet-empty">此处暂无文件</p>'}
    </section><article class="portfolio-content" data-sc="file-reader">${f ? fileSheet(f) : '<div class="quiet-empty"><b>选择一个文件</b><br>这里显示正文预览、来源及向量化状态。</div>'}</article></div></div>`;
}
function fileSheet(f){
  return `<div class="portfolio-sheet"><div class="portfolio-meta">${extIco(f.type)}<span>${esc(f.from)} · ${esc(f.time)}</span>
    <span class="vec ${VEC[f.vec || 'n'][0]}">${VEC[f.vec || 'n'][1]}</span></div>
    <h2 class="portfolio-title">${esc(f.name)}</h2>
    <div class="portfolio-actions"><button class="btn sm" data-a="openArt" data-x="${f.id}">全屏</button>
      ${f.art ? `<button class="btn sm" data-a="reviewFromHome" data-x="${f.id}">回到会话审阅</button>`
      : f.ro ? '<span class="tag">只读 · 组织维护，个人不能修改</span>'
      : `<button class="btn sm" data-a="vecTog" data-x="${f.id}">${f.vec === 'y' ? '取消向量化' : '发起向量化'}</button>`}
      <button class="btn sm" data-a="fileTask" data-x="${f.id}">建成事项</button>
      <button class="btn sm" data-a="fileAddTo" data-x="${f.id}">加到事项</button></div>
      <div class="portfolio-document">${artBody(f.kind,f.name,f.id)}</div></div>`;
}

/* ---------- 分身记得的 ---------- */
const VEC = { y:['y','已向量化'], n:['n','未向量化'], r:['r','向量化中'] };
const FACTS = [
  { t:'李娜 25 号要汇总全局预算，应用推进处需周五前交', src:'李娜 · 单聊 11-13', k:'承诺' },
  { t:'王处长关心二期的回退方案', src:'笔记 · 周例会要汇报', k:'事实' },
  { t:'刘洋答应测试报告周三给（已顺延到 11-18）', src:'项目组群 11-12', k:'承诺' },
  { t:'你习惯周五下午写周报', src:'工作台 · 3 次会话', k:'偏好' },
];
function pMem(){
  const body = {
    fact:`<div class="card">${FACTS.map((f, i) => `<div class="ln"><span class="tag">${f.k}</span><div class="grow">${esc(f.t)}<br><small>出处：${esc(f.src)}</small></div><button class="btn sm" data-a="memWrong" data-x="fact:${i}">不对</button><button class="btn lk" style="color:var(--ink3)" data-a="memDel" data-x="fact:${i}">删除</button></div>`).join('')}</div>`,
    way:`<div class="mut" style="margin-bottom:8px;font-size:12.5px">分身在办事过程中自动沉淀的处理方式，只给你自己用。用到时，依据里会标「按以往做法」。</div><div class="card">${WAYS.map((w, i) => `<div class="ln"><span class="tag ${w.auto ? 'ai' : ''}">${w.auto ? '自动沉淀' : '做法'}</span><div class="grow"><b>${esc(w.t)}</b><br><small>适用：${esc(w.sc)}　步骤：${esc(w.st)}</small></div><button class="btn sm" data-a="toast" data-x="原型：修改这条做法">修改</button><button class="btn lk" style="color:var(--ink3)" data-a="memDel" data-x="way:${i}">删除</button></div>`).join('')}<div class="ln"><span class="grow mut">经提炼、测试、验证后，做法可以变成技能分享给同事（P2）</span></div></div>`,
    rule:`<div class="mut" style="margin-bottom:8px;font-size:12.5px">分身遇到这些情况会停下来问你。新规则不用来这里建：在对话或会话里说一句「以后……先问我」，或在确认点勾选「以后都这样处理」。</div><div class="card">${RULES.map((r, i) => `<div class="ln"><div class="grow"><b>${esc(r.t)}</b>${r.th ? `　<small>阈值 <input value="${r.th}" style="border:1px solid var(--line);border-radius:6px;padding:1px 6px;width:64px"></small>` : ''}<br><small>${r.lock ? '🔒 底线规则，系统固定，不能关闭' : '来源：' + (r.from || '对话')}</small></div>${r.lock ? '' : `<button class="sw ${r.on ? 'on' : ''}" data-a="ruleTog" data-x="${r.id}"></button><button class="btn lk" style="color:var(--ink3)" data-a="memDel" data-x="rule:${i}">删除</button>`}</div>`).join('')}</div>`,
  }[S.memTab];
  return `<div class="pgwrap"><div class="pghd"><span class="orb xs"></span><b>分身记得的</b><span>${NAME}记住的内容都在这里，每条都能看到出处，可以纠正或删除。你看不到的内容，分身也用不到</span><span class="grow"></span><button class="btn sm" data-a="go" data-x="home">← 回到对话</button></div><div class="pgbody" style="display:flex"><div style="flex:1;overflow:auto;background:var(--bg)"><div class="set">${body}</div></div></div></div>`;
}

/* ---------- 设置 ---------- */
function pSet(){
  const body = {
    av:`<h3>分身</h3><div class="card"><div class="ln"><span class="orb md"></span><div class="grow"><b>名字</b><br><small>默认「贾维斯」，可以改</small></div><input value="${NAME}" style="border:1px solid var(--line);border-radius:8px;padding:4px 8px;width:140px"></div><div class="ln"><div class="grow"><b>头像</b></div><button class="btn sm">更换</button></div><div class="ln"><div class="grow"><b>分身记得的</b><br><small>事实与承诺、做法、你的规则，都在这里查看和纠正</small></div><button class="btn sm" data-a="go" data-x="mem">打开</button></div></div>`,
    rules:`<h3>规则 · 哪些情况要先问我</h3><div class="card">${RULES.map(r => `<div class="ln"><div class="grow"><b>${esc(r.t)}</b>${r.th ? `<br><small>阈值：<input value="${r.th}" style="border:1px solid var(--line);border-radius:6px;padding:1px 6px;width:70px"></small>` : ''}${r.lock ? '<br><small class="lock">🔒 底线规则，不能关闭</small>' : ''}</div>${r.lock ? '<button class="sw on" disabled style="opacity:.5"></button>' : `<button class="sw ${r.on ? 'on' : ''}" data-a="ruleTog" data-x="${r.id}"></button>`}</div>`).join('')}
      <div class="ln"><span class="grow mut">也可以在对话或会话里用一句话新建规则，例如「涉及人事的先问我」</span></div></div>`,
    brief:`<h3>晨报<span class="p1">P1</span></h3><div class="card"><div class="ln"><div class="grow"><b>推送时间</b></div><select disabled><option>每天 08:30</option></select></div><div class="ln"><div class="grow"><b>频次</b></div><select disabled><option>工作日</option></select></div><div class="ln"><span class="grow mut">N2 预览</span></div></div>`,
    priv:`<h3>隐私与权限</h3><div class="card"><div class="ln"><div class="grow"><b>分身按你本人的权限读取</b><br><small>你看不到的内容，分身也用不到</small></div><span class="tag ok">始终</span></div><div class="ln"><div class="grow"><b>分身不能直接发送消息</b><br><small>只起草放进输入框，由你本人发送</small></div><span class="tag ok">始终</span></div><div class="ln"><div class="grow"><b>事项只能由你创建和勾掉</b></div><span class="tag ok">始终</span></div><div class="ln"><div class="grow"><b>笔记只有你看得到</b><br><small>管理员也没有查看入口</small></div><span class="tag ok">始终</span></div></div>`,
  }[S.setTab];
  return `<div class="pgwrap"><div class="pghd"><b>设置</b><span>分身的名字头像、晨报，以及隐私和权限说明</span></div><div class="pgbody" style="display:flex"><div style="flex:1;overflow:auto;background:var(--bg)"><div class="set">${body}</div></div></div></div>`;
}

/* ====================== 引擎：工作台执行 ====================== */
function runSess(s){
  if (s.stopped) return;
  if (s.status === 'plan') return;
  const i = s.steps.findIndex(x => x.s !== 'done');
  if (i < 0){
    s.status = 'done'; s.time = '今天 ' + now();
    if (s.end) s.tail.push({ r:'ai', h:s.end.h, acts:s.end.acts, tm:now() });
    if (!s.waySaved && s.steps.length > 3){ s.waySaved = 1; WAYS.unshift({ id:uid('w'), t:s.title.replace(/ ·.*$/, '') + '的做法', sc:s.title, st:s.steps.map(z => z.t.replace(/：.*$/, '')).slice(0, 4).join(' → '), auto:1 }); }
    if (s.goal && !s.goalAsked){ s.goalAsked = 1; s.status = 'wait'; s.tail.push({ r:'ai', tm:now(), h:`我认为目标已经达成：${esc(s.goal.std || s.goal.g)}。要结束这个目标吗？`, acts:[['确认达成','goalOk', s.id],['继续推进','goalMore', s.id]] }); notify(s, 'done'); render(); return; }
    if ((s.queue || []).length){ const q = s.queue.splice(0); q.forEach(t => s.tail.push({ r:'ai', tm:now(), h:`处理排队的要求：「${esc(t)}」。已按这个调整。` })); }
    if (s.onDone) s.onDone();
    notify(s, 'done'); render(); return;
  }
  const st = s.steps[i];
  if (st.k === 'confirm'){
    const arrived = st.s !== 'confirm';
    st.s = 'confirm'; s.status = 'confirm';
    if (arrived) notify(s, 'confirm');
    render(); return;
  }
  if (st.k === 'link' || st.k === 'block'){
    const arrived = st.s !== st.k;
    st.s = st.k; s.status = st.k;
    if (arrived) postHomeUpdate(st.k, { id:s.id, step:i },
      st.k === 'link' ? '汇总表已生成，请你决定是否关联到事项。' : '当前资料还不够，我先停在这里。');
    render(); return;
  }
  if (st.k === 'wait' || st.k === 'deliver'){
    st.sent = st.sent || [];
    const sent = st.chats.every(id => st.sent.includes(id));
    st.s = st.k === 'wait' && sent ? 'wait' : 'send';
    s.status = st.s;
    render();
    return;
  }
  if (s.goal && st.k === 'write' && !st.rep){ st.rep = 1; s.tail.push({ r:'ai', tm:now(), h:'阶段汇报：资料和依据已备齐，开始生成。' }); }
  st.s = 'run'; s.status = 'running';
  const ticket = (s.runTicket || 0) + 1;
  s.runTicket = ticket;
  render();
  setTimeout(() => {
    if (s.stopped || s.runTicket !== ticket) return;
    st.s = 'done'; st.tm = now();
    if (st.done) st.d = st.done;
    if (st.art){ ARTS[st.art] = ARTS[st.art] || { name:st.artName, type:st.artType, kind:st.artKind }; Object.assign(ARTS[st.art], { sess:s.id, time:'今天 ' + now() }); if (!s.arts.includes(st.art)) s.arts.push(st.art); S.newArt = st.art; S.artSel = st.art; }
    (st.drafts || []).forEach(d => placeDraft(d.chat, { ...d, sess:s.id }));
    runSess(s);
  }, st.ms || 1500);
}
function notify(s, kind){
  const title = esc(s.title);
  if (kind === 'confirm'){
    postHomeUpdate('confirm',{ id:s.id, step:s.steps.findIndex(step => step.s === 'confirm') },
      `「${title}」有一处需要你判断。我把选项和依据放在执行区了。`);
  } else if (s.status === 'done'){
    postHomeUpdate('done',{ id:s.id, art:s.arts.at(-1) },`「${title}」这轮已经办完。`);
  } else if (s.goal){
    postHomeUpdate('goal',{ id:s.id },`「${title}」的结果已整理好，等你确认目标是否达成。`);
  }
  if (S.page !== 'admin' && S.page !== 'home' && !(S.page === 'ws' && S.cur === s.id)){
    toast(`${kind === 'confirm' ? '等你确认' : s.status === 'done' ? '办完了' : '执行有更新'} · ${s.title}`, ['去看看', `ws:${s.id}`]);
  }
}

function newSess(title, req, opt = {}){
  const id = uid('s'), aid = uid('a'); const mode = opt.mode || 'def';
  const t = req + title;
  const kind = /PPT|汇报材料|演示/.test(t) ? ['PPT','ppt','.pptx'] : /表|汇总|统计|清单|排期/.test(t) ? ['XLS','xls','.xlsx'] : ['DOC','doc','.docx'];
  const plug = /通知|公文|请示|方案|PPT|汇报/.test(t) ? '公文写作' : /预算|测算/.test(t) ? '财务预算' : /等保|安全/.test(t) ? '等保合规' : '调研分析';
  const p = PLUGINS.find(x => x.name === plug);
  const ws = opt.ws || (/预算|测算/.test(t) ? 'w-ys' : /等保|迎检/.test(t) ? 'w-db' : /二期|方案|测试|上线|王处长|PPT|周例会/.test(t) ? 'w-2q' : /调研|报告/.test(t) ? 'w-rp' : 'w-def');
  const s = { id, ws, mode, goal: mode === 'goal' ? { g:req, std:opt.std } : null, title, status: mode === 'plan' ? 'plan' : 'running', time:'今天 ' + now(), plugins:[plug], req, tail:[], arts:[], from:opt.from,
    ctx:{ in:[...(opt.from ? [['事项', opt.from.l]] : []), ...(opt.ctxIn || []), ...(opt.ctx ? [['引用', opt.ctx]] : []), ['工作区库', wsp(ws).name + ' 里的 ' + (2 + (title.length % 3)) + ' 个文件']], hit:[['文件', '相关资料 · 已向量化', '0.86'], ...(WAYS[0] && /周报|汇报/.test(t) ? [['做法', WAYS[0].t, '0.90']] : [])] },
    steps:[
      { k:'plan', t:'定计划：理解要求 → 找依据 → 生成 → 交给你看', s:'todo' },
      { k:'plan', t:'找依据：本次上下文里的事项、文件和聊天', d: opt.ctx ? `以「${opt.ctx}」为主要依据，另找到相关文件 2 份` : '找到相关文件 2 份、聊天 12 条', s:'todo', ev:[['相关文件 2 份','f-gw']] },
      { k:'expert', t:`专家「${p.ex[0]}」：核对关键内容`, s:'todo' },
      { k:'skill', t:`技能「${p.sk[0]}」：按模板起草`, s:'todo' },
      { k:'write', t:`生成「${title}」`, s:'todo', art:aid, artName:title.replace(/[：:，,。]/g, ' ').trim().slice(0, 18) + kind[2], artType:kind[0], artKind:kind[1] },
    ],
    end:{ h:'好了，产物在右边产物区，也已存进这个工作区的工作区库。要改直接在下面说；要发出去的话，我起草好放进输入框，由你发送。', acts:[['发到群（起草）','artToChat', aid],['建成事项','artToTask', aid]] } };
  if (opt.refs && opt.refs.length) s.ctx.in.push(...opt.refs.map(([t, l]) => ['@' + t, l]));
  if (mode === 'plan') s.steps.forEach(st => st.s = 'planned');
  SESS.unshift(s);
  // v9：复杂事项在新工作台里真正开会话执行；宿主只保留一张指向它的卡片，不再自行模拟执行。
  if (WB()){ s.wbId = WB().createSession(req, title); s.status = 'wb'; return s; }
  if (mode !== 'plan') setTimeout(() => runSess(s), 400);
  return s;
}
/* v9：简单的事贾维斯直接处理（在小球对话里答复；要发出去的只起草，由本人发送；要生效的只预填，由本人确认）。 */
function simpleHandle(label, line, body){
  S.dot = true;
  S.home.push({ r:'me', h:`<div class="quote">${esc(label)}<br>${esc(line)}</div>交给你办` });
  const t = parseTask(body.replace(/\n/g, '，'));
  S.home.push({ r:'ai', tm:now(), h:`这件事不复杂，不用开会话，我直接处理：帮你预填了一个跟进事项，确认后生效。`, pre:newPre(Object.assign({ kind:'task' }, t, { title:t.title.slice(0, 24) })), acts:[['还是开会话办','wsFromMsg', label.replace(/^笔记 · /, '')]] });
  render();
}
function simpleTask(t){
  S.dot = true;
  S.home.push({ r:'me', h:`<div class="quote">事项 · ${esc(t.title)}</div>交给你办` });
  const target = t.src?.t === 'im' ? t.src.id : (t.bind || []).find(id => chat(id));
  let h;
  if (target && canReadChat(chat(target))){
    const who = t.wait || (chat(target).g ? '' : chat(target).n);
    placeDraft(target, { text:`${who ? '@' + who + ' ' : ''}「${t.title.replace(/^.*· /, '')}」现在进展怎么样？方便的话今天给我个回复。`, why:'事项 · ' + t.title });
    h = `这件事不复杂，不用开会话。我起草了一句跟进，放进「${esc(chat(target).n)}」输入框，由你确认后发送；对方回复后我会更新这个事项。`;
  } else h = `这件事不复杂，不用开会话。我会在期限当天（${dlabel(t.d)}）提醒你；办完了跟我说一声，我帮你把事项标成「看起来办完了」，由你勾掉。`;
  S.home.push({ r:'ai', tm:now(), h, acts:[...(target ? [['去发送','go','im:' + target]] : []), ['还是开会话办','taskToWsForce', t.id]] });
  render();
}
/* v9：判断交给分身的事是否复杂。复杂＝要分步执行、要生成文件或材料；简单的由贾维斯直接处理，不开会话。 */
const isComplex = text => /方案|报告|汇报|汇总|测算|材料|PPT|演示|起草|撰写|写|整理|纪要|评估|分析|清单|申报|修改|核对|统计|对比|调研|规划/.test(text) || text.length > 60;
const titleOf = t => t.replace(/^(帮我|请你?|麻烦|给我)/, '').replace(/[。！!]$/, '').slice(0, 20);

/* ====================== 和分身对话：意图分派 ====================== */
function parseTask(text){
  let d = null, list = '收件箱', p = 0, t = text;
  const m1 = t.match(/周([一二三四五六日])/), m2 = t.match(/(\d{1,2})\s*[号日]/);
  if (/今天/.test(t)) d = 16; else if (/明天/.test(t)) d = 17; else if (/后天/.test(t)) d = 18;
  else if (m1) d = 16 + '一二三四五六日'.indexOf(m1[1]); else if (m2) d = +m2[1];
  const ml = t.match(/#(\S+)/); if (ml){ list = LISTS.find(l => l.replace(/\s/g, '').includes(ml[1])) || ml[1]; t = t.replace(ml[0], ''); if (!LISTS.includes(list) && list !== '收件箱') LISTS.push(list); }
  else { const g = LISTS.find(l => (l === '二期上线' && /方案|二期|上线|测试/.test(t)) || (l === '2027 预算' && /预算|测算/.test(t)) || (l === '等保迎检' && /等保|迎检/.test(t))); if (g) list = g; }
  if (/!高|！高/.test(t)){ p = 3; t = t.replace(/[!！]高/, ''); }
  t = t.replace(/^(提醒我|帮我记得|别忘了|记得|建个事项[:：]?)/, '').trim();
  return { title:t, d, list, p, src:{ t:'fs', l:'对话 · 刚刚' } };
}
function route(text, ctx){
  const lc = text;
  if (/先问我|要问我/.test(lc)){
    const id = proposeRule(lc);
    return { h:'规则已预填：' + esc(S.ruleProposals[id]), acts:[['确认规则','ruleAccept',id],['取消','ruleCancel',id]] };
  }
  if (/今天.*先.*处理|优先处理/.test(lc)) return priorityReply();
  if (/今天.*(处理|要做|什么事)|晨报|有什么要/.test(lc)) return { h:'这是今天的事项和需要跟进的消息。', brief:true };
  if (/进度|怎么样了|办到哪/.test(lc)) { const r = SESS.filter(s => s.status !== 'done'); return { h:`工作台里有 ${r.length} 个会话还没办完：`, cards:r.map(s => ({ sess:s.id })) }; }
  if (/^(记一下|记一条|记住|记下)/.test(lc)){
    const body = lc.replace(/^(记一下|记一条|记住|记下)[:：，,]?\s*/, '');
    return { h:'帮你预填好了一条笔记，确认后保存。', pre:newPre({ kind:'note', title:body.slice(0, 12), body }) };
  }
  if (/提醒|别忘|之前|前把|前给|前交|建个事项/.test(lc)){
    const t = parseTask(lc);
    return { h:'帮你预填好了一个事项，改好后确认才会建成。', pre:newPre(Object.assign({ kind:'task' }, t)) };
  }
  if (/回(复)?.*(李娜|王建国|王处长|刘洋|周敏)|帮我回/.test(lc)){
    if (/王/.test(lc)) return offerHomeDraft('c-wang', {
      text:'王处长，方案 v0.3 先发您，测试结论出来后我再补 v0.4，周四前给您完整版。',
      why:'事项 · 方案给王建国看'
    });
    if (/李娜/.test(lc)) return offerHomeDraft('c-lina', linaReply);
    return { h:'你想回复哪条消息？打开聊天后可以选中原消息，让我根据它拟一份回复。', acts:[['打开消息','go','im']] };
  }
  const direct = directAgentReply(lc);
  if (direct) return direct;
  if (/二期上线是哪天|上线时间/.test(lc)) return { h:'二期计划 12-08 上线，11-27 方案定稿。<span class="ev" data-a="evOpen" data-x="launch-schedule">依据 · 二期上线安排</span>' };
  if (/就在这答/.test(lc)) return { h:'好，就在这里答，不开会话。' };
  const id = uid('q'); const t = titleOf(lc); const g = newSess.guess ? null : null;
  S.pend = S.pend || {}; S.pend[id] = { t, req:lc, ctx };
  const ws = /预算|测算/.test(lc) ? 'w-ys' : /等保|迎检/.test(lc) ? 'w-db' : /二期|方案|测试|上线|王处长|PPT|周例会/.test(lc) ? 'w-2q' : /调研|报告/.test(lc) ? 'w-rp' : 'w-def';
  S.pend[id].ws = ws;
  return { h:`这件事需要分几步办、还要生成文件，建议在工作区「<b>${esc(wsp(ws).name)}</b>」开一个会话。`, acts:[['确认，开会话','pendOk', id],['换个工作区','pendWs', id],['就在这答','pendNo', id]] };
}
function say(text, ctx){
  text = (text || '').trim(); if (!text) return;
  S.scrollFlow = true;
  S.home.push({ r:'me', h:(ctx ? `<div class="quote">${esc(ctx)}</div>` : '') + esc(text) });
  S.homeReplying++; S.typing = true; render();
  setTimeout(() => {
    S.homeReplying--; S.typing = Boolean(S.homeReplying);
    const response = route(text,ctx);
    S.home.push({ ...response, r:'ai', tm:now() });
    render();
  }, 750);
}
const linaReply = { text:'可以的，周五前先给你一版不含硬件的汇总，硬件报价确认后再补。', why:'笔记 · 需求测算表（11-12）', evidence:['n4'] };
function draftLina(){ placeDraft('c-lina',linaReply); }

/* ====================== 动作 ====================== */
function go(x, options){
  const previousPage = S.page;
  const [p, a] = String(x).split(/:(.+)/);
  S.dot = false;
  if (p === 'admin' || S.page === 'admin') $('#toast').classList.remove('on');
  if (p === 'ws'){ S.page = 'ws'; S.wsView = 'sess'; S.cur = null; S.artTab = 'sess'; S.artSel = null; if (a){ const hs = sess(a); if (hs?.wbId) WB()?.openSession(hs.wbId); else WB()?.openHome(); } }
  else if (p === 'im'){ S.page = 'im'; S.msel = { on:false, ids:[] }; if (a){ S.imTab = 'chat'; S.chat = a; chat(a).un = 0; } }
  else if (p === 'msg'){ const [c] = msgOf(a); S.highlight = a; go('im:' + c.id, options); return; }
  else if (p === 'task'){ S.page = 'tasks'; S.tview = 'list'; S.tsel = a; const t = task(a); if (!t){ S.tsel = null; } else if (t.org) S.tlist = 'org'; else if (!TASKS.filter(listFilter()).includes(t)) S.tlist = t.done ? 'done' : t.list; }
  else if (p === 'tasks'){ S.page = 'tasks'; if (a){ S.tlist = a; S.tsel = TASKS.find(a === 'org' ? (t => t.org) : (t => !t.done && t.list === a))?.id; } }
  else if (p === 'note'){ S.page = 'notes'; S.nsel = a; }
  else if (p === 'lib'){ S.page = 'lib'; S.folder = a || 'kb-all'; }
  else if (p === 'file'){ S.page = 'lib'; S.fsel = a; const f = fileById(a); S.folder = f ? (f.folder.startsWith('w-') ? f.folder : isOrg(f.folder) ? 'org-all' : 'kb-all') : 'kb-all'; }
  else if (p === 'set'){ if (a === 'rules'){ S.page = 'mem'; S.memTab = 'rule'; } else { S.page = 'set'; if (a) S.setTab = a; } }
  else if (p === 'mem'){ S.page = 'mem'; if (a) S.memTab = a; }
  else S.page = p;
  if (S.page === 'im') chat(S.chat).un = 0;
  if (S.page === 'home'){
    S.homeUnread = 0;
    if (previousPage !== 'home') $('#toast').classList.remove('on');
  }
  if (options?.openPanel !== undefined) S.modulePanelOpen = options.openPanel;
  else if (S.page !== previousPage) S.modulePanelOpen = S.page !== 'home';
  render();
}
const msgOf = x => { const c = CHATS.find(z => z.msgs.some(m => m.id === x)); return [c, c.msgs.find(z => z.id === x)]; };
function addCtx(tid, kind, label, ref){
  const t = task(tid);
  t.ctx = t.ctx || [];
  t.ctx.push([kind, label, ref]);
}
const canReadChat = c => Boolean(c && (!c.g || c.ai));
const messageContext = (c, m) => ['消息', (m.f || '我') + '：' + (m.x || (m.file ? fileById(m.file)?.name : '') || '附件'), { chat:c.id, mid:m.id }];
function contextAllowed(item){ return !item[2]?.chat || canReadChat(chat(item[2].chat)); }
function contextSource(item){
  const ref = item[2];
  const link = ref?.mid ? 'msg:' + ref.mid : ref?.link;
  return link ? ` <button class="btn lk" data-a="go" data-x="${esc(link)}">打开来源</button>` : '';
}

function newBudgetSession(t, req, items, { ws, mode }){
  const id = uid('s');
  const v1 = uid('a');
  const library = FILES.filter(f => f.folder === ws && f.vec === 'y');
  const notice = FILES.find(f => f.id === 'f-tz' && f.vec === 'y');
  const hasInputs = library.some(f => f.id === 'f-5ks') && notice;
  const previousWay = WAYS.find(w => w.id === 'w0');
  const steps = hasInputs ? [
    { k:'plan', t:'收集测算表，核对财务口径，再生成汇总表', s:'todo', ms:450 },
    { k:'plan', t:'读取工作区库中的 5 个科室测算表', s:'todo', ms:600, ev:[['5 份测算表','f-5ks']] },
    { k:'skill', t:'预算表核对：对照财务通知第 3 条', s:'todo', ms:600, d:'发现 2 处口径差异', ev:[['财务通知 · 第 3 条','f-tz'], ...(previousWay ? [['按以往做法 · ' + previousWay.t,'way']] : [])] },
    { k:'write', t:'生成汇总表 v1', s:'todo', ms:600, d:'合计 346.5 万，较 2026 年 +14.2%', art:v1, artName:'2027 预算测算汇总表 v1.xlsx', artType:'XLS', artKind:'ys1', ev:[['增幅据 2026 年实际 303.4 万推算','inf']] },
    { k:'confirm', t:'两处口径和财务通知不一致', s:'todo', cp:'ys' },
  ] : [
    { k:'plan', t:'检查工作区库和个人知识库', s:'todo', ms:450, d:'缺少可检索的科室测算表或财务通知，暂时无法生成可靠汇总。' },
    { k:'block', t:'补充资料后重试', s:'todo' }
  ];
  const s = {
    id, ws, mode, title:'2027 预算测算汇总', req, from:{ t:'事项', id:t.id, l:t.title },
    status:mode === 'plan' ? 'plan' : 'running', time:'今天 ' + now(), plugins:['财务预算'],
    budget:{ v1 }, steps, tail:[], arts:[],
    goal:mode === 'goal' ? { g:req, std:'完成口径核对，并由本人把汇总表发送给李娜' } : null,
    ctx:{ in:[['事项', t.title, { link:'task:' + t.id }], ...items],
      hit:[...library.map(f => ['工作区库', f.name,'0.94', { link:'file:' + f.id }]),
        ...(notice ? [['文件', notice.name, '0.92', { link:'file:' + notice.id }]] : []),
        ...(previousWay ? [['做法', previousWay.t,'0.88', { link:'mem:way' }]] : [])] }
  };
  if (mode === 'plan') steps.forEach(step => step.s = 'planned');
  SESS.unshift(s);
  linkAgentSession(agentTask('budget-follow-up'),s);
  S.home.push({ r:'ai', tm:now(), h:'预算测算汇总已在工作台开了会话。', cards:[{ sess:id }] });
  if (mode !== 'plan') setTimeout(() => runSess(s), 180);
  return s;
}
function placeDraft(id, draft){
  if (!canReadChat(chat(id))) return;
  const key = 'im-' + id;
  const placed = !val(key).trim();
  const draftId = uid('draft');
  S.drafts[id] = { ...draft, placed, id:draftId };
  if (placed) S.inp[key] = draft.text;
  postHomeUpdate('draft',{ id,draftId });
}
function draftHtml(c){
  const d = S.drafts[c.id];
  const b = S.bindSugs[c.id], related = b && task(b.task);
  const binding = related ? `<div class="bindsug"><span class="orb xs"></span><span class="grow">绑定到事项「${esc(related.title)}」后，会话可以接收对方的回复。</span><button class="btn sm pri" data-a="bindOk" data-x="${c.id}">绑定</button><button class="btn sm" data-a="bindNo" data-x="${c.id}">不用</button></div>` : '';
  if (!d) return binding;
  const attachment = d.placed && d.att && fileById(d.att);
  const evidence = d.evidence?.length ? `<button class="btn lk" data-a="draftEvidence" data-x="${c.id}">查看依据</button>` : '';
  return binding + `<div class="draft-line"><span class="tag ai">分身草稿</span><small class="grow">${d.placed ? esc(d.why) + ' · 仅你可见' : '有一份分身草稿，你可以先查看再放入输入框'}</small>${evidence}
    ${d.placed ? '' : `<button class="btn sm" data-a="draftPreview" data-x="${c.id}">查看草稿</button>`}<button class="btn lk" data-a="dropDraft" data-x="${c.id}">不用了</button></div>
    ${attachment ? `<button class="att" data-a="openArt" data-x="${d.att}">附件 · ${esc(attachment.name)}</button>` : ''}`;
}
function maybeResumeBudget(s){
  if (!s.budget || s.stopped || s.status !== 'wait') return;
  const st = s.steps.find(step => step.k === 'wait' && step.s === 'wait');
  const t = task(s.from.id);
  if (!st || st.replyPending || !st.chats.every(id => st.sent.includes(id) && t.bind?.includes(id))) return;
  st.replyPending = true;
  setTimeout(() => {
    st.replyPending = false;
    if (s.stopped || st.s !== 'wait' || !st.chats.every(id => t.bind?.includes(id))) return;
    const replies = [
      ['c-zw','张伟','新增部分是 12 万，延续合同那块不报了。'],
      ['c-st','孙婷','可以，改列软件许可没问题。']
    ];
    st.ev = replies.map(([id, f, x]) => {
      const c = chat(id), m = { id:uid('m'), f, x, t:now() };
      c.msgs.push(m); c.un = S.chat === id && S.page === 'im' ? 0 : 1;
      s.ctx.in.push(messageContext(c, m));
      return [f + '的回复','message:' + m.id];
    });
    st.s = 'done'; st.tm = now(); st.d = st.done;
    if (S.page !== 'admin') toast('已收到两个科室的回复，预算会话继续', ['打开会话', 'ws:' + s.id]);
    runSess(s);
  }, 1800);
}

const A = {
  go, noop(){},
  toast(x){ toast(x); },
  say(x){ if (S.page !== 'home') S.page = 'home'; say(x); },
  homeSend(){
    if (!val('home-in').trim()) return;
    if (S.me !== 'csy'){ S.home.push({ r:'me', h:esc(take('home-in')) }, { r:'ai', tm:now(), h:'（演示身份只包含本案例数据）我在追踪你参与的组织事项，状态有变化会告诉你。要办理节点，请在事项里点「带事项上下文去工作台办」。' }); render(); return; }
    const context = S.homeRef ? '文件 · ' + S.homeRef[1] : undefined;
    S.homeRef = null; say(take('home-in'), context);
  },
  dotSend(){ const t = take('dot-in'); if (t) say(t, '正在看：' + ctxNow()); },
  dot(){ S.dot = !S.dot; if (S.dot) S.homeUnread = 0; render(); if (S.dot) setTimeout(() => $('#dot-in')?.focus(), 30); },
  draftLina(){ draftLina(); go('im:c-lina'); },
  newPpt(){ const s = newSess('周例会汇报 PPT · 二期进展', '做个 PPT：周例会汇报二期进展，给王处长看，6 页左右', { ws:'w-2q' }); S.home.push({ r:'ai', h:'好，在工作区「二期上线」开了一个会话做 PPT。', cards:[{ sess:s.id }], tm:now() }); render(); },
  pendOk(id){
    const p = S.pend[id];
    if (!p || p.done) return;
    p.done = 1;
    const session = newSess(p.t,p.req,{ctx:p.ctx,ws:p.ws,ctxIn:p.ctxIn?.filter(contextAllowed)});
    const job = createWorkspaceAgentTask(session,p.req);
    S.home.push({ r:'ai', h:`已开始办这件事。需要查执行细节时，可以进入「${esc(wsp(p.ws).name)}」工作区的会话。`,
      tm:now(), agentJob:job.id, cards:[{sess:session.id}] });
    render();
  },
  pendWs(id){ const p = S.pend[id]; const k = WSP.findIndex(w => w.id === p.ws); p.ws = WSP[(k + 1) % WSP.length].id; S.home.push({ r:'ai', tm:now(), h:`那放进工作区「<b>${esc(wsp(p.ws).name)}</b>」？`, acts:[['确认，开会话','pendOk', id],['再换一个','pendWs', id]] }); render(); },
  pendNo(id){ S.pend[id].done = 1; S.home.push({ r:'ai', tm:now(), h:'好，就在这里简单说：这件事我先给你一个思路提纲，需要成文时再开会话。' }); render(); },
  preOk(id){
    const p = S.pre[id]; if (!p || p.st !== 'open') return;
    const ti = ($('#pre-t-' + id)?.value ?? p.title).trim();
    if (p.kind === 'note'){ const n = { id:uid('n'), title:ti, body:$('#pre-b-' + id)?.value ?? p.body, time:'今天 ' + now(), src:p.source || '对话', refs:p.refs || [] }; NOTES.unshift(n); p.rid = n.id; }
    else {
      if (!ti) return toast('请填写事项标题');
      const dv = $('#pre-d-' + id)?.value, lv = $('#pre-l-' + id)?.value;
      const t = { id:uid('t'), title:ti, d: dv === 'null' ? null : dv ? +dv : p.d, list: lv || p.list, p:p.p || 0, src:p.src, desc:$('#pre-desc-' + id)?.value || '', ctx:p.ctxItems || [], bind: p.bind && canReadChat(chat(p.bind)) && ($('#pre-bd-' + id)?.checked ?? true) ? [p.bind] : [] };
      if (!LISTS.includes(t.list) && t.list !== '收件箱') LISTS.push(t.list);
      TASKS.push(t); p.rid = t.id;
      if (p.budget) { S.budgetTask = t.id; t.budget = true; }
    }
    p.title = ti; p.st = 'ok'; A.closeMask(); toast(p.kind === 'note' ? '已保存笔记' : '已建成事项', ['查看', (p.kind === 'note' ? 'note:' : 'task:') + p.rid]);
    if (p.budget) go('task:' + p.rid); else render();
  },
  preNo(id){ const p = S.pre[id]; if (p) p.st = 'no'; A.closeMask(); render(); },
  addToOk(){
    const picked = $('input[name="add-ctx-target"]:checked')?.value;
    if (!picked) return toast('请选择一个事项');
    const [id, nodeId] = picked.split('|');
    if (nodeId){
      const m = orgOf(id), nt = note(S.addCtx.items.find(item => item[2]?.link?.startsWith('note:'))[2].link.slice(5));
      linkNoteToNode(m, orgNode(m, nodeId), nt);
      A.closeMask(); toast(`已关联到 ${nodeId}，并加入组织事项上下文`, ['查看事项','task:' + id]); render(); return;
    }
    const items = S.addCtx.items.filter(item => !item.revoked && contextAllowed(item));
    if (!items.length) return toast('来源不可用');
    items.forEach(item => addCtx(id, ...item));
    S.msel = { on:false, ids:[] };
    A.closeMask(); toast(`已加入 ${items.length} 条上下文`, ['查看事项','task:' + id]); render();
  },

  /* 工作台 */
  newSess(){ S.cur = null; S.wsView = 'sess'; S.newWsp = S.newWsp || 'w-def'; render(); setTimeout(() => $('#ws-in')?.focus(), 30); },
  newWsp(){ S.wsView = 'sess'; const n = prompt('新工作区名称（同时在资料库生成同名的工作区库）', '新工作区'); if (!n) return; const w = { id:uid('w-'), name:n }; WSP.splice(WSP.length - 1, 0, w); S.newWsp = w.id; S.cur = null; toast(`已新建工作区「${n}」，资料库里同时有了它的工作区库`); render(); },
  wspTog(x){ S.wsOpen[x] = S.wsOpen[x] === false; render(); },
  wsQuick(x){ S.inp['ws-in'] = x + '：'; render(); $('#ws-in').focus(); },
  wsSend(){
    const t = take('ws-in'); if (!t) return;
    S.scrollFlow = true;
    if (!S.cur || S.wsView !== 'sess'){ S.wsView = 'sess'; const w = $('#new-wsp')?.value || 'w-def'; const s = newSess(titleOf(t), t, { ws:w, mode:S.newMode, std:take('goal-std'), refs:S.refs.new }); S.refs.new = []; S.cur = s.id; S.rp = s.mode === 'plan' ? 'plan' : 'art'; render(); return; }
    const s = sess(S.cur);
    const review = S.pendingReview[s.id];
    delete S.pendingReview[s.id];
    const quoted = review?.quote ? '<div class="quote">' + esc(review.quote) + '</div>' : '';
    s.tail.push({ r:'me', h:(review ? '<span class="tag">批注 · ' + esc(ARTS[review.id].name) + '</span>' + quoted : '') + '<div>' + esc(t) + '</div>' });
    if (review && s.status === 'done') return respondToReview(s,review,t);
    const rf = S.refs[s.id] || []; if (rf.length){ s.ctx.in.push(...rf.map(([a, l]) => ['@' + a, l])); S.refs[s.id] = []; }
    if (s.status === 'running'){ s.queue = s.queue || []; s.queue.push(t); render(); return; }
    if (/先问我|要问我/.test(t)){
      const id = proposeRule(t);
      s.tail.push({ r:'ai', h:'规则已预填：' + esc(S.ruleProposals[id]), tm:now(), acts:[['确认规则','ruleAccept',id],['取消','ruleCancel',id]] });
      render();
      return;
    }
    if (/做成(一个)?轻应用/.test(t)){ s.tail.push({ r:'ai', h:'好，把这次的办法做成了轻应用「预算测算汇总工具」：选测算表、设阈值就能出汇总表。在左栏「轻应用」里可以打开。', acts:[['打开看看','appOpen','ys']], tm:now() }); render(); return; }
    S.typing = true; render();
    setTimeout(() => {
      S.typing = false;
      const last = s.arts[s.arts.length - 1];
      if (last){
        const a = ARTS[last], nid = uid('a'), nm = a.name.replace(/( v\d+)?(\.\w+)$/, (m0, v, e) => ` v${(+(v || ' v1').trim().slice(1)) + 1}${e}`);
        ARTS[nid] = { name:nm, type:a.type, kind:a.kind === 'ys1' ? 'ys2' : a.kind, sess:s.id, time:'今天 ' + now() }; s.arts.push(nid); S.artSel = nid; S.newArt = nid;
        s.tail.push({ r:'ai', h:`好，按"${esc(t)}"改了一版，右侧是 <b>${esc(nm)}</b>。旧版本保留，可以「对比」。`, tm:now() });
      } else s.tail.push({ r:'ai', h:'收到，已记成这个会话的要求，后面的步骤按这个来。', tm:now() });
      render();
    }, 900);
  },
  rpTab(x){ S.rp = x; S.rpOpen = true; render(); },
  rpOpen(){ S.rpOpen = true; render(); },
  rpClose(){ S.rpOpen = false; render(); },
  rpWide(){ S.rpWide = !S.rpWide; render(); },
  stepTog(x){ S.stepOpen[x] = !S.stepOpen[x]; render(); },
  wsView(x){ S.wsView = x; render(); },
  appOpen(){ S.page = 'ws'; S.wsView = 'app'; S.appRan = false; render(); },
  appRun(){ S.appRan = true; render(); },
  sessMenu(x){
    const s = sess(x);
    $('#mask').innerHTML = `<div class="dlg" data-stop style="width:360px"><div class="hd"><b class="grow">${esc(s.title)}</b></div><div class="bd2">${[['重命名','sessRen'],[s.pin ? '取消置顶' : '置顶','sessPin'],['移到其他工作区','sessMove'],['归档','sessArch']].map(([l, a]) => `<div class="chk" style="cursor:pointer" data-a="${a}" data-x="${x}">${l}</div>`).join('')}<div class="chk mut">从这里分叉<span class="p1">P1</span></div></div><div class="ft2"><button class="btn" data-a="closeMask">关闭</button></div></div>`;
    $('#mask').classList.add('on');
  },
  sessRen(x){ const n = prompt('会话名称', sess(x).title); if (n) sess(x).title = n; A.closeMask(); render(); },
  sessPin(x){ sess(x).pin = !sess(x).pin; A.closeMask(); render(); },
  sessMove(x){ const s = sess(x); const k = WSP.findIndex(w => w.id === (s.ws || 'w-def')); s.ws = WSP[(k + 1) % WSP.length].id; A.closeMask(); toast(`已移到工作区「${wsp(s.ws).name}」，产物一起移过去`); render(); },
  sessArch(x){ sess(x).arch = 1; if (S.cur === x) S.cur = null; A.closeMask(); toast('已归档'); render(); },
  refPick(k){
    const items = [...TASKS.filter(t => !t.done).slice(0, 5).map(t => ['事项', t.title]), ...FILES.slice(0, 4).map(f => ['文件', f.name]), ...CHATS.filter(c => !c.g || c.ai).slice(0, 3).map(c => ['聊天', c.n]), ...NOTES.slice(0, 2).map(n => ['笔记', n.title])];
    S.refItems = items; S.refKey = k || (S.cur && S.wsView === 'sess' ? S.cur : 'new');
    $('#mask').innerHTML = `<div class="dlg" data-stop><div class="hd"><b class="grow">@ 引用</b><small>选中的内容会带进本次上下文</small></div><div class="bd2">${items.map(([t, l], i) => `<div class="chk" style="cursor:pointer" data-a="refAdd" data-x="${i}"><span class="tag">${t}</span><span class="grow">${esc(l)}</span></div>`).join('')}</div><div class="ft2"><button class="btn" data-a="closeMask">完成</button></div></div>`;
    $('#mask').classList.add('on');
  },
  refAdd(i){ const k = S.refKey; S.refs[k] = S.refs[k] || []; S.refs[k].push(S.refItems[+i]); A.closeMask(); render(); },
  refDel(k, i){ S.refs[k].splice(+i, 1); render(); },
  skillPick(){
    const sk = PLUGINS.filter(p => p.on).flatMap(p => p.sk.map(k => [k, p.name]));
    $('#mask').innerHTML = `<div class="dlg" data-stop><div class="hd"><b class="grow">/ 调用技能</b><small>按这个技能的办法来办</small></div><div class="bd2">${sk.map(([k, p]) => `<div class="chk" style="cursor:pointer" data-a="skillUse" data-x="${k}"><b class="grow">/ ${k}</b><small>插件 · ${p}</small></div>`).join('')}</div><div class="ft2"><button class="btn" data-a="closeMask">关闭</button></div></div>`;
    $('#mask').classList.add('on');
  },
  skillUse(k){ A.closeMask(); S.inp['ws-in'] = '/' + k + ' ' + (S.inp['ws-in'] || ''); render(); $('#ws-in')?.focus(); },
  planDel(x, y){
    const s = sess(x);
    if (!s || s.status !== 'plan' || !s.steps[y] || protectsPlanStep(s,s.steps[y])) return;
    s.steps.splice(+y,1); render();
  },
  planAdd(){ const s = sess(S.cur); const v = take('padd-' + s.id); if (!v) return; s.steps.splice(s.steps.length - 1, 0, { k:'plan', t:v, s:'planned' }); render(); },
  planGo(x){ const s = sess(x); s.steps.forEach(st => { if (st.s === 'planned') st.s = 'todo'; }); s.status = 'running'; s.tail.push({ r:'ai', tm:now(), h:'按确认后的计划开始执行。' }); runSess(s); },
  goalOk(x){ const s = sess(x); s.status = 'done'; s.tail.push({ r:'ai', tm:now(), h:'目标已由你确认达成，这个会话结束。' }); render(); },
  goalMore(x){ const s = sess(x); s.status = 'running'; s.steps.push({ k:'plan', t:'按你的要求继续推进：补充核对', s:'todo' }); s.goalAsked = 0; runSess(s); },
  rewind(x, y){
    const s = sess(x), k = +y;
    s.steps.forEach((st, n) => { if (n >= k){ if (st.art && ARTS[st.art]){ const o = ARTS[st.art]; st.art = uid('a'); st.artName = o.name.replace(/( v\d+)?(\.\w+)$/, (m0, v, e) => ` v${(+(v || ' v1').trim().slice(1)) + 1}${e}`); st.artType = o.type; st.artKind = o.kind; } if (['confirm','im','wait','link','deliver'].includes(st.k)) return; st.s = 'todo'; st.tm = ''; } });
    s.status = 'running'; s.stopped = false; s.tail.push({ r:'ai', tm:now(), h:`从第 ${k + 1} 步重新办（已发出的消息和收到的回复不重做）。之前生成的产物保留为旧版本。` }); runSess(s);
  },
  artCmp(a, b){
    const first = ARTS[a], second = ARTS[b];
    if (!first || !second || first.sess !== second.sess) return;
    const versions = sess(first.sess).arts.filter(id => {
      const base = name => name.replace(/ v\d+(\.\w+)$/, '$1');
      return base(ARTS[id].name) === base(first.name);
    });
    const selector = (active, side) => `<label>${side === 'first' ? '左侧' : '右侧'} <select data-compare-side="${side}" aria-label="${side === 'first' ? '左侧版本' : '右侧版本'}">
      ${versions.map(id => `<option value="${id}" ${id === active ? 'selected' : ''}>${esc(ARTS[id].name)}</option>`).join('')}</select></label>`;
    const [prior, next] = versions.indexOf(a) <= versions.indexOf(b) ? [first,second] : [second,first];
    const text = a === b ? '两侧显示同一版本。' : [
      prior.kind === 'ys1' && next.kind === 'ys2'
        ? '服务器维保 46.0 → 12.0 万，低代码平台许可改列「软件许可」，合计 346.5 → 312.5 万。' : '',
      (prior.notes?.length || 0) !== (next.notes?.length || 0)
        ? '备注由 ' + (prior.notes?.length || 0) + ' 条增至 ' + (next.notes?.length || 0) + ' 条。' : '',
    ].filter(Boolean).join(' ') || '可并排查看两个版本的原文。';
    const heading = (id, side) => `<div><h4>${esc(ARTS[id].name)}</h4>${selector(id,side)}${artBody(ARTS[id].kind,ARTS[id].name,id)}</div>`;
    $('#mask').innerHTML = `<div class="sheet compare-sheet" role="dialog" aria-label="版本对比"><div class="hd">
      <b class="grow">版本对比</b><button class="btn sm" data-a="closeMask">关闭</button></div><div class="bd">
      <div class="cmpsum">${esc(text)}</div><div class="cmpw">${heading(a,'first')}${heading(b,'second')}</div></div></div>`;
    $('#mask').classList.add('on');
  },
  stopSess(x){ const s = sess(x); s.stopped = true; s.runTicket = (s.runTicket || 0) + 1; s.status = 'paused'; s.steps.forEach(st => { if (st.s === 'run') st.s = 'todo'; }); s.tail.push({ r:'ai', h:'已停止。执行记录和已生成的产物已保留。', tm:now() }); render(); },
  ctxTog(){ S.ctxOpen = !S.ctxOpen; render(); },
  ctxDel(x, y){ const [g, k] = y.split(':'); sess(x).ctx[g].splice(+k, 1); toast('已从本次上下文移除，原文不受影响；后面的步骤不再用它'); render(); },
  ctxAdd(){ toast('原型：从事项、资料库、聊天、笔记里选，加入本次上下文'); },
  cp(x, y){
    const s = sess(x), st = s.steps.find(z => z.s === 'confirm');
    if (!st || S.page !== 'ws' || S.cur !== x) return;
    const option = CP[st.cp].opts.find(o => o[0] === y);
    if (!option) return;
    if ($('#cpk-' + x)?.checked){
      const t = y === 'ask' ? '预算口径有冲突时，先问相关科室' : '预算口径有冲突时，保留本次填报并在草稿里说明';
      if (!RULES.some(r => r.t === t)) RULES.push({ id:uid('r'), t, on:true, from:'确认点' });
    }
    st.s = 'done'; st.tm = now();
    st.d = '你的判断：' + option[1].replace(/（.*）/, '');
    const v2 = uid('a');
    const art = y === 'ask' ? v2 : s.budget.v1;
    s.budget.art = art;
    if (y === 'ask') s.steps.push(
      { k:'im', t:'起草给张伟、孙婷的询问', d:'由本人检查并发送', s:'todo', ms:550, ev:[['财务通知 · 第 3 条','f-tz']],
        drafts:[
          { chat:'c-zw', text:'张伟，服务器维保 46 万里含有 2026 年延续合同 34 万。按财务通知只报新增，麻烦确认新增是多少？', why:'财务通知 · 第 3 条', evidence:['f-tz'] },
          { chat:'c-st', text:'孙婷，按财务通知，低代码平台许可 18.5 万应列入「软件许可」。我这边改列可以吗？', why:'财务通知 · 第 3 条', evidence:['f-tz'] }
        ] },
      { k:'wait', t:'等张伟、孙婷回复', wt:'张伟、孙婷', chats:['c-zw','c-st'], done:'维保确认只报新增 12.0 万，低代码平台许可同意改列「软件许可」。', s:'todo' },
      { k:'write', t:'生成修订后的汇总表 v2', d:'合计 312.5 万，已存入工作区库', s:'todo', ms:750, art:v2, artName:'2027 预算测算汇总表 v2.xlsx', artType:'XLS', artKind:'ys2' });
    s.steps.push({ k:'link', t:'确认将汇总表关联回事项', s:'todo', artRef:art });
    runSess(s);
  },
  linkBudget(x, decision){
    const s = sess(x), st = s.steps.find(step => step.k === 'link' && step.s === 'link');
    if (!st || S.page !== 'ws' || S.cur !== x) return;
    const art = st.artRef, file = ARTS[art], t = task(s.from.id);
    if (decision === 'yes' && !t.ctx?.some(item => item[2]?.link === 'file:' + art)){
      addCtx(t.id, '产物', file.name, { link:'file:' + art });
    }
    st.s = 'done'; st.tm = now();
    st.d = decision === 'yes' ? '已关联到事项' : '本次跳过关联，汇总表已存入工作区库';
    const updated = file.kind === 'ys2';
    const text = updated
      ? '李娜，应用推进处 2027 年预算测算汇总表见附件，合计 312.5 万。运维科维保已剔除延续合同，低代码平台许可已改列「软件许可」。硬件报价待补。'
      : '李娜，应用推进处 2027 年预算测算汇总表见附件，合计 346.5 万。其中维保含延续合同 34 万，低代码许可填在新建项目。';
    s.steps.push(
      { k:'im', t:'起草给李娜的回复并附汇总表', ms:550, s:'todo', drafts:[{ chat:'c-lina', text, why:file.name, att:art, evidence:['f-tz', 'n4'] }] },
      { k:'deliver', t:'由本人检查并发送给李娜', s:'todo', chats:['c-lina'] }
    );
    runSess(s);
  },
  dbShare(){
    const items = [['周敏 · 安全管理制度（修订版）',28],['刘洋 · 机房出入记录、应急演练记录',25],['赵磊 · 网络拓扑图、资产清单',26],['吴凯（外部）· 渗透测试报告',30]];
    S.dbItems = items;
    $('#mask').innerHTML = `<div class="dlg" data-stop><div class="hd"><span class="orb xs"></span><b class="grow">建议建成 4 个事项</b><small>勾选你要建的，确认后才创建</small></div><div class="bd2">${items.map(([t, d], k) => `<label class="chk"><input type="checkbox" id="dbi-${k}" checked><span class="grow">${t}</span><small>${dlabel(d)} · 等保迎检</small></label>`).join('')}<div class="mut" style="margin-top:8px">建成后，分工表可以起草发到项目组群，由你本人发送。</div></div><div class="ft2"><button class="btn" data-a="closeMask">取消</button><button class="btn pri" data-a="dbOk">确认建成</button></div></div>`;
    $('#mask').classList.add('on');
  },
  dbOk(){
    let n = 0; S.dbItems.forEach(([t, d], k) => { if ($('#dbi-' + k)?.checked){ n++; TASKS.push({ id:uid('t'), title:t, d, list:'等保迎检', p:1, src:{ t:'ws', id:'db', l:'会话 · 等保迎检材料清单' } }); } });
    A.closeMask();
    const s = sess('db'); placeDraft('g-xt2', { text:'等保迎检材料分工如下，期限见表，有问题直接在群里说。', why:'等保迎检材料清单与分工', att:'db1' });
    s.tail.push({ r:'ai', h:`已按你的勾选建成 ${n} 个事项，在清单「等保迎检」下。分工表的消息起草好了，放在项目组群的输入框，由你本人发送。`, acts:[['看事项','go','tasks:等保迎检'],['去发送','go','im:g-xt2']], tm:now() });
    render();
  },
  saveWay(x){ const s = sess(x); if (s.waySaved) return; s.waySaved = 1; WAYS.unshift({ id:uid('w'), t:s.title.replace(/ ·.*$/, '') + '的做法', sc:s.title, st:s.steps.map(z => z.t.replace(/：.*$/, '')).slice(0, 4).join(' → ') }); s.tail.push({ r:'ai', h:'存好了，在工作台左栏「我的做法」里。下次办类似的事，我会带上它。', tm:now() }); render(); },
  plugOpen(x){ S.plugOpen = S.plugOpen === x ? null : x; render(); },
  plugTog(x){ const p = PLUGINS.find(z => z.id === x); p.on = !p.on; toast(p.on ? `已启用「${p.name}」` : `已停用「${p.name}」，${NAME}不会再用它的技能和专家`); render(); },
  artTab(x){ S.artTab = x; S.artSel = null; render(); },
  artSel(x){ S.artSel = x; if (S.page === 'ws' && S.cur && !sess(S.cur).arts.includes(x)) S.artTab = 'all'; render(); },
  openArt(x){ const f = fileById(x); if (!f) return; $('#mask').innerHTML = `<div class="sheet"><div class="hd">${extIco(f.type)}<div class="grow"><b>${esc(f.name)}</b><br><small>${esc(f.from)}</small></div><button class="btn sm" data-a="artExport" data-x="${x}">导出</button><button class="btn sm" data-a="closeMask">关闭</button></div><div class="bd">${artBody(f.kind, f.name, f.id)}</div></div>`; $('#mask').classList.add('on'); },
  closeMask(){ $('#mask').classList.remove('on'); },
  artToChat(x){ placeDraft('g-xt2', { text:'附件请大家看一下。', why:'引用产物', att:x }); toast('草稿和附件放进了「协同办公二期项目组」的输入框，由你本人发送', ['去发送', 'im:g-xt2']); render(); },
  artToTask(x){ const f = fileById(x); preDlg({ kind:'task', title:'跟进：' + f.name.replace(/\.\w+$/, ''), d:18, list:'收件箱', src:{ t:'ws', id:ARTS[x]?.sess || S.cur, l:'产物 · ' + f.name }, ctx:f.name, ctxItems:[['产物', f.name]] }); },
  artAddTo(x){ const name = fileById(x).name; addToDlg(name, '产物', [['产物', name, { link:'file:' + x }]]); },
  evOpen(x){
    const msg = x.startsWith('message:') ? msgOf(x.slice(8)) : null;
    if (msg && (!canReadChat(msg[0]) || msg[1].revoked)) return toast('来源不可用');
    const e = msg ? { n:msg[0].n + ' · ' + msg[1].t, q:esc(messageContext(...msg)[1]) } : EVID[x];
    if (!e) return toast('该示例暂无可查看的依据');
    $('#mask').innerHTML = `<div class="dlg" data-stop><div class="hd"><b class="grow">${e.inf ? '推断' : '依据'} · ${esc(e.n)}</b><button class="btn sm" data-a="closeMask">关闭</button></div><div class="bd2"><div class="srcq" style="${e.inf ? 'border-color:var(--wait);background:#faf8ff' : ''}">${e.q}</div>${e.inf ? '<p class="mut">推断用紫色标出，和原文写明的事实区分开。</p>' : '<p class="mut">高亮是这一步用到的片段。可以跳到原文所在的位置查看上下文。</p>'}</div>
      <div class="ft2"><button class="btn" data-a="evWrong" data-x="${x}">不对</button>${e.inf ? '' : `<button class="btn pri" data-a="evGo" data-x="${x}">打开原文</button>`}</div></div>`;
    $('#mask').classList.add('on');
  },
  evWrong(){ A.closeMask(); toast('已记下你的反馈，分身会在当前会话里重新处理这一步（首版不写入长期记忆）'); },
  evGo(x){ A.closeMask(); if (x === 'n4') go('note:n4'); else if (EVID[x]?.origin) go(EVID[x].origin); else if (x === 'way') go('mem:way'); else if (x.startsWith('message:')) go('msg:' + x.slice(8)); else go('file:' + x); },

  /* 事项 */
  tlist(x){ S.tlist = x; S.tsel = TASKS.filter(listFilter())[0]?.id || null; render(); },
  tsel(x){ S.tsel = x; if (S.tview === 'cal'){ const t = task(x); if (!TASKS.filter(listFilter()).includes(t)) S.tlist = t.done ? 'done' : t.list; } render(); },
  tview(x){ S.tview = x; render(); },
  tdone(x){ const t = task(x); if (t.org){ if (t.done) return isOwner(t) ? A.reopen(x) : null; return isOwner(t) ? A.orgComplete(x) : toast('组织事项只能由发起人标为完成'); } if (t.done) return A.reopen(x); t.done = true; t.looks = false; toast('完成 ✓ · ' + t.title + '（在「已完成」里能找回）'); render(); },
  notDone(x){ task(x).looks = false; render(); },
  newList(){ const n = prompt('新清单名称', ''); if (n){ LISTS.push(n); S.tlist = n; S.tsel = null; render(); } },
  tadd(){ const v = take('tadd'); if (!v) return; const t = Object.assign({ id:uid('t') }, parseTask(v)); t.src = { t:'me', l:'手动添加' }; const dv = $('#tadd-d')?.value, lv = $('#tadd-l')?.value; if (dv) t.d = +dv; if (lv){ t.list = lv; } if (!lv && !SMART.find(s => s[0] === S.tlist) && S.tlist !== t.list && !/#/.test(v)) t.list = S.tlist; if (S.tlist === 'today' && t.d == null) t.d = 16; TASKS.push(t); S.tsel = t.id; if (!listFilter()(t)) toast(`已加到「${t.list}」· ${dlabel(t.d) || '无日期'}`, ['查看', 'task:' + t.id]); render(); },
  subDone(x, y){ const sb = task(x).sub[+y]; sb.done = !sb.done; render(); },
  subAdd(){ const t = task(S.tsel); const v = take('sadd-' + t.id); if (!v) return; t.sub = t.sub || []; t.sub.push({ t:v, d:null }); render(); },
  subWs(x, y){ A.taskToWs(x, y); },
  tctxDel(x, y){ task(x).ctx.splice(+y, 1); toast('已从事项里拿掉，原文还在'); render(); },
  unbind(x, y){ const t = task(x); t.bind = t.bind.filter(c => c !== y); render(); },
  bindPick(x){
    const t = task(x);
    $('#mask').innerHTML = `<div class="dlg" data-stop><div class="hd"><b class="grow">绑定聊天或笔记</b><small>群 AI 未开启的群不能绑定</small></div><div class="bd2">${CHATS.map(c => `<div class="chk" ${c.g && !c.ai ? '' : `data-a="bindDo" data-x="${x}" data-y="${c.id}" style="cursor:pointer"`}><span class="grow">💬 ${esc(c.n)}</span>${(t.bind || []).includes(c.id) ? '<span class="tag ok">已绑定</span>' : c.g && !c.ai ? '<span class="tag">AI 未开启，不能绑定</span>' : ''}</div>`).join('')}${NOTES.slice(0, 4).map(n => `<div class="chk" data-a="bindDo" data-x="${x}" data-y="${n.id}" style="cursor:pointer"><span class="grow">✎ ${esc(n.title || '无标题')}</span>${(t.bind || []).includes(n.id) ? '<span class="tag ok">已绑定</span>' : ''}</div>`).join('')}</div><div class="ft2"><button class="btn" data-a="closeMask">完成</button></div></div>`;
    $('#mask').classList.add('on');
  },
  bindDo(x, y){ const t = task(x); if (chat(y) && !canReadChat(chat(y))) return; t.bind = t.bind || []; if (!t.bind.includes(y)) t.bind.push(y); SESS.filter(s => s.from?.id === x).forEach(maybeResumeBudget); A.bindPick(x); render(); },
  taskToWs(x, child){
    const t0 = task(x);
    if (child === undefined && !t0.budget && !isComplex(t0.title + (t0.desc || ''))) return simpleTask(t0);
    A.taskToWsForce(x, child);
  },
  taskToWsForce(x, child){
    const t = task(x);
    const items = [...(t.ctx || []).filter(contextAllowed).filter(item => !item.revoked), ...(t.bind || []).filter(id => !chat(id) || canReadChat(chat(id))).map(b => ['绑定', chat(b) ? chat(b).n + '（新消息）' : note(b)?.title || '', chat(b) ? { chat:b, link:'im:' + b } : { link:'note:' + b }])];
    const ws = { '2027 预算':'w-ys', '等保迎检':'w-db', '二期上线':'w-2q' }[t.list] || 'w-def';
    const sub = child === undefined ? null : t.sub[+child];
    S.tws = { id:x, items, sub };
    $('#mask').innerHTML = `<div class="dlg" data-stop style="width:580px"><div class="hd"><span class="orb xs"></span><b class="grow">带上下文交给${NAME}办</b><small>会在工作台开一个会话</small></div><div class="bd2">
      <div class="form" style="grid-template-columns:80px 1fr;margin-top:0"><span class="mut">要办什么</span><input id="tws-req" value="${esc('把这件事办了：' + (sub ? sub.t : t.title) + (t.d ? '，期限 ' + dlabel(t.d) : ''))}">
      <span class="mut">放进工作区</span><select id="tws-ws">${WSP.map(w => `<option value="${w.id}" ${w.id === ws ? 'selected' : ''}>${esc(w.name)}</option>`).join('')}</select>
      <span class="mut">执行模式</span><select id="tws-mode">${MODES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></div>
      <b style="font-size:12.5px">一起带上的上下文（${items.length + 1} 项）</b>
      <label class="chk"><input type="checkbox" checked disabled><span class="tag">事项</span><span class="grow">${esc(t.title)}${sub ? ` › ${esc(sub.t)}` : ""}</span></label>
      ${items.map(([k, l], n) => `<label class="chk"><input type="checkbox" id="tws-${n}" checked><span class="tag">${k}</span><span class="grow">${esc(l)}</span></label>`).join('')}
      <p class="mut" style="margin:8px 0 0">分身还会按需检索工作区库和已向量化的资料。开始后可以在右侧「上下文」里增删。</p></div>
      <div class="ft2"><button class="btn" data-a="closeMask">取消</button><button class="btn pri" data-a="twsGo">开始办</button></div></div>`;
    $('#mask').classList.add('on');
  },
  twsGo(){
    const { id, items, sub } = S.tws, t = task(id);
    const req = $('#tws-req').value.trim();
    if (!req) { $('#tws-req').focus(); return toast('请填写要办什么'); }
    const selected = items.filter((item, n) => $('#tws-' + n)?.checked && contextAllowed(item));
    const choice = { ws:$('#tws-ws').value, mode:$('#tws-mode').value };
    const from = { t:'事项', id:t.id, l:sub ? t.title + ' / ' + sub.t : t.title };
    const s = t.budget && !sub
      ? newBudgetSession(t, req, selected, choice)
      : newSess(sub?.t || t.title, req, { ...choice, from, ctxIn:selected });
    t.fs = s.id;
    A.closeMask();
    go('ws:' + s.id);
    S.rp = choice.mode === 'plan' ? 'plan' : 'ctx';
    S.rpOpen = true;
    render();
    toast(`已带着 ${selected.length + 1} 项上下文开了会话`);
  },
  reopen(x){ const t = task(x); t.done = false; t.looks = false; S.tlist = t.d != null && t.d <= 16 ? 'today' : 'all'; S.tsel = x; toast('已重新打开。上下文和之前的会话都还在，可以继续办'); render(); },
  tmore(){ S.tmore = !S.tmore; render(); },
  ctxText(){ const t = task(S.tsel), v = take('cin-' + t.id); if (!v) return; addCtx(t.id, '背景', v); toast('已加入上下文'); render(); },
  ctxFrom(k){
    const t = task(S.tsel);
    const items = k === 'msg'
      ? CHATS.filter(canReadChat).flatMap(c => c.msgs
        .filter(m => m.id && !m.revoked)
        .map(m => [...messageContext(c, m), c.n + ' · ' + m.t]))
      : k === 'note'
        ? NOTES.map(n => ['笔记', n.title || '无标题', { link:'note:' + n.id }, n.body.split('\n')[0]])
        : allFiles().map(f => ['文件', f.name, { link:'file:' + f.id },
          f.folder.startsWith('w-') ? '工作区库 · ' + wsp(f.folder).name : isOrg(f.folder) ? '组织知识库（只读）' : '个人知识库']);
    S.cfItems = items;
    $('#mask').innerHTML = `<div class="dlg" data-stop><div class="hd"><b class="grow">${{ msg:'从聊天选', note:'从笔记选', file:'从资料库选' }[k]}</b><small>加入事项「${esc(t.title.slice(0, 14))}」的上下文</small></div><div class="bd2">${k === 'msg' ? '<p class="mut" style="margin-top:0">群 AI 未开启的群不会出现在这里</p>' : ''}${items.map(([, l, , sub], n) => `<label class="chk"><input type="checkbox" id="cf-${n}"><span class="grow">${esc(l)}<br><small>${esc(sub)}</small></span></label>`).join('')}</div><div class="ft2"><button class="btn" data-a="closeMask">取消</button><button class="btn pri" data-a="cfOk">加入上下文</button></div></div>`;
    $('#mask').classList.add('on');
  },
  cfOk(){
    const t = task(S.tsel);
    const items = S.cfItems.filter((item, i) => $('#cf-' + i)?.checked && contextAllowed(item));
    if (!items.length) return toast('请勾选要加入的内容');
    items.forEach(([kind, label, ref]) => {
      if (!t.ctx?.some(item => ref.mid ? item[2]?.mid === ref.mid : item[2]?.link === ref.link)){
        addCtx(t.id, kind, label, ref);
      }
    });
    A.closeMask(); toast('已更新事项上下文'); render();
  },
  remind(x){ const t = task(x); toast(`${NAME}起草好了提醒${t.wait}的消息，放在项目组群的输入框，由你本人发送`, ['去看看', 'im:g-xt2']); placeDraft('g-xt2', { text:`@${t.wait} ${t.title.split('·')[1]?.trim() || ''}今天能给吗？方案要等它，有困难跟我说。`, why:'事项「' + t.title + '」' }); },

  /* 消息 */
  imSend(){
    const c = chat(S.chat), key = 'im-' + c.id, text = val(key).trim();
    if (!text) return;
    const d = S.drafts[c.id], fromDraft = d?.placed && canReadChat(c);
    const sv = fromDraft && d.sess ? sess(d.sess) : null;
    if (fromDraft) delete S.drafts[c.id];
    S.inp[key] = '';
    const sent = { id:uid('m'), me:1, t:now(), x:text, at:Date.now(),
      file:fromDraft ? d.att : null, drafted:Boolean(fromDraft), draftId:fromDraft ? d.id : null, sess:sv?.id };
    c.msgs.push(sent);
    if (sv?.budget){
      const st = sv.steps.find(step => (step.s === 'send' || step.s === 'wait') && step.chats.includes(c.id));
      const t = task(sv.from.id);
      if (st && !st.sent.includes(c.id)){
        st.sent.push(c.id);
        if (st.k === 'deliver'){
          sv.declaredArt = sv.budget.art;
          c.replied = true;
          st.s = 'done'; st.tm = now(); st.d = '陈思远已发送汇总表和回复';
          if (!t.done) t.looks = true;
          postHomeUpdate('finish',{ id:t.id },'汇总表和回复已发出。你可以回到事项，判断是否办完。');
          runSess(sv);
        } else {
          if (!t.bind?.includes(c.id)) S.bindSugs[c.id] = { task:t.id, sess:sv.id };
          runSess(sv);
          maybeResumeBudget(sv);
        }
      }
    }
    render();
  },
  bindOk(id){
    const b = S.bindSugs[id], t = b && task(b.task);
    if (!t || !canReadChat(chat(id))) return;
    delete S.bindSugs[id];
    t.bind = t.bind || [];
    if (!t.bind.includes(id)) t.bind.push(id);
    toast('已绑定到事项', ['查看会话', 'ws:' + b.sess]);
    maybeResumeBudget(sess(b.sess));
    render();
  },
  bindNo(id){ delete S.bindSugs[id]; toast('可以稍后在事项里绑定聊天'); render(); },
  dropDraft(id){
    if (S.drafts[id]?.placed) S.inp['im-' + id] = '';
    delete S.drafts[id];
    render();
  },
  draftPreview(id){
    const d = S.drafts[id]; if (!d || !canReadChat(chat(id))) return;
    dialog('分身草稿', `<div class="quote">${esc(d.text)}</div>${d.att ? '<p>附件 · ' + esc(fileById(d.att).name) + '</p>' : ''}`,
      `<button class="btn" data-a="closeMask">保留原输入</button><button class="btn pri" data-a="draftUse" data-x="${id}">放入输入框</button>`);
  },
  draftUse(id){
    const d = S.drafts[id]; if (!d || !canReadChat(chat(id))) return;
    d.placed = true; S.inp['im-' + id] = d.text;
    A.closeMask(); render(); $('#im-' + id)?.focus();
  },
  draftEvidence(id){
    const d = S.drafts[id]; if (!d) return;
    dialog('草稿依据', d.evidence.map(key => {
      if (EVID[key]) return `<button class="btn" data-a="evOpen" data-x="${key}">${esc(EVID[key].n)}</button>`;
      const [c, m] = msgOf(key);
      return canReadChat(c) && !m.revoked ? `<div class="quote">${esc(messageContext(c, m)[1])} <button class="btn lk" data-a="sourceGo" data-x="msg:${m.id}">打开原消息</button></div>` : '';
    }).join(''));
  },
  sourceGo(target){ A.closeMask(); go(target); },
  msgSource(id){
    const [, m] = msgOf(id);
    dialog('草稿来源', '<p>由贾维斯起草，已由你本人发送。</p>' + (m.sess ? `<button class="btn" data-a="sourceGo" data-x="ws:${m.sess}">打开来源会话</button>` : ''));
  },
  msgRecall(id){
    const [c, m] = msgOf(id);
    if (!m.me || !m.at || Date.now() - m.at >= 120000) return;
    m.revoked = true;
    TASKS.forEach(t => (t.ctx || []).forEach(item => { if (item[2]?.mid === id) item.revoked = true; }));
    SESS.forEach(s => { if (s.ctx) s.ctx.in = s.ctx.in.filter(item => item[2]?.mid !== id); });
    if (m.sess && c.id === 'c-lina' && sess(m.sess)?.budget && !task(sess(m.sess).from.id).done){
      task(sess(m.sess).from.id).looks = false;
    }
    render();
  },
  groupSettings(id){
    const c = chat(id); if (!c?.g) return;
    const owner = id === 'g-xt2';
    dialog('群设置 · ' + c.n, `<p class="mut">${owner ? '你是群主' : '由群主管理'}</p><div class="sec-row"><div class="grow"><b>允许成员的分身读取此群</b><br><small>各成员只能使用自己有权读取的消息。</small></div>
      ${owner ? `<button class="btn ${c.ai ? 'acc' : ''}" data-a="groupAI" data-x="${id}">AI 已${c.ai ? '开启 · 关闭' : '关闭 · 开启'}</button>` : `<span class="tag">AI ${c.ai ? '已开启' : '未开启'}</span>`}</div>`);
  },
  groupAI(id){
    const c = chat(id);
    if (id !== 'g-xt2') return;
    c.ai = !c.ai;
    c.msgs.push({ system:true, x:'群主陈思远已' + (c.ai ? '开启' : '关闭') + '群 AI' });
    if (!c.ai){
      S.msel = { on:false, ids:[] };
      A.dropDraft(id);
      TASKS.forEach(t => { if (t.bind) t.bind = t.bind.filter(b => b !== id); });
      SESS.forEach(s => { if (s.ctx) s.ctx.in = s.ctx.in.filter(contextAllowed); });
    }
    A.closeMask(); render();
  },
  saveFile(x){ const f = fileById(x); f.folder = 'kb-ys'; f.from = '从聊天保存'; toast(`已保存到个人知识库「预算资料」，正在向量化`, ['查看', 'file:' + x]); },
  giveFs(x){
    const [c, m] = msgOf(x);
    if (!canReadChat(c) || m.revoked) return;
    const body = messageContext(c, m)[1];
    S.dot = true; S.home.push({ r:'me', h:`<div class="quote">${esc(c.n)} · ${m.t}<br>${esc(body)}</div>交给你看看` });
    S.typing = true; render();
    setTimeout(() => {
      S.typing = false;
      if (x === 'm-liuy') S.home.push({ r:'ai', tm:now(), h:'测试报告是二期方案的前置。晚两天的话，方案 v0.4 也要顺延，但离 11-27 定稿还有余量。建议：', acts:[['确认顺延到 11-18，并起草提醒','extendLiuy'],['开会话评估对上线的影响','assessLiuy'],['先不动','noop']] });
      else if (x === 'm-lina') S.home.push({ r:'ai', tm:now(), h:'李娜在等应用推进处的测算表。可以先建成事项，把这条请求和期限留进去。', acts:[['建成事项','msgTask', x]] });
      else S.home.push({ r:'ai', tm:now(), h:'收到。要我：', acts:[['建成事项','msgTask', x],['开会话办','wsFromMsg', body.slice(0, 16)]] });
      render();
    }, 800);
  },
  extendLiuy(){ task('t4').d = 18; placeDraft('g-xt2', { text:'@刘洋 测试报告期限顺延到 18 号，环境还没恢复的话先给我已测部分。', why:'你刚才的决定' }); S.home.push({ r:'ai', tm:now(), h:'按你的确认，事项期限改到 11-18。给刘洋的话放进了项目组群的输入框，由你本人发送。', acts:[['去发送','go','im:g-xt2']] }); render(); },
  assessLiuy(){ const s = newSess('测试报告延期对二期上线的影响', '刘洋说测试报告晚两天，评估对 11-27 定稿和 12-08 上线的影响', { ctx:'刘洋 · 项目组群 · 测试报告晚两天', ws:'w-2q' }); S.home.push({ r:'ai', tm:now(), h:'好，在工作区「二期上线」开了会话评估。', cards:[{ sess:s.id }] }); render(); },
  wsFromMsg(x){ const s = newSess(x, x); S.home.push({ r:'ai', tm:now(), h:`好，在工作区「${esc(wsp(s.ws).name)}」开了会话。`, cards:[{ sess:s.id }] }); render(); },
  mselOn(x){ if (!canReadChat(chat(S.chat))) return; S.msel = { on:true, chat:S.chat, ids:[x] }; render(); },
  mselOff(){ S.msel = { on:false, ids:[] }; render(); },
  mselTog(x){ const i = S.msel.ids.indexOf(x); if (i < 0) S.msel.ids.push(x); else S.msel.ids.splice(i, 1); render(); },
  mHelp(){
    const c = chat(S.chat), ms = S.msel.ids.map(i => c.msgs.find(m => m.id === i)), who = [...new Set(ms.filter(m => !m.me).map(m => m.f))];
    const txt = c.id === 'g-xt2' && who.includes('刘洋') ? `@刘洋 测试报告可以顺延到 18 号，环境恢复前先把已测部分发我。${who.includes('周敏') ? '@周敏 法务意见出来后第一时间同步我，合同盖章版华信周五寄到。' : ''}` : `收到，${who.join('、') || '大家'}提到的${ms.length > 1 ? '这几件事' : '这件事'}我都记下了，今天内逐一回复。`;
    placeDraft(c.id, { text:txt, why:`选中的 ${ms.length} 条消息`, evidence:ms.map(m => m.id) }); S.msel = { on:false, ids:[] }; render();
  },
  mTask(){
    const c = chat(S.chat), ms = S.msel.ids.map(i => c.msgs.find(m => m.id === i)), who = [...new Set(ms.map(m => m.f || '我'))];
    S.mPick = { c:c.id, ms };
    if (who.length > 1){
      $('#mask').innerHTML = `<div class="dlg" data-stop><div class="hd"><span class="orb xs"></span><b class="grow">这几条消息像是 ${who.length} 件事</b></div><div class="bd2">${ms.map(m => `<div class="quote">${esc(m.f || '我')}：${esc(m.x || '[文件]')}</div>`).join('')}<p class="mut">合成一个事项：几条消息都放进它的上下文。分别建成：每人一件，你勾选后确认。</p></div><div class="ft2"><button class="btn" data-a="mTaskSplit">分别建成 ${who.length} 个</button><button class="btn pri" data-a="mTaskOne">合成一个事项</button></div></div>`;
      $('#mask').classList.add('on');
    } else A.mTaskOne();
  },
  mTaskOne(){ const { c, ms } = S.mPick, ch = chat(c); if (!canReadChat(ch)) return; S.msel = { on:false, ids:[] }; preDlg({ kind:'task', title:`跟进：${(ms.find(m => m.x) || {}).x?.slice(0, 18) || ch.n}`, d:18, list:/二期|测试|合同/.test(ms.map(m => m.x).join('')) ? '二期上线' : '收件箱', src:{ t:'im', id:c, l:`${ch.n} · ${ms.length} 条消息` }, bind:c, ctx:ms.map(m => `${m.f || '我'}：${m.x || '[文件]'}`).join('\n'), ctxItems:ms.map(m => messageContext(ch, m)) }); },
  mTaskSplit(){
    const { c, ms } = S.mPick, ch = chat(c); S.msel = { on:false, ids:[] };
    S.dbItems = Array.from(new Set(ms.map(m => m.f || '我')), name => ms.filter(m => (m.f || '我') === name)).map(group => [`${group[0].f || '我'}：${(group[0].x || '文件').slice(0, 20)}`, 18, group, c]);
    $('#mask').innerHTML = `<div class="dlg" data-stop><div class="hd"><span class="orb xs"></span><b class="grow">分别建成事项</b><small>勾选你要建的</small></div><div class="bd2">${S.dbItems.map(([t, d], k) => `<label class="chk"><input type="checkbox" id="dbi-${k}" checked><span class="grow">${esc(t)}</span><small>${dlabel(d)}</small></label>`).join('')}</div><div class="ft2"><button class="btn" data-a="closeMask">取消</button><button class="btn pri" data-a="mSplitOk">确认建成</button></div></div>`;
  },
  mSplitOk(){ let n = 0; S.dbItems.forEach(([t, d, group, c], k) => { if ($('#dbi-' + k)?.checked){ n++; TASKS.push({ id:uid('t'), title:t, d, list:'二期上线', p:1, src:{ t:'im', id:c, mid:group[0].id, l:`${group[0].f || '我'} · ${chat(c).n}` }, ctx:group.map(m => messageContext(chat(c), m)), bind:[] }); } }); A.closeMask(); toast(`已建成 ${n} 个事项`, ['查看', 'tasks:二期上线']); render(); },
  mAddTo(){ const c = chat(S.chat), ms = S.msel.ids.map(i => c.msgs.find(m => m.id === i)); addToDlg(ms.map(m => `${m.f || '我'}：${m.x || '[文件]'}`).join('\n'), '消息', ms.map(m => messageContext(c, m))); },
  mNote(){ const c = chat(S.chat); noteFromMessages(c, S.msel.ids.map(i => c.msgs.find(m => m.id === i))); },
  mGive(){
    const c = chat(S.chat);
    if (!canReadChat(c)) return;
    const ms = S.msel.ids.map(id => c.msgs.find(m => m.id === id));
    if (!ms.length) return;
    const items = ms.map(m => messageContext(c, m));
    S.mPick = { c:c.id, ms };
    S.msel = { on:false, ids:[] };
    S.dot = true;
    S.home.push({ r:'me', h:`<div class="quote">${items.map(item => esc(item[1])).join('<br>')}</div>交给你看看` });
    const id = uid('q');
    S.pend = S.pend || {};
    S.pend[id] = { t:c.n + ' · 消息跟进', req:'根据选中的消息整理跟进要点', ctxIn:items, ws:c.id === 'g-xt2' ? 'w-2q' : 'w-def' };
    S.home.push({
      r:'ai', tm:now(), h:`已带入 ${ms.length} 条消息。你可以先合成一个事项，也可以在工作台开会话整理跟进要点。`,
      acts:[['预填事项','mTaskOne'],['开会话整理','pendOk',id]]
    });
    render();
  },
  msgTask(x){
    const [c, m] = msgOf(x);
    if (!canReadChat(c) || m.revoked) return;
    if (x === 'm-lina' && S.budgetTask) return go('task:' + S.budgetTask);
    const item = messageContext(c, m), t = parseTask(m.x || item[1]);
    preDlg({
      kind:'task', title:x === 'm-lina' ? '提交应用推进处 2027 年预算测算汇总' : item[1].slice(0, 28),
      budget:x === 'm-lina', d:t.d, list:x === 'm-lina' ? '2027 预算' : t.list,
      src:{ t:'im', id:c.id, mid:m.id, l:c.n + ' · ' + (m.f || '我') + ' · ' + m.t },
      bind:c.id, ctx:item[1], ctxItems:[item]
    });
  },
  msgAddTo(x){
    const [c, m] = msgOf(x);
    if (!canReadChat(c) || m.revoked) return;
    const item = messageContext(c, m);
    addToDlg(item[1], '消息', [item]);
  },
  msgNote(x){ const [c, m] = msgOf(x); noteFromMessages(c, [m]); },
  draftReply(id, mid){
    if (!canReadChat(chat(id))) return;
    if (id === 'c-lina') draftLina();
    else placeDraft(id, { text:'收到，我这边核对后给你答复。', why:'所选消息', evidence:mid ? [mid] : [] });
    render();
  },

  /* 笔记 */
  nsel(x){ S.nsel = x; render(); },
  newNote(){ const n = { id:uid('n'), title:'', body:'', time:'今天 ' + now(), src:'记一条' }; NOTES.unshift(n); S.nsel = n.id; render(); setTimeout(() => $('#nb-' + n.id)?.focus(), 30); },
  noteTidy(){ const n = note(S.nsel); S.nsug = n.id === 'n1' ? { id:n.id, sum:'华信盖章合同周五寄到；顺带问周敏法务意见是否有改动。', todo:'确认收到合同盖章版，并问周敏法务意见', d:20 } : { id:n.id, sum:n.body.replace(/\n/g, ' ').slice(0, 40) + '…', todo:'跟进：' + (n.title || n.body.slice(0, 10)), d:18 }; render(); },
  nsugAdd(){ const n = note(S.nsug.id); S.nsug.added = true; preDlg({ kind:'task', title:S.nsug.todo, d:S.nsug.d, list:'二期上线', src:{ t:'note', id:n.id, l:'笔记 · ' + n.title }, ctx:n.body, ctxItems:[['笔记', n.title]] }); },
  nsugOff(){ S.nsug = null; render(); },
  noteTask(){ const n = note(S.nsel); const t = parseTask(n.body.split('\n')[0]); preDlg({ kind:'task', title:n.title || t.title, d:t.d || 18, list:t.list, src:{ t:'note', id:n.id, l:'笔记 · ' + (n.title || '') }, ctx:n.body, ctxItems:[['笔记', n.title || '']] }); },
  noteAddTo(){ const n = note(S.nsel); addToDlg(n.body, '笔记', [['笔记', n.title || '无标题', { link:'note:' + n.id }]]); },
  noteWs(){
    const n = note(S.nsel);
    if (isComplex((n.title || '') + n.body)){ const s = newSess('根据笔记：' + (n.title || '无标题'), '根据这条笔记办：' + n.body, { ctx:'笔记 · ' + n.title }); go('ws:' + s.id); return; }
    simpleHandle('笔记 · ' + (n.title || '无标题'), n.body.split('\n')[0], n.body);
  },

  /* 资料库 */
  folder(x){ S.folder = x; S.fsel = null; S.fileSearch = ''; render(); },
  fsel(x){ S.fsel = x; render(); },
  autoVec(x){ if (isOrg(x)) return; KBAUTO[x] = !KBAUTO[x]; toast(KBAUTO[x] ? '已开启：之后放进这个文件夹的文件会自动向量化' : '已关闭自动向量化（已有文件不受影响）'); render(); },
  vecTog(x){ const f = fileById(x); if (f?.ro) return toast('组织知识库为只读，向量化由组织统一维护'); if (f.vec === 'y'){ f.vec = 'n'; toast('已取消向量化：原文还在，分身检索不到它了'); render(); } else { f.vec = 'r'; render(); setTimeout(() => { f.vec = 'y'; toast('向量化完成，分身办事时可以检索到它'); render(); }, 1800); } },
  upload(){ if (isOrg(S.folder)) return toast('组织知识库为只读，不能上传'); if (S.folder.startsWith('w-') || S.folder === 'kb-all'){ /* ok */ } const f = { id:uid('f'), name:'新上传的文件.pdf', type:'PDF', folder:S.folder === 'kb-all' ? 'kb-zd' : S.folder, from:'上传', time:'今天', kind:'doc', vec:(S.folder.startsWith('w-') || KBAUTO[S.folder] || S.folder === 'kb-all') ? 'r' : 'n' }; FILES.unshift(f); S.fsel = f.id; render(); if (f.vec === 'r') setTimeout(() => { f.vec = 'y'; render(); }, 1800); },
  fileFs(x){ const f = fileById(x); S.dot = true; render(); S.inp['dot-in'] = ''; setTimeout(() => { const e = $('#dot-in'); if (e){ e.value = `看一下《${f.name}》，`; S.inp['dot-in'] = e.value; e.focus(); } }, 30); },
  fileTask(x){ const f = fileById(x); preDlg({ kind:'task', title:'跟进：' + f.name.replace(/\.\w+$/, ''), d:18, list:'收件箱', src:{ t:'me', l:'文件 · ' + f.name }, ctx:f.name, ctxItems:[['文件', f.name]] }); },
  fileAddTo(x){ const name = fileById(x).name; addToDlg(name, '文件', [['文件', name, { link:'file:' + x }]]); },

  /* 设置 */
  setTab(x){ S.setTab = x; render(); },
  memTab(x){ S.memTab = x; render(); },
  memDel(x){ const [g, i] = x.split(':'); ({ fact:FACTS, way:WAYS, rule:RULES })[g].splice(+i, 1); toast('已删除，分身之后不会再用它'); render(); },
  memWrong(x){ const n = prompt('哪里不对？分身会按你的说法纠正', ''); if (n){ const i = +x.split(':')[1]; FACTS[i].t = n; FACTS[i].src += ' · 你已纠正'; render(); } },
  ruleTog(x){ const r = RULES.find(z => z.id === x); if (r.lock) return; r.on = !r.on; render(); },
};

/* ====================== v9 案例：组织事项 · 演示身份 ====================== */
/* 组织事项：由一人发起，邀请组织成员加入，在同一个事项空间里按节点（分工）合作完成一件事。
   发起人制定目标、节点和上下文，采纳或退回提交，最后由本人标为完成；参与方基于事项上下文在自己的工作台办理并提交。
   分身只追踪状态（加入、提交、退回、快到期），不预填目标和节点，也不催办。 */
const PERSONA = {
  csy:{ pid:'p-csy', n:'陈思远', short:'思远', dept:'应用推进处', title:'三级主任科员' },
  fzy:{ pid:'p-fzy', n:'方振宇', short:'振宇', dept:'项目统筹处', title:'一级主任科员' },
};
S.me = 'csy';
const mePid = () => PERSONA[S.me].pid;
const personaOf = pid => Object.keys(PERSONA).find(k => PERSONA[k].pid === pid);
const pname = pid => person(pid)?.n || '';
const ORG_MATTERS = [];
const ORG_TPL = {
  id:'tpl-zylx', name:'专业类立项（内部流程，至报批稿）', pub:'项目统筹处', ver:'2026 版',
  goal:'形成经项目统筹处复核通过的立项报批稿，提交局党组会审议立项（第一次党组会定「立不立」）。',
  ctx:[['文件','深圳市政务信息化项目管理办法.pdf',{ link:'file:o-xmgl' }],['文件','政务信息化项目立项材料编制指引.docx',{ link:'file:o-lxzy' }],
    ['文件','政务信息化项目专家论证工作规程.pdf',{ link:'file:o-zjlz' }],['文件','政务信息化运营服务费用测算标准（2026版）.xlsx',{ link:'file:o-yyfy' }]],
  nodes:[
    { id:'N1', t:'编制立项方案', role:'me', out:'立项方案及 6 项申报材料', d:16, step:'s1' },
    { id:'N2', t:'形式审查', role:'xmtc', out:'形式审查意见；缺项出补正通知', d:18, step:'s2' },
    { id:'N3', t:'补正再报', role:'me', out:'补正材料与逐条响应说明', d:20, step:'s3' },
    { id:'N4', t:'分管副局长专题会纪要', role:'me', out:'关联专题会纪要（线下会议）', d:23, link:'note' },
    { id:'N5', t:'按纪要修改方案与预算', role:'me', out:'立项方案 v3、预算明细 v3', d:25, step:'s5' },
    { id:'N6', t:'内部专家论证意见', role:'expert', out:'论证意见（每位专家一份）', d:30 },
    { id:'N7', t:'专家意见回复与修改', role:'me', out:'逐条回复表、立项方案 v4', d:33, step:'s7' },
    { id:'N8', t:'复核并形成报批稿', role:'xmtc', out:'复核意见、报批稿', d:35, step:'s8' },
  ],
};
const ROLE_LABEL = { me:'发起人本人', xmtc:'项目统筹处经办人', expert:'评审专家（论证会前邀请）' };
const orgOf = id => ORG_MATTERS.find(m => m.id === id);
const orgNode = (m, nid) => m.org.nodes.find(n => n.id === nid);
const isOwner = m => m.org.owner === mePid();
const member = (m, pid) => m.org.members.find(x => x.pid === pid);
const isMember = (m, pid) => pid === m.org.owner || member(m, pid)?.st === 'joined';

/* ---------- 演示身份：宿主的个人数据整体切换，组织事项共用同一份 ---------- */
const BAGS = {};
const swapInto = (arr, next) => arr.splice(0, arr.length, ...next);
function initBag(k){
  if (k !== 'fzy') return null;
  return {
    TASKS:[
      { id:'tf1', title:'审核 2027 年度项目申报汇总表', d:19, list:'收件箱', p:2, src:{ t:'me', l:'手动添加' } },
      { id:'tf2', title:'更新专家库年度名单', d:23, list:'收件箱', p:1, src:{ t:'me', l:'手动添加' } },
    ],
    CHATS:[
      { id:'g-xmtc', g:1, ai:1, n:'项目统筹处工作群', sub:'9 人', tm:'周五', msgs:[{ day:'11月13日 周五' },{ id:'g-xmtc-m1', f:'邵卫东', t:'09:10', x:'下周集中审一批立项材料，形式审查注意 2 个工作日时限。' }] },
      { id:'c-csy', n:'陈思远', sub:'应用推进处 · 三级主任科员', tm:'周一', msgs:[{ day:'11月16日 周一' }] },
    ],
    NOTES:[], FILES:[], AGENT_TASKS:[],
    home:[{ r:'ai', tm:'08:30', h:'<span class="agent-greeting">振宇，早上好。</span> 今天没有特别急的事。有组织事项的新变化，我会在这里和「分身在办」里告诉你。' }],
    homeUnread:0, chat:'g-xmtc', tlist:'all', tsel:'tf1', nsel:null,
  };
}
const bagOf = k => k === S.me ? null : (BAGS[k] = BAGS[k] || initBag(k));
function syncOrgTasks(){
  for (const m of ORG_MATTERS){
    const has = TASKS.includes(m), should = isMember(m, mePid());
    if (should && !has) TASKS.unshift(m);
    if (!should && has) TASKS.splice(TASKS.indexOf(m), 1);
  }
}
function switchPersona(k){
  if (!PERSONA[k] || k === S.me) return;
  BAGS[S.me] = { TASKS:[...TASKS], CHATS:[...CHATS], NOTES:[...NOTES], FILES:[...FILES], AGENT_TASKS:[...AGENT_TASKS],
    home:S.home, homeUnread:S.homeUnread, chat:S.chat, tlist:S.tlist, tsel:S.tsel, nsel:S.nsel };
  const b = bagOf(k); delete BAGS[k];
  swapInto(TASKS, b.TASKS); swapInto(CHATS, b.CHATS); swapInto(NOTES, b.NOTES); swapInto(FILES, b.FILES); swapInto(AGENT_TASKS, b.AGENT_TASKS);
  S.home = b.home; S.homeUnread = b.homeUnread; S.chat = b.chat; S.tlist = b.tlist; S.tsel = b.tsel; S.nsel = b.nsel;
  S.me = k; S.dot = false; S.agentTaskOpen = null; S.person = null; S.fsel = null; S.folder = 'org-all';
  syncOrgTasks();
  WB()?.setUser(k);
  go('home');
  toast(`已切换演示身份：${PERSONA[k].n} · ${PERSONA[k].dept}`);
}
/* 给某个身份的分身首页发一条追踪消息（该身份不在前台时先存起来）。 */
function pingPersona(pid, h, act){
  const k = personaOf(pid);
  if (!k) return;
  const msg = { r:'ai', tm:now(), h, acts:act ? [[act[0], 'go', act[1]]] : undefined };
  if (k === S.me){ S.home.push(msg); if (S.page !== 'home' && !S.dot) S.homeUnread++; }
  else { const b = bagOf(k); b.home.push(msg); b.homeUnread++; }
}
function agentJobsOf(pid){ const k = personaOf(pid); return !k ? null : k === S.me ? AGENT_TASKS : bagOf(k).AGENT_TASKS; }
function ensureOrgJob(m, pid){
  const jobs = agentJobsOf(pid);
  if (!jobs || jobs.some(j => j.mode === 'org' && j.matter === m.id)) return;
  jobs.unshift({ id:uid('agent-job-'), mode:'org', matter:m.id, who:pid, title:'追踪组织事项 · ' + m.title.split(' · ')[0],
    request:'只追踪状态：谁加入、谁提交、谁被退回、哪个节点快到期。不预填目标和节点，不催办。', phase:'waiting', stage:'', steps:[], sessions:[], sources:[['打开组织事项','task:' + m.id]] });
}
function track(m, x){ m.org.track.push({ tm:now(), x }); }

/* ---------- 节点状态 ---------- */
const lastSub = (n, pid) => [...n.subs].reverse().find(x => x.by === pid);
function nodeState(m, n){
  if (n.link) return n.linked ? ['ok','已完成'] : ['','待关联'];
  if (!n.who.length) return ['', n.role === 'expert' ? '待邀请专家' : '待指定'];
  const st = n.who.map(pid => member(m, pid)?.st === 'invited' ? 'invited' : lastSub(n, pid)?.st || 'none');
  if (st.every(x => x === 'accepted')) return ['ok','已完成'];
  if (st.includes('pending')) return ['warn','待采纳'];
  if (st.includes('returned')) return ['warn','已退回'];
  if (st.includes('invited')) return ['wait','等待接受邀请'];
  if (st.includes('accepted')) return ['ai','部分完成'];
  return ['','进行中'];
}
const nodeDone = (m, n) => nodeState(m, n)[1] === '已完成';
function syncOrgJob(job){
  const m = orgOf(job.matter);
  if (!m) return;
  const me = job.who;
  job.steps = m.org.nodes.map(n => ({ title:n.id + ' ' + n.t, complete:nodeDone(m, n) }));
  job.result = m.org.track.slice(-3).reverse().map(t => t.tm + ' ' + t.x);
  job.action = ['打开组织事项','task:' + m.id];
  if (m.done){ job.phase = 'done'; job.stage = '发起人已把事项标为完成'; return; }
  const open = m.org.nodes.find(n => !nodeDone(m, n));
  if (me === m.org.owner){
    const pending = m.org.nodes.flatMap(n => n.subs.filter(x => x.st === 'pending'));
    const invited = m.org.members.filter(x => x.st === 'invited');
    if (pending.length){ job.phase = 'attention'; job.stage = `${pending.length} 份提交待你采纳或退回`; return; }
    if (!open){ job.phase = 'attention'; job.stage = '全部节点已完成，由你本人标为完成'; return; }
    if (open.who.includes(me) || (open.link && !open.linked) || (open.role === 'expert' && !open.who.length)){
      job.phase = 'attention'; job.stage = `轮到你：${open.id} ${open.t}`; return; }
    job.phase = 'waiting';
    job.stage = invited.length && open.who.some(pid => invited.some(x => x.pid === pid))
      ? `等待 ${invited.map(x => pname(x.pid)).join('、')} 接受邀请`
      : `等 ${open.who.filter(pid => lastSub(open, pid)?.st !== 'accepted').map(pname).join('、')} 提交 ${open.id} ${open.t}`;
    return;
  }
  const mine = m.org.nodes.filter(n => n.who.includes(me) && !nodeDone(m, n));
  const ret = mine.find(n => lastSub(n, me)?.st === 'returned');
  if (ret){ job.phase = 'attention'; job.stage = `${ret.id} 被退回：${lastSub(ret, me).reason}`; return; }
  const turn = mine.find(n => !lastSub(n, me) && (n === open));
  if (turn){ job.phase = 'attention'; job.stage = `轮到你：${turn.id} ${turn.t}（${dlabel(turn.d)}）`; return; }
  const waitAccept = mine.find(n => lastSub(n, me)?.st === 'pending');
  job.phase = 'waiting';
  job.stage = waitAccept ? `${waitAccept.id} 已提交，等发起人采纳` : mine.length ? `等前序节点：${open?.id || ''} ${open?.t || ''}` : '你负责的节点都已完成';
}

/* ---------- 事项页：组织事项详情 ---------- */
function orgSheet(t){
  const o = t.org, owner = isOwner(t);
  const done = o.nodes.filter(n => nodeDone(t, n)).length;
  const subRow = (n, x, i) => `<div class="org-sub ${x.st}">
      <div class="row"><b>${esc(pname(x.by))}</b><small>${esc(x.tm)} 提交</small><span class="grow"></span>
      <span class="tag ${({ accepted:'ok', pending:'warn', returned:'wait' })[x.st]}">${({ accepted:x.self ? '已生效（本人提交）' : '已采纳', pending:'待采纳', returned:'已退回' })[x.st]}</span></div>
      <p>${esc(x.note)}</p>
      <div class="org-files">${x.files.map((f, k) => `<button class="btn sm" data-a="orgFile" data-x="${t.id}|${n.id}|${i}|${k}">▤ ${esc(f.name)}</button>`).join('')}
      ${x.wbId && personaOf(x.by) === S.me ? `<button class="btn lk" data-a="orgWb" data-x="${esc(x.wbId)}">打开办理会话</button>` : ''}</div>
      ${x.st === 'returned' ? `<p class="org-reason">退回理由：${esc(x.reason)}</p>` : ''}
      ${x.st === 'pending' && owner ? `<div class="row" style="gap:6px"><button class="btn sm acc" data-a="orgAccept" data-x="${t.id}|${n.id}|${i}">采纳</button><button class="btn sm" data-a="orgReturn" data-x="${t.id}|${n.id}|${i}">退回</button></div>` : ''}
    </div>`;
  const nodeHtml = n => {
    const ready0 = t.org.nodes.slice(0, t.org.nodes.indexOf(n)).every(k => nodeDone(t, k));
    let [tone, label] = nodeState(t, n);
    if (label === '进行中' && !ready0) label = '未开始';
    const mine = n.who.includes(mePid()) && isMember(t, mePid());
    const last = lastSub(n, mePid());
    const ready = t.org.nodes.slice(0, t.org.nodes.indexOf(n)).every(k => nodeDone(t, k));
    const canWork = n.step && mine && ready && (!last || last.st === 'returned');
    const who = n.link ? '发起人本人' : n.who.length ? n.who.map(pid => pname(pid) + (member(t, pid)?.st === 'invited' ? '（待接受）' : '')).join('、') : ROLE_LABEL[n.role];
    return `<div class="org-node ${tone}" id="org-${t.id}-${n.id}">
      <div class="org-node-head"><span class="org-node-id">${n.id}</span><div class="grow"><b>${esc(n.t)}</b><small>${esc(who)} · 交付：${esc(n.out)} · ${dlabel(n.d)}</small></div>
      <span class="tag ${tone}">${label}</span></div>
      ${n.link ? (n.linked ? `<div class="org-sub accepted"><p>已关联笔记：<button class="btn lk" data-a="go" data-x="note:${n.linked.id}">${esc(n.linked.title)}</button></p></div>`
        : owner && ready ? `<div class="row" style="gap:6px"><button class="btn sm acc" data-a="orgLinkNote" data-x="${t.id}|${n.id}">从笔记关联纪要</button><small class="mut">专题会为线下会议，在这里关联会后纪要</small></div>` : '<small class="mut">线下会议，待发起人关联纪要</small>') : ''}
      ${n.subs.map((x, i) => subRow(n, x, i)).join('')}
      ${canWork ? `<div class="row" style="gap:6px"><button class="btn sm acc" data-a="orgWork" data-x="${t.id}|${n.id}">带事项上下文去工作台办</button>${last?.st === 'returned' ? '<small class="mut">已退回，修改后重新提交</small>' : ''}</div>` : ''}
      ${n.step && mine && !ready && !last ? '<small class="mut">前序节点完成后开始</small>' : ''}
      ${owner && ready && n.role === 'expert' && !n.who.length ? `<button class="btn sm acc" data-a="orgInvite" data-x="${t.id}|${n.id}">邀请评审专家</button>` : ''}
    </div>`;
  };
  return `<div class="matter-sheet-inner org-sheet">
    <div class="sheet-meta"><span class="tag ai">组织事项</span><span>发起人 ${esc(pname(o.owner))}${owner ? '（我）' : ''}</span><span>·</span><span>${dlabel(t.d)}</span>
      <span>·</span><span>节点 ${done}/${o.nodes.length}</span>${t.done ? '<span class="tag ok">已完成</span>' : ''}</div>
    <h2 class="org-title">${esc(t.title)}</h2>
    ${owner ? '' : '<div class="matter-hint">你是参与方：可以查看全部上下文和各节点提交，也可以补充材料；目标和节点由发起人维护。</div>'}
    <div class="sheet-actions">${owner ? (t.done ? `<button class="btn" data-a="reopen" data-x="${t.id}">重新打开</button>` : `<button class="btn" data-a="orgComplete" data-x="${t.id}">标为完成</button><button class="btn" data-a="orgInvite" data-x="${t.id}|">＋ 邀请成员</button>`) : ''}</div>
    <section class="sheet-section"><div class="sheet-section-head"><h3>目标</h3><small>${owner ? '由你制定' : '发起人制定'}</small></div>
      ${owner ? `<textarea class="org-goal" id="og-${t.id}" data-keep>${esc(o.goal)}</textarea>` : `<p class="org-goal-ro">${esc(o.goal)}</p>`}</section>
    <section class="sheet-section"><div class="sheet-section-head"><h3>节点（分工）</h3><small>模板：${esc(ORG_TPL.name)} · ${esc(ORG_TPL.pub)}发布</small></div>
      ${o.nodes.map(nodeHtml).join('')}</section>
    <section class="sheet-section"><div class="sheet-section-head"><h3>成员</h3><small>${o.members.filter(x => x.st === 'joined').length + 1} 人已加入</small></div>
      <div class="org-members"><span class="org-member"><b>${esc(pname(o.owner))}</b><small>发起人 · ${esc(dept(person(o.owner).dept).n)}</small></span>
      ${o.members.map(x => `<span class="org-member ${x.st}"><b>${esc(pname(x.pid))}</b><small>${esc(dept(person(x.pid).dept).n)} · ${x.st === 'joined' ? (x.via === 'direct' ? '直接加入' : '已接受邀请') : '邀请已发出，等待对方确认'}</small></span>`).join('')}</div></section>
    <section class="sheet-section"><div class="sheet-section-head"><h3>上下文</h3><small>${t.ctx.length} 项 · 全部参与方可见</small></div>
      ${t.ctx.map(item => `<div class="source-row"><span class="source-type">${esc(item[0])}</span><div class="grow">${esc(item[1])}${item[2]?.by ? ` <small class="mut">· ${esc(pname(item[2].by))} 补充</small>` : ''}${contextSource(item)}</div></div>`).join('')}
      <div class="source-entry"><input id="ocin-${t.id}" data-keep data-enter="orgCtx" placeholder="${owner ? '补充背景或材料说明，按回车加入' : '补充材料或背景（参与方也可以补充），按回车加入'}" value="${esc(val('ocin-' + t.id))}"></div></section>
    <section class="sheet-section"><div class="sheet-section-head"><h3>分身追踪</h3><small>只记录状态变化，不催办</small></div>
      <ol class="org-track">${o.track.slice().reverse().map(x => `<li><small>${esc(x.tm)}</small>${esc(x.x)}</li>`).join('')}</ol></section>
  </div>`;
}

/* ---------- 新建组织事项（从组织模板） ---------- */
A.orgNew = () => {
  if (S.me !== 'csy') return toast('演示中由陈思远发起组织事项');
  if (ORG_MATTERS.length) return go('task:' + ORG_MATTERS[0].id);
  const xmtc = PEOPLE.filter(p => p.dept === 'd-xmtc');
  dialog('新建组织事项', `<p class="mut" style="margin-top:0">组织事项由你发起：你制定目标、节点和上下文，邀请同事加入；参与方在自己的工作台办理并提交，你来采纳或退回。</p>
    <div class="form" style="grid-template-columns:96px 1fr">
      <span class="mut">组织模板</span><select id="on-tpl"><option value="tpl-zylx">${esc(ORG_TPL.name)} · ${esc(ORG_TPL.pub)}发布 · ${ORG_TPL.ver}</option><option value="">不用模板，空白事项</option></select>
      <span class="mut">事项名称</span><input id="on-title" placeholder="例如：××项目 · 专业类立项" value="">
      <span class="mut">目标</span><textarea id="on-goal" rows="2">${esc(ORG_TPL.goal)}</textarea>
      <span class="mut">统筹处经办人</span><select id="on-xmtc"><option value="">请选择（负责 N2、N8）</option>${xmtc.map(p => `<option value="${p.id}">${esc(p.n)} · ${esc(p.title)} · ${p.inv === 'direct' ? '允许直接邀请' : '需要对方确认'}</option>`).join('')}</select>
    </div>
    <b style="font-size:12.5px">模板节点（分工）</b>
    <div class="org-tpl-nodes">${ORG_TPL.nodes.map(n => `<div><span class="org-node-id">${n.id}</span>${esc(n.t)}<small>${esc(ROLE_LABEL[n.role])} · ${esc(n.out)}</small></div>`).join('')}</div>
    <b style="font-size:12.5px">模板带入的上下文</b>
    ${ORG_TPL.ctx.map(([k, l], i) => `<label class="chk"><input type="checkbox" id="on-c${i}" checked><span class="tag">${k}</span><span class="grow">${esc(l)}</span><small>组织知识库</small></label>`).join('')}
    <label class="mut" for="on-bg" style="display:block;margin-top:8px">项目背景（选填）</label><textarea id="on-bg" rows="2" placeholder="一句话说明项目背景，全部参与方可见"></textarea>`,
    '<button class="btn" data-a="closeMask">取消</button><button class="btn pri" data-a="orgCreate">创建并邀请</button>');
  $('#on-title').focus();
};
A.orgCreate = () => {
  const title = $('#on-title').value.trim(), xmtc = $('#on-xmtc').value, goal = $('#on-goal').value.trim();
  if (!$('#on-tpl').value) return toast('原型只演示从组织模板新建');
  if (!title) { $('#on-title').focus(); return toast('请填写事项名称'); }
  if (!xmtc) { $('#on-xmtc').focus(); return toast('请选择项目统筹处经办人'); }
  const ctx = ORG_TPL.ctx.filter((_, i) => $('#on-c' + i).checked).map(item => [...item]);
  const bg = $('#on-bg').value.trim();
  if (bg) ctx.unshift(['背景', bg, { by:mePid() }]);
  const m = { id:'t-org1', title, list:'组织事项', d:35, p:3, ctx, src:{ t:'me', l:'从组织模板新建 · ' + ORG_TPL.pub },
    org:{ owner:mePid(), goal, tpl:ORG_TPL.id, members:[], track:[],
      nodes:ORG_TPL.nodes.map(n => ({ ...n, who:n.role === 'me' && !n.link ? [mePid()] : n.role === 'xmtc' ? [xmtc] : [], subs:[] })) } };
  ORG_MATTERS.push(m); TASKS.unshift(m);
  track(m, `${pname(mePid())} 从模板「${ORG_TPL.name}」创建了组织事项`);
  ensureOrgJob(m, mePid());
  addMember(m, xmtc);
  A.closeMask();
  S.tlist = 'org'; S.tsel = m.id; S.page = 'tasks';
  render();
};
function addMember(m, pid, nid){
  const p = person(pid);
  if (!member(m, pid)) m.org.members.push({ pid, st:p.inv === 'direct' ? 'joined' : 'invited', via:p.inv, tm:now() });
  if (nid){ const n = orgNode(m, nid); if (!n.who.includes(pid)) n.who.push(pid); }
  const nodes = m.org.nodes.filter(n => n.who.includes(pid)).map(n => n.id + ' ' + n.t).join('、');
  if (p.inv === 'direct'){
    track(m, `${p.n} 已直接加入（对方设置为允许直接邀请）${nodes ? '，负责 ' + nodes : ''}`);
    ensureOrgJob(m, pid);
    pingPersona(pid, `${esc(pname(m.org.owner))}邀请你加入组织事项「${esc(m.title)}」。你的设置是允许直接邀请，已直接加入。你负责：${esc(nodes || '暂未分配节点')}。我会追踪各节点状态，有变化告诉你。`, ['打开组织事项', 'task:' + m.id]);
    const k = personaOf(pid);
    if (k){ const chats = k === S.me ? CHATS : bagOf(k).CHATS; const c = chats.find(x => x.id === 'c-csy'); c?.msgs.push({ system:1, x:`${pname(m.org.owner)} 邀请你加入组织事项「${m.title}」· 已按你的设置直接加入` }); }
  } else {
    track(m, `已向 ${p.n} 发出邀请，等待对方确认（对方设置为需要确认）${nodes ? '，拟负责 ' + nodes : ''}`);
    const cid = 'c-' + pid;
    if (!CHATS.find(c => c.id === cid)) CHATS.push({ id:cid, n:p.n, sub:dept(p.dept).n + ' · ' + p.title, tm:'刚刚', msgs:[{ day:'今天' }] });
    chat(cid).msgs.push({ system:1, x:`你邀请 ${p.n} 加入组织事项「${m.title}」${nodes ? '，负责 ' + nodes : ''} · 对方设置为需要确认，邀请已发到消息，等待对方接受` });
  }
}
A.orgInvite = x => {
  const [mid, nid] = x.split('|'), m = orgOf(mid);
  const pool = PEOPLE.filter(p => p.id !== m.org.owner && !member(m, p.id) && (nid === 'N6' ? p.dept === 'd-wbzj' : true))
    .sort((a, b) => (b.dept === 'd-wbzj') - (a.dept === 'd-wbzj'));
  dialog('邀请成员', `${nid === 'N6' ? '<p class="mut" style="margin-top:0">评审专家由项目统筹处从专家库抽取，账号随项目临时开通。</p>' : ''}
    <div class="org-pick">${pool.map(p => `<label class="chk"><input type="checkbox" id="oi-${p.id}" ${nid === 'N6' ? 'checked' : ''}><span class="grow"><b>${esc(p.n)}</b> <small>${esc(dept(p.dept).n)} · ${esc(p.title)}</small></span><span class="tag ${p.inv === 'direct' ? 'ok' : 'wait'}">${p.inv === 'direct' ? '允许直接邀请' : '需要对方确认'}</span></label>`).join('')}</div>
    <div class="form" style="grid-template-columns:96px 1fr"><span class="mut">分配到节点</span><select id="oi-node"><option value="">只加入，不分配节点</option>${m.org.nodes.filter(n => !n.link && n.role !== 'me').map(n => `<option value="${n.id}" ${n.id === nid ? 'selected' : ''}>${n.id} ${esc(n.t)}</option>`).join('')}</select></div>
    <p class="mut">按被邀请人的个人设置处理：允许直接邀请的直接加入；需要确认的，在消息里收到邀请，接受后才加入。</p>`,
    `<button class="btn" data-a="closeMask">取消</button><button class="btn pri" data-a="orgInviteOk" data-x="${mid}">发出邀请</button>`);
  S.orgPool = pool.map(p => p.id);
};
A.orgInviteOk = mid => {
  const m = orgOf(mid), picked = S.orgPool.filter(id => $('#oi-' + id)?.checked);
  if (!picked.length) return toast('请选择要邀请的人');
  const nid = $('#oi-node').value;
  picked.forEach(pid => addMember(m, pid, nid));
  A.closeMask();
  const direct = picked.filter(pid => person(pid).inv === 'direct').length;
  toast(`${direct ? direct + ' 人已直接加入；' : ''}${picked.length - direct ? (picked.length - direct) + ' 人的邀请已发到消息，等待对方确认' : ''}`);
  render();
};

/* ---------- 节点办理、提交、采纳、退回 ---------- */
A.orgWork = x => {
  const [mid, nid] = x.split('|'), m = orgOf(mid), n = orgNode(m, nid);
  const items = m.ctx.map(item => item[0] + ' · ' + item[1]).concat(m.org.nodes.flatMap(k => k.subs.filter(s => s.st === 'accepted').map(s => `${k.id} 提交 · ${s.files.map(f => f.name).join('、')}`)),
    m.org.nodes.filter(k => k.linked && !m.ctx.some(item => item[2]?.link === 'note:' + k.linked.id)).map(k => `${k.id} 关联 · ${k.linked.title}`));
  const id = WB()?.startTwin(n.step, { matterId:m.id, matterTitle:m.title, items });
  if (!id) return toast('工作台尚未就绪');
  n.wb = n.wb || {}; n.wb[mePid()] = id;
  track(m, `${pname(mePid())} 开始办理 ${n.id} ${n.t}（在本人工作台）`);
  go('ws');
};
A.orgWb = id => { go('ws'); WB()?.openSession(id); };
window.addEventListener('sa-twin-submit', e => {
  const d = e.detail, m = orgOf(d.matterId);
  if (!m) return;
  const n = orgNode(m, d.node), by = PERSONA[d.persona].pid, self = by === m.org.owner;
  n.subs.push({ by, tm:now(), note:d.note, files:d.files, wbId:d.wbId, st:self ? 'accepted' : 'pending', self });
  track(m, `${pname(by)} 提交了 ${n.id} ${n.t}：${d.note.replace(/。$/, '')}${self ? '（发起人本人提交，直接生效）' : '，等发起人采纳'}`);
  if (!self) pingPersona(m.org.owner, `${esc(pname(by))}提交了「${esc(n.id + ' ' + n.t)}」：${esc(d.note)} 需要你采纳或退回。`, ['打开组织事项', 'task:' + m.id]);
  render();
});
window.addEventListener('sa-invite-pref', e => {
  const p = person(PERSONA[e.detail.persona]?.pid);
  if (p) p.inv = e.detail.value;
});
const subOf = x => { const [mid, nid, i] = x.split('|'); const m = orgOf(mid), n = orgNode(m, nid); return [m, n, n.subs[+i]]; };
A.orgFile = x => {
  const [mid, nid, i, k] = x.split('|');
  const f = orgNode(orgOf(mid), nid).subs[+i].files[+k];
  dialog(f.name, `<pre class="org-file-body">${esc(f.body)}</pre>`);
};
A.orgAccept = x => {
  const [m, n, sub] = subOf(x);
  sub.st = 'accepted';
  track(m, `${pname(mePid())} 采纳了 ${pname(sub.by)} 提交的 ${n.id} ${n.t}`);
  pingPersona(sub.by, `发起人已采纳你提交的「${esc(n.id + ' ' + n.t)}」。`, ['打开组织事项', 'task:' + m.id]);
  toast('已采纳 · ' + n.id + ' ' + n.t); render();
};
A.orgReturn = x => {
  const [, n] = subOf(x);
  dialog('退回提交', `<p class="mut" style="margin-top:0">退回「${esc(n.id + ' ' + n.t)}」。理由会通知提交人，并留在事项空间里。</p>
    <textarea id="or-reason" rows="3" placeholder="写明需要修改什么"></textarea>
    <div class="row" style="gap:6px;margin-top:6px">${['未指明具体条目，无法逐条回复','材料不完整','与节点交付要求不符'].map(r => `<button class="btn sm" data-a="orgReason" data-x="${r}">${r}</button>`).join('')}</div>`,
    `<button class="btn" data-a="closeMask">取消</button><button class="btn pri" data-a="orgReturnOk" data-x="${x}">确认退回</button>`);
  $('#or-reason').focus();
};
A.orgReason = r => { $('#or-reason').value = r; };
A.orgReturnOk = x => {
  const reason = $('#or-reason').value.trim();
  if (!reason) { $('#or-reason').focus(); return toast('请写明退回理由'); }
  const [m, n, sub] = subOf(x);
  sub.st = 'returned'; sub.reason = reason;
  track(m, `${pname(mePid())} 退回了 ${pname(sub.by)} 提交的 ${n.id}：${reason}`);
  pingPersona(sub.by, `你提交的「${esc(n.id + ' ' + n.t)}」被退回：${esc(reason)}`, ['打开组织事项', 'task:' + m.id]);
  A.closeMask(); toast('已退回，理由已通知提交人'); render();
};
A.orgLinkNote = x => {
  const [mid, nid] = x.split('|');
  dialog('从笔记关联纪要', `<p class="mut" style="margin-top:0">专题会是线下会议。选择会后整理的纪要笔记，关联到「${nid}」，并加入事项上下文（全部参与方可见）。</p>
    ${NOTES.map(n => `<label class="chk"><input type="radio" name="oln" value="${n.id}" ${n.id === 'n-twin' ? '' : ''}><span class="grow">${esc(n.title)}</span><small>${esc(n.time)}</small></label>`).join('')}`,
    `<button class="btn" data-a="closeMask">取消</button><button class="btn pri" data-a="orgLinkOk" data-x="${x}">关联</button>`);
};
function linkNoteToNode(m, n, nt){
  n.linked = { id:nt.id, title:nt.title };
  if (!m.ctx.some(item => item[2]?.link === 'note:' + nt.id)) m.ctx.push(['笔记', nt.title, { link:'note:' + nt.id, by:mePid() }]);
  track(m, `${pname(mePid())} 把笔记「${nt.title}」关联到 ${n.id} ${n.t}`);
}
A.orgLinkOk = x => {
  const id = $('input[name="oln"]:checked')?.value;
  if (!id) return toast('请选择一条笔记');
  const [mid, nid] = x.split('|'), m = orgOf(mid);
  linkNoteToNode(m, orgNode(m, nid), note(id));
  A.closeMask(); toast('已关联纪要，并加入事项上下文'); render();
};
A.orgCtx = () => {
  const m = task(S.tsel), v = take('ocin-' + m.id);
  if (!v) return;
  m.ctx.push(['背景', v, { by:mePid() }]);
  track(m, `${pname(mePid())} 补充了上下文：${v.slice(0, 24)}`);
  toast('已加入事项上下文，全部参与方可见'); render();
};
A.orgComplete = mid => {
  const m = orgOf(mid), left = m.org.nodes.filter(n => !nodeDone(m, n));
  if (left.length) return toast(`还有 ${left.length} 个节点未完成：${left.map(n => n.id).join('、')}`);
  m.done = true;
  track(m, `${pname(mePid())} 把事项标为完成`);
  m.org.members.filter(x => x.st === 'joined').forEach(x => pingPersona(x.pid, `发起人已把组织事项「${esc(m.title)}」标为完成。`, ['打开组织事项', 'task:' + m.id]));
  toast('组织事项已完成 ✓'); render();
};

/* ---------- 演示推进：外部专家的动作用模拟代替（不切换到专家身份） ---------- */
const EXPERT_OPINIONS = {
  'p-zlq':{ note:'技术评审意见 3 条', body:'# 技术评审意见 · 赵立群\n\n1. 绩效目标中「平台可用率」未明确统计口径。\n2. 运营服务内容与建设内容（模型重建）混在一起，应剥离。\n3. 数据更新频次与现有感知设备能力不匹配。' },
  'p-qh':{ note:'业务评审意见 3 条', body:'# 业务评审意见 · 钱慧\n\n4. 运营场景过多，建议聚焦 3 个高频场景。\n5. 缺少与区级平台的协同机制。\n6. 建议驻场人员增至 10 人。' },
  'p-hxd':{ note:'造价评审意见', body:'# 造价评审意见 · 韩晓东\n\n预算编制依据不足，建议补充完善。' },
  'p-hxd2':{ note:'造价评审意见 3 条（修改后）', body:'# 造价评审意见 · 韩晓东（修改后）\n\n7. 人月单价未注明对应测算标准的档次。\n8. 第三方软件订阅费没有询价单。\n9. 应急响应费用按包干计列，建议改为按次计价。' },
};
function orgSim(kind){
  const m = ORG_MATTERS[0];
  if (!m) return;
  const n6 = orgNode(m, 'N6');
  if (kind === 'accept'){
    m.org.members.filter(x => x.st === 'invited').forEach(x => {
      x.st = 'joined';
      track(m, `${pname(x.pid)} 接受了邀请，已加入`);
      const c = chat('c-' + x.pid) || bagOf('csy')?.CHATS.find(c => c.id === 'c-' + x.pid);
      c?.msgs.push({ id:uid('m'), f:pname(x.pid), t:now(), x:'已接受邀请，论证会材料我先看一下。' });
    });
    pingPersona(m.org.owner, '三位评审专家都已接受邀请，加入了组织事项。', ['打开组织事项', 'task:' + m.id]);
  }
  if (kind === 'opinions'){
    n6.who.forEach(pid => { const o = EXPERT_OPINIONS[pid]; n6.subs.push({ by:pid, tm:now(), note:o.note, files:[{ name:o.body.split('\n')[0].slice(2), body:o.body }], st:'pending' }); track(m, `${pname(pid)} 提交了 N6 论证意见：${o.note}，等发起人采纳`); });
    pingPersona(m.org.owner, '三位专家都提交了论证意见（N6），需要你采纳或退回。', ['打开组织事项', 'task:' + m.id]);
  }
  if (kind === 'resubmit'){
    const o = EXPERT_OPINIONS['p-hxd2'];
    n6.subs.push({ by:'p-hxd', tm:now(), note:o.note, files:[{ name:'造价评审意见 · 韩晓东（修改后）', body:o.body }], st:'pending' });
    track(m, `韩晓东 按退回理由修改后重新提交了 N6 论证意见`);
    pingPersona(m.org.owner, '韩晓东按你的退回理由重新提交了造价意见。', ['打开组织事项', 'task:' + m.id]);
  }
  if (kind === 'recheck'){
    const n2 = orgNode(m, 'N2');
    n2.subs.push({ by:'p-fzy', tm:now(), note:'补正复查：3 项补正均已补齐，形式审查通过。', files:[{ name:'形式审查复查意见', body:'# 形式审查复查意见\n\n补正通知所列 3 项均已补齐：编目回执、绩效基线值、信创适配证明。\n\n结论：形式审查通过。\n\n方振宇（项目统筹处）' }], st:'pending' });
    track(m, '方振宇 提交了补正复查意见：形式审查通过，等发起人采纳');
    pingPersona(m.org.owner, '方振宇复查了补正材料：形式审查通过。', ['打开组织事项', 'task:' + m.id]);
  }
  render();
}
A.orgSim = kind => orgSim(kind);

/* ---------- 演示路线：数字孪生运营项目 ---------- */
function twinDemoStep(){
  const m = ORG_MATTERS[0];
  const sw = (k, t, x) => ({ who:k, title:t, text:x });
  if (!m) return { ...sw('csy','① 发起组织事项','在「事项」点「＋ 新建组织事项」，选组织模板，填写名称（如「数字孪生运营项目 · 专业类立项」），选统筹处经办人方振宇（允许直接邀请，会直接加入）。'), go:'tasks:org' };
  const n = id => orgNode(m, id), st = (id, pid) => lastSub(n(id), pid)?.st;
  if (!st('N1','p-csy')) return { ...sw('csy','① 编制立项方案（N1）','在组织事项里点 N1「带事项上下文去工作台办」：分身调各处室技能写本子并预审，你逐条确认后提交到 N1。'), go:'task:' + m.id };
  if (!st('N2','p-fzy')) return { ...sw('fzy','② 切换到方振宇：形式审查（N2）','方振宇在分身首页看到被拉入事项；在事项里点 N2 去工作台办，统筹处技能做齐套审查，确认后提交补正通知。'), go:'home' };
  if (st('N2','p-fzy') === 'pending' && n('N2').subs.length === 1) return { ...sw('csy','③ 切回陈思远：采纳补正通知','在组织事项 N2 查看补正通知并采纳。'), go:'task:' + m.id };
  if (!st('N3','p-csy')) return { ...sw('csy','③ 补正再报（N3）','N3 去工作台办，逐条补正并复查，提交补正材料。'), go:'task:' + m.id };
  if (n('N2').subs.length === 1) return { ...sw('csy','③ 统筹处复查补正（模拟）','用下方「模拟：方振宇复查补正」推进，再在 N2 采纳复查意见。'), go:'task:' + m.id, sim:['recheck','模拟：方振宇复查补正'] };
  if (st('N2','p-fzy') === 'pending') return { ...sw('csy','③ 采纳复查意见','在 N2 采纳方振宇的复查意见。'), go:'task:' + m.id };
  if (!n('N4').linked) return { ...sw('csy','③ 第 4 步：关联专题会纪要（N4）','专题会是线下会议。在 N4 点「从笔记关联纪要」，或在笔记「数字孪生运营项目专题会」上点「加到事项」。'), go:'task:' + m.id };
  if (!st('N5','p-csy')) return { ...sw('csy','③ 按纪要修改（N5）','N5 去工作台办：局办公室技能逐条核对纪要落实，财务处技能复核预算，确认后提交方案 v3。'), go:'task:' + m.id };
  if (!n('N6').who.length) return { ...sw('csy','③ 邀请评审专家（N6）','在 N6 点「邀请评审专家」：三位专家的设置都是需要确认，邀请会发到消息里。'), go:'task:' + m.id };
  if (m.org.members.some(x => x.st === 'invited')) return { ...sw('csy','③ 专家接受邀请（模拟）','用下方按钮模拟三位专家在消息里接受邀请。'), go:'task:' + m.id, sim:['accept','模拟：专家接受邀请'] };
  if (!n('N6').subs.length) return { ...sw('csy','③ 专家提交意见（模拟）','用下方按钮模拟三位专家提交论证意见。'), go:'task:' + m.id, sim:['opinions','模拟：专家提交意见'] };
  if (st('N6','p-hxd') === 'pending' && n('N6').subs.length === 3) return { ...sw('csy','③ 采纳或退回专家意见','采纳赵立群、钱慧的意见；韩晓东的意见没有指明具体条目，退回并写明理由。'), go:'task:' + m.id };
  if (st('N6','p-hxd') === 'returned') return { ...sw('csy','③ 韩晓东重新提交（模拟）','用下方按钮模拟韩晓东按退回理由重新提交。'), go:'task:' + m.id, sim:['resubmit','模拟：韩晓东重新提交'] };
  if (!nodeDone(m, n('N6'))) return { ...sw('csy','③ 采纳全部专家意见','在 N6 采纳尚未采纳的意见。'), go:'task:' + m.id };
  if (!st('N7','p-csy')) return { ...sw('csy','③ 第 7 步：逐条回复与修改（N7）','N7 去工作台办：统筹处的回复规范检查会发现第 6 条不采纳缺理由，确认补上后提交。'), go:'task:' + m.id };
  if (!st('N8','p-fzy')) return { ...sw('fzy','④ 切换到方振宇：复核并形成报批稿（N8）','方振宇的分身在办提示轮到 N8；去工作台复核并提交报批稿。'), go:'home' };
  if (st('N8','p-fzy') === 'pending') return { ...sw('csy','⑤ 切回陈思远：采纳报批稿','在 N8 采纳报批稿。'), go:'task:' + m.id };
  if (!m.done) return { ...sw('csy','⑤ 标为完成','全部节点已完成，由发起人本人点「标为完成」。'), go:'task:' + m.id };
  return { ...sw('csy','案例完成','组织事项已完成。报批稿可用于第一次党组会（第 8 步，不在本次范围）。'), go:'task:' + m.id };
}
function twinDemoHtml(){
  const s = twinDemoStep();
  const need = s.who !== S.me;
  return `<section class="demo-twin"><div class="row"><b class="grow">案例：数字孪生运营项目（组织事项）</b><span class="tag ai">当前：${esc(PERSONA[S.me].n)}</span></div>
    <p><b>${esc(s.title)}</b><br>${esc(s.text)}</p>
    <div class="acts">${need ? `<button class="btn pri" data-a="personaDemo" data-x="${s.who}">切换到 ${esc(PERSONA[s.who].n)}</button>`
      : `<button class="btn pri" data-a="demoGo" data-x="${esc(s.go)}">去操作</button>${s.sim ? `<button class="btn" data-a="orgSim" data-x="${s.sim[0]}">${esc(s.sim[1])}</button>` : ''}`}</div>
    <small class="mut">共 4 次切换：陈思远 → 方振宇（N2）→ 陈思远（N3–N7）→ 方振宇（N8）→ 陈思远（采纳、完成）。专家的动作用模拟按钮代替。</small></section>`;
}
A.persona = k => switchPersona(k);
A.personaDemo = k => { switchPersona(k); S.demo = true; renderDemo(); };
function personaEmpty(){
  return `<div class="folio"><div class="quiet-empty" style="margin:80px auto;max-width:420px"><b>演示身份只包含本案例数据</b><br>${esc(PERSONA[S.me].n)}（${esc(PERSONA[S.me].dept)}）的这个模块没有准备演示数据。可以在「事项」里查看组织事项，或切回陈思远。<br><br><button class="btn" data-a="persona" data-x="csy">切回陈思远</button></div></div>`;
}

/* ====================== 提示 ====================== */
let tt;
function toast(m, act){
  const t = $('#toast'); t.innerHTML = esc(m) + (act ? `<button data-a="go" data-x="${act[1]}">${act[0]}</button>` : '');
  t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 4200);
}
function dialog(title, body, footer = '<button class="btn" data-a="closeMask">关闭</button>'){
  const mask = $('#mask');
  mask.innerHTML = `<div class="dlg" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="hd"><b class="grow">${esc(title)}</b><button class="btn sm" data-a="closeMask" aria-label="关闭">×</button></div>
    <div class="bd2">${body}</div><div class="ft2">${footer}</div></div>`;
  mask.classList.add('on');
}
function noteFromMessages(c, messages){
  if (!canReadChat(c)) return;
  const items = messages.filter(m => m && !m.revoked);
  if (!items.length) return;
  const refs = items.map(m => messageContext(c, m));
  const body = refs.map(item => item[1]).join('\n');
  S.msel = { on:false, ids:[] };
  render();
  preDlg({ kind:'note', title:c.n + ' · ' + items.length + ' 条消息', body, source:c.n, refs });
}
function demoStep(){
  const t = task(S.budgetTask);
  if (!t) return ['从李娜的消息开始','在李娜的消息上选「建成事项」，核对标题、期限和清单后确认。','查看李娜的消息','msg:m-lina'];
  const s = sess(t.fs);
  if (t.done) return ['事项已完成','可以从「已完成」重新打开事项，上下文和之前的会话会保留。','查看已完成事项','task:' + t.id];
  if (!s) return ['补充背景并交给分身','从笔记或资料库选几条背景，再点「带上下文交给贾维斯办」。','打开事项','task:' + t.id];
  if (s.status === 'confirm') return ['判断两处预算口径差异','在执行区打开财务通知的依据，选择「先问这两个科室」。','打开执行区','ws:' + s.id];
  if (s.status === 'send' || s.status === 'wait'){
    const st = s.steps.find(step => step.s === s.status);
    if (st?.k === 'deliver') return ['检查并发送汇总表','打开李娜的聊天，核对回信和附件，再由本人发送。','打开李娜的聊天','im:c-lina'];
    const id = st?.chats.find(id => !st.sent.includes(id) || !t.bind?.includes(id));
    if (id) return ['发出询问并确认绑定','在张伟和孙婷的聊天里分别发送草稿，发送后确认绑定。两人回复后会话会继续。','打开' + chat(id).n + '的聊天','im:' + id];
  }
  if (s.status === 'link') return ['查看修订成果','对比汇总表 v1 和 v2，确认是否将产物关联回事项。','打开会话','ws:' + s.id];
  if (s.status === 'plan') return ['确认计划','在计划面板调整执行步骤，再确认执行。','打开会话','ws:' + s.id];
  if (t.looks) return ['由本人勾掉事项','核对回复已经发出，再在事项详情点击「勾掉」。','打开事项','task:' + t.id];
  return ['查看预算会话','在工作台查看计划、上下文和执行进度。','打开会话','ws:' + s.id];
}
function renderDemo(){
  const root = $('#demo-panel');
  const opened = $('[data-a="guideOn"]');
  opened.setAttribute('aria-expanded', String(S.demo));
  if (!S.demo){ root.innerHTML = ''; return; }
  if (S.page === 'admin'){
    root.innerHTML = `<aside class="demo-panel" aria-label="演示路线"><div class="row"><h2 class="grow">管理端演示</h2><button class="btn sm" data-a="guideOff">关闭</button></div>
      <p>v8 重构版 · 11 月 23 日 PRD · 模拟数据</p>
      <section><p>可以预览组织架构导入、创建或停用账号，以及切换模型并模拟测试连通。</p>
      <button class="btn" data-a="demoGo" data-x="home">返回员工端</button></section></aside>`;
    return;
  }
  const expanded = root.querySelector('details')?.open;
  const [title, text, button, href] = demoStep();
  root.innerHTML = `<aside class="demo-panel" aria-label="演示路线">
    <div class="row"><h2 class="grow">演示路线</h2><button class="btn sm" data-a="guideOff">关闭</button></div>
    <p>v8 重构版 · 11 月 23 日 PRD · 模拟数据</p>
    ${twinDemoHtml()}
    <section><div class="row"><b class="grow">F1 从消息到办完</b><span class="tag ok">N1 主线</span></div>
      <p><b>${esc(title)}</b><br>${esc(text)}</p><button class="btn pri" data-a="demoGo" data-x="${href}">${esc(button)}</button></section>
    <section><b>按模块查看</b><div class="acts">
      <button class="btn sm" data-a="demoGo" data-x="im:g-xt2">消息多选</button>
      <button class="btn sm" data-a="demoGo" data-x="ws">工作台</button>
      <button class="btn sm" data-a="demoGo" data-x="mem">分身记得的</button>
      <button class="btn sm" data-a="demoGo" data-x="admin">管理端</button>
    </div></section>
    <section><details ${expanded ? 'open' : ''}><summary>待确认项与迭代范围</summary><ul>
      <li>工作台（v9）：已替换为超级智能体用户端，含 6 个历史会话和 2 个可发起流程（第14次党组会筹备、年度工作报告脑暴）。</li>
      <li>事项 3.8–3.10：列表简化、带上下文交办、补充背景。</li>
      <li>消息 3.7：多选及批量处理。</li>
      <li>F2、F3 属于 N2，F4 属于后续迭代。原型中的晨报、笔记整理和自动化入口标有 P1。</li>
    </ul></details></section>
  </aside>`;
}
function proposeRule(text){
  const id = uid('rule');
  S.ruleProposals = S.ruleProposals || {};
  S.ruleProposals[id] = text.replace(/^以后[，、\s]*/, '').replace(/[。！!]$/, '');
  return id;
}
A.ruleAccept = id => {
  const text = S.ruleProposals?.[id];
  if (!text) return;
  if (!RULES.some(r => r.t === text)) RULES.push({ id:uid('r'), t:text, from:'本人确认', on:true });
  finishRuleProposal(id, '规则已保存');
};
A.ruleCancel = id => { if (S.ruleProposals?.[id]) finishRuleProposal(id, '已取消'); };
function finishRuleProposal(id, status){
  delete S.ruleProposals[id];
  [...S.home, ...SESS.flatMap(s => s.tail)].forEach(message => {
    if (message.acts?.some(([,a,key]) => a === 'ruleAccept' && key === id)){
      message.acts = [];
      message.h += ' <span class="tag">' + status + '</span>';
    }
  });
  render();
}
A.continueSess = id => { const s = sess(id); if (!s || s.status !== 'paused') return; s.stopped = false; runSess(s); };
A.sidebarToggle = () => {
  const fromPanel = document.activeElement?.closest('#module-nav');
  const fromHeader = document.activeElement?.id === 'header-panel';
  S.modulePanelOpen = !S.modulePanelOpen;
  render();
  if (fromPanel) {
    const target = $('#header-panel').hidden ? document.querySelector('.edge-button[aria-current]') : $('#header-panel');
    target?.focus({preventScroll:true});
  } else if (fromHeader) $('#module-nav .module-close')?.focus({preventScroll:true});
};
A.edgeHome = () => go('home', { openPanel:false });
A.edgeOpen = key => {
  if (S.page === key) return A.sidebarToggle();
  go(key === 'lib' ? 'lib:' + S.folder : key, { openPanel:true });
};
A.homeThread = () => $('#home-in')?.focus();
A.homeBrief = () => {
  const index = S.home.findIndex(message => message.brief);
  if (index !== -1) A.homeJump(String(index));
};
A.agentTasksToggle = () => {
  S.agentTaskPane = !S.agentTaskPane;
  render();
  document.querySelector('.agent-head [data-a="agentTasksToggle"]')?.focus();
};
A.agentTaskFilter = key => {
  S.agentTaskFilter = key;
  render();
  document.querySelector(`[data-a="agentTaskFilter"][data-x="${key}"]`)?.focus();
};
A.agentTaskToggle = id => {
  S.agentTaskOpen = S.agentTaskOpen === id ? null : id;
  render();
  document.getElementById('entry-' + id)?.querySelector('.agent-task-row')?.focus({preventScroll:true});
};
A.agentTaskOpen = id => {
  const item = agentTask(id);
  if (!item) return;
  S.agentTaskPane = true;
  S.agentTaskOpen = id;
  if (item.phase === 'done') S.agentTaskFilter = 'all';
  if (S.page !== 'home') go('home');
  else render();
  const row = document.getElementById('entry-' + id)?.querySelector('.agent-task-row');
  row?.scrollIntoView({block:'nearest'});
  row?.focus({preventScroll:true});
};
A.homeFind = () => {
  dialog('搜索分身对话',
    '<label class="sr-only" for="agent-query">搜索分身对话</label><input id="agent-query" class="dialog-input" placeholder="输入晨报、提醒或关键词"><div id="agent-results"></div>');
  updateHomeSearch('');
  $('#agent-query').focus();
};
function updateHomeSearch(query){
  const needle = query.trim().toLowerCase();
  const entries = [...document.querySelectorAll('.agent-turn')].map((turn,index) => {
    const content = turn.innerText.replace(/\s+/g,' ').trim();
    return { index, content };
  }).filter(entry => entry.content.toLowerCase().includes(needle)).reverse().slice(0,8);
  $('#agent-results').innerHTML = entries.map(({index,content}) =>
    `<button class="source-choice agent-search-item" data-a="homeJump" data-x="${index}">${esc(content.slice(0,112))}</button>`).join('')
    || '<p class="mut">这段对话里没有匹配的消息</p>';
}
A.homeJump = index => {
  A.closeMask();
  const turn = document.getElementById('home-turn-' + index);
  if (!turn) return;
  turn.scrollIntoView({ block:'center' });
  turn.focus({ preventScroll:true });
};
function priorityReply(){
  const work = task(S.budgetTask);
  const session = work && sess(work.fs);
  const rows = [
    ...(session && ['confirm','link'].includes(session.status) ? [
      { h:'先看看预算汇总，那里有一个判断在等你。其他步骤会从确认后继续。', acts:[['去执行区','go','ws:' + session.id]] }
    ] : []),
    ...(!chat('c-lina').replied && !work ? [
      { h:'先看李娜的预算消息。她周五前需要汇总表，原消息可以直接建成事项。', acts:[['打开原消息','go','msg:m-lina']] }
    ] : []),
    ...(!task('t1').done ? [
      { h:'先准备十点的周例会。除了测试和预算，可以补一句回退方案。', acts:[['查看例会事项','go','task:t1']] }
    ] : []),
  ];
  return rows[0] || { h:'当前没有临近的提醒。你也可以告诉我想接着办哪件事。' };
}
function offerHomeDraft(chatId,draft){
  const id = uid('draft-proposal');
  S.homeDraftProposals[id] = { chatId, ...draft };
  return { h:`我先拟了一份给${esc(chat(chatId).n)}的回复。你可以在这里改好，再放进聊天输入框。`, draftProposal:id };
}
function homeDraftProposalHtml(id){
  const draft = S.homeDraftProposals[id], label = chat(draft.chatId).n;
  if (draft.state) return `<div class="agent-draft"><span class="tag ${draft.state === 'ready' ? 'ok' : ''}">${draft.state === 'ready' ? '草稿已准备' : '已取消'}</span>
    ${draft.state === 'ready' ? `<button class="btn sm" data-a="go" data-x="im:${draft.chatId}">打开${esc(label)}的聊天 ↗</button>` : ''}</div>`;
  const field = 'draft-proposal-text-' + id;
  return `<div class="agent-draft">
    <label for="${field}"><b>给${esc(label)}的回复</b><small>${esc(draft.why)}</small></label>
    <textarea id="${field}" data-keep rows="3">${esc(S.inp[field] ?? draft.text)}</textarea>
    <div class="acts"><button class="btn sm acc" data-a="homeDraftConfirm" data-x="${id}">确认放入草稿</button>
      <button class="btn sm" data-a="homeDraftCancel" data-x="${id}">取消</button></div>
  </div>`;
}
A.homeDraftConfirm = id => {
  const proposal = S.homeDraftProposals[id];
  if (!proposal || proposal.state) return;
  const {chatId,text,why,evidence} = proposal;
  const value = (S.inp['draft-proposal-text-' + id] ?? text).trim();
  if (!value) return toast('请填写回复内容');
  if (!canReadChat(chat(chatId))) return toast('当前无权打开此聊天');
  proposal.state = 'ready';
  placeDraft(chatId,{ text:value,why,evidence });
  S.scrollFlow = true;
  render();
};
A.homeDraftCancel = id => {
  const proposal = S.homeDraftProposals[id];
  if (!proposal || proposal.state) return;
  proposal.state = 'canceled'; render();
};

A.launchWork = () => { S.rpOpen = false; S.sessionSearch = ''; go('ws', { openPanel:true }); A.newSess(); };
A.fillHome = text => { S.inp['home-in'] = text; render(); $('#home-in')?.focus(); };
A.homeAttach = () => {
  const items = allFiles().slice(0,8);
  dialog('引用资料', items.map(f => `<button class="source-choice" data-a="homeAttachUse" data-x="${f.id}">${symbol('▧')} ${esc(f.name)}</button>`).join(''));
};
A.homeAttachUse = id => { S.homeRef = ['文件',fileById(id).name,id]; A.closeMask(); render(); $('#home-in')?.focus(); };
A.homeRefClear = () => { S.homeRef = null; render(); };
A.fillFollow = text => { S.inp['ws-in'] = val('ws-in') ? val('ws-in') + '\n' + text : text; render(); $('#ws-in')?.focus(); };
A.focusMatter = () => { if (!$('#tadd')) A.tlist('today'); $('#tadd')?.focus(); };
A.reviewFromHome = id => { go('ws:' + ARTS[id].sess); A.reviewArtifact(id); };
A.reviewArtifact = id => {
  const a = ARTS[id], s = a && sess(a.sess);
  if (!s) return;
  if (S.page !== 'ws' || S.cur !== s.id) go('ws:' + s.id);
  const tabs = S.reviewTabs[s.id] ||= [];
  if (!tabs.includes(id)) tabs.push(id);
  S.reviewActive[s.id] = id;
  S.rp = 'art'; S.rpOpen = true; render();
};
A.reviewClose = id => {
  const key = sess(ARTS[id].sess).id;
  const tabs = S.reviewTabs[key] = S.reviewTabs[key].filter(k => k !== id);
  if (S.reviewActive[key] === id) S.reviewActive[key] = tabs.at(-1) || null;
  render();
};
A.reviewList = () => { S.reviewActive[S.cur] = null; render(); };
A.reviewFeedback = id => {
  const f = ARTS[id];
  const selection = String(window.getSelection() || '').trim().slice(0,240);
  dialog('给产物加批注',
    `<p><b>${esc(f.name)}</b></p>${selection ? `<div class="quote">${esc(selection)}</div>` : ''}
    <label for="review-text">希望贾维斯补充或修改什么？</label><textarea id="review-text" class="dialog-input" rows="4" placeholder="例如：请在末尾加注，硬件报价待补，金额暂未计入。"></textarea>`,
    `<button class="btn" data-a="closeMask">取消</button><button class="btn acc" data-a="reviewNote" data-x="${id}">带回当前会话</button>`);
  S.reviewQuote = selection;
  $('#review-text')?.focus();
};
A.reviewNote = id => {
  const text = $('#review-text')?.value.trim();
  if (!text) return toast('请填写批注');
  const s = sess(ARTS[id].sess), quote = S.reviewQuote || '';
  (S.reviewNotes[id] ||= []).push({ text,quote,time:now() });
  S.pendingReview[s.id] = { id, quote };
  S.inp['ws-in'] = [val('ws-in'), text].filter(Boolean).join('\n');
  A.closeMask(); render(); $('#ws-in')?.focus();
};
A.reviewDetach = id => { delete S.pendingReview[id]; render(); };
function respondToReview(s, note, text){
  const base = ARTS[note.id], prefix = base.name.replace(/ v\d+(?=\.\w+$)/,'').replace(/\.\w+$/,'');
  const extension = base.name.match(/\.\w+$/)?.[0] || '.txt';
  const version = Math.max(1,...s.arts.map(id => Number(ARTS[id].name.match(/ v(\d+)\./)?.[1] || 0))) + 1;
  if (!/^(请)?(在末尾)?(补充备注|补充说明|加注|加一条备注)[：:，,\s]/.test(text)){
    s.tail.push({ r:'ai', tm:now(), h:'已收到这份产物的修改意见。可以继续明确写成「补充备注：……」，贾维斯会把文字加进一个新版本。' });
    render();
    return;
  }
  const remark = text.replace(/^(请)?(在末尾)?(补充备注|补充说明|加注|加一条备注)[：:，,\s]+/,'');
  if (!remark.trim()) return render();
  const id = uid('a');
  ARTS[id] = { ...base, name:`${prefix} v${version}${extension}`, time:'今天 ' + now(), notes:[...(base.notes || []), remark] };
  s.arts.push(id);
  s.tail.push({ r:'ai', tm:now(), h:'已补上备注，生成新版并保留旧版。', art:id });
  A.reviewArtifact(id);
}
A.globalFind = () => {
  if (S.page === 'ws' && WB()) return WB().openSearch();
  dialog('搜索工作空间',
    '<label class="sr-only" for="global-query">搜索工作空间</label><input id="global-query" class="dialog-input" placeholder="搜索会话、事项、聊天或文件"><div id="global-results"></div>');
  setGlobalResults('');
  $('#global-query').focus();
};
function setGlobalResults(query){
  const q = query.trim().toLowerCase();
  const result = [
    ...SESS.filter(s => !s.arch).map(s => [s.title,'会话','ws:' + s.id]),
    ...TASKS.map(t => [t.title,'事项','task:' + t.id]),
    ...CHATS.map(c => [c.n,'消息','im:' + c.id]),
    ...allFiles().map(f => [f.name,'资料','file:' + f.id]),
  ].filter(([text]) => text.toLowerCase().includes(q)).slice(0,9);
  $('#global-results').innerHTML = result.map(([label,type,target]) =>
    `<button class="source-choice" data-a="sourceGo" data-x="${esc(target)}"><span class="tag">${type}</span><span>${esc(label)}</span></button>`).join('') || '<p class="mut">未找到匹配结果</p>';
}
A.appOpen = x => {
  const app = (WB()?.apps() || []).find(a => a.id === x); if (!app) return;
  $('#mask').innerHTML = `<div class="dlg app-dlg" data-stop role="dialog" aria-modal="true" aria-label="${esc(app.name)}"><div class="hd"><span class="home-app-ico">◔</span><b class="grow">${esc(app.name)} <small class="mut">轻应用 · ${esc(app.version)} · 仅本人</small></b><span class="app-conn">⛓ 基于 OA办公系统连接器 · 已连接 · 只读</span><button class="btn sm" data-a="closeMask" aria-label="关闭">×</button></div>
    <div class="bd2"><p class="mut" style="margin:0 0 10px">提醒规则：特急、加急件，领导批示件，3 个工作日内到期的来文。公文数据由 OA办公系统连接器按你本人的权限读取，${NAME}只读取，不在 OA 里签收或办理。</p>
    <div id="kd-body">${keyDocsHtml()}</div></div>
    <div class="ft2"><small class="mut grow">最近同步：今天 ${now()} · 每 15 分钟同步一次</small><button class="btn" data-a="closeMask">关闭</button></div></div>`;
  $('#mask').classList.add('on');
};
A.kdFilter = x => { S.kdFilter = x; const b = $('#kd-body'); if (b) b.innerHTML = keyDocsHtml(); };
A.kdGive = x => { const d = KEY_DOCS.find(k => k.no === x); A.closeMask(); if (S.page !== 'home') S.dot = true; say(`帮我办这份公文：${d.t}（${d.no}，${d.from}，时限 ${d.due}），整理要报送的材料`, '轻应用 · 关键公文提醒'); };
window.addEventListener('sa-open-app', e => A.appOpen(e.detail));
window.addEventListener('sa-go', e => go(e.detail));
A.imTab = x => { S.imTab = x; S.contactQ = ''; render(); };
A.deptSel = x => { S.dept = x; S.person = null; S.contactQ = ''; render(); };
A.personSel = x => { S.person = x; render(); };
A.personChat = x => {
  const p = PEOPLE.find(y => y.id === x); if (!p) return;
  if (!p.chatId){ p.chatId = 'c-' + p.id; CHATS.splice(1, 0, { id:p.chatId, n:p.n, sub:dept(p.dept).n + ' · ' + p.title, tm:'刚刚', msgs:[{ day:'今天' }, { system:1, x:'从通讯录发起单聊' }] }); }
  go('im:' + p.chatId);
};
A.chatNew = () => {
  const people = CHATS.filter(c => !c.g);
  dialog('发起单聊', people.map(c => `<button class="source-choice" data-a="sourceGo" data-x="im:${c.id}">${esc(c.n)} <small>${esc(c.sub)}</small></button>`).join(''));
};
A.roomFiles = () => {
  const ids = [...new Set(chat(S.chat).msgs.filter(m => !m.revoked && m.file).map(m => m.file))];
  dialog('聊天文件', ids.map(id => `<button class="source-choice" data-a="openArt" data-x="${id}">${symbol('▧')} ${esc(fileById(id)?.name || '附件')}</button>`).join('') || '<p class="mut">这段聊天还没有文件。</p>');
};
A.folderCreate = () => {
  dialog('新建文件夹','<label for="folder-name">名称</label><input id="folder-name" class="dialog-input" placeholder="例如：项目资料">',
    '<button class="btn" data-a="closeMask">取消</button><button class="btn acc" data-a="folderSave">创建</button>');
  $('#folder-name').focus();
};
A.folderSave = () => {
  const label = $('#folder-name')?.value.trim();
  if (!label || KBF.some(([,name]) => name === label)) return toast('请输入一个未使用的文件夹名称');
  const id = uid('kb-'); KBF.push([id,label]); A.closeMask(); A.folder(id);
};
A.planMove = (id, move) => {
  const [at,offset] = move.split(':').map(Number);
  const s = sess(id), to = at + offset;
  if (s?.status !== 'plan' || to < 0 || to >= s.steps.length || protectsPlanStep(s,s.steps[at]) || protectsPlanStep(s,s.steps[to])) return;
  [s.steps[at],s.steps[to]] = [s.steps[to],s.steps[at]];
  render();
};

A.guideOff = () => { S.demo = false; renderDemo(); };
A.guideOn = () => { S.demo = !S.demo; renderDemo(); };
A.demoGo = target => { S.demo = false; go(target); };

const ORG = [
  { name:'陈思远', team:'应用推进处', account:'chensiyuan', state:'启用' },
  { name:'李娜', team:'财务处', account:'lina', state:'启用' },
  { name:'张伟', team:'运维科', account:'zhangwei', state:'启用' },
  { name:'孙婷', team:'应用科', account:'sunting', state:'启用' },
];
const MODEL_OPTIONS = ['内网通用模型','内网备选模型','内网向量模型','内网 OCR 服务'];
const MODEL_ROUTES = [
  { name:'对话和执行', model:0, options:[0,1] },
  { name:'向量化', model:2, options:[2] },
  { name:'文字识别', model:3, options:[3] },
];
function pAdmin(){
  const cols = S.adminTab === 'users'
    ? `<h3>账户与组织架构</h3><p class="mut">导入通讯录、创建或停用账号。</p>
      <div class="admin-tools"><button class="btn pri" data-a="adminImport">组织架构导入预览</button><button class="btn" data-a="adminCreate">创建账号</button></div>
      <div class="card"><table><thead><tr><th>姓名</th><th>部门</th><th>账号</th><th>状态</th><th>操作</th></tr></thead><tbody>${ORG.map((row, i) => `<tr><td>${esc(row.name)}</td><td>${esc(row.team)}</td><td>${esc(row.account)}</td>
        <td><span class="tag ${row.state === '启用' ? 'ok' : 'warn'}">${row.state}</span></td><td><button class="btn sm" data-a="adminToggle" data-x="${i}">${row.state === '停用' ? '启用' : '停用'}</button></td></tr>`).join('')}</tbody></table></div>`
    : `<h3>模型配置</h3><p class="mut">切换模型后，新请求使用新配置。进行中的会话沿用原配置。</p>
      <div class="card">${MODEL_ROUTES.map((r, i) => `<div class="ln"><b class="grow">${r.name}</b>
        <select class="route-select" aria-label="${r.name}模型" data-admin-model="${i}">${r.options.map(k => `<option value="${k}" ${r.model === k ? 'selected' : ''}>${MODEL_OPTIONS[k]}</option>`).join('')}</select>
        <button class="btn sm" data-a="modelTest" data-x="${i}" ${r.testing ? 'disabled' : ''}>${r.testing ? '测试中…' : '测试连通'}</button>${r.result ? '<span class="tag ok">模拟可用 · 128 ms</span>' : ''}</div>`).join('')}</div>`;
  return `<div class="pgwrap admin"><div class="pghd"><b>管理端</b><span>组织与模型配置</span><span class="grow"></span><span class="tag">系统管理员 · 演示角色</span><button class="btn sm" data-a="go" data-x="home">返回员工端</button></div>
    <div class="pgbody" style="display:flex">
    <div style="flex:1;overflow:auto"><div class="set">${cols}</div></div></div></div>`;
}
A.artExport = id => {
  const f = fileById(id);
  const temp = document.createElement('template');
  temp.innerHTML = artBody(f.kind, f.name, id);
  const table = temp.content.querySelector('table');
  const csv = table && f.type === 'XLS';
  const tableRows = csv ? Array.from(table.rows, tr => Array.from(tr.cells, td => td.textContent.trim())) : [];
  const noteRows = (ARTS[id]?.notes || []).map(text => ['备注', /^[=+@-]/.test(text.trimStart()) ? "'" + text : text]);
  const encode = text => '"' + String(text).replaceAll('"','""') + '"';
  const content = csv
    ? '\uFEFF' + [...tableRows,...noteRows].map(row => row.map(encode).join(',')).join('\r\n')
    : '<!doctype html><meta charset="utf-8"><title>' + esc(f.name) + '</title>' + temp.innerHTML;
  const url = URL.createObjectURL(new Blob([content], { type:csv ? 'text/csv;charset=utf-8' : 'text/html;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = f.name.replace(/\.[^.]+$/, csv ? '.csv' : '.html');
  a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
A.adminTab = id => { S.adminTab = id; render(); };
A.adminImport = () => dialog('组织架构导入预览',
  `<p class="mut">示例表格 · 1 行可导入，1 行手机号缺失。</p><div class="sec-row"><b class="grow">周敏 · 法务部 · zhoumin</b><span class="tag ok">${ORG.some(p => p.account === 'zhoumin') ? '已导入' : '校验通过'}</span></div><div class="sec-row"><b class="grow">赵磊 · 网络科 · zhaolei</b><span class="tag warn">缺少手机号</span></div>`,
  '<button class="btn" data-a="closeMask">取消</button><button class="btn pri" data-a="adminImportOk">导入通过校验的账号</button>');
A.adminImportOk = () => {
  if (!ORG.some(p => p.account === 'zhoumin')) ORG.push({ name:'周敏', team:'法务部', account:'zhoumin', state:'启用' });
  A.closeMask(); toast('导入完成 · 周敏'); render();
};
A.adminCreate = () => dialog('创建账号',
  '<div class="form"><label for="org-name">姓名</label><input id="org-name"><label for="org-team">部门</label><input id="org-team"><label for="org-id">账号</label><input id="org-id"><label for="org-phone">手机号</label><input id="org-phone" inputmode="tel"></div>',
  '<button class="btn" data-a="closeMask">取消</button><button class="btn pri" data-a="adminCreateOk">确认创建</button>');
A.adminCreateOk = () => {
  const [name, team, account, phone] = ['name','team','id','phone'].map(key => $('#org-' + key).value.trim());
  if (!name || !team || !account || !/^1\d{10}$/.test(phone)) return toast('请填写姓名、部门、账号和有效的手机号');
  if (ORG.some(row => row.account === account)) return toast('账号已存在');
  ORG.push({ name, team, account, state:'启用' }); A.closeMask(); toast('账号已创建'); render();
};
A.adminToggle = i => {
  const row = ORG[i];
  const next = row.state === '停用' ? '启用' : '停用';
  dialog(next + '账号', '<p>' + esc(row.name) + ' · ' + esc(row.account) + '</p>',
    `<button class="btn" data-a="closeMask">取消</button><button class="btn pri" data-a="adminToggleOk" data-x="${i}">确认${next}</button>`);
};
A.adminToggleOk = i => {
  const row = ORG[i]; row.state = row.state === '启用' ? '停用' : '启用';
  A.closeMask(); toast('账号已' + row.state); render();
};
A.modelTest = i => {
  const route = MODEL_ROUTES[i]; route.testing = true; route.result = false; render();
  const model = route.model;
  setTimeout(() => { route.testing = false; route.result = model === route.model; render(); }, 450);
};

/* ====================== 事件 ====================== */
document.addEventListener('click', e => {
  if (e.target.id === 'mask') return A.closeMask();
  const el = e.target.closest('[data-a]');
  if (S.dot && !e.target.closest('#mask') && !e.target.closest('.dpop') && !e.target.closest('.dot') && !(el && /^(giveFs|fileFs)$/.test(el.dataset.a))){ S.dot = false; if (!el) return render(); }
  if (!el) return;
  e.preventDefault(); e.stopPropagation();
  const f = A[el.dataset.a]; if (f) f(el.dataset.x, el.dataset.y);
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.compareSide){
    const values = [...document.querySelectorAll('[data-compare-side]')].map(select=>select.value);
    return A.artCmp(...values);
  }
  if (el.dataset.reviewVer !== undefined) return A.reviewArtifact(el.value);
  if (el.dataset.adminModel !== undefined){
    const route = MODEL_ROUTES[el.dataset.adminModel];
    route.model = +el.value; route.result = false;
    toast('模型配置已保存'); render();
  }
  if (el.dataset && el.dataset.a2 === 'modeSel'){ const k = el.dataset.x; if (k === 'new') S.newMode = el.value; else sess(k).mode = el.value; render(); } if (el.dataset && el.dataset.a2 === 'verSel'){ S.artSel = el.value; render(); }
  if (el.id === 'new-wsp') S.newWsp = el.value;
});
document.addEventListener('input', e => {
  const el = e.target;
  if (el.id === 'global-query') return setGlobalResults(el.value);
  if (el.id === 'agent-query') return updateHomeSearch(el.value);
  if (el.id === 'session-search'){ S.sessionSearch = el.value; render(); return; }
  if (el.id === 'chat-search'){ S.chatSearch = el.value; render(); return; }
  if (el.id === 'contact-search'){ S.contactQ = el.value; S.person = null; render(); return; }
  if (el.id === 'note-search'){ S.noteSearch = el.value; render(); return; }
  if (el.id === 'file-search'){ S.fileSearch = el.value; render(); return; }
  if (el.id === 'add-ctx-search') updateContextChoices(el.value);
  if (el.dataset.keep === undefined) return;
  if (el.id.startsWith('im-') && !el.value.trim()){
    const draft = S.drafts[el.id.slice(3)];
    if (draft?.placed) draft.placed = false;
  }
  S.inp[el.id] = el.value;
  if (el.id.startsWith('td-')) task(el.id.slice(3)).desc = el.value;
  if (el.id.startsWith('og-')) orgOf(el.id.slice(3)).org.goal = el.value;
  if (el.id.startsWith('nt-')) note(el.id.slice(3)).title = el.value;
  if (el.id.startsWith('nb-')) note(el.id.slice(3)).body = el.value;
  if (el.id.startsWith('tt-')) task(el.id.slice(3)).title = el.value;
});
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && S.page !== 'admin'){ e.preventDefault(); return A.globalFind(); }
  if ((e.metaKey || e.ctrlKey) && e.key === 'j'){ e.preventDefault(); if (S.page === 'home') $('#home-in')?.focus(); else if (S.page !== 'admin') A.dot(); return; }
  if (e.key === 'Escape'){ if (!$('#mask').classList.contains('on')) { S.demo = false; renderDemo(); } A.closeMask(); if (S.dot){ S.dot = false; render(); } return; }
  const el = e.target;
  if ((e.key === 'Enter' || e.key === ' ') && el.dataset.a === 'mselTog'){
    e.preventDefault(); A.mselTog(el.dataset.x); document.getElementById('message-' + el.dataset.x)?.focus(); return;
  }
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && el.dataset && el.dataset.enter){ e.preventDefault(); S.inp[el.id] = el.value; A[el.dataset.enter](); }
});

seedHome();
seedAgentTasks();
render();
window.addEventListener('sa-workbench-ready', () => render());

