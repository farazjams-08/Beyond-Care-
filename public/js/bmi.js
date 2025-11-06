// === BeyondCare BMI Page ===

// logout
document.getElementById("logout")?.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "/";
});

// AI BMI
document.getElementById("aiBmi").addEventListener("click", async () => {
  const token = localStorage.getItem("token");
  if (!token) return window.location.href = "/";

  const weight = parseFloat(document.getElementById("weight").value);
  const height = parseFloat(document.getElementById("height").value);
  const age = document.getElementById("age").value.trim();
  const gender = document.getElementById("gender").value.trim();

  if (!weight || !height) {
    return alert("Please enter weight and height.");
  }

  const output = document.getElementById("bmiOut");
  output.innerHTML = "<span style='color:#6ae2ff'>AI is generating your plan...</span>";

  try {
    const resp = await fetch("/api/bmi", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ weight, height, age, gender })
    });

    const data = await resp.json();
    output.textContent = data.answer || "No response from AI.";

  } catch (err) {
    output.innerHTML = "<span style='color:#ff6b6b'>Server error or AI unavailable.</span>";
  }
});

// Local BMI fallback
document.getElementById("localBmi").addEventListener("click", () => {
  const weight = parseFloat(document.getElementById("weight").value);
  const height = parseFloat(document.getElementById("height").value);

  if (!weight || !height) return alert("Please enter weight and height.");

  const h = height / 100;
  const bmi = +(weight / (h * h)).toFixed(1);

  let advice = "";
  if (bmi < 18.5) advice = "Underweight: add nutrient-dense foods and gentle strength training.";
  else if (bmi < 25) advice = "Normal: maintain balanced diet and exercise.";
  else if (bmi < 30) advice = "Overweight: reduce sugar, increase cardio + strength workouts.";
  else advice = "Obese: consult a clinician/dietitian.";

  document.getElementById("bmiOut").textContent = `BMI: ${bmi} — ${advice}`;
});
