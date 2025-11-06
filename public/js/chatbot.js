// === BeyondCare Chatbot ===

// logout
document.getElementById("logout")?.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "/";
});

const chatBox = document.getElementById("chatbox");

function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

document.getElementById("chatSend").addEventListener("click", async () => {
  const token = localStorage.getItem("token");
  if (!token) return window.location.href = "/";

  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (!text) return;

  // add user message
  chatBox.innerHTML += `
    <div class="msg user">
      <span class="tag">You</span> ${text}
    </div>
  `;
  input.value = "";
  scrollToBottom();

  // placeholder bot message
  const botDiv = document.createElement("div");
  botDiv.className = "msg bot";
  botDiv.innerHTML = `<span class="tag">AI</span> Typing...`;
  chatBox.appendChild(botDiv);

  try {
    const resp = await fetch("/api/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ prompt: text })
    });

    const data = await resp.json();
    botDiv.innerHTML = `<span class="tag">AI</span> ${data.answer || "No response."}`;

  } catch (err) {
    botDiv.innerHTML = `<span class="tag">AI</span> <span style="color:#ff6b6b">Server error or AI unavailable.</span>`;
  }

  scrollToBottom();
});
