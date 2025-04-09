let patientStatements = [];
let currentIndex = 0;
let userName = localStorage.getItem("current_user") || "";
let patientReadStartTime = null;
let questionOpenTime = null;

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
  const welcomeScreen = document.getElementById("welcomeScreen");
  welcomeScreen.classList.add("fade-out");

  setTimeout(() => {
    welcomeScreen.classList.add("hidden");
    showFakeLoadingSteps(userName, () => {
      document.getElementById("mainSurvey").classList.remove("hidden");
      loadPatientStatements();
    });
  }, 500);
}

function showFakeLoadingSteps(userName, callback) {
  const steps = [
    `Initializing Session For ${userName}...`,
    "Fetching Topic Modules...",
    "Loading User Statements...",
    "Finalizing Interface..."
  ];

  const stepMessages = document.getElementById("stepMessages");
  const fakeLoader = document.getElementById("fakeLoader");

  document.getElementById("loader").classList.add("hidden");
  fakeLoader.classList.remove("hidden");
  stepMessages.innerHTML = "";

  let stepIndex = 0;

  function showNextStep() {
    if (stepIndex > 0) {
      stepMessages.children[stepIndex - 1].innerHTML = `✅ ${steps[stepIndex - 1]}`;
    }

    const stepElement = document.createElement("div");
    stepElement.innerHTML = `🔄 ${steps[stepIndex]}`;
    stepMessages.appendChild(stepElement);

    // Final step: wait for set_user to succeed
    if (stepIndex === steps.length - 1) {
      waitForSetUser(stepElement, callback);
    } else {
      stepIndex++;
      setTimeout(showNextStep, 1200);
    }
  }

  async function waitForSetUser(finalStepElement, onSuccess) {
    try {
      const res = await fetch("https://big5-wish.onrender.com/set_user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: userName }),
      });

      if (res.ok) {
        finalStepElement.innerHTML = `✅ ${steps[stepIndex]}`;
        fakeLoader.classList.add("fade-out");
        setTimeout(() => {
          fakeLoader.classList.add("hidden");
          onSuccess();
        }, 800);
        return;
      }
    } catch (err) {
      // continue retrying
    }

    setTimeout(() => waitForSetUser(finalStepElement, onSuccess), 1500);
  }

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
  const categoryDropdown = document.getElementById("category");

  categoryDropdown.innerHTML = '<option value="">Select a topic</option>';

  data.categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryDropdown.appendChild(option);
  });

  setTimeout(() => {
    document.getElementById("categorySkeleton").classList.add("hidden");
    document.getElementById("categoryLabel").classList.remove("hidden");
    categoryDropdown.classList.remove("hidden");
  }, 1500);
}

async function fetchQuestions() {
  const category = document.getElementById("category").value;
  if (!category) return;

  document.getElementById("questionSkeleton").classList.remove("hidden");
  document.getElementById("question").classList.add("hidden");
  document.getElementById("questionLabel").classList.add("hidden");

  const response = await fetch("https://big5-wish.onrender.com/get_questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category })
  });

  const data = await response.json();
  const questionDropdown = document.getElementById("question");

  questionDropdown.innerHTML = `
    <option value="">Select a question</option>
    <option value="not_sure">I am not sure</option>
  `;

  shuffleArray(data.questions);

  data.questions.forEach((question) => {
    const option = document.createElement("option");
    option.value = question;
    option.textContent = question;
    questionDropdown.appendChild(option);
  });

  setTimeout(() => {
    document.getElementById("questionSkeleton").classList.add("hidden");
    document.getElementById("questionLabel").classList.remove("hidden");
    questionDropdown.classList.remove("hidden");
  }, 1500);
}

async function submitResponse() {
  const category = document.getElementById("category").value;
  const question = document.getElementById("question").value;
  const name = localStorage.getItem("current_user");
  const feedback = document.getElementById("feedback").value || "";

  if (!name) return alert("User name is missing! Please refresh and re-enter your name.");
  if (!category || !question) return alert("Please select a category and a question before proceeding.");

  let responseTime = 0;
  if (patientReadStartTime) {
    responseTime = (new Date() - patientReadStartTime) / 1000;
    localStorage.setItem("read_to_response_time", responseTime.toFixed(2));
    patientReadStartTime = null;
  }

  const dropdownTime = localStorage.getItem("question_selection_time") || "";

  const response = await fetch("https://big5-wish.onrender.com/submit_response", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

  const result = await response.json();

  if (result.success) {
    showMemeOverlay();
    currentIndex++;
    updateStatement();
    document.getElementById("feedback").value = "";
  } else {
    alert("Error submitting response: " + result.message);
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

const memes = [
    { src: '/memes/1.png', text: "Filling forms for free like a true unsung hero. 🫡" },
    { src: '/memes/2.png', text: "You’re doing great sweetie… this survey was made for you. 🔥" },
    { src: '/memes/3.png', text: "That answer hit harder than student debt." },
    { src: '/memes/4.png', text: "Me judging your response... and lowkey admiring it." },
    { src: '/memes/5.png', text: "Free survey. No coffee, no cash. Just good vibes and moral superiority. ☕✨" },
    { src: '/memes/6.png', text: "You answered that like you’ve been professionally overthinking for years." },
    { src: '/memes/7.png', text: "Even Sad Pepe believes in your emotional growth now." },
    { src: '/memes/8.png', text: "This cat saw your answer and started rethinking its life choices." },
    { src: '/memes/9.png', text: "That response? Straight from the ‘I overanalyze everything’ vault." },
    { src: '/memes/10.png', text: "You’re radiating butterfly energy and trauma wisdom rn." },
    { src: '/memes/11.png', text: "You deserve a hot drink for that kind of self-reflection. ☕🐱" },
    { src: '/memes/12.png', text: "This face says it all: impressed, but deeply confused by how real that was." },
    { src: '/memes/13.png', text: "Stop. Just stop. That answer was *too* good. 🛑" },
    { src: '/memes/14.png', text: "Very thoughts. Much depth. So psychology. 🧠" },
    { src: '/memes/15.png', text: "Remember: if you don’t know the answer, say it confidently anyway. 🤓" },
    { src: '/memes/16.png', text: "Sprinkling truth like Salt Bae and making us reflect." },
    { src: '/memes/17.png', text: "Leo approves. And he’s picky. 👏" },
    { src: '/memes/18.png', text: "You just shut down that inner critic like a boss. 🎤" },
    { src: '/memes/19.png', text: "That was so good, Rick wants to clone your brain." },
    { src: '/memes/20.png', text: "Your brain after finishing one deep question: ‘I'm done.’ But you’re not." },
  ];
  
  

  function showMemeOverlay() {
    const random = memes[Math.floor(Math.random() * memes.length)];
    document.getElementById("memeImage").src = random.src;
    document.getElementById("memeText").textContent = random.text;
    document.getElementById("memeOverlay").classList.remove("hidden");
    setTimeout(() => {
      document.getElementById("memeOverlay").classList.add("hidden");
    }, 3500);
  }

  // Example: hook this into submitResponse's success case or next button
  // showMemeOverlay();
