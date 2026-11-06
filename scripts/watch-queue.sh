#!/usr/bin/env bash
# Keeps a publisher awake for up to about five and a half hours, posting each queue item at its time.
# GitHub starts scheduled runs hours late, so before it stops it starts the next run itself.
# Usage: scripts/watch-queue.sh <queue dir> <done key> <label> <workflow file> -- <publish command...>
set -u
DIR=$1 KEY=$2 LABEL=$3 WF=$4; shift 5
END=$((SECONDS + 19500)); RC=0
save() {
  git add queue
  git diff --cached --quiet && return 0
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
    # Something is due after this run ends: hand over to a fresh run.
    gh workflow run "$WF" -f mode=publish && echo "started the next $LABEL run"
    break
  fi
  echo "next $LABEL item in $s seconds"
  sleep $((s + 15))
done
exit $RC
