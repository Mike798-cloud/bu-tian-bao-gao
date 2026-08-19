(()=>{
'use strict';
if(window.__BUTIAN_DATE_SHIFT_7D__)return;

const DATE_MAP=new Map([
  ['2026-0821','2026-0814'],
  ['2026-0820','2026-0813'],
  ['2026-0819','2026-0812'],
  ['2026-0818','2026-0811'],
  ['2026-0817','2026-0810'],
  ['2026-08-21','2026-08-14'],
  ['2026-08-20','2026-08-13'],
  ['2026-08-19','2026-08-12'],
  ['2026-08-18','2026-08-11'],
  ['2026-08-17','2026-08-10']
]);

// Every CCTV clip keeps its existing time-of-day and motion; only the calendar date is covered.
// r5/r6 belong to the same 2026-08-21 night in the current sequence, so both become 2026-08-14.
const VIDEO_DATE={
  'accident_01_pantry.mp4':'2026-08-11',
  'accident_02_stairs.mp4':'2026-08-12',
  'accident_03_warehouse.mp4':'2026-08-13',
  'accident_04_liwen.mp4':'2026-08-14',
  'accident_05_machine.mp4':'2026-08-14',
  'accident_06_unknown.mp4':'2026-08-14'
};

let scheduled=false;
const $=s=>document.querySelector(s);

function shiftText(value=''){
  let out=String(value);
  for(const [from,to] of DATE_MAP)out=out.split(from).join(to);
  return out;
}

function shiftObjectStrings(value){
  if(typeof value==='string')return shiftText(value);
  if(Array.isArray(value)){
    for(let i=0;i<value.length;i++)value[i]=shiftObjectStrings(value[i]);
    return value;
  }
  if(value&&typeof value==='object'){
    for(const key of Object.keys(value))value[key]=shiftObjectStrings(value[key]);
  }
  return value;
}

function patchNightReports(){
  const reports=window.__BUTIAN_LOGIC_FIX__?.NIGHT_REPORTS;
  if(!reports)return;
  // NIGHT_REPORTS is exposed by logic-fix.js as the live object used by the archive/list UI.
  // Mutate it once so new report cards and repeat-view reports are born with the shifted dates.
  if(reports.__shifted7Days)return;
  for(const id of ['r1','r2','r3','r4','r5']){
    const r=reports[id];
    if(!r)continue;
    if(typeof r.title==='string')r.title=shiftText(r.title);
    if(typeof r.date==='string')r.date=shiftText(r.date);
    if(Array.isArray(r.lines))r.lines=r.lines.map(shiftText);
  }
  Object.defineProperty(reports,'__shifted7Days',{value:true,enumerable:false,configurable:false});
}

function patchVisibleDates(root=document){
  if(!root)return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[];
  while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){
    // Do not rewrite the synthetic date we place over the CCTV itself.
    if(node.parentElement?.id==='cctvShiftedDate')continue;
    const next=shiftText(node.nodeValue||'');
    if(next!==node.nodeValue)node.nodeValue=next;
  }
}

function videoFileName(){
  const video=$('#accidentVideo');
  if(!video)return '';
  const raw=video.currentSrc||video.getAttribute('src')||video.src||'';
  try{return decodeURIComponent(raw.split('/').pop().split('?')[0])}catch(e){return raw.split('/').pop().split('?')[0]}
}

function ensureVideoDateOverlay(){
  const video=$('#accidentVideo');
  const shell=video?.closest('.video-shell');
  if(!video||!shell)return null;
  let stamp=$('#cctvShiftedDate');
  if(!stamp){
    if(getComputedStyle(shell).position==='static')shell.style.position='relative';
    stamp=document.createElement('div');
    stamp.id='cctvShiftedDate';
    stamp.setAttribute('aria-hidden','true');
    stamp.style.cssText=[
      'position:absolute','z-index:8','display:none','pointer-events:none',
      'box-sizing:border-box','white-space:nowrap','overflow:hidden',
      'background:rgba(7,9,9,.96)','color:#eef1ef',
      'font-family:Consolas,Menlo,Monaco,"Courier New",monospace',
      'font-weight:500','line-height:1','letter-spacing:.01em',
      'text-shadow:0 1px 1px rgba(0,0,0,.8)'
    ].join(';');
    shell.appendChild(stamp);
  }
  return stamp;
}

function positionVideoDate(){
  const video=$('#accidentVideo');
  const shell=video?.closest('.video-shell');
  const stamp=ensureVideoDateOverlay();
  if(!video||!shell||!stamp)return;
  const date=VIDEO_DATE[videoFileName()];
  if(!date){stamp.style.display='none';return}
  const vr=video.getBoundingClientRect();
  const sr=shell.getBoundingClientRect();
  if(!vr.width||!vr.height){stamp.style.display='none';return}

  // Current CCTV assets place the date at the upper-left. Cover only the date field,
  // deliberately leaving the original HH:MM:SS visible so no time-of-day is altered.
  const left=vr.left-sr.left+Math.max(5,vr.width*.008);
  const top=vr.top-sr.top+Math.max(3,vr.height*.006);
  const width=Math.max(94,Math.min(190,vr.width*.145));
  const height=Math.max(22,Math.min(58,vr.height*.082));
  const font=Math.max(12,Math.min(30,vr.height*.043));
  stamp.style.left=`${left}px`;
  stamp.style.top=`${top}px`;
  stamp.style.width=`${width}px`;
  stamp.style.height=`${height}px`;
  stamp.style.padding=`${Math.max(3,height*.19)}px ${Math.max(5,width*.035)}px 0`;
  stamp.style.fontSize=`${font}px`;
  stamp.textContent=date;
  stamp.style.display='block';
}

function patch(){
  patchNightReports();
  // app.js owns the live typewriter report in a closure, so update that rendered text as it is typed.
  patchVisibleDates($('#reportOverlay'));
  // Also covers report archive/list created by logic-fix.js and any current-screen matching date text.
  patchVisibleDates($('#nightReportArchive'));
  patchVisibleDates($('#view'));
  positionVideoDate();
}

function schedule(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;patch()});
}

function bindVideo(){
  const video=$('#accidentVideo');
  if(!video)return;
  for(const ev of ['loadstart','loadedmetadata','loadeddata','play','timeupdate','seeked'])video.addEventListener(ev,schedule,{passive:true});
  new MutationObserver(schedule).observe(video,{attributes:true,attributeFilter:['src']});
  window.addEventListener('resize',schedule,{passive:true});
}

function start(){
  patchNightReports();
  bindVideo();
  patch();
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  window.addEventListener('pageshow',schedule,{passive:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.__BUTIAN_DATE_SHIFT_7D__={shiftText,VIDEO_DATE,DATE_MAP};
})();
