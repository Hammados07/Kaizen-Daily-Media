# The R vector that quietly repeats itself

*Evening, R, rung 1 of the ladder (new). 15 minutes.*

**Hook.** In R, `c(6,7,8,9,10,11) + c(100,200)` does not fail. It gives six answers, and nobody tells you that your short list was copied three times behind your back.

### The idea

R has no single numbers. A "number" is a vector of length one. Every operator works on whole vectors at once, element by element. That is why R code has so few loops.

When two vectors have different lengths, R does not stop. It reuses the shorter one from its start until it matches the longer one. This is called the recycling rule. If the long length is an exact multiple of the short length, R is silent. If not, R still finishes the job but prints a warning. The R manual page for arithmetic says the shorter elements are "recycled as necessary", with a warning only when recycled fractionally.

Why does this matter? Recycling is the reason `x * 2` and `x > 5` work: the lone 2 or 5 is a length-one vector stretched to fit. That is useful. But it is also a trap. If you multiply three prices by two tax rates, R pairs them 1st-1st, 2nd-2nd, 3rd-1st. You get a plausible, wrong column. The warning scrolls past in a script and is easy to miss. The safe habit is simple. Use recycling on purpose with length one. For anything longer, make the lengths match by looking the value up by name.

A second quiet rule lives next to it: `NA` means "unknown", and unknown spreads. `4 > 5` is FALSE, but `NA > 5` is `NA`, so a sum over it is `NA`.

### Worked example (invented data, run in R 4.3.3)

```r
hours <- c(6, 7, 8, 9, 10, 11)
hours + c(100, 200)
# [1] 106 207 108 209 110 211     (silent: 6 is a multiple of 2)

price <- c(50, 80, 120)
tax   <- c(0.1, 0.2)
price * tax
# [1]  5 16 12
# Warning: longer object length is not a multiple of shorter object length
```

The third price, 120, was taxed at 0.1, giving 12. That is wrong. Fix it with a named lookup:

```r
orders <- data.frame(item = c("pen","pad","ink"), price = c(50,80,120))
rates  <- c(pen = 0.1, pad = 0.2, ink = 0.2)
orders$tax <- orders$price * rates[orders$item]
orders
#   item price tax
# 1  pen    50   5
# 2  pad    80  16
# 3  ink   120  24
```

And the NA rule:

```r
x <- c(4, 8, NA, 10)
x > 5                     # FALSE  TRUE    NA  TRUE
sum(x > 5)                # NA
sum(x > 5, na.rm = TRUE)  # 2
mean(x, na.rm = TRUE)     # 7.333333
```

### Try it now (5 minutes)

Open R or RStudio (or any online R console). Predict first, then run: 1) `1:6 + c(10, 20)` 2) `1:5 + c(10, 20)` 3) `mean(c(TRUE, FALSE, TRUE, TRUE))`

**Check:** 1) `11 22 13 24 15 26`, silent. 2) `11 22 13 24 15`, with a warning, since 5 is not a multiple of 2. 3) `0.75`. TRUE counts as 1, so the mean of a true/false vector is the share of TRUE.

### The memory trick

Picture a short train of coloured carriages on a loop track. R keeps sending the short train round the loop until the long train has finished. If the long train is not a whole number of loops, the last loop is cut short, and the signal flashes a warning. **"Short train, long track, loop it back."**

### Use it this week

Next time a script prints "longer object length is not a multiple of shorter object length", stop and read it as "I paired the wrong rows". Check which two vectors differ in length with `length()`.

### Three quick questions

1. What does `c(1,2,3,4) * c(10,100)` return?
2. What does `sum(c(1, NA, 3) > 2)` return?
3. How do you turn a TRUE/FALSE vector into the share of TRUE?

**Answers.** 1) `10 200 30 400`, silent. 2) `NA`; add `na.rm = TRUE` to get 1. 3) Take its `mean()`.

### From an earlier lesson

(7 Nov, "The rice that survives the pot") What is a spore?

**Answer.** A tough, dormant shell that survives cooking and wakes when conditions are warm and wet.

### Go deeper

Run `?Arithmetic` in R and read the paragraph on recycling (I opened this text tonight in R 4.3.3). No matching Rimi Lab lesson exists yet for R. I could not open the online R manual tonight, so I cite only the built-in help.
