var CALORIE_TARGET = 2200;

var TIME_POINTS = [
    { label: "5:30 AM", name: "Dawn" },
    { label: "6:30 AM", name: "+1 hr" },
    { label: "7:30 AM", name: "+1 hr" },
    { label: "8:30 AM", name: "+1 hr" },
    { label: "1:00 PM", name: "Afternoon" },
    { label: "3:00 PM", name: "+2 hrs" },
    { label: "7:00 PM", name: "Evening" },
    { label: "10:00 PM", name: "End" }
];

var state = {
    scene: 0,
    calories: 0,
    totalCalories: 0,
    energy: 40,
    day: 1,
    effects: [],
    choices: {},
    dailyIntakes: []
};

var eduContent = {
    protein: {
        badge: "Nutrient Deficiency",
        badgeClass: "edu-badge-nutrient",
        title: "Not Enough Protein",
        body: 'Your body needs protein to build and fix muscle, fight sickness, and grow. Without it you get swelling, lose muscle, and get sick easily. Corn-based foods don\'t have the right kinds of protein.'
    },
    iron: {
        badge: "Nutrient Deficiency",
        badgeClass: "edu-badge-nutrient",
        title: "Not Enough Iron (Anemia)",
        body: 'Iron helps your blood carry oxygen. Without enough, you feel tired all the time, get dizzy, can\'t focus, and your heart beats too fast. Plant iron is hard for your body to absorb without vitamin C.'
    },
    vitaminA: {
        badge: "Nutrient Deficiency",
        badgeClass: "edu-badge-nutrient",
        title: "Not Enough Vitamin A",
        body: 'Vitamin A keeps your eyes and immune system working. Without it you lose your night vision and get sick more often. The corn-based diet here has almost zero vitamin A.'
    },
    metabolism: {
        badge: "Biology",
        badgeClass: "edu-badge-biology",
        title: "What Happens to Your Body",
        body: 'Your metabolism slows down 20–30%. Your body starts breaking down its own muscle for energy. Fat runs out, then things get really dangerous. In teens, this can stop you from growing.'
    },
    systems: {
        badge: "Biology",
        badgeClass: "edu-badge-biology",
        title: "Body Systems Breaking Down",
        body: 'Your immune system gets weak — a malnourished kid is 6–10x more likely to die from a common infection. Your gut stops absorbing food well. Your brain can\'t focus or remember things.'
    },
    longterm: {
        badge: "Long-Term Effects",
        badgeClass: "edu-badge-longterm",
        title: "Long-Term Damage",
        body: 'About 26% of young kids in Kenya are stunted — permanently shorter with brain damage that can\'t be fixed. They earn 20% less as adults. Malnourished moms have malnourished babies, and the cycle repeats.'
    }
};

