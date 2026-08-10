// ====================================
// LOGIN ELEMENTS
// ====================================

const loginUsername =
    document.getElementById("loginUsername");

const loginPassword =
    document.getElementById("loginPassword");

const loginButton =
    document.getElementById("loginButton");

const loginMessage =
    document.getElementById("loginMessage");

const loginBox =
    document.getElementById("loginBox");

const appContent =
    document.getElementById("appContent");



// ====================================
// USER BAR
// ====================================

const enableNotificationsButton =
    document.getElementById(
        "enableNotificationsButton"
    );

const welcomeName =
    document.getElementById("welcomeName");

const logoutButton =
    document.getElementById("logoutButton");



// ====================================
// CURRENT USER
// ====================================

let currentUserProfile = null;



// ====================================
// REALTIME CHANNEL
// ====================================

let itemsRealtimeChannel = null;



// ====================================
// SHOPPING LIST ELEMENTS
// ====================================

const itemName =
    document.getElementById("itemName");

const quantity =
    document.getElementById("quantity");

const addButton =
    document.getElementById("addButton");

const itemsContainer =
    document.getElementById("itemsContainer");

const itemCount =
    document.getElementById("itemCount");



// ====================================
// VAPID PUBLIC KEY
// ====================================

const VAPID_PUBLIC_KEY =
    "BCijp9taI2BTDBs4g4iFm-YNf5Z21LRskYKJJgQLQjdOQf8Y5ixevnXUkDoglfXhBS9gHuYxupnrhtxbUcL8G1w";



// ====================================
// CONVERT VAPID KEY
// ====================================

function urlBase64ToUint8Array(
    base64String
) {

    const padding =
        "=".repeat(
            (
                4 -
                base64String.length % 4
            ) % 4
        );


    const base64 =
        (
            base64String +
            padding
        )
            .replace(/-/g, "+")
            .replace(/_/g, "/");


    const rawData =
        window.atob(base64);


    return Uint8Array.from(
        [...rawData].map(
            function (char) {

                return char.charCodeAt(0);

            }
        )
    );

}



// ====================================
// LOAD USER PROFILE
// ====================================

async function loadUserProfile(userId) {

    const {
        data: profile,
        error
    } =
        await db
            .from("profiles")
            .select(
                "username, display_name, role"
            )
            .eq(
                "id",
                userId
            )
            .single();


    if (error) {

        console.log(error);

        alert(
            "Could not load profile"
        );

        return false;

    }


    currentUserProfile =
        profile;


    welcomeName.textContent =
        currentUserProfile.display_name;


    return true;

}



// ====================================
// OPEN APP
// ====================================

async function openApp(userId) {

    const profileLoaded =
        await loadUserProfile(
            userId
        );


    if (!profileLoaded) {

        return;

    }


    loginBox.style.display =
        "none";


    appContent.style.display =
        "block";


    await loadItems();


    startRealtime();


    await updateNotificationButton();

}



// ====================================
// LOGIN
// ====================================

loginButton.addEventListener(
    "click",
    async function () {

        const username =
            loginUsername.value
                .trim()
                .toLowerCase();


        const password =
            loginPassword.value;


        const email =
            username +
            "@house.local";


        const {
            data,
            error
        } =
            await db.auth
                .signInWithPassword({

                    email: email,

                    password: password

                });


        if (error) {

            loginMessage.textContent =
                "Wrong username or password";

            return;

        }


        loginMessage.textContent =
            "";


        await openApp(
            data.user.id
        );

    }
);



// ====================================
// PRESS ENTER TO LOGIN
// ====================================

loginPassword.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key ===
            "Enter"
        ) {

            loginButton.click();

        }

    }
);



// ====================================
// CHECK EXISTING SESSION
// ====================================

async function checkExistingSession() {

    const {
        data,
        error
    } =
        await db.auth
            .getSession();


    if (error) {

        console.log(error);

        return;

    }


    const session =
        data.session;


    if (!session) {

        loginBox.style.display =
            "block";


        appContent.style.display =
            "none";


        return;

    }


    await openApp(
        session.user.id
    );

}



// ====================================
// LOGOUT
// ====================================

logoutButton.addEventListener(
    "click",
    async function () {

        await stopRealtime();


        const {
            error
        } =
            await db.auth
                .signOut({

                    scope: "local"

                });


        if (error) {

            console.log(error);

            alert(
                "Could not logout"
            );

            return;

        }


        currentUserProfile =
            null;


        itemsContainer.innerHTML =
            "";


        itemCount.textContent =
            "0 items";


        appContent.style.display =
            "none";


        loginBox.style.display =
            "block";


        loginPassword.value =
            "";

    }
);



// ====================================
// LOAD ITEMS
// ====================================

async function loadItems() {

    const {
        data: items,
        error
    } =
        await db
            .from("items")
            .select("*")

            .order(
                "completed",
                {
                    ascending: true
                }
            )

            .order(
                "created_at",
                {
                    ascending: true
                }
            );


    if (error) {

        console.log(error);

        alert(
            "Could not load shopping list"
        );

        return;

    }


    itemsContainer.innerHTML =
        "";


    items.forEach(
        function (item) {

            displayItem(item);

        }
    );


    itemCount.textContent =
        items.length +
        " items";

}



