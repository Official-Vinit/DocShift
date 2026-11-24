import { useRef, useState } from "react";
import "./App.css";
import { checkApiHealth, convertDocument } from "./services/conversionApi.js";
const modes = {
  pdfToWord: {
    label: "PDF to Word",
    inputType: ".pdf,application/pdf",
    inputLabel: "PDF",
    outputLabel: "Word",
  },
  wordToPdf: {
    label: "Word to PDF",
    inputType:
      ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    inputLabel: "Word",
    outputLabel: "PDF",
  },
};
const MAX_FILE_SIZE = 20 * 1024 * 1024;

function downloadBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function App() {
  const [mode, setMode] = useState("pdfToWord");
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [conversionStatus, setConversionStatus] = useState("idle");
  const [conversionMessage, setConversionMessage] = useState("");
  const [download, setDownload] = useState(null);
  const [selectionError, setSelectionError] = useState("");
  const fileInputRef = useRef(null);
  const selectedMode = modes[mode];

  function selectMode(nextMode) {
    setMode(nextMode);
    setFile(null);
    setDownload(null);
    setConversionMessage("");
    setConversionStatus("idle");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }
  async function handleConvert() {
    if (!file) return;

    setConversionStatus("converting");
    setConversionMessage("");
    setDownload(null);

    try {
      const blob = await convertDocument(file, mode);
      const outputExtension = mode === "pdfToWord" ? "docx" : "pdf";
      const outputName = `${file.name.replace(/\.[^.]+$/, "")}.${outputExtension}`;

      setDownload({ filename: outputName, blob });
      setConversionStatus("success");
    } catch (error) {
      setConversionStatus("error");
      setConversionMessage(error.message || "Conversion failed. Please try again.");
    }
  }

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0] ?? null;

    setDownload(null);
    setConversionMessage("");
    setConversionStatus("idle");

    if (selectedFile && selectedFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setSelectionError("The file must be 20 MB or smaller.");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    setSelectionError("");
    setFile(selectedFile);
  }

  function clearFile() {
    setFile(null);
    setDownload(null);
    setConversionStatus("idle");
    setConversionMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function checkApi() {
    setStatus("checking");
    setMessage("");

    try {
      const healthMessage = await checkApiHealth();
      setStatus("success");
      setMessage(healthMessage);
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Could not reach the API.");
    }
  }

  return (
    <main className="page">
      <header className="topbar">
        <a className="brand" href="/" aria-label="DocShift home">
          <span className="brand-mark">D</span>
          <span>docshift</span>
        </a>
        <span className="topbar-note">Simple document conversion</span>
      </header>

      <section className="hero">
        <div className="eyebrow">DOCUMENT CONVERTER</div>
        <h1>Documents, ready for their next step.</h1>
        <p className="hero-copy">
          Convert between PDF and Word in a few clicks.
        </p>

        <div className="converter-card">
          <div className="mode-tabs" role="tablist" aria-label="Conversion type">
            {Object.entries(modes).map(([key, item]) => (
              <button
                className={`mode-tab ${mode === key ? "active" : ""}`}
                key={key}
                onClick={() => selectMode(key)}
                role="tab"
                aria-selected={mode === key}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="api-status">
            <button
              className="text-button"
              onClick={checkApi}
              disabled={status === "checking"}
            >
              {status === "checking" ? "Checking API…" : "Check connection"}
            </button>

            {message && (
              <span className={status === "error" ? "api-error" : "api-success"}>
                {message}
              </span>
            )}
          </div>

          <div className="dropzone">
            <input
              ref={fileInputRef}
              className="file-input"
              type="file"
              accept={selectedMode.inputType}
              onChange={handleFileChange}
            />

            <div className="upload-icon" aria-hidden="true">
              ↑
            </div>

            {file ? (
              <>
                <h2>{file.name}</h2>
                <p>{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                <button className="text-button" onClick={clearFile}>
                  Remove file
                </button>
              </>
            ) : (
              <>
                <h2>Choose a {selectedMode.inputLabel} file</h2>
                <p>or drag and drop it here</p>
                <button
                  className="secondary-button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse files
                </button>
                <span className="file-hint">
                  {selectedMode.inputLabel} files up to 20 MB
                </span>
              </>
            )}
          </div>

          {selectionError && (
            <p className="conversion-error" role="alert">
              {selectionError}
            </p>
          )}

          <button
            className="convert-button"
            onClick={handleConvert}
            disabled={!file || conversionStatus === "converting"}
          >
            {conversionStatus === "converting"
              ? "Converting…"
              : `Convert to ${selectedMode.outputLabel}`}
          </button>

          {conversionStatus === "error" && (
            <p className="conversion-error" role="alert">
              {conversionMessage}
            </p>
          )}

          {download && (
            <div className="download-result" role="status">
              <p>Your file is ready: {download.filename}</p>
              <button
                className="download-button"
                onClick={() => downloadBlob(download.blob, download.filename)}
              >
                Download converted file
              </button>
            </div>
          )}
          <p className="privacy-note">
            Files are converted on this server and temporary files are deleted
            after download.
          </p>
        </div>
      </section>

      <footer className="footer">
        <span>© {new Date().getFullYear()} DocShift</span>
        <span>PDF ↔ Word conversion</span>
      </footer>
    </main>
  );
}

export default App;
