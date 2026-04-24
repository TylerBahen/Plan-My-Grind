self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener('message', m =>{
    const message = m.data
    switch (message.action){
        case 'notify':
            notify(message.title,message.body)
            break
        case 'taskset':
            notify(message.title,message.body,[{action:`completetask.${message.id}`,title:'Complete Task'}])
            kvSet(message.id,message.completed)
            kvGet('idBucket').then(ids => {
                if(ids==null){
                    kvSet('idBucket',[message.id])
                } else {
                    let newlist = ids
                    newlist.push(message.id)
                    kvSet('idBucket',newlist)
                }
            })
            break
        case 'taskquery':
            console.log('Tasks Requested')
            kvGet('idBucket').then(ids => {
                if (ids==null){
                    kvSet('idBucket',[])
                } else {
                    let checks = []
                    let completes = []
                    Promise.all(
                        ids.map(id =>
                            kvGet(id).then(c => {
                                if (c == 1) {
                                    return kvDelete(id).then(() => {
                                        completes.push(id)
                                    })
                                } else {
                                    checks.push(id)
                                }
                            })
                        )
                    ).then(() => {
                        kvSet('idBucket', checks)
                        m.source.postMessage({ action: "taskcomplete", ids: completes })
                        m.source.postMessage({ action: "taskcheck", ids: checks })
                    })
                }
            })
            break
        case 'taskdump':
            let dumplist = []
            message.ids.forEach(id => {
                kvDelete(message.id)
                dumplist.push(id)
            })
            kvGet('idBucket').then(ids => {
                let newlist = [...ids]
                dumplist.forEach(id => {
                    newlist.splice(newlist.indexOf(id),1)
                })
                kvSet('idBucket',newlist)
            })
            break
    }
})

self.addEventListener("notificationclick", event => {
    const command = event.action.split(".")
  if (command[0] === "completetask") {
    kvSet(command[1],1)
    notify('Plan My Grind','Task marked as completed!')
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