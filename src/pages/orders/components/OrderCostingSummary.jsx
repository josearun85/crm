// src/pages/orders/components/OrderCostingSummary.jsx
import React, { useState, useEffect } from "react";

export default function OrderCostingSummary({
  orderData,
  onDiscountChange,
}) {
  const {
    total,
    discount = 0,
    netTotal,
    gstSummary = {},
    cgstSummary = {},
    sgstSummary = {},
    grandTotal,
    costToCompany,
    margin,
  } = orderData;

  // Local state for the discount input (optional)
  const [localDiscount, setLocalDiscount] = useState(orderData.discount);

  useEffect(() => {
    setLocalDiscount(discount);
  }, [discount]);

  const handleDiscountBlur = () => {
    onDiscountChange?.(Number(localDiscount) || 0);
  };

  // Grab all unique rates, sorted numerically
  const rates = Object.keys(orderData.gstSummary)
    .map(r => Number(r))
    .sort((a, b) => a - b);

  const format = num => Number(num).toFixed(2);

  return (
    <div className="p-6 bg-white rounded shadow max-w-lg mx-auto">
      {/* Totals & Discount */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-sm font-medium">TOTAL</div>
        <div className="text-right text-sm">₹ {format(total)}</div>

        <div className="text-sm font-medium">DISCOUNT</div>
        <div className="text-right">
          <input
            type="number"
            className="w-20 border px-1 py-0.5 text-sm text-right"
            value={localDiscount}
            onChange={e => setLocalDiscount(e.target.value)}
            onBlur={handleDiscountBlur}
          />
        </div>

        <div className="text-sm font-medium">NET TOTAL</div>
        <div className="text-right text-sm">₹ {format(netTotal)}</div>
      </div>

      {/* GST Breakdown Table */}
      <table className="w-full text-sm mb-4 border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">GST Rate</th>
            <th className="p-2 text-right">CGST</th>
            <th className="p-2 text-right">SGST</th>
            <th className="p-2 text-right">IGST</th>
          </tr>
        </thead>
        <tbody>
          {rates.map(rate => {
            const halfPct = (rate / 2).toFixed(0);
            return (
              <tr key={rate} className="border-t">
                <td className="p-2">{rate}%</td>
                <td className="p-2 text-right">
                  ₹ {format(orderData.cgstSummary[rate] || 0)} ({halfPct}%)
                </td>
                <td className="p-2 text-right">
                  ₹ {format(orderData.sgstSummary[rate] || 0)} ({halfPct}%)
                </td>
                 <td className="p-2 text-right">
                  ₹ {format(orderData.igstSummary[rate] || 0)} ({halfPct}%)
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Final Totals */}
      <div className="grid grid-cols-2 gap-4 text-lg font-bold">
        <div>GRAND TOTAL</div>
        <div className="text-right">₹ {format(orderData.grandTotal)}</div>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-2">
        <div className="font-medium">COST TO COMPANY</div>
        <div className="text-right">₹ {format(orderData.costToCompany)}</div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="font-medium">MARGIN</div>
        <div className="text-right">₹ {format(orderData.margin)}</div>
      </div>
    </div>
  );
}