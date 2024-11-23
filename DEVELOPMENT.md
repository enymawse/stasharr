# Development Guide

1. Allow Tampermonkey access to local file URIs [tampermonkey/faq](https://tampermonkey.net/faq.php?ext=dhdg#Q204)
1. Clone the repo
   - `git clone https://github.com/enymawse/stasharr.git`
1. Install dependencies with `npm i` or `npm ci`
   - `cd stasharr && npm i`
1. Start the webpack dev server
   - `npm run dev`
1. Navigate to [http://localhost:8080/stasharr.dev.proxy.user.js](http://localhost:8080/stasharr.dev.proxy.user.js)
1. Install the development script proxy with your favorite userscript manager.
1. Make your changes to the code, webpack will recompile the dev scripts in the /dist folder. This directory is served by the dev server. Since you've installed the proxy script above, you just need to tell your userscript manager to reload the required script.
