// OUTSIDE the async wrapper, at top-level:
const port = parseInt(process.env.PORT || "5000", 10);
console.log("Startup: Before app.listen (outside async)");
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server listening on port ${port}`);
  console.log("Startup: After app.listen (outside async)");
});
