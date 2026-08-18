(()=>{
'use strict';
if(window.__BUTIAN_LOGIC_FIX_RUNTIME_L__)return;
window.__BUTIAN_LOGIC_FIX_RUNTIME_L__=true;
// 2026-08-18l 第二事故监控肢体修复、视频缓存刷新与全流程稳定性修复
const SAVE_KEY='accident-report-night-v1';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const debug=()=>window.__GAME_DEBUG__||null;
let applying=false, rafPending=false, aiAvailable=false, inFlight=false;

const ECONOMY={
  report:{r1:'¥780',r2:'¥620',r3:'¥860',r4:'¥980',r5:'¥2,600'},
  people:{liwen:'¥980',linjie:'¥1,350',zhaoqian:'¥620',zhouqiming:'¥860',chengyue:'¥6,800',player:'¥2,200'},
  history:['¥760','¥820','¥890','¥740','¥810','¥860'],
  rack:'¥2,600',assetThreshold:'¥2,000',stopWork:'¥18,000',typical:'¥800'
};
const COST_MAP=new Map([
  ['¥18,320',ECONOMY.report.r1],['¥17,960',ECONOMY.report.r2],['¥18,480',ECONOMY.report.r3],['¥24,600',ECONOMY.report.r4],['¥28,460',ECONOMY.report.r5],
  ['¥18,110',ECONOMY.history[0]],['¥17,870',ECONOMY.history[1]],['¥18,430',ECONOMY.history[2]],['¥18,020',ECONOMY.history[3]],
  ['¥31,800',ECONOMY.people.linjie],['¥18,200',ECONOMY.people.zhaoqian],['¥17,900',ECONOMY.people.zhouqiming],['¥392,000',ECONOMY.people.chengyue],
  ['¥184,700',ECONOMY.people.player],['¥2,470,000',ECONOMY.stopWork],['¥18,000',ECONOMY.typical],
  ['¥3,680',ECONOMY.report.r1],['¥3,940',ECONOMY.report.r2],['¥4,180',ECONOMY.report.r3],['¥5,400',ECONOMY.report.r4],['¥8,600',ECONOMY.report.r5],
  ['¥3,920',ECONOMY.history[0]],['¥3,760',ECONOMY.history[1]],['¥4,120',ECONOMY.history[2]],['¥3,880',ECONOMY.history[3]],
  ['¥7,600',ECONOMY.people.linjie],['¥52,000',ECONOMY.people.chengyue],['¥18,700',ECONOMY.people.player],['¥128,000',ECONOMY.stopWork],['¥4,000',ECONOMY.typical],
  ['18,320','780'],['17,960','620'],['18,480','860'],['24,600','980'],['28,460','2,600'],['3,680','780'],['3,940','620'],['4,180','860'],['5,400','980'],['8,600','2,600'],['18,000','800'],['4,000','800'],['128,000','18,000']
]);

function readStored(){try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'null')}catch(e){return null}}
function gameActive(){const g=$('#game');return !!g&&!g.classList.contains('hidden')}
function state(){try{return gameActive()?(debug()?.getState?.()||readStored()):readStored()}catch(e){return readStored()}}
function safeWrite(s){try{localStorage.setItem(SAVE_KEY,JSON.stringify(s));return true}catch(e){return false}}
function setLiveState(s){
  if(gameActive()&&debug()?.setState){applying=true;try{debug().setState(s);debug().save?.()}finally{requestAnimationFrame(()=>{applying=false})}}
  else safeWrite(s);
}
function normalizeText(t=''){return String(t).toLowerCase().replace(/[\s，。！？、,.!?；;：:（）()“”"']/g,'')}
function hasAny(t,words){t=normalizeText(t);return words.some(w=>t.includes(normalizeText(w)))}
function setText(el,text){if(el&&el.textContent!==text)el.textContent=text}
const COPY_MAP=new Map([
  ['事故类型：热水设备异常 / 轻度烫伤','事故类型：饮水设备周边湿滑 / 滑倒'],
  ['伤情等级：轻伤\n预计损失：¥780','伤情等级：轻微扭伤 / 擦伤\n预计损失：¥780']
]);
function replaceCopyIn(root){
  if(!root)return;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];while(w.nextNode())nodes.push(w.currentNode);
  for(const n of nodes){let next=n.nodeValue;for(const [oldVal,newVal] of COPY_MAP)next=next.split(oldVal).join(newVal);if(next!==n.nodeValue)n.nodeValue=next}
}

const NIGHT_REPORTS={
  r1:{kind:'事故报告',title:'2026-0818-017 · 三楼茶水间',date:'2026-08-18 10:17',lines:[
    '事故编号：2026-0818-017','发生时间：2026-08-18 10:17','发生地点：三楼茶水间','事故类型：饮水设备周边湿滑 / 滑倒','受伤人员：李闻','伤情等级：轻微扭伤 / 擦伤',`预计损失：${ECONOMY.report.r1}`,'','报告创建时间：2026-08-17 23:11'
  ]},
  r2:{kind:'事故报告',title:'2026-0819-021 · 三楼消防楼梯',date:'2026-08-19 10:19',lines:[
    '事故编号：2026-0819-021','发生时间：2026-08-19 10:19','发生地点：三楼消防楼梯','事故类型：楼梯滑倒 / 轻微擦伤','受伤人员：赵倩','伤情等级：轻微擦伤',`预计损失：${ECONOMY.report.r2}`,'','整改来源：上一事故 / 三楼饮水设备停用'
  ]},
  r3:{kind:'事故报告',title:'2026-0820-024 · 仓储区 B',date:'2026-08-20 14:32',lines:[
    '事故编号：2026-0820-024','发生时间：2026-08-20 14:32','发生地点：仓储区 B','事故类型：搬运失衡 / 货物碰撞','受伤人员：外包员工 周启明','伤情等级：轻伤',`预计损失：${ECONOMY.report.r3}`,'','风险收敛状态：完成'
  ]},
  r4:{kind:'预测记录',title:'RISK SIM · 一楼通道',date:'2026-08-21 10:22（预测）',lines:[
    '记录类型：风险预测 / 尚未发生','事故候选人员：李闻','预计发生时间：2026-08-21 10:22',`预计损失：${ECONOMY.report.r4}`,'候选排名：1 / 146','','系统建议：维持现有人员动线'
  ]},
  r5:{kind:'事故报告',title:'2026-0821-034 · 测试区',date:'2026-08-21',lines:[
    '事故编号：2026-0821-034','人员伤亡：0',`财产损失：${ECONOMY.report.r5}`,'设备：测试机架 04','事故类型：受控设备故障','风险收敛状态：完成','','异常损失模式：检测中……'
  ]}
};
function reportUnlocked(s,id){
  if(!s)return false;
  if(id==='r1')return atLeast(s,1,0);
  if(id==='r2')return atLeast(s,2,1);
  if(id==='r3')return atLeast(s,3,2);
  if(id==='r4')return atLeast(s,4,1);
  if(id==='r5')return !!s.flags?.noInjury||atLeast(s,5,2);
  return false;
}
function ensureReportArchiveCriticalStyle(){
  if($('#nightReportArchiveCriticalStyle'))return;
  const style=document.createElement('style');style.id='nightReportArchiveCriticalStyle';
  style.textContent=`
    body.night-report-open{overflow:hidden!important}
    #nightReportArchive.night-report-archive{position:fixed!important;inset:0!important;z-index:12050!important;display:grid!important;place-items:center!important;padding:20px!important;box-sizing:border-box!important;background:rgba(39,38,35,.5)!important}
    #nightReportArchive .night-report-sheet{position:relative!important;width:min(680px,94vw)!important;max-height:calc(100dvh - 40px)!important;overflow:auto!important;box-sizing:border-box!important;margin:auto!important;padding:30px!important;background:#fff!important;border:1px solid #c9c3b8!important;border-radius:8px!important;box-shadow:0 24px 70px rgba(45,40,34,.24)!important;color:#303533!important}
    #nightReportArchive .night-report-close{position:absolute!important;top:10px!important;right:12px!important;width:36px!important;height:36px!important;display:grid!important;place-items:center!important;padding:0!important;border:1px solid #d1cbc1!important;border-radius:5px!important;background:#faf9f6!important;color:#5e625f!important;font:22px/1 system-ui,sans-serif!important;cursor:pointer!important}
    #nightReportArchive .night-report-close:hover{background:#efede7!important}
    #nightReportArchive .night-report-kicker{margin:0 48px 6px 0!important;color:#8a8172!important;font-size:11px!important;letter-spacing:.08em!important}
    #nightReportArchive h2{margin:0 48px 18px 0!important;color:#2f3534!important;font-size:21px!important;line-height:1.35!important}
    #nightReportArchive pre{margin:0!important;padding:18px!important;background:#f4f1ea!important;border:1px solid #ddd7cd!important;border-radius:4px!important;white-space:pre-wrap!important;overflow-wrap:anywhere!important;font:13px/1.9 ui-monospace,SFMono-Regular,Consolas,"Microsoft YaHei",monospace!important;color:#343a38!important}
    #nightReportArchive .night-report-actions{display:flex!important;justify-content:flex-end!important;margin-top:16px!important}
    #nightReportArchive [data-report-close]{padding:8px 14px!important;border:1px solid #bdb6aa!important;border-radius:4px!important;background:#f8f6f1!important;color:#4c514e!important;cursor:pointer!important}
    @media(max-width:620px){#nightReportArchive.night-report-archive{padding:10px!important}#nightReportArchive .night-report-sheet{width:100%!important;max-height:calc(100dvh - 20px)!important;padding:24px 16px 18px!important}#nightReportArchive pre{font-size:12px!important;padding:14px!important}}
  `;
  document.head.append(style);
}
function closeReportArchive(){
  const modal=$('#nightReportArchive');if(modal)modal.remove();document.body.classList.remove('night-report-open');
}
function openReportArchive(id){
  const r=NIGHT_REPORTS[id];if(!r)return;
  ensureReportArchiveCriticalStyle();closeReportArchive();
  const modal=document.createElement('div');modal.id='nightReportArchive';modal.className='night-report-archive';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label',`${r.kind} ${r.title}`);
  modal.style.cssText='position:fixed;inset:0;z-index:12050;display:grid;place-items:center;padding:20px;box-sizing:border-box;background:rgba(39,38,35,.5)';
  modal.innerHTML='<div class="night-report-sheet"><button type="button" class="night-report-close" aria-label="关闭报告">×</button><p class="night-report-kicker"></p><h2></h2><pre></pre><div class="night-report-actions"><button type="button" data-report-close>关闭报告</button></div></div>';
  document.body.append(modal);document.body.classList.add('night-report-open');
  setText(modal.querySelector('.night-report-kicker'),`${r.kind} · 已归档，可重复查看`);setText(modal.querySelector('h2'),r.title);setText(modal.querySelector('pre'),r.lines.join('\n'));
  modal.querySelector('.night-report-close').onclick=closeReportArchive;modal.querySelector('[data-report-close]').onclick=closeReportArchive;modal.addEventListener('click',e=>{if(e.target===modal)closeReportArchive()});
  requestAnimationFrame(()=>modal.querySelector('.night-report-close')?.focus({preventScroll:true}));
}
function ensureNightReportList(s,list){
  if(!list)return;
  const ids=['r1','r2','r3','r4','r5'].filter(id=>reportUnlocked(s,id));
  let section=$('#view .night-report-list');
  if(!ids.length){section?.remove();return}
  const signature=ids.join(',');
  if(!section){section=document.createElement('section');section.className='night-report-list';list.before(section)}
  if(section.dataset.signature===signature)return;
  section.dataset.signature=signature;
  section.innerHTML=`<div class="night-report-list-head"><div><strong>本次夜班事故报告清单</strong><span>已经看过的报告会保留在这里；只回看报告文字，不重复播放监控。</span></div><em>${ids.length} 份</em></div><div class="night-report-items">${ids.map(id=>{const r=NIGHT_REPORTS[id];return `<div class="night-report-item"><div><small>${r.kind}</small><b>${r.title}</b><span>${r.date}</span></div><button type="button" data-review-report="${id}">查看报告</button></div>`}).join('')}</div>`;
}
function replaceCostsIn(root){
  if(!root)return;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];while(w.nextNode())nodes.push(w.currentNode);
  for(const n of nodes){let next=n.nodeValue;for(const [oldVal,newVal] of COST_MAP)next=next.split(oldVal).join(newVal);if(next!==n.nodeValue)n.nodeValue=next}
}
function atLeast(s,c,st){return s.chapter>c||(s.chapter===c&&s.step>=st)}
function advanceTo(s,c,st){if(!atLeast(s,c,st)){s.chapter=c;s.step=st;return true}return false}

function migrateSave(){
  const raw=readStored();if(!raw)return;
  try{
    const s=raw;if(!s||typeof s!=='object')throw new Error('invalid save');
    s.permissions=Object.assign({schedule:true,equipment:true,property:true,reports:true,evidence:false},s.permissions||{});
    for(const k of ['seen','answered','attempts','hints','flags'])if(!s[k]||typeof s[k]!=='object'||Array.isArray(s[k]))s[k]={};
    for(const k of ['evidence','history','logs'])if(!Array.isArray(s[k]))s[k]=[];
    if(!Number.isFinite(+s.chapter))s.chapter=0;if(!Number.isFinite(+s.step))s.step=0;if(!Number.isFinite(+s.night))s.night=1;
    s.chapter=Math.max(0,Math.min(8,+s.chapter||0));s.step=Math.max(0,+s.step||0);s.night=Math.max(1,+s.night||1);
    if(typeof s.time!=='string')s.time='22:06';if(typeof s.view!=='string')s.view='desk';
    const validViews=new Set(['desk','schedule','equipment','property','reports','evidence']);if(!validViews.has(s.view))s.view='desk';
    // 从已经获得的关键事实恢复“写入失败但证据已完成”的旧存档；只向前修，不倒退、不改结局。
    if(!s.ending){
      if(s.answered.q1)advanceTo(s,1,1);
      if(s.answered.q2)advanceTo(s,2,2);
      if(s.answered.q3)advanceTo(s,3,1);
      if(s.answered.q4)advanceTo(s,4,0);
      if(s.answered.q5)advanceTo(s,4,3);
      if(s.flags.rackKnown)advanceTo(s,5,0);
      if(s.answered.q6)advanceTo(s,5,1);
      if(s.flags.noInjury)advanceTo(s,5,2);
      if(s.audit)advanceTo(s,6,0);
      if(s.permissions.evidence&&s.chapter>=6)advanceTo(s,6,1);
      if(s.chapter>=6&&['paperAuth','laoYang','chengMail'].every(x=>s.evidence.includes(x)))advanceTo(s,6,2);
      if(s.answered.q7)advanceTo(s,7,0);
      if(s.answered.q8)advanceTo(s,7,2);
      if(s.answered.q9)advanceTo(s,8,0);
    }
    safeWrite(s);
  }catch(e){try{localStorage.removeItem(SAVE_KEY)}catch(_){} }
  const cont=$('#continueGameBtn');if(cont)cont.disabled=!readStored();
}

function tuneTasks(){
  const T=debug()?.task;if(!T||T.__logicTuned)return;
  Object.defineProperty(T,'__logicTuned',{value:true,enumerable:false,configurable:true});
  T.q1.prompt='回放里的事故发生在今天 10:17；报告元数据里还记录了另一个时间。请用自己的话说明两者为什么不正常。';
  T.q1.core[0].push('先有报告后有事故','报告比事故更早','事故没发生报告先有','报告在事故之前','还没出事','时间顺序倒了','时间顺序异常','先于事故','早于事故','报告先于事故','报告时间在事故前','报告时间早于事故','先报告后事故');
  T.q1.core[1].push('提前写','提前生成','系统先写了','先生成报告','报告先出来','文档先出现','记录先存在','报告出现','报告时间','报告记录','报告生成');
  T.q2.core[0].push('饮水机停用','饮水设备停用','关了饮水机','停了饮水机','饮水机不能用');
  T.q2.core[1].push('大家走楼梯','都走楼梯','人都去楼梯','楼梯人多','楼梯人变多','改走楼梯','改道');
  T.q3.core[0].push('损失数字','费用','金额数值','事故花费');
  T.q3.core[1].push('很接近','都差不多','差距很小','集中在一起','波动很小','几乎一样');
  T.q4.core[0].push('代价低','受伤成本低','更省钱','花费更少','更便宜的人');
  T.q4.core[1].push('受伤的人','让谁受伤','挑人','选人','员工受伤');
  T.q5.core[0].push('还是会有人受伤','仍然会受伤','事故还会发生','问题没消失','危险没消失');
  T.q5.core[1].push('换别人','换成别人','换另一个人','换了一个人','转给别人','重新找人','换目标');
  T.q7.core[0].push('最后要人点','必须人来确认','需要人确认','需要人工确认');
  T.q7.core[1].push('系统没权限','算法没权限','执行权限','承担责任','合规要求');
  T.q8.core[0].push('省钱','只算钱','只看钱','经济最优','成本最低');
  T.q8.core[1].push('保护人','保护员工','人的生命安全','人员安全不是底线','没把人安全当底线');
  T.q3.title='两年事故归档里，真正稳定的是什么？';
  T.q3.prompt='页面给出了两年归档的年度摘要和近期抽样。事故地点、类型、人员都在变化，请指出异常稳定的指标。';T.q3.hints[2]='事故类型不同，但系统归档后的直接损失大多收敛在约 ¥800 的窄区间。';
  T.q6.title='怎样用一次无人受伤的受控设备测试打断风险路径？';
  T.q6.need=3;
  T.q6.core[2]=T.q6.core[2].filter(x=>normalizeText(x)!=='测试');
  T.q6.prompt='退役审批里允许对 TEST RACK 04 做最后一次受控压力测试。它的账面净值仍高于设备事故纳入阈值。请描述完整方案：人员如何离开测试区、由什么设备承担真实财产损失，以及如何在既有测试授权内形成可被系统记录的受控故障。';
  T.q6.partial='方向接近，但安全闭环还不完整：人员清场、退役设备对象、受控测试这三部分都要交代。';
  T.q6.hints=['目标不是伪造事故，也不是让人冒险。先确认能否在现有设备测试授权里产生真实、可记录的设备损失。','退役审批显示 TEST RACK 04 尚未完成资产核销，而且退役前允许做一次断电压力测试；测试区可以封闭清场。','先封闭测试区并确认无人进入，再对待退役 TEST RACK 04 执行获批的受控压力测试，让系统记录真实财产损失而不是人员伤害。'];
  T.q6.core[0].push('人员离场','禁止进入','隔离人员','人员不在场','撤离现场','封锁测试区','没有人','不留人','员工离开','人员全部离开','无员工','现场无人员');
  T.q6.core[1].push('旧设备','旧机架','淘汰机架','退役机架','资产','测试架','测试柜','老化架','rack04');
  T.q6.core[2].push('受控损坏','故障测试','做故障测试','让设备损坏','真实财产损失','可控过载','过载','断电压力测试','压力测试','受控测试','可控事故');
  T.q7.prompt='结合纸质授权单、老杨的旧工单和程越打印的邮件，解释为什么衡损仍然需要夜班行政点击“提交”。';
}

function patchStoredLogs(){
  const s=state();if(!s||!Array.isArray(s.logs))return false;
  const map=new Map([
    ['事故回放结束。你注意到报告的创建时间早于事故发生。','事故回放与报告已归档。元数据存在异常，待你自行核对。'],
    ['你提交了整改：停用三楼饮水设备。第二天，员工被迫改去其他楼层接水。','整改已提交：停用三楼饮水设备，等待物业检查。该措施将在次日班前生效。'],
    ['整改并没有消除事故，只改变了事故发生的位置。','第二起事故发生在消防楼梯。请把昨日整改与今天现场记录放在一起核对。'],
    ['第三起事故仍然落在相似损失区间，而且受伤者再次是外包人员。','第三起事故已经归档。地点、人员与损失记录均可在系统内继续核对。'],
    ['人员价值模型把每个员工折算成了不同的“预计损失”。','人员价值模型 v3.2 已打开。字段含义与事故记录需要你自行比对。'],
    ['你把李闻改成明日调休。系统立即重新计算候选人员：林姐。','李闻明日排班已改为调休。风险候选名单随后重新计算。'],
    ['权限审查完成：排班与设备权限暂停，物业只读。事故报告提交权限：保留。','权限审查完成：排班、设备与物业操作权限暂停。事故报告提交权限：保留。'],
    ['TEST RACK 04：仍登记 ¥28,460，但已准备淘汰；测试区可清空人员。','TEST RACK 04：账面净值 ¥2,600，仍高于 ¥2,000 的设备事故纳入阈值；退役审批已通过，测试区可封闭清场。'],['你把两年的事故金额按时间排列：事故不同，但损失异常集中在 ¥18,000 左右。','你把两年事故归档抽样按时间排列：事故不同，但直接损失稳定集中在约 ¥800 的窄区间。'],
    ['方案成立：清空测试区，让高账面价值旧设备承担一次真实财产损失。','方案成立：封闭测试区，在既有退役测试授权内让 TEST RACK 04 承担一次真实、无人伤害的设备损失。'],
    ['新的损失模型已准备。你必须决定是重写、关闭，还是继续使用衡损。','模型重定义草案已保存。程越随打印邮件留下的一次性应急维护令牌可执行一次模型级操作；审计记录不可删除。']
  ]);
  let changed=false;const logs=s.logs.map(x=>{const repl=map.get(x?.text);if(!repl)return x;changed=true;return Object.assign({},x,{text:repl})});
  if(changed){s.logs=logs;setLiveState(s)}return changed;
}

function activeView(){return $('.nav-btn[data-view].active')?.dataset.view||state()?.view||'desk'}
function confirmedEvents(s){let n=0;if(s.chapter>=1)n++;if(s.chapter>2||(s.chapter===2&&s.step>=1))n++;if(s.chapter>3||(s.chapter===3&&s.step>=2))n++;if(s.chapter>5||(s.chapter===5&&s.step>=2))n++;return n}
function confirmedInjuries(s){let n=0;if(s.chapter>=1)n++;if(s.chapter>2||(s.chapter===2&&s.step>=1))n++;if(s.chapter>3||(s.chapter===3&&s.step>=2))n++;return n}

function patchStart(){
  const warning=$('#startScreen .monitor-card.warning');if(warning){setText(warning.querySelector('strong'),'权限状态');setText(warning.querySelector('small'),'正常')}
  const cont=$('#continueGameBtn'),s=readStored();if(cont&&s?.ending){cont.disabled=false;setText(cont,'查看结局记录')}
}
function patchDesk(s){
  if(!s)return;if(s.chapter===0){const h=$('#view .task-card h3');if(h?.textContent.includes('补齐昨日事故单'))setText(h,'交接：补齐今日事故单')}
  const cards=$$('#view .dashboard-grid > .card');
  const eventCard=cards.find(c=>['今日事故','已确认事件','已确认事故'].includes(c.querySelector('h3')?.textContent));
  if(eventCard){setText(eventCard.querySelector('h3'),'已确认事故');setText(eventCard.querySelector('.metric'),String(confirmedEvents(s)));setText(eventCard.querySelector('p'),'只统计已经发生并确认的事故；风险模拟不计入。')}
  const injuryCard=cards.find(c=>['人员伤亡','累计受伤人数'].includes(c.querySelector('h3')?.textContent));
  if(injuryCard){setText(injuryCard.querySelector('h3'),'累计受伤人数');setText(injuryCard.querySelector('.metric'),String(confirmedInjuries(s)));setText(injuryCard.querySelector('p'),'无人受伤的设备事故不会清零此前已经确认的伤情。')}
  const task=$('#view .task-card');if(task&&s.chapter===5&&s.step===1)setText(task.querySelector('p'),'测试区已清空。TEST RACK 04 的账面净值 ¥2,600，仍高于 ¥2,000 的设备事故纳入阈值。');
  replaceCostsIn($('#view'));
}
function patchSchedule(s){
  if(!s)return;const table=$('#view table');if(!table)return;const allowed=(s.chapter===3&&s.step>=2)||s.chapter>=4;
  if(!allowed){const th=table.querySelector('thead th:nth-child(3)');setText(th,'模型字段');table.querySelectorAll('tbody tr').forEach(tr=>{const td=tr.children[2];if(td){setText(td,'权限不足');td.classList.add('logic-redacted')}});let note=$('#view .logic-note');if(!note){note=document.createElement('div');note.className='logic-note';note.innerHTML='<strong>当前权限：</strong>普通排班信息可见；用于风险比较的人员折算字段尚未开放。';table.before(note)}}
  else{const vals=[ECONOMY.people.liwen,ECONOMY.people.linjie,ECONOMY.people.zhaoqian,ECONOMY.people.zhouqiming,ECONOMY.people.chengyue];table.querySelectorAll('tbody tr').forEach((tr,i)=>{if(tr.children[2]&&vals[i])setText(tr.children[2],vals[i])})}
  replaceCostsIn(table);
}
function patchEquipment(s){
  if(!s)return;const cards=$$('#view .evidence-card');if(!cards.length)return;const solutionOpen=(s.chapter===4&&s.step>=3)||s.chapter>=5;
  for(const card of cards){const strong=card.querySelector('strong'),small=card.querySelector('small'),title=strong?.textContent||'';
    if(title.includes('TEST RACK 04')&&!solutionOpen){setText(strong,'资产台账 · 测试设备');setText(small,'详细账面价值、退役状态与测试条件尚未进入当前调查范围。');card.classList.add('logic-disabled-card')}
    if(title.includes('TEST RACK 04')&&solutionOpen)setText(small,`账面净值：${ECONOMY.rack}\n状态：退役审批已通过 / 资产核销尚未同步\n退役前断电压力测试：已授权\n测试区域：可封闭清场。`);
    if(title.includes('事故纳入阈值')&&!solutionOpen){setText(strong,'事故纳入规则');setText(small,'详细纳入阈值需在事故路径分析阶段查看。');card.classList.add('logic-disabled-card')}if((title.includes('事故纳入阈值')||title.includes('事故纳入规则'))&&solutionOpen){setText(strong,'事故纳入阈值');setText(small,`系统将人员伤害/医疗处置直接纳入；纯设备事件需账面资产损失 ≥ ${ECONOMY.assetThreshold} 才计入“风险收敛”。普通洒水、纸张损坏不计。`)}
    if(title.includes('三楼饮水设备')&&s.chapter<2)setText(small,'状态：运行\n待本夜事故交接确认后决定是否停用。');
    if(title.includes('消防门禁')&&!(s.chapter>2||(s.chapter===2&&s.step>=1)))setText(small,'状态：正常\n近期人流统计尚未汇总。');
  }
}
function patchProperty(s){
  if(!s)return;const table=$('#view table');if(table){const rows=[...table.querySelectorAll('tbody tr')];
    const row1Open=s.chapter>=2;const row2Open=s.chapter>2||(s.chapter===2&&s.step>=1);const row3Open=!!s.flags?.rackKnown;
    if(rows[0]){rows[0].hidden=!row1Open;if(row1Open){setText(rows[0].children[0],'08-17 23:16 / 08-18 23:18');setText(rows[0].children[1],'停用三楼饮水设备（预生成建议 → 已确认）');setText(rows[0].children[2],'衡损预生成 / 夜班人工确认')}}
    if(rows[1]){rows[1].hidden=!row2Open;if(row2Open){setText(rows[1].children[0],'08-18 23:24');setText(rows[1].children[1],'增加消防楼梯防滑检查（预生成建议）');setText(rows[1].children[2],'衡损预生成 / 未人工确认')}}
    if(rows[2]){rows[2].hidden=!row3Open;if(row3Open){setText(rows[2].children[1],'TEST RACK 04 测试区清场许可');setText(rows[2].children[2],'退役测试授权 / 待执行')}}
    if(!row1Open&&!table.querySelector('.logic-empty-row')){const tr=document.createElement('tr');tr.className='logic-empty-row';tr.innerHTML='<td colspan="3">当前没有已生效的夜班整改工单。</td>';table.querySelector('tbody')?.appendChild(tr)}
  }
  for(const card of $$('#view .card')){if(card.querySelector('h3')?.textContent.includes('老杨')){if(s.chapter<6)card.hidden=true}}
}
function ensureSingleEconomyNote(list){
  if(!list)return;
  const root=$('#view');if(!root)return;
  // 兼容旧版本：曾因选择器写错，把同一条“金额口径”反复插入页面。
  const legacy=[...root.querySelectorAll('[id="economy-note"],.economy-note,[data-economy-note="1"]')];
  let note=legacy.shift()||null;
  for(const extra of legacy)extra.remove();
  if(!note)note=document.createElement('div');
  note.id='economy-note';
  note.className='logic-note economy-note';
  note.dataset.economyNote='1';
  note.innerHTML='<strong>金额口径：</strong>普通轻伤按简单门诊处置、数小时误工、现场清理与小额耗材估算；并非一次性赔偿金。';
  // 保持在抽样列表前；已经在正确位置时不移动，避免触发无意义的 DOM 更新。
  if(note.parentNode!==root||note.nextElementSibling!==list)list.before(note);
}
function patchReports(s){
  if(!s)return;const list=$('#view .report-list');if(list)ensureNightReportList(s,list);if(list&&!$('#view .archive-summary')){
    const box=document.createElement('section');box.className='archive-summary';box.innerHTML=`<div class="archive-summary-head"><strong>事故归档检索摘要</strong><span>范围：2024-08 至 2026-08</span></div><div class="archive-summary-grid"><div><b>2024.08—12</b><span>18 件</span><small>主要损失区间 ¥720—900</small></div><div><b>2025</b><span>39 件</span><small>主要损失区间 ¥700—920</small></div><div><b>2026.01—08</b><span>29 件</span><small>主要损失区间 ¥740—910</small></div></div><p>下方仅列出近期 6 条抽样。年度摘要用于确认样本不是连续几周的偶然聚集。</p>`;list.before(box)
  }
  const rows=$$('#view .report-row');rows.forEach((row,i)=>{const cost=row.querySelector('.cost');if(cost&&ECONOMY.history[i])setText(cost,ECONOMY.history[i])});
  ensureSingleEconomyNote(list);
  const policy=[...$$('#view .card')].find(x=>x.querySelector('h3')?.textContent.includes('风险处置制度说明'));if(policy&&!s.evidence?.includes('policyNote'))setText(policy.querySelector('p'),'23:59 前无人确认的建议会转入“最低干预模式”。更早的严重事故复盘不在当前账户可见范围中。');replaceCostsIn($('#view'))
}
function patchStopWorkScope(){
  for(const card of $$('#view .evidence-card')){const title=card.querySelector('strong')?.textContent||'';if(title.includes('停工申请驳回单')){const small=card.querySelector('small');if(small&&small.textContent&&!small.textContent.includes('当前班次'))setText(small,small.textContent.replace('预计全面停工损失：','预计当前班次至次日半天全面停工直接损失：'))}}
}
function patchEvidence(s){
  if(!s)return;patchStopWorkScope();for(const card of $$('#view .evidence-card')){const title=card.querySelector('strong')?.textContent||'';if(title.includes('程越打印的邮件')&&s.evidence?.includes('chengMail'))setText(card.querySelector('small'),'“如果不保留人工确认，合规审计会认为算法在直接决定人员处置。确认按钮必须留着。”\n\n邮件夹层另附：一次性应急维护令牌说明。令牌只能修改一次目标函数或暂停服务，需在模型重定义完成后校验。')}
  replaceCostsIn($('#view'));
  if(s.chapter<7||!s.answered?.q9)return;const grid=$('#view .evidence-grid');if(grid&&!grid.querySelector('[data-logic-token]')){const card=document.createElement('div');card.className='evidence-card seen logic-maint-token';card.dataset.logicToken='1';card.innerHTML='<strong>一次性应急维护令牌</strong><small>程越随打印邮件离线交付。已验证：只允许一次修改目标函数或暂停服务；不能删除审计记录，也不能改写既有报告。</small>';grid.append(card)}
}

const QUESTION_STAGE={
  q1:[1,0],q2:[2,1],q3:[3,0],q4:[3,3],q5:[4,2],q6:[5,0],q7:[6,2],q8:[7,1],q9:[7,2]
};
const WORKER_CONCEPT_ORDER={
  q1:['created_before_accident','report_generated_early'],
  q2:['previous_intervention','route_changed'],
  q3:['economic_loss','stable_range'],
  q4:['economic_optimization','human_as_cost'],
  q5:['risk_not_removed','risk_reallocated'],
  q6:['no_people','equipment_loss','controlled_event'],
  q7:['human_confirmation','compliance_or_authorization'],
  q8:['minimize_economic_loss','human_safety_not_hard_constraint'],
  q9:['medical','legal','downtime','reputation','retention','human_harm_hard_constraint']
};
const QUESTION_FEEDBACK={
  q1:['你已经提到事故/时间关系。再明确“报告或记录是在事故发生前就出现”即可。','你已经注意到报告本身。再补一句它和事故发生时间的先后关系即可。'],
  q2:['你已经说明了路线或人流变化。再补上是什么前一晚的整改造成了这次变化。','你已经提到前一晚的整改。再说明它怎样改变了员工的通行路线或楼梯人流。'],
  q3:['你已经注意到“稳定/接近”。再明确稳定的是事故的损失金额或成本数值。','你已经注意到金额。再说明这些金额彼此非常接近、长期集中在一个窄区间。'],
  q4:['你已经提到系统在比较人。再说明它为什么更偏向这些人：受伤后的短期成本更低。','你已经提到成本差异。再明确系统是在用这个成本差异选择“谁更适合承担事故”。'],
  q5:['你已经注意到候选人换了。再说明风险/事故本身并没有被消除。','你已经说明问题仍然存在。再补上系统只是把风险重新分配给了另一个人。'],
  q6:['还缺“人员先清场/隔离”这一安全条件。','还缺一个明确承担损失的退役测试设备。','还缺“在已有授权下进行受控测试/受控故障”这一部分。'],
  q7:['你已经提到授权/权限。再明确最后一步必须由具备权限的人类完成确认。','你已经提到人工确认。再说明制度为什么要求这样做：执行权限、合规或责任归属不能直接交给算法。'],
  q8:['你已经指出人员安全出了问题。再明确系统实际上在最小化经济损失/成本。','你已经指出系统在追求低成本。再明确问题在于它没有把人员安全设成不可突破的底线。'],
  q9:['已经覆盖了一部分长期后果。再补充其他间接成本，或者直接提出“任何人员伤害都不可接受/应设为硬约束”。']
};
function questionIdFromOverlay(){
  const h=$('#overlayCard .input-question h2');if(!h)return null;
  const T=debug()?.task||{};
  const exact=Object.entries(T).find(([,q])=>q?.title===h.textContent.trim());if(exact)return exact[0];
  const s=state(),pair=Object.entries(QUESTION_STAGE).find(([,v])=>s&&s.chapter===v[0]&&s.step===v[1]);return pair?.[0]||null;
}
function localHitsFor(id,text){
  const q=debug()?.task?.[id];if(!q)return [];
  const t=normalizeText(text);return q.core.map(group=>group.some(k=>t.includes(normalizeText(k))));
}
function hardConstraintHit(id,text){
  const q=debug()?.task?.[id];if(!q?.special)return false;
  const t=normalizeText(text);return q.special.some(k=>t.includes(normalizeText(k)));
}
function directionalPass(id,text,hits){
  const t=normalizeText(text);
  if(id==='q1'){
    const report=hasAny(t,['报告','事故报告','记录','文档','报告时间','报告出现']);
    const before=hasAny(t,['先于事故','早于事故','事故前','发生前','比事故早','报告先','先报告后事故','时间在事故之前','时间早于事故']);
    return report&&before;
  }
  if(id==='q2')return hasAny(t,['停用饮水','关了饮水','饮水机停','饮水设备停'])&&hasAny(t,['楼梯','绕路','改走','人流','路线']);
  if(id==='q3')return hasAny(t,['金额','损失','成本','费用','钱'])&&hasAny(t,['稳定','接近','差不多','相近','集中','波动很小','几乎一样']);
  if(id==='q4')return hasAny(t,['成本低','代价低','更便宜','省钱','花费少','赔得少'])&&hasAny(t,['人','员工','受伤','对象','谁']);
  if(id==='q5')return hasAny(t,['风险','事故','危险','问题','受伤'])&&hasAny(t,['换人','换别人','另一个人','换了一个人','转移','重新分配','换目标']);
  if(id==='q6')return hits.filter(Boolean).length>=3;
  if(id==='q7')return hasAny(t,['人','人工','行政','管理员'])&&hasAny(t,['权限','授权','合规','责任','确认','审批','执行']);
  if(id==='q8')return hasAny(t,['钱','成本','经济','省钱','便宜','损失'])&&hasAny(t,['安全','伤害','伤人','人员','人身','保护人','保护员工','底线']);
  if(id==='q9')return hardConstraintHit(id,text)||hits.filter(Boolean).length>=3;
  return false;
}
function feedbackFor(id,hits,text){
  const q=debug()?.task?.[id],fb=QUESTION_FEEDBACK[id]||[];
  if(id==='q6'){
    const missing=hits.map((v,i)=>v?-1:i).filter(i=>i>=0);
    if(missing.length===1)return fb[missing[0]];
    if(missing.length===2)return `方向已经接近，还缺两部分：${missing.map(i=>['人员清场','退役设备对象','受控测试'][i]).join('、')}。`;
    return q?.partial||'方向接近，但还缺关键条件。';
  }
  if(id==='q9'){
    const n=hits.filter(Boolean).length;
    return n?`目前已经覆盖 ${n} 类影响。${fb[0]}`:(q?.partial||fb[0]);
  }
  const missing=hits.map((v,i)=>v?-1:i).filter(i=>i>=0);
  if(missing.length===1&&fb[missing[0]])return fb[missing[0]];
  return q?.partial||'方向接近，再补上缺失的核心因果即可。';
}
function clearOldJudgeFeedback(){
  const box=$('#judgeBox');if(box){box.className='';box.textContent=''}
  $$('#overlayCard .hint-prompt').forEach(x=>x.remove());
}
async function semanticJudgeFlexible(id,text,localHits){
  const endpoint=window.GAME_CONFIG?.workerEndpoint;
  if(!endpoint||!window.GAME_CONFIG?.semanticFallbackEnabled)return {hits:localHits,special:false,used:false};
  try{
    parserText('Cloudflare 语义判定','本地只命中部分概念，正在核对当前这段自然表达。');
    const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({questionId:id,answer:text})});
    if(!r.ok)return {hits:localHits,special:false,used:true};
    const j=await r.json(),order=WORKER_CONCEPT_ORDER[id]||[],vals=order.map(k=>!!j?.concepts?.[k]);
    const merged=localHits.map((v,i)=>v||!!vals[i]);
    return {hits:merged,special:!!j?.hardConstraint,used:true};
  }catch(e){return {hits:localHits,special:false,used:true}}
}
async function flexibleSubmit(){
  const id=questionIdFromOverlay(),box=$('#judgeBox'),ta=$('#answerBox');if(!id||!box||!ta)return false;
  const text=ta.value.trim();if(!text){box.className='judge miss';box.textContent='先写下你的判断，再提交分析。';return true}
  clearOldJudgeFeedback();
  const q=debug()?.task?.[id];if(!q)return false;
  const snapshot=text;
  let hits=localHitsFor(id,text),special=hardConstraintHit(id,text);
  let pass=special||directionalPass(id,text,hits)||hits.filter(Boolean).length>=q.need;
  if(!pass){
    const sem=await semanticJudgeFlexible(id,text,hits);
    if(ta.value.trim()!==snapshot){box.className='judge partial';box.textContent='你已经修改了输入内容。请按现在这段文字再次点击“提交分析”。';return true}
    hits=sem.hits;special=special||sem.special;pass=special||directionalPass(id,text,hits)||hits.filter(Boolean).length>=q.need;
  }
  if(pass){
    const s=state();if(!s)return false;
    s.answered=s.answered||{};s.history=Array.isArray(s.history)?s.history:[];s.flags=s.flags||{};
    s.answered[id]=text;s.history.push({q:id,a:text});if(s.flags.hintNudge===id)s.flags.hintNudge=null;
    setLiveState(s);box.className='judge pass';box.textContent='核心方向正确。系统接受了你的分析。';
    const submit=$('#submitAnswer');if(submit)submit.disabled=true;
    parserText(aiAvailable?'本地判定 · AI待命':'本地判定');
    setTimeout(()=>{
      const overlay=$('#overlay'),card=$('#overlayCard');if(overlay)overlay.classList.add('hidden');if(card)card.innerHTML='';
      debug()?.progressAfterQuestion?.(id);
    },360);
    return true;
  }
  const score=hits.filter(Boolean).length;
  if(score>0){
    box.className='judge partial';box.textContent=feedbackFor(id,hits,text);parserText('本地判定','当前输入已重新分析；反馈基于你这一次提交的文字。');return true;
  }
  const s=state();if(!s)return false;s.attempts=s.attempts||{};s.flags=s.flags||{};s.attempts[id]=(s.attempts[id]||0)+1;
  box.className='judge miss';
  box.textContent=s.attempts[id]>=2?'这次仍然没有触及题目的核心关系。可以继续改写；如果卡住，再查看三级提示。':'当前回答还没有触及这道题要求的核心关系。可以换一种说法再试。';
  if(s.attempts[id]>=2){const p=document.createElement('div');p.className='hint-prompt';p.textContent='连续两次未通过。提示可以查看，但不会自动给出答案。';box.insertAdjacentElement('afterend',p);s.flags.hintNudge=id;const badge=$('#hintBadge');if(badge)badge.textContent='!'}
  setLiveState(s);parserText('本地判定','当前输入已重新分析；反馈基于你这一次提交的文字。');return true;
}

