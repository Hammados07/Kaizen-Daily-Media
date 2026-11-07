#!/usr/bin/env bash
# Keeps a publisher awake for up to about five and a half hours, posting each queue item at its time.
# GitHub starts scheduled runs hours late, so before it stops it starts the next run itself,
# but only when this run has really used up its time. If the next item is far away from the start,
# it just stops and the half-hourly schedule picks it up. (Handing over at once made an endless chain of runs.)
# Usage: scripts/watch-queue.sh <queue dir> <done key> <label> <workflow file> -- <publish command...>
set -u
DIR=$1 KEY=$2 LABEL=$3 WF=$4; shift 5
END=$((SECONDS + 19500)); RC=0
save() {
  git add queue
  git diff --cached --quiet && return 0
  # A status file whose only change is the check time is not worth a commit.
  if git diff --cached --quiet -- . ":(exclude)$DIR/status.json" && node scripts/same-status.mjs "$DIR/status.json"; then
    git reset -q -- "$DIR/status.json"; git checkout -q -- "$DIR/status.json"; return 0
  fi
  git commit -q -m "$LABEL queue $(date -u +%FT%H:%MZ)"
  for i in 1 2 3; do git pull --rebase -q && git push -q && return 0; sleep 5; done
}
while :; do
  git pull --rebase -q || true
  "$@" || RC=$?
  save
  s=$(node scripts/next-due.mjs "$DIR" "$KEY")
  [ "$s" -lt 0 ] && break
  if [ $((SECONDS + s)) -gt $END ]; then
    # Hand over only if this run has used most of its time and the item fits in the next run.
    if [ $SECONDS -gt 18000 ] && [ "$s" -lt 19000 ]; then
      gh workflow run "$WF" -f mode=publish && echo "started the next $LABEL run"
    else
      echo "next $LABEL item in $s seconds; the schedule will pick it up"
    fi
    break
  fi
  echo "next $LABEL item in $s seconds"
  sleep $((s + 15))
done
exit $RC
