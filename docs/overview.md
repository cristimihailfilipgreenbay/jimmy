# Jimmy: Overview

A plain-language introduction to what Jimmy is, who it is for, and how it works. For the feature list see [Features.md](./Features.md). For getting the code running see the [README](../README.md). Terms in **bold** are defined in [GLOSSARY.md](./GLOSSARY.md).

## What Jimmy is

Jimmy is an AI study tutor for university students. You create a **Study Space** for each subject you study, upload your own **Notes**, and talk to a tutor that knows that subject. Jimmy answers from your material, quizzes you, and remembers which **Topics** you struggle with.

## The problem

Students study from their own lecture notes and PDFs. A general chatbot has not read those notes. It mixes in knowledge it cannot cite, sounds just as confident when it is wrong, and forgets what you find hard. With several subjects the material and the progress blur together, and you cannot tell which statements come from your course and which the model made up.

## Who it is for

University students who study from their own notes and want to be tested on that material with answers they can check.

## How Jimmy is different

- **It uses your material first,** and cites the document, author and page.
- **It is honest about where a statement comes from.** Your Notes, an open textbook, a web page and the tutor's own knowledge each look different on screen.
- **It asks you when it is unsure,** instead of guessing: when your notes disagree with the textbook, when a grade is borderline, and before it saves anything.
- **It keeps each subject separate.** Biology never mixes with Physics.
- **It decides for itself how to find an answer.** It is an agent, not a fixed pipeline: it chooses between your Notes, the textbook, Wikipedia and the web, and decides whether something it found is worth keeping.

## How it works, in one pass

1. **Set up a Study Space** for a subject, for example Biology.
2. **Upload Notes.** Jimmy reads them, proposes Topics, and you approve or rename them.
3. **Optionally switch on a Subject Library,** open-licensed textbook chapters for the same subject.
4. **Ask questions.** Jimmy looks in your Notes, then the library. If that is not enough it searches Wikipedia, then the web. Each statement is labelled by origin and cited.
5. **When it is unsure, it pauses.** If your Notes contradict the textbook, you choose which to trust. Jimmy remembers your choice for that Topic.
6. **Keep what is useful.** A good web **Finding** can be saved into the Study Space in the background, without making you wait. It is marked "web-sourced, unreviewed" and stays out of quizzes until you approve it.
7. **Practise.** Take a Quiz or a Test. Topics you keep getting wrong become **Weak Topics** and show up more often. If a grade looks unfair, you can **Dispute** it.
8. **Make Flashcards** from your sources, and review them before they are saved.

## The four kinds of source

| Source | How it appears | Trust |
|---|---|---|
| Your Notes | Cited with document, author and page | Highest: it is your course |
| Subject Library | Cited like a book | High |
| Web material | Cited, labelled "web-sourced, unreviewed" | Check it yourself |
| Tutor Knowledge | Labelled "general knowledge, not from your notes" | Explanations only, never used to make quiz answers |

## What Jimmy will not do (v1)

It will not post anything anywhere, generate images, read your analytics, or read scanned documents. Each Student has an account (email and password). It runs locally, not as a hosted service.

## Where to go next

| If you want to... | Read |
|---|---|
| See everything it can do | [Features.md](./Features.md) |
| Understand the behaviour and rules | [design.md](./design.md) |
| Understand how it is built | [architecture.md](./architecture.md) |
| Run or contribute to the code | [README](../README.md) |