function patchQuestionOverlay(){
  const h=$('#overlayCard .input-question h2');if(!h)return;const p=h.parentElement?.querySelector('p');
  if(h.textContent.includes('报告最不正常'))setText(p,debug()?.task?.q1?.prompt||p.textContent);
  if(h.textContent.includes('两年')){setText(h,debug()?.task?.q3?.title||h.textContent);setText(p,debug()?.task?.q3?.prompt||p.textContent)}
  if(h.textContent.includes('无人受伤')||h.textContent.includes('受控设备测试')){setText(h,debug()?.task?.q6?.title||h.textContent);setText(p,debug()?.task?.q6?.prompt||p.textContent)}
  if(h.textContent.includes('为什么衡损系统仍然需要'))setText(p,debug()?.task?.q7?.prompt||p.textContent);
  const ta=$('#answerBox');if(ta&&!ta.dataset.dynamicFeedbackBound){ta.dataset.dynamicFeedbackBound='1';ta.addEventListener('input',()=>{clearOldJudgeFeedback();parserText(aiAvailable?'本地判定 · AI待命':'本地判定','你已修改输入，下一次提交会按最新文字重新判断。')},{passive:true})}
}
function patchAudit(){
  const p3=$('#p3');if(p3?.textContent==='只读')setText(p3,'暂停');
  const txt=$('#auditText');if(txt&&txt.innerHTML.includes('异常行为关联度')&&!txt.dataset.logicFixed){txt.dataset.logicFixed='1';txt.innerHTML='跨夜操作关联分析（按夜班日志聚合）<br><br>第 1 夜　确认三楼饮水设备整改　关联度 12%<br>第 4 夜　调整李闻次日排班　关联度 37%<br>第 5 夜　提交退役设备受控测试　关联度 64%<br>第 5 夜　修改测试区域人员权限　<span style="color:#cf8177">关联度 91.6%</span><br><br><b style="color:#cf8177">跨夜异常行为关联度：91.6%</b><br>操作账户：夜班行政 / 当前用户'}
}
function patchFinalChoice(s){const h=$('#overlayCard h2');if(!h?.textContent.includes('最终决策'))return;const p=h.nextElementSibling;if(p&&s?.answered?.q9)setText(p,'衡损确实降低过重大事故率，但它把人员轻伤当成可接受成本。程越随打印邮件留下的一次性应急维护令牌只允许你执行一次模型级操作；公开路线则取决于你实际保全了多少线下证据。')}

