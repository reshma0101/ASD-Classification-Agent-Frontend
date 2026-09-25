import { useRef, useState } from "react";
import "./App.css";

// Production backend
const API_URL = "https://asd-classification-agent-backend.onrender.com";

const OUTPUT_FILENAME =
  "PRE CLASSIFICATION SHEET FOR ST2_Result.xlsx";

function App() {
  const [asdFile, setAsdFile] = useState(null);
  const [preClassFile, setPreClassFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const requestInProgress = useRef(false);

  const isExcelFile = (file) => {
    if (!file) return false;
    const name = file.name.toLowerCase();
    return name.endsWith(".xlsx") || name.endsWith(".xls");
  };

  const handleAsdFile = (file) => {
    if (!file) return;
    if (!isExcelFile(file)) {
      setError("Please select a valid Excel file (.xlsx or .xls).");
      return;
    }
    setAsdFile(file);
    setError("");
    setResult(null);
  };

  const handlePreClassFile = (file) => {
    if (!file) return;
    if (!isExcelFile(file)) {
      setError("Please select a valid Excel file (.xlsx or .xls).");
      return;
    }
    setPreClassFile(file);
    setError("");
    setResult(null);
  };

  const handleDrop = (event, type) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    if (type === "asd") {
      handleAsdFile(file);
    } else {
      handlePreClassFile(file);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleClassify = async (event) => {
    event?.preventDefault();

    if (requestInProgress.current || processing) return;

    if (!asdFile || !preClassFile) {
      setError(
        "Please upload both Excel files before starting classification."
      );
      return;
    }

    requestInProgress.current = true;
    setProcessing(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("asd_keywords", asdFile);
    formData.append("pre_classification", preClassFile);

    try {
      const response = await fetch(`${API_URL}/classify`, {
        method: "POST",
        body: formData,
      });

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error("The server returned an invalid response.");
      }

      // The new backend returns HTTP 200 + message/stats.
      // It does not return success:true.
      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.error ||
            data.message ||
            "Classification failed."
        );
      }

      const stats = data.stats || {};

      setResult({
        ...data,
        rows: stats.rows_processed ?? 0,
        functional_area_updates:
          stats.functional_area_updates ?? stats.changed ?? 0,
        changed: stats.changed ?? stats.functional_area_updates ?? 0,
        no_change: stats.no_change ?? 0,
        ambiguous: stats.ambiguous ?? 0,
        description_resolved: stats.description_resolved ?? 0,
        devclass_matches: stats.devclass_matches ?? 0,
        object_name_matches: stats.object_name_matches ?? 0,
        no_keyword_match: stats.no_keyword_match ?? 0,
        processing_seconds: stats.processing_seconds ?? 0,
      });
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the classification server."
      );
    } finally {
      requestInProgress.current = false;
      setProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (downloading) return;

    setDownloading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/download`);

      if (!response.ok) {
        throw new Error(
          "Unable to download the classified file."
        );
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = OUTPUT_FILENAME;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err.message ||
          "Something went wrong while downloading the file."
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleReset = () => {
    if (processing) return;

    setAsdFile(null);
    setPreClassFile(null);
    setResult(null);
    setError("");
  };

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="brand-icon">AI</div>
          <div>
            <h1>ASD Classification Agent</h1>
            <p>Intelligent Excel classification workflow</p>
          </div>
        </div>

        <div className="status">
          <span className="status-dot"></span>
          Agent Online
        </div>
      </header>

      <main className="container">
        <section className="hero">
          <div className="hero-badge">
            <span>✦</span>
            Client Classification Engine
          </div>

          <h2>
            Classify your Excel data
            <span> intelligently.</span>
          </h2>

          <p>
            Upload your ASD keyword master and pre-classification
            workbook. The agent checks <strong>DEVCLASS</strong> first,
            then uses <strong>OBJECT_NAME</strong> only when DEVCLASS
            has no keyword match. When multiple functional areas match,
            <strong> OBJ_NAME_DESCRIPTION</strong> is used to resolve
            the ambiguity before updating <strong>Functional area</strong>.
          </p>
        </section>

        <section className="upload-grid">
          <div
            className={`upload-card ${asdFile ? "has-file" : ""}`}
            onDrop={(event) => handleDrop(event, "asd")}
            onDragOver={handleDragOver}
          >
            <div className="card-top">
              <div className="number">01</div>
              {asdFile && <div className="check-badge">✓</div>}
            </div>

            <div className="upload-icon">⇧</div>

            <h3>ASD Keyword Master</h3>

            <p>
              Upload the Excel file containing the ASD
              functional-area keywords.
            </p>

            <label className="file-input">
              <input
                type="file"
                accept=".xlsx,.xls"
                disabled={processing}
                onChange={(event) =>
                  handleAsdFile(event.target.files?.[0])
                }
              />
              <span>
                {asdFile ? "Change Excel file" : "Choose Excel file"}
              </span>
            </label>

            <div className="drop-hint">
              Drag & drop your Excel file here
            </div>

            {asdFile && (
              <div className="file-selected">
                <span className="file-icon">XLS</span>
                <div className="file-info">
                  <strong>{asdFile.name}</strong>
                  <small>
                    {(asdFile.size / 1024 / 1024).toFixed(2)} MB
                  </small>
                </div>
                <span className="file-check">✓</span>
              </div>
            )}
          </div>

          <div
            className={`upload-card ${preClassFile ? "has-file" : ""}`}
            onDrop={(event) => handleDrop(event, "pre")}
            onDragOver={handleDragOver}
          >
            <div className="card-top">
              <div className="number">02</div>
              {preClassFile && <div className="check-badge">✓</div>}
            </div>

            <div className="upload-icon">⇧</div>

            <h3>Pre-Classification Workbook</h3>

            <p>
              Upload the workbook containing DEVCLASS,
              OBJECT_NAME, existing Functional area and
              description data.
            </p>

            <label className="file-input">
              <input
                type="file"
                accept=".xlsx,.xls"
                disabled={processing}
                onChange={(event) =>
                  handlePreClassFile(event.target.files?.[0])
                }
              />
              <span>
                {preClassFile ? "Change Excel file" : "Choose Excel file"}
              </span>
            </label>

            <div className="drop-hint">
              Drag & drop your Excel file here
            </div>

            {preClassFile && (
              <div className="file-selected">
                <span className="file-icon">XLS</span>
                <div className="file-info">
                  <strong>{preClassFile.name}</strong>
                  <small>
                    {(preClassFile.size / 1024 / 1024).toFixed(2)} MB
                  </small>
                </div>
                <span className="file-check">✓</span>
              </div>
            )}
          </div>
        </section>

        <section className="action-section">
          <button
            type="button"
            className={`classify-button ${
              processing ? "processing-button" : ""
            }`}
            onClick={handleClassify}
            disabled={processing || !asdFile || !preClassFile}
          >
            {processing ? (
              <>
                <span className="button-spinner"></span>
                Processing workbook...
              </>
            ) : (
              <>
                <span>✦</span>
                Run Classification
                <span className="button-arrow">→</span>
              </>
            )}
          </button>

          {!processing && (
            <p className="action-hint">
              Both Excel files are required to start the agent.
            </p>
          )}
        </section>

        {processing && (
          <section className="processing-card">
            <div className="processing-animation">
              <div className="processing-ring"></div>
              <div className="processing-core">AI</div>
            </div>

            <div className="processing-content">
              <div className="processing-title">
                Agent is processing your files
                <span className="animated-dots">...</span>
              </div>

              <p>
                Analyzing DEVCLASS and OBJECT_NAME, resolving
                classifications, and generating the final workbook.
              </p>

              <div className="processing-bar">
                <div className="processing-bar-fill"></div>
              </div>

              <small>
                Please keep this page open while processing.
              </small>
            </div>
          </section>
        )}

        {error && (
          <section className="error-card">
            <div className="error-icon">!</div>
            <div>
              <strong>Something went wrong</strong>
              <p>{error}</p>
            </div>
          </section>
        )}

        {result && !processing && (
          <section className="result-card">
            <div className="result-header">
              <div className="success-icon">✓</div>
              <div>
                <div className="result-label">
                  CLASSIFICATION COMPLETE
                </div>

                <h2>Your workbook is ready</h2>

                <p>
                  The client classification engine completed the
                  classification successfully.
                </p>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">ROWS ANALYZED</span>
                <strong>
                  {result.rows?.toLocaleString() || "—"}
                </strong>
              </div>

              <div className="stat-card">
                <span className="stat-label">
                  FUNCTIONAL AREA UPDATES
                </span>
                <strong>
                  {result.functional_area_updates?.toLocaleString() ||
                    "0"}
                </strong>
              </div>

              <div className="stat-card">
                <span className="stat-label">NO CHANGE</span>
                <strong>
                  {result.no_change?.toLocaleString() || "0"}
                </strong>
              </div>

              <div className="stat-card">
                <span className="stat-label">AMBIGUOUS MATCHES</span>
                <strong>
                  {result.ambiguous?.toLocaleString() || "0"}
                </strong>
              </div>
            </div>

            <div className="output-file">
              <div className="output-file-icon">XLS</div>

              <div className="output-file-info">
                <span>CLASSIFICATION FLOW</span>
                <strong>
                  DEVCLASS → OBJECT_NAME → Description for ambiguity
                </strong>
              </div>
            </div>

            <div className="output-file">
              <div className="output-file-icon">J</div>

              <div className="output-file-info">
                <span>CLASSIFICATION CHANGE COLUMN</span>

                <strong>
                  Added as the final column in the generated workbook
                </strong>

                <p>
                  <b>Changed</b> — Functional area in column J was
                  updated.
                  <br />
                  <b>No Change</b> — No classification change was
                  required.
                  <br />
                  <b>
                    No Change - Possible Functional Areas: SD, MM
                  </b>{" "}
                  — Multiple Functional Areas matched the available
                  evidence. The existing value in column J was preserved
                  and the possible Functional Areas are shown for review.
                </p>
              </div>
            </div>

            <div className="output-file">
              <div className="output-file-icon">XLS</div>

              <div className="output-file-info">
                <span>OUTPUT FILE</span>
                <strong>{OUTPUT_FILENAME}</strong>
              </div>
            </div>

            <div className="result-actions">
              <button
                type="button"
                className="download-button"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <>
                    <span className="button-spinner"></span>
                    Preparing download...
                  </>
                ) : (
                  <>↓ Download Classified Excel</>
                )}
              </button>

              <button
                type="button"
                className="reset-button"
                onClick={handleReset}
              >
                Process another workbook
              </button>
            </div>
          </section>
        )}

        <section className="info-section">
          <div className="info-card">
            <div className="info-icon">⚙</div>

            <div>
              <h3>How it works</h3>

              <ol>
                <li>Upload the ASD keyword master.</li>
                <li>Upload the pre-classification workbook.</li>
                <li>
                  The agent first checks <strong>DEVCLASS</strong>.
                </li>
                <li>
                  If DEVCLASS has no keyword match, it checks{" "}
                  <strong>OBJECT_NAME</strong>.
                </li>
                <li>
                  If multiple Functional Areas match,{" "}
                  <strong>OBJ_NAME_DESCRIPTION</strong> is used to
                  resolve the ambiguity.
                </li>
                <li>
                  Functional area in column J is updated only when the
                  classification result requires a change.
                </li>
                <li>
                  Download the classified workbook with the final{" "}
                  <strong>Classification Change</strong> column.
                </li>
              </ol>
            </div>
          </div>

          <div className="info-card protection-card">
            <div className="info-icon">✓</div>

            <div>
              <h3>Data Protection Rule</h3>

              <p>
                If DEVCLASS and OBJECT_NAME have no keyword match, the
                existing Functional area is preserved. If multiple
                Functional Areas remain unresolved, the existing value
                is also preserved and the possible areas are recorded in
                the Classification Change column.
              </p>

              <div className="protection-badge">
                Existing data is preserved
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <span>ASD Classification Agent</span>
        <span className="footer-divider">·</span>
        <span>Client Classification Engine</span>
        <span className="footer-divider">·</span>
        <span>Deterministic Classification Engine</span>
      </footer>
    </div>
  );
}

export default App;