// ====================================
// DISPLAY ITEM
// ====================================

function displayItem(item) {

    const newItem =
        document.createElement(
            "div"
        );


    newItem.classList.add(
        "item"
    );


    newItem.dataset.id =
        item.id;


    if (
        item.completed ===
        true
    ) {

        newItem.classList.add(
            "completed"
        );

    }


    newItem.innerHTML = `

        <div>

            <h3>
                ${item.item_name}
            </h3>

            <p>
                ${item.requested_by}
                •
                Qty:
                ${item.quantity}
            </p>

        </div>


        <div class="item-buttons">

            <button class="done-button">
                ✓
            </button>

            <button class="delete-button">
                ✕
            </button>

        </div>

    `;


    const doneButton =
        newItem.querySelector(
            ".done-button"
        );


    const deleteButton =
        newItem.querySelector(
            ".delete-button"
        );



    // ====================================
    // COMPLETE / UNCOMPLETE
    // ====================================

    doneButton.addEventListener(
        "click",
        async function () {

            const newCompletedValue =
                !newItem.classList
                    .contains(
                        "completed"
                    );


            const {
                error
            } =
                await db
                    .from("items")
                    .update({

                        completed:
                            newCompletedValue

                    })
                    .eq(
                        "id",
                        item.id
                    );


            if (error) {

                console.log(error);

                alert(
                    "Could not update item"
                );

                return;

            }


            // Realtime refreshes list

        }
    );



    // ====================================
    // DELETE
    // ====================================

    deleteButton.addEventListener(
        "click",
        async function () {

            const {
                error
            } =
                await db
                    .from("items")
                    .delete()
                    .eq(
                        "id",
                        item.id
                    );


            if (error) {

                console.log(error);

                alert(
                    "Could not delete item"
                );

                return;

            }


            // Realtime removes item

        }
    );


    itemsContainer.appendChild(
        newItem
    );

}



// ====================================
// ADD NEW ITEM
// ====================================

addButton.addEventListener(
    "click",
    async function () {

        const name =
            itemName.value
                .trim();


        const qty =
            quantity.value;


        if (
            name === ""
        ) {

            alert(
                "Please enter an item"
            );

            return;

        }


        const person =
            currentUserProfile
                .display_name;


        const {
            error
        } =
            await db
                .from("items")
                .insert({

                    item_name:
                        name,

                    quantity:
                        qty,

                    requested_by:
                        person,

                    completed:
                        false

                });


        if (error) {

            console.log(error);

            alert(
                "Could not add item"
            );

            return;

        }


        itemName.value =
            "";


        quantity.value =
            1;


        itemName.focus();

    }
);



// ====================================
// PRESS ENTER TO ADD ITEM
// ====================================

itemName.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key ===
            "Enter"
        ) {

            addButton.click();

        }

    }
);



// ====================================
// ENABLE NOTIFICATIONS
// ====================================