function getSceneData(idx) {
    var s = state;
    switch (idx) {
        case 0:
            return {
                time: "5:30 AM — Dawn",
                title: "Before Sunrise",
                narrative: [
                    "I wake up before the sun comes up. I sleep on a thin mat on the ground. My little sister Wanjiku is curled up next to me, still asleep.",
                    "I live in <span data-tip='A semi-arid county in eastern Kenya, one of the regions most affected by recurring droughts and food insecurity'>Kitui County</span> in eastern Kenya. Our house has mud walls and a metal roof. I'm fifteen, and my mom takes care of four of us by herself.",
                    "I'm already hungry. I went to bed hungry too. The <span data-tip='Small-scale farms that most rural Kenyan families depend on for food and income'>shamba</span> behind our house where we used to grow food is just dry dirt now. It hasn't rained in a long time."
                ],
                fact: "<strong>Food Insecurity in Kenya:</strong> About 14.5 million people in Kenya don't have enough food. In dry areas like Kitui, droughts have destroyed farming. Families here spend over 60% of their money just on food.",
                choices: null,
                calorieChange: 0,
                energyChange: 0,
                newEffects: ["Chronic Hunger", "Low Energy"],
                effectTypes: ["warning", "warning"],
                eduTrigger: null
            };
        case 1:
            return {
                time: "6:30 AM — Morning",
                title: "Breakfast",
                narrative: [
                    "My mom made a small pot of <span data-tip='A thin maize porridge, a staple breakfast food across East Africa. Provides carbohydrates but very little protein or micronutrients'>uji</span>, which is like a watery porridge, on our little charcoal <span data-tip='A traditional Kenyan cooking stove, usually made of metal or clay, that burns charcoal or wood'>jiko</span> stove. No sugar, no milk. We're almost out of flour.",
                    "There's only enough for two small bowls. My mom won't eat — she never does when there isn't much food.",
                    "Wanjiku stares at me. She's eight. She's so skinny I can see her ribs."
                ],
                fact: "<strong>Typical Diet:</strong> Most meals here are just <span data-tip='A stiff maize porridge that is the staple food of Kenya. Made by mixing maize flour with boiling water'>ugali</span> (thick corn porridge) and uji — mostly carbs with almost no protein or vitamins. During droughts, people only eat 600–900 calories a day. That's less than half of what you need.",
                choices: [
                    { id: "breakfast_eat", marker: "A", title: "Eat my portion", desc: "I need energy to walk to school and pay attention in class.", calories: 180, energy: 8 },
                    { id: "breakfast_give", marker: "B", title: "Give mine to Wanjiku", desc: "She's younger and smaller. She needs it more.", calories: 0, energy: -5 }
                ],
                calorieChange: 0,
                energyChange: 0,
                newEffects: [],
                effectTypes: [],
                eduTrigger: null
            };
        case 2:
            var ateBreakfast = s.choices.breakfast === "breakfast_eat";
            var paras = [];
            if (ateBreakfast) {
                paras.push("The porridge is watery, but it helps a little. About 180 calories — not even close to enough. I feel full for maybe ten minutes.");
            } else {
                paras.push("I watch Wanjiku drink the extra bowl. She smiles, which almost makes it worth it. Almost. When I stand up, I get really dizzy.");
            }
            paras.push("I have to walk three kilometers to school on a dusty dirt road. It's hard to keep going. I see other kids walking the same way — most of them are really thin too.");
            return {
                time: "7:30 AM — The Walk",
                title: "Walking to School",
                narrative: paras,
                fact: "<strong>Physical Toll:</strong> Walking 3 km burns about 120–150 calories. When you're already not eating enough, your body starts breaking down muscle for energy. It's a cycle — the weaker you get, the harder it is to get food.",
                choices: null,
                calorieChange: -40,
                energyChange: -12,
                newEffects: ateBreakfast ? ["Fatigue"] : ["Severe Hunger", "Light-Headed", "Fatigue"],
                effectTypes: ateBreakfast ? ["warning"] : ["danger", "danger", "warning"],
                eduTrigger: "protein"
            };
        case 3:
            return {
                time: "8:30 AM — Crossroads",
                title: "School or Food",
                narrative: [
                    "The road splits. Left goes to school. Right goes to the market where people get paid to load trucks.",
                    "If I go to school, I'll be sitting there hungry all day. There's no lunch today — they ran out of food.",
                    "If I go to the market, I could earn enough for a <span data-tip='Kenyan flatbread, a common street food. One chapati provides roughly 150-200 calories, mostly carbohydrates'>chapati</span> or some flour. But I'd miss class. Do I choose my future or my family eating tonight?"
                ],
                fact: "<strong>Education vs. Survival:</strong> In areas hit by drought, up to 50% more kids drop out of school. Every year of school you miss means about 10% less money you'll earn as an adult. Hunger is the #1 reason kids stop going to school.",
                choices: [
                    { id: "path_school", marker: "A", title: "Go to school", desc: "School is my only way out of this. I'll deal with being hungry.", calories: 0, energy: -8 },
                    { id: "path_market", marker: "B", title: "Go work at the market", desc: "My family needs food today. School can wait.", calories: 0, energy: -15 }
                ],
                calorieChange: 0,
                energyChange: 0,
                newEffects: [],
                effectTypes: [],
                eduTrigger: null
            };
        case 4:
            var wentToSchool = s.choices.path === "path_school";
            var paras4 = [];
            var cal = 0;
            var eng = 0;
            var newEff = [];
            var effTypes = [];
            if (wentToSchool) {
                paras4.push("There are 43 kids crammed into a classroom meant for 20. It's hot. I can barely focus. The teacher is talking but the words don't stick.");
                paras4.push("At break, something good happens — the school feeding program got an emergency delivery. It's just thin porridge, maybe 150 calories, but I'm so relieved.");
                cal = 150;
                eng = 5;
                newEff = ["Difficulty Concentrating"];
                effTypes = ["warning"];
            } else {
                paras4.push("The market is loud and dusty. I wait near the grain storage with other kids looking for work. For three hours I carry heavy sacks of maize in the heat. I almost fall twice.");
                paras4.push("I earn 80 shillings. I buy two chapatis and some chai — about 350 calories. That's the most food I've had in two days. I save one chapati for my mom.");
                cal = 200;
                eng = -5;
                newEff = ["Muscle Pain", "Difficulty Concentrating"];
                effTypes = ["danger", "warning"];
            }
            paras4.push("I don't have enough <span data-tip='Iron is essential for hemoglobin production, oxygen transport, and energy metabolism. Deficiency causes anemia, the most common nutritional disorder globally'>iron</span> in my blood. I'm tired all the time, and my heart races when I walk uphill. My body needs help but I have nothing to give it.");
            return {
                time: "1:00 PM — Midday",
                title: wentToSchool ? "Hungry at School" : "Working for Food",
                narrative: paras4,
                fact: "<strong>Daily Calorie Reality:</strong> A 15-year-old needs about 2,200 calories per day. In Kitui, most people only get 650–900. That's a gap of over 1,000 calories every single day.",
                choices: null,
                calorieChange: cal,
                energyChange: eng,
                newEffects: newEff,
                effectTypes: effTypes,
                eduTrigger: "iron"
            };
        case 5:
            return {
                time: "3:00 PM — Afternoon",
                title: "Trying to Buy Food",
                narrative: [
                    "It's over 35°C outside. I have almost no energy. Every step I take feels like it costs something.",
                    "At the <span data-tip='Open-air markets in rural Kenya where farmers and vendors sell produce, often at fluctuating prices driven by scarcity and drought cycles'>duka</span> (the local shop), prices went up again. Corn flour is 180 shillings per kilo — it used to be 90. Beans are 250 per kilo. My mom gave me our last 100 shillings."
                ],
                fact: "<strong>Food Affordability:</strong> Eating healthy costs about 250 shillings per person per day. But most families here only make 150–300 shillings total. So people buy whatever has the most calories, not what's healthiest.",
                choices: [
                    { id: "food_maize", marker: "A", title: "Buy corn flour (2 kg)", desc: "More food overall. Basic ugali for tonight and tomorrow.", calories: 0, energy: 0 },
                    { id: "food_veg", marker: "B", title: "Buy 1 kg flour + greens and beans", desc: "Less food, but healthier. I really need vitamins and iron.", calories: 0, energy: 0 }
                ],
                calorieChange: 0,
                energyChange: -6,
                newEffects: ["Weakness", "Dizziness"],
                effectTypes: ["danger", "danger"],
                eduTrigger: "vitaminA"
            };
        case 6:
            var boughtMaize = s.choices.food === "food_maize";
            var paras6 = [];
            var cal6 = 0;
            if (boughtMaize) {
                paras6.push("Dinner is ugali again. Just corn — no protein, no vitamins. We've been eating the same thing for months.");
                paras6.push("My portion is small because my family eats first. Maybe 250 calories for me.");
                cal6 = 250;
            } else {
                paras6.push("I make a smaller portion of ugali but cook some greens and beans with it. The greens have <span data-tip='Vitamin A (from greens), Iron (from beans and greens), and Folate — critical micronutrients absent from a pure maize diet'>vitamins and minerals</span> that my body really needs.");
                paras6.push("It's still not enough food. It's never enough. But at least it has some real nutrition.");
                cal6 = 200;
            }
            paras6.push("It gets dark. My whole body hurts in ways that shouldn't be normal for someone my age. I can barely see at night anymore — my <span data-tip='Night blindness is an early sign of vitamin A deficiency. The retinal cells that function in low light require vitamin A to produce rhodopsin, a light-sensitive pigment'>night vision</span> keeps getting worse. It's hard to study when your brain doesn't have enough energy to think.");
            return {
                time: "7:00 PM — Night",
                title: "Another Night Hungry",
                narrative: paras6,
                fact: "<strong>Emotional Impact:</strong> Being hungry all the time causes anxiety, depression, and feeling hopeless. Kids in Kenya who don't get enough food are 3 times more likely to be depressed than kids who eat enough.",
                choices: null,
                calorieChange: cal6,
                energyChange: -8,
                newEffects: ["Night Vision Issues", "Emotional Exhaustion"],
                effectTypes: ["danger", "warning"],
                eduTrigger: "metabolism"
            };
        case 7:
            var paras7 = [
                "I lie on my mat staring at the metal roof. My whole body aches in ways that shouldn't be normal for someone my age. My stomach growls but there's nothing left to eat.",
                "Tomorrow will be the same. Wake up hungry, walk, try to get through the day, eat a little if I'm lucky, sleep, do it again. My body is breaking down and I can feel it.",
                "For millions of people, this isn't just one bad day — it's every day. Kids stop growing. Their brains don't develop right. But there are real solutions that actually work."
            ];
            return {
                time: "10:00 PM — End of the Day",
                title: "What Happens Next",
                narrative: paras7,
                fact: "<strong>Calorie Deficit:</strong> Today I ate about " + state.totalCalories + " calories. My body needed " + CALORIE_TARGET + ". That missing " + (CALORIE_TARGET - state.totalCalories) + " calories came from my own body — first fat, then muscle, then it starts affecting my organs.",
                choices: null,
                calorieChange: 0,
                energyChange: -8,
                newEffects: ["Stunted Growth Risk", "Immune Weakness", "Cognitive Decline"],
                effectTypes: ["severe", "severe", "severe"],
                eduTrigger: "longterm",
                isFinal: true
            };
        default:
            return null;
    }
}

