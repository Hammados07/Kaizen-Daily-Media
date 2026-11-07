# The Morse code drawn in sand that scans your milk

2026-11-06, morning. Theme: The story of an idea.

Listen: https://raw.githubusercontent.com/Hammados07/Kaizen-Daily-Media/main/lessons/2026-11-06-am/lesson.mp3

**Hook.** On the morning of 26 June 1974, in a supermarket in Troy, Ohio, a cashier passed a ten-pack of Wrigley's Juicy Fruit gum over a laser. It beeped. That was the first time a product was ever scanned at a checkout. The idea behind it had started about 25 years earlier, as a doodle in the sand.

### The idea

In the late 1940s a grocery chain asked Drexel Institute in Philadelphia whether a machine could read product information at the checkout. The dean turned it down. A graduate student, Bernard Silver, overheard and told his friend Norman Joseph Woodland. They kept thinking about it. Woodland knew Morse code from his Boy Scout days. Morse is a language of short dots and long dashes. His thought was simple: pull the dots and dashes downward, so they become thin lines and thick lines. A machine that can tell thin from thick can read a code. The story goes that he drew it with his fingers in the sand on a Miami beach. Sources differ on the exact year, 1948 or 1949, so treat it as the late 1940s.

They patented a round version in 1952. It looked like a bullseye, because a round code can be read from any angle. But the world was not ready. Reading a code needs a strong, narrow light and a fast way to understand it. Lasers arrived in 1960, and cheap computers in the 1970s. The patent waited for the technology to catch up.

In 1970 the grocery industry formed a committee to pick one standard. IBM engineer George Laurer designed the winner: a rectangle of bars with 12 digits underneath, the Universal Product Code. Marsh Supermarkets bought ten laser scanners, at about 4,000 dollars each, and on that June morning the first pack of gum went through. Change was still slow. By the end of the 1970s only about 1 percent of US grocery stores had scanners. About ten years later, more than half did.

Each digit is drawn in seven thin slices, some dark and some light. The scanner measures how long it sees dark and light, and that pattern is the digit. Because it only compares widths, it does not matter how fast you swipe. The twelfth digit is a lie detector: a check digit, worked out from the other eleven. If one digit is misread, the check fails and the scanner stays silent instead of charging you for the wrong thing.

### A worked example

Take the first eleven digits 0 3 6 0 0 0 2 9 1 4 5.

1. Add the digits in positions 1, 3, 5, 7, 9 and 11: 0 + 6 + 0 + 2 + 1 + 5 = 14.
2. Multiply by 3: 42.
3. Add the digits in positions 2, 4, 6, 8 and 10: 3 + 0 + 0 + 9 + 4 = 16.
4. Total: 42 + 16 = 58.
5. The check digit brings 58 up to the next multiple of 10. That is 2.

The full code is 036000291452. Swap two neighbouring digits, so it reads 03600029415 and not 03600029145, and the check digit becomes 6. The printed one is 2, so the scanner refuses it. (I ran this in Python to confirm.)

### Try it now (no screen)

On the way to work, look for a barcode on a packet, bottle or parcel. Do not read it. Ask yourself: thin lines and thick lines, which would carry more information? At home, pick any packet and test its check digit with the five steps. Check: you should land on the twelfth digit printed under the bars.

### The memory trick

Think "Morse code, pulled down". Dots become thin bars, dashes become thick bars. Picture the check digit as a security guard at the door who counts everyone who came in and says, "the numbers must add up to a round ten".

### Use it this week

At a shop with your family, show a child the little number under a barcode and ask what it is for. In your analyst work, notice where a check digit idea could catch errors in a column: an ID, an invoice number, a phone number.

### Three quick questions

1. What did Norman Joseph Woodland borrow from Morse code?
2. Why did the idea wait about 25 years to become real?
3. What is the twelfth digit of a UPC for?

Answers: (1) The idea of short and long marks, stretched into thin and thick lines. (2) It needed lasers and cheap computers, which came in the 1960s and 1970s. (3) It is a check digit, calculated from the other eleven, so a misread digit is caught.

### From an earlier lesson

Yesterday: how long is the typical gap between turns in a conversation? Answer: about 200 milliseconds. We plan our reply while the other person is still talking.

### Go deeper

- Rimi Lab: [Logistics information systems: barcode, RFID and knowing what you hold](https://mba.rimilab.com/#/supply/lis-tracking)
- [Smithsonian Magazine: The Supermarket Scanner Changed the Way We Buy Groceries Forever](https://www.smithsonianmag.com/smithsonian-institution/supermarket-scanner-changed-way-we-buy-groceries-forever-180984293/)
- [History.com: First barcode scanned](https://www.history.com/this-day-in-history/barcode-scanner-invention-first-use)
