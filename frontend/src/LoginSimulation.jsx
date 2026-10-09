
import { useState } from "react";


const API_URL = "https://unauthorizedaccesssystem.onrender.com";

export default function LoginSimulation({ onAttemptRecorded }) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function simulateLogin(success) {
    const cleanUsername = username.trim();

    if (!cleanUsername) {
      setResult({
        type: "error",
        message: "Please enter a username first.",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/api/access-attempt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: cleanUsername,
          success,
          source_device: "dashboard-simulator",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          type: data.result,
          message: `Attempt recorded: ${data.result.toUpperCase()}`,
          details: `Event ID: ${data.event_id} | Failures in window: ${data.failures_in_window}`,
        });

        if (onAttemptRecorded) {
          onAttemptRecorded();
        }
      } else if (response.status === 429) {
        setResult({
          type: "blocked",
          message: "ACCESS BLOCKED",
          details:
            data.detail?.message ||
            "Too many failed attempts. Try again later.",
          retry: data.detail?.retry_after_seconds,
        });

        if (onAttemptRecorded) {
          onAttemptRecorded();
        }
      } else {
        setResult({
          type: "error",
          message: data.detail || "The request failed.",
        });
      }
    } catch (error) {
      setResult({
        type: "error",
        message:
          "Cannot connect to the backend. Make sure FastAPI is running.",
      });
    } finally {
      setLoading(false);
    }
  }

  const colors = {
    success: "#166534",
    failed: "#92400e",
    blocked: "#991b1b",
    error: "#991b1b",
  };

  return (
    <section
      style={{
        background: "#111827",
        color: "#f9fafb",
        padding: "24px",
        borderRadius: "14px",
        margin: "24px 0",
        border: "1px solid #374151",
      }}
    >
      <h2 style={{ marginTop: 0 }}>Login Simulation</h2>

      <p style={{ color: "#9ca3af" }}>
        Test successful and failed access attempts. This is a
        simulator, not a real system login.
      </p>

      <label
        htmlFor="simulation-username"
        style={{ display: "block", marginBottom: "8px" }}
      >
        Username
      </label>

      <input
        id="simulation-username"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !loading) {
            simulateLogin(false);
          }
        }}
        placeholder="Enter a test username"
        maxLength={100}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "12px",
          borderRadius: "8px",
          border: "1px solid #4b5563",
          background: "#1f2937",
          color: "#ffffff",
          marginBottom: "16px",
        }}
      />

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <button
          disabled={loading}
          onClick={() => simulateLogin(true)}
          style={{
            padding: "12px 16px",
            border: 0,
            borderRadius: "8px",
            background: "#15803d",
            color: "white",
            cursor: "pointer",
          }}
        >
          Simulate Successful Login
        </button>

        <button
          disabled={loading}
          onClick={() => simulateLogin(false)}
          style={{
            padding: "12px 16px",
            border: 0,
            borderRadius: "8px",
            background: "#b91c1c",
            color: "white",
            cursor: "pointer",
          }}
        >
          Simulate Failed Login
        </button>
      </div>

      {loading && <p>Recording access attempt...</p>}

      {result && (
        <div
          role="status"
          style={{
            marginTop: "20px",
            padding: "16px",
            borderRadius: "8px",
            background: colors[result.type] || "#374151",
            overflowWrap: "anywhere",
          }}
        >
          <strong>{result.message}</strong>

          {result.details && <p>{result.details}</p>}

          {result.retry != null && (
            <p>Retry after approximately {result.retry} seconds.</p>
          )}
        </div>
      )}
    </section>
  );
}