var dom = {};

function cacheDom() {
    dom.intro = document.getElementById("intro");
    dom.btnStart = document.getElementById("btnStart");
    dom.app = document.getElementById("app");
    dom.timelineFill = document.getElementById("timelineFill");
    dom.timelineNodes = document.getElementById("timelineNodes");
    dom.calorieValue = document.getElementById("calorieValue");
    dom.calorieBar = document.getElementById("calorieBar");
    dom.calorieLabel = document.getElementById("calorieLabel");
    dom.energyBar = document.getElementById("energyBar");
    dom.energyLabel = document.getElementById("energyLabel");
    dom.healthEffects = document.getElementById("healthEffects");
    dom.chartSection = document.getElementById("chartSection");
    dom.calorieChart = document.getElementById("calorieChart");
    dom.storyTime = document.getElementById("storyTime");
    dom.storyTitle = document.getElementById("storyTitle");
    dom.storyBody = document.getElementById("storyBody");
    dom.storyFact = document.getElementById("storyFact");
    dom.choices = document.getElementById("choices");
    dom.btnNext = document.getElementById("btnNext");
    dom.eduToast = document.getElementById("eduToast");
    dom.eduBadge = document.getElementById("eduBadge");
    dom.eduTitle = document.getElementById("eduTitle");
    dom.eduBody = document.getElementById("eduBody");
    dom.eduClose = document.getElementById("eduClose");
    dom.healthFilter = document.getElementById("healthFilter");
}

