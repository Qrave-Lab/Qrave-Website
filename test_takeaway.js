fetch("http://localhost:9090/api/admin/takeaway/orders?status=active")
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(console.error);
