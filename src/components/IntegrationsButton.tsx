"use client";

import { ConnectButton } from "@openint/connect";
import { useEffect, useState, useCallback } from "react";

export function IntegrationsButton({
  buttonStyle = {},
  className,
  mode = "start",
}: {
  className?: string;
  buttonStyle?: React.CSSProperties;
  mode?: "start" | "manage";
}) {
  const [token, setToken] = useState<string | null>(() => {
    // Initialize state with localStorage value if available
    if (typeof window !== "undefined") {
      return localStorage.getItem("openint_token");
    }
    return null;
  });

  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch("/api/openint", {
        method: "POST",
      });
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        localStorage.setItem("openint_token", data.token);
      }
    } catch (error) {
      console.error("Error loading the integrations button", error);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      fetchToken();
    }

    // Cleanup function
    return () => {
      // Any cleanup if needed
    };
  }, [token, fetchToken]);

  if (!token) {
    // if the backend does not return a token its most likely because an OPENINT_API_KEY is not set, so don't render the button
    console.warn(
      "No token returned from backend, not rendering integrations button"
    );
    return null;
  }

  const manageStyles: React.CSSProperties =
    mode === "manage"
      ? {
          borderRadius: "9999px",
          padding: "0.5rem 1rem",
          border: "none", // Remove border
          backgroundColor: "white", // Set background to white
          ...buttonStyle, // Merge with existing buttonStyle
        }
      : buttonStyle;

  return (
    <div>
      {mode === "manage" && (
        <p
          style={{
            marginBottom: "0.5rem",
            fontSize: "1rem", // Increased font size
            color: "#4b5563", // Darker gray text color
          }}
        >
          Suggestions
        </p>
      )}
      <ConnectButton
        token={token}
        text={mode === "start" ? "Integrations" : "Manage Integrations"}
        buttonStyle={manageStyles as any}
        className={className + (mode === "manage" ? " mb-2" : "")}
        // baseURL="http://localhost:4000/connect"
      />
    </div>
  );
}
