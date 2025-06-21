origin.app( {
    appname: ' app name ',
    version: ' v 1.0.0 ',
    by: ' group name '
} )


// arrays: 

// const origin_apps = [];

// function createApp(name, desc, author) {
//     return {
//         name,
//         desc,
//         author,
//         actions: {},

//         addAction(actionName, callback) {
//             this.actions[actionName] = callback.bind(this);
//         },

//         runAction(actionName) {
//             if (this.actions[actionName]) {
//                 this.actions[actionName]();
//             } else {
//                 console.log(`Action "${actionName}" not found.`);
//             }
//         }
//     };
// }

// // Create an app object
// const origin = createApp("Origin", "Cool app", "Joel");

// // Add actions dynamically
// origin.addAction("showInfo", function () {
//     console.log(`
//         Name: ${this.name}
//         Description: ${this.desc}
//         Author: ${this.author}
//     `);
// });

// origin.addAction("greet", function () {
//     console.log(`Hello from ${this.name}!`);
// });

// // Store app in the array
// origin_apps.push(origin);

// // Usage examples
// origin.runAction("showInfo"); // Prints app details
// origin.runAction("greet");    // Prints greeting
// origin.runAction("nonexistent"); // Handles missing actions

