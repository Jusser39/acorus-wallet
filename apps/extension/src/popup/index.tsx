import React from "react";
import { createRoot } from "react-dom/client";
import { PopupApp } from "../ui/PopupApp";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Popup root not found.");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>
);
