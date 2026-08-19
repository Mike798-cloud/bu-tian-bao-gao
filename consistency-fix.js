(()=>{
'use strict';
if(window.__BUTIAN_CONSISTENCY_FIX_20260819__)return;
window.__BUTIAN_CONSISTENCY_FIX_20260819__=true;
const MALE_NAME='赵诚';
let scheduled=false;
function patchArchive(){
  const api=window.__BUTIAN_LOGIC_FIX__;
  const reports=api?.NIGHT_REPORTS;
  if(!reports)return;
  if(reports.r1){
    const cost=reports.r1.lines.find(x=>String(x).startsWith('预计损失：'))||'预计损失：¥780';
    reports.r1.lines=['事故编号：2026-0818-017','发生时间：2026-08-18 10:17','发生地点：三楼茶水间','事故类型：饮水设备周边湿滑 / 滑倒','受伤人员：李闻','伤情等级：轻微扭伤 / 擦伤',cost,'','报告创建时间：2026-08-17 23:11'];
  }
  if(reports.r2){
    reports.r2.lines=reports.r2.lines.map(x=>String(x).replaceAll('赵倩',MALE_NAME));
  }
}
function patchReportText(){
  const pre=document.querySelector('#reportText');
  if(!pre)return;
  let t=pre.textContent||'';
  if(t.includes('2026-0818-017')||t.includes('三楼茶水间')){
    t=t.replaceAll('事故类型：热水设备异常 / 轻度烫伤','事故类型：饮水设备周边湿滑 / 滑倒');
    t=t.replace(/伤情等级：轻伤(?=\n预计损失：)/g,'伤情等级：轻微扭伤 / 擦伤');
  }
  t=t.replaceAll('赵倩',MALE_NAME);
  if(pre.textContent!==t)pre.textContent=t;
}
function replaceName(root){
  if(!root)return;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[];while(w.nextNode())nodes.push(w.currentNode);
  for(const n of nodes){
    const next=(n.nodeValue||'').replaceAll('赵倩',MALE_NAME);
    if(next!==n.nodeValue)n.nodeValue=next;
  }
}
function patch(){
  patchArchive();
  patchReportText();
  replaceName(document.querySelector('#view'));
  replaceName(document.querySelector('#overlayCard'));
  replaceName(document.querySelector('#log'));
  replaceName(document.querySelector('#memo'));
  replaceName(document.querySelector('#nightReportArchive'));
}
function schedule(){
  if(scheduled)return;scheduled=true;
  (window.requestAnimationFrame||setTimeout)(()=>{scheduled=false;patch()},16);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patch,{once:true});else patch();
new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
window.addEventListener('pageshow',schedule,{passive:true});
})();
