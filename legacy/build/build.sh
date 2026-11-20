#!/bin/sh
set -e
cd "$(dirname "$0")/.."
cat build/head.html build/data-core.js build/data-web1.js build/data-web2.js \
    build/data-pwn.js build/data-extra.js build/app.js build/tail.html > index.html
echo "Built index.html ($(wc -c < index.html) bytes)"
