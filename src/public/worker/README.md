# Worker Runtime

The `worker` runtime is for Next.js Edge runtimes.

This is a server-side runtime.

The Next.js Edge runtime is similar to that of a browser, but with a few exceptions (some of these are obvious):

- All DOM-related features are not present.
- 'window' is not preset.
- XHR is not present (you need to use fetch).
- ReadableStream is present (and should be used instead of Node.js's Readable)

As such, the `worker` runtime is designed to use `fetch` with support for `ReadableSteam`, but a NoOp implementation for `AuthManager`, since this is a server-side environment.
