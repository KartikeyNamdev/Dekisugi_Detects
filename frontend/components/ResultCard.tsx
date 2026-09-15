import type { FraudResult } from "@/lib/types";

const VERDICT_LABEL: Record<FraudResult["verdict"], string> = {
  likely_scam: "Likely a scam",
  likely_genuine: "Likely genuine",
  uncertain: "Uncertain — review carefully",
};

const VERDICT_CLASS: Record<FraudResult["verdict"], string> = {
  likely_scam: "verdict verdict-scam",
  likely_genuine: "verdict verdict-genuine",
  uncertain: "verdict verdict-uncertain",
};

export default function ResultCard({ result }: { result: FraudResult }) {
  return (
    <div className="card">
      <div className={VERDICT_CLASS[result.verdict]}>
        {VERDICT_LABEL[result.verdict]}
        <span className="confidence">
          {" "}
          ({Math.round(result.confidence * 100)}% confidence)
        </span>
      </div>

      <p>{result.summary}</p>

      {result.indicators.length > 0 && (
        <section>
          <h3>Indicators found</h3>
          <ul>
            {result.indicators.map((indicator) => (
              <li key={indicator.label}>
                <strong>{indicator.label}</strong> — {indicator.detail}
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.actionList.length > 0 && (
        <section>
          <h3>What to do in the next 10 minutes</h3>
          <ol>
            {result.actionList.map((action, i) => (
              <li key={i}>{action}</li>
            ))}
          </ol>
        </section>
      )}

      {result.reportingScript && (
        <section>
          <h3>Reporting script (1930 / cybercrime portal)</h3>
          <pre className="reporting-script">{result.reportingScript}</pre>
        </section>
      )}

      {result.lendingAppCheck && (
        <section>
          <h3>RBI regulated-lending-app check</h3>
          <p>
            <strong>{result.lendingAppCheck.appName}</strong>:{" "}
            {result.lendingAppCheck.matched
              ? `matched against "${result.lendingAppCheck.matchedEntry}"`
              : "not found on the RBI regulated-entity list"}
            {result.lendingAppCheck.listLastUpdated
              ? ` (list last updated ${result.lendingAppCheck.listLastUpdated})`
              : ""}
          </p>
        </section>
      )}

      {result.sources.length > 0 && (
        <section>
          <h3>Sources</h3>
          <ul>
            {result.sources.map((source) => (
              <li key={source}>
                <a href={source} target="_blank" rel="noreferrer">
                  {source}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.error && <p className="error">Note: {result.error}</p>}
    </div>
  );
}
