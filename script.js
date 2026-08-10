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

const welcomeName =
    document.getElementById("welcomeName");

const logoutButton =
    document.getElementById("logoutButton");



// ====================================
// NOTIFICATION BUTTONS
// ====================================

const enableNotificationsButton =
    document.getElementById(
        "enableNotificationsButton"
    );

const notifyFamilyButton =
    document.getElementById(
        "notifyFamilyButton"
    );

const goingMarketButton =
    document.getElementById(
        "goingMarketButton"
    );



// ====================================
// CURRENT USER
// ====================================

let currentUserProfile = null;



// ====================================
// REALTIME CHANNEL
// ====================================

let itemsRealtimeChannel = null;



// ====================================
// MARKET COOLDOWN
// ====================================

let marketCooldownTimer = null;

const MARKET_COOLDOWN_MINUTES = 60;



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
    document.getElementById(
        "itemsContainer"
    );

const itemCount =
    document.getElementById(
        "itemCount"
    );



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
// SYNC EDGE FUNCTION AUTH
// ====================================

async function syncFunctionAuth() {

    const {
        data,
        error
    } =
        await db.auth.getSession();


    if (
        error ||
        !data.session
    ) {

        console.log(
            "Could not sync function auth:",
            error
        );

        return false;

    }


    db.functions.setAuth(
        data.session.access_token
    );


    return true;

}



// ====================================
// LOAD USER PROFILE
// ====================================

async function loadUserProfile(
    userId
) {

    const {
        data: profile,
        error
    } =
        await db
            .from("profiles")
            .select(
                `
                username,
                display_name,
                role,
                pending_notify_count,
                last_market_notification_at
                `
            )
            .eq(
                "id",
                userId
            )
            .single();


    if (
        error
    ) {

        console.log(
            "Profile error:",
            error
        );


        alert(
            "Could not load profile"
        );


        return false;

    }


    currentUserProfile =
        profile;


    welcomeName.textContent =
        currentUserProfile
            .display_name;


    updateNotifyFamilyButton();

    updateGoingMarketButton();


    return true;

}



// ====================================
// REFRESH PROFILE STATE
// ====================================

async function refreshProfileState() {

    const {
        data,
        error
    } =
        await db.auth.getSession();


    if (
        error ||
        !data.session
    ) {

        return;

    }


    await loadUserProfile(
        data.session.user.id
    );

}



// ====================================
// NOTIFY FAMILY BUTTON STATE
// ====================================

function updateNotifyFamilyButton() {

    if (
        !notifyFamilyButton ||
        !currentUserProfile
    ) {

        return;

    }


    const count =
        currentUserProfile
            .pending_notify_count || 0;


    if (
        count > 0
    ) {

        notifyFamilyButton.disabled =
            false;


        notifyFamilyButton.textContent =
            `🔔 Notify Family (${count})`;

    }

    else {

        notifyFamilyButton.disabled =
            true;


        notifyFamilyButton.textContent =
            "🔔 Nothing New to Notify";

    }

}



// ====================================
// GOING MARKET BUTTON STATE
// ====================================

function updateGoingMarketButton() {

    if (
        !goingMarketButton ||
        !currentUserProfile
    ) {

        return;

    }


    const lastNotification =
        currentUserProfile
            .last_market_notification_at;


    if (
        !lastNotification
    ) {

        goingMarketButton.disabled =
            false;


        goingMarketButton.textContent =
            "🚗 Going to the Market";


        return;

    }


    const lastTime =
        new Date(
            lastNotification
        ).getTime();


    const now =
        Date.now();


    const cooldownMs =
        MARKET_COOLDOWN_MINUTES *
        60 *
        1000;


    const remainingMs =
        cooldownMs -
        (
            now -
            lastTime
        );


    if (
        remainingMs <= 0
    ) {

        goingMarketButton.disabled =
            false;


        goingMarketButton.textContent =
            "🚗 Going to the Market";


        return;

    }


    const remainingMinutes =
        Math.ceil(
            remainingMs /
            1000 /
            60
        );


    goingMarketButton.disabled =
        true;


    goingMarketButton.textContent =
        `🚗 Available in ${remainingMinutes} min`;

}



