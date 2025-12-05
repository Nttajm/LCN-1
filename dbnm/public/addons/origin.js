[
"https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=settings",  
"public/addons/resources/origin/origin-main.css",
"../css/standard.css",

].forEach
    (href => {  
        document.head.appendChild(Object.assign(document.createElement("link"), {  
            rel: "stylesheet",  
            href  
        }));  
    });

    


    const origin_apps = [];

    function createApp(name, desc, author, id, img) {
        return {
            name,
            desc,
            author,
            id,
            img,
            actions: {},
    
            addAction(actionName, callback) {
                this.actions[actionName] = callback.bind(this);
            },
    
            runAction(actionName) {
                if (this.actions[actionName]) {
                    this.actions[actionName]();
                } else {
                    console.log(`Action "${actionName}" not found.`);
                }
            }
        };
    }
    
    // Create an app object
    const origin_ = createApp("Origin", "Cool app", "Joel", 'origin-app', 'public/addons/resources/origin/origin.png');
    
    // Add actions dynamically
    origin_.addAction("showInfo", function () {
        console.log(`
            Name: ${this.name}
            Description: ${this.desc}
            Author: ${this.author}
        `);
    });
    
    origin_.addAction("greet", function () {
        console.log(`Hello from ${this.name}!`);
    });

    origin_.addAction("express", function () {
        return 'hi'
    });
    
    // Store app in the array
    origin_apps.push(origin_);

    $(document).ready(function() {

        function renderApps() {

            $('#o-apps').empty();
            
            origin_apps.forEach(app => {
                const appHtml = `
                    <div class="ajs-app" id="js-o-${app.id}">
                        <div class="app-logo">
                            <img src="${app.img}" alt="">
                        </div>
                        <div class="content"></div>
                    </div>
                `;
    
                $('#o-apps').append(appHtml);
            });
        }

        renderApps();
    
    });
    
    
    const all_origin_apps = document.querySelectorAll('.ajs-app');

    all_origin_apps.forEach(app => {
        app.addEventListener('click', function() {
            
        });
    });
    

    function openApp(content, element) {
       let html = `
       
       `
    }