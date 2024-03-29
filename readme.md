# Covid-19 Stats Bot

This is a demo project that will automatically post Covid-19 stats to mastadon (toot).

[Website](https://covid.yanoagenda.com) | [Tweets @corona19_stats](https://twitter.com/corona19_stats) | [toots @covid_stats@mastodon.cloud](https://mastodon.cloud/@covid_stats)

[GitLab](https://gitlab.com/alternating-bits-open-source/covid19_stats) | [GitHub](https://github.com/comster/covid19_stats)

## 1) Automated toots

Using the code example from my [quick_toot](https://github.com/comster/quick_toot) project, we will setup automated tooting of text and an image.

- Create app
- Get token
- Test toot 
- https://mastodon.cloud/web/accounts/731776

## 2) Create our node.js project

- Create index.js
- Create package.json


## 3) Fetch Covid stats

From [this API](https://disease.sh/), we will grab the latest coronoa stats.

- Global: https://disease.sh/v2/all
- United States: https://disease.sh/v2/countries/us
- Format data into text to toot


## 4) Render a Pie Chart

Using the stats fetched, let's create a pie chart using D3, rendered using canvas

- https://observablehq.com/@d3/pie-chart
- https://github.com/d3-node/d3-node/blob/1864fef68877168a400f99115a8086e8601121a4/examples/pie-canvas.js


## 5) Schedule to run every day with GitLab

Using gitlab CI/CD, let's schedule this to run every day for our [project](https://gitlab.com/alternating-bits-open-source/covid19_stats)

- Create .gitignore
- Create Dockerfile
- Create .gitlab-ci.yml
- Git Push
- Setup schedule


## 6) Line chart showing 7 day moving average of both deaths and cases

- Parse historical data into 7 day moving average
- Render into multi-line chart for both deaths and cases
- Include dependancies for headless chrome in docker


## 7) Line chart

- 7-day rolling average
- Deaths
- Cases
- 2 y axis labels
- Color coated


## 8) Deployment docker deps

- Chrome headless docker deps
- GitLab CICD


## 9) Region / Locations

- Countries
- US State
- 

## 10) Subscriptable

- On each run, via Mastodon
 + Look through latest notifications to me (limit 50)
  - If notification msg is @me and has "sub" / "unsub"
   + Look at the toot it was in reply_to
    - Grab region code after "#covid_"
      - Add the user to a mastodon list (and follow them first) by the name of the country code
   + If no reply_to, check for #code
 + While generting toots for each region
  - Check if we have a list by that region name, grab it's users
  - Add them into the toot msg as @


# TODO

- [x] Chart moving average
- [x] Regional stats (Countries & US States)
- [x] Tweet
- [x] Static website
- ? Subscribe to hashtag
- https://botsin.space/auth/sign_up
- [x] Fix region names (states) with spaces in them for URL's (encode spaces)
- [x] Hide American Somoa
- ? Reduce the number of places tooted
- [x] Add vaccine data
- [ ] Consider showing vaccine data as % of population
- Fix sort of countries by name instead of code
- [ ] Email notifications
- [ ] Orbit db https://github.com/orbitdb/orbit-db
