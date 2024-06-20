import './App.css';
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [data, setData] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState('');

  useEffect(() => {
    const eventSource = new EventSource('http://175.111.97.105:5001/events');

    eventSource.onmessage = (event) => {
      setProgress(event.data);
    };

    eventSource.onerror = (err) => {
      console.error('EventSource failed:', err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleChange = (event) => {
    setData(event.target.value);
    setError(''); // Clear error when user types in textarea
  };

  const sendData = async () => {
    if (isLoading) {
      return; // Prevent multiple clicks while request is in progress
    }
    if (!data) {
      setError('Please enter IPs'); // Display error if textarea is empty
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        'http://175.111.97.105:5001/getExcel',
        { data },
        {
          responseType: 'blob', // Receive response as a Blob (binary data)
          headers: {
            'Content-Type': 'application/json',
            'file': `data${Date.now().toString()}.xlsx`, // Specify filename in header
          },
        }
      );

      // Create a blob object from the response data
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      // Create a temporary URL to download the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element to initiate the download
      const a = document.createElement('a');
      a.href = url;
      a.download = `data${Date.now().toString()}.xlsx`; // Set filename for download
      document.body.appendChild(a); // Append anchor to body
      a.click(); // Click the anchor to trigger download
      document.body.removeChild(a); // Clean up: remove anchor from body
      setData('');
      
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('Failed to download file. Please try again.'); // Update UI in case of error
    } finally {
      setIsLoading(false); // Reset loading state regardless of success or failure
      setProgress('')
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
      <h4 style={{ color: 'red' }}>{error}</h4>
      <br />
      <button onClick={sendData} disabled={isLoading}>
        {isLoading ? 'Downloading...' : 'Download Excel'}
      </button>
      <div>
        <h4>Progress:</h4>
        <p>{progress}</p>
      </div>
    </div>
  );
}

export default App;
