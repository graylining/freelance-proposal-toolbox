export function About() {
  const manifest = chrome.runtime.getManifest()

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-base font-semibold text-neutral-100">{manifest.name}</p>
        <p className="mt-0.5 text-[11px] text-neutral-500">
          v{manifest.version} · {manifest.description}
        </p>
        <p className="mt-0.5 text-[11px] text-neutral-500">
          Note: Currently we only support Upwork platform, but we are planning on adding other platform support soon.
        </p>
      </Card>

      <Card title="How it works">
        <ol className="space-y-1.5 text-[11px] leading-relaxed text-neutral-300">
          <li>
            <span className="font-medium text-neutral-100">1. Sync your profile</span>{' '}
            on the Dashboard. Open your Upwork profile page, then click Sync Profile.
            Your headline, skills, portfolio, and client feedback are saved locally.
          </li>
          <li>
            <span className="font-medium text-neutral-100">2. Set search filters</span>{' '}
            in the Filters tab and click Open in Upwork to launch a tailored search.
          </li>
          <li>
            <span className="font-medium text-neutral-100">3. Scan a job</span>. Open any
            Upwork job at <code className="text-neutral-400">/jobs/~cipher</code>, switch
            to the Job tab, and click Scan Job.
          </li>
          <li>
            <span className="font-medium text-neutral-100">4. Copy the prompt</span> from
            the Prompt tab. Paste into Claude / DeepSeek / Kimi / any LLM. You'll get two distinct
            proposal variations plus pricing, milestone dates, effort-vs-pay verdict, and
            strategic advice.
          </li>
        </ol>
      </Card>

      <Card title="What's captured">
        <p className="text-[11px] leading-relaxed text-neutral-400">
          From your profile: headline, hourly rate, skills, employment history, portfolio
          projects (via Upwork's GraphQL), and client feedback. From each job: title,
          description, budget, screening questions, client stats, and required skills.
          You can edit anything in the Profile tab.
        </p>
      </Card>

      <Card title="Privacy">
        <p className="text-[11px] leading-relaxed text-neutral-400">
          No backend, no telemetry, no accounts. Every scraped field stays in your browser
          (<code className="text-neutral-400">chrome.storage.local</code>). Uninstalling
          the extension wipes everything.
        </p>
      </Card>

      <Card title="Questions or feature requests?">
        <p className="text-[11px] leading-relaxed text-neutral-400">
          Got a question, hit a bug, or want a feature? Reach out at{' '}
          <a
            href="https://graylining.com"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-upwork-300 hover:text-upwork-400"
          >
            graylining.com
          </a>
          .
        </p>
      </Card>
    </div>
  )
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3">
      {title && (
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          {title}
        </h3>
      )}
      {children}
    </section>
  )
}
