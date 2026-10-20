import { P } from '../data.js';
import { art, soc } from '../helpers.js';
const PROFILE='';/* Your portrait as a data: URI (remote image URLs are blocked on the published page) */
export function about(){const S=P[1],st=['Sketch','w','Block-out','g','Detail','dm','Final',''],ch=a=>`<div class="ch">${a.map(s=>`<span>${s}</span>`).join('')}</div>`,job=()=>`<div class="rx"><span class="lab">[Year to Year]</span><div><b>[Role or project title]</b><em>[Studio, client or personal project]</em><p>[One or two lines on what you made and your part in it.]</p></div></div>`;
return`<section class="sec w ph"><div class="rs"><aside class="rl"><div class="pf">${PROFILE?`<img src="${PROFILE}" alt="Portrait of Ken Rainier D. Quizon">`:`<svg viewBox="0 0 100 100" role="img" aria-label="Profile photo placeholder"><rect width="100" height="100" fill="#1e1e1e"/><circle cx="50" cy="38" r="17" fill="#4a4a4a"/><path d="M15 100c0-23 15-37 35-37s35 14 35 37z" fill="#4a4a4a"/></svg>`}</div>
<h1 class="rn">Ken Rainier D. Quizon</h1><p class="rr">Nozique &middot; Character designer, illustrator, 3D artist and animator</p>
<div class="rb"><h3>Contact</h3><p><a href="mailto:nozique7@gmail.com" style="color:var(--wh)">nozique7@gmail.com</a></p><p>Baguio City, Philippines</p><div class="so" style="margin-top:14px">${soc()}</div></div>
<div class="rb"><h3>Availability</h3><p>[Placeholder: your availability]</p></div>
<div class="rb"><h3>Software</h3><ul class="rk">${['Blender','Krita','Clip Studio Paint'].map(s=>`<li>${s}</li>`).join('')}</ul></div>
<div class="rb"><h3>Skills</h3>${ch(['Character Design','Portrait Illustration','3D Modeling','Rigging','2D Animation','3D Animation'])}</div></aside>
<div class="rm"><div class="rs2"><h2>Profile</h2><p class="in">Bringing characters and imaginative worlds to life through art and animation.</p><p style="max-width:60ch">I’m Ken Rainier D. Quizon, also known as Nozique, a multimedia arts student from Baguio City, Philippines, passionate about character design and portrait illustration. I explore ideas through digital illustration, 3D modeling, rigging, and 2D and 3D animation, creating expressive characters and visual concepts that tell stories.</p></div>
<div class="rs2"><h2>Experience</h2>${job()}<span class="ph-note">Placeholder: add real projects, commissions or school work, or remove this section</span></div>
<div class="rs2"><h2>Education and training</h2><div class="rx"><span class="lab">2022-2024</span><div><b>Arts and Design Strand, Senior High School</b><em>Baguio City National High School</em></div></div><div class="rx"><span class="lab">2024-2027</span><div><b>Bachelor of Multimedia Arts, College</b><em>University of Cordilleras</em></div></div></div>
<div class="rs2"><h2>Creative focus</h2>${ch(['Character Design','Portrait Illustration'])}</div>
<div class="rs2"><a class="btn r" href="#/contact">Work with me</a> <a class="btn" href="#/work">See my work</a></div></div></div></section>
<section class="sec w"><h2>How a piece comes together</h2><div class="ps">${[0,2,4,6].map((k,i)=>`<div><div>${art(S,st[k+1],2)}</div><b>${i+1}. ${st[k]}</b></div>`).join('')}</div></section>`}
