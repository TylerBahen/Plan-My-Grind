//set up service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js")
    .then(() => {
        console.log("Service Worker registered, we are clear for takeoff...")
    })
    .catch(err => console.error("SW registration failed:", err));

}

const contactsSupported = "contacts" in navigator && "ContactsManager" in window;

//Grab when the page changes hash url and handle it
window.addEventListener('hashchange',() => {
  const page = window.location.hash.replace('#','')
  closepopups()
  switch (page){
    case '':
    case 'Home':
      changeview('Home')
      break
    case 'Goals':
    case 'Planner':
    case 'People':
    case 'Tasks':
      changeview(page)
      break
    case 'Settings':
    case 'NewPerson':
    case 'NewTask':
    case 'NewEvent':
      openpopup(page)
      break
  }
})

//Window changing thingy
function changeview(window){
  if (window!='Planner'){
    document.getElementById('title').innerHTML = window
  } else {
    document.getElementById('title').innerHTML = selectedMonth
  }
  const windows = ['Goals', 'Planner', 'Home', 'People', 'Tasks']
    windows.forEach((i) => {
        document.getElementById(i).style.visibility = 'hidden'
    })
    document.getElementById(window).style.visibility = 'visible'
}

//Emit to the service worker
function emit(action,messageRaw = {}){
  const message = messageRaw
  message.action = action
    navigator.serviceWorker.ready.then(reg => {
        reg.active.postMessage(message);
    });
}

//Close any popup windows
function closepopups(){
  const popups = ['Settings','NewPerson','NewTask','NewEvent']
  popups.forEach((popup) => {
    document.getElementById(popup).style.visibility = 'hidden'
  })
  document.getElementById('blanket').style.visibility = 'hidden'
}
//Open the specified window
function openpopup(window){
  document.getElementById(window).style.visibility = 'visible'
  document.getElementById('blanket').style.visibility = 'visible'
}

//the backward navigation function for popup windows
function navBack(){
  history.back()
}

//pull all the contacts and put them on the page
var people = []
function refreshcontacts(){
  const contactsraw = localStorage.getItem('contacts')
  var contacts
  if (contactsraw==null){
    contacts = []
  } else {
    contacts = JSON.parse(contactsraw)
  }
  var display = ''
  contacts.forEach(contact => {
    display+=`<div class="person"><p><b>${contact.name}</b></p>`
    if (contact.tel!=[]){
      contact.tel.forEach(number => {
        display+=`<p>${formatPhone(number)} : <a href="tel:${number}">Call</a> / <a href="sms:${number}">Text</a></p>`
      })
    }
    if (contact.email!=[]){
      contact.email.forEach(address => {
        display+=`<p>${address} : <a href="mailto:${address}">Email</a></p>`
      })
    }
    display+='</div>'
  })
  document.getElementById('peopleDisplay').innerHTML = display
  people = contacts
}

//Take form stuff and create contact
function newPerson(){
  const cn = document.getElementById('contactName')
  const ct = document.getElementById('contactTel')
  const ce = document.getElementById('contactEmail')
  if (cn.value!='' && (ct.value!='' || ce.value!='')){
    var tel = []
    if (toDigits(ct.value)!=''){
      tel = [toDigits(ct.value)]
    }
    var email = []
    if (ce.value!=''){
      email = [ce.value]
    }
    var cid = 1000+Math.floor(Math.random()*9000)
      while (people.find(o => o.id == cid)!=undefined){
        console.log('Prevented ID Collision')
        cid = 1000+Math.floor(Math.random()*9000)
    }
    people.push({'name':cn.value,'tel':tel,'email':email,'id':cid})
    localStorage.setItem('contacts',JSON.stringify(people))
    cn.value = ''
    ct.value = ''
    ce.value = ''
    window.location.replace('#People')
    refreshcontacts()
  }
}

//upload contacts from device using the experimental feature
async function uploadContacts(){
  const props = ["name", "email", "tel"];
  const opts = { multiple: true };
  try { 
    const contacts = await navigator.contacts.select(props, opts);
    contacts.forEach(contact => {
      var numbers = []
      contact.tel.forEach(number => {
        numbers.push(toDigits(number))
      })
      var cid = 1000+Math.floor(Math.random()*9000)
      while (people.find(o => o.id == cid)!=undefined){
        console.log('Prevented ID Collision')
        cid = 1000+Math.floor(Math.random()*9000)
      }
      people.push({'name':contact.name[0],'tel':[...new Set(numbers)],'email':[...new Set(contact.email)],'id':cid})
    })
    localStorage.setItem('contacts',JSON.stringify(people))
    window.location.replace('#People')
    //emit('notify',{'title':"Plan My Grind",'body':'Contacts Succesfully Uploaded'})
    refreshcontacts()
  } catch (err) {
    window.alert(err);
  }
}

