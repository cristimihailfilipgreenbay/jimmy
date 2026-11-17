# Evaluation report

Run on 2026-11-17 15:00 UTC. Command: `docker compose exec backend python -m eval.run`.

Models: Tutor `openai/gpt-6-luna`, question writer and Conflict comparer `openai/gpt-6-luna`, judge `google/gemini-3.8-flash`, embeddings `openai/text-embedding-3-small`.

## Scores

| Metric | Score | Items scored | What it measures |
|---|---|---|---|
| Faithfulness | **81%** | 17 of 17 | claims in the answer that its retrieved passages support |
| Context precision | **82%** | 17 of 17 | retrieved passages that are useful, ranked first |
| Context recall | **94%** | 17 of 17 | reference-answer facts found in the retrieved passages |
| Citation check passed first time | **100%** | 20 of 20 | answers the Tutor wrote with every paragraph cited or labelled |
| Citation correctness | **75%** | 20 of 20 | cited paragraphs a judge found supported by their passages |
| Out-of-scope answered without Citations | **100%** | 3 of 3 | no Citation pointing at an unrelated passage |
| Answer-key correctness | **100%** | 18 of 18 | quiz answer keys a judge found matching their source passage |
| Conflict detection (planted errors found) | **100%** | 8 of 8 | wrong statements in Notes flagged as a Conflict |
| Conflict false alarms (lower is better) | **0%** | 4 of 4 | agreeing or unrelated pairs wrongly flagged |

Ragas scores are averages over the answerable questions (Notes, Library, web) that found at least one passage. Higher is better except where noted.

## Golden set

| Id | Space | Kind | Question | Faith. | Prec. | Recall | Citations | Answer |
|---|---|---|---|---|---|---|---|---|
| q01 | biology | notes | Where does glycolysis happen, and what is its net gain? | 100% | 100% | 100% | 1 | Glycolysis happens in the **cytoplasm**. Its net gain per glucose molecule is **2 ATP and 2 NADH**. [1] |
| q02 | biology | notes | What is the final electron acceptor in the electron transport chain, and what d… | 100% | 100% | 100% | 1 | Oxygen is the final electron acceptor in the electron transport chain, and it forms water. [1] |
| q03 | biology | notes | Where does the Calvin cycle take place and what does Rubisco do in it? | 100% | 100% | 100% | 1 | The Calvin cycle takes place in the **stroma** of the chloroplast. Rubisco fixes carbon dioxide onto RuBP. [1] |
| q04 | biology | notes | How many sodium and potassium ions does the sodium-potassium pump move for each… | 100% | 100% | 100% | 1 | The sodium-potassium pump moves **3 sodium ions out** of the cell and **2 potassium ions in** for each ATP. [1] |
| q05 | biology | notes | What happens to a cell placed in a hypertonic solution? | 0% | 100% | 100% | 1 | Water leaves the cell by osmosis, so the cell loses water and shrinks. [1] |
| q06 | biology | notes | What do yeast and animal cells make when they ferment? | 100% | 100% | 100% | 1 | Animal cells make **lactic acid**; yeast makes **ethanol and carbon dioxide (CO₂)** during fermentation. [1] |
| q07 | biology | notes | Which factors limit the rate of photosynthesis? | 100% | 100% | 100% | 1 | Light intensity, carbon dioxide concentration, and temperature can all limit the rate of photosynthesis. [1] |
| q08 | biology | library | What role does cholesterol play in the plasma membrane? | 100% | 100% | 100% | 1 | Cholesterol helps **stabilize the plasma membrane’s fluidity**: it prevents the membrane from becoming too rigid at low temperatures and too fluid at high temp… |
| q09 | biology | library | What is chemiosmosis? | 67% | 0% | 0% | 1 | Chemiosmosis is the process in which protons flow back across a membrane through ATP synthase, and that flow drives the production of ATP. In cellular respirat… |
| q10 | biology | library | What are the reaction-centre pigments of photosystem I and photosystem II? | 0% | 58% | 100% | 2 | Photosystem I’s reaction-centre pigment is **P700**; photosystem II’s is **P680**. Both are pairs of chlorophyll *a* molecules. [2][4] |
| q11 | physics | library | State Newton's second law of motion. | 75% | 95% | 100% | 1 | Newton’s second law states that an object’s acceleration is directly proportional to the net external force acting on it, points in the same direction as that … |
| q12 | physics | library | What does the work-energy theorem say? | 100% | 64% | 100% | 1 | The work–energy theorem says that the **net work** done on a system equals the change in its kinetic energy. [4] |
| q13 | physics | library | When is linear momentum conserved? | 100% | 100% | 100% | 2 | Linear momentum is conserved for a system when the **net external force on it is zero**—that is, when the system is isolated. Internal forces between objects i… |
| q14 | physics | library | What is the difference between an elastic and an inelastic collision? | 100% | 100% | 100% | 3 | An **elastic collision** conserves the system’s internal kinetic energy; an **inelastic collision** does not—the internal kinetic energy changes. [1][4] In bot… |
| q15 | biology | web | What is CRISPR-Cas9 used for? | 71% | 100% | 100% | 2 | CRISPR-Cas9 is used to edit DNA at targeted locations—for example, to disable or remove genes or add new genetic material. It is used in biological research, m… |
| q16 | biology | web | What is the endosymbiotic theory and who made it widely known? | 67% | 19% | 100% | 2 | The **endosymbiotic theory** proposes that mitochondria and chloroplasts originated as independent bacteria that came to live inside other cells and eventually… |
| q17 | physics | web | What is the Higgs boson and where was it found? | 100% | 52% | 100% | 4 | The **Higgs boson** is an elementary particle associated with the Higgs field. Its discovery helped confirm the Higgs field, which is linked to how many elemen… |
| q18 | biology | out_of_scope | What do my Notes say about meiosis and crossing over? | n/a | n/a | n/a | 0 | [tutor] Your Notes and the Subject Library didn’t cover meiosis and crossing over in the searches. In general, meiosis produces sex cells, and crossing over is… |
| q19 | biology | out_of_scope | Explain how DNA replication works, from my Notes. | n/a | n/a | n/a | 0 | [tutor] Your Notes and the Subject Library didn’t cover DNA replication, so here’s a general explanation. DNA replication copies a cell’s DNA before cell divis… |
| q20 | physics | out_of_scope | What do my Notes say about the French Revolution? | n/a | n/a | n/a | 0 | [tutor] Your Notes and the Subject Library didn’t cover the French Revolution. |
