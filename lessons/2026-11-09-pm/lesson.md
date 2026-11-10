# The running total that cannot go below zero

*Excel (Week B). Rung: working. About 12 minutes.*

### The hook

A running total of "arrivals minus capacity" says your team ended the week with 10 cases of spare capacity. The queue actually hit 40 open cases on Wednesday. Same numbers, two stories. The gap is one rule: a backlog cannot be negative.

### The idea

A plain cumulative sum adds every day's gap forever. That is right for money in a bank account that can overdraw. It is wrong for a queue. If you clear all your work on Monday, unused capacity does not carry over to Tuesday. You cannot work on cases that have not arrived yet. So the backlog is floored at zero every day.

The rule is one line: backlog today = MAX(0, backlog yesterday + arrivals today - capacity today).

The old way is a helper column with that formula filled down. It works, but it spreads logic over cells, breaks when someone inserts a row, and cannot live inside one formula.

SCAN fixes this. It walks an array and passes a carried value forward, like a loop with memory. Its shape is SCAN(start, array, LAMBDA(carried, current, new_carried)). It returns every step, not only the last one, which is what separates it from REDUCE. The pattern works for any state with a rule: backlog with a floor, stock with a maximum, a balance with a cap, days since last event with a reset.

Version note: SCAN and LAMBDA need Microsoft 365 (the current Excel for Windows, Mac and web). They are not in Excel 2021 or earlier. LET is in Excel 2021 and 365.

### Worked example (invented data)

Seven days of arrivals in A2:A8: 40, 60, 70, 30, 35, 50, 20. Capacity is 45 cases a day, in D1.

```
=SCAN(0, A2:A8 - $D$1, LAMBDA(acc, x, MAX(0, acc + x)))
```

Result, spilled down seven cells: 0, 15, 40, 25, 15, 20, 0.

The naive version, `=SCAN(0, A2:A8 - $D$1, LAMBDA(acc, x, acc + x))`, gives -5, 10, 35, 20, 10, 15, -10. The last number, -10, reads as "10 spare". The true picture peaked at 40 open cases on day 3 and ended at 0. I recomputed both columns in Python and they match.

To report the peak in one cell: `=MAX(SCAN(0, A2:A8 - $D$1, LAMBDA(acc, x, MAX(0, acc + x))))` returns 40.

### Try it now (5 minutes)

On your laptop, open Excel 365 or Excel for the web. Type seven daily arrivals of your own in A2:A8 and a capacity in D1. Paste the SCAN formula with the floor. Then change one day to 0 arrivals and watch the backlog fall but never below zero.

**Check:** with arrivals 10, 10, 90, 0, 0 and capacity 30, the result is 0, 0, 60, 30, 0.

### The memory trick

Picture a bathtub with a drain, not a bank account. Water arrives, the drain removes up to 45 a day, and the tub cannot hold negative water. SCAN is a person walking along the days with a bucket, telling you the water level at each stop. MAX(0, ...) is the tub floor.

### Use it this week

Take any queue you already track, such as a ticket count or a pending-approval list, and compare its true backlog with the cumulative gap. If they differ, your old chart was hiding the peak.

### Three quick questions

1. What does SCAN return that REDUCE does not?
2. Which one function stops the running value going below zero?
3. Which Excel versions can run SCAN?

**Answers.** 1. Every intermediate step, not only the final value. 2. MAX(0, ...) inside the LAMBDA. 3. Microsoft 365 only.

### From an earlier lesson (6 Nov)

A spam filter catches 95% of spam and wrongly flags 2% of good mail. If 1 mail in 100 is spam, is a flagged mail more likely spam or good?

**Answer.** Out of 10,000 mails, 95 spam are caught and 198 good ones are flagged, so a flagged mail is more likely good (about 32% spam).

### Go deeper

Microsoft's documentation pages for the SCAN and LAMBDA functions on support.microsoft.com describe the syntax. No matching Rimi Lab lesson exists yet. This lesson's numbers were checked by running the same logic in Python, not in Excel itself.