function buildTimeline() {
    dom.timelineNodes.innerHTML = "";
    for (var i = 0; i < TIME_POINTS.length; i++) {
        var node = document.createElement("div");
        node.className = "timeline-node";
        node.setAttribute("data-index", i);
        var dot = document.createElement("div");
        dot.className = "timeline-dot";
        var label = document.createElement("div");
        label.className = "timeline-label";
        label.textContent = TIME_POINTS[i].label;
        node.appendChild(dot);
        node.appendChild(label);
        dom.timelineNodes.appendChild(node);
    }
}

function updateTimeline() {
    var nodes = dom.timelineNodes.querySelectorAll(".timeline-node");
    for (var i = 0; i < nodes.length; i++) {
        nodes[i].classList.remove("active", "reached");
        if (i < state.scene) {
            nodes[i].classList.add("reached");
        } else if (i === state.scene) {
            nodes[i].classList.add("active");
        }
    }
    var pct = state.scene / (TIME_POINTS.length - 1) * 100;
    dom.timelineFill.style.width = pct + "%";
}

function updateStats() {
    dom.calorieValue.textContent = state.calories;
    var calPct = Math.min(state.calories / CALORIE_TARGET * 100, 100);
    dom.calorieBar.style.width = calPct + "%";

    if (state.calories === 0) {
        dom.calorieLabel.textContent = "No food yet";
    } else if (state.calories < 400) {
        dom.calorieLabel.textContent = "Severely insufficient";
    } else if (state.calories < 800) {
        dom.calorieLabel.textContent = "Critically low";
    } else if (state.calories < 1200) {
        dom.calorieLabel.textContent = "Far below daily need";
    } else {
        dom.calorieLabel.textContent = "Still below recommended";
    }

    var engPct = Math.max(0, Math.min(100, state.energy));
    dom.energyBar.style.width = engPct + "%";
    if (engPct > 60) {
        dom.energyLabel.textContent = "Moderate";
        dom.energyBar.parentElement.querySelector(".stats-bar-fill-energy").style.background = "var(--success)";
    } else if (engPct > 30) {
        dom.energyLabel.textContent = "Low";
        dom.energyBar.parentElement.querySelector(".stats-bar-fill-energy").style.background = "var(--accent)";
    } else if (engPct > 10) {
        dom.energyLabel.textContent = "Very Low";
        dom.energyBar.parentElement.querySelector(".stats-bar-fill-energy").style.background = "var(--danger)";
    } else {
        dom.energyLabel.textContent = "Critical";
        dom.energyBar.parentElement.querySelector(".stats-bar-fill-energy").style.background = "#d63b2f";
    }

    dom.healthEffects.innerHTML = "";
    for (var i = 0; i < state.effects.length; i++) {
        var tag = document.createElement("span");
        tag.className = "effect-tag effect-tag-" + (state.effectTypes[i] || "warning");
        tag.textContent = state.effects[i];
        tag.style.animationDelay = (i * 0.06) + "s";
        dom.healthEffects.appendChild(tag);
    }
}

