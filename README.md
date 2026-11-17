

## Error reporting

Optional; completely inert when the DSN is unset (no init, no network).

| Variable | Purpose |
| --- | --- |
| `SENTRY_DSN` | Server and edge runtimes |
| `NEXT_PUBLIC_SENTRY_DSN` | Browser (build-time inlined); also `NEXT_PUBLIC_SENTRY_ENVIRONMENT`, `NEXT_PUBLIC_SENTRY_RELEASE` |
| `SENTRY_ENVIRONMENT` | Environment tag (falls back to `APP_ENV`, `NODE_ENV`) |
| `SENTRY_RELEASE` | Release id (falls back to the platform git SHA env var) |
| `SENTRY_TRACES_SAMPLE_RATE` | Default `0` (errors only) |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Optional: source-map upload at build time. Without the token the build is unchanged |

Privacy: default PII, request bodies, cookies and auth headers are never sent; sensitive query params are redacted before send.

Verify from a shell (no debug route needed): export the DSN locally, then send a test event with `sentry-cli send-event -m "qrave test"` (or `curl` a store/envelope request to the DSN ingest URL) and confirm it appears in the project with the `service` tag set.
