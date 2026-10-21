import { CAT, P } from '../data.js';
import { art, an, esc, pic, card } from '../helpers.js';
import { STATE } from '../state.js';
import { work } from '../pages/work.js';
export function proj(id){const i=P.findIndex(x=>x.id==id);if(i<0)return work();const p=P[i],nx=P[(i+1)%P.length],pv=P[(i+P.length-1)%P.length];
const gl=p.gallery&&p.gallery.length?p.gallery.map(g=>({c:g.caption||'',h:`<img src="${esc(g.src)}" alt="${esc(g.alt||g.caption||p.t)}" loading="lazy" decoding="async">`})):(p.img?[{c:'Final',h:pic(p)}]:[['Final render (placeholder)',''],['Wireframe (placeholder)','w'],['Detail crop (placeholder)','dm'],['Alternate angle (placeholder)','']].map((x,k)=>({c:x[0],h:art(p,x[1],k)})));STATE.LB=gl;
const lbc=(g,k,s)=>`<figure class="card" data-lb="${k}" data-cur="Zoom" style="${s}" tabindex="0" role="button" aria-label="Open image: ${esc(g.c||p.t)}"><div class="im">${g.h}</div><div class="ov"><span class="lab">${esc(g.c)}</span></div></figure>`;
return`<section class="w ph"><a class="lab" href="#/work">Back to all work</a><h1 class="pt">${esc(p.t)}</h1>
<div class="hc">${lbc(gl[0],0,'aspect-ratio:16/9')}${gl.length>1?'<button type="button" class="ca" data-d="-1" aria-label="Previous image">&#8249;</button><button type="button" class="ca r" data-d="1" aria-label="Next image">&#8250;</button><span class="cn lab" aria-live="polite"></span>':''}</div>
<div class="pm"><div><h3 style="font-size:28px;margin-bottom:16px">About this project</h3><p>${esc(p.d)}</p>${/^\[/.test(p.t)?'<span class="ph-note">Placeholder project: replace with your real artwork and details</span>':''}</div>
<dl class="dl"><div><dt>Category</dt><dd>${esc(CAT[p.c])}</dd></div><div><dt>Year</dt><dd>${p.y}</dd></div>${p.tl||p.ph?`<div><dt>Tools</dt><dd>${esc(p.tl)}</dd></div>`:''}${p.role||p.ph?`<div><dt>Role</dt><dd>${esc(p.role||'[Your role]')}</dd></div>`:''}</dl></div>
${p.ph?`<h3 style="font-size:32px;margin-bottom:16px">Process</h3><div class="ps" style="margin-bottom:64px">${[['Sketch','w'],['Block-out','g'],['Detail','dm'],['Final','']].map(([n,m],k)=>`<div><div>${art(p,m,k+2)}</div><b>${k+1}. ${n}</b></div>`).join('')}</div>`:''}
${an(p)&&(p.ph||p.video)?`<h3 style="font-size:32px;margin-bottom:16px">Animation</h3><div class="vb">${p.video?`<video src="${esc(p.video)}" controls playsinline preload="metadata" style="position:absolute;inset:0;width:100%;height:100%;background:#000"></video>`:`${art(p,'',3,1)}<span class="tg">Play</span><span class="lab">[Placeholder: add a video path to this project]</span>`}</div>`:''}
${p.ph?`<h3 style="font-size:32px;margin-bottom:16px">Wireframe to final</h3>
<div class="cmp"><div class="u">${art(p)}</div><div class="t">${art(p,'w',1)}</div><i></i><input type="range" min="0" max="100" value="50" aria-label="Compare wireframe and final (placeholder art)"><span class="lab" style="left:12px">Wireframe</span><span class="lab" style="right:12px">Final</span></div>`:''}
${gl.length>1?`<h3 style="font-size:32px;margin:64px 0 0">Gallery</h3><div class="gl">${gl.slice(1).map((g,k)=>lbc(g,k+1,'')).join('')}</div>`:''}</section>
${P.length>1?`<div class="pn"><a href="#/work/${esc(pv.id)}"><span class="lab">Previous project</span><h3>${esc(pv.t)}</h3></a><a href="#/work/${esc(nx.id)}"><span class="lab">Next project</span><h3>${esc(nx.t)}</h3></a></div>`:''}`}
