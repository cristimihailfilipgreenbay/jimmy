# Evaluation report

Run on 2026-11-17 11:33 UTC. Command: `docker compose exec backend python -m eval.run`.

Models: Tutor `openai/gpt-6-luna`, judge and writer `openai/gpt-6-luna`, embeddings `openai/text-embedding-3-small`.

## Scores

| Metric | Score | Items scored | What it measures |
|---|---|---|---|
| Faithfulness | **94%** | 17 of 17 | claims in the answer that its retrieved passages support |
| Context precision | **78%** | 17 of 17 | retrieved passages that are useful, ranked first |
| Context recall | **94%** | 17 of 17 | reference-answer facts found in the retrieved passages |
| Citation check passed first time | **100%** | 20 of 20 | answers the Tutor wrote with every paragraph cited or labelled |
| Citation correctness | **74%** | 19 of 19 | cited paragraphs a judge found supported by their passages |
| Out-of-scope answered without Citations | **100%** | 3 of 3 | no Citation pointing at an unrelated passage |
| Answer-key correctness | **100%** | 18 of 18 | quiz answer keys a judge found matching their source passage |
| Conflict detection (planted errors found) | **100%** | 8 of 8 | wrong statements in Notes flagged as a Conflict |
| Conflict false alarms (lower is better) | **0%** | 4 of 4 | agreeing or unrelated pairs wrongly flagged |

Ragas scores are averages over the answerable questions (Notes, Library, web) that found at least one passage. Higher is better except where noted.

## Golden set

| Id | Space | Kind | Question | Citations | Answer |
|---|---|---|---|---|---|
| q01 | biology | notes | Where does glycolysis happen, and what is its net gain? | 1 | Glycolysis happens in the **cytoplasm**. Its net gain per glucose molecule is **2 ATP and 2 NADH**. [1] |
| q02 | biology | notes | What is the final electron acceptor in the electron transport chain, and what d… | 1 | Oxygen is the final electron acceptor in the electron transport chain. It combines with electrons and protons to form water. [1] |
| q03 | biology | notes | Where does the Calvin cycle take place and what does Rubisco do in it? | 1 | The Calvin cycle takes place in the **stroma of the chloroplast**. Rubisco fixes carbon dioxide by attaching it to RuBP, starting the process that produces G3P… |
| q04 | biology | notes | How many sodium and potassium ions does the sodium-potassium pump move for each… | 1 | It moves **3 sodium ions out** and **2 potassium ions in** for each ATP used. [1] |
| q05 | biology | notes | What happens to a cell placed in a hypertonic solution? | 1 | Water moves out of the cell by osmosis, so the cell loses water and shrinks. [1] |
| q06 | biology | notes | What do yeast and animal cells make when they ferment? | 1 | Yeast makes **ethanol and carbon dioxide**; animal cells make **lactic acid** when they ferment. [1] |
| q07 | biology | notes | Which factors limit the rate of photosynthesis? | 1 | The main factors that limit the rate of photosynthesis are **light intensity, carbon dioxide concentration, and temperature**. If one is in short supply, it ca… |
| q08 | biology | library | What role does cholesterol play in the plasma membrane? | 1 | Cholesterol sits between phospholipids and helps **stabilize membrane fluidity**: it limits excessive fluidity at high temperatures and helps prevent the membr… |
| q09 | biology | library | What is chemiosmosis? | 2 | Chemiosmosis is the use of energy stored in a **proton (H⁺) gradient** across a membrane. As protons flow back down that gradient through ATP synthase, the enz… |
| q10 | biology | library | What are the reaction-centre pigments of photosystem I and photosystem II? | 2 | Photosystem I’s reaction-centre pigment is **P700**; photosystem II’s is **P680**. Both are special pairs of chlorophyll *a* molecules. [5][6] |
| q11 | physics | library | State Newton's second law of motion. | 1 | Newton’s second law states that an object’s acceleration is directly proportional to the net external force, in the same direction, and inversely proportional … |
| q12 | physics | library | What does the work-energy theorem say? | 2 | The **work–energy theorem** says that the net work done on an object equals the change in its kinetic energy: \[ W_{\text{net}}=\Delta K=K_f-K_i. \] For an obj… |
| q13 | physics | library | When is linear momentum conserved? | 2 | Linear momentum is conserved for a system when the **net external force on the system is zero**. Internal forces—such as forces between objects in a collision—… |
| q14 | physics | library | What is the difference between an elastic and an inelastic collision? | 3 | Both elastic and inelastic collisions conserve **total momentum** when no net external force acts on the system. In an **elastic** collision, total kinetic ene… |
| q15 | biology | web | What is CRISPR-Cas9 used for? | 2 | CRISPR-Cas9 is used to **edit DNA at targeted locations** in living cells. Researchers use it to study gene function and develop biotechnology and potential me… |
| q16 | biology | web | What is the endosymbiotic theory and who made it widely known? | 3 | The **endosymbiotic theory** says that mitochondria and chloroplasts began as free-living bacteria that were taken into ancestral cells and eventually became p… |
| q17 | physics | web | What is the Higgs boson and where was it found? | 3 | The **Higgs boson** is an elementary particle associated with the Higgs field. Studying it helps explain how some fundamental particles acquire mass. [7][2] It… |
| q18 | biology | out_of_scope | What do my Notes say about meiosis and crossing over? | 0 | [tutor] Your Notes don’t appear to cover meiosis or crossing over. The Subject Library search didn’t find relevant material either. [tutor] In general, crossin… |
| q19 | biology | out_of_scope | Explain how DNA replication works, from my Notes. | 0 | [tutor] Your Notes and the Subject Library did not cover DNA replication, so here’s a general overview. Replication copies DNA before a cell divides. The two s… |
| q20 | physics | out_of_scope | What do my Notes say about the French Revolution? | 0 | [tutor] I couldn’t find anything about the French Revolution in your Notes. The Subject Library results were about physics, so they didn’t cover it either. |
