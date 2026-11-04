#!/bin/sh
DIRNAME="$(cd "$(dirname "$0")" && pwd)"
export JAVA_HOME="${JAVA_HOME:-$(command -v java)}"
exec gradle "$@"
