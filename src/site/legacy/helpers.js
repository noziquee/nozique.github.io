import { CAT, P } from './data.js';
export const $=s=>document.querySelector(s);
export const M=$('#m');
export const HD=$('.hd');
export const WP=$('.wp');
export const rnd=s=>()=>(s=(s*9301+49297)%233280)/233280;
export function art(p,m='',v=0,wd=0){const r=rnd(p.s*13+v*7+1),R=(a,b)=>a+r()*(b-a)|0,c=p.c,X=wd?-200:0,Wd=wd?800:400;let g='';
if(c=='illustration'||c=='other')for(let i=0;i<(wd?14:8);i++)g+=`<circle cx="${R(X,X+Wd)}" cy="${R(0,500)}" r="${R(30,150)}" class="${i==3?'a':'f'+i%3}"/>`;
else if(c=='3d')for(let i=0;i<(wd?8:4);i++){const x=wd?R(-150,560):R(40,200),y=R(90,300),z=R(40,80);g+=`<path class="f${i%3}" d="M${x} ${y}l${z} ${-z/2}l${z} ${z/2}l${-z} ${z/2}z"/><path class="f${(i+1)%3}" d="M${x} ${y+z/2}v${z}l${z} ${z/2}v${-z}z"/><path class="${i==1?'a':'f2'}" d="M${x+2*z} ${y+z/2}v${z}l${-z} ${z/2}v${-z}z"/>`}
else if(c=='character')g=(wd?'<rect x="-180" y="260" width="150" height="240" class="f0"/><rect x="430" y="200" width="170" height="300" class="f1"/><rect x="-60" y="360" width="90" height="140" class="f2"/><rect x="330" y="330" width="80" height="170" class="f2"/>':'')+`<circle cx="200" cy="${R(130,160)}" r="${R(55,70)}" class="f2"/><rect x="${R(110,140)}" y="230" width="${R(120,150)}" height="220" rx="60" class="f1"/><path d="M150 ${R(120,140)}h100v14h-100z" class="a"/><circle cx="178" cy="150" r="6" class="f0"/><circle cx="222" cy="150" r="6" class="f0"/>`;
else{for(let i=0;i<(wd?9:4);i++)g+=`<rect x="${(wd?-170:30)+i*92}" y="${R(120,200)}" width="80" height="${R(120,200)}" class="f${i%3}"/>`;g+=`<path d="M170 380l60 34-60 34z" class="a"/>`}
return`<svg viewBox="${X} 0 ${Wd} 500" preserveAspectRatio="xMidYMid slice" class="${m}" role="img" aria-label="${esc(p.t)} placeholder artwork"><rect x="${X}" width="${Wd}" height="500" class="k"/>${g}${wd?'':`<text x="16" y="484">${esc(p.t)}</text>`}</svg>`}
export const an=p=>p.an;
export const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const pic=(p,m='',v=0,wd=0)=>p.img?`<img src="${esc(p.img)}" alt="${esc(p.alt||p.t)}" loading="lazy" decoding="async">`:art(p,m,v,wd);
export const plural=(n,w)=>`${n} ${w}${n==1?'':'s'}`;
/* Social links: paste your profile URL as the 2nd value. Entries left empty are hidden so no broken links appear. */
export const SOC=[
['Instagram','','<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.2" cy="6.8" r="1.3"/>'],
['Facebook','','<path d="M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.5V11H7v4h2.5v6h4v-6H16l.5-4h-3V8.8c0-.5.2-.8.8-.8z"/>'],
['TikTok','','<path d="M16.5 3c.3 2.3 1.7 3.8 4 4v3.2c-1.4 0-2.8-.4-4-1.2v5.8c0 3.2-2.6 5.2-5.3 5.2-2.9 0-5.2-2.3-5.2-5.1 0-3.3 2.9-5.5 6.1-5v3.3c-1.6-.5-2.9.5-2.9 1.8 0 1.1.9 2 2 2 1.2 0 2-.8 2-2.2V3z"/>'],
['YouTube','','<path fill-rule="evenodd" d="M22 8.2c-.2-1-.9-1.7-1.9-1.9C18.4 6 12 6 12 6s-6.400 0-8.100.3C2.900 6.500 2.200 7.200 2 8.200 1.700 9.900 1.700 12 1.700 12s0 2.100.3 3.800c.2 1 .9 1.700 1.900 1.900C5.600 18 12 18 12 18s6.400 0 8.100-.3c1-.2 1.700-.9 1.900-1.900.3-1.700.3-3.800.3-3.800s0-2.100-.3-3.800zM10 15V9l5.200 3z"/>'],
['Gmail','mailto:nozique7@gmail.com','<path d="M2 6.200V18h4v-7.300l6 4.500 6-4.500V18h4V6.200L20.200 5 12 11.200 3.800 5z"/>'],
['ArtStation','','<path d="M0 17.723l2.027 3.505a2.424 2.424 0 0 0 2.164 1.333h13.457l-2.792-4.838H0zm24 .025c0-.484-.143-.935-.388-1.314L15.728 2.728a2.424 2.424 0 0 0-2.142-1.289H9.419L21.598 22.540l1.920-3.325c.378-.637.482-.919.482-1.467zm-11.129-3.462L7.428 4.858l-5.444 9.428h10.887z"/>']];
/* Unconfigured networks still show as a button, marked "coming soon", and go nowhere. */
export const soc=()=>SOC.map(([n,h,s])=>!h?`<span class="off" role="img" aria-label="${n} (link coming soon)" title="${n}: coming soon"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${s}</svg></span>`:`<a href="${h}" ${h[0]=='m'?'':'target="_blank" rel="noopener"'} aria-label="${n}" title="${n}"><svg viewBox="0 0 24 24" fill="currentColor" role="img" aria-hidden="true">${s}</svg></a>`).join('');
export const card=(p,x='',st='')=>`<a class="card${an(p)?' an':''} ${x}" href="#/work/${esc(p.id)}" data-c="${p.c}" data-cur="View" aria-label="${esc(p.t)}, ${esc(CAT[p.c])}, ${p.y}" style="${st}">${an(p)?'<span class="tg">Play</span>':''}${p.f&&x=='w'?'<span class="tg f">Featured</span>':''}<div class="im">${pic(p)}</div><div class="ov"><span class="lab"><em class="cl">${esc(CAT[p.c])}</em>${p.y}</span><h3>${esc(p.t)}</h3><span class="vp"><b>View project</b>${esc(p.tl.split(",").slice(0,2).join(","))}</span></div></a>`;
/* Featured projects for the home page; when none are marked featured, the first three are used. */
export const featured=()=>{const f=P.filter(p=>p.f);return f.length?f:P.slice(0,3)};
/* Categories that have at least one published project, in order. */
export const cats=()=>Object.entries(CAT).filter(([k])=>P.some(p=>p.c==k));
