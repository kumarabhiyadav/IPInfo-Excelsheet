const express = require("express");
const { createObjectCsvWriter } = require("csv-writer");
const { default: axios } = require("axios");
const app = express();
const port = 5001;
const cors = require("cors");
app.use(express.json());
const Datastore = require("nedb");
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const csvParser = require('csv-parser');

app.use(cors("*"));

const db = new Datastore({
  filename: "database.db",
  autoload: true,
  timestampData: true,
});

const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  req.on("close", () => {
    res.end();
  });

  app.set("sendEvent", sendEvent);
});


app.get("/status", (req, res) => {
  db.find({})
    .sort({ createdAt: -1 })
    .exec((err, docs) => {
      if (err) {
        res.status(500).send(err);
      } else {
        res.status(200).send(docs);
      }
    });
});

app.post("/getExcel", async (req, res) => {
  const filenamePath = `files/${req.headers.file}`;
  let csvWriter = writeHeaderCSV(filenamePath);
  db.insert({
    file: filenamePath,
    status: "pending",
  });
  const chunkSize = 400;
  const ips = req.body.data.split("\n").filter((ip) => ip.trim() !== ""); // Split and remove empty lines
  const ipLength = ips.length;
  const totalChunks = Math.ceil(ips.length / chunkSize);

  const sendEvent = app.get("sendEvent");

  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * chunkSize;
    const end = start + chunkSize;
    const chunk = ips.slice(start, end);

    let ipDetails = [];

    for (let i = 0; i < chunk.length; i++) {
      const ip = chunk[i];
      if (validateIPv4(ip) || validateIPv6(ip)) {
        try {
          let data = await getIpInfoInsertIntoExcel(ip);
          const { currency, ...formatedJson } = {
            ...data,
            currencyCode: data.currency.code,
            currencyName: data.currency.name,
            timeZones: data.timeZones[0],
            tlds: data.tlds[0],
          };
          ipDetails.push(formatedJson);

          console.log(`${ip}`);
          if (sendEvent) {
            sendEvent(`Processed ${i + 1}/${ipLength} IPs`);
          }
        } catch (error) {
          console.error(`Error processing IP ${ip}:`);
        }
      }

      // Pause for 1 second after every 10 seconds (10 iterations)
      if ((i + 1) % 2  === 0) {
        await pause(1000); // Pause for 1 second
      }
    }

    // Send chunk progress update
    if (sendEvent) {
      sendEvent({
        type: "chunk_progress",
        message: `Processed chunk ${chunkIndex + 1}/${totalChunks}`,
      });
    }

    (await csvWriter).writeRecords(ipDetails);
    ipDetails = [];
  }
  db.update(
    { file: filenamePath },
    {
      $set: { status: "done" },
    }
  );
  res.send(`Processing and saving ${totalChunks} chunk(s) to Excel files.`);
});

app.get('/download/:filename', (req, res) => {
  const csvFilePath = path.join(__dirname, 'files', req.params.filename); // Path to your CSV file
  const xlsxFilePath = path.join(__dirname, 'files',  req.params.filename.replace('csv','xlsx')); // Path for the XLSX file

  convertCsvToXlsx(csvFilePath, xlsxFilePath);  
  res.download(xlsxFilePath, (err) => {
    if (err) {
      res.status(500).send('File download failed');
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

async function getIpInfoInsertIntoExcel(ip) {
  let details = await axios.get(`https://freeipapi.com/api/json/${ip}`);

  return details.data;
}

function validateIPv6(ip) {
  return ipv6Regex.test(ip);
}

function validateIPv4(ip) {
  return (
    ipv4Regex.test(ip) &&
    ip.split(".").every((segment) => parseInt(segment, 10) <= 255)
  );
}

async function writeHeaderCSV(filenamePath) {
  const csvWriter = createObjectCsvWriter({
    path: filenamePath,
    header: [
      {
        id: "ipVersion",
        title: "ipVersion",
      },
      {
        id: "ipAddress",
        title: "ipAddress",
      },
      {
        id: "latitude",
        title: "latitude",
      },
      {
        id: "longitude",
        title: "longitude",
      },
      {
        id: "countryName",
        title: "countryName",
      },
      {
        id: "countryCode",
        title: "countryCode",
      },
      {
        id: "timeZone",
        title: "timeZone",
      },
      {
        id: "zipCode",
        title: "zipCode",
      },
      {
        id: "cityName",
        title: "cityName",
      },
      {
        id: "regionName",
        title: "regionName",
      },
      {
        id: "isProxy",
        title: "isProxy",
      },
      {
        id: "continent",
        title: "continent",
      },
      {
        id: "continentCode",
        title: "continentCode",
      },
      {
        id: "language",
        title: "language",
      },
      {
        id: "timeZones",
        title: "timeZones",
      },
      {
        id: "tlds",
        title: "tlds",
      },
      {
        id: "currencyCode",
        title: "currencyCode",
      },
      {
        id: "currencyName",
        title: "currencyName",
      },
    ],
  });

  return csvWriter;
}


const convertCsvToXlsx = (csvFilePath, xlsxFilePath) => {
  const workbook = XLSX.utils.book_new();
  const worksheetData = [];
  fs.createReadStream(csvFilePath)
    .pipe(csvParser())
    .on('data', (row) => {
      worksheetData.push(row);
    })
    .on('end', () => {
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      XLSX.writeFile(workbook, xlsxFilePath);
      console.log(`Converted ${csvFilePath} to ${xlsxFilePath}`);
    });
};
