// ─── URLs ───
const MONITOR_URL   = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQhwNro5iyroDuJwHIfDDFVefk2U2_oIwvpTaqBlRhankaYqonQeju8wAU0LMUp86bGzIqIREQnbh3W/pub?gid=310685808&single=true&output=csv';
const PROMO_RAW_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQhwNro5iyroDuJwHIfDDFVefk2U2_oIwvpTaqBlRhankaYqonQeju8wAU0LMUp86bGzIqIREQnbh3W/pub?gid=1789565871&single=true&output=csv';

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{"theme":"dark","accent":"#3b82f6","showPromos":true}/*EDITMODE-END*/;

// ─── CSV PARSER (RFC 4180, handles \r\n, multiline quoted cells) ───
function parseCSV(text) {
  const rows = []; let i = 0, n = text.length;
  function skipEOL() { if (text[i]==='\r') i++; if (text[i]==='\n') i++; }
  while (i < n) {
    const row = [];
    while (i < n) {
      if (text[i] === '"') {
        i++; let cell = '';
        while (i < n) {
          if (text[i]==='"' && text[i+1]==='"') { cell+='"'; i+=2; }
          else if (text[i]==='"') { i++; break; }
          else cell+=text[i++];
        }
        row.push(cell.trim());
      } else {
        let cell = '';
        while (i<n && text[i]!==',' && text[i]!=='\n' && text[i]!=='\r') cell+=text[i++];
        row.push(cell.trim());
      }
      if (i<n && text[i]===',') { i++; continue; }
      break;
    }
    skipEOL();
    if (row.some(c=>c!=='')) rows.push(row);
  }
  return rows;
}

// ─── HELPERS ───
const FLAGS = {bolivia:'🇧🇴',argentina:'🇦🇷',brasil:'🇧🇷',brazil:'🇧🇷',chile:'🇨🇱',peru:'🇵🇪',mexico:'🇲🇽',colombia:'🇨🇴'};
const getFlag = m => FLAGS[(m||'').toLowerCase()] || '🌎';
const statusClass = s => s.includes('Winning')?'win':s.includes('Losing')?'lose':'neutral';
const deltaClass  = v => (!v||v==='—'||v.includes('No Data'))?'nd':v.startsWith('+')?'pos':((v.startsWith('-')||v.startsWith('−'))?'neg':'nd');

function countBy(arr, key) {
  const m={};
  for(const item of arr){const k=item[key]||'N/A';m[k]=(m[k]||0)+1;}
  return Object.entries(m).sort((a,b)=>b[1]-a[1]);
}

function fmtDate(d) {
  if(!d||isNaN(d)) return '—';
  return d.toLocaleDateString('es',{day:'2-digit',month:'short',year:'numeric'});
}

function parseDate(str) {
  if(!str||!str.trim()) return null;
  str=str.trim();
  if(/^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str);
  const p=str.split(/[\/\-\.]/);
  if(p.length===3){
    if(+p[2]>31) return new Date(+p[2],+p[0]-1,+p[1]);
    if(+p[0]>12) return new Date(+p[2],+p[1]-1,+p[0]);
    return new Date(+p[2],+p[1]-1,+p[0]);
  }
  const d=new Date(str); return isNaN(d)?null:d;
}

// ─── VIEW SWITCHING ───
let currentView = 'monitor';
let insightsLoaded = false;
let insightsPeriod = 15;

function setView(v) {
  currentView = v;
  document.querySelectorAll('.view').forEach(el => el.classList.toggle('active', el.id==='view-'+v));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  if(v==='insights'){
    document.getElementById('nav-insights').classList.add('active');
    if(!insightsLoaded) loadInsights();
  }
}

