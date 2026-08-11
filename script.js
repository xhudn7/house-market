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
    document.getElementById("enableNotificationsButton");

const notifyFamilyButton =
    document.getElementById("notifyFamilyButton");

const goingMarketButton =
    document.getElementById("goingMarketButton");



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
    document.getElementById("itemsContainer");

const itemCount =
    document.getElementById("itemCount");



// ====================================
// SUPABASE EDGE FUNCTION
// ====================================

const SEND_PUSH_FUNCTION_URL =
    "https://ftysipznkdquthtdxzqc.supabase.co/functions/v1/send-push";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_50UgIKqEbhPkVxTrNfGH9g_4zdcMGlQ";



// ====================================
// VAPID PUBLIC KEY
// ====================================

const VAPID_PUBLIC_KEY =
    "BCijp9taI2BTDBs4g4iFm-YNf5Z21LRskYKJJgQLQjdOQf8Y5ixevnXUkDoglfXhBS9gHuYxupnrhtxbUcL8G1w";



// ====================================
// VAPID CONVERTER
// ====================================

function urlBase64ToUint8Array(base64String) {

    const padding =
        "=".repeat(
            (4 - base64String.length % 4) % 4
        );

    const base64 =
        (base64String + padding)
            .replace(/-/g, "+")
            .replace(/_/g, "/");

    const rawData =
        window.atob(base64);

    return Uint8Array.from(
        [...rawData].map(
            char => char.charCodeAt(0)
        )
    );
}



// ====================================
// GET CURRENT SESSION
// ====================================

async function getCurrentSession() {

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
            "Session error:",
            error
        );

        return null;
    }


    return data.session;
}



// ====================================
// CALL SEND-PUSH FUNCTION
// ====================================

async function callSendPush(action) {

    const session =
        await getCurrentSession();


    if (!session) {

        return {
            success: false,
            error: "Please login again."
        };
    }


    const response =
        await fetch(
            SEND_PUSH_FUNCTION_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "apikey":
                        SUPABASE_PUBLISHABLE_KEY,

                    "Authorization":
                        `Bearer ${session.access_token}`
                },

                body:
                    JSON.stringify({
                        action: action
                    })
            }
        );


    let data;


    try {

        data =
            await response.json();

    }

    catch (error) {

        console.log(
            "Could not read Edge Function response:",
            error
        );

        return {
            success: false,
            error: "Invalid server response"
        };
    }


    console.log(
        "send-push response:",
        data
    );


    if (!response.ok) {

        return {
            success: false,
            ...data
        };
    }


    return data;
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
        error ||
        !profile
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
        currentUserProfile.display_name;


    updateNotifyFamilyButton();

    updateGoingMarketButton();


    return true;
}



// ====================================
// REFRESH PROFILE STATE
// ====================================

async function refreshProfileState() {

    const session =
        await getCurrentSession();


    if (!session) {
        return;
    }


    await loadUserProfile(
        session.user.id
    );
}



// ====================================
// NOTIFY FAMILY BUTTON
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


    if (count > 0) {

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
// GOING MARKET BUTTON
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


    if (!lastNotification) {

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
        (now - lastTime);


    if (remainingMs <= 0) {

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

    if (marketCooldownTimer) {

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
// ENTER TO LOGIN
// ====================================

loginPassword.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Enter") {

            loginButton.click();
        }
    }
);



// ====================================
// EXISTING SESSION
// ====================================

async function checkExistingSession() {

    const session =
        await getCurrentSession();


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


        if (marketCooldownTimer) {

            clearInterval(
                marketCooldownTimer
            );

            marketCooldownTimer =
                null;
        }


        const {
            error
        } =
            await db.auth.signOut({
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


    if (item.completed === true) {

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



    doneButton.addEventListener(
        "click",
        async function () {

            const newCompletedValue =
                !newItem.classList.contains(
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
            }
        }
    );



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
            }
        }
    );


    itemsContainer.appendChild(
        newItem
    );
}



// ====================================
// ADD ITEM
// ====================================

addButton.addEventListener(
    "click",
    async function () {

        const name =
            itemName.value.trim();


        const qty =
            Number(
                quantity.value
            ) || 1;


        if (name === "") {

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
                    item_name: name,
                    quantity: qty,
                    requested_by: person,
                    completed: false
                });


        addButton.disabled =
            false;


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


        await refreshProfileState();
    }
);



// ====================================
// ENTER TO ADD ITEM
// ====================================

itemName.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Enter") {

            addButton.click();
        }
    }
);



