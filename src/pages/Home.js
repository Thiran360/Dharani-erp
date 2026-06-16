import React, { useState, useEffect } from "react";
import "./color.css";
import headerVideo from "../assets/VID-20260612-WA0011 (1).mp4";
import brandNameLogo from "./images/dharani-herbbals-wordmark.svg";

function Home() {
  const [orderNo, setOrderNo] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [remarks, setRemarks] = useState("");
  const [shippingCharge, setShippingCharge] = useState(0);

  // CUSTOMER
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  // PRODUCTS (FROM API)
  const [products, setProducts] = useState([]);

  // ORDERS LIST (FROM API)
  const [orders, setOrders] = useState([]);

  // ERROR TRACKING
  const [customerError, setCustomerError] = useState(null);
  const [productError, setProductError] = useState(null);

  // LOGS FOR DEBUGGING
  const [logs, setLogs] = useState([]);
  const addLog = (message) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${message}`, ...prev.slice(0, 19)]);
  };

  const [items, setItems] = useState([
    { itemName: "", qty: 1, rate: 0, amount: 0, showDropdown: false },
  ]);

  // FETCH ORDERS LIST
  const fetchOrders = () => {
    addLog("Fetching orders list...");
    fetch("https://api.codingboss.in/herbal/orders/", {
      headers: {
        "ngrok-skip-browser-warning": "any",
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        // Sort descending by order ID
        list.sort((a, b) => Number(b.order_id || b.id || 0) - Number(a.order_id || a.id || 0));
        setOrders(list);
        addLog(`Loaded ${list.length} orders successfully.`);
      })
      .catch((err) => {
        addLog(`Error loading orders: ${err.message}`);
      });
  };

  // FETCH CUSTOMERS
  useEffect(() => {
    addLog("Fetching customers...");
    fetch(
      "https://api.codingboss.in/herbal/customers/",
      {
        headers: {
          "ngrok-skip-browser-warning": "any",
        },
      }
    )
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setCustomers(list);
        setCustomerError(null);
        addLog(`Loaded ${list.length} customers successfully.`);
      })
      .catch((err) => {
        setCustomerError(err.message || "Failed to fetch customers");
        setCustomers([]);
        addLog(`Error loading customers: ${err.message}`);
      });
  }, []);

  // FETCH PRODUCTS ✅ NEW ADD
  useEffect(() => {
    addLog("Fetching products...");
    fetch(
      "https://api.codingboss.in/herbal/products/",
      {
        headers: {
          "ngrok-skip-browser-warning": "any",
        },
      }
    )
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("RAW PRODUCT RESPONSE:", data);
        setProductError(null);
        let list = [];
        // SAFE CHECK
        if (Array.isArray(data)) {
          list = data;
        } else if (data?.results) {
          list = data.results; // Django pagination case
        }
        setProducts(list);
        addLog(`Loaded ${list.length} products successfully.`);
      })
      .catch((err) => {
        console.log("PRODUCT FETCH ERROR:", err);
        setProductError(err.message || "Failed to fetch products");
        setProducts([]);
        addLog(`Error loading products: ${err.message}`);
      });
  }, []);

  // INITIAL ORDERS LOAD
  useEffect(() => {
    fetchOrders();
  }, []);

  // ITEM CHANGE
  const handleChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;

    if (field === "itemName") {
      const product = products.find((p) => p.name === value);
      updated[index].rate = Number(
        product?.customer_price || product?.price || product?.mrp || 0
      );
    }

    const qty = Number(updated[index].qty || 0);
    const rate = Number(updated[index].rate || 0);

    updated[index].amount = qty * rate;

    setItems(updated);
  };

  const addRow = () => {
    setItems([
      ...items,
      { itemName: "", qty: 1, rate: 0, amount: 0, showDropdown: false },
    ]);
  };

  const deleteRow = (index) => {
    setItems(items.filter((_, i) => i !== index));
    addLog(`Deleted item row #${index + 1}`);
  };

  // SAVE ORDER
  const handleSave = () => {
    if (!selectedCustomerId) {
      alert("Please select a customer first.");
      addLog("Save aborted: No customer selected.");
      return;
    }

    const orderItems = items
      .filter((item) => item.itemName.trim() !== "")
      .map((item) => {
        const productObj = products.find((p) => p.name === item.itemName);
        return {
          product: productObj?.id || null,
          quantity: Number(item.qty || 1),
          price: Number(item.rate || 0)
        };
      })
      .filter((item) => item.product !== null);

    if (orderItems.length === 0) {
      alert("Please add at least one valid product.");
      addLog("Save aborted: No products added.");
      return;
    }

    const payload = {
      customer_id: selectedCustomerId,
      shipping_address: shippingAddress,
      total_amount: total,
      items: orderItems
    };

    addLog("Saving order to database...");
    fetch("https://api.codingboss.in/herbal/orders/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "any",
      },
      body: JSON.stringify(payload)
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((errData) => {
            throw new Error(errData?.message || `HTTP error! status: ${res.status}`);
          });
        }
        return res.json();
      })
      .then((data) => {
        alert(`Order saved successfully! Order ID: ${data.order_id}`);
        addLog(`Order #${data.order_id} saved successfully!`);
        setOrderNo(String(data.order_id));
        fetchOrders(); // Reload orders list dynamically
      })
      .catch((err) => {
        alert(`Error saving order: ${err.message}`);
        addLog(`Error saving order: ${err.message}`);
      });
  };

  // DATE FORMATTING HELPER
  const formatDateTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  // STATUS CUSTOM STYLING
  const getStatusStyle = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "pending" || s === "confirmed") {
      return {
        background: "#f3f4f6",
        color: "#374151",
        border: "1px solid #d1d5db"
      };
    }
    if (s === "shipped") {
      return {
        background: "#e0f2fe",
        color: "#0369a1",
        border: "1px solid #bae6fd"
      };
    }
    if (s === "delivered") {
      return {
        background: "#dcfce7",
        color: "#15803d",
        border: "1px solid #bbf7d0"
      };
    }
    return {
      background: "#f3f4f6",
      color: "#374151",
      border: "1px solid #d1d5db"
    };
  };

  // LOAD ORDER DIRECTLY BY ID
  const loadOrderById = (orderId) => {
    addLog(`Loading details for Order #${orderId}...`);
    fetch(`https://api.codingboss.in/herbal/orders/${orderId}/`, {
      headers: {
        "ngrok-skip-browser-warning": "any",
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Order not found! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("LOADED ORDER:", data);

        // Populate fields
        setOrderNo(String(data.id));
        setInvoiceNo("");
        setShippingAddress(data.shipping_address || "");
        setCustomerSearch(data.customer || "");
        setCustomerName(data.customer || "");
        setRemarks(`Loaded Order #${data.id}`);

        // Try to match customer to restore id and mobile/email
        const matchedCust = customers.find((c) => c.name === data.customer);
        if (matchedCust) {
          setSelectedCustomerId(matchedCust.id);
          setBillingAddress(matchedCust.mobile || "");
          setShippingAddress(data.shipping_address || matchedCust.email || "");
          addLog(`Matched Customer: ${data.customer} (ID: ${matchedCust.id})`);
        } else {
          addLog(`Warning: Loaded customer "${data.customer}" not found in local customers list.`);
        }

        // Map items
        if (Array.isArray(data.items)) {
          const mappedItems = data.items.map((item) => {
            return {
              itemName: item.product,
              qty: Number(item.quantity || 1),
              rate: Number(item.price || 0),
              amount: Number(item.quantity || 1) * Number(item.price || 0),
              showDropdown: false
            };
          });
          setItems(mappedItems.length > 0 ? mappedItems : [{ itemName: "", qty: 1, rate: 0, amount: 0, showDropdown: false }]);
          addLog(`Successfully loaded ${mappedItems.length} items for Order #${data.id}.`);
        }

        alert(`Order #${data.id} loaded successfully.`);
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch((err) => {
        alert(`Error loading order: ${err.message}`);
        addLog(`Error loading order #${orderId}: ${err.message}`);
      });
  };

  // PRINT ORDER INVOICE
  const printOrderInvoice = (order) => {
    const orderId = order.order_id || order.id;
    const itemsHtml = Array.isArray(order.items) && order.items.length > 0
      ? order.items.map((item, i) => {
          const qty = Number(item.quantity || 1);
          const price = Number(item.price || 0);
          const amt = qty * price;
          return `
            <tr>
              <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;">${i + 1}</td>
              <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;">${item.product || '-'}</td>
              <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:center;">${qty}</td>
              <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right;">&#8377;${price.toFixed(2)}</td>
              <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700;">&#8377;${amt.toFixed(2)}</td>
            </tr>`;
        }).join('')
      : `<tr><td colspan="5" style="text-align:center;padding:14px;color:#999;">No items</td></tr>`;

    const grandTotal = Number(order.total_amount || order.total || 0);
    const dateStr = order.created_at
      ? new Date(order.created_at).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true })
      : '-';
    const statusStr = (order.status || 'pending').charAt(0).toUpperCase() + (order.status || 'pending').slice(1);

    const invoiceHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice #${orderId} - HERBBALS ERP</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;}
    body{background:#f9fafb;padding:30px;color:#111827;}
    .invoice-box{max-width:780px;margin:auto;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);overflow:hidden;}
    .inv-header{background:linear-gradient(135deg,#6366f1,#3b82f6);color:white;padding:30px 36px;display:flex;justify-content:space-between;align-items:center;}
    .inv-header h1{font-size:26px;font-weight:800;letter-spacing:1px;}
    .inv-header p{font-size:13px;opacity:0.85;margin-top:4px;}
    .inv-meta{font-size:13px;text-align:right;}
    .inv-num{font-size:20px;font-weight:800;}
    .body-section{padding:28px 36px;}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px;}
    .info-card h4{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:8px;}
    .info-card p{font-size:14px;color:#111827;font-weight:600;}
    .info-card .sub{font-size:12px;color:#6b7280;font-weight:400;margin-top:2px;}
    .status-badge{display:inline-block;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;}
    .status-confirmed,.status-pending{background:#e0e7ff;color:#4338ca;}
    .status-shipped{background:#e0f2fe;color:#0369a1;}
    .status-delivered{background:#dcfce7;color:#15803d;}
    table{width:100%;border-collapse:collapse;}
    thead tr{background:#6366f1;color:white;}
    thead th{padding:12px 14px;font-size:12px;font-weight:700;text-align:left;text-transform:uppercase;letter-spacing:0.5px;}
    tbody tr:nth-child(even){background:#f8fafc;}
    .totals{border-top:2px solid #e5e7eb;padding:20px 36px;text-align:right;}
    .totals .grand{font-size:22px;font-weight:800;color:#6366f1;margin-top:4px;}
    .inv-footer{background:#f8fafc;padding:14px 36px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;}
    .no-print{text-align:center;margin-top:24px;}
    .no-print button{padding:12px 32px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;border:none;}
    @media print{body{background:white;padding:0;}.invoice-box{box-shadow:none;border-radius:0;}.no-print{display:none!important;}}
  </style>
</head>
<body>
  <div class="invoice-box">
    <div class="inv-header">
      <div>
        <h1>&#127807; HERBBALS ERP</h1>
        <p>Tax Invoice / Order Receipt</p>
      </div>
      <div class="inv-meta">
        <div class="inv-num">Invoice #${orderId}</div>
        <div>${dateStr}</div>
        <div style="margin-top:6px;"><span class="status-badge status-${(order.status||'pending').toLowerCase()}">${statusStr}</span></div>
      </div>
    </div>

    <div class="body-section">
      <div class="info-grid">
        <div class="info-card">
          <h4>Bill To</h4>
          <p>${order.customer || '-'}</p>
          ${order.mobile ? `<p class="sub">&#128222; ${order.mobile}</p>` : ''}
        </div>
        <div class="info-card">
          <h4>Shipping Address</h4>
          <p>${order.shipping_address || '-'}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Product</th>
            <th style="text-align:center;">Qty</th>
            <th style="text-align:right;">Rate</th>
            <th style="text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
    </div>

    <div class="totals">
      <p style="font-size:13px;color:#6b7280;">Grand Total</p>
      <div class="grand">&#8377;${grandTotal.toFixed(2)}</div>
    </div>

    <div class="inv-footer">
      Thank you for your order! &nbsp;|&nbsp; HERBBALS ERP &nbsp;|&nbsp; Printed on ${new Date().toLocaleString('en-IN')}
    </div>
  </div>

  <div class="no-print">
    <button onclick="window.print()" style="background:#6366f1;color:white;margin-right:10px;">&#128424; Print Invoice</button>
    <button onclick="window.close()" style="background:#f3f4f6;color:#374151;">Close</button>
  </div>

  <script>window.onload=function(){window.print();}<\/script>
</body>
</html>`;

    const pw = window.open('', '_blank', 'width=860,height=720');
    if (pw) {
      pw.document.write(invoiceHTML);
      pw.document.close();
      addLog(`Invoice for Order #${orderId} opened for printing.`);
    } else {
      alert('Popup blocked! Please allow popups for this site to print invoices.');
    }
  };

  // UPDATE ORDER STATUS
  const handleStatusChange = (orderId, newStatus) => {
    // Optimistic UI update
    setOrders((prev) =>
      prev.map((o) => (o.order_id === orderId || o.id === orderId ? { ...o, status: newStatus } : o))
    );
    addLog(`Updating status of Order #${orderId} to "${newStatus}"...`);

    fetch(`https://api.codingboss.in/herbal/orders/${orderId}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "any",
      },
      body: JSON.stringify({ status: newStatus })
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(() => {
        addLog(`Order #${orderId} status successfully updated to "${newStatus}" on backend.`);
        fetchOrders();
      })
      .catch((err) => {
        addLog(`Status update failed on backend (remains locally): ${err.message}`);
      });
  };

  // MODIFY BUTTON HANDLER
  const handleModify = () => {
    const orderIdInput = prompt("Enter Order ID to fetch and modify:");
    if (!orderIdInput) return;
    loadOrderById(orderIdInput);
  };

  // RESET / NEW ENTRY
  const handleNew = () => {
    setOrderNo("");
    setInvoiceNo("");
    setCustomerSearch("");
    setCustomerName("");
    setBillingAddress("");
    setShippingAddress("");
    setPaymentMethod("Cash");
    setRemarks("");
    setShippingCharge(0);
    setSelectedCustomerId("");
    setItems([{ itemName: "", qty: 1, rate: 0, amount: 0, showDropdown: false }]);
    addLog("Form cleared for a new order entry.");
    alert("Form cleared. Ready for new order.");
  };

  const subTotal = items.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const total = subTotal + Number(shippingCharge || 0);

  const filteredCustomers = customers.filter((c) =>
    (c.name || "").toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <div className="home-container">
      <div className="header">
        <h2>
          <video
            className="brand-video"
            src={headerVideo}
            autoPlay
            muted
            loop
            playsInline
          ></video>
          <img
            className="brand-name-logo"
            src={brandNameLogo}
            alt="Dharani Herbbals"
          />
        </h2>
        <p>Create Order System</p>
      </div>

      {/* ERROR BANNERS */}
      {(customerError || productError) && (
        <div style={{
          background: "#ffeeef",
          border: "1px solid #ffcccc",
          color: "#dd3333",
          padding: "12px",
          borderRadius: "8px",
          marginBottom: "16px",
          fontSize: "14px"
        }}>
          {customerError && <div style={{ marginBottom: productError ? "8px" : "0" }}><strong>⚠️ Customer Fetch Error:</strong> {customerError}</div>}
          {productError && <div><strong>⚠️ Product Fetch Error:</strong> {productError}</div>}
        </div>
      )}

      {/* DEBUG STATUS BADGES */}
      <div style={{
        background: "#e0e7ff",
        border: "1px solid #c7d2fe",
        padding: "8px 12px",
        borderRadius: "8px",
        marginBottom: "16px",
        fontSize: "13px",
        display: "flex",
        gap: "16px",
        color: "#4f46e5",
        fontWeight: "600"
      }}>
        <span>👥 Customers loaded: {customers.length}</span>
        <span>📦 Products loaded: {products.length}</span>
      </div>

      {/* CUSTOMER FORM */}
      <div className="voucher-card">
        <h3>Customer Details</h3>

        <div className="form-grid">
          <div>
            <label>Order No</label>
            <input
              className="input-field"
              value={orderNo}
              onChange={(e) => setOrderNo(e.target.value)}
            />
          </div>

          <div>
            <label>Invoice Number</label>
            <input
              className="input-field"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
            />
          </div>

          {/* CUSTOMER SEARCH */}
          <div style={{ position: "relative" }}>
            <label>Customer Name</label>

            <input
              className="input-field"
              value={customerSearch}
              placeholder="Type customer name..."
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setShowCustomerDropdown(true);
              }}
              onFocus={() => setShowCustomerDropdown(true)}
            />

            {showCustomerDropdown && (
              <div className="autocomplete-box">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((c) => (
                    <div
                      key={c.id}
                      className="autocomplete-item"
                      onClick={() => {
                        setCustomerSearch(c.name);
                        setShowCustomerDropdown(false);
                        setSelectedCustomerId(c.id);

                        setCustomerName(c.name);
                        setBillingAddress(c.mobile);
                        setShippingAddress(c.email || "");
                      }}
                    >
                      <div style={{ fontWeight: "600" }}>{c.name}</div>
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        {c.mobile}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: "10px", color: "#999" }}>
                    No customer found
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label>Billing Address</label>
            <input
              className="input-field"
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
            />
          </div>

          <div>
            <label>Delivery Address</label>
            <input
              className="input-field"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
            />
          </div>

          <div>
            <label>Payment Method</label>
            <select
              className="input-field"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option>Cash</option>
              <option>UPI</option>
              <option>Card</option>
            </select>
          </div>

          <div>
            <label>Delivery Charge</label>
            <input
              type="number"
              className="input-field"
              value={shippingCharge}
              onChange={(e) => setShippingCharge(Number(e.target.value))}
            />
          </div>

          <div>
            <label>Remarks</label>
            <textarea
              className="input-field"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="table-wrapper">
        <table className="voucher-table">
          <thead>
            <tr>
              <th>SL</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td>{index + 1}</td>

                <td>
                  <input
                    className="input-field"
                    value={item.itemName}
                    placeholder="Type to search product..."
                    list={`products-datalist-${index}`}
                    onChange={(e) =>
                      handleChange(index, "itemName", e.target.value)
                    }
                  />
                  <datalist id={`products-datalist-${index}`}>
                    {products.map((p, i) => (
                      <option key={i} value={p.name}>
                        Rate: ₹{p.customer_price || p.price || p.mrp || 0}
                      </option>
                    ))}
                  </datalist>
                </td>

                <td>
                  <input
                    type="number"
                    className="input-field"
                    value={item.qty}
                    onChange={(e) =>
                      handleChange(index, "qty", Number(e.target.value))
                    }
                  />
                </td>

                <td>{item.rate}</td>
                <td>₹ {item.amount}</td>

                <td>
                  <button
                    className="delete-btn"
                    onClick={() => deleteRow(index)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* BUTTONS */}
      <div className="button-group">
        <button className="btn" onClick={addRow}>
          Add Item
        </button>
        <button className="btn" onClick={handleSave}>Save</button>
        <button className="btn" onClick={handleModify}>Modify</button>
        <button className="btn" onClick={handleNew}>New</button>
        <button className="btn cancel-btn" onClick={handleNew}>Cancel</button>
      </div>

      {/* TOTAL */}
      <div className="total-box">
        <p>Sub Total: ₹ {subTotal}</p>
        <p>Shipping: ₹ {shippingCharge}</p>
        <hr />
        <h2>Grand Total: ₹ {total}</h2>
      </div>

      {/* SAVED ORDERS LIST (MATCHING DESIGN SPEC) */}
     <div className="voucher-card saved-orders-card">
  <div className="saved-orders-header">
    <h3>📋 Saved Orders List</h3>
<button
  onClick={fetchOrders}
  style={{
    background: "#22c55e",
    color: "white",
    border: "none",
    padding: "10px 18px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600"
  }}
>
  🔄 Refresh List
</button>
  </div>

  <div className="table-wrapper">
    <table className="voucher-table">
      <thead>
        <tr>
          <th>ORDER ID</th>
          <th>CUSTOMER</th>
          <th>DATE & TIME</th>
          <th>ITEMS</th>
          <th>TOTAL</th>
          <th>STATUS</th>
          <th>ACTION</th>
        </tr>
      </thead>

      <tbody>
        {orders.length > 0 ? (
          orders.map((order, idx) => {
            const orderId = order.order_id || order.id;
            const totalAmt = order.total_amount || order.total || "0.00";

            let itemsText = "No items";

            if (
              Array.isArray(order.items) &&
              order.items.length > 0
            ) {
              itemsText = order.items
                .map(
                  (it) =>
                    it.product || "Unknown Product"
                )
                .join(", ");
            }

            return (
              <tr key={idx}>
                <td>
                  <span className="order-badge">
                    #{orderId}
                  </span>
                </td>

                <td>
                  <div className="customer-name">
                    {order.customer}
                  </div>

                  {order.mobile && (
                    <div className="customer-mobile">
                      📞 {order.mobile}
                    </div>
                  )}
                </td>

                <td className="date-cell">
                  🕒{" "}
                  {formatDateTime(
                    order.created_at || order.date
                  )}
                </td>

                <td className="items-cell">
                  📦 {itemsText}
                </td>

                <td className="amount-cell">
                  ₹
                  {Number(totalAmt).toFixed(2)}
                </td>

                <td>
                  <select
                    value={
                      order.status || "pending"
                    }
                    onChange={(e) =>
                      handleStatusChange(
                        orderId,
                        e.target.value
                      )
                    }
                    style={{
                      ...getStatusStyle(
                        order.status
                      ),
                      padding: "8px 12px",
                      borderRadius: "20px",
                      fontWeight: "600",
                      border: "none",
                    }}
                  >
                    <option value="pending">
                      Pending
                    </option>
                    <option value="confirmed">
                      Confirmed
                    </option>
                    <option value="shipped">
                      Shipped
                    </option>
                    <option value="delivered">
                      Delivered
                    </option>
                  </select>
                </td>

                <td>
                  <button
                    onClick={() =>
                      printOrderInvoice(order)
                    }
                    className="print-btn"
                  >
                    🖨️ Print
                  </button>
                </td>
              </tr>
            );
          })
        ) : (
          <tr>
            <td
              colSpan="7"
              style={{
                textAlign: "center",
                padding: "20px",
              }}
            >
              No saved orders found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</div>

      {/* SYSTEM LOGS */}
     
    </div>
  );
}

export default Home;