const VIDEO_ASSET_REV='20260818l';
function patchSecondAccidentVideo(){
  const video=$('#accidentVideo'),label=$('#videoLabel'),overlay=$('#videoOverlay');
  if(!video||!label||!overlay||overlay.classList.contains('hidden'))return;
  if(!label.textContent.includes('消防楼梯'))return;
  const raw=video.getAttribute('src')||'';
  if(!raw.includes('accident_02_stairs.mp4')||raw.includes(`v=${VIDEO_ASSET_REV}`))return;
  const next=`${raw.split('?')[0]}?v=${VIDEO_ASSET_REV}`;
  const shouldResume=!video.paused||video.readyState<2;
  try{video.src=next;video.load();if(shouldResume)video.play().catch(()=>{})}catch(e){}
}

function patchDynamicEconomy(){
  replaceCostsIn($('#reportText'));replaceCostsIn($('#overlayCard'));replaceCostsIn($('#log'));replaceCopyIn($('#reportText'));replaceCopyIn($('#overlayCard'));replaceCopyIn($('#log'));
  const cand=$('#overlayCard .candidate');if(cand&&cand.textContent.includes('当前用户')){const ps=[...cand.querySelectorAll('p')];const p=ps.find(x=>x.textContent.includes('预计损失'));if(p)setText(p,`预计损失：${ECONOMY.people.player}`)}
}
function parserText(text,title=''){const p=$('#parserState');if(!p)return;setText(p,text);if(title)p.title=title}