// ====================================
// ENABLE NOTIFICATIONS
// ====================================

if (enableNotificationsButton) {

    enableNotificationsButton
        .addEventListener(
            "click",
            async function () {

                try {

                    if (
                        !("serviceWorker" in navigator) ||
                        !("PushManager" in window) ||
                        !("Notification" in window)
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
                        permission !== "granted"
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


                    if (!subscription) {

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
                        subscription.toJSON();


                    const session =
                        await getCurrentSession();


                    if (!session) {

                        alert(
                            "Please login first."
                        );

                        return;
                    }


                    const user =
                        session.user;


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


                    if (checkError) {

                        console.log(
                            checkError
                        );

                        alert(
                            "Could not check notification subscription."
                        );

                        return;
                    }


                    if (
                        existingSubscriptions.length === 0
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
                                        subscriptionJSON.endpoint,

                                    p256dh:
                                        subscriptionJSON
                                            .keys
                                            .p256dh,

                                    auth:
                                        subscriptionJSON
                                            .keys
                                            .auth
                                });


                        if (insertError) {

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
// NOTIFICATION STATUS
// ====================================

async function updateNotificationButton() {

    if (!enableNotificationsButton) {
        return;
    }


    if (!("Notification" in window)) {

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


        if (subscription) {

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
// NOTIFY FAMILY
// ====================================

notifyFamilyButton.addEventListener(
    "click",
    async function () {

        const count =
            currentUserProfile
                ?.pending_notify_count || 0;


        if (count <= 0) {

            updateNotifyFamilyButton();

            return;
        }


        notifyFamilyButton.disabled =
            true;


        notifyFamilyButton.textContent =
            "🔔 Sending...";


        try {

            const result =
                await callSendPush(
                    "notify_family"
                );


            if (!result.success) {

                console.log(
                    "Notify family error:",
                    result
                );


                alert(
                    result.error ||
                    "Could not notify family."
                );


                await refreshProfileState();

                return;
            }


            let extraMessage =
                "";


            if (
                result.recipients === 0
            ) {

                extraMessage =
                    "\n\nNo other subscribed devices yet.";
            }

            else {

                extraMessage =
                    `\n\nSent to ${result.sent} device(s).`;
            }


            alert(
                "Family notified ✅\n" +
                result.message +
                extraMessage
            );


            await refreshProfileState();

        }

        catch (error) {

            console.log(
                "Notify family error:",
                error
            );


            alert(
                "Could not notify family."
            );


            await refreshProfileState();
        }
    }
);



// ====================================
// GOING TO MARKET
// ====================================

goingMarketButton.addEventListener(
    "click",
    async function () {

        goingMarketButton.disabled =
            true;


        goingMarketButton.textContent =
            "🚗 Sending...";


        try {

            const result =
                await callSendPush(
                    "going_market"
                );


            if (!result.success) {

                console.log(
                    "Market notification error:",
                    result
                );


                if (
                    result.code ===
                    "MARKET_COOLDOWN"
                ) {

                    alert(
                        `You can use this again in ${result.remaining_minutes} minutes.`
                    );

                }

                else {

                    alert(
                        result.error ||
                        "Could not send market notification."
                    );
                }


                await refreshProfileState();

                return;
            }


            let extraMessage =
                "";


            if (
                result.recipients === 0
            ) {

                extraMessage =
                    "\n\nNo other subscribed devices yet.";
            }

            else {

                extraMessage =
                    `\n\nSent to ${result.sent} device(s).`;
            }


            alert(
                "Going to market notification sent 🚗✅" +
                extraMessage
            );


            await refreshProfileState();

        }

        catch (error) {

            console.log(
                "Market notification error:",
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

    if (itemsRealtimeChannel) {
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

                async function (payload) {

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

    if (!itemsRealtimeChannel) {
        return;
    }


    await db.removeChannel(
        itemsRealtimeChannel
    );


    itemsRealtimeChannel =
        null;
}



// ====================================
// START APP
// ====================================

checkExistingSession();



// ====================================
// SERVICE WORKER
// ====================================

if ("serviceWorker" in navigator) {

    window.addEventListener(
        "load",
        function () {

            navigator
                .serviceWorker
                .register(
                    "./service-worker.js"
                )
                .then(
                    function (registration) {

                        console.log(
                            "Service Worker registered",
                            registration
                        );
                    }
                )
                .catch(
                    function (error) {

                        console.log(
                            "Service Worker error:",
                            error
                        );
                    }
                );
        }
    );
}