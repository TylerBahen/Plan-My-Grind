self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener('message', m =>{
    const message = m.data
    switch (message.action){
        case 'notify':
            notify(message.title,message.body)
            break
        case 'storeTasks':
            message.tasks.forEach(task => {
                kvSet(task.id,task)
            })
            break
        case 'pullTask':
            break
    }
})

self.addEventListener("notificationclick", event => {
    console.log('Heard the click')
    const command = event.action.split(".")
  if (command[0] === "completetask") {
    console.log('He done did it.')
  }
});

//pop out a notification. Title and body are required. Actions are optional
function notify(title,body,actions = []){
    self.registration.showNotification(title, {
        body: body,
        actions: actions
    });
}










//Some Cache API stuff
const KV_CACHE_NAME = 'tasks-store-v1';

function kvRequest(key) {
  return new Request(`https://kv.local/${encodeURIComponent(key)}`);
}

// SET: store JSON-serializable value
async function kvSet(key, value) {
  const cache = await caches.open(KV_CACHE_NAME);
  const body = JSON.stringify(value);
  const response = new Response(body, {
    headers: { 'Content-Type': 'application/json' }
  });
  await cache.put(kvRequest(key), response);
}

// GET: read value (or null if missing)
async function kvGet(key) {
  const cache = await caches.open(KV_CACHE_NAME);
  const match = await cache.match(kvRequest(key));
  if (!match) return null;
  return await match.json();
}

// DELETE: remove a key
async function kvDelete(key) {
  const cache = await caches.open(KV_CACHE_NAME);
  await cache.delete(kvRequest(key));
}

// LIST KEYS: (optional) iterate all entries
async function kvKeys() {
  const cache = await caches.open(KV_CACHE_NAME);
  const requests = await cache.keys();
  return requests
    .filter(r => r.url.startsWith('https://kv.local/'))
    .map(r => decodeURIComponent(r.url.split('https://kv.local/')[1]));
}