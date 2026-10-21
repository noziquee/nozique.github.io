import { CAT, P } from '../data.js';
import { card, esc, cats } from '../helpers.js';
import { STATE } from '../state.js';
export function work(){const n=k=>k=='all'?P.length:P.filter(p=>p.c==k).length;
return`<section class="sec w ph"><h2>Work</h2><p class="lab" id="cnt" aria-live="polite" style="margin:-16px 0 24px"></p><div class="fl">${['all',...cats().map(([k])=>k)].map(k=>`<button type="button" data-k="${k}" class="${k==STATE.flt?'on':''}" aria-pressed="${k==STATE.flt}">${esc(k=='all'?'All':CAT[k])}<small>${n(k)}</small></button>`).join('')}</div>
<div class="mas">${P.map(p=>card(p,'w',`aspect-ratio:${p.r}`)).join('')}</div><p class="emp" hidden>No projects in this category yet. <button type="button" class="tob" data-k="all">Show all work</button></p></section>`}