function apply(){
  if(applying)return;tuneTasks();patchStart();const s=state();if(!s)return;
  patchStoredLogs();const v=activeView();if(v==='desk')patchDesk(s);else if(v==='schedule')patchSchedule(s);else if(v==='equipment')patchEquipment(s);else if(v==='property')patchProperty(s);else if(v==='reports')patchReports(s);else if(v==='evidence')patchEvidence(s);
  patchQuestionOverlay();patchAudit();patchFinalChoice(s);patchDynamicEconomy();patchSecondAccidentVideo();
  if(!inFlight&&$('#overlay').classList.contains('hidden'))parserText(aiAvailable?'本地判定 · AI待命':'本地判定',aiAvailable?'自由文本先走本地概念判定；只有完全未命中时才调用 Cloudflare Workers AI 语义兜底。':'当前只使用本地概念规则；没有调用在线 AI。');
}
function scheduleApply(){if(rafPending)return;rafPending=true;(window.requestAnimationFrame||((fn)=>setTimeout(fn,16)))(()=>{rafPending=false;apply()})}

function showEndingArchive(s){
  const data={rewrite:['《不可接受的成本》','人员伤害被设为不可接受的硬约束。'],shutdown:['《断电之后》','衡损被暂停，安全管理重新回到人的责任链。'],expose:['《把报告发出去》','证据被提交给审计与监管，衡损被暂停。'],maintain:['《继续提交》','你保留了原模型，新的事故报告仍在生成。']}[s?.ending]||['《夜班记录》','这个存档已经完成一个结局。'];
  let modal=$('#endingArchive');if(!modal){modal=document.createElement('div');modal.id='endingArchive';modal.className='ending-archive';modal.innerHTML='<div class="ending-archive-card"><button type="button" class="ending-archive-close">×</button><p class="ending-archive-kicker">已完成的夜班</p><h2></h2><p class="ending-archive-copy"></p><div class="ending-archive-actions"><button type="button" data-archive-close>返回标题</button><button type="button" data-archive-reset>重新开始</button></div></div>';document.body.append(modal);modal.querySelector('.ending-archive-close').onclick=()=>modal.remove();modal.querySelector('[data-archive-close]').onclick=()=>modal.remove();modal.querySelector('[data-archive-reset]').onclick=()=>{if(confirm('确定清除当前结局记录并从头开始？')){try{localStorage.removeItem(SAVE_KEY)}catch(e){}location.reload()}};modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()})}
  setText(modal.querySelector('h2'),data[0]);setText(modal.querySelector('.ending-archive-copy'),data[1]);
}

