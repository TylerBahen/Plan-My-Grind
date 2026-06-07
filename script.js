const version = '0.6.0'

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
      refreshHome()
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
    case 'EventView':
    case 'PersonView':
    case 'NewGoal':
      openpopup(page)
      break
    case 'NewEvent':
      document.getElementById('date').value = selectedDay
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
  const popups = ['Settings','NewPerson','NewTask','NewEvent','NewGoal','EventView','PersonView']
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
    display+=`<div class="person" onclick="viewPerson(${contact.id})"><p><b>${contact.name}</b></p>`
    /*if (contact.tel!=[]){
      contact.tel.forEach(number => {
        display+=`<p>${formatPhone(number)} : <a href="tel:${number}">Call</a> / <a href="sms:${number}">Text</a></p>`
      })
    }
    if (contact.email!=[]){
      contact.email.forEach(address => {
        display+=`<p>${address} : <a href="mailto:${address}">Email</a></p>`
      })
    }*/
    display+='</div>'
  })
  document.getElementById('peopleDisplay').innerHTML = display
  people = contacts
}

function viewPerson(id){
  const contact = people.find(o => o.id == id)
  var display = ""
  document.querySelector('#PersonView h1').innerHTML =contact.name
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
  document.querySelector('#PersonView p').innerHTML = display
  window.location.hash = 'PersonView'
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
  if (tt.value!=''){
    const ti = crypto.randomUUID()
    const newTask = {'title':tt.value,'body':tb.value,'completed':0,'date':new Date(),'id':ti}
    tt.value = ''
    tb.value = ''
    tasks.push(newTask)
    emit('taskset',newTask)
    window.location.replace('#Tasks')
    saveTasks()
    return ti
  } else {
    return null
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
function markComplete(id,fromButton = true){
  const i = tasks.findIndex(o => o.id == id)
  tasks[i].completed = 1
  if (fromButton){
    emit('taskclear',{id:id})
  }
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
  if (et.value!='' && ed.value!=''){
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
    refreshDay()
    if(googleLoggedIn && autoSyncCalendar){
      syncGoogleCalendar()
    }
  }
}

function deleteEvent(){
  if (confirm('Are you sure you want to delete this event?')){
  var discrepancies = localStorage.getItem('discrepancies')
  if (discrepancies==undefined){
    discrepancies = {'add':[],'edit':[],'delete':[]}
  } else {
    discrepancies = JSON.parse(discrepancies)
  }
  if (discrepancies.add.includes(activeEvent.id)){
    discrepancies.add.splice(discrepancies.add.indexOf(activeEvent.id),1)
  } else {
    discrepancies.delete.push(activeEvent.id)
  }
  const eventDate = eventsRaw[activeEvent.id]
  const index = events[eventDate].findIndex(o => o.id == activeEvent.id)
  if (index!=-1){
    events[eventDate].splice(index,1)
  }
  localStorage.setItem('events',JSON.stringify(events))
  localStorage.setItem('discrepancies',JSON.stringify(discrepancies))
  window.location.replace('#Planner')
  refreshDay()
  if(googleLoggedIn && autoSyncCalendar){
    syncGoogleCalendar()
  }
  }
}

if (localStorage.getItem('autoSyncCalendar')=='false'){
  var autoSyncCalendar = false
} else {
  var autoSyncCalendar = true
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
    }
    //Edits
    //Deletions
    for (const deletion of discrepancies.delete) {
      //const eventDate = eventsRaw[addition]
      //const event = events[eventDate].find(o => o.id == deletion)
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${deletion}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
    }
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
    localStorage.setItem('eventsRaw',JSON.stringify(eventsRaw))
    localStorage.setItem('events',JSON.stringify(events))
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
  events[selectedDay].forEach((event,i) => {
    if(event.start.dateTime){
        let eventDiv = document.createElement("div");

        eventDiv.className = "event-block";
        eventDiv.id = "event"+i
        const currentId = event.id;
        eventDiv.addEventListener("click", () => {
            viewEvent(currentId);
        });

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
var activeEvent = null
function viewEvent(id){
  const event = events[selectedDay].find(o => o.id == id)
  activeEvent = event
  document.querySelector('#EventView h1').innerHTML = event.summary
  var desc = `<strong>${minutesToHour(minutesFromISO(event.start.dateTime))} - ${minutesToHour(minutesFromISO(event.end.dateTime))}</strong>`
  if (event.description){
     desc+=`<br>${event.description}`
  }
  if (event.location){
    desc+=`<br>${event.location}`
  }
  document.querySelector('#EventView p').innerHTML = desc
  window.location.hash = 'EventView'
}



function dayInit(){
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
  let ctrldiv = document.createElement('div')
  ctrldiv.id = 'ctrl'
  ctrldiv.style.position = "absolute";
  ctrldiv.style.overflow = 'hidden'
  ctrldiv.style.height = '1px'
  ctrldiv.innerHTML = '.'
  ctrldiv.style.top = "1440px";
  let bar = document.createElement('div')
  bar.id = 'timeBar'
  bar.style.position = 'absolute'
  const pixels = minutesFromISO(new Date().toISOString())
  bar.style.top = pixels+'px'
  const display = document.getElementById('dayDisplay')
  const scroll = Math.round(pixels-(display.clientHeight/4))
  display.appendChild(ctrldiv)
  display.appendChild(bar)
  display.scrollTo(0, 0)
  display.scrollBy({
  top: scroll,
  behavior: "smooth"
  });
  changeDay(today)
  setTimeout(barTick,60000)
}
function barTick(){
  if (selectedDay==today){
    const bar = document.getElementById('timeBar')
    const minutes = minutesFromISO(new Date().toISOString())
    bar.style.top = minutes+'px'
  }
  setTimeout(barTick,60000)
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
function daysBetween(start, end){
  const msPerDay = 1000 * 60 * 60 * 24
  const a = new Date(start)
  const b   = new Date(end)
  return Math.round((b - a) / msPerDay)
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
    selectedMonth = date.toLocaleString('default', {weekday: 'short', month: 'long', day: 'numeric'});
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


const goalSelect = document.getElementById('goalType')
goalSelect.addEventListener('change', (e) => {
  var goalHTML = ''
  switch (goalSelect.value){
    case '':
      goalHTML = `
      <p>Daily Habit - Useful for tracking things you want to do on a daily basis, such as accomplishing a daily goal or holding sobriety.</p>
      `
      break
    case 'Daily Habit':
      goalHTML = `
      <p>Title:<br><input type="text" id="goalTitle"></p>
      <button onclick="newGoal()">Create Goal</button>
      `
      break
  }
  document.getElementById('goalDiv').innerHTML = goalHTML
})

var goals = []
function refreshGoals(){
  const goalsraw = localStorage.getItem('goals')
  if (goalsraw==null){
    goals = []
  } else {
    goals = JSON.parse(goalsraw)
  }
  var output = ''
  goals.forEach(goal => {
    switch (goal.type){
      case 'Daily Habit':
        if (goal.today!=today){
          var days = daysBetween(new Date(goal.today),new Date(today))
          for (; days>=1; days--){
            if (goal.days[goal.todayDex]==2){
              goal.days[goal.todayDex] = 0
            }
            if (goal.todayDex<29){
              goal.todayDex++
            } else {
              goal.days.push(2)
              goal.days.shift()
            }
          }
          goal.today = today
        }
        var calendarDiv = ''
        var hits = 0
        var sumTotal = 0
        goal.days.forEach((value,index) => {
          if (goal.todayDex==index){
            var extraStyle = ` style="border: solid 3px black; box-shadow: 1px 1px 0px black;"`
          } else {
            var extraStyle = ``
          }
          if (value==2){
            calendarDiv+=`<button onclick="updateHabitDay('${goal.id}',${index},0)" class='emptyDay'${extraStyle}></button>`
            if (index!=29){
              hits++
              sumTotal++
            }
          } else if (value==1){
            calendarDiv+=`<button onclick="updateHabitDay('${goal.id}',${index},0)" class='goodDay'${extraStyle}></button>`
            sumTotal++
          } else {
            calendarDiv+=`<button onclick="updateHabitDay('${goal.id}',${index},1)" class='badDay'${extraStyle}></button>`
            hits++
            sumTotal++
          }
        })
        const percent = Math.round(((sumTotal-hits)/sumTotal)*100)
        goal.bite = `${percent}%`
        output+=`<div class='dailyHabit' id='goal-${goal.id}'><div class='habitHeader'><h1>${goal.title}</h1><h2>${percent}%</h2></div><div class='habitCalendar'>${calendarDiv}</div></div>`
    }
  })
  document.getElementById('goalDisplay').innerHTML = output
}
function updateHabitDay(id,index,value){
  const goaldex = goals.findIndex(o => o.id == id)
  if (goaldex === -1) return
  var goal = goals[goaldex]
  if (index<=goal.todayDex){
    goal.days[index] = value
    goals[goaldex] = goal
    localStorage.setItem('goals',JSON.stringify(goals))
    refreshGoals()
  } else {
    alert('You cannot mark days in the future :)')
  }
}

function pushTaskFromStone(goal){
  //todo: add this
}

function newGoal(){
  const gt = goalSelect.value
  switch (gt){
    case 'Daily Habit':
      var goal = {}
      goal.type = gt
      goal.title = document.getElementById('goalTitle').value
      goal.days = [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2]
      goal.today = today
      goal.todayDex = 0
      goal.id = crypto.randomUUID()
      goal.bite = `0%`
      document.getElementById('goalTitle').value = ''
      break
  }
  goals.push(goal)
  localStorage.setItem('goals',JSON.stringify(goals))
  goalSelect.value = ''
  document.getElementById('goalDiv').innerHTML = ''
  window.location.replace('#Goals')
  refreshGoals()
}




var sessionGoal = null
async function refreshHome(){
  //Goals Widget
  var output = ``
  if (goals.length>0 && sessionGoal==null){
    sessionGoal = Math.floor(Math.random()*goals.length)
  }
  if (sessionGoal!=null){
    const goal = goals[sessionGoal]
    output+=`<div class='homeGoalTile'><h1>${goal.title}</h1><h2>${goal.bite}</h2></div>`
  }
  //Events Widget
  const et = events[today]
  output+=`<div class='eventsToday'><h1>Upcoming Events</h1>`
  var threevents = []
  et.forEach(event => {
    if(threevents.length<3 && event.start.dateTime!=undefined && minutesFromISO(event.start.dateTime)>minutesFromISO(new Date().toISOString())){
      threevents.push(event)
    }
  })
  threevents.forEach(event => output+=`<p onclick='viewEvent("${event.id}")'><b>${event.summary} : </b>${minutesToHour(minutesFromISO(event.start.dateTime))} - ${minutesToHour(minutesFromISO(event.end.dateTime))}</p>`)
  if (threevents.length==0) output+=`Nada, baby!`
  output+=`</div>`
  output+=version
  document.getElementById('homeDisplay').innerHTML = output
}









//Onload function
function load(){
  const startHash = window.location.hash
  window.location.hash = ''
  switch (startHash){
    case '#Goals':
    case '#People':
    case '#Tasks':
      window.location.hash = startHash
      break
    default:
      window.location.hash = '#Home'
      break
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
  refreshGoals()
  refreshcontacts()
  refreshtasks()
  dayInit()
  refreshHome()
  emit('taskquery')
}



navigator.serviceWorker.addEventListener("message", (event) => {
  const message = event.data
  console.log("Simon says:", message);
  switch (message.action){
    case 'taskcomplete':
      message.ids.forEach(id => {
        markComplete(id,false)
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



//Vibe-coded wrapper for swipe navigation on planner
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

const threshold = 50;   // min px to count as swipe
const restraint = 100;  // max vertical movement allowed
const allowedTime = 300; // max time allowed to travel that distance
let startTime = 0;

const surface = document.getElementById('Planner');

surface.addEventListener('touchstart', e => {
  const t = e.changedTouches[0];
  touchStartX = t.pageX;
  touchStartY = t.pageY;
  startTime = Date.now();
});

surface.addEventListener('touchend', e => {
  const t = e.changedTouches[0];
  touchEndX = t.pageX;
  touchEndY = t.pageY;

  const distX = touchEndX - touchStartX;
  const distY = touchEndY - touchStartY;
  const elapsed = Date.now() - startTime;

  const isHorizontal = Math.abs(distY) <= restraint;
  const isFastEnough = elapsed <= allowedTime;
  const isLongEnough = Math.abs(distX) >= threshold;


  if (isHorizontal && isFastEnough && isLongEnough) {
    if (distX < 0) {
      document.getElementById('p5').querySelector('button').click()     // swipe left → next day
    } else {
      document.getElementById('p3').querySelector('button').click()     // swipe right → previous day
    }
  }
});