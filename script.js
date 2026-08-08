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
// LOAD USER PROFILE
// ====================================

async function loadUserProfile(userId) {

    const {
        data: profile,
        error
    } = await db
        .from("profiles")
        .select("username, display_name, role")
        .eq("id", userId)
        .single();


    if (error) {

        console.log(error);

        alert("Could not load profile");

        return false;
    }


    currentUserProfile = profile;


    welcomeName.textContent =
        currentUserProfile.display_name;


    return true;
}



// ====================================
// OPEN APP
// ====================================

async function openApp(userId) {

    const profileLoaded =
        await loadUserProfile(userId);


    if (!profileLoaded) {

        return;
    }


    loginBox.style.display = "none";

    appContent.style.display = "block";


    await loadItems();


    startRealtime();

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
            username + "@house.local";


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


        loginMessage.textContent = "";


        await openApp(
            data.user.id
        );

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
        await db.auth.getSession();


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

        stopRealtime();


        const {
            error
        } =
            await db.auth.signOut({
                scope: "local"
            });


        if (error) {

            console.log(error);

            alert("Could not logout");

            return;
        }


        currentUserProfile = null;


        itemsContainer.innerHTML = "";


        itemCount.textContent =
            "0 items";


        appContent.style.display =
            "none";


        loginBox.style.display =
            "block";


        loginPassword.value = "";

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


    itemsContainer.innerHTML = "";


    items.forEach(
        function (item) {

            displayItem(item);

        }
    );


    itemCount.textContent =
        items.length + " items";

}



// ====================================
// DISPLAY ITEM
// ====================================

function displayItem(item) {

    const newItem =
        document.createElement("div");


    newItem.classList.add("item");


    newItem.dataset.id =
        item.id;


    if (item.completed === true) {

        newItem.classList.add(
            "completed"
        );

    }


    newItem.innerHTML = `

        <div>

            <h3>${item.item_name}</h3>

            <p>
                ${item.requested_by}
                • Qty: ${item.quantity}
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


            // Realtime will refresh the list,
            // so we do not need to manually move it here.

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


            // Realtime handles removal

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
            itemName.value.trim();


        const qty =
            quantity.value;


        if (name === "") {

            alert(
                "Please enter an item"
            );

            return;
        }


        const person =
            currentUserProfile.display_name;


        const {
            error
        } =
            await db
                .from("items")
                .insert({

                    item_name: name,

                    quantity: qty,

                    requested_by:
                        person,

                    completed: false

                });


        if (error) {

            console.log(error);

            alert(
                "Could not add item"
            );

            return;
        }


        // Realtime will add it to the list


        itemName.value = "";

        quantity.value = 1;


        itemName.focus();

    }
);



// ====================================
// REALTIME
// ====================================

function startRealtime() {

    // Avoid creating the channel twice
    if (itemsRealtimeChannel) {

        return;
    }


    itemsRealtimeChannel =
        db
            .channel("items-live")

            .on(
                "postgres_changes",

                {
                    event: "*",
                    schema: "public",
                    table: "items"
                },

                async function (payload) {

                    console.log(
                        "Realtime change:",
                        payload
                    );


                    // Reload everything.
                    // Simple and reliable for a small house app.
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


    itemsRealtimeChannel = null;

}



// ====================================
// START WEBSITE
// ====================================

checkExistingSession();

// ====================================
// SERVICE WORKER
// ====================================

if ("serviceWorker" in navigator) {

    window.addEventListener(
        "load",
        function () {

            navigator.serviceWorker
                .register("./service-worker.js")
                .then(function () {

                    console.log(
                        "Service Worker registered"
                    );

                })
                .catch(function (error) {

                    console.log(
                        "Service Worker error:",
                        error
                    );

                });

        }
    );

}