//Phone Number Formatting
function toDigits(phone) {
  const d = phone.replace(/\D/g, "");
  return d.slice(-10);
}
function formatPhone(digits) {
  const d = digits.replace(/\D/g, "");
  return d.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
}

//Ask the service worker for the tasks and load them up
async function refreshtasks(){
  var tasksRaw = localStorage.getItem('tasks')
  if (tasksRaw==null){
    tasksRaw = []
  } else {
    tasksRaw = JSON.parse(tasksRaw)
  }
  tasks = []
  var incompleteDisplay = ''
  var completeDisplay = ''
  tasksRaw.forEach(task => {
    //TODO: Pull task from service worker db, update completion status
    const display = `<div class="task"><p><b>${task.title}</b></p><p>${task.body}</p>`
    if (task.completed==0){
      incompleteDisplay+=display+`<button class="completeTask" onclick="markComplete('${task.id}')">Mark Complete</button></div>`
    } else {
      completeDisplay+=display+`<button class="removeTask" onclick="forgetTask('${task.id}')">Remove From Completed</button></div>`
    }
    tasks.push(task)
  })
  var fullDisplay = ''
  if (incompleteDisplay!=''){
    fullDisplay+=`<h1>Pending Tasks</h1>${incompleteDisplay}`
  }
  if (completeDisplay!=''){
    fullDisplay+=`<h1>Completed Tasks</h1><del>${completeDisplay}</del>`
  }
  if (incompleteDisplay=='' && completeDisplay==''){
    fullDisplay+=`<h1>Pending Tasks</h1><div class="task"><p><b>It's empty here...</b></p><p>Press the '+' button to create a task!</p></div>`
  }
  document.getElementById('taskDisplay').innerHTML = fullDisplay
}

var tasks = []
//Take form stuff and create task
function newTask(){
  const tt = document.getElementById('taskTitle')
  const tb = document.getElementById('taskBody')
  if (tt.value!='' && tb.value!=''){
    const newTask = {'title':tt.value,'body':tb.value,'completed':0,'date':new Date(),'id':crypto.randomUUID()}
    tt.value = ''
    tb.value = ''
    tasks.push(newTask)
    emit('taskset',newTask)
    window.location.replace('#Tasks')
    saveTasks()
  }
}

function bumpTasks(){
  if (Notification.permission!='granted'){
    Notification.requestPermission().then(permission => {
      if (permission == 'granted'){
        tasks.forEach(task => {
          if(task.completed==0){
            emit('taskset',task)
          }
        })
      } else if(permission == 'denied'){
        alert("It looks like we don't have permission to display notifications on your device.")
      }
    })
  } else {
    tasks.forEach(task => {
      if(task.completed==0){
        emit('taskset',task)
      }
    })
  }
}

//Task Handlers
function markComplete(id){
  const i = tasks.findIndex(o => o.id == id)
  tasks[i].completed = 1
  saveTasks()
}
function forgetTask(id){
  const i = tasks.findIndex(o => o.id == id)
  tasks.splice(i,1)
  saveTasks()
}
function saveTasks(){
  localStorage.setItem('tasks',JSON.stringify(tasks))
  refreshtasks()
}

//Sync Google Calender the first time each session
var googleLoggedIn = false
function plannerNav(){
  if(localStorage.getItem('googleSignIn')=='true' && googleLoggedIn==false){
    googleSignIn()
  }
}

var events = {}
var eventsRaw = {}
var selectedDay = formatDate(new Date())
var today = formatDate(new Date())
function newEvent(){
  const et = document.getElementById('eventTitle')
  const eb = document.getElementById('eventBody')
  const ed = document.getElementById('date')
  const es = document.getElementById('startTime')
  const ee = document.getElementById('endTime')
  if (et.value!='' && eb.value!='' && ed.value!=''){
    const newEvent = {
      'summary':et.value,
      'description':eb.value,
      'start':{'dateTime':toLocalISO(ed.value,es.value)},
      'end':{'dateTime':toLocalISO(ed.value,ee.value)},
      'id':'plangrind'+(crypto.randomUUID().replace(/-/g, ''))
    }
    const newDate = formatDateFromISO(newEvent.start.dateTime)
    if (events[newDate]==undefined){
      events[newDate] = []
    }
    events[newDate].push(newEvent)
    eventsRaw[newEvent.id] = newDate
    localStorage.setItem('events',JSON.stringify(events))
    localStorage.setItem('eventsRaw',JSON.stringify(eventsRaw))
    var discrepancies = localStorage.getItem('discrepancies')
    if (discrepancies==undefined){
      discrepancies = {'add':[],'edit':[],'delete':[]}
    } else {
      discrepancies = JSON.parse(discrepancies)
    }
    discrepancies.add.push(newEvent.id)
    localStorage.setItem('discrepancies',JSON.stringify(discrepancies))
    et.value = ''
    eb.value = ''
    ed.value = ''
    es.value = ''
    ee.value = ''
    window.location.replace('#Planner')
    if(googleLoggedIn){
      syncGoogleCalendar()
    }
  }
}

