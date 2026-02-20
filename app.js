// ================= DATA =================

const CATEGORIES = [
 { id:'road', name:'Broken Road', icon:'🛣️' },
 { id:'light', name:'Streetlight', icon:'💡' },
 { id:'water', name:'Water Leak', icon:'💧' },
 { id:'waste', name:'Garbage', icon:'🗑️' },
 { id:'drain', name:'Drainage', icon:'🌊' },
 { id:'other', name:'Other', icon:'📋' }
];

// ================= STORAGE =================

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
     item.history.push({status:newStatus,date:new Date().toISOString()});
     localStorage.setItem(this.key,JSON.stringify(issues));
   }
 }
}

const db=new StorageManager();

// ================= AUTH =================

class Auth{
 constructor(){ this.user=null; }

 login(e){
   e.preventDefault();
   const u=document.getElementById('login-user').value;
   const p=document.getElementById('login-pass').value;

   if(u==='admin@nammudepanchayat.com' && p==='admin@123'){
     this.user={role:'admin'};
     app.router.navigate('dashboard');
   }else alert('Invalid admin login');
 }

 logout(){
   this.user=null;
   app.router.navigate('home');
 }
}

// ================= REPORT CONTROLLER =================

const ReportController={
 selectedCategory:null,
 images:[],

 init(){
   const grid=document.getElementById('category-list');
   grid.innerHTML=CATEGORIES.map(c=>`
     <div class="cat-card" onclick="app.controllers.report.selectCat('${c.id}',this)">
       <span class="cat-icon">${c.icon}</span>
       <span>${c.name}</span>
     </div>
   `).join('');

   document.getElementById('issue-title').addEventListener('input',e=>{
     document.getElementById('title-count').innerText=e.target.value.length;
   });
 },

 selectCat(id,el){
   this.selectedCategory=id;
   document.querySelectorAll('.cat-card').forEach(c=>c.classList.remove('selected'));
   el.classList.add('selected');
 },

 // ===== GPS + MAP =====
 detectLocation(){
   if(!navigator.geolocation){ alert('GPS not supported'); return; }

   const btn=document.querySelector('#view-report .btn-secondary');
   btn.innerText="Detecting...";

   navigator.geolocation.getCurrentPosition(pos=>{
     const lat=pos.coords.latitude;
     const lng=pos.coords.longitude;

     const geocoder=new google.maps.Geocoder();

     geocoder.geocode({location:{lat,lng}},(res,status)=>{
       let address=`${lat.toFixed(4)}, ${lng.toFixed(4)}`;

       if(status==='OK' && res[0]){
         address=res[0].formatted_address;
       }

       document.getElementById('detected-address').innerText="📍 "+address;
       document.getElementById('final-location').value=address;

       const map=new google.maps.Map(document.getElementById("map"),{
         center:{lat,lng},
         zoom:15
       });

       new google.maps.Marker({position:{lat,lng},map});

       btn.innerText="Detect Again";
     });

   },()=>{
     alert('Location permission denied');
     btn.innerText="Detect My Location";
   });
 },

 // ===== IMAGE HANDLING =====
 handleFiles(input){
   const files=[...input.files].slice(0,3);
   this.images=[];
   const preview=document.getElementById('preview-area');
   preview.innerHTML='';

   files.forEach(file=>{
     if(file.size>2*1024*1024){
       alert('Max image size 2MB');
       return;
     }
     const reader=new FileReader();
     reader.onload=e=>{
       this.images.push(e.target.result);
       const img=document.createElement('img');
       img.src=e.target.result;
       img.style.width='60px';
       img.style.height='60px';
       img.style.objectFit='cover';
       img.style.borderRadius='6px';
       preview.appendChild(img);
     };
     reader.readAsDataURL(file);
   });

   document.getElementById('photo-count').innerText=this.images.length+"/3 images";
 },

 // ===== SUBMIT =====
 submit(e){
   e.preventDefault();

   const loc=document.getElementById('final-location').value.trim();
   if(!this.selectedCategory){ alert('Select category'); return; }
   if(!loc){ alert('Detect location'); return; }

   const issue={
     id:'PTH-'+Date.now().toString().slice(-6),
     category:this.selectedCategory,
     title:document.getElementById('issue-title').value,
     desc:document.getElementById('issue-desc').value,
     images:this.images,
     location:loc,
     status:'Submitted',
     date:new Date().toLocaleDateString(),
     history:[{status:'Submitted',date:new Date().toISOString()}]
   };

   db.add(issue);
   document.getElementById('success-tracking-id').innerText=issue.id;

   app.router.navigate('success');

   e.target.reset();
   this.images=[];
   this.selectedCategory=null;
   document.getElementById('preview-area').innerHTML='';
   document.querySelectorAll('.cat-card').forEach(c=>c.classList.remove('selected'));
 }
};

