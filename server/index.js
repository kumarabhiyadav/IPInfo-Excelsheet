const express = require("express");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const { default: axios } = require("axios");
const app = express();
const port = 5001;
const cors = require("cors");
app.use(express.json());

app.use(cors("*"));

const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

app.post("/getExcel", async (req, res) => {
  let ipDetails = [];
  let ips = req.body.data.split("\n");
  console.log(ips);

  for await (const ip of ips) {
    if (validateIPv4(ip) || validateIPv6(ip)) {
      let data = await getIpInfoInsertIntoExcel(ip);
      const { currency, ...formatedJson } = {
        ...data,
        currencyCode: data.currency.code,
        currencyName: data.currency.name,
        timeZones: data.timeZones[0],
        tlds: data.tlds[0],
      };
      ipDetails.push(formatedJson);
    }
  }
  console.log("Data");
  writeToXlsx(req.headers.file, ipDetails);

  const filePath = path.join('files', req.headers.file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found.');
  }
  res.setHeader('Content-Disposition', 'attachment; filename=' + path.basename(filePath));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');


  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
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

function writeToXlsx(filename, data) {
  // Define the output directory
  const outputDir = "files";

  // Ensure the output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Construct full path for the output file
  const filePath = path.join(outputDir, filename);

  // Create a new workbook
  const wb = XLSX.utils.book_new();

  // Create a worksheet
  const ws = XLSX.utils.aoa_to_sheet([]);

  // Add headers to the worksheet (only once)
  const headers = Object.keys(data[0]);
  XLSX.utils.sheet_add_aoa(ws, [headers], { origin: -1 }); // Add headers at the beginning

  // Extract data values without headers
  const dataValues = data.map((obj) => Object.values(obj));

  // Add data rows to the worksheet
  XLSX.utils.sheet_add_aoa(ws, dataValues, { origin: -1 }); // Add data rows after headers

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

  // Write the workbook to a file
  XLSX.writeFile(wb, filePath);

  console.log(`Excel file "${filePath}" has been written successfully.`);
}
