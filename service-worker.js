const CACHE_NAME = "house-market-v1";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./manifest.json"
];


self.addEventListener("install", function (event) {

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function (cache) {
                return cache.addAll(FILES_TO_CACHE);
            })
    );

});


self.addEventListener("fetch", function (event) {

    event.respondWith(
        caches.match(event.request)
            .then(function (cachedResponse) {

                return cachedResponse || fetch(event.request);

            })
    );

});