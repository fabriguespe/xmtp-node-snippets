import getMetaData from "metadata-scraper";
import fs from "fs";
import fetch from "node-fetch";
import { Client } from "@notionhq/client";
import extractUrls from "extract-urls";
import {} from "dotenv/config";
import { readFile } from "fs/promises";

const categories = JSON.parse(
  await readFile(new URL("./categories.json", import.meta.url)),
);

(async () => {
  const notion = new Client({ auth: process.env.NOTION });
  const databaseId = process.env.DB;

  let results = [];
  let response = await notion.databases.query({
    database_id: databaseId,
    sorts: [
      {
        property: "Category",
        direction: "ascending",
      },
      {
        property: "Title",
        direction: "ascending",
      },
    ],
  });

  results = [...response.results];

  let csv = [];
  console.log("Results:", results.length);

  let md = "";
  for (let cate in categories) {
    md += "## " + cate + "\n";
    md += categories[cate] + "\n<br />\n<br />";
    console.log(cate);
    for (let i in results) {
      let row = results[i];
      let category = row.properties.Category?.select?.name;
      if (category != cate) continue;
      let url = row.properties.URL?.url;
      let title = row.properties.Title?.title[0].plain_text;
      let curated = row.properties.Curated?.checkbox;
      let partner = !!row.properties.Partners?.checkbox;
      let icon = row.icon;
      let cover = row.cover;
      let featured = !!row.properties.Featured?.checkbox;
      let type = row.properties.Type?.select?.name;
      let hackathon = row.properties.Hackathon?.select?.name;
      let description = row.properties.Description?.rich_text[0]?.plain_text;
      if (curated && type != "Partner") {
        md += "**[" + title + "](" + url + ")**" + "<br />";
        md += description + "<br />";

        md += "<br />\n";

        let obj = {
          title: title,
          url: url,
          icon: icon,
          cover: cover,
          description: description,
          partner: type == "Partner",
          featured: featured,
          type: type,
          curated: curated,
          hackathon: hackathon,
          category: category,
        };
        console.log(obj);
        csv.push(obj);
      }
      console.log(csv);
    }
  }
  fs.writeFile("apps.json", JSON.stringify(csv), (err) => {
    if (err) throw err;
    console.log("JSON file is created successfully.");
  });
  fs.writeFile("APPS.md", md, (err) => {
    if (err) throw err;
    console.log("Markdown file is created successfully.");
  });
})();

// Rest of the code remains unchanged

async function getTwitter(url) {
  let twitter = "";
  try {
    let text = await fetch(url).then((result) => {
      return result.text();
    });
    if (text) {
      let urls = extractUrls(text);
      if (urls) {
        for (var j = 0; j < urls.length; j++) {
          if (urls[j].includes("twitter.com")) {
            twitter = urls[j].split("?")[0];
            twitter.replace("https://twitter.com/", "@");
            //break;
            break;
          }
        }
      }
    }
    if (twitter) {
      console.log("tw", twitter);
      const response = await notion.pages.update({
        page_id: row.id,
        properties: { twitter: { url: twitter } },
      });
      console.log(response);
    }
  } catch (e) {}
}

async function updateMeta(notion, row) {
  console.log(row);
  let url = row.properties.URL?.url;
  let url_icon = row.icon;
  let url_cover = row.cover;
  if (!url_icon?.external?.url || !url_cover?.external?.url) {
    let data = await getMetaData(url).then((data) => {
      return data;
    });
    console.log(data);
    //csv[i]['Metadesc']=(data.description==undefined?'':data.description)
    if (data.icon != undefined) url_icon = data.icon;
    if (data.cover != undefined) url_cover = data.image;

    let obj = { page_id: row.id };
    if (url_cover) obj.cover = { external: { url: url_cover } };
    if (url_icon) obj.icon = { external: { url: url_icon } };
    if (url_icon) obj.twitter = { external: { url: url_icon } };
    if (obj.cover?.external || obj.icon?.external) {
      const response2 = await notion.pages.update(obj);
      console.log(response2.properties.Title.title[0].plain_text);
    }
  }
}
