this.CotizadorWidget=(function(){"use strict";const L="https://isaprespremium.cl",T="isaprespremium",U=["region","edad","sexo","ingreso","cargas","q","precioMin","precioMax","isapres","zonas","tipoPlan","coberturaH","coberturaA","orden","moneda","auto","email","plan","vista","nombre","rut","telefono"];function n(t,e,o){const i=t.dataset[o];if(i!=null&&i.trim())return i.trim();const a=e==null?void 0:e.dataset[o];if(a!=null&&a.trim())return a.trim()}function B(t){const e=((t==null?void 0:t.trim())||L).replace(/\/+$/,"");try{return new URL(e).origin+new URL(e).pathname.replace(/\/+$/,"")}catch{return L}}function k(t){if(!(t!=null&&t.trim()))return;const e=Number.parseInt(t,10);if(!(!Number.isFinite(e)||e<1))return e}function O(t,e){const o=n(t,e,"fullWidth")??n(t,e,"full-width");return o?o==="true"||o==="1":!0}function G(t,e,o){return o.agentKey??n(t,e,"agentKey")??n(t,e,"agent-key")??o.partner??n(t,e,"partner")??T}function N(t,e,o){if(o.mobileScroll!==void 0)return o.mobileScroll;const i=n(t,e,"mobileScroll")??n(t,e,"mobile-scroll");return!i||i==="auto"?"auto":i==="false"||i==="0"?!1:i==="true"||i==="1"}function W(t,e,o){const i=o.routing??n(t,e,"routing")??n(t,e,"cotizadorRouting");if(i==="premium"||i==="legacy")return i}function q(t,e){const o={};for(const a of U){const l=n(t,e,a);l&&(o[a]=l)}const i=n(t,e,"autoSearch");return(i==="true"||i==="1")&&(o.auto="1"),o}function F(t,e,o={}){const i=B(o.baseUrl??n(t,e,"baseUrl")??n(t,e,"cotizadorUrl")),a=G(t,e,o),l=o.partner??a,p=W(t,e,o),y=o.minHeight??k(n(t,e,"minHeight")),v=o.title??n(t,e,"title")??"Cotizador de planes de salud",S=o.fullWidth??O(t,e),x=N(t,e,o),w={...q(t,e),...o.query};return{baseUrl:i,agentKey:a,partner:l,routing:p,minHeight:y,title:v,fullWidth:S,mobileScroll:x,query:w}}function K(t){const e=t.routing!=="legacy",o=e?new URL("/cotizador",`${t.baseUrl}/`):new URL(t.partner?`/${encodeURIComponent(t.partner)}`:"/",`${t.baseUrl}/`);e&&o.searchParams.set("agent",t.agentKey),o.searchParams.set("embed","1");for(const[i,a]of Object.entries(t.query))o.searchParams.set(i,a);return o.toString()}function A(){const t=document.currentScript;if(t instanceof HTMLScriptElement)return t;const e=document.querySelectorAll('script[src*="cotizador-widget"]');return e[e.length-1]??null}const V="[data-cotizador-widget]",$="cotizador-premium",Y="cotizador-premium:resize",X="cotizador-premium:ready",Z="cotizador-premium:exit-navigate",j="cotizador-premium:wheel",Q="cotizador-premium:request-resize",c="cv-widget",f="cv-widget__iframe",m="cv-widget__skeleton",d="cv-widget__exit-overlay",h="cv-widget--mobile-scroll",J=72,tt=12,et=96,it=800,ot=12;function g(t){return t===!1||t==="auto"}function I(t){return t==="auto"?"auto":t===!1?"false":"true"}const rt=new Set([$,"cotizador-virtual"]);function nt(){return window.matchMedia("(max-width: 768px)").matches}function at(){if(document.getElementById("cv-widget-styles"))return;const t=document.createElement("style");t.id="cv-widget-styles",t.textContent=`
    .${c} {
      position: relative;
      width: 100%;
      max-width: none;
      overflow: visible;
      background: transparent;
      touch-action: pan-y;
    }
    .${c}[data-full-width="true"] {
      width: 100vw;
      max-width: 100vw;
      margin-left: calc(50% - 50vw);
      margin-right: calc(50% - 50vw);
    }
    .${c}[data-mobile-scroll="false"],
    .${c}[data-mobile-scroll="auto"] {
      overflow: visible !important;
      max-height: none !important;
    }
    .${c}[data-mobile-scroll="false"] .${f},
    .${c}[data-mobile-scroll="auto"] .${f} {
      overflow: visible;
      display: block;
    }
    .${c}.${h} {
      max-height: ${J}vh;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior-y: auto;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-y;
    }
    .${f} {
      display: block;
      width: 100%;
      max-width: none;
      border: 0;
      background: transparent;
      overflow: visible;
      opacity: 0;
      transition: opacity 0.25s ease, height 0.12s ease;
    }
    .${f}[data-ready="true"] {
      opacity: 1;
    }
    .${m} {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 24px;
      color: #64748b;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }
    .${m}[data-hidden="true"] {
      opacity: 0;
    }
    .${m}__pulse {
      width: min(100%, 420px);
      height: 12px;
      border-radius: 999px;
      background: linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%);
      background-size: 200% 100%;
      animation: cv-widget-pulse 1.2s ease-in-out infinite;
      margin-bottom: 12px;
    }
    @keyframes cv-widget-pulse {
      0% { background-position: 100% 0; }
      100% { background-position: -100% 0; }
    }
    .${d} {
      position: absolute;
      inset: 0;
      z-index: 20;
      display: grid;
      place-items: center;
      padding: 24px;
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(6px);
      color: #0f172a;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      text-align: center;
    }
    .${d}__spinner {
      width: 40px;
      height: 40px;
      margin: 0 auto 16px;
      border-radius: 999px;
      border: 2px solid rgba(15, 23, 42, 0.12);
      border-top-color: #ff6600;
      animation: cv-widget-spin 0.8s linear infinite;
    }
    .${d}__title {
      margin: 0 0 6px;
      font-size: 15px;
      font-weight: 700;
    }
    .${d}__subtitle {
      margin: 0;
      font-size: 13px;
      color: #64748b;
    }
    @keyframes cv-widget-spin {
      to { transform: rotate(360deg); }
    }
  `,document.head.appendChild(t)}function st(t,e){if(at(),t.dataset.cvMounted==="true")return{destroy:()=>{}};t.dataset.cvMounted="true",t.classList.add(c),e.fullWidth&&(t.dataset.fullWidth="true"),e.minHeight!==void 0&&t.style.setProperty("--cv-widget-min-height",`${e.minHeight}px`),t.dataset.mobileScroll=I(e.mobileScroll);const o=document.createElement("div");o.className=m,o.setAttribute("aria-hidden","true"),o.innerHTML=`
    <div style="width:100%;max-width:420px;text-align:center">
      <div class="${m}__pulse"></div>
      <div class="${m}__pulse" style="width:70%;margin-inline:auto"></div>
      <p style="margin:16px 0 0">Cargando cotizador…</p>
    </div>
  `;const i=document.createElement("iframe");i.className=f,i.title=e.title,i.loading="lazy",i.referrerPolicy="strict-origin-when-cross-origin",i.allow="clipboard-write",i.setAttribute("scrolling",g(e.mobileScroll)?"auto":"no"),i.style.overflow="visible",i.src=K(e);const a=e.minHeight??120;i.style.height=`${a}px`,t.style.height=`${a}px`,t.replaceChildren(o,i);let l=null,p=null;const y=()=>{if(g(e.mobileScroll)){t.classList.remove(h),t.dataset.mobileScroll=I(e.mobileScroll),t.style.maxHeight="none",t.style.overflow="visible",t.style.removeProperty("overflow-y");return}const s=nt();t.classList.toggle(h,s),t.dataset.mobileScroll=s?"true":"false",s?(t.style.removeProperty("max-height"),t.style.overflowY=""):(t.style.maxHeight="none",t.style.overflow="visible")},v=()=>{y()},S=()=>{l||(l=document.createElement("div"),l.className=d,l.setAttribute("role","status"),l.setAttribute("aria-live","polite"),l.setAttribute("aria-busy","true"),l.innerHTML=`
      <div style="max-width:420px">
        <div class="${d}__spinner"></div>
        <p class="${d}__title">Buscando el mejor plan para ti…</p>
        <p class="${d}__subtitle">Cargando el cotizador completo</p>
      </div>
    `,t.appendChild(l))},x=s=>{if(!Number.isFinite(s)||s<=0)return;const r=e.minHeight??1,E=g(e.mobileScroll)?et:tt,b=Math.max(r,Math.ceil(s)+E);i.style.height=`${b}px`,i.style.minHeight=`${b}px`,i.style.maxHeight="none",i.setAttribute("height",String(b)),t.style.height=`${b}px`,t.style.minHeight=`${b}px`,t.style.maxHeight="none",y()},w=()=>{const s=i.contentWindow;s&&s.postMessage({type:Q,source:$},"*")};let u=null,R=0;const C=()=>{u===null&&(u=window.setInterval(()=>{R+=1,w(),R>=ot&&u!==null&&(window.clearInterval(u),u=null)},it))},D=()=>{u!==null&&(window.clearInterval(u),u=null)},M=()=>{i.dataset.ready="true",o.dataset.hidden="true",window.setTimeout(()=>o.remove(),220)},ct=(s,r)=>{const E={top:s,left:r,behavior:"auto"};if(g(e.mobileScroll)){window.scrollBy(E);return}if(t.classList.contains(h)){t.scrollBy(E);return}window.scrollBy(E)},P=s=>{if(s.source!==i.contentWindow)return;const r=s.data;if(!(!(r!=null&&r.source)||!rt.has(r.source))){if(r.type===j){if(typeof r.deltaY!="number"||typeof r.deltaX!="number")return;ct(r.deltaY,r.deltaX);return}if(r.type===Z){S();return}if(r.type===X){M();return}if(r.type===Y&&typeof r.height=="number"){if(!Number.isFinite(r.height)||r.height<=0)return;x(r.height),D(),i.dataset.ready!=="true"&&M()}}};return window.addEventListener("message",P),y(),C(),!g(e.mobileScroll)&&typeof window.matchMedia=="function"&&(p=window.matchMedia("(max-width: 768px)"),p.addEventListener("change",v)),i.addEventListener("load",()=>{C(),w(),i.dataset.ready!=="true"&&M()}),{destroy:()=>{D(),window.removeEventListener("message",P),p==null||p.removeEventListener("change",v),t.replaceChildren(),t.classList.remove(c,h),delete t.dataset.cvMounted,delete t.dataset.fullWidth,delete t.dataset.mobileScroll,t.style.removeProperty("--cv-widget-min-height"),t.style.removeProperty("height"),t.style.removeProperty("max-height"),t.style.removeProperty("overflow")}}}function H(t,e,o){const i=F(t,e,o);return st(t,i)}function _(t=V){const e=A(),o=document.querySelectorAll(t);return Array.from(o).map(i=>H(i,e))}function lt(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>_(),{once:!0}):_()}const z={init:_,mount:(t,e)=>H(t,A(),e)};return window.CotizadorWidget=z,lt(),z})();
//# sourceMappingURL=cotizador-widget.js.map
