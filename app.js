(function(){
'use strict';
const KEY='ayundashop_monthly_rekap_v2';
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
const num=id=>Math.max(0,Number($(id).value)||0);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const monthNow=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')};
let data={stores:[],records:[]};
function load(){try{const x=JSON.parse(localStorage.getItem(KEY)||'{}');if(x&&Array.isArray(x.stores)&&Array.isArray(x.records))data=x}catch(e){console.error(e)}}
function persist(){localStorage.setItem(KEY,JSON.stringify(data));render()}
function id(){return 's_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8)}
function period(){return $('month').value||monthNow()}
function monthLabel(m){if(!m)return '-';const [y,mo]=m.split('-').map(Number);return new Date(y,mo-1,1).toLocaleDateString('id-ID',{month:'long',year:'numeric'})}
function prevRecord(storeId,month){return data.records.filter(r=>r.storeId===storeId&&r.month<month).sort((a,b)=>b.month.localeCompare(a.month))[0]||null}
function calc(r){
 const cod=[r.cod1,r.cod2,r.cod3,r.cod4].reduce((a,b)=>a+(Number(b)||0),0);
 const saverPct=Math.min(90,Math.max(0,Number(r.saverPct==null?30:r.saverPct)));
 const codIncome=cod*(100-saverPct)/100, saverAlloc=cod*saverPct/100;
 const prev=prevRecord(r.storeId,r.month);
 const prevCalc=prev?calcBase(prev):null;
 const saverAvailable=prev?prevCalc.saverEnd+saverAllocOf(prev):Math.max(0,Number(r.openingSaver)||0);
 const rts=Math.max(0,Number(r.rts)||0), rtsFromSaver=Math.min(saverAvailable,rts), rtsDeficit=Math.max(0,rts-saverAvailable);
 const totalIncome=codIncome+(Number(r.transfer)||0);
 const adCost=Math.max(0,Number(r.ads)||0), groupCost=Math.max(0,Number(r.groupTopup)||0);
 const beforeCarry=totalIncome-adCost-groupCost-rtsDeficit;
 const carriedLoss=prev?calc(prev).lossOut:Math.max(0,Number(r.openingLoss)||0);
 const finalProfit=beforeCarry-carriedLoss, lossOut=Math.max(0,-finalProfit), distributable=Math.max(0,finalProfit);
 return {cod,saverPct,codIncome,saverAlloc,saverAvailable,rts,rtsFromSaver,rtsDeficit,totalIncome,adCost,groupCost,carriedLoss,beforeCarry,finalProfit,lossOut,management:distributable*.5,cs:distributable*.2,owner:distributable*.3,saverEnd:Math.max(0,saverAvailable-rts)};
}
function saverAllocOf(r){return (Number(r.cod1||0)+Number(r.cod2||0)+Number(r.cod3||0)+Number(r.cod4||0))*Math.max(0,Number(r.saverPct==null?30:r.saverPct))/100}
function calcBase(r){const cod=(Number(r.cod1)||0)+(Number(r.cod2)||0)+(Number(r.cod3)||0)+(Number(r.cod4)||0);const prev=prevRecord(r.storeId,r.month);const prevC=prev?calcBase(prev):null;const available=prev?prevC.saverEnd+saverAllocOf(prev):Math.max(0,Number(r.openingSaver)||0);const rts=Math.max(0,Number(r.rts)||0);return {saverEnd:Math.max(0,available-rts),saverAlloc:cod*Math.max(0,Number(r.saverPct==null?30:r.saverPct))/100};}
function getStoreRecord(storeId,month){return data.records.find(r=>r.storeId===storeId&&r.month===month)||null}
function currentRows(){const m=period();return data.records.filter(r=>r.month===m).map(r=>({r,c:calc(r)})).sort((a,b)=>a.r.store.localeCompare(b.r.store,'id'))}
function animatePage(page){
 const items=page.querySelectorAll('.panel,.stat');
 if(window.gsap&& !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  window.gsap.fromTo(items,{y:9,opacity:.65},{y:0,opacity:1,duration:.48,stagger:.035,ease:'power3.out',clearProps:'transform,opacity'});
 }else{
  page.animate([{opacity:.72,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,easing:'ease-out'});
 }
}
function activatePage(name){
 document.querySelectorAll('.navtab').forEach(b=>{const active=b.dataset.page===name;b.classList.toggle('active',active);b.setAttribute('aria-current',active?'page':'false')});
 document.querySelectorAll('.page').forEach(p=>{const active=p.id==='page-'+name;p.classList.toggle('hidden',!active);if(active)animatePage(p)});
}
function statCard(title,value,cls){return '<div class="stat"><div class="k">'+title+'</div><div class="v '+(cls||'')+'">'+value+'</div></div>'}
function render(){
 if($('periodTitle')) $('periodTitle').textContent=monthLabel(period());
 const all=currentRows();
 const totals=all.reduce((a,x)=>{const c=x.c;a.cod+=c.cod;a.income+=c.totalIncome;a.expense+=c.adCost+c.groupCost+c.rtsDeficit;a.profit+=c.finalProfit;a.saver+=c.saverAlloc;a.deficit+=c.rtsDeficit;a.mgmt+=c.management;a.cs+=c.cs;a.owner+=c.owner;return a},{cod:0,income:0,expense:0,profit:0,saver:0,deficit:0,mgmt:0,cs:0,owner:0});
 if($('stats')) $('stats').innerHTML=statCard('Total COD',money(totals.cod))+statCard('Total pemasukan',money(totals.income),'pos')+statCard('Total biaya',money(totals.expense),'neg')+statCard('Profit akhir',money(totals.profit),totals.profit>=0?'pos':'neg')+statCard('Alokasi saver',money(totals.saver))+statCard('Defisit RTS',money(totals.deficit),totals.deficit?'neg':'');
 if($('profitChart')) {
 const monthKeys=[...new Set(data.records.map(r=>r.month))].sort().filter(m=>m<=period()).slice(-6);
 const trend=monthKeys.map(m=>({m,profit:data.records.filter(r=>r.month===m).reduce((sum,r)=>sum+calc(r).finalProfit,0)}));
 const maxAbs=Math.max(1,...trend.map(x=>Math.abs(x.profit)));
 $('profitChart').innerHTML=trend.length?trend.map(x=>'<div class="chartcol"><div class="chartvalue '+(x.profit<0?'neg':'pos')+'">'+(Math.abs(x.profit)>=1000000?(x.profit/1000000).toFixed(1)+' jt':Math.round(x.profit/1000)+' rb')+'</div><div class="chartbar" style="height:'+Math.max(4,Math.round(Math.abs(x.profit)/maxAbs*105))+'px;'+(x.profit<0?'background:linear-gradient(180deg,#fb8293,#a83c55)':'')+'"></div><div class="chartlabel">'+esc(monthLabel(x.m).split(' ')[0].slice(0,3))+'</div></div>').join(''):'<div class="empty" style="width:100%">Belum ada data rekap. Grafik akan terisi otomatis.</div>';
 const positive=all.filter(x=>x.c.finalProfit>0).length, negative=all.filter(x=>x.c.finalProfit<0).length, zero=all.filter(x=>x.c.finalProfit===0).length;
 $('closeStatus').innerHTML='<div class="statusrow"><span class="statusdot good"></span><span>Profit positif</span><span class="statuscount">'+positive+'</span></div><div class="statusrow"><span class="statusdot bad"></span><span>Rugi / minus</span><span class="statuscount">'+negative+'</span></div><div class="statusrow"><span class="statusdot"></span><span>Impas / belum profit</span><span class="statuscount">'+zero+'</span></div><div class="statusrow"><span class="statusdot '+(all.length?'good':'')+'"></span><span>Rekap toko tersimpan</span><span class="statuscount">'+all.length+'</span></div>';
 }
 if($('reportStats')) {
  const reportTotals=all.reduce((a,x)=>{const c=x.c;a.cod+=c.cod;a.codIncome+=c.codIncome;a.transfer+=Number(x.r.transfer)||0;a.saver+=c.saverAlloc;a.rts+=c.rts;a.rtsDeficit+=c.rtsDeficit;a.ads+=c.adCost;a.group+=c.groupCost;a.carry+=c.carriedLoss;a.profit+=c.finalProfit;a.management+=c.management;a.cs+=c.cs;a.owner+=c.owner;a.distributable+=Math.max(0,c.finalProfit);return a},{cod:0,codIncome:0,transfer:0,saver:0,rts:0,rtsDeficit:0,ads:0,group:0,carry:0,profit:0,management:0,cs:0,owner:0,distributable:0});
  $('reportStats').innerHTML=statCard('Profit bersih periode',money(reportTotals.profit),reportTotals.profit>=0?'pos':'neg')+statCard('Bagian Management · 50%',money(reportTotals.management))+statCard('Bagian CS · 20%',money(reportTotals.cs))+statCard('Bagian saya / Owner · 30%',money(reportTotals.owner));
  if($('reportStatus')) $('reportStatus').textContent=all.length?all.length+' toko tercatat · '+monthLabel(period()):'Belum ada rekap tersimpan untuk bulan ini.';
  if($('reportCashflow')) $('reportCashflow').innerHTML=[
   ['Total COD',reportTotals.cod],['COD masuk setelah saver',reportTotals.codIncome],['Cash / transfer',reportTotals.transfer],['Total pemasukan',reportTotals.codIncome+reportTotals.transfer],['Saver baru dialokasikan',reportTotals.saver],['Biaya RTS tercatat',reportTotals.rts],['Defisit RTS mengurangi profit',reportTotals.rtsDeficit],['Top-up iklan',reportTotals.ads],['Biaya grup / lainnya',reportTotals.group],['Minus lama yang diperhitungkan',reportTotals.carry]
  ].map(([label,value])=>'<div class="report-line"><span>'+label+'</span><strong>'+money(value)+'</strong></div>').join('');
  if($('reportRows')) $('reportRows').innerHTML=all.length?all.map(({r,c})=>'<tr><td class="store">'+esc(r.store)+'<span class="split">'+esc(r.advertiser||'Pengiklan belum diisi')+'</span></td><td>'+money(c.totalIncome)+'</td><td>'+money(c.adCost+c.groupCost+c.rtsDeficit)+'</td><td>'+money(c.carriedLoss)+'</td><td class="'+(c.finalProfit>=0?'pos':'neg')+'">'+money(c.finalProfit)+'</td><td>'+money(c.management)+'</td><td>'+money(c.cs)+'</td><td>'+money(c.owner)+'</td></tr>').join(''):'<tr><td colspan="8" class="empty">Belum ada data untuk periode ini.</td></tr>';
  if($('reportProfitNote')) $('reportProfitNote').textContent='Bagian Management, CS, dan Owner hanya dihitung dari profit positif per toko setelah biaya RTS yang tidak tertutup saver dan minus lama. Toko yang rugi tidak menghasilkan pembagian profit.';
 }
 if($('savedRecordSelect')) { const select=$('savedRecordSelect'); const selected=select.value; select.innerHTML=all.length?'<option value="">Pilih toko untuk diedit</option>'+all.map(({r})=>'<option value="'+esc(r.id)+'">'+esc(r.store)+' · '+esc(monthLabel(r.month))+'</option>').join(''):'<option value="">Belum ada rekap tersimpan</option>'; if(selected&&all.some(({r})=>r.id===selected))select.value=selected; }
 if($('rows')) {
 const query=$('search').value.trim().toLowerCase(), filter=$('profitFilter').value;
 const visible=all.filter(x=>(!query||(x.r.store+' '+x.r.advertiser).toLowerCase().includes(query))&&(filter==='all'||(filter==='profit'?x.c.finalProfit>0:x.c.finalProfit<=0)));
 $('rows').innerHTML=visible.map(({r,c})=>'<tr><td class="store">'+esc(r.store)+'<span class="split">'+esc(r.advertiser||'Pengiklan belum diisi')+'</span><span class="split">'+c.saverPct+'% saver / '+(100-c.saverPct)+'% COD</span></td><td>'+money(c.cod)+'</td><td>'+money(c.codIncome)+'</td><td>'+money(c.saverAlloc)+'</td><td>'+money(r.transfer)+'</td><td>'+money(c.rts)+'</td><td>'+money(c.saverAvailable)+'</td><td class="'+(c.rtsDeficit?'neg':'')+'">'+money(c.rtsDeficit)+'</td><td>'+money(c.saverAlloc)+'</td><td>'+money(c.saverEnd+c.saverAlloc)+'</td><td>'+money(c.adCost+c.groupCost)+'</td><td>'+money(c.carriedLoss)+'</td><td class="'+(c.finalProfit>=0?'pos':'neg')+'">'+money(c.finalProfit)+'<span class="split">'+(c.finalProfit>0?'Profit dapat dibagi':c.finalProfit<0?'Minus dibawa: '+money(c.lossOut):'Impas')+'</span></td><td>'+money(c.management)+'</td><td>'+money(c.cs)+'</td><td>'+money(c.owner)+'</td><td><button class="small" data-edit="'+esc(r.id)+'">Edit</button> <button class="small danger" data-delete="'+esc(r.id)+'">Hapus</button></td></tr>').join('');
 $('empty').classList.toggle('hidden',visible.length>0);
 if(!all.length)$('empty').textContent='Belum ada data untuk periode ini. Klik “Tambah / Update Toko” untuk mulai.';
 else if(!visible.length)$('empty').textContent='Tidak ada toko yang cocok dengan filter.';
 $('carryInfo').textContent='Minus yang dibawa: dihitung otomatis dari periode sebelumnya. Jika belum ada data sebelumnya, gunakan saldo saver awal dan minus awal pada pengaturan awal.';
 }
}
function clearForm(){ if(!$('recordForm')) return; $('recordForm').reset();$('recordId').value='';$('saverPct').value='30';$('openingSaver').value='0';$('openingLoss').value='0';['cod1','cod2','cod3','cod4','transfer','rts','ads','groupTopup'].forEach(x=>$(x).value='0');$('formTitle').textContent='Input rekap toko';$('saveBtn').textContent='Simpan Rekap';$('openingSaver').disabled=false;updateCarryInfo()}
function updateCarryInfo(){if(!$('carryInfo')||!$('store')) return;const sid=$('recordId').value;const store=sid?data.records.find(r=>r.id===sid):null;const name=$('store').value.trim();const m=period();const existing=store||data.stores.find(s=>s.store.toLowerCase()===name.toLowerCase());const prev=existing?prevRecord(existing.id,m):null;if(prev){const c=calc(prev);$('carryInfo').textContent='Data sebelumnya ditemukan ('+monthLabel(prev.month)+'): saldo saver awal bulan ini = sisa setelah RTS '+money(c.saverEnd)+' + saver baru bulan lalu '+money(saverAllocOf(prev))+' = '+money(c.saverEnd+saverAllocOf(prev))+'. Minus berjalan otomatis = '+money(c.lossOut)+'.';$('openingSaver').disabled=true}else{$('carryInfo').textContent='Belum ada rekap sebelumnya untuk toko ini. Saldo saver awal dan minus awal bisa diisi jika toko sudah berjalan sebelum memakai aplikasi.';$('openingSaver').disabled=false}}
function editRecord(r){$('recordId').value=r.id;$('advertiser').value=r.advertiser||'';$('store').value=r.store;$('saverPct').value=String(r.saverPct==null?30:r.saverPct);$('openingSaver').value=r.openingSaver||0;$('openingLoss').value=r.openingLoss||0;['cod1','cod2','cod3','cod4','transfer','rts','ads','groupTopup'].forEach(k=>$(k).value=Number(r[k])||0);$('memo').value=r.memo||'';$('formTitle').textContent='Edit rekap: '+r.store;$('saveBtn').textContent='Simpan Perubahan';updateCarryInfo();$('editor').scrollIntoView({behavior:'smooth',block:'start'})}

if(window.gsap&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){window.gsap.from('.top',{y:-10,opacity:0,duration:.65,ease:'power3.out'});window.gsap.from('.note',{y:8,opacity:0,duration:.55,delay:.08,ease:'power3.out'});}
$('month').value=monthNow();
$('month').addEventListener('change',()=>{clearForm();render()});
if(!$('recordForm')&&$('addBtn')) $('addBtn').addEventListener('click',()=>{window.location.href='./rekap.html'});
if($('recordForm')) {
if($('editSelectedRecord')) $('editSelectedRecord').addEventListener('click',()=>{const selected=$('savedRecordSelect').value;const r=data.records.find(x=>x.id===selected);if(!r){alert('Pilih rekap toko yang ingin diedit.');return}editRecord(r)});
$('addBtn').addEventListener('click',()=>{clearForm();$('editor').scrollIntoView({behavior:'smooth',block:'start'});$('store').focus()});
$('cancelBtn').addEventListener('click',clearForm);
$('store').addEventListener('input',updateCarryInfo);
$('recordForm').addEventListener('submit',e=>{
 e.preventDefault();const month=period(),storeName=$('store').value.trim();if(!storeName){alert('Nama toko wajib diisi.');return}
 let oldId=$('recordId').value;let old=oldId?data.records.find(r=>r.id===oldId):null;
 let storeObj=old?data.stores.find(s=>s.id===old.storeId):data.stores.find(s=>s.store.toLowerCase()===storeName.toLowerCase());
 if(!storeObj){storeObj={id:id(),store:storeName,advertiser:$('advertiser').value.trim()};data.stores.push(storeObj)}
 storeObj.store=storeName;storeObj.advertiser=$('advertiser').value.trim();
 const collision=data.records.find(r=>r.storeId===storeObj.id&&r.month===month&&r.id!==oldId);if(collision){alert('Rekap toko ini sudah ada pada bulan terpilih. Gunakan tombol Edit pada baris yang ada.');return}
 const r={id:old?old.id:id(),storeId:storeObj.id,store:storeName,advertiser:$('advertiser').value.trim(),month:month,saverPct:Number($('saverPct').value),openingSaver:num('openingSaver'),openingLoss:num('openingLoss'),cod1:num('cod1'),cod2:num('cod2'),cod3:num('cod3'),cod4:num('cod4'),transfer:num('transfer'),rts:num('rts'),ads:num('ads'),groupTopup:num('groupTopup'),memo:$('memo').value.trim(),updatedAt:new Date().toISOString()};
 if(old){data.records[data.records.findIndex(x=>x.id===old.id)]=r}else{data.records.push(r)}
 persist();clearForm();$('editor').scrollIntoView({behavior:'smooth',block:'start'});
});
$('rows').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const r=data.records.find(x=>x.id===b.dataset.edit||x.id===b.dataset.delete);if(!r)return;if(b.dataset.edit)editRecord(r);if(b.dataset.delete&&confirm('Hapus rekap '+r.store+' periode '+monthLabel(r.month)+'? Perhitungan bulan berikutnya akan ikut diperbarui.')){data.records=data.records.filter(x=>x.id!==r.id);persist()}});
$('search').addEventListener('input',render);$('profitFilter').addEventListener('change',render);$('clearFilter').addEventListener('click',()=>{$('search').value='';$('profitFilter').value='all';render()});
}
$('exportBtn').addEventListener('click',()=>{const all=currentRows();const headers=['Periode','Pengiklan','Toko','Total COD','Persen saver','COD pemasukan','Saver alokasi','Cash transfer','RTS','Saver tersedia','Defisit RTS','Topup iklan','Topup grup','Minus dibawa','Profit akhir','Management 50%','CS 20%','Owner 30%','Minus dibawa ke depan'];const lines=[headers].concat(all.map(({r,c})=>[r.month,r.advertiser,r.store,c.cod,c.saverPct,c.codIncome,c.saverAlloc,r.transfer,r.rts,c.saverAvailable,c.rtsDeficit,r.ads,r.groupTopup,c.carriedLoss,c.finalProfit,c.management,c.cs,c.owner,c.lossOut]));const csv=lines.map(row=>row.map(v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"').join(',')).join('\r\n');download(csv,'ayundashop-rekap-'+period()+'.csv','text/csv;charset=utf-8')});
$('backupBtn').addEventListener('click',()=>download(JSON.stringify({app:'AyundaShop Finance',version:2,exportedAt:new Date().toISOString(),data:data},null,2),'ayundashop-finance-backup.json','application/json'));
$('restoreBtn').addEventListener('click',()=>$('restoreFile').click());
$('restoreFile').addEventListener('change',async e=>{const file=e.target.files&&e.target.files[0];if(!file)return;try{const parsed=JSON.parse(await file.text());const d=parsed.data||parsed;if(!Array.isArray(d.stores)||!Array.isArray(d.records))throw new Error('Format backup tidak cocok');if(!confirm('Restore akan mengganti seluruh data yang saat ini tersimpan di browser. Lanjutkan?'))return;data=d;persist();clearForm();alert('Backup berhasil dipulihkan.')}catch(err){alert('Gagal restore: '+err.message)}finally{e.target.value=''}});
function download(content,name,type){const blob=new Blob([content],{type:type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
load();if($('recordForm'))clearForm();render();
})();
