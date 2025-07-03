// app.js - This file will be compiled by esbuild
// NO import statements for React, ReactDOM, or Firebase here.
// They are loaded globally by CDN in index.html.

// Ensure these global variables are available from index.html
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null; // Corrected variable name

function App() {
  console.log("App Component: Initializing state variables."); // DEBUG: Start of component render
  const [activeSection, setActiveSection] = React.useState('newOrder'); // 'newOrder', 'activeOrders', 'completedOrders', 'setup'
  const [menuItems, setMenuItems] = React.useState([]);
  const [currentOrder, setCurrentOrder] = React.useState([]);
  const [orders, setOrders] = React.useState([]); // All orders from Firestore
  const [orderCounter, setOrderCounter] = React.useState(1);
  const [newMenuItemName, setNewMenuItemName] = React.useState('');
  const [newMenuItemPrice, setNewMenuItemPrice] = React.useState('');
  const [isAuthReady, setIsAuthReady] = React.useState(false);
  const [userId, setUserId] = React.useState(null);
  const [showModal, setShowModal] = React.useState(false);
  const [modalContent, setModalContent] = React.useState({ title: '', message: '', onConfirm: null, showConfirm: false });

  // Manage Firebase instances as state
  const [firebaseApp, setFirebaseApp] = React.useState(null);
  const [firestoreDb, setFirestoreDb] = React.useState(null);
  const [firebaseAuth, setFirebaseAuth] = React.useState(null);


  // Refs for audio and notification
  const audioRef = React.useRef(null);
  const notificationRef = React.useRef(null);

  // Initialize Firebase and Auth
  React.useEffect(() => {
    console.log("App Component: useEffect for Firebase init/auth triggered."); // DEBUG
    // Only initialize once
    if (firebaseApp) {
        console.log("App Component: Firebase already initialized, skipping useEffect."); // DEBUG
        return;
    }
    console.log("App Component: Attempting Firebase initialization..."); // DEBUG
    try {
      // Initialize the Firebase app
      const appInstance = firebase.initializeApp(firebaseConfig);
      // Get the Firestore and Auth instances using the compat API
      const dbInstance = appInstance.firestore();
      const authInstance = appInstance.auth();

      setFirebaseApp(appInstance);
      setFirestoreDb(dbInstance);
      setFirebaseAuth(authInstance);

      console.log('App Component: Firebase initialized and state set. dbInstance:', dbInstance); // DEBUG

      // Listen for auth state changes
      authInstance.onAuthStateChanged(async (user) => {
        if (user) {
          setUserId(user.uid);
          setIsAuthReady(true);
          console.log('App Component: Firebase Auth State Changed. User ID:', user.uid); // DEBUG
        } else {
          try {
            if (initialAuthToken) {
              await authInstance.signInWithCustomToken(initialAuthToken);
              console.log('App Component: Signed in with custom token.'); // DEBUG
            } else {
              await authInstance.signInAnonymously();
              console.log('App Component: Signed in anonymously.'); // DEBUG
            }
            setIsAuthReady(true); // Ensure auth ready is set even if no user initially
          } catch (error) {
            console.error('App Component: Error during Firebase auth state change:', error); // DEBUG
            setUserId(crypto.randomUUID()); // Fallback to a random ID if auth fails
            setIsAuthReady(true);
          }
        }
      });

      // No explicit unsubscribe needed here as onAuthStateChanged returns a cleanup function
      // but it's handled implicitly by React's useEffect cleanup if the component unmounts.
      // For a single-page app like this, it's less critical.
    } catch (error) {
      console.error('App Component: FATAL Firebase initialization error:', error); // DEBUG
      setUserId(crypto.randomUUID()); // Fallback to a random ID if initialization fails
      setIsAuthReady(true);
    }
  }, [firebaseApp, firebaseConfig, initialAuthToken]); // Dependencies to ensure it runs correctly

  // Fetch Menu Items and Order Counter
  React.useEffect(() => {
    console.log("App Component: useEffect for data fetch triggered. isAuthReady:", isAuthReady, "firestoreDb:", firestoreDb); // DEBUG
    if (!isAuthReady || !firestoreDb) {
        console.log("App Component: Skipping data fetch. Auth not ready or DB not initialized."); // DEBUG
        return;
    }
    console.log("App Component: Attempting data fetch for menu items and order counter..."); // DEBUG

    // Get reference to menu items collection using compat API
    const menuItemsCollectionRef = firestoreDb.collection(`artifacts/${appId}/public/data/menuItems`);
    const unsubscribeMenuItems = menuItemsCollectionRef.onSnapshot((snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMenuItems(items.sort((a, b) => a.name.localeCompare(b.name))); // Sort alphabetically
      console.log("App Component: Menu items fetched:", items); // DEBUG
      if (items.length === 0) {
          console.warn("App Component: No menu items found in Firestore. Please add them in Firebase console."); // DEBUG
      }
    }, (error) => {
      console.error("App Component: Error fetching menu items:", error); // DEBUG
    });

    // Get reference to app settings document for order counter using compat API
    const appSettingsDocRef = firestoreDb.collection(`artifacts/${appId}/public/data/appSettings`).doc('orderCounter');
    const unsubscribeOrderCounter = appSettingsDocRef.onSnapshot((docSnap) => {
      if (docSnap.exists) {
        setOrderCounter(docSnap.data().count || 1);
        console.log("App Component: Order counter fetched:", docSnap.data().count); // DEBUG
      } else {
        // Use set with merge true to create if not exists, or update if exists
        appSettingsDocRef.set({ count: 1 }, { merge: true });
        console.log("App Component: Order counter initialized to 1 (document not found)."); // DEBUG
      }
    }, (error) => {
      console.error("App Component: Error fetching order counter:", error); // DEBUG
    });

    return () => {
      console.log("App Component: Data fetch useEffect cleanup."); // DEBUG
      unsubscribeMenuItems();
      unsubscribeOrderCounter();
    };
  }, [isAuthReady, firestoreDb, appId]); // Depend on isAuthReady, firestoreDb, and appId

  // Fetch Orders
  React.useEffect(() => {
    console.log("App Component: useEffect for all orders fetch triggered. isAuthReady:", isAuthReady, "firestoreDb:", firestoreDb); // DEBUG
    if (!isAuthReady || !firestoreDb) return;

    // Get reference to orders collection using compat API
    const ordersCollectionRef = firestoreDb.collection(`artifacts/${appId}/public/data/orders`);
    // Create a query using compat API
    const q = ordersCollectionRef.orderBy('timestamp', 'desc');

    const unsubscribeOrders = q.onSnapshot((snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(fetchedOrders);
      console.log("App Component: All orders fetched:", fetchedOrders); // DEBUG
    }, (error) => {
      console.error("App Component: Error fetching all orders:", error); // DEBUG
    });

    return () => {
        console.log("App Component: All orders fetch useEffect cleanup."); // DEBUG
        unsubscribeOrders();
    };
  }, [isAuthReady, firestoreDb, appId]); // Depend on isAuthReady, firestoreDb, and appId

  const showConfirmationModal = (title, message, onConfirm) => {
    setModalContent({ title, message, onConfirm, showConfirm: true });
    setShowModal(true);
  };

  const showInfoModal = (title, message) => {
    setModalContent({ title, message, onConfirm: null, showConfirm: false });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalContent({ title: '', message: '', onConfirm: null, showConfirm: false });
  };

  // --- Menu Item Management ---
  const handleAddMenuItem = async () => {
    console.log("App Component: handleAddMenuItem called. firestoreDb:", firestoreDb); // DEBUG
    if (!newMenuItemName || !newMenuItemPrice || isNaN(parseFloat(newMenuItemPrice))) {
      showInfoModal('Input Error', 'Please enter a valid name and price for the menu item.');
      return;
    }
    // Use firestoreDb state variable
    if (!firestoreDb) {
      showInfoModal('Error', 'Database not initialized. Please try again.');
      return;
    }

    try {
      const price = parseFloat(newMenuItemPrice);
      // Use compat API for addDoc
      await firestoreDb.collection(`artifacts/${appId}/public/data/menuItems`).add({
        name: newMenuItemName,
        price: price,
      });
      setNewMenuItemName('');
      setNewMenuItemPrice('');
      showInfoModal('Success', `${newMenuItemName} added to menu.`);
      console.log("App Component: Menu item added successfully."); // DEBUG
    } catch (e) {
      console.error("App Component: Error adding document:", e); // DEBUG
      showInfoModal('Error', 'Failed to add menu item. Please try again.');
    }
  };

  const handleDeleteMenuItem = async (id, name) => {
    console.log("App Component: handleDeleteMenuItem called. firestoreDb:", firestoreDb); // DEBUG
    // Use firestoreDb state variable
    if (!firestoreDb) {
      showInfoModal('Error', 'Database not initialized. Please try again.');
      return;
    }
    showConfirmationModal('Confirm Delete', `Are you sure you want to delete "${name}" from the menu?`, async () => {
      try {
        // Use compat API for deleteDoc
        await firestoreDb.collection(`artifacts/${appId}/public/data/menuItems`).doc(id).delete();
        showInfoModal('Success', `${name} deleted from menu.`);
        closeModal();
        console.log("App Component: Menu item deleted successfully."); // DEBUG
      } catch (e) {
        console.error("App Component: Error deleting document:", e); // DEBUG
        showInfoModal('Error', 'Failed to delete menu item. Please try again.');
      }
    });
  };

  // --- New Order Management ---
  const addItemToCurrentOrder = (item) => {
    setCurrentOrder(prevOrder => {
      const existingItemIndex = prevOrder.findIndex(i => i.id === item.id);
      if (existingItemIndex > -1) {
        const updatedOrder = [...prevOrder];
        updatedOrder[existingItemIndex].quantity += 1;
        return updatedOrder;
      } else {
        return [...prevOrder, { ...item, quantity: 1, isReady: false, isServed: false }];
      }
    });
  };

  const removeItemFromCurrentOrder = (itemToRemove) => {
    setCurrentOrder(prevOrder => {
      const existingItemIndex = prevOrder.findIndex(item => item.id === itemToRemove.id);
      if (existingItemIndex > -1) {
        const updatedOrder = [...prevOrder];
        if (updatedOrder[existingItemIndex].quantity > 1) {
          updatedOrder[existingItemIndex].quantity -= 1;
        } else {
          updatedOrder.splice(existingItemIndex, 1);
        }
        return updatedOrder;
      }
      return prevOrder;
    });
  };

  const calculateCurrentOrderTotal = () => {
    return currentOrder.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);
  };

  const handlePaidOrder = async () => {
    console.log("App Component: handlePaidOrder called. firestoreDb:", firestoreDb); // DEBUG
    if (currentOrder.length === 0) {
      showInfoModal('Empty Order', 'Please add items to the order before marking as paid.');
      return;
    }
    if (!firestoreDb) { // Corrected from `!db` to `!firestoreDb`
      showInfoModal('Error', 'Database not initialized. Please try again.');
      return;
    }

    try {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const timestamp = `${hours}:${minutes}`;

      const newOrderDoc = {
        orderNumber: orderCounter,
        timestamp: now.getTime(), // Use milliseconds for sorting in Firestore
        displayTime: timestamp, // For display purposes
        status: 'active',
        items: currentOrder,
        total: parseFloat(calculateCurrentOrderTotal()),
        userId: userId, // Store the user who created the order
      };

      // Use compat API for addDoc
      await firestoreDb.collection(`artifacts/${appId}/public/data/orders`).add(newOrderDoc);

      // Increment order counter in Firestore using compat API
      const appSettingsDocRef = firestoreDb.collection(`artifacts/${appId}/public/data/appSettings`).doc('orderCounter');
      await appSettingsDocRef.update({ count: orderCounter + 1 });

      setCurrentOrder([]); // Clear current order
      setActiveSection('activeOrders'); // Navigate to active orders

      // Play ping sound and show notification
      if (audioRef.current) {
        audioRef.current.play();
      }
      if (notificationRef.current) {
        notificationRef.current.classList.add('animate-ping-once');
        setTimeout(() => {
          notificationRef.current.classList.remove('animate-ping-once');
        }, 1000); // Duration of the animation
      }
      showInfoModal('Order Placed!', `Order #${orderCounter} has been added to active orders.`);
      console.log("App Component: Order placed successfully."); // DEBUG

    } catch (e) {
      console.error("App Component: Error adding order:", e); // DEBUG
      showInfoModal('Error', 'Failed to place order. Please try again.');
    }
  };

  const handleResetOrderCount = async () => {
    console.log("App Component: handleResetOrderCount called. firestoreDb:", firestoreDb); // DEBUG
    if (!firestoreDb) {
      showInfoModal('Error', 'Database not initialized. Please try again.');
      return;
    }
    showConfirmationModal('Confirm Reset', 'Are you sure you want to reset the order count to 1? This cannot be undone.', async () => {
      try {
        // Use compat API for setDoc
        const appSettingsDocRef = firestoreDb.collection(`artifacts/${appId}/public/data/appSettings`).doc('orderCounter');
        await appSettingsDocRef.set({ count: 1 });
        showInfoModal('Success', 'Order count has been reset to 1.');
        closeModal();
        console.log("App Component: Order count reset successfully."); // DEBUG
      } catch (e) {
        console.error("App Component: Error resetting order count:", e); // DEBUG
        showInfoModal('Error', 'Failed to reset order count. Please try again.');
      }
    });
  };

  // --- Active Order Management ---
  const toggleItemStatus = async (orderId, itemIndex, statusType) => {
    console.log("App Component: toggleItemStatus called. firestoreDb:", firestoreDb); // DEBUG
    if (!firestoreDb) {
      showInfoModal('Error', 'Database not initialized. Please try again.');
      return;
    }
    try {
      // Use compat API for doc and get
      const orderRef = firestoreDb.collection(`artifacts/${appId}/public/data/orders`).doc(orderId);
      const orderSnap = await orderRef.get();

      if (orderSnap.exists) {
        const orderData = orderSnap.data();
        const updatedItems = [...orderData.items];
        updatedItems[itemIndex][statusType] = !updatedItems[itemIndex][statusType];

        // If an item is marked as served, it should also be marked as ready
        if (statusType === 'isServed' && updatedItems[itemIndex][statusType]) {
          updatedItems[itemIndex]['isReady'] = true;
        }
        // If an item is marked as not ready, it should also be marked as not served
        if (statusType === 'isReady' && !updatedItems[itemIndex][statusType]) {
          updatedItems[itemIndex]['isServed'] = false;
        }

        // Use compat API for updateDoc
        await orderRef.update({ items: updatedItems });

        // Check if all items are served in this order
        const allServed = updatedItems.every(item => item.isServed);
        if (allServed) {
          await orderRef.update({ status: 'completed' });
          showInfoModal('Order Completed!', `Order #${orderData.orderNumber} has been moved to completed orders.`);
          console.log("App Component: Order marked completed due to all served."); // DEBUG
        }
      }
    } catch (e) {
      console.error("App Component: Error updating item status:", e); // DEBUG
      showInfoModal('Error', 'Failed to update item status. Please try again.');
    }
  };

  const toggleAllItemsStatus = async (orderId, statusType) => {
    console.log("App Component: toggleAllItemsStatus called. firestoreDb:", firestoreDb); // DEBUG
    if (!firestoreDb) {
      showInfoModal('Error', 'Database not initialized. Please try again.');
      return;
    }
    try {
      // Use compat API for doc and get
      const orderRef = firestoreDb.collection(`artifacts/${appId}/public/data/orders`).doc(orderId);
      const orderSnap = await orderRef.get();

      if (orderSnap.exists) {
        const orderData = orderSnap.data();
        const updatedItems = orderData.items.map(item => ({
          ...item,
          [statusType]: true,
          // If marking all served, also mark all ready
          ...(statusType === 'isServed' && { isReady: true })
        }));
        // Use compat API for updateDoc
        await orderRef.update({ items: updatedItems });

        // If all items are served, mark order as completed
        if (statusType === 'isServed') {
          await orderRef.update({ status: 'completed' });
          showInfoModal('Order Completed!', `Order #${orderData.orderNumber} has been moved to completed orders.`);
          console.log("App Component: All items served, order marked completed."); // DEBUG
        }
      }
    } catch (e) {
      console.error("App Component: Error updating all items status:", e); // DEBUG
      showInfoModal('Error', 'Failed to update all items status. Please try again.');
    }
  };

  const getActiveOrderTotals = () => {
    const activeOrders = orders.filter(order => order.status === 'active');
    const itemCounts = {};

    activeOrders.forEach(order => {
      order.items.forEach(item => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
      });
    });

    return Object.entries(itemCounts).sort((a, b) => a[0].localeCompare(b[0]));
  };

  // --- Completed Order Management ---
  const handleReopenOrder = async (orderId, orderNumber) => {
    console.log("App Component: handleReopenOrder called. firestoreDb:", firestoreDb); // DEBUG
    if (!firestoreDb) {
      showInfoModal('Error', 'Database not initialized. Please try again.');
      return;
    }
    showConfirmationModal('Confirm Reopen', `Are you sure you want to reopen Order #${orderNumber}? It will move back to active orders.`, async () => {
      try {
        // Use compat API for doc and update
        const orderRef = firestoreDb.collection(`artifacts/${appId}/public/data/orders`).doc(orderId);
        await orderRef.update({ status: 'active' });
        showInfoModal('Success', `Order #${orderNumber} reopened.`);
        closeModal();
        console.log("App Component: Order reopened successfully."); // DEBUG
      } catch (e) {
        console.error("App Component: Error reopening order:", e); // DEBUG
        showInfoModal('Error', 'Failed to reopen order. Please try again.');
      }
    });
  };

  const handleEditOrder = (order) => {
    console.log("App Component: handleEditOrder called."); // DEBUG
    // This is a simplified edit. For a full edit, you'd load the order into currentOrder
    // and allow modification, then save it back. For now, we'll just show an info modal.
    showInfoModal('Edit Order', `Editing Order #${order.orderNumber} is not fully implemented in this demo. You can manually edit it in Firebase Firestore.`);
  };

  const handleDeleteOrder = async (orderId, orderNumber) => {
    console.log("App Component: handleDeleteOrder called. firestoreDb:", firestoreDb); // DEBUG
    if (!firestoreDb) {
      showInfoModal('Error', 'Database not initialized. Please try again.');
      return;
    }
    showConfirmationModal('Confirm Delete', `Are you sure you want to permanently delete Order #${orderNumber}? This cannot be undone.`, async () => {
      try {
        // Use compat API for deleteDoc
        await firestoreDb.collection(`artifacts/${appId}/public/data/orders`).doc(orderId).delete();
        showInfoModal('Success', `Order #${orderNumber} deleted.`);
        closeModal();
        console.log("App Component: Order deleted successfully."); // DEBUG
      } catch (e) {
        console.error("App Component: Error deleting order:", e); // DEBUG
        showInfoModal('Error', 'Failed to delete order. Please try again.');
      }
    });
  };

  // --- Export Orders to CSV ---
  const handleExportOrders = () => {
    console.log("App Component: handleExportOrders called."); // DEBUG
    if (orders.length === 0) {
      showInfoModal('No Orders', 'There are no orders to export.');
      return;
    }

    let csvContent = "Order Number,Timestamp,Status,Total,Item Name,Quantity,Ready,Served\n";

    orders.forEach(order => {
      order.items.forEach(item => {
        csvContent += `${order.orderNumber},${order.displayTime},${order.status},${order.total},"${item.name}",${item.quantity},${item.isReady ? 'Yes' : 'No'},${item.isServed ? 'Yes' : 'No'}\n`;
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) { // Feature detection for download attribute
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `bbq_orders_export_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      document.body.removeChild(link);
      showInfoModal('Export Complete', 'All orders have been exported to a CSV file.');
      console.log("App Component: Orders exported to CSV."); // DEBUG
    } else {
      // Fallback for browsers that don't support download attribute
      showInfoModal('Export Failed', 'Your browser does not support direct CSV download. Please copy the content manually.');
      console.log(csvContent); // Log to console for manual copy
    }
  };

  // Filter orders for display
  const activeOrders = orders.filter(order => order.status === 'active');
  const completedOrders = orders.filter(order => order.status === 'completed');

  const totalCurrentOrderCost = calculateCurrentOrderTotal();

  console.log("App Component: Rendering JSX for UI."); // DEBUG
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-inter text-gray-800">
      {/* Audio for ping notification */}
      <audio ref={audioRef} src="https://www.soundjay.com/buttons/sounds/button-10.mp3" preload="auto"></audio>

      {/* Global Notification Ping */}
      <div
        ref={notificationRef}
        className="fixed top-0 left-0 w-full h-2 bg-red-500 z-50 opacity-0 transition-opacity duration-500"
      ></div>

      {/* Modal Component */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full mx-auto border-t-4 border-red-500">
            <h3 className="text-xl font-bold text-gray-900 mb-4">{modalContent.title}</h3>
            <p className="text-gray-700 mb-6">{modalContent.message}</p>
            <div className="flex justify-end space-x-3">
              {modalContent.showConfirm && (
                <button
                  onClick={() => { modalContent.onConfirm && modalContent.onConfirm(); }}
                  className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-200 shadow-md"
                >
                  Confirm
                </button>
              )}
              <button
                onClick={closeModal}
                className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition duration-200 shadow-md"
              >
                {modalContent.showConfirm ? 'Cancel' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Navigation */}
      <nav className="bg-red-600 text-white p-4 shadow-md sticky top-0 z-10">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <button
            onClick={() => setActiveSection('newOrder')}
            className={`flex-1 py-2 rounded-lg transition duration-200 ${activeSection === 'newOrder' ? 'bg-red-700 font-bold' : 'hover:bg-red-500'}`}
          >
            New Order
          </button>
          <button
            onClick={() => setActiveSection('activeOrders')}
            className={`flex-1 py-2 rounded-lg transition duration-200 ml-2 ${activeSection === 'activeOrders' ? 'bg-red-700 font-bold' : 'hover:bg-red-500'}`}
          >
            Active
          </button>
          <button
            onClick={() => setActiveSection('completedOrders')}
            className={`flex-1 py-2 rounded-lg transition duration-200 ml-2 ${activeSection === 'completedOrders' ? 'bg-red-700 font-bold' : 'hover:bg-red-500'}`}
          >
            Completed
          </button>
          <button
            onClick={() => setActiveSection('setup')}
            className={`flex-1 py-2 rounded-lg transition duration-200 ml-2 ${activeSection === 'setup' ? 'bg-red-700 font-bold' : 'hover:bg-red-500'}`}
          >
            Setup
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 pb-20 max-w-md mx-auto w-full">
        {/* New Order Section */}
        {activeSection === 'newOrder' && (
          <section className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-red-500">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">New BBQ Order</h2>
            <p className="text-lg text-gray-700 mb-4 text-center">Order #<span className="font-bold text-red-600">{orderCounter}</span></p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {menuItems.length > 0 ? menuItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => addItemToCurrentOrder(item)}
                  className="bg-red-100 text-red-800 p-4 rounded-lg shadow-md hover:bg-red-200 transition duration-200 active:scale-95 transform flex flex-col items-center justify-center"
                >
                  <span className="font-semibold text-lg">{item.name}</span>
                  <span className="text-sm">£{item.price.toFixed(2)}</span>
                </button>
              )) : (
                <p className="col-span-2 text-center text-gray-500">No menu items yet. Go to Setup to add some!</p>
              )}
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-3">Current Order:</h3>
            {currentOrder.length === 0 ? (
              <p className="text-gray-500 text-center mb-6">No items in current order.</p>
            ) : (
              <ul className="mb-6 space-y-2">
                {currentOrder.map(item => (
                  <li key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg shadow-sm">
                    <span className="text-gray-800 font-medium">{item.name} x {item.quantity}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600">£{(item.price * item.quantity).toFixed(2)}</span>
                      <button
                        onClick={() => removeItemFromCurrentOrder(item)}
                        className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm hover:bg-red-200 transition duration-200 active:scale-95 transform"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex justify-between items-center text-2xl font-bold text-gray-900 mb-6 p-3 bg-red-50 rounded-lg">
              <span>Total:</span>
              <span>£{totalCurrentOrderCost}</span>
            </div>

            <button
              onClick={handlePaidOrder}
              className="w-full bg-red-600 text-white py-4 rounded-xl text-xl font-bold shadow-lg hover:bg-red-700 transition duration-200 active:scale-98 transform"
            >
              Paid
            </button>
          </section>
        )}

        {/* Active Orders Section */}
        {activeSection === 'activeOrders' && (
          <section className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-red-500">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Active Orders</h2>

            {/* Totals Row */}
            <div className="bg-red-50 p-4 rounded-lg mb-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Total Items Across Active Orders:</h3>
              {getActiveOrderTotals().length > 0 ? (
                <ul className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                  {getActiveOrderTotals().map(([name, count]) => (
                    <li key={name} className="flex justify-between">
                      <span>{name}:</span>
                      <span className="font-semibold">{count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-center">No active orders to total.</p>
              )}
            </div>

            {activeOrders.length === 0 ? (
              <p className="text-gray-500 text-center">No active orders.</p>
            ) : (
              <div className="space-y-6">
                {activeOrders.map(order => (
                  <div key={order.id} className="bg-red-100 p-5 rounded-xl shadow-md border border-red-200">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-xl font-bold text-red-800">Order #{order.orderNumber}</h3>
                      <span className="text-lg font-semibold text-red-700">£{order.total.toFixed(2)}</span>
                    </div>
                    <p className="text-sm text-red-600 mb-4">Paid at: {order.displayTime}</p>
                    <ul className="mb-4 space-y-2">
                      {order.items.map((item, index) => (
                                <li key={index} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm">
                                  <span className="text-gray-800 font-medium">{item.name} x {item.quantity}</span>
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => toggleItemStatus(order.id, index, 'isReady')}
                                      className={`px-3 py-1 rounded-full text-sm font-semibold transition duration-200 active:scale-95 transform
                                        ${item.isReady ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                    >
                                      {item.isReady ? 'Ready!' : 'Ready?'}
                                    </button>
                                    <button
                                      onClick={() => toggleItemStatus(order.id, index, 'isServed')}
                                      className={`px-3 py-1 rounded-full text-sm font-semibold transition duration-200 active:scale-95 transform
                                        ${item.isServed ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                    >
                                      {item.isServed ? 'Served!' : 'Served?'}
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                            <div className="flex justify-end space-x-2 mt-4">
                              <button
                                onClick={() => toggleAllItemsStatus(order.id, 'isReady')}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-200 shadow-md active:scale-98 transform"
                              >
                                All Ready
                              </button>
                              <button
                                onClick={() => toggleAllItemsStatus(order.id, 'isServed')}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-200 shadow-md active:scale-98 transform"
                              >
                                Serve All
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* Completed Orders Section */}
                {activeSection === 'completedOrders' && (
                  <section className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-red-500">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Completed Orders</h2>
                    {completedOrders.length === 0 ? (
                      <p className="text-gray-500 text-center">No completed orders yet.</p>
                    ) : (
                      <div className="space-y-6">
                        {completedOrders.map(order => (
                          <div key={order.id} className="bg-gray-100 p-5 rounded-xl shadow-md border border-gray-200">
                            <div className="flex justify-between items-center mb-3">
                              <h3 className="text-xl font-bold text-gray-800">Order #{order.orderNumber}</h3>
                              <span className="text-lg font-semibold text-gray-700">£{order.total.toFixed(2)}</span>
                            </div>
                            <p className="text-sm text-gray-600 mb-4">Paid at: {order.displayTime}</p>
                            <ul className="mb-4 space-y-2">
                              {order.items.map((item, index) => (
                                <li key={index} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm text-gray-700">
                                  <span>{item.name} x {item.quantity}</span>
                                  <div className="flex space-x-2 text-sm">
                                    <span className={item.isReady ? 'text-green-600 font-semibold' : 'text-gray-500'}>
                                      {item.isReady ? 'Ready' : 'Not Ready'}
                                    </span>
                                    <span className={item.isServed ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                                      {item.isServed ? 'Served' : 'Not Served'}
                                    </span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                            <div className="flex flex-wrap justify-end gap-2 mt-4">
                              <button
                                onClick={() => handleReopenOrder(order.id, order.orderNumber)}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-200 shadow-md text-sm active:scale-98 transform"
                              >
                                Reopen
                              </button>
                              <button
                                onClick={() => handleEditOrder(order)}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-200 shadow-md text-sm active:scale-98 transform"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteOrder(order.id, order.orderNumber)}
                                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition duration-200 shadow-md text-sm active:scale-98 transform"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* Setup Section */}
                {activeSection === 'setup' && (
                  <section className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-red-500">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">App Setup</h2>

                    {/* Add/Remove Menu Items */}
                    <div className="mb-8 p-4 bg-red-50 rounded-lg shadow-sm">
                      <h3 className="text-xl font-bold text-gray-800 mb-3">Manage Menu Items</h3>
                      <div className="flex flex-col sm:flex-row gap-3 mb-4">
                        <input
                          type="text"
                          placeholder="Item Name"
                          value={newMenuItemName}
                          onChange={(e) => setNewMenuItemName(e.target.value)}
                          className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        <input
                          type="number"
                          placeholder="Price"
                          value={newMenuItemPrice}
                          onChange={(e) => setNewMenuItemPrice(e.target.value)}
                          className="w-full sm:w-auto p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        <button
                          onClick={handleAddMenuItem}
                          className="w-full sm:w-auto px-4 py-3 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition duration-200 active:scale-98 transform"
                        >
                          Add Item
                        </button>
                      </div>
                      <ul className="space-y-2">
                        {menuItems.length === 0 ? (
                          <p className="col-span-2 text-center text-gray-500">No menu items defined.</p>
                        ) : (
                          menuItems.map(item => (
                            <li key={item.id} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm">
                              <span className="font-medium">{item.name} - £{item.price.toFixed(2)}</span>
                              <button
                                onClick={() => handleDeleteMenuItem(item.id, item.name)}
                                className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm hover:bg-red-200 transition duration-200 active:scale-95 transform"
                              >
                                Delete
                              </button>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>

                    {/* Export Orders */}
                    <div className="mb-8 p-4 bg-red-50 rounded-lg shadow-sm">
                      <h3 className="text-xl font-bold text-gray-800 mb-3">Data Management</h3>
                      <button
                        onClick={handleExportOrders}
                        className="w-full px-4 py-3 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition duration-200 active:scale-98 transform"
                      >
                        Export All Orders to CSV
                      </button>
                    </div>

                    {/* Reset Order Count */}
                    <div className="p-4 bg-red-50 rounded-lg shadow-sm">
                      <h3 className="text-xl font-bold text-gray-800 mb-3">Order Counter</h3>
                      <button
                        onClick={handleResetOrderCount}
                        className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg shadow-md hover:bg-gray-700 transition duration-200 active:scale-98 transform"
                      >
                        Reset Order Count to 1
                      </button>
                    </div>
                  </section>
                )}
              </main>

              {/* Footer (optional, but good for mobile) */}
              <footer className="bg-red-600 text-white p-3 text-center text-sm sticky bottom-0 z-10">
                <p>&copy; 2025 BBQ Orders App. User ID: {userId || 'Loading...'}</p>
              </footer>
            </div>
          );
        }

// This line is crucial for esbuild to make App available to the global scope
// when the bundle.js is loaded by the browser.
window.App = App;

// Render the App component using ReactDOM directly here
document.addEventListener('DOMContentLoaded', function() {
    const rootElement = document.getElementById('root');
    if (rootElement && typeof ReactDOM !== 'undefined' && typeof React !== 'undefined') {
        const root = ReactDOM.createRoot(rootElement);
        root.render(React.createElement(App));
        console.log("App rendered successfully from app.js.");
    } else {
        console.error("Failed to render App from app.js. Debug info:", {
            rootElement: rootElement,
            ReactDOMDefined: typeof ReactDOM !== 'undefined',
            ReactDefined: typeof React !== 'undefined',
            // AppDefined: typeof App !== 'undefined' // No longer needed here as App is in scope
        });
    }
});
