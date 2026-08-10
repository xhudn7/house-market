const CACHE_NAME = "house-market-v4";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./manifest.json"
];


// ====================================
// INSTALL
// ====================================

self.addEventListener(
    "install",
    function (event) {

        self.skipWaiting();

        event.waitUntil(
            caches.open(CACHE_NAME)
                .then(function (cache) {

                    return cache.addAll(
                        FILES_TO_CACHE
                    );

                })
        );

    }
);


// ====================================
// ACTIVATE
// ====================================

self.addEventListener(
    "activate",
    function (event) {

        event.waitUntil(

            caches.keys()
                .then(function (cacheNames) {

                    return Promise.all(

                        cacheNames.map(
                            function (cacheName) {

                                if (
                                    cacheName !==
                                    CACHE_NAME
                                ) {

                                    return caches.delete(
                                        cacheName
                                    );

                                }

                            }
                        )

                    );

                })
                .then(function () {

                    return self.clients.claim();

                })

        );

    }
);


// ====================================
// FETCH
// ====================================

self.addEventListener(
    "fetch",
    function (event) {

        event.respondWith(

            fetch(event.request)

                .then(function (response) {

                    const responseCopy =
                        response.clone();


                    caches.open(CACHE_NAME)
                        .then(function (cache) {

                            cache.put(
                                event.request,
                                responseCopy
                            );

                        });


                    return response;

                })

                .catch(function () {

                    return caches.match(
                        event.request
                    );

                })

        );

    }
);


// ====================================
// PUSH NOTIFICATION
// ====================================

self.addEventListener(
    "push",
    function (event) {

        let data = {

            title:
                "House Market",

            body:
                "New shopping list update"

        };


        if (event.data) {

            try {

                data =
                    event.data.json();

            }

            catch (error) {

                console.log(
                    "Could not read push data:",
                    error
                );

            }

        }


        const title =
            data.title ||
            "House Market";


        const options = {

            body:
                data.body ||
                data.message ||
                "New shopping list update",

            tag:
                "house-market",

            data: {

                url:
                    "./"

            }

        };


        event.waitUntil(

            self.registration
                .showNotification(
                    title,
                    options
                )

        );

    }
);


// ====================================
// NOTIFICATION CLICK
// ====================================

self.addEventListener(
    "notificationclick",
    function (event) {

        event.notification.close();


        event.waitUntil(

            clients.matchAll({

                type:
                    "window",

                includeUncontrolled:
                    true

            })

                .then(function (
                    clientList
                ) {

                    for (
                        const client
                        of clientList
                    ) {

                        if (
                            "focus"
                            in client
                        ) {

                            return client.focus();

                        }

                    }


                    if (
                        clients.openWindow
                    ) {

                        return clients.openWindow(
                            "./"
                        );

                    }

                })

        );

    }
);