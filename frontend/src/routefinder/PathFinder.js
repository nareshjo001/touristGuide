import React, { useState } from "react";

export default function PathFinder({district, nodes, setPathResult}){
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const findPath = async () => {
    if(!district || !start || !end) return alert("Select district and both places");
    const res = await fetch("http://localhost:8000/api/find-path", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({district, start, end})
    });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
      return;
    }
    setPathResult(data);
  };

  return (
    <div className="path-finder card">
      <h3>Get Travel Route</h3>
      <div className="controls">
        <select value={start} onChange={e=>setStart(e.target.value)}>
          <option value="">From</option>
          {nodes && nodes.map(n=> <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={end} onChange={e=>setEnd(e.target.value)}>
          <option value="">To</option>
          {nodes && nodes.map(n=> <option key={n} value={n}>{n}</option>)}
        </select>
        <button onClick={findPath}>Find Path</button>
      </div>
    </div>
  );
}
