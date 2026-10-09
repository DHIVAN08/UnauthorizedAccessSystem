
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import LoginSimulation from "./LoginSimulation";
import "./App.css";

const API_URL = "https://unauthorizedaccesssystem.onrender.com";

function App() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      const response = await fetch(`${API_URL}/api/dashboard`);

      if (!response.ok) {
        throw new Error("Could not load dashboard data");
      }

      const data = await response.json();
      setDashboard(data);
      setError("");
    } catch {
      setError("Cannot connect to backend. Make sure FastAPI is running.");
    }
  }

  useEffect(() => {
    loadDashboard();

    const timer = setInterval(loadDashboard, 5000);

    return () => clearInterval(timer);
  }, []);

  const stats = dashboard
    ? [
        { label: "Total Events", value: dashboard.total_events },
        { label: "Failed Attempts", value: dashboard.failed_attempts },
        { label: "Blocked Events", value: dashboard.blocked_events },
        { label: "Active Blocks", value: dashboard.active_blocks },
      ]
    : [];

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="eyebrow">SECURITY OPERATIONS CENTER</p>
          <h1>Unauthorized Access Detection</h1>
          <p className="subtitle">
            Monitor suspicious login attempts and access activity.
          </p>
        </div>

        <button onClick={loadDashboard}>Refresh Data</button>
      </header>

      {error && <div className="error">{error}</div>}

      <main>
        <h2>Security Overview</h2>

        <section className="stats">
          {stats.map((stat) => (
            <article className="stat-card" key={stat.label}>
              <p>{stat.label}</p>
              <strong>{stat.value}</strong>
            </article>
          ))}
        </section>

        {/* Login Simulation */}
        <LoginSimulation onAttemptRecorded={loadDashboard} />

        {/* Event Summary Chart */}
        <section className="panel">
          <h2>Event Summary</h2>

          {dashboard ? (
            <div className="chart">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={[
                    {
                      name: "Failed",
                      count: dashboard.failed_attempts,
                    },
                    {
                      name: "Blocked",
                      count: dashboard.blocked_events,
                    },
                  ]}
                >
                  <XAxis dataKey="name" stroke="#aab4c5" />
                  <YAxis allowDecimals={false} stroke="#aab4c5" />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    fill="#818cf8"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p>Loading chart...</p>
          )}
        </section>

        {/* Recent Security Events */}
        <section className="panel">
          <h2>Recent Security Events</h2>

          {!dashboard ? (
            <p>Loading events...</p>
          ) : dashboard.recent_events.length === 0 ? (
            <p>No security events recorded yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Time</th>
                    <th>Username</th>
                    <th>Source IP</th>
                    <th>Result</th>
                  </tr>
                </thead>

                <tbody>
                  {dashboard.recent_events.map((event) => (
                    <tr key={event.id}>
                      <td>{event.id}</td>
                      <td>
                        {event.timestamp
                          ? new Date(event.timestamp).toLocaleString()
                          : "—"}
                      </td>
                      <td>{event.username}</td>
                      <td>{event.source_ip || "Unknown"}</td>
                      <td>
                        <span className={`status ${event.result}`}>
                          {event.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <footer>
        Unauthorized Access Detection System · Live Monitoring
      </footer>
    </div>
  );
}

export default App;
