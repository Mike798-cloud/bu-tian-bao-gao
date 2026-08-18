(()=>{
'use strict';
if(window.__BUTIAN_PAYWALL_RUNTIME_K__)return;
window.__BUTIAN_PAYWALL_RUNTIME_K__=true;
const SAVE_KEY='accident-report-night-v1';
const CONFIG={qrCode:'paycode.png',price:'1元',title:'支持《今晚不要填写事故报告》',studio:'abc studio'};
const Paywall={
 STORAGE_KEY:'_butian_report_support',SESSION_KEY:'_butian_report_support_session',COOKIE_KEY:'_butian_report_support_cookie',AUTO_KEY:'_butian_report_support_auto_v2',
 _lsGet(k){try{return localStorage.getItem(k)||''}catch(e){return''}},_lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}},
 _ssGet(k){try{return sessionStorage.getItem(k)||''}catch(e){return''}},_ssSet(k,v){try{sessionStorage.setItem(k,v)}catch(e){}},
 _setCookie(name,value,days){try{const d=new Date(Date.now()+days*86400000);document.cookie=`${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Lax`}catch(e){}},
 _getCookie(name){try{const p=(document.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='));return p?p.slice(name.length+1):''}catch(e){return''}},
 hasPaid(){return !!(this._lsGet(this.STORAGE_KEY)||this._ssGet(this.SESSION_KEY)||this._getCookie(this.COOKIE_KEY))},
 markPaid(){const token=btoa(`${Date.now()}_${Math.random().toString(36).slice(2,10)}_abc_studio`);this._lsSet(this.STORAGE_KEY,token);this._ssSet(this.SESSION_KEY,token);this._setCookie(this.COOKIE_KEY,token,365)},
 autoShown(){return !!this._lsGet(this.AUTO_KEY)},markAutoShown(){this._lsSet(this.AUTO_KEY,String(Date.now()))},
 toast(text='感谢你的支持。今晚的报告仍然可以继续填写。'){let t=document.createElement('div');t.className='paywall-toast';t.textContent=text;document.body.append(t);requestAnimationFrame(()=>t.classList.add('show'));setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),220)},2600)},
 show({automatic=false}={}){if(this.hasPaid()){this.toast('已经记录过你的支持，谢谢。');return}if(automatic){if(this.autoShown())return;this.markAutoShown()}let o=document.getElementById('paywall-overlay');if(!o)o=this._create();o.hidden=false;o.setAttribute('aria-hidden','false');requestAnimationFrame(()=>o.classList.add('paywall-show'));o.querySelector('.paywall-close')?.focus({preventScroll:true})},
 hide(){const o=document.getElementById('paywall-overlay');if(!o)return;o.classList.remove('paywall-show');o.classList.add('paywall-closing');setTimeout(()=>{o.hidden=true;o.setAttribute('aria-hidden','true');o.classList.remove('paywall-closing')},180)},
 support(){this.markPaid();this.hide();this.toast('感谢你的支持。它不会影响任何谜题、提示或结局。')},
 _create(){const o=document.createElement('div');o.id='paywall-overlay';o.className='paywall-overlay';o.hidden=true;o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-label','自愿支持作者');o.setAttribute('aria-hidden','true');o.innerHTML=`<div class="paywall-card"><button type="button" class="paywall-close" aria-label="关闭">×</button><div class="paywall-card-inner"><header class="paywall-header"><div class="paywall-title">${CONFIG.title}</div><div class="paywall-subtitle">${CONFIG.price} 自愿支持 · 不影响通关</div></header><div class="paywall-body"><div class="paywall-qr-wrapper"><img src="${CONFIG.qrCode}" alt="1元自愿支持收款码" class="paywall-qr-img"></div><div class="paywall-qr-tip">扫码后可点击“已完成支持”留下本机记录</div><div class="paywall-message"><p>这部作品从事故回放、报告文字到每条因果链都反复调整过。</p><p>如果今晚的调查让你愿意多停留几分钟，可以自愿支持 <strong>${CONFIG.price}</strong>。不支持也不会影响提示、存档、流程或任何结局。</p></div></div><footer class="paywall-footer"><div class="paywall-btns"><button type="button" class="paywall-btn paywall-btn-support">已完成支持</button><button type="button" class="paywall-btn paywall-btn-later">下次一定</button></div><div class="paywall-studio">${CONFIG.studio}</div></footer></div></div>`;document.body.append(o);o.querySelector('.paywall-close').onclick=()=>this.hide();o.querySelector('.paywall-btn-later').onclick=()=>this.hide();o.querySelector('.paywall-btn-support').onclick=()=>this.support();o.addEventListener('click',e=>{if(e.target===o)this.hide()});return o}
};
window.Paywall=Paywall;
function safeState(){try{return window.__GAME_DEBUG__?.getState?.()||JSON.parse(localStorage.getItem(SAVE_KEY)||'null')}catch(e){return null}}
function canAuto(){const s=safeState();const game=document.getElementById('game'),overlay=document.getElementById('overlay'),video=document.getElementById('videoOverlay'),report=document.getElementById('reportOverlay'),archive=document.getElementById('nightReportArchive');return !!s?.answered?.q1&&game&&!game.classList.contains('hidden')&&overlay?.classList.contains('hidden')&&video?.classList.contains('hidden')&&report?.classList.contains('hidden')&&!archive}
let autoTimer=0,observer=null;
function scheduleAuto(){if(Paywall.hasPaid()||Paywall.autoShown()||autoTimer)return;if(!canAuto())return;autoTimer=setTimeout(()=>{autoTimer=0;if(canAuto())Paywall.show({automatic:true})},900)}
function init(){
 const btn=document.getElementById('supportBtn');
 if(btn&&!btn.dataset.paywallBound){btn.dataset.paywallBound='1';btn.addEventListener('click',()=>Paywall.show())}
 const targets=[
   [document.getElementById('view'),{childList:true,subtree:false}],
   [document.getElementById('overlay'),{attributes:true,attributeFilter:['class']}],
   [document.getElementById('videoOverlay'),{attributes:true,attributeFilter:['class']}],
   [document.getElementById('reportOverlay'),{attributes:true,attributeFilter:['class']}]
 ].filter(x=>x[0]);
 observer?.disconnect?.();
 observer=new MutationObserver(scheduleAuto);
 targets.forEach(([node,opt])=>observer.observe(node,opt));
 if(!document.documentElement.dataset.butianPaywallKeyBound){
   document.documentElement.dataset.butianPaywallKeyBound='1';
   document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.getElementById('paywall-overlay')?.hidden){e.preventDefault();Paywall.hide()}},true)
 }
 window.addEventListener('pageshow',scheduleAuto,{passive:true,once:true});
 scheduleAuto()
}
window.__BUTIAN_PAYWALL_DEBUG__={Paywall,canAuto,scheduleAuto};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
let autoProbeCount=0;
const autoProbe=setInterval(()=>{
  if(Paywall.hasPaid()||Paywall.autoShown()||autoProbeCount++>40){clearInterval(autoProbe);return}
  scheduleAuto()
},500);
})();