if (
    enableNotificationsButton
) {

    enableNotificationsButton
        .addEventListener(
            "click",
            async function () {

                try {

                    // ====================================
                    // CHECK SUPPORT
                    // ====================================

                    if (
                        !(
                            "serviceWorker"
                            in navigator
                        )
                    ) {

                        alert(
                            "Service workers are not supported on this device."
                        );

                        return;

                    }


                    if (
                        !(
                            "PushManager"
                            in window
                        )
                    ) {

                        alert(
                            "Push notifications are not supported on this device."
                        );

                        return;

                    }


                    if (
                        !(
                            "Notification"
                            in window
                        )
                    ) {

                        alert(
                            "Notifications are not supported."
                        );

                        return;

                    }



                    // ====================================
                    // ASK PERMISSION
                    // ====================================

                    const permission =
                        await Notification
                            .requestPermission();


                    if (
                        permission !==
                        "granted"
                    ) {

                        alert(
                            "Notifications were not allowed."
                        );

                        return;

                    }



                    // ====================================
                    // GET SERVICE WORKER
                    // ====================================

                    const registration =
                        await navigator
                            .serviceWorker
                            .ready;



                    // ====================================
                    // CHECK EXISTING SUBSCRIPTION
                    // ====================================

                    let subscription =
                        await registration
                            .pushManager
                            .getSubscription();



                    // ====================================
                    // CREATE SUBSCRIPTION
                    // ====================================

                    if (
                        !subscription
                    ) {

                        subscription =
                            await registration
                                .pushManager
                                .subscribe({

                                    userVisibleOnly:
                                        true,

                                    applicationServerKey:
                                        urlBase64ToUint8Array(
                                            VAPID_PUBLIC_KEY
                                        )

                                });

                    }



                    // ====================================
                    // CONVERT SUBSCRIPTION
                    // ====================================

                    const subscriptionJSON =
                        subscription
                            .toJSON();


                    console.log(
                        "Push subscription:",
                        subscriptionJSON
                    );



                    // ====================================
                    // GET LOGGED IN USER
                    // ====================================

                    const {
                        data: sessionData,
                        error: sessionError
                    } =
                        await db.auth
                            .getSession();


                    if (
                        sessionError
                    ) {

                        console.log(
                            sessionError
                        );

                        alert(
                            "Could not get current user."
                        );

                        return;

                    }


                    if (
                        !sessionData.session
                    ) {

                        alert(
                            "Please login first."
                        );

                        return;

                    }


                    const user =
                        sessionData
                            .session
                            .user;



                    // ====================================
                    // CHECK DATABASE FOR THIS ENDPOINT
                    // ====================================

                    const {
                        data:
                            existingSubscriptions,

                        error:
                            checkError
                    } =
                        await db
                            .from(
                                "push_subscriptions"
                            )
                            .select(
                                "id, endpoint"
                            )
                            .eq(
                                "user_id",
                                user.id
                            )
                            .eq(
                                "endpoint",
                                subscriptionJSON
                                    .endpoint
                            );


                    if (
                        checkError
                    ) {

                        console.log(
                            "Subscription check error:",
                            checkError
                        );

                        alert(
                            "Could not check notification subscription."
                        );

                        return;

                    }



                    // ====================================
                    // SAVE ONLY IF NOT ALREADY SAVED
                    // ====================================

                    if (
                        existingSubscriptions
                            .length === 0
                    ) {

                        const {
                            error:
                                insertError
                        } =
                            await db
                                .from(
                                    "push_subscriptions"
                                )
                                .insert({

                                    user_id:
                                        user.id,

                                    endpoint:
                                        subscriptionJSON
                                            .endpoint,

                                    p256dh:
                                        subscriptionJSON
                                            .keys
                                            .p256dh,

                                    auth:
                                        subscriptionJSON
                                            .keys
                                            .auth

                                });


                        if (
                            insertError
                        ) {

                            console.log(
                                "Subscription insert error:",
                                insertError
                            );

                            alert(
                                "Could not save notification subscription."
                            );

                            return;

                        }

                    }



                    // ====================================
                    // SUCCESS
                    // ====================================

                    enableNotificationsButton
                        .textContent =
                        "Notifications Enabled ✓";


                    enableNotificationsButton
                        .disabled =
                        true;


                    alert(
                        "Notifications enabled ✅"
                    );

                }

                catch (error) {

                    console.log(
                        "Notification error:",
                        error
                    );


                    alert(
                        "Could not enable notifications."
                    );

                }

            }
        );

}



// ====================================
// CHECK NOTIFICATION STATUS
// ====================================

async function updateNotificationButton() {

    if (
        !enableNotificationsButton
    ) {

        return;

    }


    if (
        !(
            "Notification"
            in window
        )
    ) {

        enableNotificationsButton
            .textContent =
            "Notifications unavailable";

        enableNotificationsButton
            .disabled =
            true;

        return;

    }


    if (
        Notification.permission !==
        "granted"
    ) {

        enableNotificationsButton
            .textContent =
            "Enable Notifications";

        enableNotificationsButton
            .disabled =
            false;

        return;

    }


    try {

        const registration =
            await navigator
                .serviceWorker
                .ready;


        const subscription =
            await registration
                .pushManager
                .getSubscription();


        if (
            subscription
        ) {

            enableNotificationsButton
                .textContent =
                "Notifications Enabled ✓";

            enableNotificationsButton
                .disabled =
                true;

        }

    }

    catch (error) {

        console.log(
            "Notification status error:",
            error
        );

    }

}



// ====================================
// REALTIME
// ====================================

function startRealtime() {

    if (
        itemsRealtimeChannel
    ) {

        return;

    }


    itemsRealtimeChannel =
        db
            .channel(
                "items-live"
            )

            .on(
                "postgres_changes",

                {

                    event: "*",

                    schema:
                        "public",

                    table:
                        "items"

                },

                async function (
                    payload
                ) {

                    console.log(
                        "Realtime change:",
                        payload
                    );


                    await loadItems();

                }
            )

            .subscribe(
                function (status) {

                    console.log(
                        "Realtime status:",
                        status
                    );

                }
            );

}



// ====================================
// STOP REALTIME
// ====================================

async function stopRealtime() {

    if (
        !itemsRealtimeChannel
    ) {

        return;

    }


    await db.removeChannel(
        itemsRealtimeChannel
    );


    itemsRealtimeChannel =
        null;

}



// ====================================
// START WEBSITE
// ====================================

checkExistingSession();



// ====================================
// SERVICE WORKER
// ====================================

if (
    "serviceWorker"
    in navigator
) {

    window.addEventListener(
        "load",
        function () {

            navigator
                .serviceWorker
                .register(
                    "./service-worker.js"
                )
                .then(
                    function (
                        registration
                    ) {

                        console.log(
                            "Service Worker registered",
                            registration
                        );

                    }
                )
                .catch(
                    function (
                        error
                    ) {

                        console.log(
                            "Service Worker error:",
                            error
                        );

                    }
                );

        }
    );

}