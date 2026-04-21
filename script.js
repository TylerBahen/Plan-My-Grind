//set up service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js")
    .then(() => {
        console.log("SW registered")
    })
    .catch(err => console.error("SW registration failed:", err));

}

//Grab when the page changes hash url and handle it
window.addEventListener('hashchange',() => {
  const page = window.location.hash.replace('#','')
  console.log(page)
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

//pull all the contacts and put them on the page
function refreshcontacts(){
  const contactsraw = localStorage.getItem('contacts')
  if (contactsraw==null){
    const contacts = []
  } else {
    const contacts = JSON.parse(contactsraw.list)
  }
  contacts.forEach(contact => {
    console.log(contact)
  })
}

//Onload function
function load(){
  refreshcontacts()
  changeview('Home')
}