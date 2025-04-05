[
"https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=settings",  
"public/addons/resources/origin/origin-main.css"
].forEach
    (href => {  
        document.head.appendChild(Object.assign(document.createElement("link"), {  
            rel: "stylesheet",  
            href  
        }));  
    });
   

const origin_apps = []

class app {
    constructor(
        name,
        desc, 
        author,
    ) {
        this.name = name ,
        this.desc = desc,
        this.author = author,
    }
}