// ─── MONITOR DATA ───
function renderMonitor(rows) {
  let lastUpdate='—';
  if(rows[0]){const lu=rows[0].find((c,i)=>rows[0][i-1]&&rows[0][i-1].toLowerCase().includes('update'));if(lu)lastUpdate=lu;}
  document.getElementById('last-update').textContent='Last update: '+lastUpdate;

  let headerIdx=-1;
  for(let i=0;i<rows.length;i++){if(rows[i][0].toLowerCase()==='market'){headerIdx=i;break;}}
  if(headerIdx<0){showError('No se encontró la cabecera en el sheet.');return;}

  let curMarket='',curCompetitor='';
  const data=[];
  for(const r of rows.slice(headerIdx+1)){
    if(r[0]) curMarket=r[0];
    if(r[1]) curCompetitor=r[1];
    if(!r[2]) continue;
    data.push({market:curMarket,competitor:curCompetitor,product:r[2],status:r[3]||'',baseDelta:r[4]||'—',promoImpact:r[5]||'',promoDelta:r[6]||'—',promoDesc:r[7]||''});
  }

  const markets={};
  for(const d of data){if(!markets[d.market])markets[d.market]={};if(!markets[d.market][d.competitor])markets[d.market][d.competitor]=[];markets[d.market][d.competitor].push(d);}

  const marketNames=Object.keys(markets);
  const allComps=new Set(data.map(d=>d.competitor));
  const trackable=data.filter(d=>!d.status.includes('No Data'));
  const wins=trackable.filter(d=>d.status.includes('Winning'));
  const activePromos=data.filter(d=>d.promoImpact.includes('Active'));

  document.getElementById('kpi-markets').textContent=marketNames.length;
  document.getElementById('kpi-markets-sub').textContent=marketNames.join(' · ');
  document.getElementById('kpi-competitors').textContent=allComps.size;
  document.getElementById('kpi-competitors-sub').textContent=data.length+' product comparisons';
  document.getElementById('kpi-win').textContent=wins.length+'/'+trackable.length;
  document.getElementById('kpi-promos').textContent=activePromos.length;
  document.getElementById('kpi-promos-sub').textContent=activePromos.length?activePromos.map(p=>p.competitor+' ('+p.market.slice(0,3).toUpperCase()+')').join(' · '):'No active promotions';
  document.getElementById('badge-all').textContent=marketNames.length;
  document.getElementById('promo-nav-label').textContent=activePromos.length?`⚠️ ${activePromos.length} Active`:'✅ No active promos';

  document.getElementById('market-nav').innerHTML=marketNames.map(m=>{
    const cc=Object.keys(markets[m]).length;
    return `<div class="nav-item" data-market="${m.toLowerCase()}" onclick="setView('monitor');filterMarket('${m.toLowerCase()}',this)">${getFlag(m)} ${m} <span class="nav-badge">${cc}</span></div>`;
  }).join('');

  const alerts=document.getElementById('promo-alerts');
  alerts.innerHTML=activePromos.length
    ?activePromos.map(p=>`<div class="promo-card"><div class="promo-icon">⚠️</div><div><div class="promo-competitor">${p.competitor} <span style="color:var(--muted);font-weight:400;font-size:11px">· ${p.market}</span></div><div class="promo-product">${p.product}</div><div class="promo-desc">${p.promoDesc}</div></div><div class="promo-delta"><div class="promo-delta-val">${p.promoDelta!=='—'?p.promoDelta:'—'}</div><div class="promo-delta-label">Promo ∆</div></div></div>`).join('')
    :'<div class="no-promos-msg">No hay promociones activas en este momento.</div>';

  document.getElementById('market-tables').innerHTML=marketNames.map(m=>{
    const body=Object.entries(markets[m]).map(([comp,products])=>{
      return `<tr class="group-row"><td colspan="6">${comp}</td></tr>`+products.map(p=>{
        const sc=statusClass(p.status),dc=deltaClass(p.baseDelta),hp=p.promoImpact.includes('Active');
        const sEmoji=p.status.includes('Winning')?'🟢':p.status.includes('Losing')?'🔴':'⚪';
        const sLabel=p.status.replace('🔴 ','').replace('🟢 ','').replace('⚪ ','');
        return `<tr>
          <td class="product-col">${p.product}</td><td></td>
          <td class="center"><span class="status-pill ${sc}">${sEmoji} ${sLabel}</span></td>
          <td class="right"><span class="delta ${dc}">${p.baseDelta}</span></td>
          <td class="center">${hp?`<span class="promo-tag">⚠️ Active<span class="tooltip">${p.promoDesc}</span></span>`:'<span class="no-promo">—</span>'}</td>
          <td class="right"><span class="delta ${hp?deltaClass(p.promoDelta):'nd'}">${hp?p.promoDelta:'—'}</span></td>
        </tr>`;
      }).join('');
    }).join('');
    return `<div class="market-section visible" id="section-${m.toLowerCase()}">
      <div class="section-header" style="margin-bottom:14px"><div class="section-title">${getFlag(m)} ${m}</div></div>
      <div class="table-wrap"><table>
        <thead><tr><th style="width:150px">Competitor</th><th>Product</th><th class="center">Status</th><th class="right">Base ∆</th><th class="center">Promo Impact</th><th class="right">Promo ∆</th></tr></thead>
        <tbody>${body}</tbody>
      </table></div></div>`;
  }).join('');
}

