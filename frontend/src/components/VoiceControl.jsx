import React, { useContext, useState } from "react";
import { userDataContext } from "../context/UserContext"; // adjust path if your UserContext file location differs

function VoiceControl() {
  const { getGeminiResponse } = useContext(userDataContext);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [assistantResponse, setAssistantResponse] = useState("");
  const [error, setError] = useState(null);

  const startRecognition = () => {
    setError(null);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("SpeechRecognition not available in this browser. Use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => {
      setListening(true);
      setTranscript("");
      setAssistantResponse("");
      console.log("[VoiceControl] recognition started");
    };

    recognition.onerror = (event) => {
      console.error("[VoiceControl] recognition error:", event);
      setError("Speech recognition error. See console for details.");
      setListening(false);
    };

    recognition.onend = () => {
      console.log("[VoiceControl] recognition ended");
      setListening(false);
    };

    recognition.onresult = async (event) => {
      const text = event.results[0][0].transcript.trim();
      console.log("[VoiceControl] recognized:", text);
      setTranscript(text);

      // send the transcript to backend via UserContext helper
      try {
        const data = await getGeminiResponse(text);
        console.log("[VoiceControl] assistant response:", data);
        // show a readable response if possible
        if (!data) {
          setAssistantResponse("No response from server (null).");
          return;
        }
        // if server returns object with response field, show it
        if (typeof data === "object" && "response" in data) {
          setAssistantResponse(data.response);
        } else {
          setAssistantResponse(JSON.stringify(data));
        }
      } catch (err) {
        console.error("[VoiceControl] error contacting assistant:", err);
        setAssistantResponse("Error contacting assistant. See console.");
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.error("[VoiceControl] recognition.start() error:", err);
      setError("Could not start recognition: " + err.message);
    }
  };

  return (
    <div>
      <button onClick={startRecognition} disabled={listening}>
        {listening ? "Listening..." : "Start Voice Command"}
      </button>
      {error && <div style={{ color: "red" }}><strong>Error:</strong> {error}</div>}
      <div>
        <strong>Transcript:</strong> {transcript || "-"}
      </div>
      <div>
        <strong>Assistant:</strong> {assistantResponse || "-"}
      </div>
    </div>
  );
}

export default VoiceControl;