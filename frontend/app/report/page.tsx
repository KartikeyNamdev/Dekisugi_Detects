import Link from "next/link";
import Reveal from "@/components/Reveal";

const doNow = [
  "Call your bank's fraud/customer-care number immediately and ask them to freeze the account or block/reverse the transaction — use the number on your card or their official app, never a number from the scam message itself.",
  "Call 1930, India's national cyber-fraud helpline, right after. Reporting within the first hour gives banks the best chance of holding or reversing a transfer.",
  "File a complaint at the National Cybercrime Reporting Portal (cybercrime.gov.in) — you can do this the same day, even after calling 1930.",
  "Screenshot everything: the message, the app, the payment confirmation, the sender's number/UPI ID/app name.",
];

const haveReady = [
  "Transaction / UTR / reference ID (check your bank app or SMS)",
  "Exact amount and approximate time of the transaction",
  "Sender's phone number, UPI ID, email, or app name",
  "Your bank account number and the branch, if known",
  "Any screenshots of the message, call, or app",
];

const dontDo = [
  "Don't share any more OTPs, PINs, or passwords with anyone — including someone who calls claiming they can \"help recover\" the money. That follow-up call is very often a second scam.",
  "Don't install any \"recovery\" app or grant remote access to your phone or computer.",
  "Don't pay any \"processing fee\" to get your money back — no legitimate recovery process asks for money upfront.",
  "Don't wait to see if it \"sorts itself out.\" Every hour reduces the chance of reversal.",
];

export default function ReportPage() {
  return (
    <div className="page-container report-page">
      <div className="emergency-badge">⏱ Time matters — act now, read later</div>
      <h1>Already lost money to a scam?</h1>
      <p className="subtitle">
        Do these two things first, right now. The checklist below has
        everything else.
      </p>

      <div className="emergency-actions">
        <a href="tel:1930" className="emergency-action emergency-action-primary">
          <span className="emergency-action-icon">📞</span>
          <span>
            <span className="emergency-action-title">Call 1930</span>
            <span className="emergency-action-desc">
              National Cyber Fraud Helpline — tap to call
            </span>
          </span>
        </a>
        <a
          href="https://cybercrime.gov.in"
          target="_blank"
          rel="noreferrer"
          className="emergency-action emergency-action-secondary"
        >
          <span className="emergency-action-icon">🌐</span>
          <span>
            <span className="emergency-action-title">File at cybercrime.gov.in</span>
            <span className="emergency-action-desc">
              National Cybercrime Reporting Portal
            </span>
          </span>
        </a>
      </div>

      <Reveal>
        <section className="report-section">
          <h2>Do this right now</h2>
          <ol className="checklist">
            {doNow.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        </section>
      </Reveal>

      <Reveal delay={80}>
        <section className="report-section">
          <h2>Have this ready when you call</h2>
          <ul className="checklist">
            {haveReady.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </Reveal>

      <Reveal delay={160}>
        <section className="report-section report-section-warning">
          <h2>Don&apos;t do this</h2>
          <ul className="checklist checklist-warning">
            {dontDo.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>
      </Reveal>

      <Reveal delay={220}>
        <p className="subtitle report-footnote">
          Dekisugi Detects is advisory only — it doesn&apos;t file this report
          or contact your bank for you. If you&apos;re not sure whether
          something is a scam in the first place,{" "}
          <Link href="/message">check a message</Link>,{" "}
          <Link href="/screenshot">a screenshot</Link>, or{" "}
          <Link href="/call">describe a call</Link>.
        </p>
      </Reveal>
    </div>
  );
}
