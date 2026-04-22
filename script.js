//set up service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js")
    .then(() => {
        console.log("SW registered")
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
function emit(action,messageRaw){
  const message = messageRaw
  message.action = action
    navigator.serviceWorker.ready.then(reg => {
        reg.active.postMessage(message);
    });
}

//Close any popup windows
function closepopups(){
  const popups = ['NewPerson']
  popups.forEach((popup) => {
    document.getElementById(popup).style.visibility = 'hidden'
  })
}
//Open the specified window
function openpopup(window){
  document.getElementById(window).style.visibility = 'visible'
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
    emit('notify',{'title':"Plan My Grind",'body':'Contacts Succesfully Uploaded'})
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

//Onload function
function load(){
  refreshcontacts()
  window.location.hash = ''
  window.location.hash = 'Home'
  if (contactsSupported!=true){
    document.getElementById('contactsUploadBtn').style.display = 'none'
  }
  if (Notification.permission!='granted'){
    console.log('Asking for permission for notifications...')
    Notification.requestPermission()
  } else {
    console.log('Notifications affirmative, we are clear for takeoff...')
  }
}