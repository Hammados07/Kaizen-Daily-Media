# One letter changes 125 of 256 bits

2026-11-05, evening. Theme: AI and tech.

**Hook.** Change "hello" to "Hello" and a computer's fingerprint of the word changes in 125 places out of 256. Nothing about the two words looks different to a machine, yet the fingerprints share almost nothing.

### The idea

A hash function turns any file or text into a short fixed-size fingerprint. SHA-256 always gives 256 bits, shown as 64 hex characters. A tiny file and a huge model file both get the same length of fingerprint.

Three properties make it useful. The same input always gives the same fingerprint. You cannot rebuild the input from the fingerprint. And a tiny change in the input scrambles the whole output, which is called the avalanche effect. On average about half the bits flip, so about 128 of 256. That is why 125 is no accident.

Why it matters for you: when you download a dataset, a model file or an installer, the page often lists its SHA-256. You hash your copy and compare. If one byte was damaged in transit, or someone swapped the file, the fingerprints will not match. You never have to compare the files themselves.

A fingerprint proves the file matches the one the publisher hashed. It does not prove the publisher is honest. It catches damage and swaps along the way.

### A worked example

Run this in Python (3.11 or newer for the last part):

```python
import hashlib
def bits(a, b):
    x = int(hashlib.sha256(a).hexdigest(), 16) ^ int(hashlib.sha256(b).hexdigest(), 16)
    return bin(x).count("1")
print(hashlib.sha256(b"hello").hexdigest())
print(hashlib.sha256(b"Hello").hexdigest())
print(bits(b"hello", b"Hello"), "of 256 bits differ")
```

Result (I ran it):

```
2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
185f8db32271fe25f561a6fc938b2e264306ec304eda518007d1764826381969
125 of 256 bits differ
```

The XOR line marks every bit where the two fingerprints disagree, and the count adds them up.

### Try it now (5 minutes)

1. Make a text file called note.txt containing exactly the five letters hello, with no Enter at the end. In Notepad, save it as is. In a terminal: printf 'hello' > note.txt (Mac or Linux).
2. Hash it, whichever way your laptop has: Windows PowerShell: Get-FileHash note.txt -Algorithm SHA256. Mac: shasum -a 256 note.txt. Python: open the file in "rb" mode and call hashlib.file\_digest(f, "sha256").hexdigest().
3. Open the file, press Enter at the end, save, and hash again.

Check: the first hash starts 2cf24dba and ends 9824. After the extra Enter it changes completely. On Linux and Mac the new one starts 5891b5b5. Windows saves an Enter as two bytes, so it will differ from that, which is the same lesson again: bytes matter, not looks. PowerShell prints the hash in capitals; compare ignoring case.

### The memory trick

Picture a wax seal on a letter. You cannot see inside, but a broken seal tells you someone touched it. A hash is a seal made of 64 characters, and "avalanche" means even a breath on the wax shatters the whole seal.

### Use it this week

Next time you download a dataset, a Python installer or a model file that lists a SHA-256 on its page, hash your copy and compare the first and last 8 characters. It takes 20 seconds.

### Three quick questions

1. How many bits is a SHA-256 fingerprint, and how many hex characters?
2. You add one space to a 2 GB file. Roughly how many of the 256 bits change?
3. A hash matches the publisher's. What have you proven, and what have you not?

Answers: (1) 256 bits, 64 hex characters. (2) About half, around 128 (our test gave 125 for a one-letter change). (3) Your copy is identical to what they hashed, so it was not damaged or swapped on the way. You have not proven the publisher itself is trustworthy.

### From an earlier lesson

This morning's lesson: how long is the typical gap between turns in a conversation? Answer: about 200 milliseconds. We plan our reply while the other person is still talking.

### Go deeper

- [Python documentation, hashlib, File hashing section](https://docs.python.org/3/library/hashlib.html) (I opened it)
- No matching Rimi Lab lesson found yet.
