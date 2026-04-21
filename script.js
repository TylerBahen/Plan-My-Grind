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
    case 'Settings':
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
  const windows = ['Goals', 'Planner', 'Home', 'People', 'Settings']
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
function refreshcontacts(){
  const contactsraw = localStorage.getItem('contacts')
  var contacts
  if (contactsraw==null){
    contacts = []
  } else {
    contacts = JSON.parse(contactsraw.list)
  }
  contacts.forEach(contact => {
    console.log(contact)
  })
}

//upload contacts from device using the experimental feature
async function uploadContacts(){
  const props = ["name", "email", "tel"];
  const opts = { multiple: true };

  try {
    const contacts = await navigator.contacts.select(props, opts);
    window.alert(JSON.parse(contacts));
  } catch (err) {
    window.alert(err);
  }
}

//Onload function
function load(){
  refreshcontacts()
  window.location.hash = 'Home'
  if (contactsSupported!=true){
    document.getElementById('contactsUploadBtn').style.display = 'none'
  }
}