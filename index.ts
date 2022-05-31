import commandLineArgs from "command-line-args";
import commandLineUsage from "command-line-usage";
import { Feature, point, polygon, Polygon, Position } from "@turf/helpers";
import { makeRandomRoute } from "./lib/route";
import { getDebugFeatureCollection } from "./lib/debug";
import { createReadStream, writeFileSync } from "fs";
import fetch from "node-fetch";
import { overpassJson } from "overpass-ts";
import { findMinDistancePosIndex } from "./lib/distance";
import { join, parse } from "path";
import { login } from "masto";

if (process.env.ROUTEBOT_WORKDIR) {
    process.chdir(process.env.ROUTEBOT_WORKDIR);
}

const optionList = [
    {
        name: "help",
        alias: "h",
        type: Boolean,
        description: "Display this usage guide.",
    },
    {
        name: "length",
        alias: "l",
        type: Number,
        defaultValue: 100,
        description: "Set desired (approximate) route length.",
    },
    {
        name: "start",
        alias: "s",
        type: String,
        defaultValue: "9.943462461233139,49.77135645006747",
        description: "Set start location (longitude, latitude position) of the route.",
    },
    {
        name: "out",
        alias: "o",
        type: String,
        description: "Write resulting GPX to this file.",
    },
    {
        name: "ccw",
        type: Boolean,
        description: "Generate counter-clockwise route.",
    },
    {
        name: "amenity",
        type: String,
        description: "Make the route target a random amenity of that type (e.g. 'ice_cream').",
    },
    {
        name: "toot",
        type: String,
        description: "Automatically post route as toot to mastodon.",
    },
    {
        name: "debug-geojson-features",
        type: String,
        description: "Write GeoJSON FeatureCollection with debugging information to given file.",
    },
];

const options = commandLineArgs(optionList);

console.log(options);

if (options.help) {
    console.log(
        commandLineUsage([
            {
                header: "A random route creation robot.",
                content: "Generate a random cycle route starting at a given point",
            },
            {
                header: "Options",
                optionList,
            },
        ])
    );
    process.exit(0);
}

if (options.toot && !options.out) {
    options.out = `${(Math.random() + 1).toString(36).slice(-6)}.gpx`;
}

(async function () {
    const startPoint = point(options.start.split(/\s*,\s*/).map(Number));
    const checkpointPolygonHook = options["amenity"]
        ? async (input: Feature<Polygon>): Promise<Feature<Polygon>> => {
              const points = input.geometry.coordinates[0];
              console.log("points before running hook", points);
              const pos = points[2];

              const query = `
              [out:json];
              (node
                  [amenity='${options["amenity"]}']
                  (around:25000.0,${pos[1]},${pos[0]});
              );
              out;
          `;

              const result = await overpassJson(query, {
                  verbose: true,
                  endpoint: "https://overpass-api.brokenpipe.de/api/interpreter",
              });

              if (!result.elements.length) {
                  throw new Error("Overpass failed to find amenity within range :/");
              }

              const nodes = result.elements.filter((el) => el.type === "node");
              const positions = nodes.map((el): Position => {
                  if (el.type !== "node") {
                      throw new Error("expect result to contain nodes only");
                  }

                  return [el.lon, el.lat];
              });
              const index = findMinDistancePosIndex(pos, positions);
              const tags = nodes[index].tags as any;

              if (options.toot && tags && tags.name) {
                  options.toot += ` bei "${tags.name}"`;

                  if (tags["addr:city"]) {
                      options.toot += ` in ${tags["addr:city"]}`;
                  }
              }

              options.marker = points[2] = positions[index];
              console.log("points with amenity", points);

              return polygon([points]);
          }
        : undefined;
    const gpxUrl = await makeRandomRoute(startPoint, options.length, { ccw: options.ccw, checkpointPolygonHook });

    if (options["debug-geojson-features"]) {
        writeFileSync(options["debug-geojson-features"], JSON.stringify(getDebugFeatureCollection(), undefined, 4));
    }

    const gpxData = await (await fetch(gpxUrl)).text();
    if (options.out) {
        writeFileSync(options.out, gpxData);
    } else {
        console.log(gpxData);
    }

    if (options.toot) {
        const gpxUrl = `${process.env.ROUTEBOT_WORKDIR_URL}/${options.out}`;
        let gpxviewUrl = `https://q0a.de/gpxview.html?r=${gpxUrl}`;
        if (options.marker) gpxviewUrl += `&m=${options.marker.join(',')}`
        const rendertronUrl = `https://render-tron.appspot.com/screenshot/${encodeURIComponent(
            gpxviewUrl
        )}?width=1024&height=576`;
        const parsedName = parse(options.out);
        const jpgFileName = join(parsedName.dir, `${parsedName.name}.jpg`);
        writeFileSync(jpgFileName, await (await fetch(rendertronUrl)).buffer());

        const matches = gpxData.match(/track-length = (\d+) filtered ascend = (\d+)/);
        if (!matches) {
            throw new Error("length / ascend info missing from gpx file :(");
        }

        const tootText = `${options.toot} ${Math.round(Number.parseInt(matches[1], 10) / 1000)} km, ${
            matches[2]
        } Hm ${gpxUrl} #bottest`;

        const masto = await login({
            url: "https://wue.social",
            accessToken: process.env["ROUTEBOT_MASTO_ACCESS_TOKEN"],
        });

        // Upload the image
        const attachment = await masto.mediaAttachments.create({
            file: createReadStream(jpgFileName),
        });

        // Toot!
        const status = await masto.statuses.create({
            status: tootText,
            visibility: "direct",
            mediaIds: [attachment.id],
        });

        console.log(status);
    }
})();
