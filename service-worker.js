self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener('message', m =>{
    const message = m.data
    switch (message.action){
        case 'notify':
            notify(message.title,message.body)
    }
})

self.addEventListener("notificationclick", event => {
    console.log('Heard the click')
    const command = event.action.split(".")
  if (command[0] === "complete") {
    console.log('He done did it.')
  }
});

function notify(t,b,actions = []){
    self.registration.showNotification(t, {
        body: b,
        actions: actions
    });
}