// ====================================
// MARKET COOLDOWN TIMER
// ====================================

function startMarketCooldownTimer() {

    if (
        marketCooldownTimer
    ) {

        clearInterval(
            marketCooldownTimer
        );

    }


    marketCooldownTimer =
        setInterval(
            function () {

                updateGoingMarketButton();

            },
            30000
        );

}



// ====================================
// OPEN APP
// ====================================

async function openApp(
    userId
) {

    const profileLoaded =
        await loadUserProfile(
            userId
        );


    if (
        !profileLoaded
    ) {

        return;

    }


    // Set the real signed-in user's JWT
    // for Edge Function requests.

    const authSynced =
        await syncFunctionAuth();


    if (
        !authSynced
    ) {

        console.log(
            "Edge Function auth not ready"
        );

    }


    loginBox.style.display =
        "none";


    appContent.style.display =
        "block";


    await loadItems();


    startRealtime();

    startMarketCooldownTimer();

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

                    email:
                        email,

                    password:
                        password

                });


        if (
            error
        ) {

            loginMessage.textContent =
                "Wrong username or password";


            return;

        }


        loginMessage.textContent =
            "";


        // Make sure Edge Functions
        // use this new session.

        await syncFunctionAuth();


        await openApp(
            data.user.id
        );

    }
);



// ====================================
// ENTER TO LOGIN
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


    if (
        error
    ) {

        console.log(
            error
        );


        return;

    }


    const session =
        data.session;


    if (
        !session
    ) {

        loginBox.style.display =
            "block";


        appContent.style.display =
            "none";


        return;

    }


    await syncFunctionAuth();


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


        if (
            marketCooldownTimer
        ) {

            clearInterval(
                marketCooldownTimer
            );


            marketCooldownTimer =
                null;

        }


        const {
            error
        } =
            await db.auth
                .signOut({

                    scope:
                        "local"

                });


        if (
            error
        ) {

            console.log(
                error
            );


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
                    ascending:
                        true
                }
            )

            .order(
                "created_at",
                {
                    ascending:
                        true
                }
            );


    if (
        error
    ) {

        console.log(
            error
        );


        alert(
            "Could not load shopping list"
        );


        return;

    }


    itemsContainer.innerHTML =
        "";


    items.forEach(
        function (item) {

            displayItem(
                item
            );

        }
    );


    itemCount.textContent =
        items.length +
        " items";

}



// ====================================
// DISPLAY ITEM
// ====================================

function displayItem(
    item
) {

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
                • Qty:
                ${item.quantity}
            </p>

        </div>


        <div class="item-buttons">

            <button
                class="done-button"
            >
                ✓
            </button>

            <button
                class="delete-button"
            >
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


            if (
                error
            ) {

                console.log(
                    error
                );


                alert(
                    "Could not update item"
                );


                return;

            }

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


            if (
                error
            ) {

                console.log(
                    error
                );


                alert(
                    "Could not delete item"
                );


                return;

            }

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


        addButton.disabled =
            true;


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


        addButton.disabled =
            false;


        if (
            error
        ) {

            console.log(
                error
            );


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


        // Database trigger already increased
        // pending_notify_count.

        await refreshProfileState();

    }
);



// ====================================
// ENTER TO ADD ITEM
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
// ENABLE PUSH NOTIFICATIONS
// ====================================

if (
    enableNotificationsButton
) {

    enableNotificationsButton
        .addEventListener(
            "click",
            async function () {

                try {

                    if (
                        !(
                            "serviceWorker"
                            in navigator
                        ) ||
                        !(
                            "PushManager"
                            in window
                        ) ||
                        !(
                            "Notification"
                            in window
                        )
                    ) {

                        alert(
                            "Push notifications are not supported on this device."
                        );


                        return;

                    }


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


                    const registration =
                        await navigator
                            .serviceWorker
                            .ready;


                    let subscription =
                        await registration
                            .pushManager
                            .getSubscription();


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


                    const subscriptionJSON =
                        subscription
                            .toJSON();


                    const {
                        data: sessionData
                    } =
                        await db.auth
                            .getSession();


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
                            checkError
                        );


                        alert(
                            "Could not check notification subscription."
                        );


                        return;

                    }


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
                                insertError
                            );


                            alert(
                                "Could not save notification subscription."
                            );


                            return;

                        }

                    }


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

                catch (
                    error
                ) {

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

    catch (
        error
    ) {

        console.log(
            "Notification status error:",
            error
        );

    }

}



