let patientStatements = [],
    currentIndex = 0,
    userName = localStorage.getItem("current_user") || "",
    patientReadStartTime = null,
    questionOpenTime = null;

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

async function setUserName() {
    userName = document.getElementById("name").value;

    if (!userName) {
        alert("Please enter your name");
        return;
    }

    localStorage.setItem("current_user", userName);
    const welcome = document.getElementById("welcomeScreen");
    welcome.classList.add("fade-out");
    setTimeout(() => {
        welcome.classList.add("hidden");
        showFakeLoadingSteps(userName, async () => {
            await fetch("https://big5-wish.onrender.com/set_user", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: userName
                })
            });

            document.getElementById("mainSurvey").classList.remove("hidden");
            loadPatientStatements();
        });
    }, 500);

}

function showFakeLoadingSteps(username, callback) {
    const steps = [
        `Initializing Session For ${username}...`,
        "Fetching Topic Modules...",
        "Loading User Statements...",
        "Finalizing Interface..."
    ];

    const stepContainer = document.getElementById("stepMessages");
    const fakeLoader = document.getElementById("fakeLoader");

    document.getElementById("loader").classList.add("hidden");
    fakeLoader.classList.remove("hidden");

    let index = 0;

    function showNextStep() {
        if (index > 0) {
            stepContainer.children[index - 1].innerHTML = `✅ ${steps[index - 1]}`;
        }

        if (index < steps.length) {
            const stepLine = document.createElement("div");
            stepLine.innerHTML = `🔄 ${steps[index]}`;
            stepContainer.appendChild(stepLine);
            index++;
            setTimeout(showNextStep, 1200);
        } else {
            fakeLoader.classList.add("fade-out");
            setTimeout(() => {
                fakeLoader.classList.add("hidden");
                callback();
            }, 1000);
        }
    }

    stepContainer.innerHTML = "";
    showNextStep();
}

async function loadPatientStatements() {
    const response = await fetch("https://big5-wish.onrender.com/get_patient_statements");
    const data = await response.json();
    patientStatements = data.patient_statements;
    shuffleArray(patientStatements);
    document.getElementById("notif-one").classList.remove("hidden");
    document.getElementById("notif-two").classList.remove("hidden");
    document.getElementById("totalQuestions").textContent = patientStatements.length;
    updateStatement();
}

function updateStatement() {
    document.getElementById("loader").classList.add("hidden");

    if (currentIndex < patientStatements.length) {
        document.getElementById("patientSkeleton").classList.remove("hidden");
        document.getElementById("categorySkeleton").classList.remove("hidden");
        document.getElementById("questionSkeleton").classList.remove("hidden");
        document.getElementById("patientStatement").classList.add("hidden");
        document.getElementById("categoryLabel").classList.add("hidden");
        document.getElementById("category").classList.add("hidden");
        document.getElementById("questionLabel").classList.add("hidden");
        document.getElementById("question").classList.add("hidden");

        setTimeout(() => {
            document.getElementById("patientSkeleton").classList.add("hidden");
            document.getElementById("patientStatement").classList.remove("hidden");
            document.getElementById("patientStatement").textContent = patientStatements[currentIndex];
            document.getElementById("progressCount").textContent = currentIndex + 1;
            patientReadStartTime = new Date();
            fetchCategories();
        }, 300);
    } else {
        document.getElementById("mainSurvey").classList.add("hidden");
        document.getElementById("thankYou").classList.remove("hidden");
    }
}

async function fetchCategories() {
    const response = await fetch("https://big5-wish.onrender.com/get_categories", {
        method: "POST"
    });
    const data = await response.json();
    const categorySelect = document.getElementById("category");
    categorySelect.innerHTML = '<option value="">Select a topic</option>';

    data.categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });

    setTimeout(() => {
        document.getElementById("categorySkeleton").classList.add("hidden");
        document.getElementById("categoryLabel").classList.remove("hidden");
        categorySelect.classList.remove("hidden");
    }, 1500);
}

async function fetchQuestions() {
    const selectedCategory = document.getElementById("category").value;
    if (!selectedCategory) return;

    document.getElementById("questionSkeleton").classList.remove("hidden");
    document.getElementById("question").classList.add("hidden");
    document.getElementById("questionLabel").classList.add("hidden");

    const response = await fetch("https://big5-wish.onrender.com/get_questions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            category: selectedCategory
        })
    });
    const data = await response.json();
    const questionSelect = document.getElementById("question");
    questionSelect.innerHTML = '<option value="">Select a question</option><option value="not_sure">I am not sure</option>';
    shuffleArray(data.questions);

    data.questions.forEach(question => {
        const option = document.createElement("option");
        option.value = question;
        option.textContent = question;
        questionSelect.appendChild(option);
    });

    setTimeout(() => {
        document.getElementById("questionSkeleton").classList.add("hidden");
        document.getElementById("questionLabel").classList.remove("hidden");
        questionSelect.classList.remove("hidden");
    }, 1500);
}

async function submitResponse() {
    const category = document.getElementById("category").value;
    const question = document.getElementById("question").value;
    const name = localStorage.getItem("current_user");
    const feedback = document.getElementById("feedback").value || "";

    if (!name) {
        alert("User name is missing! Please refresh and re-enter your name.");
        return;
    }
    if (!category || !question) {
        alert("Please select a category and a question before proceeding.");
        return;
    }

    let responseTime = 0;
    if (patientReadStartTime) {
        responseTime = (new Date() - patientReadStartTime) / 1000;
        localStorage.setItem("read_to_response_time", responseTime.toFixed(2));
        patientReadStartTime = null;
    }

    const dropdownTime = localStorage.getItem("question_selection_time") || "";

    const response = await fetch("https://big5-wish.onrender.com/submit_response", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name,
            patient_statement: patientStatements[currentIndex],
            category,
            selected_question: question,
            dropdown_time: dropdownTime,
            response_time: responseTime.toFixed(2),
            feedback
        })
    });

    const data = await response.json();
    if (data.success) {
        currentIndex++;
        updateStatement();
        document.getElementById("feedback").value = "";
    } else {
        alert("Error submitting response: " + data.message);
    }
}

const questionDropdown = document.getElementById("question");
questionDropdown.addEventListener("mousedown", () => {
    questionOpenTime = new Date();
});
questionDropdown.addEventListener("change", () => {
    if (questionOpenTime) {
        const timeTaken = (new Date() - questionOpenTime) / 1000;
        localStorage.setItem("question_selection_time", timeTaken.toFixed(2));
        questionOpenTime = null;
    }
});