async function syncGoogleCalendar(){
  if(accessToken!=null){
    document.getElementById('syncWindow').style.visibility = 'visible'
    var discrepancies = localStorage.getItem('discrepancies')
    if (discrepancies==undefined){
      discrepancies = {'add':[],'edit':[],'delete':[]}
    } else {
      discrepancies = JSON.parse(discrepancies)
    }
    eventsRaw = localStorage.getItem('eventsRaw')
    if (eventsRaw==undefined){
      eventsRaw = {}
    } else {
      eventsRaw = JSON.parse(eventsRaw)
    }
    events = localStorage.getItem('events')
    if (events==undefined){
      events = {}
    } else {
      events = JSON.parse(events)
    }
    //Additions
    for (const addition of discrepancies.add) {
      console.log(events)
      console.log(eventsRaw)
      console.log(addition)
      const eventDate = eventsRaw[addition]
      const event = events[eventDate].find(o => o.id == addition)
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json" ,
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(event)
      });
      console.log(res)
      console.log(event)
    }
    //Edits
    //Deletions
    discrepancies = {'add':[],'edit':[],'delete':[]}
    localStorage.setItem('discrepancies',JSON.stringify(discrepancies))
    googleEvents = await listEvents()
    events = {}
    eventsRaw = {}
    googleEvents.forEach(event => {
      eventsRaw[event.id] = formatDateFromISO(event.start.dateTime)
      if(event.start.dateTime){
        if(events[formatDateFromISO(event.start.dateTime)]==undefined){
          events[formatDateFromISO(event.start.dateTime)] = []
        }
        events[formatDateFromISO(event.start.dateTime)].push(event)
      }
      if(event.start.date){
        if(events[event.start.date]==undefined){
          events[event.start.date] = []
        }
        events[event.start.date].push(event)
      }
    })
    refreshDay()
    document.getElementById('syncWindow').style.visibility = 'hidden'
  } else {
    googleSignIn()
  }
}


function refreshDay(){
  if (events[selectedDay]==undefined){
    events[selectedDay] = []
  }
  let outdiv = document.getElementById("dayDisplay");
  outdiv.innerHTML = ''
  if (selectedDay==today){
      let bar = document.createElement('div')
      bar.id = 'timeBar'
      bar.style.position = 'absolute'
      const pixels = minutesFromISO(new Date().toISOString())
      bar.style.top = pixels+'px'
      outdiv.appendChild(bar)
    }
  var output = ''
  var i = 0
  events[selectedDay].forEach((event) => {
    if(event.start.dateTime){
        let eventDiv = document.createElement("div");

        eventDiv.className = "event-block";
        eventDiv.id = "event"+i
        /*eventDiv.addEventListener('click', ((index) => {
            return () => modEvent(index)
        })(i));*/
        i++

        let pos = calculatePosition(event);

        eventDiv.style.position = "absolute";
        eventDiv.style.top = pos.top + "px";
        eventDiv.style.height = pos.height + "px";
        eventDiv.style.left = "10px";
        eventDiv.style.width = "calc(100% - 20px)";
        eventDiv.style.backgroundColor = '#FFFFFF'
        eventDiv.style.border = 'solid 3px #1F305E'
        eventDiv.style.overflow = 'hidden'
        eventDiv.style.boxSizing = 'border-box'
        eventDiv.style.padding = '5px'
        eventDiv.style.borderRadius = '10px'

        eventDiv.innerHTML = `<p>
            <strong>${event.summary}</strong></p>
            <p>${minutesToHour(minutesFromISO(event.start.dateTime))} - ${minutesToHour(minutesFromISO(event.end.dateTime))}</p>
        `;

        outdiv.appendChild(eventDiv)
        //eventDiv.scrollIntoView()
      } else {
        console.log('All-Day Event Detected!')
        console.log(event)
      }
    });
    let ctrldiv = document.createElement('div')
    ctrldiv.id = 'ctrl'
    ctrldiv.style.position = "absolute";
    ctrldiv.style.overflow = 'hidden'
    ctrldiv.style.height = '1px'
    ctrldiv.innerHTML = '.'
    ctrldiv.style.top = "1440px";
    outdiv.appendChild(ctrldiv)
}
function timeInit(){
  let bar = document.createElement('div')
  bar.id = 'timeBar'
  bar.style.position = 'absolute'
  const pixels = minutesFromISO(new Date().toISOString())
  bar.style.top = pixels+'px'
  const display = document.getElementById('dayDisplay')
  display.appendChild(bar)
  display.scrollTo(0, 0)
  display.scrollBy({
  top: pixels - display.clientHeight/2,
  behavior: "smooth"
  });
}


