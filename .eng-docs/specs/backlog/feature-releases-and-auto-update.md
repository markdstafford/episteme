---
created: 2026-03-13
last_updated: 2026-03-13
status: draft
issue: 68
specced_by: markdstafford
implemented_by: null
superseded_by: null
---

# Releases and auto-update

## What

Episteme ships as a native desktop application. This feature establishes a release pipeline that lets the maintainer publish versioned releases, and lets installed copies of the app detect and apply updates automatically.

When the maintainer is ready to ship a version, they tag a commit. An automated pipeline builds the application for all supported platforms, signs the update packages, and publishes a GitHub Release with downloadable installers and an update manifest. Users running Episteme see an in-app notification when a new version is available and can apply the update without leaving the app or visiting any website.

## Why

Right now, shipping a new version of Episteme means each user rebuilds from source. This creates a high barrier to staying current — most users won't bother, meaning bug fixes and improvements don't reach them. A formal release pipeline makes Episteme behave like a real application: releases are intentional, versioned events, and users stay up to date without any manual steps.

The auto-update capability is particularly important because Episteme is a tool people will integrate into their daily workflow. When it improves, they should benefit automatically. An in-app update flow removes the friction entirely — the app tells the user there's something new, the user approves, and it's done.

## Personas

- **Marcus: Maintainer** — tags versions, triggers the release pipeline, monitors build results
- **Any persona (Patricia, Eric, et al.)** — receives update notifications and applies updates from within the app

## Narratives

### Publishing a release

Marcus has been merging features to main over the past couple of weeks and decides it's time to cut a release. He bumps the version number in `tauri.conf.json` and `package.json` to `0.2.0`, commits the change, and pushes a tag: `git tag v0.2.0 && git push origin v0.2.0`. Within seconds, GitHub Actions picks up the tag and kicks off the build pipeline.

The pipeline runs three parallel jobs — one each for macOS (arm64 and x86_64), Windows, and Linux. Each job compiles the Rust backend, bundles the frontend, and produces a signed installer. Marcus watches the Actions run in GitHub; after about fifteen minutes, all jobs are green. In parallel, git-cliff scans the commits since the last tag and generates a structured changelog from the conventional commit messages — features, fixes, and breaking changes grouped automatically.

The pipeline generates a `latest.json` update manifest pointing to the new installers, then creates a GitHub Release named "v0.2.0" with all platform installers attached as assets, the manifest published as a release artifact, and the git-cliff changelog pre-populated as the release description. Marcus glances at the release notes, makes a small edit to highlight the most important change, and publishes the release. Users can now download installers directly from the release page, and any running copy of Episteme will discover the new version on its next update check.

### Receiving and applying an update

Patricia is mid-session on a Tuesday morning when a small notification badge appears in the bottom corner of the app: "Version 0.2.0 is available." She's in the middle of a document, so she dismisses it for now. An hour later, at a natural stopping point, she clicks the notification. A small dialog appears showing the version number and the release notes — she can see that this release includes a fix for the editor behavior she'd found annoying.

Patricia clicks "Update and restart." Episteme downloads the new version in the background, verifies the update signature, and applies it. The app restarts and opens back to the document she was working on. The notification is gone, and she's now running 0.2.0 without having visited a website, run a command, or manually moved any files.

## User stories

**Publishing a release**

- Marcus can trigger a full multi-platform build by pushing a git tag
- Marcus can see build status for all platform jobs in GitHub Actions
- Marcus can find auto-generated release notes from git-cliff on the GitHub Release
- Marcus can edit release notes before publishing the release
- Marcus can share a GitHub Release page with users for manual downloads

**Receiving and applying an update**

- Patricia can see a notification when a new version is available
- Patricia can dismiss an update notification and act on it later
- Patricia can read release notes before deciding to update
- Patricia can apply an update with a single click from within the app
- Patricia can expect the app to reopen to her previous context after an update

## Goals

- A version tag push produces a complete GitHub Release with installers for all platforms within 30 minutes
- Running copies of the app check for updates on launch and periodically while running, and notify the user when one is available
- Users can apply an update entirely from within the app in under 2 minutes
- Release notes are auto-generated from commit history with no manual steps required beyond optional editing
- The update pipeline works without OS code signing (macOS users may need to re-approve after each update)

## Non-goals

- macOS notarization / Apple Developer Program enrollment (deferred)
- Windows Authenticode signing (deferred)
- Delta/incremental updates — each update is a full app replacement
- Forced or silent updates — users always choose when to apply

## Design spec

*(Added by design specs stage)*

## Tech spec

*(Added by tech specs stage)*

## Task list

*(Added by task decomposition stage)*
