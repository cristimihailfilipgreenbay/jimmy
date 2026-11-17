# Evaluation report

Run on 2026-11-17 12:37 UTC. Command: `docker compose exec backend python -m eval.run`.

Models: Tutor `openai/gpt-6-luna`, question writer and Conflict comparer `openai/gpt-6-luna`, judge `google/gemini-3.8-flash`, embeddings `openai/text-embedding-3-small`.

## Scores

| Metric | Score | Items scored | What it measures |
|---|---|---|---|
| Faithfulness | **79%** | 17 of 17 | claims in the answer that its retrieved passages support |
| Context precision | **71%** | 17 of 17 | retrieved passages that are useful, ranked first |
| Context recall | **100%** | 16 of 17 | reference-answer facts found in the retrieved passages |
| Citation check passed first time | **100%** | 20 of 20 | answers the Tutor wrote with every paragraph cited or labelled |
| Citation correctness | **60%** | 20 of 20 | cited paragraphs a judge found supported by their passages |
| Out-of-scope answered without Citations | **100%** | 3 of 3 | no Citation pointing at an unrelated passage |
| Answer-key correctness | **100%** | 18 of 18 | quiz answer keys a judge found matching their source passage |
| Conflict detection (planted errors found) | **100%** | 8 of 8 | wrong statements in Notes flagged as a Conflict |
| Conflict false alarms (lower is better) | **0%** | 4 of 4 | agreeing or unrelated pairs wrongly flagged |

Ragas scores are averages over the answerable questions (Notes, Library, web) that found at least one passage. Higher is better except where noted.

## Golden set

| Id | Space | Kind | Question | Citations | Answer |
|---|---|---|---|---|---|
| q01 | biology | notes | Where does glycolysis happen, and what is its net gain? | 1 | Glycolysis happens in the **cytoplasm**. Its net gain per glucose molecule is **2 ATP and 2 NADH**; it also produces two pyruvate molecules. [1] |
| q02 | biology | notes | What is the final electron acceptor in the electron transport chain, and what d… | 1 | Oxygen is the final electron acceptor in the electron transport chain. It combines with electrons and protons to form water. [1] |
| q03 | biology | notes | Where does the Calvin cycle take place and what does Rubisco do in it? | 1 | The Calvin cycle takes place in the **stroma** of the chloroplast. Rubisco fixes carbon dioxide by attaching it to RuBP, starting the process that leads to G3P… |
| q04 | biology | notes | How many sodium and potassium ions does the sodium-potassium pump move for each… | 1 | The sodium-potassium pump moves **3 sodium ions out** and **2 potassium ions in** for each ATP. [1] |
| q05 | biology | notes | What happens to a cell placed in a hypertonic solution? | 1 | Water moves out of the cell by osmosis, so the cell loses water and shrinks. [1] |
| q06 | biology | notes | What do yeast and animal cells make when they ferment? | 1 | Yeast makes **ethanol and carbon dioxide**. Animal cells make **lactic acid**. [1] |
| q07 | biology | notes | Which factors limit the rate of photosynthesis? | 1 | The main limiting factors are **light intensity, carbon dioxide concentration, and temperature**. If one of these is in short supply or outside its optimal ran… |
| q08 | biology | library | What role does cholesterol play in the plasma membrane? | 2 | Cholesterol sits between the phospholipids in the plasma membrane. It **buffers membrane fluidity**: at low temperatures it helps prevent the membrane from bec… |
| q09 | biology | library | What is chemiosmosis? | 4 | **Chemiosmosis** is the process of using the energy stored in a proton (H⁺) gradient across a membrane to make ATP. Protons flow back down their electrochemica… |
| q10 | biology | library | What are the reaction-centre pigments of photosystem I and photosystem II? | 2 | The reaction-centre pigment of **photosystem I** is **P700**, and that of **photosystem II** is **P680**. Both are pairs of chlorophyll *a* molecules. [5][6] |
| q11 | physics | library | State Newton's second law of motion. | 1 | Newton’s second law states that an object’s acceleration is in the direction of the net external force, directly proportional to that force, and inversely prop… |
| q12 | physics | library | What does the work-energy theorem say? | 1 | The **work–energy theorem** states that the net work done on an object equals its change in kinetic energy: \(W_{\text{net}}=\Delta K=K_f-K_i\). [4] |
| q13 | physics | library | When is linear momentum conserved? | 2 | Linear momentum is conserved for a system when the **net external force on it is zero**—that is, when the system is isolated. Internal forces may act between o… |
| q14 | physics | library | What is the difference between an elastic and an inelastic collision? | 3 | **Both collisions conserve momentum** when the system has no net external force. In an **elastic collision**, total kinetic energy is also conserved. In an **i… |
| q15 | biology | web | What is CRISPR-Cas9 used for? | 2 | CRISPR-Cas9 is used to **edit genes**—for example, to study what genes do, develop biotechnology and agricultural products, and investigate potential treatment… |
| q16 | biology | web | What is the endosymbiotic theory and who made it widely known? | 2 | The **endosymbiotic theory** says that mitochondria and chloroplasts descended from bacteria that once lived independently and came to live inside other cells.… |
| q17 | physics | web | What is the Higgs boson and where was it found? | 3 | The **Higgs boson** is an elementary particle associated with the Higgs field. Its discovery helped confirm the theory that interactions with this field give m… |
| q18 | biology | out_of_scope | What do my Notes say about meiosis and crossing over? | 0 | [tutor] Your Notes don’t cover meiosis or crossing over, and the Subject Library search didn’t find relevant material. In general, **meiosis** is the two-divis… |
| q19 | biology | out_of_scope | Explain how DNA replication works, from my Notes. | 0 | [tutor] Your Notes and the Subject Library search results didn’t cover DNA replication, so here’s a general overview. [tutor] **DNA replication** copies DNA be… |
| q20 | physics | out_of_scope | What do my Notes say about the French Revolution? | 0 | [tutor] I couldn’t find any passages about the French Revolution in your Notes. The Subject Library search didn’t turn up relevant material either. |