function updateChart() {
    if (state.scene < 6) {
        dom.chartSection.style.display = "none";
        return;
    }
    dom.chartSection.style.display = "flex";
    dom.calorieChart.innerHTML = "";

    var row1 = createChartRow("Your Intake", state.calories, CALORIE_TARGET, "chart-row-fill-actual");
    var row2 = createChartRow("Recommended", CALORIE_TARGET, CALORIE_TARGET, "chart-row-fill-target");
    dom.calorieChart.appendChild(row1);
    dom.calorieChart.appendChild(row2);
}

function createChartRow(label, value, max, fillClass) {
    var row = document.createElement("div");
    row.className = "chart-row";
    var lbl = document.createElement("div");
    lbl.className = "chart-row-label";
    lbl.textContent = label;
    var barOuter = document.createElement("div");
    barOuter.className = "chart-row-bar";
    var barFill = document.createElement("div");
    barFill.className = "chart-row-fill " + fillClass;
    barFill.style.width = "0%";
    var val = document.createElement("span");
    val.className = "chart-row-value";
    val.textContent = value + " kcal";
    barOuter.appendChild(barFill);
    barOuter.appendChild(val);
    row.appendChild(lbl);
    row.appendChild(barOuter);
    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            barFill.style.width = Math.min(value / max * 100, 100) + "%";
        });
    });
    return row;
}

function updateHealthFilter() {
    var severity = state.effects.length;
    if (severity <= 2) {
        dom.healthFilter.style.backgroundColor = "transparent";
    } else if (severity <= 5) {
        dom.healthFilter.style.backgroundColor = "rgba(30, 15, 10, 0.08)";
    } else if (severity <= 8) {
        dom.healthFilter.style.backgroundColor = "rgba(40, 15, 10, 0.15)";
    } else {
        dom.healthFilter.style.backgroundColor = "rgba(50, 10, 5, 0.22)";
    }
}

