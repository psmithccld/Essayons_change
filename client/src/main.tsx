import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { startVersionCheck } from "./versionCheck";

// Only run the version check in production builds
if (import.meta.env.PROD) {
  try {
    startVersionCheck({
      intervalMs: 30_000,
      onUpdate: (v) => {
        // Replace this confirm with an in-app banner if you prefer
        if (confirm("A new version of the app is available. Reload now to update?")) {
          window.location.reload();
        }
      },
    });
  } catch (err) {
    console.warn("version check failed to start", err);
  }
}

createRoot(document.getElementById("root")!).render(<App />);
