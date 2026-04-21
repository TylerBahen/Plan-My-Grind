if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js")
    .then(() => {
        console.log("SW registered")
    })
    .catch(err => console.error("SW registration failed:", err));

}

window.addEventListener('hashchange',() => {
  const page = window.location.hash.replace('#','')
  changeview(page)
})

function changeview(page){
  document.getElementById('title').innerHTML = page
}

function emit(action,messageRaw){
  const message = messageRaw
  message.action = action
    navigator.serviceWorker.ready.then(reg => {
        reg.active.postMessage(message);
    });
}

changeview('Home')