function renderScene() {
    var data = getSceneData(state.scene);
    if (!data) return;

    var story = document.querySelector(".story");
    story.classList.remove("scene-enter");
    story.classList.add("scene-exit");

    setTimeout(function () {
        dom.storyTime.textContent = data.time;
        dom.storyTitle.textContent = data.title;
        dom.storyBody.innerHTML = "";

        for (var i = 0; i < data.narrative.length; i++) {
            var p = document.createElement("p");
            p.innerHTML = data.narrative[i];
            dom.storyBody.appendChild(p);
        }

        if (data.fact) {
            dom.storyFact.innerHTML = data.fact;
            dom.storyFact.classList.add("visible");
        } else {
            dom.storyFact.classList.remove("visible");
        }

        dom.choices.innerHTML = "";
        dom.btnNext.classList.remove("visible");

        if (data.choices && data.choices.length > 0) {
            for (var j = 0; j < data.choices.length; j++) {
                var c = data.choices[j];
                var btn = document.createElement("button");
                btn.className = "choice-btn";
                btn.setAttribute("data-choice", c.id);
                btn.innerHTML =
                    '<span class="choice-marker">' + c.marker + '</span>' +
                    '<span class="choice-text">' +
                    '<span class="choice-title">' + c.title + '</span>' +
                    '<span class="choice-desc">' + c.desc + '</span>' +
                    '</span>';
                btn.addEventListener("click", (function (choice) {
                    return function () { makeChoice(choice); };
                })(c));
                dom.choices.appendChild(btn);
            }
        } else {
            if (!data.isFinal) {
                dom.btnNext.classList.add("visible");
                dom.btnNext.textContent = state.scene === 0 ? "Begin Day" : "Continue";
            }
        }

        state.calories += data.calorieChange;
        state.totalCalories += (data.calorieChange > 0 ? data.calorieChange : 0);
        state.energy += data.energyChange;
        if (state.energy < 0) state.energy = 0;
        if (state.energy > 100) state.energy = 100;

        for (var k = 0; k < data.newEffects.length; k++) {
            if (state.effects.indexOf(data.newEffects[k]) === -1) {
                state.effects.push(data.newEffects[k]);
                if (!state.effectTypes) state.effectTypes = [];
                state.effectTypes.push(data.effectTypes[k] || "warning");
            }
        }

        updateTimeline();
        updateStats();
        updateChart();
        updateHealthFilter();

        story.classList.remove("scene-exit");
        story.classList.add("scene-enter");

        if (data.eduTrigger) {
            setTimeout(function () {
                showEduModal(data.eduTrigger);
            }, 1200);
        }

        if (data.isFinal) {
            setTimeout(function () {
                renderSolutions();
            }, data.eduTrigger ? 600 : 400);
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    }, 300);
}

function makeChoice(choice) {
    var choiceKey = choice.id.split("_")[0];
    state.choices[choiceKey] = choice.id;
    state.calories += choice.calories;
    state.totalCalories += (choice.calories > 0 ? choice.calories : 0);
    state.energy += choice.energy;
    if (state.energy < 0) state.energy = 0;
    if (state.energy > 100) state.energy = 100;
    updateStats();
    advance();
}

function advance() {
    if (state.scene >= TIME_POINTS.length - 1) return;
    state.scene++;
    renderScene();
}

var eduTimer = null;

function showEduModal(topic) {
    var content = eduContent[topic];
    if (!content) return;
    dom.eduBadge.textContent = content.badge;
    dom.eduBadge.className = "edu-toast-badge " + content.badgeClass;
    dom.eduTitle.textContent = content.title;
    dom.eduBody.textContent = content.body;
    dom.eduToast.classList.add("visible");
    clearTimeout(eduTimer);
    eduTimer = setTimeout(closeEduModal, 10000);
}

function closeEduModal() {
    clearTimeout(eduTimer);
    dom.eduToast.classList.remove("visible");
}

function renderSolutions() {
    var container = document.createElement("div");
    container.className = "solutions-section";

    container.innerHTML =
        '<h3 class="solutions-title">Solutions That Actually Work</h3>' +
        '<p class="solutions-text">These are real programs that have been tested and proven to help.</p>' +

        '<h4 class="solutions-subtitle">1. School Feeding Programs</h4>' +
        '<p class="solutions-text">Kenya\'s <strong>Home-Grown School Meals Programme</strong> (supported by the World Food Programme) feeds over 1.6 million kids with real, nutritious meals. Kids show up to learn AND eat. The food comes from local farms, which helps the community too.</p>' +

        '<div class="solutions-grid">' +
        '<div class="solutions-card solutions-card-pro">' +
        '<div class="solutions-card-title">Pros</div>' +
        '<ul>' +
        '<li>Gets 20–30% more kids to come to school</li>' +
        '<li>Gives kids the nutrition they\'re missing</li>' +
        '<li>Helps kids do better in school</li>' +
        '<li>Supports local farmers</li>' +
        '</ul></div>' +
        '<div class="solutions-card solutions-card-con">' +
        '<div class="solutions-card-title">Cons</div>' +
        '<ul>' +
        '<li>Costs $28–50 per kid per year</li>' +
        '<li>Needs ongoing funding from governments or donors</li>' +
        '<li>Only helps kids who go to school</li>' +
        '<li>Doesn\'t fix the root cause of poverty</li>' +
        '</ul></div></div>' +

        '<h4 class="solutions-subtitle">2. Kitchen Gardens</h4>' +
        '<p class="solutions-text"><strong>Drought-resistant gardens</strong> that use special bed designs and water-saving methods to grow local crops like sweet potatoes, cowpeas, and sorghum. Instead of depending on outside help, communities grow their own food. Programs like Kenya Red Cross and One Acre Fund have shown this works.</p>' +

        '<div class="solutions-grid">' +
        '<div class="solutions-card solutions-card-pro">' +
        '<div class="solutions-card-title">Pros</div>' +
        '<ul>' +
        '<li>Cheap and works long-term once set up</li>' +
        '<li>People get to eat different types of food</li>' +
        '<li>Makes the community stronger over time</li>' +
        '</ul></div>' +
        '<div class="solutions-card solutions-card-con">' +
        '<div class="solutions-card-title">Cons</div>' +
        '<ul>' +
        '<li>People need training and startup supplies</li>' +
        '<li>Takes time to start producing food</li>' +
        '<li>Still limited when there\'s almost no water</li>' +
        '</ul></div></div>' +

        '<h4 class="solutions-subtitle" style="margin-top: 2rem;">Final Thought</h4>' +
        '<p class="solutions-text" style="font-style: italic; color: var(--text-primary);">"I am one of millions. But every school meal served and every garden planted brings us closer to a world where no kid has to choose between learning and eating."</p>' +

        '<button class="btn-restart" id="btnRestart">Restart</button>';

    dom.storyBody.parentElement.appendChild(container);

    var restartBtn = document.getElementById("btnRestart");
    if (restartBtn) {
        restartBtn.addEventListener("click", function () {
            restart();
        });
    }
}

function restart() {
    state.scene = 0;
    state.calories = 0;
    state.totalCalories = 0;
    state.energy = 40;
    state.day = 1;
    state.effects = [];
    state.effectTypes = [];
    state.choices = {};
    state.dailyIntakes = [];

    var sol = document.querySelector(".solutions-section");
    if (sol) sol.remove();

    renderScene();
}

function init() {
    cacheDom();
    state.effectTypes = [];
    buildTimeline();

    dom.btnStart.addEventListener("click", function () {
        dom.intro.classList.add("hidden");
        dom.app.classList.add("visible");
        setTimeout(function () {
            renderScene();
        }, 400);
    });

    dom.btnNext.addEventListener("click", function () {
        advance();
    });

    dom.eduClose.addEventListener("click", closeEduModal);
}

document.addEventListener("DOMContentLoaded", init);
