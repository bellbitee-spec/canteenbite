import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Categories from "./pages/Categories.jsx";
import Product from "./pages/Product.jsx";
import Cart from "./pages/Cart.jsx";
import Checkout from "./pages/Checkout.jsx";
import StoreClosed from "./pages/StoreClosed.jsx";
import OrderSuccess from "./pages/OrderSuccess.jsx";
import Orders from "./pages/Orders.jsx";
import OrderDetails from "./pages/OrderDetails.jsx";
import Profile from "./pages/Profile.jsx";
import Login from "./pages/Login.jsx";
import Policies from "./pages/Policies.jsx";
import NotFound from "./pages/NotFound.jsx";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/categories" element={<Categories />} />
      <Route path="/product/:id" element={<Product />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/order-success/:id" element={<OrderSuccess />} />
      <Route path="/orders" element={<Orders />} />
      <Route path="/orders/:id" element={<OrderDetails />} />
      <Route path="/order-history" element={<Orders />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/login" element={<Login />} />
      <Route path="/store-closed" element={<StoreClosed />} />
      <Route path="/policies" element={<Policies />} />
      <Route path="/privacy-policy" element={<Navigate to="/policies?tab=privacy" replace />} />
      <Route path="/refund-policy" element={<Navigate to="/policies?tab=refund" replace />} />
      <Route path="/return-policy" element={<Navigate to="/policies?tab=return" replace />} />
      <Route path="/disclaimer" element={<Navigate to="/policies?tab=disclaimer" replace />} />
      <Route path="/contact" element={<Navigate to="/policies?tab=contact" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;
