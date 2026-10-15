import React from "react";
import { useParams, Navigate } from "react-router-dom";
import OrderDetails from "./OrderDetails";

/**
 * OrderTracking route wrapper
 * Allows /order-tracking/:id or direct tracking links to route to the authoritative OrderDetails view.
 */
const OrderTracking = () => {
  const { id } = useParams();
  if (id) {
    return <Navigate to={`/orders/${id}`} replace />;
  }
  return <Navigate to="/orders" replace />;
};

export default OrderTracking;