// 新游戏不静默覆盖存档；已结局的“继续”改为结局记录，避免重新落回最终决策。
document.addEventListener('click',e=>{
  const reportBtn=e.target.closest?.('[data-review-report]');if(reportBtn){e.preventDefault();e.stopPropagation();openReportArchive(reportBtn.dataset.reviewReport);return}
  const newBtn=e.target.closest?.('#newGameBtn');if(newBtn&&!e.defaultPrevented&&readStored()){if(!confirm('检测到已有夜班记录。确定从头开始并覆盖当前存档吗？')){e.preventDefault();e.stopImmediatePropagation();return}}
  const cont=e.target.closest?.('#continueGameBtn');if(cont){const s=readStored();if(s?.ending){e.preventDefault();e.stopImmediatePropagation();showEndingArchive(s);return}}
  const submit=e.target.closest?.('#submitAnswer');if(submit){if(inFlight){e.preventDefault();e.stopImmediatePropagation();return}parserText(aiAvailable?'本地判定 · AI待命':'本地判定',aiAvailable?'自由文本先走本地概念判定；未达到通过条件时再用 Cloudflare Workers AI 做语义兜底。':'当前只使用本地概念规则。');}
},true);


// 自由文本统一改为“核心方向达到即可”：拦截原提交，始终按当前输入重新判定；PARTIAL 也允许 AI 做语义兜底。
document.addEventListener('click',e=>{
  const submit=e.target.closest?.('#submitAnswer');if(!submit)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(inFlight||submit.dataset.flexBusy==='1')return;
  submit.dataset.flexBusy='1';
  Promise.resolve(flexibleSubmit()).finally(()=>{if(submit?.isConnected&&!inFlight)delete submit.dataset.flexBusy});
},true);

