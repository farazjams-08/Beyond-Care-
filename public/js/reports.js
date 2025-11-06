// reports.js

// logout
document.getElementById("logout")?.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "/";
});

const upForm = document.getElementById("uploadForm");
const upMsg  = document.getElementById("upMsg");
const listEl = document.getElementById("reportsList");

async function api(path, opts = {}) {
  const token = localStorage.getItem("token");
  if (!token) { window.location.href = "/"; return; }
  const headers = opts.headers || {};
  if (!(opts.body instanceof FormData)) headers["Authorization"] = "Bearer " + token;
  return fetch(path, {
    ...opts,
    headers: { "Authorization": "Bearer " + token, ...(opts.body instanceof FormData ? {} : {"Accept":"application/json"}), ...headers },
  });
}

upForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const token = localStorage.getItem("token");
  if (!token) return (window.location.href = "/");

  const file = document.getElementById("file").files[0];
  if (!file) return (upMsg.textContent = "Please choose a file.");

  upMsg.style.color = "#6ae2ff";
  upMsg.textContent = "Uploading and analyzing…";

  const fd = new FormData();
  fd.append("file", file);

  try {
    const resp = await fetch("/api/reports", {
      method: "POST",
      headers: { "Authorization": "Bearer " + token },
      body: fd
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.message || "Upload failed");
    upMsg.textContent = "Analysis complete!";
    loadReports();
  } catch (err) {
    upMsg.style.color = "#ff6b6b";
    upMsg.textContent = err.message || "Server error";
  }
});

async function loadReports() {
  const resp = await api("/api/reports");
  const data = await resp.json();
  const items = data.reports || [];
  if (items.length === 0) {
    listEl.innerHTML = `<p class="subtitle">No reports yet.</p>`;
    return;
  }

  listEl.innerHTML = "";
  items.forEach(r => {
    const dlHref = `/api/reports/${r._id}`;
    listEl.innerHTML += `
      <div class="report-item">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
          <div><b>${r.originalName || "Report"}</b></div>
          <div class="report-actions">
            <a href="${dlHref}" target="_blank">Download original</a>
            <button data-id="${r._id}" class="del-btn" style="background:#ff6b6b">Delete</button>
          </div>
        </div>
        <div class="summary">${(r.summary || "").slice(0, 400)}${(r.summary && r.summary.length > 400) ? "…" : ""}</div>
        ${r.keyFindings?.length ? `<div style="margin-top:8px"><b>Key Findings</b><ul>${r.keyFindings.map(k => `<li>${k}</li>`).join("")}</ul></div>` : ""}
        <small class="subtitle">${new Date(r.createdAt).toLocaleString()}</small>
      </div>
    `;
  });

  // bind delete
  document.querySelectorAll(".del-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      if (!confirm("Delete this report?")) return;
      const resp = await api(`/api/reports/${id}`, { method: "DELETE" });
      const data = await resp.json();
      if (resp.ok) loadReports(); else alert(data.message || "Delete failed");
    });
  });
}

loadReports();
