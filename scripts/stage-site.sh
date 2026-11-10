#!/bin/sh
# Copies exactly the files that get published into _site/.
# CI deploys this folder and the e2e tests run against it, so a missing file fails the tests.
set -eu
rm -rf _site
mkdir -p _site
cp index.html styles.css script.js favicon.svg .nojekyll _site/
cp -r fonts assets _site/