function filterMarket(market, el) {
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.market-section').forEach(s=>{s.classList.toggle('visible',market==='all'||s.id==='section-'+market);});
  document.querySelectorAll('.promo-card').forEach(c=>{
    if(market==='all'){c.style.display='';return;}
    c.style.display=c.querySelector('.promo-competitor').textContent.toLowerCase().includes(market)?'':'none';
  });
}

// ─── INSIGHTS DATA ───
let allRawPromos = [];

async function loadInsights() {
  if(insightsLoaded) return;
  try {
    const res = await fetch(PROMO_RAW_URL+'&cb='+Date.now());
    const text = await res.text();
    const rows = parseCSV(text);

    // Find header row: ≥2 DISTINCT non-empty cells each containing a known keyword
    const HKW=['date','fecha','competitor','competidor','market','mercado','product','producto','promo type','status','estado','active','activo'];
    let hi=0;
    for(let i=0;i<Math.min(10,rows.length);i++){
      const cells=rows[i].map(c=>c.toLowerCase().replace(/[\r\n\t]+/g,' ').trim()).filter(c=>c.length>0);
      const matchCount=cells.filter(c=>HKW.some(kw=>c.includes(kw))).length;
      if(matchCount>=2){hi=i;break;}
    }
    const headers=rows[hi].map(h=>h.toLowerCase().replace(/[\r\n\t]+/g,' ').replace(/\s+/g,' ').trim());
    console.log('[Insights] headers:', headers);

    const idx=(...kws)=>{for(const k of kws){const i=headers.findIndex(h=>h.includes(k));if(i>=0)return i;}return -1;};
    const iDate  = idx('date added','date','fecha');
    const iMkt   = idx('market','mercado','país','pais','country');
    const iComp  = idx('competitor','competidor');
    const iProd  = idx('airtm product','airtm','product','producto','categoria','category','servicio','service');
    const iType  = idx('promo type','tipo de promo','tipo','type');
    const iDesc  = idx('description','descripción','descripcion','detail','detalle','value','valor','notes');
    const iStat  = idx('promo active','status','estado','active','activo');
    const iEnd   = idx('end date','fecha fin','expiry','vencimiento');

    console.log('[Insights] col map → date:',iDate,'market:',iMkt,'comp:',iComp,'prod:',iProd,'type:',iType,'status:',iStat);

    const JUNK=['competitor','competidor','market','mercado','a–o','a-o','datos core','leyenda','product','producto'];
    allRawPromos = rows.slice(hi+1).map(r=>{
      const ed=iEnd>=0?parseDate(r[iEnd]):null;
      const sv=(iStat>=0?r[iStat]:'').toLowerCase();
      const isActive=sv.includes('activ')||sv.includes('active')||sv.includes('yes')||sv.includes('sí')||(!sv&&ed&&ed>=new Date())||(!sv&&!ed);
      return {
        date:parseDate(iDate>=0?r[iDate]:''),
        market:iMkt>=0?r[iMkt]:'',
        competitor:iComp>=0?r[iComp]:'',
        product:iProd>=0?r[iProd]:'',
        promoType:iType>=0?r[iType]:'',
        description:iDesc>=0?r[iDesc]:'',
        active:isActive, endDate:ed
      };
    }).filter(p=>{
      const c=(p.competitor||'').toLowerCase().trim();
      const m=(p.market||'').toLowerCase().trim();
      if(JUNK.some(j=>c.includes(j)||m.includes(j)))return false;
      return c.length>0||m.length>0;
    });

    allRawPromos.sort((a,b)=>(b.date||0)-(a.date||0));
    insightsLoaded=true;
    renderInsights();
  } catch(e) {
    console.error('[Insights]',e);
    document.getElementById('ai-product-focus').textContent='Error al cargar Promo Raw: '+e.message;
    document.getElementById('ai-intent').textContent='—';
    document.getElementById('ai-user-profile').textContent='—';
    document.getElementById('ai-strategy').textContent='—';
  }
}

function getFilteredPromos() {
  if(insightsPeriod===0) return allRawPromos;
  const cutoff=new Date(); cutoff.setDate(cutoff.getDate()-insightsPeriod);
  return allRawPromos.filter(p=>!p.date||p.date>=cutoff);
}

