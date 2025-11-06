// === BeyondCare Auth Handler ===

const API_ROOT = "/api";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const regForm = document.getElementById("regForm");
  const msgBox = document.getElementById("msg");

  // Reset message area
  if (msgBox) msgBox.innerText = "";

  /* -------------------------------
      LOGIN FORM
  --------------------------------*/
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();

      if (!email || !password) {
        msgBox.innerText = "Please enter all fields.";
        return;
      }

      // show loading
      msgBox.innerText = "Signing in...";

      try {
        const res = await fetch(API_ROOT + "/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (data.token) {
          localStorage.setItem("token", data.token);

          msgBox.style.color = "#6ae2ff";
          msgBox.innerText = "Login successful! Redirecting...";

          setTimeout(() => {
            window.location.href = "/home";
          }, 600);

        } else {
          msgBox.style.color = "#ff7373";
          msgBox.innerText = data.message || "Login failed.";
        }

      } catch (err) {
        msgBox.style.color = "#ff7373";
        msgBox.innerText = "Server error. Try again.";
      }
    });
  }


  /* -------------------------------
      REGISTRATION FORM
  --------------------------------*/
  if (regForm) {
    regForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();

      if (!name || !email || !password) {
        msgBox.innerText = "Please fill all fields.";
        return;
      }

      msgBox.innerText = "Creating account...";

      try {
        const res = await fetch(API_ROOT + "/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password })
        });

        const data = await res.json();

        if (data.message && data.message.includes("successful")) {
          msgBox.style.color = "#6ae2ff";
          msgBox.innerText = "Account created! Redirecting to login...";
          
          setTimeout(() => {
            window.location.href = "/";
          }, 1000);

        } else {
          msgBox.style.color = "#ff7373";
          msgBox.innerText = data.message || "Registration failed.";
        }

      } catch (err) {
        msgBox.style.color = "#ff7373";
        msgBox.innerText = "Server error.";
      }
    });
  }
});
