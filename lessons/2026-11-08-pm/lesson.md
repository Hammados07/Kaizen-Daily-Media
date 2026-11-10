# The 66-day habit that is really a 94-study sentence

**Hook.** Everyone quotes "21 days to build a habit". The real study found a typical figure of 66 days, and a spread from 18 to 254. The better news sits in a different paper: one sentence you write tonight raised goal success across 94 studies.

### The idea

Two pieces of research fit together.

First, how long habits take. Phillippa Lally and colleagues (2009) asked 96 students to pick one small daily behaviour, such as a glass of water at lunch, and rate each day how automatic it felt. 82 finished, over 84 days. Average time to reach the top of the curve: 66 days. Individuals ranged from 18 days to a predicted 254. Missing one day made little lasting difference. Missing many days, even scattered, lowered the ceiling. So the lesson is not "be perfect". It is "come back soon".

Second, how to start. Peter Gollwitzer and Paschal Sheeran (2006) pooled 94 studies with more than 8,000 people. Writing an if-then plan ("If it is 21:10 and the phone is on the charger, then I open the notebook") beat simply holding the goal, with an average effect of d = 0.65, which is medium to large. Why it works: the cue does the remembering for you. You stop deciding in the moment, when you are tired.

A good plan has three parts. A cue that already happens daily. One action, tiny enough to do on your worst day. A rule for the miss: "if I skip, I do it the next evening, not twice".

### A worked example (invented numbers)

Lally's curve rises fast, then flattens. A simple model: automaticity = 100 x (1 - e^(-k x day)). Pick k so it reaches 95% on day 66.

```python
import math
k = math.log(20) / 66          # 95% of the ceiling at day 66
for d in (7, 21, 42, 66):
    print(d, round(100 * (1 - math.exp(-k * d))))
for days in (18, 66, 254):
    print(days, round(math.log(20) / days, 3))
```

Output (I ran it):

```
7 27
21 61
42 85
66 95
18 0.166
66 0.045
254 0.012
```

By day 21 you are about 61% of the way. That is why day 21 feels like success and then stalls. The fast person (k = 0.166) gets there in 18 days; the slow one (k = 0.012) needs 254. Same shape, different speed. This is an illustration of the shape, not Lally's fitted values.

### Try it now (5 minutes)

Write one plan for Monday in this exact shape, in your notes app:

"If [a cue that already happens], then I will [one action under 10 minutes]. If I miss, I will [return rule]."

Then run this to check each part is present:

```python
plan = "If I put my phone on the charger at 21:10, then I will open the SQL notebook and run one query. If I miss, I will do it the next evening."
print(all(w in plan for w in ("If", "then", "miss")))
```

Check: it prints True. The real test is the cue. Ask: does it happen every day without effort? Charger, kettle and brushing teeth do. "When I feel free" does not.

### The memory trick

"Cue, tiny, comeback." A trail of three stones: the cue is the first stone you always step on, the tiny action is the second, and the comeback is the third stone that is always there after a slip. Also: 66 is the average, not the deadline.

### Use it this week

Put your Monday plan where the cue happens: a sticky note on the charger or a calendar entry at 21:10. After Monday, do not count streaks. Count how many of the seven evenings you did the tiny action.

### Three quick questions

1. What was the average time to peak automaticity in Lally's study, and what was the range?
2. What are the three parts of a good if-then plan?
3. Does missing one day wreck a habit, according to the study?

Answers: (1) 66 days on average, 18 to a predicted 254. (2) A daily cue, one tiny action, a return rule for a miss. (3) No. One missed day had little lasting effect; many missed days lowered the ceiling.

### From an earlier lesson

Recall (5 Nov): How many bits is a SHA-256 fingerprint, and how many hex characters? Answer: 256 bits, 64 hex characters.

### Go deeper

- [BPS Research Digest, How long does it take to form a habit](https://bps.org.uk/research-digest/how-form-habit) (I opened it)
- [Frontiers in Human Neuroscience review citing the Gollwitzer and Sheeran meta-analysis](https://www.frontiersin.org/articles/10.3389/fnhum.2015.00395/full) (I opened it)
- No matching Rimi Lab lesson found.