function setInsightsPeriod(days, el) {
  insightsPeriod=days;
  document.querySelectorAll('.period-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  if(insightsLoaded) renderInsights();
}

function renderBarChart(elId, data) {
  const el=document.getElementById(elId);
  if(!data.length){el.innerHTML='<div style="color:var(--muted);font-size:12px">Sin datos</div>';return;}
  const max=data[0][1];
  const COLORS=['#f59e0b','#3b82f6','#a78bfa','#22d3ee','#22c55e','#f04f5a','#fb7185','#34d399'];
  el.innerHTML=data.slice(0,7).map(([label,count],i)=>`
    <div class="bar-row">
      <div class="bar-label" title="${label}">${label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(count/max*100).toFixed(1)}%;background:${COLORS[i%8]}22;border-right:2px solid ${COLORS[i%8]}"><span style="color:${COLORS[i%8]}">${count}</span></div></div>
      <div class="bar-count">${count}</div>
    </div>`).join('');
}

function setBullets(elId, text) {
  const el=document.getElementById(elId);
  const lines=text.split('\n').map(l=>l.replace(/^[-•*·▸▶►]\s*/,'').replace(/^\d+\.\s*/,'').trim()).filter(l=>l.length>2);
  el.className='ai-bullets';
  el.innerHTML=lines.map(l=>`<div class="ai-bullet"><div class="ai-bullet-dot"></div><div class="ai-bullet-text">${l}</div></div>`).join('');
}

async function renderInsights() {
  const promos=getFilteredPromos();
  const period=insightsPeriod===0?'todo el historial':`los últimos ${insightsPeriod} días`;

  // KPIs
  const compCounts=countBy(promos,'competitor');
  const prodCounts=countBy(promos,'product');
  const mktCounts=countBy(promos,'market');
  document.getElementById('ik-total').textContent=promos.length;
  document.getElementById('ik-total-sub').textContent=insightsPeriod===0?'en todo el historial':`en los últimos ${insightsPeriod} días`;
  document.getElementById('ik-comps').textContent=compCounts.length;
  document.getElementById('ik-comps-sub').textContent=compCounts.slice(0,2).map(c=>c[0]).join(', ')||'—';
  document.getElementById('ik-product').textContent=prodCounts[0]?.[0]||'—';
  document.getElementById('ik-product-sub').textContent=prodCounts[0]?prodCounts[0][1]+' veces':'';
  document.getElementById('ik-market').textContent=mktCounts[0]?.[0]||'—';
  document.getElementById('ik-market-sub').textContent=mktCounts[0]?mktCounts[0][1]+' promos':'';

  // Charts
  renderBarChart('chart-product', prodCounts);
  renderBarChart('chart-competitor', compCounts);

  // Raw table
  document.getElementById('raw-count').textContent=promos.length+' registros';
  document.getElementById('raw-tbody').innerHTML=promos.length
    ? promos.map(p=>`<tr>
        <td style="color:var(--muted);white-space:nowrap">${p.date?fmtDate(p.date):'—'}</td>
        <td>${p.market||'—'}</td>
        <td style="font-weight:500">${p.competitor||'—'}</td>
        <td style="color:var(--muted)">${p.product||'—'}</td>
        <td>${p.promoType||'—'}</td>
        <td style="max-width:300px;color:#94a3b8;font-size:11px;line-height:1.5">${p.description||'—'}</td>
        <td><span style="display:inline-flex;align-items:center;gap:4px;font-size:11px"><span style="width:6px;height:6px;border-radius:50%;background:${p.active?'var(--win)':'var(--muted)'};display:inline-block"></span>${p.active?'Activa':'Finalizada'}</span></td>
      </tr>`).join('')
    : '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">Sin datos en este período</td></tr>';

  // AI analysis — 4 focused prompts
  if(!promos.length){
    ['ai-product-focus','ai-intent','ai-user-profile','ai-strategy'].forEach(id=>{document.getElementById(id).textContent='Sin datos suficientes.';});
    return;
  }

  const summary=promos.slice(0,80).map(p=>`${p.competitor}|${p.market}|${p.product}|${p.promoType}|${(p.description||'').slice(0,150)}`).join('\n');

  // Set all to loading
  ['ai-product-focus','ai-intent','ai-user-profile','ai-strategy'].forEach(id=>{
    const el=document.getElementById(id);
    el.className='ai-loading';
    el.textContent='Analizando…';
  });

  // Run 4 AI calls in parallel
  const base={messages:[{role:'user',content:''}]};
  const call=(prompt)=>window.claude.complete({messages:[{role:'user',content:prompt}]});

  const ctx=`Datos de promociones competitivas (fintech/remesas LATAM, ${period}):\n${summary}\n\n`;

  Promise.all([
    call(ctx+`En español. Solo 3-4 bullets cortos y directos. ¿En qué productos o categorías están concentrando sus promociones los competidores? ¿Hay patrones claros por producto? Sin intro, solo bullets.`),
    call(ctx+`En español. Solo 3-4 bullets cortos y directos. ¿Qué intención estratégica se puede inferir detrás de estas promociones? ¿Qué están intentando lograr (adquisición, retención, volumen, cross-sell)? Sin intro, solo bullets.`),
    call(ctx+`En español. Solo 3-4 bullets cortos y directos. ¿A qué tipo de usuario están dirigidas estas promociones? Infiere el perfil (nuevo usuario, usuario con saldo, usuario frecuente, etc.) basándote en los requisitos y condiciones de cada promo. Sin intro, solo bullets.`),
    call(ctx+`En español. Solo 3-4 bullets cortos y directos. ¿Qué implican estas promociones para nuestra estrategia de precios y productos? ¿Dónde tenemos riesgo o oportunidad? Sin intro, solo bullets.`)
  ]).then(([r1,r2,r3,r4])=>{
    setBullets('ai-product-focus',r1);
    setBullets('ai-intent',r2);
    setBullets('ai-user-profile',r3);
    setBullets('ai-strategy',r4);
  }).catch(e=>{
    ['ai-product-focus','ai-intent','ai-user-profile','ai-strategy'].forEach(id=>{
      document.getElementById(id).textContent='Error al generar análisis: '+e.message;
    });
  });
}

// ─── LOAD ALL ───
async function loadAll() {
  const btn=document.getElementById('refresh-btn');
  btn.classList.add('spinning');
  document.getElementById('error-msg').style.display='none';
  insightsLoaded=false;
  try {
    const res=await fetch(MONITOR_URL+'&cb='+Date.now());
    if(!res.ok) throw new Error('HTTP '+res.status);
    renderMonitor(parseCSV(await res.text()));
  } catch(e) { showError('Error al cargar datos: '+e.message); }
  finally {
    btn.classList.remove('spinning');
    document.getElementById('loading').classList.add('hidden');
    if(currentView==='insights'){insightsLoaded=false;loadInsights();}
  }
}

function showError(msg) {
  const el=document.getElementById('error-msg');
  el.textContent=msg; el.style.display='block';
  document.getElementById('loading').classList.add('hidden');
}

// ─── TWEAKS ───
window.addEventListener('message',e=>{
  if(e.data?.type==='__activate_edit_mode') document.getElementById('tweak-panel').style.display='block';
  if(e.data?.type==='__deactivate_edit_mode') document.getElementById('tweak-panel').style.display='none';
});
window.parent.postMessage({type:'__edit_mode_available'},'*');

function setTheme(t,btn){
  btn.closest('.tweak-opts').querySelectorAll('.tweak-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(t==='light'){
    ['--bg:#f4f6fb','--surface:#ffffff','--surface2:#f0f4fa','--border:#dde3ee','--border2:#c8d2e5','--text:#111827','--muted:#6b7280'].forEach(v=>{const[k,val]=v.split(':');document.documentElement.style.setProperty(k,val);});
  } else {
    ['--bg:#0d1520','--surface:#131e2e','--surface2:#1a2840','--border:#1f3050','--border2:#243862','--text:#e2eaf6','--muted:#6b85a8'].forEach(v=>{const[k,val]=v.split(':');document.documentElement.style.setProperty(k,val);});
  }
  window.parent.postMessage({type:'__edit_mode_set_keys',edits:{theme:t}},'*');
}

function setAccent(c,btn){
  btn.closest('.tweak-opts').querySelectorAll('.tweak-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.documentElement.style.setProperty('--accent',c);
  document.documentElement.style.setProperty('--accent-bg',c+'1a');
  window.parent.postMessage({type:'__edit_mode_set_keys',edits:{accent:c}},'*');
}

let promosVisible=true;
function togglePromos(){
  promosVisible=!promosVisible;
  const t=document.getElementById('promo-toggle');
  t.classList.toggle('on',promosVisible);
  document.getElementById('promo-section').style.display=promosVisible?'':'none';
  window.parent.postMessage({type:'__edit_mode_set_keys',edits:{showPromos:promosVisible}},'*');
}

// ─── INIT ───
loadAll();
