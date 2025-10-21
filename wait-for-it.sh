#!/bin/sh
# wait-for-it.sh: wait for a host to be available before executing a command

set -e

HOST="$1"
shift
PORT="$1"
shift
CMD="$@"

# Simple netcat-like command to check for port availability
until nc -z "$HOST" "$PORT"; do
  >&2 echo "Database is unavailable - sleeping"
  sleep 1
done

>&2 echo "Database is up - executing command"
exec $CMD
