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
    case 'NewPerson':
    case 'NewTask':
      openpopup(page)
      break
  }
})

//Window changing thingy
function changeview(window){
  document.getElementById('title').innerHTML = window
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
  const popups = ['NewPerson','NewTask']
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
    people.push({'name':cn.value,'tel':tel,'email':email})
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
      people.push({'name':contact.name[0],'tel':[...new Set(numbers)],'email':[...new Set(contact.email)]})
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
      incompleteDisplay+=display+`<button onclick="markComplete('${task.id}')">Mark Complete</button></div>`
    } else {
      completeDisplay+=display+"</div>"
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

function markComplete(id){
  const i = tasks.findIndex(o => o.id == id)
  tasks[i].completed = 1
  saveTasks()
}

function saveTasks(){
  localStorage.setItem('tasks',JSON.stringify(tasks))
  refreshtasks()
}

//Onload function
function load(){
  window.location.hash = ''
  window.location.hash = 'Home'
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
  emit('taskquery')
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
        dumplist.push(id)
      })
      emit('taskdump',{ids:dumplist})
  }
});