const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

async function readErrorMessage(response, body) {
  const text = await body.text();

  if (text) {
    try {
      const data = JSON.parse(text);
      if (typeof data.message === "string" && data.message.trim()) {
        return data.message;
      }
    } catch {
      // Error responses are not guaranteed to contain JSON.
    }
  }

  return `Request failed (${response.status}). Please try again.`;
}

export async function convertDocument(file, mode) {
  const formData = new FormData();
  formData.append("mode", mode);
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/conversions`, {
    method: "POST",
    body: formData,
  });
  const body = await response.blob();

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, body));
  }

  // A successful conversion must return a file. This catches a proxy or
  // deployment that mistakenly responds with JSON/HTML using a success code.
  if (
    body.size === 0 ||
    body.type.includes("application/json") ||
    body.type.includes("text/html")
  ) {
    throw new Error(await readErrorMessage(response, body));
  }

  return body;
}

export async function checkApiHealth() {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  const body = await response.text();
  let data;

  try {
    data = JSON.parse(body);
  } catch {
    throw new Error("The API returned an unexpected response.");
  }

  if (!response.ok) {
    throw new Error(data.message || `API request failed (${response.status}).`);
  }

  return data.message || "API is healthy";
}