// ====================================
// NOTIFY FAMILY
// ====================================

notifyFamilyButton.addEventListener(
    "click",
    async function () {

        if (
            !currentUserProfile
        ) {

            return;

        }


        const count =
            currentUserProfile
                .pending_notify_count || 0;


        if (
            count <= 0
        ) {

            updateNotifyFamilyButton();

            return;

        }


        notifyFamilyButton.disabled =
            true;


        notifyFamilyButton.textContent =
            "🔔 Sending...";


        try {

            // Refresh JWT immediately
            // before calling function.

            const authReady =
                await syncFunctionAuth();


            if (
                !authReady
            ) {

                alert(
                    "Please login again."
                );


                await refreshProfileState();


                return;

            }


            const {
                data,
                error
            } =
                await db.functions.invoke(
                    "send-push",
                    {

                        body: {

                            action:
                                "notify_family"

                        }

                    }
                );


            if (
                error
            ) {

                console.log(
                    "Notify family error:",
                    error
                );


                // Try to display actual
                // Edge Function response.

                try {

                    const errorBody =
                        await error.context
                            .json();


                    console.log(
                        "Function response:",
                        errorBody
                    );

                }

                catch (
                    readError
                ) {

                    console.log(
                        "Could not read function error:",
                        readError
                    );

                }


                alert(
                    "Could not notify the family."
                );


                await refreshProfileState();


                return;

            }


            if (
                !data ||
                data.success !== true
            ) {

                alert(
                    data?.error ||
                    "Could not notify the family."
                );


                await refreshProfileState();


                return;

            }


            alert(
                `Family notified ✅\n${data.message}`
            );


            await refreshProfileState();

        }

        catch (
            error
        ) {

            console.log(
                "Notify family error:",
                error
            );


            alert(
                "Could not notify the family."
            );


            await refreshProfileState();

        }

    }
);



// ====================================
// GOING TO THE MARKET
// ====================================

goingMarketButton.addEventListener(
    "click",
    async function () {

        if (
            !currentUserProfile
        ) {

            return;

        }


        goingMarketButton.disabled =
            true;


        goingMarketButton.textContent =
            "🚗 Sending...";


        try {

            // Refresh JWT immediately
            // before calling function.

            const authReady =
                await syncFunctionAuth();


            if (
                !authReady
            ) {

                alert(
                    "Please login again."
                );


                await refreshProfileState();


                return;

            }


            const {
                data,
                error
            } =
                await db.functions.invoke(
                    "send-push",
                    {

                        body: {

                            action:
                                "going_market"

                        }

                    }
                );


            if (
                error
            ) {

                console.log(
                    "Going market error:",
                    error
                );


                try {

                    const errorBody =
                        await error.context
                            .json();


                    console.log(
                        "Function response:",
                        errorBody
                    );

                }

                catch (
                    readError
                ) {

                    console.log(
                        "Could not read function error:",
                        readError
                    );

                }


                alert(
                    "Could not send market notification."
                );


                await refreshProfileState();


                return;

            }


            if (
                !data ||
                data.success !== true
            ) {

                if (
                    data?.code ===
                    "MARKET_COOLDOWN"
                ) {

                    alert(
                        `You can use this again in ${data.remaining_minutes} minutes.`
                    );

                }

                else {

                    alert(
                        data?.error ||
                        "Could not send market notification."
                    );

                }


                await refreshProfileState();


                return;

            }


            alert(
                "Family notified that you're going to the market 🚗✅"
            );


            await refreshProfileState();

        }

        catch (
            error
        ) {

            console.log(
                "Going market error:",
                error
            );


            alert(
                "Could not send market notification."
            );


            await refreshProfileState();

        }

    }
);



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

                    event:
                        "*",

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
                function (
                    status
                ) {

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