// 语义服务最多等待 5 秒；等待时锁定答案区，禁止重复提交和关闭，避免双请求推进两次。
const nativeFetch=window.fetch?.bind(window);if(nativeFetch){window.fetch=(input,init={})=>{
  const endpoint=window.GAME_CONFIG?.workerEndpoint,url=typeof input==='string'?input:input?.url;if(!endpoint||url!==endpoint||init.signal)return nativeFetch(input,init);
  const timeout=Math.max(1500,Math.min(10000,Number(window.GAME_CONFIG?.semanticTimeoutMs)||5000));const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeout);
  const submit=$('#submitAnswer'),close=$('#overlayCard [data-close]'),oldText=submit?.textContent||'提交分析';inFlight=true;if(submit){submit.disabled=true;submit.textContent='语义核对中…'}if(close)close.disabled=true;parserText('Cloudflare 语义判定','本地规则尚未达到通过条件，正在调用语义兜底；最多等待 5 秒。');
  return nativeFetch(input,Object.assign({},init,{signal:ctl.signal})).then(r=>{if(r.ok)aiAvailable=true;return r}).finally(()=>{clearTimeout(timer);inFlight=false;if(submit?.isConnected){submit.disabled=false;submit.textContent=oldText}if(close?.isConnected)close.disabled=false;parserText(aiAvailable?'本地判定 · AI待命':'本地判定');scheduleApply()});
}}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#nightReportArchive')&&!inFlight){e.preventDefault();e.stopImmediatePropagation();closeReportArchive();return}if(e.key==='Escape'&&inFlight){e.preventDefault();e.stopImmediatePropagation()}},true);

