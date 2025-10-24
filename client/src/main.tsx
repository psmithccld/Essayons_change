import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { startVersionCheck } from "./versionCheck";

startVersionCheck({
  intervalMs: 30_000,
  onUpdate: (v) => {
    // Optional custom UI: replace prompt with your app's update banner/modal if desired
    if (import.meta.env.PROD) {
  startVersionCheck({ intervalMs: 30_000, onUpdate: ... });
   }
  },
});
createRoot(document.getElementById("root")!).render(<App />);
