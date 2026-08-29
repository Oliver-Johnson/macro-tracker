# Security

## What the attack surface actually is

Worth stating plainly, because it is unusually small: Macrolog is a static
page. There is no server, no database, no account, no session, no analytics and no
third-party script. Nothing you enter is transmitted anywhere — your food log and
macro data are stored entirely in your browser's localStorage.

A share/export link may carry encoded food log data. That data is never sent to any
server — it is decoded in your browser only.

That leaves a short list of things that would count as a vulnerability here:

- a crafted import payload that executes script when parsed (the app parses JSON data)
- a crafted payload that makes the page hang or exhaust memory
- anything reaching the network unexpectedly, since the app is designed to work offline

## Reporting

Please report privately rather than opening a public issue, using
[GitHub's private vulnerability reporting](https://github.com/Oliver-Johnson/macro-tracker/security/advisories/new)
on this repository.

Include what you did, what happened, and a reproduction case if possible. You will
get an acknowledgement, and credit in the fix unless you would rather not.

## Supported versions

The deployed site is the only supported version. It is built from `master` on every
push, so a fix reaches users as soon as it merges.