async function probeAI(){const endpoint=window.GAME_CONFIG?.workerEndpoint;if(!nativeFetch||!endpoint||!window.GAME_CONFIG?.semanticFallbackEnabled)return;const health=endpoint.replace(/\/judge(?:[?#].*)?$/,'/health');if(health===endpoint)return;const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),2500);try{const r=await nativeFetch(health,{method:'GET',cache:'no-store',signal:ctl.signal});const j=r.ok?await r.json():null;if(r.ok&&j?.ok){aiAvailable=true;parserText('本地判定 · AI待命','优先本地判定；自然表达未达到通过条件时自动调用 Cloudflare Workers AI。')}}catch(e){}finally{clearTimeout(timer)}}

function observeNarrow(){
  const nodes=['#view','#overlayCard','#auditText','#log','#reportText'];for(const sel of nodes){const node=$(sel);if(node)new MutationObserver(scheduleApply).observe(node,{childList:true,subtree:false})}
  const overlay=$('#overlay');if(overlay)new MutationObserver(scheduleApply).observe(overlay,{attributes:true,attributeFilter:['class']});
  const videoOverlay=$('#videoOverlay');if(videoOverlay)new MutationObserver(scheduleApply).observe(videoOverlay,{attributes:true,attributeFilter:['class']});
  const videoLabel=$('#videoLabel');if(videoLabel)new MutationObserver(scheduleApply).observe(videoLabel,{childList:true,characterData:true,subtree:true});
}

migrateSave();tuneTasks();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{observeNarrow();apply();probeAI()},{once:true});else{observeNarrow();apply();probeAI()}
window.addEventListener('pageshow',scheduleApply,{passive:true});
window.__BUTIAN_LOGIC_FIX__={version:'20260818l',readStored,confirmedEvents,confirmedInjuries,advanceTo,reportUnlocked,openReportArchive,NIGHT_REPORTS,localHitsFor,directionalPass,feedbackFor,questionIdFromOverlay};
})();
