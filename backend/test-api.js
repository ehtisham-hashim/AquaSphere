async function test() {
  // Let's login first
  const loginRes = await fetch('http://127.0.0.1:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-tenant': 'aquasphere' },
    body: JSON.stringify({ email: 'owner@aquasphere.com', password: 'owner123' })
  });
  const loginData = await loginRes.json();
  const cookies = loginRes.headers.get('set-cookie');
  const cookie = cookies ? cookies.split(";")[0] : '';
  console.log('Login:', loginData.success ? 'Success' : 'Failed');

  if (!loginData.success) {
    console.log(loginData);
    return;
  }

  // Get a customer
  const custRes = await fetch('http://127.0.0.1:3000/api/v1/customers', { headers: { cookie, 'x-tenant': 'aquasphere' } });
  const custData = await custRes.json();
  const customer = custData.data[0];
  console.log('Using customer:', customer.name);

  // Get items
  const itemRes = await fetch('http://127.0.0.1:3000/api/v1/items', { headers: { cookie, 'x-tenant': 'aquasphere' } });
  const itemData = await itemRes.json();
  const item19L = itemData.data.find(i => i.name.toLowerCase().includes('19l'));
  const item500ml = itemData.data.find(i => i.name.toLowerCase().includes('500ml'));

  // Create an order (correct values)
  console.log('\n--- Creating Order (Correct) ---');
  const createRes = await fetch('http://127.0.0.1:3000/api/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie, 'x-tenant': 'aquasphere' },
    body: JSON.stringify({
      customerId: customer.id,
      type: 'NINETEEN_L',
      items: [
        { itemId: item19L.id, quantity: 2, price: 150 },
        { itemId: item500ml.id, quantity: 1, price: 250 }
      ]
    })
  });
  const createData = await createRes.json();
  console.log('Create Order Result:', createData.success);
  if (createData.softBlock) {
    console.log('Soft-block detected:', createData.message);
    // Proceed anyway
    const createRes2 = await fetch('http://127.0.0.1:3000/api/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie, 'x-tenant': 'aquasphere' },
      body: JSON.stringify({
        customerId: customer.id,
        type: 'NINETEEN_L',
        bypassCreditCheck: true,
        items: [
          { itemId: item19L.id, quantity: 2, price: 150 },
          { itemId: item500ml.id, quantity: 1, price: 250 }
        ]
      })
    });
    const createData2 = await createRes2.json();
    console.log('Create Order Bypass Result:', createData2);
  } else {
    console.log(createData);
  }

  // Find the created order ID
  const ordersRes = await fetch('http://127.0.0.1:3000/api/v1/orders', { headers: { cookie, 'x-tenant': 'aquasphere' } });
  const ordersData = await ordersRes.json();
  const myOrder = ordersData.data[0]; 
  console.log('Editing Order ID:', myOrder.id);

  // Edit order (illogical values)
  console.log('\n--- Editing Order (Illogical quantities) ---');
  const editRes = await fetch(`http://127.0.0.1:3000/api/v1/orders/${myOrder.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', cookie, 'x-tenant': 'aquasphere' },
    body: JSON.stringify({
      type: 'NINETEEN_L',
      items: [
        { itemId: item19L.id, quantity: -5, price: -100 } // Illogical values
      ]
    })
  });
  const editData = await editRes.json();
  console.log('Edit Order (Illogical) Result:', editData);

  // Edit order (correct values)
  console.log('\n--- Editing Order (Correct) ---');
  const editRes2 = await fetch(`http://127.0.0.1:3000/api/v1/orders/${myOrder.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', cookie, 'x-tenant': 'aquasphere' },
    body: JSON.stringify({
      type: 'NINETEEN_L',
      items: [
        { itemId: item19L.id, quantity: 5, price: 150 }
      ]
    })
  });
  const editData2 = await editRes2.json();
  console.log('Edit Order (Correct) Result:', editData2);

  // Deliver order
  console.log('\n--- Delivering Order ---');
  const deliverRes = await fetch(`http://127.0.0.1:3000/api/v1/orders/${myOrder.id}/deliver`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie, 'x-tenant': 'aquasphere' },
    body: JSON.stringify({
      qtyDelivered: 5,
      bottlesReturnedGood: 200, // Illogical, triggers soft block
      bottlesReturnedBroken: 0,
      cashReceived: 750,
      paymentMethod: 'CASH',
      remarks: 'Test delivery'
    })
  });
  const deliverData = await deliverRes.json();
  console.log('Deliver Order Result:', deliverData);
  if (deliverData.message && deliverData.message.includes('SOFT_BLOCK')) {
     console.log('Soft-block detected, bypassing...');
     const deliverRes2 = await fetch(`http://127.0.0.1:3000/api/v1/orders/${myOrder.id}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie, 'x-tenant': 'aquasphere' },
        body: JSON.stringify({
          qtyDelivered: 5,
          bottlesReturnedGood: 200,
          bottlesReturnedBroken: 0,
          cashReceived: 750,
          paymentMethod: 'CASH',
          remarks: 'Test delivery bypass',
          bypassBottleCheck: true
        })
      });
      const deliverData2 = await deliverRes2.json();
      console.log('Deliver Order Bypass Result:', deliverData2);
  }
}

test().catch(console.error);
