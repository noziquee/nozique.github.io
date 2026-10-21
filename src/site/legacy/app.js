import { parseHash, pageTitle } from '../router/route';
import { loadSiteData } from '../data/source';
import { getSupabase } from '../../shared/supabase/client';
import { CAT, P, useSiteData } from './data.js';
import { $, M, HD, WP, plural, soc } from './helpers.js';
import { STATE } from './state.js';
import { home } from './pages/home.js';
import { work } from './pages/work.js';
import { proj } from './pages/project.js';
import { about } from './pages/about.js';
import { contact } from './pages/contact.js';
import { foot } from './pages/footer.js';
/* routing */
function paint(){const rt=parseHash(location.hash,P.map(x=>x.id)),pg=rt.page=='home'?'':rt.page,id=rt.id;clearInterval(STATE.timer);STATE.slideFn=null;
M.innerHTML=(pg=='work'?(id?proj(id):work()):pg=='about'?about():pg=='contact'?contact():home())+foot();
document.querySelectorAll('[data-p]').forEach(a=>{const o=a.dataset.p==pg;a.classList.toggle('on',o);o?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current')});closeMenu();
const t=id&&P.find(x=>x.id==id);document.title=pageTitle(rt,t&&t.t);init(pg,id);fx();if(!STATE.first)M.focus({preventScroll:true})}
function route(){if(!STATE.ready)return;closeLB(1);if(STATE.first){paint();STATE.first=0;return}if(matchMedia('(prefers-reduced-motion:reduce)').matches){paint();scrollTo({top:0,behavior:'instant'});return}WP.classList.add('on');setTimeout(()=>{paint();scrollTo({top:0,behavior:'instant'});WP.classList.remove('on')},360)}
addEventListener('hashchange',route);
document.addEventListener('click',e=>{const f=e.target.closest('[data-f]');if(f){STATE.flt=f.dataset.f;if(location.hash=='#/work'){e.preventDefault();route()}}});
/* page behaviours */
function init(pg,id){
if(pg==''||pg=='home'){const sl=document.querySelectorAll('.sl'),F=P.filter(p=>p.f),hv=$('.hv');let k=0;
const ch=document.querySelectorAll('.chips button'),go=n=>{sl[k].classList.remove('on');ch[k].classList.remove('on');k=n;sl[k].classList.add('on');ch[k].classList.add('on');$('#cp').textContent=F[k].t;$('#cp').href=$('.hvl').href='#/work/'+F[k].id;$('#ct').textContent=`${k+1} / ${sl.length}`;sl.forEach((s,j)=>s.setAttribute('aria-hidden',j!=k));ch.forEach((b,j)=>b.setAttribute('aria-pressed',j==k));const g=$('.pg');g.style.animation='none';g.offsetWidth;g.style.animation=''},st=()=>{clearInterval(STATE.timer);if(sl.length>1&&!matchMedia('(prefers-reduced-motion:reduce)').matches)STATE.timer=setInterval(()=>{if(!document.hidden)go((k+1)%sl.length)},4500)};ch.forEach((b,n)=>b.onclick=()=>{go(n);st()});st();const hr=$('.hr');hr.onmouseenter=hr.onfocusin=()=>{clearInterval(STATE.timer);$('.pg').style.animationPlayState='paused'};hr.onmouseleave=hr.onfocusout=()=>{$('.pg').style.animationPlayState='';st()};
hv.onmousemove=e=>{const b=hv.getBoundingClientRect(),x=(e.clientX-b.left)/b.width-.5,y=(e.clientY-b.top)/b.height-.5;hv.style.transform=`perspective(900px) rotateY(${x*9}deg) rotateX(${-y*9}deg)`};hv.onmouseleave=()=>hv.style.transform=''}
if(pg=='work'&&!id){const cs=[...document.querySelectorAll('.mas .card')],bs=document.querySelectorAll('.fl button');let ft;
if(STATE.flt!='all'&&!CAT[STATE.flt])STATE.flt='all';const ap=k=>{cs.forEach(c=>c.hidden=!(k=='all'||c.dataset.c==k));const n=cs.filter(c=>!c.hidden).length;$('#cnt').textContent=`Showing ${plural(n,'project')}${k=='all'?'':' in '+CAT[k]}`;$('.emp').hidden=n>0;bs.forEach(x=>{x.classList.toggle('on',x.dataset.k==k);x.setAttribute('aria-pressed',x.dataset.k==k)})};ap(STATE.flt);
document.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{STATE.flt=b.dataset.k;clearTimeout(ft);cs.forEach(c=>c.classList.add('out'));ft=setTimeout(()=>{ap(STATE.flt);cs.forEach(c=>c.classList.remove('out'))},matchMedia('(prefers-reduced-motion:reduce)').matches?0:250)})}
if(id){const r=$('.cmp input');if(r)r.oninput=()=>{$('.cmp .t').style.clipPath=`inset(0 ${100-r.value}% 0 0)`;$('.cmp i').style.left=r.value+'%'};
document.querySelectorAll('[data-lb]').forEach(c=>{c.onclick=()=>openLB(+c.dataset.lb);c.onkeydown=e=>{if(e.key=='Enter'||e.key==' '){e.preventDefault();openLB(+c.dataset.lb)}}});
const hc=$('.hc');if(hc){let ci=0;const fg=hc.querySelector('figure'),go=d=>{ci=(ci+d+STATE.LB.length)%STATE.LB.length;fg.dataset.lb=ci;fg.querySelector('.im').innerHTML=STATE.LB[ci].h;fg.querySelector('.lab').textContent=STATE.LB[ci].c;fg.setAttribute('aria-label','Open image: '+(STATE.LB[ci].c||'artwork'));const cn=hc.querySelector('.cn');if(cn)cn.textContent=`${ci+1} / ${STATE.LB.length}`};STATE.slideFn=go;
hc.querySelectorAll('.ca').forEach(b=>b.onclick=()=>go(+b.dataset.d));let tx=0;hc.ontouchstart=e=>tx=e.touches[0].clientX;hc.ontouchend=e=>{const dx=e.changedTouches[0].clientX-tx;if(Math.abs(dx)>50)go(dx<0?1:-1)};go(0)}}
if(pg=='contact'){$('#cp2').onclick=async e=>{const b=e.currentTarget;try{await navigator.clipboard.writeText('nozique7@gmail.com');b.textContent='Email copied'}catch(_){const r=document.createRange();r.selectNodeContents($('#em'));getSelection().removeAllRanges();getSelection().addRange(r);b.textContent='Press Ctrl+C to copy'}setTimeout(()=>b.textContent='Copy email',2500)};
$('.fm').onsubmit=e=>{e.preventDefault();const er=$('.er'),f=[['#n',v=>v.trim(),'Enter your name.'],['#e',v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),'Enter a valid email address.'],['#g',v=>v.trim().length>=10,'Tell me a bit about the project (at least 10 characters).']];
f.forEach(([q])=>$(q).removeAttribute('aria-invalid'));const bad=f.find(([q,ok])=>!ok($(q).value));if(bad){er.className='er';er.textContent=bad[2];$(bad[0]).setAttribute('aria-invalid','true');$(bad[0]).focus();return}
const sub=`${$('#t').value} enquiry from ${$('#n').value.trim()}`,body=`${$('#g').value.trim()}\n\nName: ${$('#n').value.trim()}\nEmail: ${$('#e').value.trim()}\nProject type: ${$('#t').value}`;
location.href=`mailto:nozique7@gmail.com?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;er.className='er ok';er.textContent='Your email app should open with the message ready to send. If nothing happened, email nozique7@gmail.com directly.'}}}
/* reveal + magnetic buttons (skipped under reduced motion) */
function fx(){if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('v');io.unobserve(e.target);setTimeout(()=>e.target.classList.remove('rv','v'),1000)}}),{threshold:.1});
document.querySelectorAll('main h2:not(.st),main .card,main .ps>div,main .band .w,main .rs2,main .pm>*').forEach(el=>{el.classList.add('rv');io.observe(el)});
document.querySelectorAll('main .btn').forEach(b=>{b.onmousemove=e=>{const r=b.getBoundingClientRect();b.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.2}px,${(e.clientY-r.top-r.height/2)*.3}px)`};b.onmouseleave=()=>b.style.transform=''})}
/* lightbox */
const lb=$('.lb'),lc=$('.lc');
let lf;function closeLB(q){if(lb.hidden)return;lb.hidden=true;document.body.classList.remove('lock');if(!q&&lf&&lf.focus)lf.focus()}
function openLB(i){if(lb.hidden)lf=document.activeElement;STATE.li=(i+STATE.LB.length)%STATE.LB.length;lc.classList.remove('z');lc.innerHTML=STATE.LB[STATE.li].h;$('.lb .lab').textContent=`${STATE.LB[STATE.li].c}  ${STATE.li+1} / ${STATE.LB.length}`;const one=STATE.LB.length<2;$('.lb .pv').hidden=$('.lb .nx').hidden=one;if(lb.hidden){lb.hidden=false;document.body.classList.add('lock');$('.lb .x').focus()}}
lc.onclick=()=>lc.classList.toggle('z');$('.lb .x').onclick=closeLB;$('.lb .pv').onclick=()=>openLB(li-1);$('.lb .nx').onclick=()=>openLB(STATE.li+1);
lb.onclick=e=>{if(e.target==lb)closeLB()};
addEventListener('keydown',e=>{if(e.key=='Escape'&&$('.mm.o')){closeMenu();$('.bg').focus();return}if(!lb.hidden&&e.key=='Tab'){const f=[...lb.querySelectorAll('button')].filter(b=>!b.hidden),i=f.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&i==f.length-1){e.preventDefault();f[0].focus()}return}if(lb.hidden){if(STATE.slideFn&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){if(e.key=='ArrowLeft')STATE.slideFn(-1);if(e.key=='ArrowRight')STATE.slideFn(1)}return}if(e.key=='Escape')closeLB();if(STATE.LB.length>1){if(e.key=='ArrowLeft')openLB(li-1);if(e.key=='ArrowRight')openLB(STATE.li+1)}});
/* header, menu, cursor */
let ly=0;addEventListener('scroll',()=>{const y=scrollY;HD.classList.toggle('s',y>40);HD.classList.toggle('h',y>300&&y>ly&&!$('.mm.o'));ly=y},{passive:true});
$('.mm').insertAdjacentHTML('beforeend',`<div class="so" style="margin-top:28px">${soc()}</div>`);function closeMenu(){$('.mm').classList.remove('o');document.body.classList.toggle('lock',!lb.hidden);const b=$('.bg');b.setAttribute('aria-expanded','false');b.setAttribute('aria-label','Open menu');b.innerHTML='&#9776;'}
$('.bg').onclick=()=>{const o=$('.mm').classList.toggle('o'),b=$('.bg');b.setAttribute('aria-expanded',o);b.setAttribute('aria-label',o?'Close menu':'Open menu');b.innerHTML=o?'&#10005;':'&#9776;';document.body.classList.toggle('lock',o);if(o){HD.classList.remove('h');$('.mm a').focus()}};document.querySelectorAll('.mm a').forEach(a=>a.onclick=()=>closeMenu());addEventListener('resize',()=>{if(innerWidth>860&&$('.mm.o'))closeMenu()});
if(matchMedia('(hover:hover) and (pointer:fine)').matches&&!matchMedia('(prefers-reduced-motion:reduce)').matches){const c=$('.cur');document.body.classList.add('cc');
addEventListener('mousemove',e=>{c.style.left=e.clientX+'px';c.style.top=e.clientY+'px';const t=e.target.closest('[data-cur]');c.classList.toggle('big',!!t);c.textContent=t?t.dataset.cur:''})}
loadSiteData(getSupabase).then(data=>{useSiteData(data);STATE.ready=true;route()});