//Date Handling Wrappers
function toLocalISO(dateStr, timeStr) {
  // Ensure time has seconds
  if (timeStr.length === 5) timeStr += ":00";

  // Build a combined local datetime string
  const local = `${dateStr}T${timeStr}`;

  // Create a Date object in LOCAL time
  const d = new Date(local);

  // Convert to full ISO string WITH timezone offset
  return d.toISOString();
}
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function formatDateFromISO(dateISO) {
  const date = new Date(dateISO)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function minutesFromISO(iso) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}
function minutesToHour(minutes) {
  minutes = minutes % (24 * 60); // wrap around 24h
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;

  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12; // convert 0 → 12, 13 → 1, etc.

  return `${h12}:${m.toString().padStart(2, "0")} ${suffix}`;
}
function calculatePosition(event) {

    let startMinutes = minutesFromISO(event.start.dateTime);
    let endMinutes = minutesFromISO(event.end.dateTime);

    let top = startMinutes// * (zoom/100);
    let height = (endMinutes - startMinutes)// * (zoom/100);

    return { top, height };
}
var selectedMonth = 'Planner'
function changeDay(dateStr){
    selectedDay = dateStr
    refreshDay()
    let [y, m, d] = dateStr.split('-').map(Number);
    let date = new Date(y, m - 1, d);
    selectedMonth = date.toLocaleString('default', { month: 'long' });
    document.getElementById('title').innerHTML = selectedMonth

    // Move back 3 days
    date.setDate(date.getDate() - 3);

    for (let i = 1; i <= 7; i++) {
        // Format normalized date
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const normalized = `${yyyy}-${mm}-${dd}`;

        // Render button
        document.getElementById(`p${i}`).innerHTML =
            `<button onclick="changeDay('${normalized}')">${dd}</button>`;

        // Move to next day (auto-normalizes)
        date.setDate(date.getDate() + 1);
    }

}

async function listEvents() {
  const date = new Date()
  date.setDate(date.getDate() - 7)
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(date.toISOString())}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  const data = await res.json();
  return data.items
}





//Onload function
function load(){
  const startHash = window.location.hash
  window.location.hash = ''
  if (startHash=='' || startHash=='#Planner'){
    window.location.hash = 'Home'
  } else {
    window.location.hash = startHash
  }
  if (contactsSupported!=true){
    document.getElementById('contactsUploadBtn').style.display = 'none'
    console.log('Contacts negative')
  } else {
    console.log('Contacts affirmative')
  }
  if (Notification.permission!='granted'){
    console.log('Asking for permission for notifications...')
    Notification.requestPermission().then(permission => {
      if (permission == 'granted'){
        console.log('Notifications affirmative')
      } else if(permission == 'denied'){
        console.log('Notifications negative')
      }
    })
  } else {
    console.log('Notifications affirmative')
  }
  refreshcontacts()
  refreshtasks()
  changeDay(selectedDay)
  emit('taskquery')
  timeInit()
}



navigator.serviceWorker.addEventListener("message", (event) => {
  const message = event.data
  console.log("Simon says:", message);
  switch (message.action){
    case 'taskcomplete':
      message.ids.forEach(id => {
        markComplete(id)
      })
      break
    case 'taskcheck':
      let dumplist = []
      message.ids.forEach(id => {
        const match = tasks.find(o => o.id == id)
        if (match == undefined || match.completed == 1){
          dumplist.push(id)
        }
      })
      emit('taskdump',{ids:dumplist})
      break
    case 'refreshtasks':
      emit('taskquery')
      break
  }
});
const GOOGLE_CLIENT_ID = '618102630522-e17dbh57dr1lcoqof3dmj69e3ivilogp.apps.googleusercontent.com'
var accessToken = null
function googleSignIn(){
  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: "https://www.googleapis.com/auth/calendar.events",
    callback: (response) => {
      googleLoggedIn = true;
      accessToken = response.access_token;
      syncGoogleCalendar()
      document.getElementById('google-wrapper').innerHTML = 'Signed In With Google!'
      localStorage.setItem('googleSignIn','true')
    }
  });
  tokenClient.requestAccessToken({prompt:''});
}
function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64));
}