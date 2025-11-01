import React from "react";

export default function DistrictSelector({districts, value, onChange}){
  return (
    <div className="selector">
      <label>Select District</label>
      <select value={value || ""} onChange={e=> onChange(e.target.value)}>
        <option value="">-- Select --</option>
        {districts.map(d=> (
          <option key={d} value={d.toLowerCase()}>{d}</option>
        ))}
      </select>
    </div>
  );
}
