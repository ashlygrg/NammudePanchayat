// ===================== CONFIG =====================

// Panchayat department routing
const DEPARTMENTS = {
 road:"Public Works Department",
 light:"KSEB",
 water:"Water Authority",
 waste:"Sanitation Wing",
 drain:"Flood Control",
 other:"General Administration"
};

// Priority auto detection
function getPriority(category){
 if(category==="drain" || category==="light") return "High";
 if(category==="water") return "Urgent";
 return "Normal";
}

// ===================== DATA =====================

const CATEGORIES = [
 { id:'road', name:'Broken Road', icon:'🛣️' },
 { id:'light', name:'Streetlight', icon:'💡' },
 { id:'water', name:'Water Leak', icon:'💧' },
 { id:'waste', name:'Garbage', icon:'🗑️' },
 { id:'drain', name:'Drainage/Flood', icon:'🌊' },
 { id:'other', name:'Other', icon:'📋' }
];

// ===================== STORAGE =====================

class StorageManager{
 constructor(){
   this.key='np_issues';
   if(!localStorage.getItem(this.key)){
     localStorage.setItem(this.key,JSON.stringify([]));
   }
 }
 getAll(){ return JSON.parse(localStorage.getItem(this.key)||'[]'); }
 add(issue){
   const issues=this.getAll();
   issues.push(issue);
   localStorage.setItem(this.key,JSON.stringify(issues));
 }
 getById(id){ return this.getAll().find(i=>i.id===id); }
 updateStatus(id,newStatus){
   const issues=this.getAll();
   const item=issues.find(i=>i.id===id);
   if(item){
     item.status=newStatus;
     item.history.push({
       status:newStatus,
       date:new Date().toISOString()
     });
     localStorage.setItem(this.key,JSON.stringify(issues));
   }
 }
}

const db=new StorageManager();

// ===================== TOAST NOTIFICATION =====================

function showToast(msg){
 let t=document.createElement("div");
 t.innerText=msg;
 t.style.position="fixed";
 t.style.bottom="20px";
 t.style.right="20px";
 t.style.background="#007a5e";
 t.style.color="white";
 t.style.padding="12px 18px";
 t.style.borderRadius="10px";
 t.style.boxShadow="0 8px 20px rgba(0,0,0,.2)";
 document.body.appendChild(t);
 setTimeout(()=>t.remove(),3000);
}

// ===================== AUTH =====================

class Auth{
 constructor(){ this.user=null; }
 login(e){
   e.preventDefault();
   let u=login-user.value;
   let p=login-pass.value;
   if(u==='admin@nammudepanchayat.com' && p==='admin@123'){
     this.user={role:'admin'};
     showToast("Admin login successful");
     app.router.navigate('dashboard');
   }else alert("Invalid login");
 }
 logout(){
   this.user=null;
   showToast("Logged out");
   app.router.navigate('home');
 }
}

// ===================== REPORT CONTROLLER =====================

