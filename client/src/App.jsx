import "./App.css";
import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
function App() {
  const [data, setData] = useState("");
  const [errorCount, setErrorCount] = useState(0);

  const [msg, setMessage] = useState("");
  const [isLoading, setLoading] = useState(false);
  const [currentIPs, setcurrentIPs] = useState([]);

  let headers = [
    "sr.no",
    "ipVersion",
    "ipAddress",
    "latitude",
    "longitude",
    "countryName",
    "countryCode",
    "timeZone",
    "zipCode",
    "cityName",
    "regionName",
    "isProxy",
    "continent",
    "continentCode",
    "language",
    "timeZones",
    "tlds",
    "currencyCode",
    "currencyName",
    "status",
  ];

  const exportTableToExcel = (tableData, filename = "IPs.xlsx") => {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Convert table data to a worksheet
    const worksheet = XLSX.utils.json_to_sheet(tableData);

    // Append the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    // Generate Excel file and trigger download
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, filename);
  };

  function getSplitedArray(data) {
    return data.split("\n");
  }

  async function getIpInfo(ip) {
    let details = await axios.get(`https://freeipapi.com/api/json/${ip}`);

    return details.data;
  }

  async function getDetails() {
    if (isLoading) return;
    setLoading(true);

    let IPS = getSplitedArray(data);
    let IPLength = IPS.length;
    for (let index = 0; index < IPS.length; index++) {
      try {
        let ipData = await getIpInfo(IPS[index]);
        console.log(index);
        const { currency, ...rest } = {
          ...ipData,
          "sr.no": index + 1,
          currencyCode: ipData.currency.code,
          currencyName: ipData.currency.name,
          timeZones: ipData.timeZones[0],
          tlds: ipData.tlds[0],
          status: true,
        };

        console.log(rest);

        currentIPs.push(rest);
        console.log(rest);
        setcurrentIPs([...currentIPs]);
        setMessage(`Progress ${index + 1}/${IPLength}`);

        await delay(2500);
        // await delay(2500);
      } catch (error) {
        let errorData = {
          "sr.no": index,
          ipVersion: "",
          ipAddress: "",
          latitude: "",
          longitude: "",
          countryName: "",
          countryCode: "",
          timeZone: "",
          zipCode: "",
          cityName: "",
          regionName: "",
          isProxy: "",
          continent: "",
          continentCode: "",
          language: "",
          timeZones: "",
          tlds: "",
          currencyCode: "",
          currencyName: "",
          status: "",
        };
        currentIPs.push(errorData);
        console.log(errorData);
        setcurrentIPs([...currentIPs]);

        setErrorCount(errorCount + 1);

        await delay(2500);
      }
    }

    setLoading(false);
  }

  async function download() {
    if (isLoading) return;
    exportTableToExcel(currentIPs);
  }

  const handleChange = (event) => {
    setData(event.target.value);
    // setError(""); // Clear error when user types in textarea
  };

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function retry(ip) {
    try {
      console.warn(ip);
      let ipData = await getIpInfo(ip);

      const { currency, ...rest } = {
        ...ipData,
        "sr.no": index + 1,
        currencyCode: ipData.currency.code,
        currencyName: ipData.currency.name,
        timeZones: ipData.timeZones[0],
        tlds: ipData.tlds[0],
        status: true,
      };
      let index = currentIPs.findIndex((e) => e.ipAddress == ip);
      currentIPs[index] = rest;
    } catch (error) {
      let index = currentIPs.findIndex((e) => e.ipAddress == ip);
      let errorData = {
        "sr.no": index,
        ipVersion: "",
        ipAddress: ip,
        latitude: "",
        longitude: "",
        countryName: "",
        countryCode: "",
        timeZone: "",
        zipCode: "",
        cityName: "",
        regionName: "",
        isProxy: "",
        continent: "",
        continentCode: "",
        language: "",
        timeZones: "",
        tlds: "",
        currencyCode: "",
        currencyName: "",
        status: "",
      };

      currentIPs[index] = errorData;
    }
  }

  return (
    <div className="App">
      <textarea
        value={data}
        rows={20}
        cols={80}
        disabled={isLoading}
        onChange={handleChange}
        placeholder="Enter IPs here..."
      />
      <br />
      <br />
      <button onClick={getDetails} disabled={isLoading}>
        {isLoading ? "Getting IP details" : "Get IP Details"}
      </button>
      <br />
      <br />

      {!isLoading  && currentIPs.length > 0 && (
        <button onClick={download} disabled={isLoading}>
          Download Excel
        </button>
      )}

      <h4>Getting Data {msg}</h4>
      <h4>{errorCount != 0 && `Errors ${errorCount}`}</h4>

      <table>
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {currentIPs.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {headers.map((header, cellIndex) => (
                <td key={cellIndex}>
                  {header !== "status" ? (
                    row[header].toString() // Render the row value if header is not 'status'
                  ) : !row["status"] ? ( // Check if status is false or null before rendering "Retry"
                    <span onClick={() => retry(row["ipAddress"])}>Retry</span> // Render 'Retry' with click handler if status is false or null
                  ) : (
                    "" // Render empty string if status is true or another truthy value
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
