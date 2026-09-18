const KEY="baito_manager_v1";
const defaults={settings:{jobName:"",wage:1000,hours:3,transport:0,ot:0,startMoney:0},shifts:{},expenses:[]};
let data=load(), view=new Date(); view.setDate(1), editKey=null;
function load(){try{const x=JSON.parse(localStorage.getItem(KEY));return x?{settings:{...defaults.settings,...x.settings},shifts:x.shifts||{},expenses:x.expenses||[]}:structuredClone(defaults)}catch{return structuredClone(defaults)}}
function save(){localStorage.setItem(KEY,JSON.stringify(data))}
const yen=n=>"¥"+Math.round(Number(n)||0).toLocaleString("ja-JP");
const pad=n=>String(n).padStart(2,"0");
const key=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parse=k=>{let [y,m,d]=k.split("-").map(Number);return new Date(y,m-1,d)};
function pay(s){return Number(s.hours||0)*Number(s.wage||0)+Number(s.transport||0)+Number(s.overtime||0)*Number(s.otPerMin||0)}
function entries(){return Object.entries(data.shifts).map(([date,s])=>({date,...s})).sort((a,b)=>a.date.localeCompare(b.date))}
function expensesTotal(){return data.expenses.reduce((a,x)=>a+Number(x.amount||0),0)}
function incomeTotal(){return entries().reduce((a,x)=>a+pay(x),0)}
function balance(){return Number(data.settings.startMoney||0)+incomeTotal()-expensesTotal()}
function show(id){document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));document.getElementById(id).classList.add("active");document.querySelectorAll("nav button").forEach(x=>x.classList.toggle("active",x.dataset.screen===id));renderAll()}
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>show(b.dataset.screen));
document.getElementById("settingsBtn").onclick=()=>show("settings");
document.getElementById("calendarLink").onclick=()=>show("calendar");

function renderHome(){
 let now=new Date(), es=entries().filter(x=>{let d=parse(x.date);return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()});
 document.getElementById("balance").textContent=yen(balance());
 document.getElementById("balanceInfo").textContent=`登録シフト ${entries().length}回・支出 ${data.expenses.length}件`;
 document.getElementById("monthIncome").textContent=yen(es.reduce((a,x)=>a+pay(x),0));
 document.getElementById("monthShifts").textContent=es.length+"回";
 document.getElementById("totalIncome").textContent=yen(incomeTotal());
 document.getElementById("allShifts").textContent=entries().length+"回";
 let list=document.getElementById("upcoming"), today=key(now), up=es.filter(x=>x.date>=today).slice(0,6);
 list.innerHTML=up.length?up.map(x=>`<div class="listrow"><div><b>${x.date.replaceAll("-","/")}</b><div class="muted">${x.status==="done"?"勤務済み":"勤務予定"}・${x.hours}時間</div></div><b>${yen(pay(x))}</b></div>`).join(""):'<div class="empty">今月のシフトはありません</div>';
}
function renderCalendar(){
 let y=view.getFullYear(),m=view.getMonth(),first=new Date(y,m,1),start=new Date(y,m,1-first.getDay()),g=document.getElementById("calgrid"),today=key(new Date());
 document.getElementById("monthTitle").textContent=`${y}年${m+1}月`;g.innerHTML="";
 for(let i=0;i<42;i++){let d=new Date(start);d.setDate(start.getDate()+i),k=key(d),s=data.shifts[k],c=document.createElement("button");c.className="day"+(d.getMonth()!=m?" other":"")+(k===today?" today":"");c.innerHTML=`<div class="daynum">${d.getDate()}</div>`;if(s){let z=document.createElement("div");z.className="shift "+(s.status==="done"?"done":"planned");z.textContent=yen(pay(s));c.appendChild(z)}c.onclick=()=>openShift(k);g.appendChild(c)}
}
document.getElementById("prev").onclick=()=>{view.setMonth(view.getMonth()-1);renderCalendar()};document.getElementById("next").onclick=()=>{view.setMonth(view.getMonth()+1);renderCalendar()};

function fillSettings(){let s=data.settings;jobName.value=s.jobName;wage.value=s.wage;hours.value=s.hours;transport.value=s.transport;ot.value=s.ot;startMoney.value=s.startMoney}
saveSettings.onclick=()=>{data.settings={jobName:jobName.value.trim(),wage:+wage.value||0,hours:+hours.value||0,transport:+transport.value||0,ot:+ot.value||0,startMoney:+startMoney.value||0};save();renderAll();alert("設定を保存しました。")};

function openShift(k){editKey=k;let s=data.shifts[k],d=data.settings;shiftDate.textContent=k.replaceAll("-","/");status.value=s?.status||"planned";sHours.value=s?.hours??d.hours;sWage.value=s?.wage??d.wage;sTransport.value=s?.transport??d.transport;sOt.value=s?.overtime??0;deleteShift.style.display=s?"block":"none";previewPay();shiftModal.classList.remove("hidden")}
document.querySelectorAll("[data-close]").forEach(x=>x.onclick=()=>document.getElementById(x.dataset.close).classList.add("hidden"));
["sHours","sWage","sTransport","sOt"].forEach(id=>document.getElementById(id).oninput=previewPay);
function previewPay(){preview.textContent=yen({hours:+sHours.value||0,wage:+sWage.value||0,transport:+sTransport.value||0,overtime:+sOt.value||0,otPerMin:+data.settings.ot||0})}
saveShift.onclick=()=>{data.shifts[editKey]={status:status.value,hours:+sHours.value||0,wage:+sWage.value||0,transport:+sTransport.value||0,overtime:+sOt.value||0,otPerMin:+data.settings.ot||0};save();shiftModal.classList.add("hidden");renderAll()}
deleteShift.onclick=()=>{if(confirm("このシフトを削除しますか？")){delete data.shifts[editKey];save();shiftModal.classList.add("hidden");renderAll()}};

addExpense.onclick=()=>{eDate.value=key(new Date());eAmount.value="";eName.value="";expenseModal.classList.remove("hidden")}
saveExpense.onclick=()=>{let amount=+eAmount.value;if(!eDate.value||amount<=0){alert("日付と金額を入力してください。");return}data.expenses.push({date:eDate.value,amount,name:eName.value.trim()});save();expenseModal.classList.add("hidden");renderAll()}
function renderMoney(){moneyBalance.textContent=yen(balance());moneyIncome.textContent=yen(incomeTotal());moneyExpense.textContent=yen(expensesTotal());let arr=[...data.expenses].sort((a,b)=>b.date.localeCompare(a.date));expenses.innerHTML=arr.length?arr.map((x,i)=>`<div class="listrow"><div><b>${esc(x.name||"支出")}</b><div class="muted">${x.date}</div></div><div><b>-${yen(x.amount)}</b> <button class="link" onclick="delExp(${i})">削除</button></div></div>`).join(""):'<div class="empty">支出はありません</div>'}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",""":"&quot;","'":"&#039;"}[c]))}
window.delExp=i=>{let arr=[...data.expenses].sort((a,b)=>b.date.localeCompare(a.date)),target=arr[i],idx=data.expenses.indexOf(target);if(confirm("この支出を削除しますか？")){data.expenses.splice(idx,1);save();renderAll()}};
clear.onclick=()=>{if(confirm("すべてのデータを削除しますか？")){data=structuredClone(defaults);save();fillSettings();renderAll()}};
function renderAll(){renderHome();renderCalendar();renderMoney()}
fillSettings();renderAll();if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