// ================= TRACK =================

const TrackController={
 search(){
   const id=document.getElementById('track-input').value.trim();
   const issue=db.getById(id);

   if(!issue){
     document.getElementById('track-error').classList.remove('hidden');
     return;
   }

   document.getElementById('track-error').classList.add('hidden');
   document.getElementById('track-result').classList.remove('hidden');

   document.getElementById('track-result').innerHTML=`
     <div class="card-action" style="text-align:left">
       <h3>${issue.title}</h3>
       <p><strong>Location:</strong> ${issue.location}</p>
       <p><strong>Status:</strong> ${issue.status}</p>
       <p>${issue.desc}</p>
     </div>
   `;
 }
};

// ================= DASHBOARD =================

const DashboardController={
 load(){
   if(!app.auth.user){ app.router.navigate('login'); return; }
   this.renderList();
 },

 renderList(){
   const statusFilter=document.getElementById('filter-status').value;
   const catFilter=document.getElementById('filter-category').value;

   let issues=db.getAll();

   if(statusFilter!=='all')
     issues=issues.filter(i=>i.status===statusFilter);

   if(catFilter!=='all')
     issues=issues.filter(i=>i.category===catFilter);

   document.getElementById('dash-table-body').innerHTML=issues.map(i=>`
     <tr>
       <td>${i.id}</td>
       <td>${CATEGORIES.find(c=>c.id===i.category)?.name}</td>
       <td>${i.location}</td>
       <td>${i.status}</td>
       <td>
       ${i.status!=='Resolved'
        ?`<button class="btn-primary" onclick="app.controllers.dashboard.resolve('${i.id}')">Resolve</button>`
        :'Done'}
       </td>
     </tr>
   `).join('');
 },

 resolve(id){
   db.updateStatus(id,'Resolved');
   this.renderList();
 }
};

// ================= ROUTER =================

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
     document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
     document.getElementById('view-'+view).classList.remove('hidden');

     if(view==='report') ReportController.init();
     if(view==='dashboard') DashboardController.load();

     window.scrollTo(0,0);
   }
 }
};

// ================= INIT =================

document.addEventListener('DOMContentLoaded',()=>{

 app.router.navigate('home');

 // populate dashboard category filter
 const sel=document.getElementById('filter-category');
 if(sel){
   CATEGORIES.forEach(c=>{
     const o=document.createElement('option');
     o.value=c.id;
     o.innerText=c.name;
     sel.appendChild(o);
   });
 }

 // theme toggle
 const themeBtn=document.getElementById('theme-toggle');
 if(themeBtn){
   themeBtn.addEventListener('click',()=>{
     if(document.documentElement.getAttribute('data-theme')==='dark'){
       document.documentElement.removeAttribute('data-theme');
       themeBtn.innerText='🌙';
     }else{
       document.documentElement.setAttribute('data-theme','dark');
       themeBtn.innerText='☀️';
     }
   });
 }

});