const ReportController={
 selectedCategory:null,
 images:[],
 lat:null,
 lng:null,

 init(){
   const grid=document.getElementById('category-list');
   grid.innerHTML=CATEGORIES.map(c=>`
    <div class="cat-card"
      onclick="app.controllers.report.selectCat('${c.id}',this)">
      <span class="cat-icon">${c.icon}</span>
      <span>${c.name}</span>
    </div>`).join('');
 },

 selectCat(id,el){
   this.selectedCategory=id;
   document.querySelectorAll('.cat-card')
     .forEach(c=>c.classList.remove('selected'));
   el.classList.add('selected');
 },

 // ========= REAL GPS + FREE ADDRESS API =========
 detectLocation(){

   if(!navigator.geolocation){
     alert("GPS not supported"); return;
   }

   showToast("Detecting location...");

   navigator.geolocation.getCurrentPosition(async pos=>{
     this.lat=pos.coords.latitude;
     this.lng=pos.coords.longitude;

     // reverse geocode (FREE OpenStreetMap)
     const url=`https://nominatim.openstreetmap.org/reverse?format=json&lat=${this.lat}&lon=${this.lng}`;
     const res=await fetch(url);
     const data=await res.json();

     const address=data.display_name || `${this.lat}, ${this.lng}`;

     document.getElementById('detected-address').innerText="📍 "+address;
     document.getElementById('final-location').value=address;

     // map preview (OpenStreetMap embed)
     document.getElementById("map").innerHTML=
     `<iframe width="100%" height="100%" style="border-radius:12px"
       src="https://www.openstreetmap.org/export/embed.html?bbox=${this.lng-0.01}%2C${this.lat-0.01}%2C${this.lng+0.01}%2C${this.lat+0.01}&layer=mapnik&marker=${this.lat}%2C${this.lng}">
     </iframe>`;

     showToast("Location detected");

   },()=>alert("Location permission denied"));
 },

 // ========= IMAGE =========
 handleFiles(input){
   const files=[...input.files].slice(0,3);
   this.images=[];
   const preview=document.getElementById('preview-area');
   preview.innerHTML='';

   files.forEach(file=>{
     if(file.size>2*1024*1024){
       alert("Image max 2MB"); return;
     }
     const r=new FileReader();
     r.onload=e=>{
       this.images.push(e.target.result);
       preview.innerHTML+=`<img src="${e.target.result}"
         style="width:60px;height:60px;border-radius:6px;">`;
     };
     r.readAsDataURL(file);
   });
 },

 // ========= SUBMIT =========
 submit(e){
   e.preventDefault();

   const loc=final-location.value.trim();
   if(!this.selectedCategory){alert("Select category");return;}
   if(!loc){alert("Detect location");return;}

   const issue={
     id:"PTH-"+Date.now().toString().slice(-6),
     category:this.selectedCategory,
     title:issue-title.value,
     desc:issue-desc.value,
     location:loc,
     images:this.images,
     priority:getPriority(this.selectedCategory),
     department:DEPARTMENTS[this.selectedCategory],
     status:"Submitted",
     date:new Date().toLocaleDateString(),
     history:[{
       status:"Submitted",
       date:new Date().toISOString()
     }]
   };

   db.add(issue);

   success-tracking-id.innerText=issue.id;
   showToast("Report submitted successfully");
   app.router.navigate('success');
 }
};

// ===================== TRACK =====================

const TrackController={
 search(){
   const id=track-input.value.trim();
   const issue=db.getById(id);

   if(!issue){
     track-error.classList.remove('hidden');
     return;
   }

   track-error.classList.add('hidden');
   track-result.classList.remove('hidden');

   track-result.innerHTML=`
    <div class="card-action" style="text-align:left">
      <h3>${issue.title}</h3>
      <p><b>Department:</b> ${issue.department}</p>
      <p><b>Priority:</b> ${issue.priority}</p>
      <p><b>Location:</b> ${issue.location}</p>
      <p><b>Status:</b> ${issue.status}</p>

      <h4 style="margin-top:10px">Timeline</h4>
      ${issue.history.map(h=>`
        <div>${new Date(h.date).toLocaleDateString()} - ${h.status}</div>
      `).join('')}
    </div>`;
 }
};

// ===================== DASHBOARD =====================

const DashboardController={
 load(){
   if(!app.auth.user){app.router.navigate('login');return;}
   this.renderList();
 },

 renderList(){
   let issues=db.getAll();
   dash-table-body.innerHTML=issues.map(i=>`
   <tr>
     <td>${i.id}</td>
     <td>${i.category}</td>
     <td>${i.location}</td>
     <td>${i.status}</td>
     <td>
      ${i.status!=="Resolved"
       ?`<button onclick="app.controllers.dashboard.resolve('${i.id}')">Resolve</button>`
       :"Done"}
     </td>
   </tr>`).join('');
 },

 resolve(id){
   db.updateStatus(id,"Resolved");
   showToast("Issue marked resolved");
   this.renderList();
 }
};

// ===================== ROUTER =====================

const authService=new Auth();

const app={
 auth:authService,
 controllers:{
   report:ReportController,
   track:TrackController,
   auth:authService,
   dashboard:DashboardController
 },
 router:{
   navigate(view){
     document.querySelectorAll('.view')
       .forEach(v=>v.classList.add('hidden'));
     document.getElementById('view-'+view)
       .classList.remove('hidden');

     if(view==="report") ReportController.init();
     if(view==="dashboard") DashboardController.load();
     window.scrollTo(0,0);
   }
 }
};

// ===================== INIT =====================

document.addEventListener("DOMContentLoaded",()=>{
 app.router.navigate('home');
});
