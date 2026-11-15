# Why a near-perfect model fails the test

**Title (under 70 characters):** Why a near-perfect model fails the test | Overfitting explained

**Description:**

A computer model studies twenty-four dots and learns them so well that its miss is the smallest on the chart. Then it meets sixty dots it has never seen, and its miss is almost ninety times bigger. Nothing is broken. In five minutes you will see what went wrong, and why a perfect score on studied data proves nothing.

Try the free overfitting lab and bend a curve yourself:
https://models.rimilab.com/#/models/overfitting

Chapters
0:00 The puzzle
0:24 A spelling test
0:42 Dots on a wave
1:22 The test
2:08 Why it happens
3:15 Two fixes
3:49 The real lesson
4:07 Try it yourself
4:32 Remember

The numbers come from the Rimi Lab overfitting lab at its starting values: 24 studied dots and 60 hidden dots around a gentle wave, messiness 0.4. The miss is the average squared distance from the curve. Bendiness 1: studied 0.434, hidden 0.528. Bendiness 5: studied 0.126, hidden 0.254 (the lowest). Bendiness 14: studied 0.069 (the lowest), hidden 6.059. The true wave itself misses the studied dots by 0.248. Over ten presses of New dots, the best bendiness was between 4 and 8 every time. At bendiness 14, 80 studied dots bring the hidden miss down to 0.19, and a stiffener of 0.02 brings it to 0.26.

Sources
- Rimi Lab Models lesson "Overfitting and underfitting" and its lab model (polynomial least squares with an optional ridge penalty, scored on held-out dots). https://models.rimilab.com/#/models/overfitting
- The stiffener is ridge regression: A. E. Hoerl and R. W. Kennard, "Ridge Regression: Biased Estimation for Nonorthogonal Problems", Technometrics 12(1), 55-67, 1970. https://www.stat.cmu.edu/technometrics/70-79/VOL-12-01/v1201055.pdf

All Rimi Lab labs, free, no sign-up: https://rimilab.com
Music: the Rimi Lab tune, original. Voice: generated with Kokoro (open-source text to speech).

**Tags:** overfitting, underfitting, machine learning, bias variance tradeoff, test set, polynomial regression, ridge regression, regularization, data science, rimi lab

**Category:** Education
**Made for kids:** No
**Altered or synthetic content:** No (the voice is synthetic, but it does not depict a real person or event; YouTube's label is for realistic content)
**Thumbnail:** thumb.jpg
