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
        // No-op: don't prompt the user with a browser confirm.
        // You can instead set app state to show a non-blocking banner/toast here.
      },
    });
  } catch (err) {
    console.warn("version check failed to start", err);
  }
}

createRoot(document.getElementById("root")!).render(<App />);
