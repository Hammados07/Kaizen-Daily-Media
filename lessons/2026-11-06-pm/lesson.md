# A 99% alarm that is right 17% of the time

2026-11-06, evening. Theme: Numbers that lie.

**Hook.** A fraud alarm catches 99 out of every 100 fraudulent payments. It rings. How likely is it that this payment is really fraud? Most people say about 99%. With the numbers below, the true answer is 17%. The alarm is good. The trap is somewhere else.

### The idea

The trap is called the base rate fallacy. We hear "the alarm catches 99% of fraud" and forget to ask the first question: how much fraud is there to catch?

Fraud is rare. Say 1 payment in 100 is fraud. The alarm has two ways to ring. It can ring for real fraud, and it can ring by mistake for an honest payment. Honest payments are 99 in every 100, so even a small mistake rate, applied to a huge pile, makes a big number of false alarms. The rare thing is outnumbered by the mistakes made on the common thing.

The cure is to stop using percentages and count payments instead. Gerd Gigerenzer and Ulrich Hoffrage showed in 1995 that people reason far better about "out of 10,000" counts than about probabilities. So rebuild the problem as a crowd of 10,000 and count.

### A worked example (invented numbers)

A bank has 10,000 payments. 1% are fraud. The alarm rings for 99% of fraud and also for 5% of honest payments.

1. Fraud: 10,000 x 1% = 100 payments. The alarm rings for 99 of them.
2. Honest: 9,900 payments. The alarm rings for 5% of them, which is 495.
3. Total alarms: 99 + 495 = 594.
4. Alarms that are real fraud: 99 out of 594 = 16.7%.

The same count in Python:

```python
N = 10_000          # payments
base = 0.01         # 1% are fraud
hit = 0.99          # alarm rings for 99% of fraud
false = 0.05        # alarm rings for 5% of honest ones

fraud = N * base
honest = N - fraud
true_alarms = fraud * hit
false_alarms = honest * false
print(true_alarms, false_alarms)
print(round(true_alarms / (true_alarms + false_alarms), 3))
```

Output: `99.0 495.0` then `0.167`.

Change only the base rate and the answer moves:

| Fraud rate | Real alarms | False alarms | Chance an alarm is real |
| --- | --- | --- | --- |
| 0.1% | 10 | 500 | 1.9% |
| 1% | 99 | 495 | 16.7% |
| 10% | 990 | 450 | 68.8% |

### Try it now (5 minutes)

Open the script above. Change `false` from 0.05 to 0.01 and keep everything else. Predict the answer first, then run it.

Check: honest alarms become 9,900 x 1% = 99, so 99 real alarms against 99 false ones. The answer is 0.5, which is 50%. A five-times better alarm only gets you to a coin flip, because the base rate is still 1%.

### The memory trick

"Count the crowd, not the test." Picture a stadium of 10,000 people. Ask how many are really in the group (100), then how many wrongly get flagged (495). The flagged crowd is mostly the wrong people. Another handle: a metal detector at a school gate rings far more often for keys than for knives, because keys are everywhere.

### Use it this week

Next time a dashboard flags something (an anomaly alert, a low-adherence flag, a "high risk" tag), ask one question: how many of these flags would be false if the real thing is rare? Write the base rate next to the alert in your notes. If you do not know the base rate, that is the finding.

### Three quick questions

1. A spam filter catches 95% of spam and wrongly flags 2% of good mail. If 1 mail in 100 is spam, is a flagged mail more likely spam or good?
2. What two numbers do you need besides "the alarm is 99% accurate"?
3. If the fraud rate rises from 1% to 10% and the alarm stays the same, does a ringing alarm become more or less trustworthy?

Answers: (1) Among 10,000 mails, 95 spam are caught and 198 good ones are flagged, so a flagged mail is more likely good (about 32% spam). (2) The base rate and the false alarm rate. (3) More trustworthy: from 16.7% to 68.8%.

### From an earlier lesson

Recall: How long is the typical gap between turns in a conversation? Answer: About 200 milliseconds. We plan our reply while the other person is still talking.

### Go deeper

- Rimi Lab, MBA site, lesson xl-rollups: a close cousin about rates that mislead when you ignore volume. https://mba.rimilab.com/#/excel/xl-rollups
- Gigerenzer and Hoffrage, "How to improve Bayesian reasoning without instruction: Frequency formats", Psychological Review, 1995: https://pages.ucsd.edu/\~scoulson/203/GG\_How\_1995.pdf
