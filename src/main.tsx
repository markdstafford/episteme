import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { SettingsView } from "@/components/SettingsView";
import "./app.css";

const isSettingsWindow = window.location.hash === "#settings";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isSettingsWindow ? <SettingsView /> : <App />}
  </React.StrictMode>
);
