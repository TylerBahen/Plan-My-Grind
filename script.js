if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js")
    .then(() => {
        console.log("SW registered")
    })
    .catch(err => console.error("SW registration failed:", err));

}

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

function changeview(window){
  document.getElementById('title').innerHTML = window
  const windows = ['Goals', 'Planner', 'Home', 'People', 'Settings']
    windows.forEach((i) => {
        document.getElementById(i).style.visibility = 'hidden'
    })
    document.getElementById(window).style.visibility = 'visible'
}

function emit(action,messageRaw){
  const message = messageRaw
  message.action = action
    navigator.serviceWorker.ready.then(reg => {
        reg.active.postMessage(message);
    });
}

changeview('Home')