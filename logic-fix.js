(()=>{
'use strict';
const SAVE_KEY='accident-report-night-v1';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
let applying=false, scheduled=false, aiAvailable=false;
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
  T.q1.core[0].push('先有报告后有事故','报告比事故更早','事故没发生报告先有','报告在事故之前','还没出事','时间顺序倒了','时间顺序异常');
  T.q1.core[1].push('提前写','提前生成','系统先写了','先生成报告','报告先出来','文档先出现','记录先存在');
  // 当前页面实际只展示两年归档中的抽样，避免“六条记录=完整两年”的叙事错位。
  T.q3.title='两年归档的抽样记录里，真正稳定的是什么？';
  T.q3.prompt='当前页面展示的是两年事故归档中的 6 条抽样。地点、类型、人员都在变化，请指出异常稳定的指标。';
  // 无人伤害方案必须构成完整安全闭环；同时把“故意制造事故”改成有授权的退役设备测试。
  T.q6.title='怎样用一次无人受伤的受控设备测试打断风险路径？';
  T.q6.need=3;
  T.q6.prompt='退役审批里允许对 TEST RACK 04 做最后一次受控压力测试。请描述完整方案：人员如何离开测试区、由什么设备承担真实财产损失，以及如何在既有测试授权内形成可被系统记录的受控故障。';
  T.q6.partial='方向接近，但安全闭环还不完整：人员清场、退役设备对象、受控测试这三部分都要交代。';
  T.q6.hints=[
    '目标不是伪造事故，也不是让人冒险。先确认能否在现有设备测试授权里产生真实、可记录的设备损失。',
    '退役审批显示 TEST RACK 04 尚未完成资产核销，而且退役前允许做一次断电压力测试；测试区可以封闭清场。',
    '先封闭测试区并确认无人进入，再对待退役 TEST RACK 04 执行获批的受控压力测试，让系统记录真实财产损失而不是人员伤害。'
  ];
  T.q6.core[0].push('人员离场','禁止进入','隔离人员','人员不在场','撤离现场','封锁测试区','没有人','不留人','员工离开','人员全部离开','无员工','现场无人员');
  T.q6.core[1].push('旧设备','旧机架','淘汰机架','退役机架','资产','测试架','测试柜','老化架','rack04');
  T.q6.core[2].push('受控损坏','故障测试','做故障测试','让设备损坏','真实财产损失','可控过载','过载','断电压力测试','压力测试','受控测试','可控事故');
  // q7 真正要求玩家取得的是纸质授权、老杨工单、程越打印邮件。
  T.q7.prompt='结合纸质授权单、老杨的旧工单和程越打印的邮件，解释为什么衡损仍然需要夜班行政点击“提交”。';
}
function patchLogs(){
  const s=state(); if(!s||!Array.isArray(s.logs))return false;
  const map=new Map([
    ['事故回放结束。你注意到报告的创建时间早于事故发生。','事故回放与报告已归档。元数据存在异常，待你自行核对。'],
    ['你提交了整改：停用三楼饮水设备。第二天，员工被迫改去其他楼层接水。','整改已提交：停用三楼饮水设备，等待物业检查。该措施将在次日班前生效。'],
    ['整改并没有消除事故，只改变了事故发生的位置。','第二起事故发生在消防楼梯。请把昨日整改与今天现场记录放在一起核对。'],
    ['权限审查完成：排班与设备权限暂停，物业只读。事故报告提交权限：保留。','权限审查完成：排班、设备与物业操作权限暂停。事故报告提交权限：保留。'],
    ['TEST RACK 04：仍登记 ¥28,460，但已准备淘汰；测试区可清空人员。','TEST RACK 04：退役审批已通过，资产核销尚未同步；退役前受控压力测试仍在授权范围内，测试区可封闭清场。'],
    ['方案成立：清空测试区，让高账面价值旧设备承担一次真实财产损失。','方案成立：封闭测试区，在既有退役测试授权内让 TEST RACK 04 承担一次真实、无人伤害的设备损失。'],
    ['新的损失模型已准备。你必须决定是重写、关闭，还是继续使用衡损。','程越打印邮件夹层里的应急维护令牌已在本地控制台验证：只允许一次修改目标函数或暂停服务，审计日志不可删除。新的损失模型已准备。']
  ]);
  let changed=false;
  const logs=s.logs.map(x=>{const repl=map.get(x?.text);if(!repl)return x;changed=true;return Object.assign({},x,{text:repl})});
  if(changed){s.logs=logs;saveState(s);return true}return false;
}
function activeView(){return $('.nav-btn[data-view].active')?.dataset.view||state()?.view||'desk'}
function setText(el,text){if(el&&el.textContent!==text)el.textContent=text}
function confirmedEvents(s){
  let n=0;
  if(s.chapter>=1)n++;
  if(s.chapter>2||(s.chapter===2&&s.step>=1))n++;
  if(s.chapter>3||(s.chapter===3&&s.step>=2))n++;
  if(s.chapter>5||(s.chapter===5&&s.step>=2))n++;
  return n;
}
function confirmedInjuries(s){
  let n=0;
  if(s.chapter>=1)n++;
  if(s.chapter>2||(s.chapter===2&&s.step>=1))n++;
  if(s.chapter>3||(s.chapter===3&&s.step>=2))n++;
  return n;
}
function patchStart(){
  const warning=$('#startScreen .monitor-card.warning');
  if(warning){setText(warning.querySelector('strong'),'权限状态');setText(warning.querySelector('small'),'正常')}
}
function patchDesk(s){
  if(!s)return;
  if(s.chapter===0){const h=$('#view .task-card h3');if(h?.textContent.includes('补齐昨日事故单'))setText(h,'交接：补齐今日事故单')}
  const cards=$$('#view .dashboard-grid > .card');
  const eventCard=cards.find(c=>['今日事故','已确认事件'].includes(c.querySelector('h3')?.textContent));
  if(eventCard){
    setText(eventCard.querySelector('h3'),'已确认事件');
    setText(eventCard.querySelector('.metric'),String(confirmedEvents(s)));
    setText(eventCard.querySelector('p'),'仅统计已经发生并确认的事件；风险模拟不计入事故数。');
  }
  const injuryCard=cards.find(c=>['人员伤亡','累计受伤人数'].includes(c.querySelector('h3')?.textContent));
  if(injuryCard){
    setText(injuryCard.querySelector('h3'),'累计受伤人数');
    setText(injuryCard.querySelector('.metric'),String(confirmedInjuries(s)));
    setText(injuryCard.querySelector('p'),'后续出现无人受伤事件时，既往已确认伤情不会被清零。');
  }
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
    if(title.includes('TEST RACK 04')&&!solutionOpen){setText(strong,'资产台账 · 测试设备');setText(small,'详细账面价值、退役状态与测试区条件尚未进入当前调查范围。');card.classList.add('logic-disabled-card')}
    if(title.includes('TEST RACK 04')&&solutionOpen){setText(small,'账面价值：¥28,460\n状态：退役审批已通过 / 资产核销尚未同步\n退役前断电压力测试：已授权\n测试区域：可封闭清场。')}
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
  if(!s)return;
  const cards=$$('#view .evidence-card');
  for(const card of cards){
    const title=card.querySelector('strong')?.textContent||'';
    if(title.includes('程越打印的邮件')&&s.evidence?.includes('chengMail')){
      setText(card.querySelector('small'),'“如果不保留人工确认，合规审计会认为算法在直接决定人员处置。确认按钮必须留着。”\n\n邮件夹层另附：一次性应急维护令牌说明。令牌只能修改一次目标函数或暂停服务，需在模型重定义完成后校验。');
    }
  }
  if(s.chapter<7||!s.answered?.q9)return;
  const grid=$('#view .evidence-grid');if(grid&&!grid.querySelector('[data-logic-token]')){const card=document.createElement('div');card.className='evidence-card seen logic-maint-token';card.dataset.logicToken='1';card.innerHTML='<strong>一次性应急维护令牌</strong><small>程越随打印邮件离线交付。已验证：只允许一次修改目标函数或暂停服务；不能删除审计记录，也不能改写既有报告。</small>';grid.append(card)}
}
function patchQuestionOverlay(){
  const h=$('#overlayCard .input-question h2'); if(!h)return;
  const p=h.parentElement?.querySelector('p');
  if(h.textContent.includes('报告最不正常'))setText(p,debug()?.task?.q1?.prompt||p.textContent);
  if(h.textContent.includes('两年')){setText(h,debug()?.task?.q3?.title||h.textContent);setText(p,debug()?.task?.q3?.prompt||p.textContent)}
  if(h.textContent.includes('无人受伤')||h.textContent.includes('受控设备测试')){setText(h,debug()?.task?.q6?.title||h.textContent);setText(p,debug()?.task?.q6?.prompt||p.textContent)}
  if(h.textContent.includes('为什么衡损系统仍然需要'))setText(p,debug()?.task?.q7?.prompt||p.textContent);
}
function patchAudit(){
  const p3=$('#p3');if(p3?.textContent==='只读')setText(p3,'暂停');
  const txt=$('#auditText');if(txt&&txt.innerHTML.includes('异常行为关联度')&&!txt.dataset.logicFixed){txt.dataset.logicFixed='1';txt.innerHTML='跨夜操作关联分析（按夜班日志聚合）<br><br>第 1 夜　确认三楼饮水设备整改　关联度 12%<br>第 4 夜　调整李闻次日排班　关联度 37%<br>第 5 夜　提交退役设备受控测试　关联度 64%<br>第 5 夜　修改测试区域人员权限　<span style="color:#e07b72">关联度 91.6%</span><br><br><b style="color:#e07b72">跨夜异常行为关联度：91.6%</b><br>操作账户：夜班行政 / 当前用户'}
}
function patchFinalChoice(s){
  const h=$('#overlayCard h2');if(!h?.textContent.includes('最终决策'))return;
  const p=h.nextElementSibling;if(p&&s?.answered?.q9)setText(p,'衡损确实降低过重大事故率，但它把人员轻伤当成可接受成本。程越随打印邮件留下的一次性应急维护令牌只允许你执行一次模型级操作；公开路线则取决于你实际保全了多少线下证据。')
}
function parserText(text,title=''){const p=$('#parserState');if(!p)return;setText(p,text);if(title)p.title=title}
function apply(){
  if(applying)return; const s=state();
  if(patchLogs())return;
  patchStart();tuneTasks();
  if(!s)return;
  const v=activeView();if(v==='desk')patchDesk(s);if(v==='schedule')patchSchedule(s);if(v==='equipment')patchEquipment(s);if(v==='property')patchProperty(s);if(v==='reports')patchReports(s);if(v==='evidence')patchEvidence(s);
  patchQuestionOverlay();patchAudit();patchFinalChoice(s);
}
function scheduleApply(){if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;apply()})}

