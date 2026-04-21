self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener('message', m =>{
    const message = m.data
    console.log('Message Recieved!')
    switch (message.action){
        case 'notify':
            notify(message.title,message.body)
    }
})

function notify(t,b){
    self.registration.showNotification(t, {
        body: b
    });
}