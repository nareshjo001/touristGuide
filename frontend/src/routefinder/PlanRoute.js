import React from "react";

export default function PlanRoute({planResult}){
  if(!planResult) return null;
  const { order, total_distance_km } = planResult;
  return (
    <div className="plan-route card">
      <h3>Suggested Visit Order</h3>
      <p>Total approximate distance: <strong>{total_distance_km} km</strong></p>
      <ol>
        {order.map((p,i)=> <li key={p}>{p}</li>)}
      </ol>
    </div>
  );
}
