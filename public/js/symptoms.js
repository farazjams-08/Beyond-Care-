// === BeyondCare Symptom Checker ===

// logout
document.getElementById("logout")?.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "/";
});

// AI symptom analysis
document.getElementById("symAi").addEventListener("click", async () => {
  const token = localStorage.getItem("token");
  if (!token) return window.location.href = "/";

  const symptoms = document.getElementById("symptoms").value.trim();
  const out = document.getElementById("symOut");

  if (!symptoms) {
    alert("Please enter symptoms.");
    return;
  }

  out.innerHTML = "<span style='color:#6ae2ff'>AI is analyzing your symptoms...</span>";

  try {
    const resp = await fetch("/api/symptoms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ symptoms })
    });

    const data = await resp.json();
    out.textContent = data.answer || "No response received.";
  } catch (err) {
    out.innerHTML = "<span style='color:#ff6b6b'>Server error or AI unavailable.</span>";
  }
});

// Local fallback with urgency level
document.getElementById("symLocal").addEventListener("click", () => {
  const text = document.getElementById("symptoms").value.toLowerCase();
  const out = document.getElementById("symOut");

  let message = "";
  let urgency = "";

  if (text.includes("fever") && text.includes("cough")) {
    message = "Possible flu/cold — rest, fluids.";
    urgency = "🟡 Moderate urgency";
  }
  else if (text.includes("chest") && text.includes("pain")) {
    message = "Possible cardiac issue — seek care immediately.";
    urgency = "🔴 High urgency";
  }
  else if (text.includes("vomit") || text.includes("diarrhea")) {
    message = "Likely food poisoning — ORS & hydration.";
    urgency = "🟡 Moderate urgency";
  }
  else if (text.includes("headache") && text.includes("nausea")) {
    message = "Possible migraine — rest, avoid bright light.";
    urgency = "🟢 Low urgency";
  }
  else {
    message = "No confident match. Try AI or consult a doctor.";
    urgency = "⚠️ Unknown";
  }

  out.innerHTML = `
    <div><strong>${urgency}</strong></div>
    <div style="margin-top:6px">${message}</div>
  `;
});
