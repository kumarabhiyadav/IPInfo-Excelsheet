import "./App.css";
import React, { useState, useEffect } from "react";
import axios from "axios";
import loadingIcon from './assets/loading.gif';

function App() {
  const [data, setData] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const eventSource = new EventSource("http://175.111.97.105:5001/events");

    eventSource.onmessage = (event) => {
      console.log(event);
      setProgress(event.data);
    };

    eventSource.onerror = (err) => {
      console.error("EventSource failed:", err);
      eventSource.close();
    };

    const fetchData = async () => {
      try {
        const response = await axios.get("http://175.111.97.105:5001/status"); // Replace with your API endpoint
        setHistory([...response.data]); 
        console.log(history);
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();

    return () => {
      eventSource.close();
    };
  }, []);

  const handleChange = (event) => {
    setData(event.target.value);
    setError(""); // Clear error when user types in textarea
  };

  const sendData = async () => {
    if (isLoading) {
      return; // Prevent multiple clicks while request is in progress
    }
    if (!data) {
      setError("Please enter IPs"); // Display error if textarea is empty
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        "http://175.111.97.105:5001/getExcel",
        { data },
        {
          headers: {
            "Content-Type": "application/json",
            file: `data${Date.now().toString()}.csv`, // Specify filename in header
          },
        }
      );
      
      console.log(response.data);
      window.location.reload()
    
    } catch (error) {
      console.error("Error downloading file:", error);
      setError("Failed to download file. Please try again."); // Update UI in case of error
    } finally {
      setIsLoading(false); // Reset loading state regardless of success or failure
      setProgress("");
    }
  };

  const downloadFile = async (fileName) => {
    try {
      const response = await axios.get('http://175.111.97.105:5001/download/'+fileName.replace('files/',''), {
        responseType: 'blob',
      });

      // Create a link element
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      // Set the download attribute with a filename
      link.setAttribute('download', fileName.replace('csv','xlsx')); // Replace with your desired file name

      // Append the link to the body
      document.body.appendChild(link);

      // Programmatically click the link to trigger the download
      link.click();

      // Remove the link from the document
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading the file:', error);
    }
  };


  return (
    <div className="App">
      <textarea
        value={data}
        rows={20}
        cols={80}
        onChange={handleChange}
        placeholder="Enter IPs here..."
      />
      <br />
      <h4 style={{ color: "red" }}>{error}</h4>
      <br />
      <button onClick={sendData} disabled={isLoading}>
        {isLoading ? "Downloading..." : "Download Excel"}
      </button>
      <div>
        <h4>Progress:</h4>
        <p>{progress}</p>
      </div>
      <div>
        <h4>History</h4>

        {history.map(item => (
          <li onClick={()=>{
            downloadFile(item.file);
          }} style={{cursor:'pointer'}} key={item.file}>{item.file} { item.status == "done" ? <img height={18} src="https://img.icons8.com/fluency/48/download.png" alt="" />:<img height={18}  src={loadingIcon} alt="" /> } </li> // Replace with your data structure
        ))}

        
      </div>
    </div>
  );
}

export default App;