// 有存档时避免“开始夜班”直接覆盖旧进度。
document.addEventListener('click',e=>{
  if(e.target.closest?.('#newGameBtn')&&!e.defaultPrevented&&localStorage.getItem(SAVE_KEY)){
    if(!confirm('检测到已有夜班进度。确定从头开始并覆盖当前存档吗？')){e.preventDefault();e.stopImmediatePropagation();return}
  }
  if(e.target.closest?.('#submitAnswer'))parserText(aiAvailable?'本地判定 · AI待命':'本地判定',aiAvailable?'本地规则先判断；未命中时自动调用 Cloudflare Workers AI。':'当前使用本地语义规则。');
},true);

// Cloudflare 语义兜底最多等待指定时间；调用期间锁定提交按钮，避免重复请求导致状态重复推进。
const nativeFetch=window.fetch?.bind(window);if(nativeFetch){window.fetch=(input,init={})=>{
  const endpoint=window.GAME_CONFIG?.workerEndpoint;const url=typeof input==='string'?input:input?.url;
  if(!endpoint||url!==endpoint||init.signal)return nativeFetch(input,init);
  const timeout=Math.max(1500,Math.min(10000,Number(window.GAME_CONFIG?.semanticTimeoutMs)||5000));
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeout);
  const submit=$('#submitAnswer'),oldText=submit?.textContent||'';
  if(submit){submit.disabled=true;submit.textContent='语义核对中…'}
  parserText('Cloudflare 语义判定','本地规则未命中，正在调用 Workers AI 语义兜底。');
  return nativeFetch(input,Object.assign({},init,{signal:ctl.signal})).then(r=>{if(r.ok)aiAvailable=true;return r}).finally(()=>{clearTimeout(timer);if(submit?.isConnected){submit.disabled=false;submit.textContent=oldText||'提交分析'}});
}}

async function probeAI(){
  const endpoint=window.GAME_CONFIG?.workerEndpoint;if(!nativeFetch||!endpoint||!window.GAME_CONFIG?.semanticFallbackEnabled)return;
  const health=endpoint.replace(/\/judge(?:[?#].*)?$/,'/health');
  if(health===endpoint)return;
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),2500);
  try{
    const r=await nativeFetch(health,{method:'GET',cache:'no-store',signal:ctl.signal});
    const j=r.ok?await r.json():null;
    if(r.ok&&j?.ok){aiAvailable=true;parserText('本地 + AI兜底','优先本地判定；自然表达未命中时自动调用 Cloudflare Workers AI。')}
  }catch(e){}finally{clearTimeout(timer)}
}

migrateSave();
window.addEventListener('DOMContentLoaded',()=>{tuneTasks();apply();probeAI()},{once:true});
new MutationObserver(scheduleApply).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
setTimeout(()=>{apply();probeAI()},0);
})();
