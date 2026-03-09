# Episteme

*pronounced "ep-uh-STEE-mee"*

> Humans do the thinking. AI does the writing.

An AI supported doc flow (`asdf`) for writing, reviewing, and approving documents — built on git.

## What it is

Episteme is a document authoring tool for teams that care about the quality and coherence of their written work. It handles product descriptions, technical designs, SOPs, and any other structured documentation your team produces.

You drive the thinking. AI handles the drafting, the questions, the formatting, and the grunt work of turning ideas into polished documents.

## How it works

Episteme maps directly onto git workflows you already know:

- **Branches are drafts.** Opening a document for editing creates a branch.
- **Commits are checkpoints.** AI commits progress to the remote as you work.
- **PRs are approval flows.** When a doc is ready for sign-off, a PR is opened.
- **Merging to main means approved.** A merged doc is a ratified doc.

The app has four modes for interacting with documents:

- **View** — read a rendered document, ask AI questions about it
- **Edit** — write and revise using AI as your drafting partner
- **Review** — leave comments; AI surfaces questions the doc doesn't answer
- **Approve** — understand the doc, review comment threads, and merge when satisfied

## The flywheel

Every approved document makes the next one better. As your repository grows, AI has more context — more examples, more decisions, more institutional knowledge — to draw on. A new product description written when you have 50 docs will be more consistent and coherent than your first one.

## Tech stack

- [Tauri](https://tauri.app) — desktop app framework
- React + TypeScript — UI
- Tailwind CSS — styling
- Zustand — state management
- GitHub OAuth — authentication
- Rust backend — git operations and file system

## Getting started

> Prerequisites: [Rust](https://rustup.rs), [Node.js](https://nodejs.org), a GitHub account

```bash
git clone https://github.com/markdstafford/episteme
cd episteme
npm install
npm run tauri dev
```

## Status

Early development. Core document authoring is working; review and approval flows are in progress.
