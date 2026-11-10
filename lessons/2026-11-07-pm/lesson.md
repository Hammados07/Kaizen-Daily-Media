# The 15-minute backup test you have never run

**Hook.** Most people have a backup. Very few have ever opened one. A backup you have never restored is a hope, not a copy. Tonight you turn the hope into a fact, in 15 minutes.

### The idea

A simple rule for safe data is called 3-2-1. Keep three copies of what matters: the original plus two backups. Keep them on two different kinds of storage, for example your laptop disk and a cloud drive. Keep one copy somewhere else, away from the first two, so one fire, theft or spilled tea cannot take everything. The rule is widely taught, and one explainer says CISA recommends it (see Go deeper).

The rule has a quiet hole. It counts copies. It does not check that the copies work. A sync folder can copy a deleted or damaged file faithfully. A backup job can fail for months with no message. An external disk can be empty because the cable was loose.

So the real hack is one extra step: a restore test. Pick a few files, bring them back from the backup, and check that they open and match the originals. A computer can do the matching for you with a fingerprint (a hash). Two files with the same SHA-256 fingerprint are, for any practical purpose, identical. You met this idea in the SHA-256 lesson on 5 Nov.

### A worked example (invented files)

I made a folder `orig` with three small files and a folder `bak` that should be a copy. Then I broke the copy on purpose: one file deleted, one changed. This script compares the two by fingerprint:

```python
import hashlib, pathlib, sys

def fingerprint(folder):
    out = {}
    for p in pathlib.Path(folder).rglob("*"):
        if p.is_file():
            out[str(p.relative_to(folder))] = hashlib.sha256(p.read_bytes()).hexdigest()
    return out

a, b = fingerprint(sys.argv[1]), fingerprint(sys.argv[2])
print("missing from backup:", sorted(set(a) - set(b)))
print("different in backup:", sorted(k for k in a if k in b and a[k] != b[k]))
print("files checked:", len(a))
```

Run as `python3 check.py orig bak`. I ran it here. The output:

```
missing from backup: ['p3.txt']
different in backup: ['p2.txt']
files checked: 3
```

It found both faults. File size and date would have hidden the changed file. The fingerprint does not.

### Try it now (10 minutes)

1. Write down your three copies of your most important folder (for example family photos or documents). Mark each: which device or service, and is it in a different place from the others?
2. Pick 5 files from your cloud backup (Google Drive, Google Photos, iCloud, anything you use). Download or open each one. Do they open and look right?
3. Optional, with a laptop: put the script in a file called `check.py`, point it at the original folder and a restored copy, and read the result.

Check: you pass if you can name 3 copies, 2 kinds of storage and 1 location that is away from the rest, and all 5 test files open. If one fails, you found the problem on a calm Saturday and not on a bad day. That is a win.

### The memory trick

"3-2-1, and one for the test run." Think of a parachute: you do not trust it because you own it, you trust it because someone packed it and jumped. A backup you have not restored is a parachute still in the bag. Or count it on one hand: 3 copies, 2 kinds, 1 away, then a thumbs up for the test.

### Use it this week

Put a 10-minute slot in your calendar on the first Saturday of each month called "restore 5 files". Do the same for the phone photos of your family, since those cannot be made again.

### Three quick questions

1. What do the numbers 3, 2 and 1 stand for in the 3-2-1 rule?
2. Why can file size and date fail to show that a backup is wrong?
3. What does a SHA-256 fingerprint let you check without opening the files?

Answers: (1) Three copies, two kinds of storage, one copy kept in a different place. (2) A changed or damaged file can keep the same size and a believable date. (3) Whether two files are identical: the same fingerprint means the same content.

### From an earlier lesson

Recall (from 5 Nov): How many bits is a SHA-256 fingerprint, and how many hex characters? Answer: 256 bits, 64 hex characters.

### Go deeper

- Explainer of the 3-2-1 rule, including the point that untested backups give a false sense of security: https://www.ninjaone.com/blog/the-3-2-1-backup-rule-explained/
- Rimi Lab: I searched the lab repos and found no backup lesson, so this one has no matching lab. The nearest idea is the fingerprint lesson from 5 Nov.
