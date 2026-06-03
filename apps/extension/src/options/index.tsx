import React from "react";
import { createRoot } from "react-dom/client";
import { OptionsApp } from "../ui/OptionsApp";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Options root not found.");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <OptionsApp />
  </React.StrictMode>
);
