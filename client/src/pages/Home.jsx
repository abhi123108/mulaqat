const Home = () => {
  const token = localStorage.getItem("mulaqat_token");

  return (
    <div>
      <h1>Mulaqat</h1>
      <p>Welcome to Mulaqat.</p>
      <p>Authentication successful ✅</p>

      <button
        onClick={() => {
          localStorage.removeItem("mulaqat_token");
          window.location.href = "/login";
        }}
      >
        Logout
      </button>

      <p>
        Token stored: {token ? "Yes ✅" : "No ❌"}
      </p>
    </div>
  );
};

export default Home;