# routebot

aka (rb)² - Road Bike Route Bot

This is a (rather naive) random cycling route generator written in TypeScript,
based on [OpenStreetMap](https://www.openstreetmap.org/),
[Overpass API](http://overpass-api.de/) and [BRouter](https://brouter.de/).

Track generation works like this

-   based on strived for track length calculate radius
-   based on start point and radius, choose random center point
-   choose five checkpoints on circle around this center point (one being the start point)
-   snap those checkpoints to closes tertiary/unclassified road (using overpass api)
-   use brouter to route from checkpoint to checkpoint
-   eliminate dead ends around checkpoint (i.e. move checkpoint accordingly)

## Route Preview

In order to (attractively) publish the route we need a rendered preview of it.
Enter Leaflet + Leaflet-GPX to automatically render the route as a webpage. Then
use [Rendertron](https://github.com/GoogleChrome/rendertron) to render it to JPG.

## Mastodon Bot

Use [toot](https://toot.readthedocs.io/en/latest/index.html) in order to automatically
post status updates, including the preview image, to some Mastodon instance.

## Demo

See [@rbrb@wue.social](https://wue.social/web/@rbrb)'s Toots for random road bike routes
around Würzburg.
