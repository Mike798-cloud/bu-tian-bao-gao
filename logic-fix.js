(()=>{
'use strict';
const SAVE_KEY='accident-report-night-v1';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
let applying=false, scheduled=false;

function debug(){return window.__GAME_DEBUG__||null}
function state(){try{return debug()?.getState?.()||JSON.parse(localStorage.getItem(SAVE_KEY)||'null')}catch(e){return null}}
function saveState(next){const d=debug();if(!d)return;applying=true;try{d.setState(next);d.save()}finally{queueMicrotask(()=>{applying=false})}}
function normalizeText(t=''){return String(t).toLowerCase().replace(/[\s，。！？、,.!?；;：:（）()“”"']/g,'')}
function hasAny(t,words){t=normalizeText(t);return words.some(w=>t.includes(normalizeText(w)))}

function migrateSave(){
  try{
    const raw=localStorage.getItem(SAVE_KEY); if(!raw)return;
    const s=JSON.parse(raw); if(!s||typeof s!=='object')throw new Error('invalid');
    s.permissions=Object.assign({schedule:true,equipment:true,property:true,reports:true,evidence:false},s.permissions||{});
    for(const k of ['seen','answered','attempts','hints','flags']) if(!s[k]||typeof s[k]!=='object'||Array.isArray(s[k]))s[k]={};
    for(const k of ['evidence','history','logs']) if(!Array.isArray(s[k]))s[k]=[];
    if(!Number.isFinite(+s.chapter))s.chapter=0;if(!Number.isFinite(+s.step))s.step=0;if(!Number.isFinite(+s.night))s.night=1;
    if(typeof s.time!=='string')s.time='22:06'; if(typeof s.view!=='string')s.view='desk';
    localStorage.setItem(SAVE_KEY,JSON.stringify(s));
  }catch(e){localStorage.removeItem(SAVE_KEY)}
  const cont=$('#continueGameBtn');if(cont)cont.disabled=!localStorage.getItem(SAVE_KEY);
}

function tuneTasks(){
  const T=debug()?.task;if(!T||T.__logicTuned)return;
  Object.defineProperty(T,'__logicTuned',{value:true,enumerable:false,configurable:true});
  // 第一题不再由题面替玩家下结论，并扩大自然表达覆盖。
  T.q1.prompt='回放里的事故发生在今天 10:17；报告元数据里还记录了另一个时间。请用自己的话说明两者为什么不正常。';
  T.q1.core[0].push('先有报告后有事故','报告比事故更早','事故没发生报告先有','报告在事故之前','还没出事');
  T.q1.core[1].push('提前写','提前生成','系统先写了','先生成报告','报告先出来');
  // 当前页面实际只展示两年归档中的抽样，避免“六条记录=完整两年”的叙事错位。
  T.q3.title='两年归档的抽样记录里，真正稳定的是什么？';
  T.q3.prompt='当前页面展示的是两年事故归档中的 6 条抽样。地点、类型、人员都在变化，请指出异常稳定的指标。';
  // 无人伤害方案的三项均为安全闭环必要条件；原版 need=2 会让漏写清场的方案误通过。
  T.q6.need=3;
  T.q6.prompt='请描述一个完整方案：人员如何离开事故区域、由什么设备承担损失，以及怎样在受控测试中形成真实财产损失。核心方向正确即可。';
  T.q6.partial='方向接近，但安全闭环还不完整：人员清场、设备对象、受控损坏这三部分都要交代。';
  T.q6.core[0].push('人员离场','禁止进入','隔离人员','人员不在场','撤离现场','封锁测试区','没有人','不留人','员工离开','人员全部离开','无员工','现场无人员');
  T.q6.core[1].push('旧设备','旧机架','淘汰机架','资产','测试架','测试柜','老化架');
  T.q6.core[2].push('受控损坏','故障测试','做故障测试','让设备损坏','真实财产损失','可控过载','过载','短路测试','可控事故');
  // q7 原文提到林姐，但真正要求玩家取得的是纸质授权、老杨工单、程越邮件。
  T.q7.prompt='结合纸质授权单、老杨的旧工单和程越打印的邮件，解释为什么衡损仍然需要夜班行政点击“提交”。';
}

function patchLogs(){
  const s=state(); if(!s||!Array.isArray(s.logs))return false;
  const map=new Map([
    ['事故回放结束。你注意到报告的创建时间早于事故发生。','事故回放与报告已归档。元数据存在异常，待你自行核对。'],
    ['你提交了整改：停用三楼饮水设备。第二天，员工被迫改去其他楼层接水。','整改已提交：停用三楼饮水设备，等待物业检查。该措施将在次日班前生效。'],
    ['整改并没有消除事故，只改变了事故发生的位置。','第二起事故发生在消防楼梯。请把昨日整改与今天现场记录放在一起核对。'],
    ['权限审查完成：排班与设备权限暂停，物业只读。事故报告提交权限：保留。','权限审查完成：排班、设备与物业操作权限暂停。事故报告提交权限：保留。'],
    ['新的损失模型已准备。你必须决定是重写、关闭，还是继续使用衡损。','程越留下的应急维护令牌已在本地控制台验证：只允许一次修改目标函数或暂停服务，审计日志不可删除。新的损失模型已准备。']
  ]);
  let changed=false;
  const logs=s.logs.map(x=>{const repl=map.get(x?.text);if(!repl)return x;changed=true;return Object.assign({},x,{text:repl})});
  if(changed){s.logs=logs;saveState(s);return true}return false;
}

function activeView(){return $('.nav-btn[data-view].active')?.dataset.view||state()?.view||'desk'}
function setText(el,text){if(el&&el.textContent!==text)el.textContent=text}

function patchStart(){
  const warning=$('#startScreen .monitor-card.warning');
  if(warning){setText(warning.querySelector('strong'),'权限状态');setText(warning.querySelector('small'),'正常')}
}
function patchDesk(s){
  if(!s)return;
  if(s.chapter===0){const h=$('#view .task-card h3');if(h?.textContent.includes('补齐昨日事故单'))setText(h,'交接：补齐今日事故单')}
}
function patchSchedule(s){
  if(!s)return; const table=$('#view table'); if(!table)return;
  const allowed=(s.chapter===3&&s.step>=2)||s.chapter>=4;
  if(!allowed){
    const th=table.querySelector('thead th:nth-child(3)');setText(th,'模型字段');
    table.querySelectorAll('tbody tr').forEach(tr=>{const td=tr.children[2];if(td){td.dataset.logicOriginal=td.dataset.logicOriginal||td.textContent;setText(td,'权限不足');td.classList.add('logic-redacted')}});
    let note=$('#view .logic-note');if(!note){note=document.createElement('div');note.className='logic-note';note.innerHTML='<strong>当前权限：</strong>普通排班信息可见；风险模型的人员折算字段尚未开放。';table.before(note)}
  }
}
function patchEquipment(s){
  if(!s)return; const cards=$$('#view .evidence-card'); if(!cards.length)return;
  const solutionOpen=(s.chapter===4&&s.step>=3)||s.chapter>=5;
  for(const card of cards){
    const strong=card.querySelector('strong'),small=card.querySelector('small');const title=strong?.textContent||'';
    if(title.includes('TEST RACK 04')&&!solutionOpen){setText(strong,'资产台账 · 测试设备');setText(small,'详细账面价值、淘汰状态与测试区条件尚未进入当前调查范围。');card.classList.add('logic-disabled-card')}
    if(title.includes('事故纳入阈值')&&!solutionOpen){setText(strong,'事故纳入规则');setText(small,'详细纳入阈值需在事故路径分析阶段查看。');card.classList.add('logic-disabled-card')}
    if(title.includes('三楼饮水设备')&&s.chapter<2){setText(small,'状态：运行\n待本夜事故交接确认后决定是否停用。')}
    if(title.includes('消防门禁')&&!(s.chapter>2||(s.chapter===2&&s.step>=1))){setText(small,'状态：正常\n近期人流统计尚未汇总。')}
  }
}
function patchProperty(s){
  if(!s)return;
  const table=$('#view table');if(table){
    const rows=[...table.querySelectorAll('tbody tr')];
    if(rows[0]&&!s.answered?.q1){setText(rows[0].children[2],'来源待核');rows[0].children[2]?.classList.add('logic-redacted')}
    if(rows[2]&&!s.flags?.rackKnown){setText(rows[2].children[0],'—');setText(rows[2].children[1],'无有效工单');setText(rows[2].children[2],'—')}
  }
  const cards=$$('#view .card');for(const card of cards){if(card.querySelector('h3')?.textContent.includes('老杨')&&s.chapter<6){setText(card.querySelector('h3'),'物业联系人');setText(card.querySelector('p'),'当前页面没有可用于事故推断的人工备注。');card.classList.add('logic-disabled-card')}}
}
function patchReports(s){
  if(!s)return; const list=$('#view .report-list');
  if(list&&!$('#view .logic-archive-note')){const n=document.createElement('div');n.className='logic-note logic-archive-note';n.innerHTML='<strong>归档范围：</strong>2024—2026 两年事故库 / 当前页面仅显示 6 条抽样记录。';list.before(n)}
  const policy=[...$$('#view .card')].find(x=>x.querySelector('h3')?.textContent.includes('风险处置制度说明'));
  if(policy&&!s.evidence?.includes('policyNote')){setText(policy.querySelector('p'),'23:59 前无人确认的建议会转入“最低干预模式”。更早的事故复盘不在当前系统权限中。')}
}
function patchEvidence(s){
  if(!s||s.chapter<7||!s.answered?.q9)return;
  const grid=$('#view .evidence-grid');if(grid&&!grid.querySelector('[data-logic-token]')){const card=document.createElement('div');card.className='evidence-card seen logic-maint-token';card.dataset.logicToken='1';card.innerHTML='<strong>一次性应急维护令牌</strong><small>程越离线交付。仅允许一次修改目标函数或暂停服务；不能删除审计记录，也不能改写既有报告。</small>';grid.append(card)}
}
function patchQuestionOverlay(){
  const h=$('#overlayCard .input-question h2'); if(!h)return;
  const p=h.parentElement?.querySelector('p');
  if(h.textContent.includes('报告最不正常'))setText(p,debug()?.task?.q1?.prompt||p.textContent);
  if(h.textContent.includes('两年')){setText(h,debug()?.task?.q3?.title||h.textContent);setText(p,debug()?.task?.q3?.prompt||p.textContent)}
  if(h.textContent.includes('无人受伤'))setText(p,debug()?.task?.q6?.prompt||p.textContent);
  if(h.textContent.includes('为什么衡损系统仍然需要'))setText(p,debug()?.task?.q7?.prompt||p.textContent);
}
function patchAudit(){
  const p3=$('#p3');if(p3?.textContent==='只读')setText(p3,'暂停');
  const txt=$('#auditText');if(txt&&txt.innerHTML.includes('异常行为关联度')&&!txt.dataset.logicFixed){txt.dataset.logicFixed='1';txt.innerHTML='跨夜操作关联分析（按夜班日志聚合）<br><br>第 1 夜　确认三楼饮水设备整改　关联度 12%<br>第 4 夜　调整李闻次日排班　关联度 37%<br>第 5 夜　提交临时设备测试申请　关联度 64%<br>第 5 夜　修改测试区域人员权限　<span style="color:#e07b72">关联度 91.6%</span><br><br><b style="color:#e07b72">跨夜异常行为关联度：91.6%</b><br>操作账户：夜班行政 / 当前用户'}
}
function patchFinalChoice(s){
  const h=$('#overlayCard h2');if(!h?.textContent.includes('最终决策'))return;
  const p=h.nextElementSibling;if(p&&s?.answered?.q9)setText(p,'衡损确实降低过重大事故率，但它把人员轻伤当成可接受成本。程越留下的一次性应急维护令牌只允许你执行一次模型级操作；公开路线则取决于你实际保全了多少线下证据。')
}

function apply(){
  if(applying)return; const s=state();
  if(patchLogs())return;
  patchStart();tuneTasks();
  if(!s)return;
  const v=activeView();if(v==='desk')patchDesk(s);if(v==='schedule')patchSchedule(s);if(v==='equipment')patchEquipment(s);if(v==='property')patchProperty(s);if(v==='reports')patchReports(s);if(v==='evidence')patchEvidence(s);
  patchQuestionOverlay();patchAudit();patchFinalChoice(s);
}
function scheduleApply(){if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;apply()})}

// q6 的本地判定已改为三项都必须满足；若本地仍未识别，会保留原有 Cloudflare 语义兜底，避免卡标准措辞。

// 有存档时避免“开始夜班”直接覆盖旧进度。
document.addEventListener('click',e=>{
  if(e.target.closest?.('#newGameBtn')&&!e.defaultPrevented&&localStorage.getItem(SAVE_KEY)){
    if(!confirm('检测到已有夜班进度。确定从头开始并覆盖当前存档吗？')){e.preventDefault();e.stopImmediatePropagation()}
  }
},true);

// Cloudflare 语义兜底最多等待 5 秒，避免网络异常时提交按钮无限挂起。
const nativeFetch=window.fetch?.bind(window);if(nativeFetch){window.fetch=(input,init={})=>{
  const endpoint=window.GAME_CONFIG?.workerEndpoint;const url=typeof input==='string'?input:input?.url;
  if(!endpoint||url!==endpoint||init.signal)return nativeFetch(input,init);
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),5000);
  return nativeFetch(input,Object.assign({},init,{signal:ctl.signal})).finally(()=>clearTimeout(timer));
}}

migrateSave();
window.addEventListener('DOMContentLoaded',()=>{tuneTasks();apply()},{once:true});
new MutationObserver(scheduleApply).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
setTimeout(apply,0);
})();
